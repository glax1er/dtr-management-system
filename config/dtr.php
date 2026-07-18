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

];
