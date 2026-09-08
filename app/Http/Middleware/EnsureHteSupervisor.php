<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHteSupervisor
{
    public function handle(Request $request, Closure $next): Response
    {
        $supervisorProfile = $request->user()?->supervisorProfile;

        if (! $supervisorProfile || $supervisorProfile->status !== 'active') {
            abort(403, 'Your supervisor profile is inactive or not found.');
        }

        if ($supervisorProfile->isOjtSupervisor()) {
            abort(403, 'OJT Supervisors cannot access HTE Supervisor functions.');
        }

        return $next($request);
    }
}
