<?php
// app/Actions/Attendance/RecordScan.php

namespace App\Actions\Attendance;

use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\Kiosk;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use App\Support\Attendance\ScanResult;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

class RecordScan
{
    private const int DEBOUNCE_MINUTES = 5;

    public function __invoke(string $qrCodeValue, Kiosk $kiosk, ?CarbonInterface $at = null): ScanResult
    {
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
            AttendanceLog::create([
                'intern_user_id' => $internProfile->user_id,
                'kiosk_id' => $kiosk->id,
                'scan_timestamp' => $at,
            ]);
        }

        return new ScanResult(
            internUserId: $internProfile->user_id,
            internName: $internProfile->user->name,
            idNumber: $internProfile->id_number,
            programName: $internProfile->program?->program_name ?? 'Deleted Program',
            hteName: $internProfile->hte?->hte_name ?? 'Deleted HTE',
            photoUrl: $internProfile->profile_photo_url,
            label: $this->labelForScanCountToday($internProfile->user_id, $at),
            timestamp: $isDuplicate ? $lastScan->scan_timestamp : $at,
            isDuplicate: $isDuplicate,
        );
    }

    private function labelForScanCountToday(int $internUserId, CarbonInterface $at): ScanLabel
    {
        $scansToday = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->whereDate('scan_timestamp', $at)
            ->count();

        return $scansToday <= 1 ? ScanLabel::TimeIn : ScanLabel::TimeOut;
    }
}