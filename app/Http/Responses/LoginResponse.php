<?php

// app/Http/Responses/LoginResponse.php

namespace App\Http\Responses;

use App\Support\SafeIntendedRedirect;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        return SafeIntendedRedirect::redirect($request);
    }
}
