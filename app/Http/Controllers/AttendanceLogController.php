<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $profile = $user->internProfile()->with(['hte', 'program'])->firstOrFail();

        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone)->toDateString();

        // Last 14 days for the dashboard's "recent activity" preview.
        // The full, filterable history lives on the attendance-logs page.
        $recentDays = $this->calculator->forIntern(
            $user->id,
            from: Carbon::now($timezone)->subDays(13),
            to: Carbon::now($timezone),
        );

        $todayEntry = $recentDays->firstWhere('date', $today);

        $requiredHours = $profile->program->required_hours ?? config('dtr.default_required_hours');
        $totalHours = $this->calculator->totalHours($user->id);

        return Inertia::render('Intern/dashboard', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte->hte_name,
                'program_name' => $profile->program->program_name,
                'status' => $profile->status,
                // Placeholder only — QR generation/display is being built
                // separately. This flag just tells the UI whether a code
                // exists yet at all; it never renders the actual image here.
                'has_qr_code' => $profile->qr_code_value !== null,
            ],
            'today' => [
                'date' => $today,
                'time_in' => $todayEntry?->timeIn->clone()->setTimezone($timezone)->format('H:i:s'),
                'time_out' => $todayEntry?->timeOut?->clone()->setTimezone($timezone)->format('H:i:s'),
                'status' => $todayEntry === null ? 'not_started' : ($todayEntry->isOpen() ? 'open' : 'complete'),
            ],
            'hours' => [
                'total_rendered' => $totalHours,
                'required' => $requiredHours,
                'progress_percent' => $requiredHours > 0
                    ? min(100, round(($totalHours / $requiredHours) * 100, 1))
                    : 0,
            ],
            'recentLogs' => $recentDays->reverse()->values()->map->toArray(),
        ]);
    }
}
