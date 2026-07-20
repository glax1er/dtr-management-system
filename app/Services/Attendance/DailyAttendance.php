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
        public string $date,                // 'Y-m-d', in the DTR display timezone
        public CarbonInterface $timeIn,      // first scan of the day
        public ?CarbonInterface $timeOut,    // last scan of the day, null if only 1 scan
        public float $hoursRendered,
        public bool $lunchDeducted,
        public int $rawScanCount,   // total raw scans that day, incl. accidental double-scans
    ) {}

    /**
     * A day with only one scan means the intern timed in but the system
     * never saw a matching time-out scan (forgot to scan out, or it's
     * simply still in progress today).
     */
    public function isOpen(): bool
    {
        return $this->timeOut === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $timezone = config('dtr.timezone');

        return [
            'date' => $this->date,
            'day' => Carbon::parse($this->date)->format('l'),
            'time_in' => $this->timeIn->clone()->setTimezone($timezone)->format('H:i:s'),
            'time_out' => $this->timeOut?->clone()->setTimezone($timezone)->format('H:i:s'),
            'hours_rendered' => round($this->hoursRendered, 2),
            'lunch_deducted' => $this->lunchDeducted,
            'status' => $this->isOpen() ? 'open' : 'complete',
            'raw_scan_count' => $this->rawScanCount,
        ];
    }
}