<?php

namespace App\Actions\Attendance;

use App\Exceptions\Attendance\InvalidScanException;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use App\Models\User;
use App\Support\Attendance\ScanLabel;
use App\Support\Attendance\ScanRejectionReason;
use App\Support\Attendance\ScanResult;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Date;

/**
 * The single write path for both Time In and Time Out. attendance_logs
 * has no direction column, so there is no "which kind of row" decision
 * to make here — every accepted scan is written identically. What
 * this action actually decides is whether to write anything at all
 * (QR / approval / HTE checks, debounce), and what display label to
 * hand back to the scanner screen.
 *
 * Deliberately not wired to a route/controller yet: there is no
 * role-based auth middleware in the app yet to resolve "the currently
 * logged-in supervisor," so this is built as a self-contained,
 * directly-testable action that a thin controller can call the
 * moment that auth piece lands.
 */
class RecordScan
{
    /**
     * Scans from the same intern within this many minutes of their
     * last scan are treated as accidental re-taps: no new row is
     * written, and the original scan's details are returned instead.
     * 5 minutes matches a standard preset on commercial time clocks
     * (e.g. ClockRite's selectable 1/2/5-minute duplicate-punch
     * periods), and was chosen so a genuinely forgetful re-scan
     * shortly after timing in doesn't accidentally register as a
     * time-out.
     */
    private const int DEBOUNCE_MINUTES = 5;

    public function __invoke(string $qrCodeValue, User $supervisorUser, ?CarbonInterface $at = null): ScanResult
    {
        $at ??= Date::now();

        $internProfile = InternProfile::query()
            ->with('user')
            ->where('qr_code_value', $qrCodeValue)
            ->first();

        if ($internProfile === null) {
            throw new InvalidScanException(ScanRejectionReason::QrNotRecognized);
        }

        if ($internProfile->status !== 'approved') {
            throw new InvalidScanException(ScanRejectionReason::InternNotApproved);
        }

        $supervisorProfile = $supervisorUser->supervisorProfile;

        if ($supervisorProfile === null) {
            throw new InvalidScanException(ScanRejectionReason::ScannerNotSupervisor);
        }

        if ($supervisorProfile->hte_id !== $internProfile->hte_id) {
            throw new InvalidScanException(ScanRejectionReason::HteMismatch);
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
                'supervisor_user_id' => $supervisorUser->id,
                'scan_timestamp' => $at,
            ]);
        }

        return new ScanResult(
            internUserId: $internProfile->user_id,
            internName: $internProfile->user->name,
            label: $this->labelForScanCountToday($internProfile->user_id, $at),
            timestamp: $isDuplicate ? $lastScan->scan_timestamp : $at,
            isDuplicate: $isDuplicate,
        );
    }

    /**
     * Display-only: the first scan of the day is labeled Time In,
     * every scan after that is labeled Time Out. Nothing about this
     * label is stored — ComputeRenderedHoursForDay derives time-in/
     * time-out independently via MIN/MAX over the same raw rows, so
     * the two can never drift apart.
     */
    private function labelForScanCountToday(int $internUserId, CarbonInterface $at): ScanLabel
    {
        $scansToday = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->whereDate('scan_timestamp', $at)
            ->count();

        return $scansToday <= 1 ? ScanLabel::TimeIn : ScanLabel::TimeOut;
    }
}