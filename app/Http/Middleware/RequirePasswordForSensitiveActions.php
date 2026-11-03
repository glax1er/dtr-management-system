<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\RequirePassword;
use Symfony\Component\HttpFoundation\Response;

class RequirePasswordForSensitiveActions extends RequirePassword
{
    /**
     * Handle an incoming request requiring re-authentication / password confirmation.
     */
    public function handle($request, Closure $next, $redirectToRoute = null, $passwordTimeoutSeconds = null): Response
    {
        // Allow bypassing in unit tests unless explicitly enabled for testing password confirmation
        if (app()->runningUnitTests() && ! config('auth.test_enforce_password_confirm', false)) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute, $passwordTimeoutSeconds);
    }
}
