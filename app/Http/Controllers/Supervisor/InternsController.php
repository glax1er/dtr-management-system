<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\SupervisorProfile;
use App\Models\SchedulePeriod;
use App\Services\Attendance\DailyAttendance;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class InternsController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    /**
     * HTE Supervisors get the full attendance-log view (date/range picker,
     * time in/out, punctuality). OJT Supervisors get a simple read-only
     * roster of their program's interns instead — they monitor who's
     * assigned where, not day-by-day attendance detail.
     */
    public function index(Request $request): Response
    {
        $supervisorProfile = $request->user()->supervisorProfile;

        if ($supervisorProfile->isOjtSupervisor()) {
            return $this->roster($request, $supervisorProfile);
        }

        return $this->attendanceLogs($request, $supervisorProfile);
    }

    /**
     * Simple, read-only list of every intern in the OJT Supervisor's
     * program, across every HTE — name, contact info, where they're
     * assigned, and total hours rendered to date. No date picker, no
     * internal/admin fields (status, QR value, timestamps, profile
     * photo) — just what a supervisor needs to see at a glance. Paginated
     * the same way as the HTE attendance log (InternsController::attendanceLogs)
     * so both surfaces behave consistently once a roster grows past a page.
     */
    private function roster(Request $request, SupervisorProfile $supervisorProfile): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'hte_id' => ['nullable', 'integer'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $search = trim($validated['search'] ?? '');
        $hteId = $validated['hte_id'] ?? null;

        $internsQuery = $supervisorProfile->getAssignedInterns()
        ->where('status', 'approved')
        ->with('user', 'hte');

        if ($search !== '') {
            $internsQuery->whereHas('user', fn ($query) => $query->where('name', 'like', "%{$search}%"));
        }

        if ($hteId !== null) {
            $internsQuery->where('hte_id', $hteId);
        }

        // Every HTE currently hosting an intern from this program — powers
        // the "Assigned HTE" filter dropdown. Same scope Hte::index() in
        // HtesController uses, computed independently of the search/hte_id
        // filters above so the dropdown's option list never shrinks based
        // on what's currently filtered.
        $hteOptions = Hte::query()
            ->whereHas('internProfiles', fn ($query) => $query->where('program_id', $supervisorProfile->program_id))
            ->orderBy('hte_name')
            ->get(['hte_id', 'hte_name']);

        $students = $internsQuery->get()
            ->map(fn (InternProfile $intern) => [
                'intern_user_id' => $intern->user_id,
                'name' => $intern->user->name,
                'email' => $intern->user->email,
                'id_number' => $intern->id_number,
                'contact_number' => $intern->contact_number,
                'hte_name' => $intern->hte->hte_name,
                'total_hours' => $this->calculator->totalHours($intern->user_id, $intern->hte_id),
            ])
            ->sortBy('name')
            ->values();

        $perPage = (int) ($validated['per_page'] ?? 20);
        $total = $students->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        $pagedStudents = $students->forPage($page, $perPage)->values();

        return Inertia::render('supervisor/students', [
            'students' => [
                'data' => $pagedStudents,
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total === 0 ? null : ($page - 1) * $perPage + 1,
                'to' => $total === 0 ? null : min($page * $perPage, $total),
            ],
            'studentCount' => $total,
            'scopeName' => $supervisorProfile->getScopeName(),
            'hteOptions' => $hteOptions,
            'filters' => [
                'search' => $search,
                'hte_id' => $hteId,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Full attendance log for an HTE Supervisor's own HTE — date/range
     * picker, per-day time in/out, punctuality, and accumulated hours.
     */
    private function attendanceLogs(Request $request, SupervisorProfile $supervisorProfile): Response
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'from' => ['nullable', 'required_with:to', 'date_format:Y-m-d'],
            'to' => ['nullable', 'required_with:from', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'in:on_time,late,missing_time_in,no_record,open'],
            'sort' => ['nullable', 'in:date,name'],
            'direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $usingRange = isset($validated['from'], $validated['to']);

        $month = null;

        if ($usingRange) {
            $rangeStart = Carbon::createFromFormat('Y-m-d', $validated['from'], $timezone)->startOfDay();
            $rangeEnd = Carbon::createFromFormat('Y-m-d', $validated['to'], $timezone)->endOfDay();
        } else {
            $month = isset($validated['month'])
                ? Carbon::createFromFormat('Y-m-d', $validated['month'] . '-01', $timezone)->startOfMonth()
                : $today->clone()->startOfMonth();

            $rangeStart = $month->clone()->startOfMonth();
            $rangeEnd = $month->clone()->endOfMonth();
        }

        $sort = $validated['sort'] ?? 'date';
        $direction = $validated['direction'] ?? 'desc';
        $search = trim($validated['search'] ?? '');
        $remarks = $validated['remarks'] ?? null;

        $internsQuery = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->with('user', 'hte', 'program');

        if ($search !== '') {
            $internsQuery->whereHas('user', fn($query) => $query->where('name', 'like', "%{$search}%"));
        }

        $interns = $internsQuery->get();

        $rows = $interns
            ->flatMap(function (InternProfile $intern) use ($rangeStart, $rangeEnd) {
                $days = $this->calculator->forIntern(
                    $intern->user_id,
                    $intern->hte_id,
                    from: $rangeStart,
                    to: $rangeEnd,
                    approvedAt: $intern->approved_at,
                );

                return $days->map(fn(DailyAttendance $day) => array_merge(
                    $day->toArray(),
                    [
                        'intern_user_id' => $intern->user_id,
                        'intern_name' => $intern->user->name,
                        'hte_name' => $intern->hte->hte_name,
                        'program_name' => $intern->program->program_name,
                        'punctuality' => $this->computePunctuality($day, $intern->hte_id),
                    ],
                ));
            });

        if ($remarks !== null) {
            // 'open' ("No time-out yet") is a status flag that can
            // co-occur with either punctuality badge, so it's matched
            // against `status` rather than `punctuality`; every other
            // option is one of the mutually-exclusive punctuality values.
            $rows = $remarks === 'open'
                ? $rows->where('status', 'open')
                : $rows->where('punctuality', $remarks);
        }

        $rows = $this->sortRows($rows, $sort, $direction)->values();

        $perPage = (int) ($validated['per_page'] ?? 20);
        $total = $rows->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        $pagedRows = $rows->forPage($page, $perPage)->values();

        $accumulatedHours = $interns
            ->map(fn(InternProfile $intern) => [
                'intern_user_id' => $intern->user_id,
                'intern_name' => $intern->user->name,
                'total_hours' => $this->calculator->totalHours($intern->user_id, $intern->hte_id, $rangeStart, $rangeEnd),
            ])
            ->sortBy('intern_name')
            ->values();

        return Inertia::render('supervisor/interns', [
            'logs' => [
                'data' => $pagedRows,
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total === 0 ? null : ($page - 1) * $perPage + 1,
                'to' => $total === 0 ? null : min($page * $perPage, $total),
            ],
            'accumulatedHours' => $accumulatedHours,
            'mode' => $usingRange ? 'range' : 'month',
            'month' => $month?->format('Y-m'),
            'monthLabel' => $month?->format('F Y'),
            'canGoNextMonth' => $month
                ? $month->clone()->addMonthNoOverflow()->lessThanOrEqualTo($today->clone()->startOfMonth())
                : false,
            'internCount' => $interns->count(),
            'filters' => [
                'from' => $rangeStart->toDateString(),
                'to' => $rangeEnd->toDateString(),
                'search' => $search,
                'remarks' => $remarks,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'scopeName' => $supervisorProfile->getScopeName(),
        ]);
    }

    private function sortRows(Collection $rows, string $sort, string $direction): Collection
    {
        $key = $sort === 'name' ? 'intern_name' : 'date';
        $descending = $direction === 'desc';

        return $rows->sort(function (array $a, array $b) use ($key, $descending) {
            $primary = $descending ? $b[$key] <=> $a[$key] : $a[$key] <=> $b[$key];

            if ($primary !== 0) {
                return $primary;
            }

            $secondaryKey = $key === 'date' ? 'intern_name' : 'date';

            return $a[$secondaryKey] <=> $b[$secondaryKey];
        });
    }

    /**
     * "On Time" if the day's time-in was at or before that HTE's expected
     * start time for that specific day of the week (see SchedulePeriod),
     * plus the grace period. "Late" otherwise. "missing_time_in" if there
     * was a scan but it landed after the time-out cutoff. "no_record" if
     * there were no scans at all that day. "unscheduled" if there IS a
     * scan, but that day has no expected start time configured at all
     * (e.g. a weekend, or a day this HTE has no schedule for) — hours
     * still count normally, this only affects the punctuality label.
     */
    private function computePunctuality(DailyAttendance $day, int $hteId): string
    {
        if ($day->rawScanCount === 0) {
            return 'no_record';
        }

        if ($day->timeIn === null) {
            return 'missing_time_in';
        }

        $timezone = config('dtr.timezone');
        $date = Carbon::parse($day->date, $timezone);

        $expectedStart = SchedulePeriod::expectedStartTimeFor($date, $hteId);

        // No schedule configured for this day (e.g. weekend, or a day
        // this HTE has no expected start time for). The intern still
        // scanned/rendered hours though, so this isn't hidden as a
        // normal on-time day — it's labeled distinctly so admins/
        // supervisors can see it was outside the official schedule.
        if ($expectedStart === null) {
            return 'unscheduled';
        }

        $graceMinutes = config('dtr.grace_period_minutes', 30);

        $cutoff = Carbon::parse($day->date . ' ' . $expectedStart, $timezone)
            ->addMinutes($graceMinutes);

        $localTimeIn = $day->timeIn->clone()->setTimezone($timezone);

        return $localTimeIn->lte($cutoff) ? 'on_time' : 'late';
    }
}
