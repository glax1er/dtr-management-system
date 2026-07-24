<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
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

    public function index(Request $request): Response
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'from' => ['nullable', 'required_with:to', 'date_format:Y-m-d'],
            'to' => ['nullable', 'required_with:from', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'in:date,name'],
            'direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:10,20,50,100'],
        ]);

        // FR: date-range mode — supervisor picks X/Y and sees accumulated
        // hours across that span. Falls back to the existing month-paged
        // view when no range is supplied, so old links/behavior still work.
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

        $supervisorProfile = $request->user()->supervisorProfile;

        $internsQuery = InternProfile::query()
            ->where('hte_id', $supervisorProfile->hte_id)
            ->with('user');

        if ($search !== '') {
            $internsQuery->whereHas('user', fn($query) => $query->where('name', 'like', "%{$search}%"));
        }

        $interns = $internsQuery->get();

        $rows = $interns
            ->flatMap(function (InternProfile $intern) use ($rangeStart, $rangeEnd) {
                $days = $this->calculator->forIntern(
                    $intern->user_id,
                    from: $rangeStart,
                    to: $rangeEnd,
                );

                return $days->map(fn(DailyAttendance $day) => array_merge(
                    $day->toArray(),
                    [
                        'intern_user_id' => $intern->user_id,
                        'intern_name' => $intern->user->name,
                        'punctuality' => $this->computePunctuality($day),
                    ],
                ));
            });

        $rows = $this->sortRows($rows, $sort, $direction)->values();

        // FR: server-side pagination — only the current page of rows is
        // ever serialized to the frontend, so payload size and render
        // cost stay flat no matter how large the date range or intern
        // roster gets. Rows are still assembled in PHP (they're derived
        // from raw scans, not a single query), but slicing happens here,
        // before anything is sent over the wire.
        $perPage = (int) ($validated['per_page'] ?? 20);
        $total = $rows->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        $pagedRows = $rows->forPage($page, $perPage)->values();

        // FR: accumulated hours per intern within the selected X-Y range.
        // Reuses DailyAttendanceCalculator::totalHours(), which already
        // supported an arbitrary date range — just wasn't wired to any
        // controller yet.
        $accumulatedHours = $interns
            ->map(fn(InternProfile $intern) => [
                'intern_user_id' => $intern->user_id,
                'intern_name' => $intern->user->name,
                'total_hours' => $this->calculator->totalHours($intern->user_id, $rangeStart, $rangeEnd),
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
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function sortRows(Collection $rows, string $sort, string $direction): Collection
    {
        $key = $sort === 'name' ? 'intern_name' : 'date';
        $descending = $direction === 'desc';

        // Secondary key keeps ordering stable/predictable when the primary
        // sort key ties (e.g. same date across multiple interns, or same
        // intern across multiple days).
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
