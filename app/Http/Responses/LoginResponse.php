<?php

// app/Http/Responses/LoginResponse.php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        if ($request->user()?->requiresPasswordChange()) {
            return redirect()->route('password.first-login');
        }

        return redirect()->intended(route($request->user()->homeRouteName()));
    }
}
