<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Display / grouping timezone
    |--------------------------------------------------------------------------
    |
    | scan_timestamp is stored using the app's default connection timezone
    | (UTC — see config/app.php). But "what day was this scan on" and the
    | lunch-window check both need to happen in local time, or an intern
    | scanning at 7am Manila time could get grouped into the wrong day.
    | This is kept separate from config('app.timezone') on purpose so we
    | don't change how the rest of the app stores/reads timestamps.
    |
    */
    'timezone' => env('DTR_TIMEZONE', 'Asia/Manila'),

    /*
    |--------------------------------------------------------------------------
    | Lunch break window
    |--------------------------------------------------------------------------
    |
    | Per the functional requirements, 1 hour is deducted from a day's
    | rendered hours ONLY if the logged time span actually crosses this
    | window (so a half-day or after-lunch-only shift isn't wrongly docked).
    |
    | Open item (flagged in the FR doc): whether this should eventually be
    | Admin-configurable per HTE instead of a single hardcoded window.
    | Hardcoded here for now so it's a one-line change later.
    |
    */
    'lunch_start' => env('DTR_LUNCH_START', '12:00'),
    'lunch_end' => env('DTR_LUNCH_END', '13:00'),

    /*
    |--------------------------------------------------------------------------
    | Default required hours
    |--------------------------------------------------------------------------
    |
    | Used as the denominator for an intern's hours-rendered progress
    | bar/circle when their profile doesn't specify its own value
    | (programs.required_hours). Not covered by an FR yet — this is a
    | reasonable placeholder until every program has one set by Admin.
    |
    */
    'default_required_hours' => (int) env('DTR_REQUIRED_HOURS', 486),

    /*
    |--------------------------------------------------------------------------
    | Expected start time (fallback)
    |--------------------------------------------------------------------------
    |
    | Used for both the "on time"/"late" punctuality label AND the hours-
    | rendered clamp. This is only the last-resort fallback now — a given
    | day's actual expected start time is resolved via SchedulePeriod first
    | (HTE-specific override, then the global admin default), and this
    | value is only used if neither of those has a period configured for
    | that day at all.
    |
    */
    'expected_start_time' => env('DTR_EXPECTED_START_TIME', '08:00'),

    /*
    |--------------------------------------------------------------------------
    | Time-out cutoff
    |--------------------------------------------------------------------------
    |
    | If a day's *first* scan comes in after this time, it's treated as
    | a time-out instead of a time-in — the intern forgot to scan in
    | that morning, so there's no time-in to record for that day at all.
    | Same "hardcoded for now, one-line change later" pattern as the
    | lunch window above.
    |
    */
    'time_out_cutoff' => env('DTR_TIME_OUT_CUTOFF', '16:00'),


    'grace_period_minutes' => env('DTR_GRACE_PERIOD_MINUTES', 30),

    /*
    |--------------------------------------------------------------------------
    | Early-arrival allowance (hours-rendered clamp)
    |--------------------------------------------------------------------------
    |
    | An intern who scans in before the expected start time doesn't have
    | that entire early arrival thrown away — up to this many minutes
    | *before* the resolved expected start time (SchedulePeriod override,
    | then global default, then the fallback above) still counts as
    | rendered time. Anything earlier than that is still clamped away.
    |
    | Applies uniformly on top of whichever expected start time layer
    | ends up being used — it doesn't change which layer wins, only how
    | much of an early scan-in counts once that layer is resolved.
    |
    */
    'early_arrival_allowance_minutes' => env('DTR_EARLY_ARRIVAL_ALLOWANCE_MINUTES', 60),

];
