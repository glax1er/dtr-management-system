<?php

namespace App\Support\Attendance;

use Carbon\CarbonInterface;

/**
 * The result of computing one intern's rendered hours for a single day.
 */
final readonly class RenderedHours
{
    public function __construct(
        public ?CarbonInterface $timeIn,
        public ?CarbonInterface $timeOut,
        public float $hours,
        public bool $lunchDeducted,
        /**
         * True when timeIn and timeOut are both present but the raw
         * gap between them is under the short-shift threshold (see
         * ComputeRenderedHoursForDay::SHORT_SHIFT_THRESHOLD_MINUTES) —
         * e.g. an accidental 2-scan day that cleared the 5-minute
         * debounce but is still too short to be a real shift. Always
         * false when the day isn't complete; that's a different case
         * ("forgot to time out"), not this one.
         */
        public bool $isSuspiciouslyShort,
    ) {}

    /**
     * True only when the intern has both a time-in and a time-out for
     * the day. False when there were no scans at all, or only one
     * (the intern timed in but hasn't timed out yet, or forgot to).
     *
     * Note: this only checks presence, not plausibility — a complete
     * day can still be suspiciously short. See $isSuspiciouslyShort.
     */
    public function isComplete(): bool
    {
        return $this->timeIn !== null && $this->timeOut !== null;
    }
}