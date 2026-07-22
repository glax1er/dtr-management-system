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
     * Fortify's controller already fired the `Registered` event (which
     * queues the "verify your email" notification — see
     * AppServiceProvider::configureEventListeners()) and logged the new
     * user in right before this response is built. Interns can't use
     * their account until they verify their email *and* an admin
     * approves it (see `intern_profiles.status`), so we immediately log
     * them back out and send them to the register page to show the
     * "verify your email" dialog, rather than letting them straight in.
     */
    public function toResponse($request): RedirectResponse
    {
        // Capture the email before we tear down the session/auth state below.
        $email = $request->user()?->email;

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('register')
            ->with('verifyEmail', true)
            ->with('registeredEmail', $email);
    }
}