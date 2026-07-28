<?php
// app/Http/Middleware/EnsureOjtSupervisor.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOjtSupervisor
{
    /**
     * The HTE roster view only makes sense for OJT Supervisors, who
     * oversee a whole program across every HTE. HTE Supervisors are
     * already scoped to their own single HTE, so this surface stays
     * hidden for them — mirrors EnsureHteSupervisor's resolution-tickets
     * gate, just inverted.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supervisorProfile = $request->user()?->supervisorProfile;

        if (! $supervisorProfile || ! $supervisorProfile->isOjtSupervisor()) {
            abort(403, 'This view is only available to OJT Supervisors.');
        }

        return $next($request);
    }
}
