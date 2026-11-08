<?php

// app/Actions/Attendance/RecordScan.php

namespace App\Actions\Attendance;

use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Services\Attendance\CheckHoursMilestones;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use App\Support\Attendance\ScanResult;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RecordScan
{
    private const int DEBOUNCE_MINUTES = 5;

    public function __invoke(
        string $qrCodeValue,
        Kiosk $kiosk,
        ?CarbonInterface $at = null,
        ?string $capturedPhotoData = null,
    ): ScanResult {
        $at ??= Date::now();

        $internProfile = InternProfile::query()
            ->with(['user', 'program:program_id,program_name', 'hte:hte_id,hte_name'])
            ->where('qr_code_value', $qrCodeValue)
            ->first();

        if ($internProfile === null) {
            throw new InvalidScanException(ScanRejectionReason::QrNotRecognized);
        }

        if ($internProfile->status !== 'approved') {
            throw new InvalidScanException(ScanRejectionReason::InternNotApproved);
        }

        $lastScan = AttendanceLog::query()
            ->where('intern_user_id', $internProfile->user_id)
            ->orderByDesc('scan_timestamp')
            ->first();

        $isDuplicate = $lastScan !== null
            && $lastScan->scan_timestamp->diffInMinutes($at) < self::DEBOUNCE_MINUTES;

        if (! $isDuplicate) {
            $capturedPhotoPath = $this->storeCapturedPhoto($capturedPhotoData);

            AttendanceLog::create([
                'intern_user_id' => $internProfile->user_id,
                'kiosk_id' => $kiosk->id,
                'captured_photo_path' => $capturedPhotoPath,
                'scan_timestamp' => $at,
            ]);

            $capturedPhotoUrl = $capturedPhotoPath
                ? Storage::disk('public')->url($capturedPhotoPath)
                : null;

            app(CheckHoursMilestones::class)->check($internProfile);
        } else {
            $capturedPhotoUrl = $lastScan->captured_photo_url;
        }

        return new ScanResult(
            internUserId: $internProfile->user_id,
            internName: $internProfile->user->name,
            idNumber: $internProfile->id_number,
            programName: $internProfile->program?->program_name ?? 'Deleted Program',
            hteName: $internProfile->hte?->hte_name ?? 'Deleted HTE',
            label: $this->labelForScanCountToday($internProfile->user_id, $at),
            timestamp: $isDuplicate ? $lastScan->scan_timestamp : $at,
            isDuplicate: $isDuplicate,
            photoUrl: $internProfile->profile_photo_url,
            capturedPhotoUrl: $capturedPhotoUrl,
        );
    }

    private function storeCapturedPhoto(?string $photoData): ?string
    {
        if (empty($photoData)) {
            return null;
        }

        try {
            if (preg_match('/^data:image\/(\w+);base64,/', $photoData, $matches)) {
                $photoData = substr($photoData, strpos($photoData, ',') + 1);
                $extension = strtolower($matches[1]);
                if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp'])) {
                    $extension = 'jpg';
                }
            } else {
                $extension = 'jpg';
            }

            $binary = base64_decode($photoData, true);
            if ($binary === false || strlen($binary) === 0) {
                return null;
            }

            $filename = 'attendance-snapshots/'.Str::uuid().'.'.$extension;
            Storage::disk('public')->put($filename, $binary);

            return $filename;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    private function labelForScanCountToday(int $internUserId, CarbonInterface $at): ScanLabel
    {
        $timezone = config('dtr.timezone');
        $localAt = $at->clone()->setTimezone($timezone);
        $dayStart = $localAt->clone()->startOfDay();
        $dayEnd = $localAt->clone()->endOfDay();

        $scansToday = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->whereBetween('scan_timestamp', [$dayStart, $dayEnd])
            ->count();

        $cutoff = Carbon::parse($localAt->toDateString().' '.config('dtr.time_out_cutoff'), $timezone);

        // If the day's first scan is after the time-out cutoff (e.g. 4:00 PM),
        // it is a Time Out (missing time in), not a Time In.
        if ($scansToday <= 1 && $localAt->gt($cutoff)) {
            return ScanLabel::TimeOut;
        }

        return $scansToday <= 1 ? ScanLabel::TimeIn : ScanLabel::TimeOut;
    }
}
