<?php
// app/Http/Responses/LoginResponse.php

namespace App\Http\Responses;

use App\Models\User;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $route = match ($request->user()->role) {
            User::ROLE_ADMIN => 'admin.dashboard',
            User::ROLE_SUPERVISOR => 'supervisor.dashboard',
            User::ROLE_INTERN => 'intern.dashboard',
        };

        return redirect()->intended(route($route));
    }
}