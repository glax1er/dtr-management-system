<?php
// app/Http/Middleware/EnsureHteSupervisor.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHteSupervisor
{
    /**
     * Time-conflict resolution stays with the HTE Supervisor who was
     * actually on site when the scan was missed. OJT Supervisors oversee
     * an entire program across every HTE for viewing/monitoring purposes,
     * but they never resolve tickets — so this blocks the whole
     * resolution-tickets surface (index, approve, reject) for them.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $supervisorProfile = $request->user()?->supervisorProfile;

     if (! $supervisorProfile || ! $supervisorProfile->isHteSupervisor()) {
      abort(403, 'OJT Supervisors cannot resolve time conflicts.');
  }

        return $next($request);
    }
}
