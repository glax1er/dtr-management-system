<?php

namespace App\Actions\Attendance;

use App\Models\AttendanceLog;
use App\Support\Attendance\RenderedHours;
use Carbon\CarbonInterface;

/**
 * Turns one intern's raw scans for one day into a single time-in,
 * time-out, and hours-rendered figure.
 *
 * time_in  = earliest scan of the day
 * time_out = latest scan of the day
 * Everything in between is ignored here (it's an accidental re-scan),
 * but it's never deleted — it stays in attendance_logs for audit.
 */
class ComputeRenderedHoursForDay
{
    /**
     * The lunch window deducted from a day's hours when the shift
     * actually crosses it. Hardcoded per the current spec — whether
     * this becomes Admin-configurable is a deferred decision. If that
     * lands, this is the only place that needs to change: swap the two
     * constants for a settings lookup and the logic below stays as-is.
     */
    private const int LUNCH_START_HOUR = 12;

    private const int LUNCH_END_HOUR = 13;

    /**
     * A completed day (time-in and time-out both present) with a raw
     * gap under this many minutes is flagged for Sir Tupas/Admin to
     * review, rather than silently accepted as a valid full day. This
     * sits above the 5-minute debounce in RecordScan on purpose: the
     * debounce already prevents any two *recorded* scans for the same
     * intern from being closer together than 5 minutes, so a lower
     * threshold here could never actually trigger. 30 minutes catches
     * the "cleared the debounce but still clearly not a real shift"
     * case — e.g. two scans 10 minutes apart — without flagging
     * legitimate short partial days.
     */
    private const int SHORT_SHIFT_THRESHOLD_MINUTES = 30;

    public function __invoke(int $internUserId, CarbonInterface $date): RenderedHours
    {
        $scans = AttendanceLog::query()
            ->where('intern_user_id', $internUserId)
            ->whereDate('scan_timestamp', $date)
            ->orderBy('scan_timestamp')
            ->pluck('scan_timestamp');

        if ($scans->isEmpty()) {
            return new RenderedHours(
                timeIn: null,
                timeOut: null,
                hours: 0.0,
                lunchDeducted: false,
                isSuspiciouslyShort: false,
            );
        }

        // Only one scan today: we have a time-in, but no time-out to
        // pair it with yet. Report it as incomplete rather than guessing.
        if ($scans->count() === 1) {
            return new RenderedHours(
                timeIn: $scans->first(),
                timeOut: null,
                hours: 0.0,
                lunchDeducted: false,
                isSuspiciouslyShort: false,
            );
        }

        $timeIn = $scans->first();
        $timeOut = $scans->last();

        $lunchStart = $date->copy()->setTime(self::LUNCH_START_HOUR, 0);
        $lunchEnd = $date->copy()->setTime(self::LUNCH_END_HOUR, 0);

        // The shift "crosses" the window if it starts before the window
        // ends AND ends after the window starts — e.g. a 9-5 shift
        // crosses it, but a 1pm-5pm shift (starts exactly when lunch
        // ends) does not, so it isn't wrongly docked an hour.
        $crossesLunch = $timeIn->lt($lunchEnd) && $timeOut->gt($lunchStart);

        // Checked on the raw gap, before any lunch deduction — this is
        // a plausibility check ("was this really a shift?"), a
        // separate concern from how much of it gets paid.
        $rawMinutes = $timeIn->diffInMinutes($timeOut);
        $isSuspiciouslyShort = $rawMinutes < self::SHORT_SHIFT_THRESHOLD_MINUTES;

        $minutes = $rawMinutes;

        if ($crossesLunch) {
            // max(0, ...) guards a rare edge case: a shift entirely inside
            // the lunch window (e.g. 12:15-12:45) would otherwise go
            // negative once the hour is subtracted.
            $minutes = max(0, $minutes - 60);
        }

        return new RenderedHours(
            timeIn: $timeIn,
            timeOut: $timeOut,
            hours: round($minutes / 60, 2),
            lunchDeducted: $crossesLunch,
            isSuspiciouslyShort: $isSuspiciouslyShort,
        );
    }
}