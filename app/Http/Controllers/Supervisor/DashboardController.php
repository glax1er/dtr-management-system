<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $supervisor = auth()->user();
        $supervisorProfile = $supervisor->supervisorProfile;

        // Get interns based on supervisor type (HTE or OJT)
        $myInterns = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->get();

        $myInternsCount = $myInterns->count();

        $scansToday = AttendanceLog::where('supervisor_user_id', $supervisor->id)
            ->whereDate('scan_timestamp', Carbon::today())
            ->count();

        $scansThisWeek = AttendanceLog::where('supervisor_user_id', $supervisor->id)
            ->whereBetween('scan_timestamp', [Carbon::now()->startOfWeek(), Carbon::now()])
            ->count();

        $recentScans = AttendanceLog::where('supervisor_user_id', $supervisor->id)
            ->with('intern:id,name')
            ->latest('scan_timestamp')
            ->limit(8)
            ->get()
            ->map(function (AttendanceLog $log) {
                // Same rule as RecordScan: the intern's Nth scan that
                // day is Time In only if N <= 1, otherwise Time Out.
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
            'supervisorType' => $supervisorProfile->supervisor_type,
            'isOjtSupervisor' => $supervisorProfile->isOjtSupervisor(),
            'scopeName' => $supervisorProfile->getScopeName(),
        ]);
    }
}