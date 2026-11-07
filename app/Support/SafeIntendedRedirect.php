<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SafeIntendedRedirect
{
    /**
     * Safely redirect an authenticated user to their intended destination or home route.
     *
     * Validates that the intended URL (if any in session) is authorized for the given user.
     * If the intended URL is missing, invalid, or requires permissions the user lacks
     * (e.g. an intern attempting to hit an admin dashboard), the session's intended URL
     * is cleared and the user is redirected to their own role-appropriate home route.
     */
    public static function redirect(Request $request, ?User $user = null, ?string $default = null): RedirectResponse
    {
        $user = $user ?? $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->requiresPasswordChange()) {
            return redirect()->route('password.first-login');
        }

        $fallback = $default ?? route($user->homeRouteName());
        $intended = $request->session()->get('url.intended');

        if ($intended && self::isAuthorizedForUser($user, $intended)) {
            return redirect()->intended($fallback);
        }

        $request->session()->forget('url.intended');

        return redirect()->to($fallback);
    }

    /**
     * Check if a given URL is safe and authorized for the specified user.
     */
    public static function isAuthorizedForUser(User $user, ?string $url): bool
    {
        if (empty($url)) {
            return false;
        }

        $intendedHost = parse_url($url, PHP_URL_HOST);
        if ($intendedHost && $intendedHost !== request()->getHost()) {
            return false;
        }

        try {
            $simulatedRequest = Request::create($url, 'GET');
            $route = app('router')->getRoutes()->match($simulatedRequest);
        } catch (\Throwable) {
            return false;
        }

        // Avoid redirecting to root '/' or generic '/dashboard' which would cause redundant hops
        if ($route->getName() === 'home' || $route->uri() === '/' || $route->uri() === 'dashboard') {
            return false;
        }

        $middlewares = $route->gatherMiddleware();

        foreach ($middlewares as $middleware) {
            if (! is_string($middleware)) {
                continue;
            }

            // Do not redirect to guest-only routes like /login or /two-factor-challenge
            if ($middleware === 'guest' || str_starts_with($middleware, 'guest:')) {
                return false;
            }

            if (str_starts_with($middleware, 'role:')) {
                $allowedRoles = explode(',', substr($middleware, 5));
                if (! in_array($user->role, $allowedRoles, true)) {
                    if ($user->role === 'admin') {
                        $isSuper = in_array('super_admin', $allowedRoles, true) && $user->isSuperAdmin();
                        $isCollege = in_array('college_admin', $allowedRoles, true) && $user->isCollegeAdmin();
                        if (! $isSuper && ! $isCollege) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }

            if ($middleware === 'hte-supervisor') {
                $profile = $user->supervisorProfile;
                if (! $profile || $profile->status !== 'active' || $profile->isOjtSupervisor()) {
                    return false;
                }
            }

            if ($middleware === 'ojt-supervisor') {
                $profile = $user->supervisorProfile;
                if (! $profile || $profile->status !== 'active' || ! $profile->isOjtSupervisor()) {
                    return false;
                }
            }
        }

        return true;
    }
}
