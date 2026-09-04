<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * Fortify's controller already logged the new user in right before this
     * response is built. Interns can't use their account until they verify
     * their email and an admin approves it, so we immediately log them back
     * out here — for BOTH the JSON (AJAX) and redirect response paths.
     *
     * Leaving the JSON path logged in (as it previously was) put the
     * browser in an authenticated-but-unverified state. From there,
     * visiting /login or /email/verify triggers an infinite redirect loop:
     * /login's `guest` middleware bounces an authenticated user to
     * /dashboard -> /dashboard's `verified` middleware bounces an
     * unverified user to /email/verify -> the verifyEmailView bounces an
     * unverified user back to /login -> repeat (ERR_TOO_MANY_REDIRECTS).
     */
    public function toResponse($request)
    {
        $email = $request->user()?->email;

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'email' => $email,
            ]);
        }

        return redirect()->route('verification.notice')->with(
            'status',
            'A 6-digit verification code has been sent to your email address. Please enter it below to verify your account.',
        );
    }
}
