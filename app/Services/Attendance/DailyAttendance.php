<?php

namespace App\Services\Attendance;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * One calendar day's aggregated attendance for a single intern.
 *
 * This is a *read model* built from raw attendance_logs rows — it is
 * never persisted. See DailyAttendanceCalculator for how it's derived.
 */
final readonly class DailyAttendance
{
    public function __construct(
        public string $date,                 // 'Y-m-d', in the DTR display timezone
        public ?CarbonInterface $timeIn,     // null if the day's first scan came in after the cutoff
        public ?CarbonInterface $timeOut,    // null if only 1 scan and it wasn't after cutoff
        public float $hoursRendered,
        public bool $lunchDeducted,
        public int $rawScanCount,   // total raw scans that day, incl. accidental double-scans
    ) {}

    /**
     * Timed in, but the system never saw a matching time-out scan
     * (forgot to scan out, or it's simply still in progress today).
     */
    public function isOpen(): bool
    {
        return $this->timeIn !== null && $this->timeOut === null;
    }

    /**
     * The day's first scan landed after the configured cutoff, so it
     * was recorded as a time-out instead — there's no time-in at all.
     */
    public function isMissingTimeIn(): bool
    {
        return $this->timeIn === null;
    }

    /**
     * No scans at all that day (a synthetic entry from the calculator's
     * expected-workday diff, not a real attendance_logs row) — distinct
     * from isMissingTimeIn(), which can also be true for a day that DID
     * have a scan, just one that landed after the cutoff.
     */
    public function isFullyMissing(): bool
    {
        return $this->rawScanCount === 0;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $timezone = config('dtr.timezone');

        $status = match (true) {
            $this->isFullyMissing() => 'no_record',
            $this->isMissingTimeIn() => 'missing_time_in',
            $this->isOpen() => 'open',
            default => 'complete',
        };

        return [
            'date' => $this->date,
            'day' => Carbon::parse($this->date)->format('l'),
            'time_in' => $this->timeIn?->clone()->setTimezone($timezone)->format('g:i A'),
            'time_out' => $this->timeOut?->clone()->setTimezone($timezone)->format('g:i A'),
            'hours_rendered' => round($this->hoursRendered, 2),
            'lunch_deducted' => $this->lunchDeducted,
            'status' => $status,
            'raw_scan_count' => $this->rawScanCount,
        ];
    }
}
