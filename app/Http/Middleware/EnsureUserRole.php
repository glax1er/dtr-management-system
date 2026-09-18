<?php

// app/Http/Middleware/EnsureUserRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized action.');
        }

        if (in_array($user->role, $roles, true)) {
            return $next($request);
        }

        // Support super_admin / college_admin aliases if user role is legacy 'admin'
        if ($user->role === 'admin') {
            if (in_array('super_admin', $roles, true) && $user->isSuperAdmin()) {
                return $next($request);
            }
            if (in_array('college_admin', $roles, true) && $user->isCollegeAdmin()) {
                return $next($request);
            }
        }

        abort(403, 'Unauthorized action.');
    }
}
