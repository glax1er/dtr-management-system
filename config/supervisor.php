<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Supervisor Password
    |--------------------------------------------------------------------------
    |
    | When an admin creates a supervisor account, this is the initial
    | password assigned. The supervisor is expected to change it after
    | first login via their account settings. If forgotten, the standard
    | Fortify "forgot password" flow works normally on this account too,
    | since it's just a regular hashed password like any other user.
    |
    */

    'default_supervisor_password' => env('DEFAULT_SUPERVISOR_PASSWORD', 'Supervisor@123'),
];