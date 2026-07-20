<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Derives daily time-in / time-out / hours-rendered from the raw,
 * append-only attendance_logs table.
 *
 * Deliberately does none of this at write time (FR-9's "auto-detect
 * time in vs time out" is a scanner/UI concern, not this class's job).
 * Every scan is just a row. This class only aggregates for *reading*:
 *
 *   - time_in  = MIN(scan_timestamp) for the local calendar day
 *   - time_out = MAX(scan_timestamp) for the local calendar day
 *                (or null if there's only one scan that day — an
 *                "open" day, e.g. forgot to time out)
 *   - hours_rendered = time_out - time_in, minus a 1-hour lunch
 *                deduction, but only if the span actually crosses
 *                the configured lunch window.
 *
 * Accidental double/triple scans are never rejected or de-duped in the
 * raw log (no debounce, per the system overview) — they just collapse
 * naturally into the same MIN/MAX day here, while still being visible
 * in raw_scan_count for audit purposes.
 */
class DailyAttendanceCalculator
{
    /**
     * @return Collection<int, DailyAttendance> ordered oldest date first
     */
    public function forIntern(int $internUserId, ?Carbon $from = null, ?Carbon $to = null): Collection
    {
        $timezone = config('dtr.timezone');

        $query = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->orderBy('scan_timestamp');

        if ($from !== null) {
            $query->where('scan_timestamp', '>=', $from->clone()->setTimezone($timezone)->startOfDay()->setTimezone('UTC'));
        }

        if ($to !== null) {
            $query->where('scan_timestamp', '<=', $to->clone()->setTimezone($timezone)->endOfDay()->setTimezone('UTC'));
        }

        $scansByDate = $query->get()
            ->groupBy(fn (AttendanceLog $log) => $log->scan_timestamp->clone()->setTimezone($timezone)->toDateString());

        return $scansByDate
            ->map(fn (Collection $scans, string $date) => $this->summarizeDay($date, $scans))
            ->values()
            ->sortBy('date')
            ->values();
    }

    /**
     * Sum of hours_rendered across every day in range (FR-27). Recomputed
     * from the daily breakdown rather than stored anywhere, so it's
     * always consistent with what the intern sees in their log table.
     */
    public function totalHours(int $internUserId, ?Carbon $from = null, ?Carbon $to = null): float
    {
        return round(
            $this->forIntern($internUserId, $from, $to)->sum('hoursRendered'),
            2,
        );
    }

    /**
     * @param  Collection<int, AttendanceLog>  $scansForDay
     */
    private function summarizeDay(string $date, Collection $scansForDay): DailyAttendance
    {
        $timeIn = $scansForDay->first()->scan_timestamp;
        $timeOut = $scansForDay->count() > 1 ? $scansForDay->last()->scan_timestamp : null;

        [$hours, $lunchDeducted] = $timeOut !== null
            ? $this->computeHours($date, $timeIn, $timeOut)
            : [0.0, false];

        return new DailyAttendance(
            date: $date,
            timeIn: $timeIn,
            timeOut: $timeOut,
            hoursRendered: $hours,
            lunchDeducted: $lunchDeducted,
            rawScanCount: $scansForDay->count(),
        );
    }

    /**
     * @return array{0: float, 1: bool}
     */
    private function computeHours(string $date, CarbonInterface $timeIn, CarbonInterface $timeOut): array
    {
        $timezone = config('dtr.timezone');

        $localTimeIn = $timeIn->clone()->setTimezone($timezone);
        $localTimeOut = $timeOut->clone()->setTimezone($timezone);

        $rawHours = $localTimeIn->floatDiffInHours($localTimeOut);

        $lunchStart = Carbon::parse($date.' '.config('dtr.lunch_start'), $timezone);
        $lunchEnd = Carbon::parse($date.' '.config('dtr.lunch_end'), $timezone);

        // Overlap test: the logged span crosses the lunch window if it
        // starts before the window ends AND ends after the window starts.
        // This is what keeps half-day / after-lunch-only shifts from
        // being wrongly docked an hour they never actually took.
        $crossesLunch = $localTimeIn->lt($lunchEnd) && $localTimeOut->gt($lunchStart);

        if ($crossesLunch) {
            return [max(0.0, $rawHours - 1), true];
        }

        return [$rawHours, false];
    }
}