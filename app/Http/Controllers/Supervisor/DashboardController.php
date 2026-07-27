<?php
// app/Http/Controllers/Supervisor/DashboardController.php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response|RedirectResponse
    {
        $supervisor = auth()->user();
        $supervisorProfile = $supervisor->supervisorProfile;

        // OJT Supervisors don't have a dashboard of their own — login and
        // the generic /dashboard route already send them straight to their
        // roster, but this catches a direct hit or stale bookmark too.
        if ($supervisorProfile->isOjtSupervisor()) {
            return redirect()->route('supervisor.interns.index');
        }

        $internUserIds = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->pluck('user_id');

        $myInternsCount = $internUserIds->count();

        // Scope every scan query to those interns — kiosk scans no
        // longer record who scanned it, only who was scanned.
        $baseQuery = fn () => AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds);

        $scansToday = $baseQuery()
            ->whereDate('scan_timestamp', Carbon::today())
            ->count();

        $scansThisWeek = $baseQuery()
            ->whereBetween('scan_timestamp', [Carbon::now()->startOfWeek(), Carbon::now()])
            ->count();

        $recentScans = $baseQuery()
            ->with('intern:id,name')
            ->latest('scan_timestamp')
            ->limit(8)
            ->get()
            ->map(function (AttendanceLog $log) {
                $scansUpToThisOneToday = AttendanceLog::where('intern_user_id', $log->intern_user_id)
                    ->whereDate('scan_timestamp', $log->scan_timestamp)
                    ->where('scan_timestamp', '<=', $log->scan_timestamp)
                    ->count();

                return [
                    'intern_name' => $log->intern->name,
                    'label' => $scansUpToThisOneToday <= 1 ? 'time_in' : 'time_out',
                    'scanned_at' => $log->scan_timestamp->diffForHumans(),
                ];
            });

        return Inertia::render('supervisor/dashboard', [
            'myInternsCount' => $myInternsCount,
            'scansToday' => $scansToday,
            'scansThisWeek' => $scansThisWeek,
            'recentScans' => $recentScans,
            'scopeName' => $supervisorProfile->getScopeName(),
        ]);
    }
}