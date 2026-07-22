<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * Verify the account tied to this signed link.
     *
     * The `signed` route middleware already guarantees the URL hasn't been
     * tampered with or expired, so all that's left to check here is that
     * the hash matches this specific user's email — the same check
     * Fortify's own EmailVerificationRequest does, just without requiring
     * an authenticated session to do it.
     */
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        if (! $user || ! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            abort(403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            event(new Verified($user));
        }

        // Interns still need admin approval after this — the login form
        // will tell them that if they try before they're approved. Admins
        // and supervisors (who don't go through this registration flow)
        // are verified upfront, so they'll never actually land here.
        return redirect()->route('login')->with(
            'status',
            $user->isIntern()
                ? "Email verified! Your registration is now pending admin approval — you'll be able to log in once it's approved."
                : 'Email verified. You can now log in.',
        );
    }
}