<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    /**
     * Handle an incoming request.
     *
     * If an authenticated user is flagged with must_change_password = true,
     * they must update their initial password before accessing any other application features.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->requiresPasswordChange()) {
            $allowedRouteNames = [
                'password.first-login',
                'password.first-login.update',
                'logout',
            ];

            if (! in_array($request->route()?->getName(), $allowedRouteNames, true)) {
                return redirect()->route('password.first-login');
            }
        }

        return $next($request);
    }
}
