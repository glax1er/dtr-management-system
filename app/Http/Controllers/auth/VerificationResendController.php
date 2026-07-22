<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class VerificationResendController extends Controller
{
    /**
     * Resend the "verify your email" link to a signed-out user.
     *
     * Used from two places on the frontend:
     *  - the "verify your email" dialog shown right after registration
     *  - the "email not verified" dialog shown when login is blocked
     *
     * Both enforce a 30s cooldown client-side; we enforce the same window
     * server-side (keyed by email) so the limit can't be bypassed by
     * calling this endpoint directly. The response is identical whether
     * or not the email belongs to a real, unverified account, so this
     * can't be used to probe which addresses are registered.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = Str::lower($request->string('email')->value());
        $throttleKey = 'verify-resend:'.$email;

        if (! RateLimiter::tooManyAttempts($throttleKey, maxAttempts: 1)) {
            RateLimiter::hit($throttleKey, decaySeconds: 30);

            $user = User::where('email', $email)->first();

            if ($user && ! $user->hasVerifiedEmail()) {
                $user->sendEmailVerificationNotification();
            }
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Verification link sent. Please check your email.',
        ]);

        return back();
    }
}