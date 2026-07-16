<?php

namespace App\Support\Attendance;

/**
 * Display-only label for the scanner screen ("Timed In" / "Timed Out").
 * This is never written to attendance_logs — there is no direction
 * column, by design. The label is derived fresh on every scan from
 * how many scans the intern already has today, so it can never drift
 * out of sync with the MIN/MAX reporting logic in
 * ComputeRenderedHoursForDay — they're two independent reads of the
 * same raw rows, not two sources of truth.
 */
enum ScanLabel: string
{
    case TimeIn = 'time_in';
    case TimeOut = 'time_out';
}