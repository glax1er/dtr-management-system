<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Services\Attendance\DailyAttendance;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class InternsController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function index(Request $request): Response
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m-d', $validated['month'] . '-01', $timezone)->startOfMonth()
            : $today->clone()->startOfMonth();

        $supervisorProfile = $request->user()->supervisorProfile;

        // Get interns based on supervisor type (HTE or OJT)
        $interns = $supervisorProfile->getAssignedInterns()
            ->with('user', 'hte', 'program')
            ->get();

        $rows = $interns
            ->flatMap(function (InternProfile $intern) use ($month) {
                $days = $this->calculator->forIntern(
                    $intern->user_id,
                    from: $month->clone()->startOfMonth(),
                    to: $month->clone()->endOfMonth(),
                );

                return $days->map(fn (DailyAttendance $day) => array_merge(
                    $day->toArray(),
                    [
                        'intern_user_id' => $intern->user_id,
                        'intern_name' => $intern->user->name,
                        'hte_name' => $intern->hte->hte_name,
                        'program_name' => $intern->program->program_name,
                        'punctuality' => $this->computePunctuality($day),
                    ],
                ));
            })
            ->sortByDesc(fn (array $row) => $row['date'])
            ->values();

        return Inertia::render('supervisor/interns', [
            'logs' => $rows,
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'canGoNextMonth' => $month->clone()->addMonthNoOverflow()->lessThanOrEqualTo($today->clone()->startOfMonth()),
            'internCount' => $interns->count(),
            'supervisorType' => $supervisorProfile->supervisor_type,
            'isOjtSupervisor' => $supervisorProfile->isOjtSupervisor(),
        ]);
    }

    /**
     * "On Time" if the day's time-in was at or before the configured
     * cutoff, "Late" otherwise. Based on time-in only — independent of
     * whether the day is still open (no time-out yet).
     */
    private function computePunctuality(DailyAttendance $day): string
    {
        $timezone = config('dtr.timezone');

        $cutoff = Carbon::parse($day->date . ' ' . config('dtr.expected_start_time'), $timezone);
        $localTimeIn = $day->timeIn->clone()->setTimezone($timezone);

        return $localTimeIn->lte($cutoff) ? 'on_time' : 'late';
    }
}