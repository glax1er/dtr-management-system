<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Models\SchedulePeriod;
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
    public function forIntern(int $internUserId, int $hteId, ?Carbon $from = null, ?Carbon $to = null, ?CarbonInterface $approvedAt = null): Collection
    {
        $timezone = config('dtr.timezone');

        $query = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->orderBy('scan_timestamp');

        if ($from !== null) {
            $query->where('scan_timestamp', '>=', $from->clone()->setTimezone($timezone)->startOfDay());
        }

        if ($to !== null) {
            $query->where('scan_timestamp', '<=', $to->clone()->setTimezone($timezone)->endOfDay());
        }

        $scansByDate = $query->get()
            ->groupBy(fn (AttendanceLog $log) => $log->scan_timestamp->clone()->setTimezone($timezone)->toDateString());

        $days = collect(
            $scansByDate
                ->map(fn (Collection $scans, string $date) => $this->summarizeDay($date, $scans, $hteId))
                ->all()
        );

        if ($approvedAt !== null) {
            $days = $days->merge($this->missingWorkdays($days->keys(), $approvedAt, $timezone, $from, $to));
        }

        return $days
            ->values()
            ->sortBy('date')
            ->values();
    }

    /**
     * Diffs expected workdays (Mon-Fri, from approval up to yesterday —
     * no holiday logic, deliberately deferred) against the dates that
     * already have at least one scan, and returns a synthetic
     * DailyAttendance for every gap: a day the intern should have
     * scanned at all but has zero rows for. Never includes today or any
     * future date — a day still in progress isn't "missed" yet.
     *
     * @param  Collection<int, string>  $existingDates
     * @return Collection<string, DailyAttendance> keyed by date string
     */
    private function missingWorkdays(Collection $existingDates, CarbonInterface $approvedAt, string $timezone, ?Carbon $from, ?Carbon $to): Collection
    {
        $yesterday = Carbon::now($timezone)->subDay()->startOfDay();

        $rangeStart = $approvedAt->clone()->setTimezone($timezone)->startOfDay();
        if ($from !== null) {
            $rangeStart = $rangeStart->max($from->clone()->setTimezone($timezone)->startOfDay());
        }

        $rangeEnd = $yesterday;
        if ($to !== null) {
            $rangeEnd = $rangeEnd->min($to->clone()->setTimezone($timezone)->startOfDay());
        }

        $missing = collect();

        if ($rangeStart->gt($rangeEnd)) {
            return $missing;
        }

        for ($cursor = $rangeStart->clone(); $cursor->lte($rangeEnd); $cursor = $cursor->addDay()) {
            if ($cursor->isWeekday() && ! $existingDates->contains($cursor->toDateString())) {
                $missing->put($cursor->toDateString(), new DailyAttendance(
                    date: $cursor->toDateString(),
                    timeIn: null,
                    timeOut: null,
                    hoursRendered: 0.0,
                    lunchDeducted: false,
                    rawScanCount: 0,
                ));
            }
        }

        return $missing;
    }

    /**
     * Sum of hours_rendered across every day in range (FR-27). Recomputed
     * from the daily breakdown rather than stored anywhere, so it's
     * always consistent with what the intern sees in their log table.
     */
    public function totalHours(int $internUserId, int $hteId, ?Carbon $from = null, ?Carbon $to = null): float
    {
        return round(
            $this->forIntern($internUserId, $hteId, $from, $to)->sum('hoursRendered'),
            2,
        );
    }

    /**
     * @param  Collection<int, AttendanceLog>  $scansForDay
     */
    private function summarizeDay(string $date, Collection $scansForDay, int $hteId): DailyAttendance
    {
        $timezone = config('dtr.timezone');

        $earliestScan = $scansForDay->first()->scan_timestamp;
        $latestScan = $scansForDay->count() > 1 ? $scansForDay->last()->scan_timestamp : null;

        // Global time-out cutoff for now — see computeHours() below for
        // why the *start* side is already schedule-aware; the cutoff
        // side still needs a per-HTE/day value added to SchedulePeriod
        // before this can be too (tracked separately).
        $cutoff = Carbon::parse($date.' '.config('dtr.time_out_cutoff'), $timezone);
        $earliestScanLocal = $earliestScan->clone()->setTimezone($timezone);

        if ($earliestScanLocal->gt($cutoff)) {
            // First scan of the day came in after the cutoff — treat it
            // (and the day's last scan, if there were more) as a
            // time-out, not a time-in.
            $timeIn = null;
            $timeOut = $scansForDay->last()->scan_timestamp;
        } else {
            $timeIn = $earliestScan;
            $timeOut = $latestScan;
        }

        [$hours, $lunchDeducted] = ($timeIn !== null && $timeOut !== null)
            ? $this->computeHours($date, $timeIn, $timeOut, $hteId)
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
    private function computeHours(string $date, CarbonInterface $timeIn, CarbonInterface $timeOut, int $hteId): array
    {
        $timezone = config('dtr.timezone');

        $localTimeIn = $timeIn->clone()->setTimezone($timezone);
        $localTimeOut = $timeOut->clone()->setTimezone($timezone);

        // Hours only start accruing at this HTE's actual expected start
        // time for this specific day (SchedulePeriod override, then the
        // global default), minus a small early-arrival allowance — an
        // intern who scans in well before their shift shouldn't have all
        // of that early arrival counted as rendered time, but scanning in
        // a little early (e.g. settling in before an 8:00 shift) isn't
        // penalized either. Only the later of the two (actual scan-in vs.
        // allowance-adjusted expected start) is ever used as the
        // effective time-in for the hours math below.
        //
        // If no expected start time is configured at all for this day
        // (weekend, or an HTE with no schedule for it), don't clamp —
        // count the full worked span, consistent with that day being
        // labeled 'unscheduled' rather than silently penalized against
        // a fake default.
        $expectedStartTime = SchedulePeriod::expectedStartTimeFor(
            Carbon::parse($date, $timezone),
            $hteId,
        );

        if ($expectedStartTime === null) {
            $effectiveTimeIn = $localTimeIn;
        } else {
            $allowanceMinutes = config('dtr.early_arrival_allowance_minutes', 60);

            $earliestCountedTimeIn = Carbon::parse($date.' '.$expectedStartTime, $timezone)
                ->subMinutes($allowanceMinutes);

            $effectiveTimeIn = $localTimeIn->max($earliestCountedTimeIn);
        }

        $rawHours = $localTimeOut->gt($effectiveTimeIn)
            ? $effectiveTimeIn->floatDiffInHours($localTimeOut)
            : 0.0;

        $lunchStart = Carbon::parse($date.' '.config('dtr.lunch_start'), $timezone);
        $lunchEnd = Carbon::parse($date.' '.config('dtr.lunch_end'), $timezone);

        // Overlap test: the logged span crosses the lunch window if it
        // starts before the window ends AND ends after the window starts.
        // This is what keeps half-day / after-lunch-only shifts from
        // being wrongly docked an hour they never actually took.
        $crossesLunch = $effectiveTimeIn->lt($lunchEnd) && $localTimeOut->gt($lunchStart);

        if ($crossesLunch) {
            return [max(0.0, $rawHours - 1), true];
        }

        return [$rawHours, false];
    }
}