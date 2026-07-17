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
        $today = Carbon::now($timezone);

        $validated = $request->validate([
            // 'YYYY-MM', defaults to the current month. Drives the log
            // table below — a separate value from "today", so paging
            // back to a previous month never affects the Today card.
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m-d', $validated['month'] . '-01', $timezone)->startOfMonth()
            : $today->clone()->startOfMonth();

        $monthDays = $this->calculator->forIntern(
            $user->id,
            from: $month->clone()->startOfMonth(),
            to: $month->clone()->endOfMonth(),
        );

        // Today's card is deliberately independent of $monthDays — an
        // intern paging back to review a previous month shouldn't see
        // their "Today" status disappear.
        $todayEntry = $this->calculator
            ->forIntern($user->id, from: $today->clone()->startOfDay(), to: $today->clone()->endOfDay())
            ->first();

        $requiredHours = $profile->program->required_hours ?? config('dtr.default_required_hours');
        $totalHours = $this->calculator->totalHours($user->id);

        return Inertia::render('intern/dashboard', [
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
                'date' => $today->toDateString(),
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
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'logs' => $monthDays->map->toArray()->values(),
            'monthTotalHours' => round($monthDays->sum('hoursRendered'), 2),
            'canGoNextMonth' => $month->clone()->addMonthNoOverflow()->lessThanOrEqualTo($today->clone()->startOfMonth()),
        ]);
    }
}
