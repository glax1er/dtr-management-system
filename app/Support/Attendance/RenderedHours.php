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
    ) {}

    /**
     * True only when the intern has both a time-in and a time-out for
     * the day. False when there were no scans at all, or only one
     * (the intern timed in but hasn't timed out yet, or forgot to).
     */
    public function isComplete(): bool
    {
        return $this->timeIn !== null && $this->timeOut !== null;
    }
}