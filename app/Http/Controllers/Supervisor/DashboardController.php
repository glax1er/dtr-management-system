<?php
// app/Http/Controllers/Supervisor/DashboardController.php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternProfile;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $supervisor = auth()->user();
        $hteId = $supervisor->supervisorProfile->hte_id;

        $myInternsCount = InternProfile::where('hte_id', $hteId)
            ->where('status', 'approved')
            ->count();

        // Scope every scan query through the intern's HTE, not a
        // stored supervisor_user_id — kiosk scans no longer record
        // who scanned it, only who was scanned.
        $baseQuery = fn () => AttendanceLog::query()
            ->whereHas('internProfile', fn ($q) => $q->where('hte_id', $hteId));

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
        ]);
    }
}