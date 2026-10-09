<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorEnforced
{
    /**
     * Enforce Two-Factor Authentication or a Passkey for privileged administrative accounts.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            return $next($request);
        }

        // Allow bypassing in unit tests unless explicitly enabled for testing 2FA enforcement
        if (app()->runningUnitTests() && ! config('auth.test_enforce_admin_2fa', false)) {
            return $next($request);
        }

        if (! $user->hasTwoFactorOrPasskeyEnabled()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Two-Factor Authentication or a Passkey is required for administrative accounts.',
                ], Response::HTTP_FORBIDDEN);
            }

            return redirect()->route('security.edit')->with(
                'error',
                'Two-Factor Authentication or a Passkey is required for administrator accounts before accessing the admin dashboard.'
            );
        }

        return $next($request);
    }
}
