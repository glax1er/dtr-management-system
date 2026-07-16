<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * Fortify's controller already logged the new user in right before this
     * response is built. Interns can't use their account until an admin
     * approves it (see `intern_profiles.status`), so we immediately log
     * them back out and send them to the register page to show the
     * "pending approval" dialog, rather than letting them straight in.
     */
    public function toResponse($request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('register')->with('registered', true);
    }
}