<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Models\SchedulePeriod;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;
    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $user = $request->user();
        $profile = $user->internProfile()->with(['hte', 'program'])->first();
        $hte = $profile?->hte;
        $hteId = $hte?->hte_id;
        $timezone = config('dtr.timezone', 'Asia/Manila');
        $now = Carbon::now($timezone);

        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $monthParam = $validated['month'] ?? null;
        try {
            $month = $monthParam
                ? Carbon::createFromFormat('Y-m-d', $monthParam . '-01', $timezone)->startOfMonth()
                : $now->copy()->startOfMonth();
        } catch (\Throwable) {
            $month = $now->copy()->startOfMonth();
        }

        $defaultExpectedStartTime = config('dtr.expected_start_time', '08:00');

        // Fetch Global Schedule Periods (Admin managed)
        $globalPeriods = SchedulePeriod::whereNull('hte_id')
            ->orderByDesc('start_date')
            ->get();

        // Fetch HTE Schedule Override Periods (Supervisor managed for this intern's HTE)
        $htePeriods = $hteId
            ? SchedulePeriod::where('hte_id', $hteId)
                ->with('hte')
                ->orderByDesc('start_date')
                ->get()
            : collect();

        $formatTime12 = function (?string $time): ?string {
            if (! $time) {
                return null;
            }
            try {
                [$h, $m] = explode(':', $time);
                $h = (int) $h;
                $period = $h >= 12 ? 'PM' : 'AM';
                $displayH = $h % 12 === 0 ? 12 : $h % 12;

                return sprintf('%d:%02d %s', $displayH, (int) $m, $period);
            } catch (\Throwable) {
                return $time;
            }
        };

        // Full Google Calendar grid boundaries (Sunday to Saturday covering the month)
        $startOfGrid = $month->copy()->startOfMonth()->startOfWeek(Carbon::SUNDAY);
        $endOfGrid = $month->copy()->endOfMonth()->endOfWeek(Carbon::SATURDAY);

        // Ensure at least 5 complete weeks
        if ($startOfGrid->diffInDays($endOfGrid) < 34) {
            $endOfGrid = $endOfGrid->addWeek();
        }

        $gridDays = [];
        $monthDays = [];
        $monthWorkdayCount = 0;
        $monthRestdayCount = 0;

        for ($cursor = $startOfGrid->copy(); $cursor->lte($endOfGrid); $cursor = $cursor->addDay()) {
            $dateStr = $cursor->toDateString();
            $dayName = strtolower($cursor->englishDayOfWeek);
            $isCurrentMonth = $cursor->month === $month->month && $cursor->year === $month->year;

            // 1. Check for HTE override covering this date
            $matchingHtePeriod = $htePeriods->first(function (SchedulePeriod $p) use ($dateStr) {
                return $p->start_date->toDateString() <= $dateStr && $p->end_date->toDateString() >= $dateStr;
            });

            // 2. Check for Global schedule covering this date
            $matchingGlobalPeriod = $globalPeriods->first(function (SchedulePeriod $p) use ($dateStr) {
                return $p->start_date->toDateString() <= $dateStr && $p->end_date->toDateString() >= $dateStr;
            });

            if ($matchingHtePeriod !== null) {
                $dayTime = $matchingHtePeriod->day_schedule[$dayName] ?? null;
                $sourceType = 'hte_override';
                $sourceLabel = 'HTE Time Schedule';
                $activePeriod = $matchingHtePeriod;
                $isWorkday = ! empty($dayTime);
                $expectedTime = $dayTime;
            } elseif ($matchingGlobalPeriod !== null) {
                $dayTime = $matchingGlobalPeriod->day_schedule[$dayName] ?? null;
                $sourceType = 'global_schedule';
                $sourceLabel = 'Global OJT Schedule';
                $activePeriod = $matchingGlobalPeriod;
                $isWorkday = ! empty($dayTime);
                $expectedTime = $dayTime;
            } else {
                $isWeekend = in_array($dayName, ['saturday', 'sunday'], true);
                $dayTime = $isWeekend ? null : $defaultExpectedStartTime;
                $sourceType = 'default_schedule';
                $sourceLabel = 'Standard 8:00 AM';
                $activePeriod = null;
                $isWorkday = ! $isWeekend && ! empty($dayTime);
                $expectedTime = $dayTime;
            }

            if ($isCurrentMonth) {
                if ($isWorkday) {
                    $monthWorkdayCount++;
                } else {
                    $monthRestdayCount++;
                }
            }

            $dayData = [
                'date' => $dateStr,
                'day_number' => $cursor->day,
                'day_of_week' => $dayName,
                'day_name' => $cursor->format('l'),
                'day_short' => $cursor->format('D'),
                'is_current_month' => $isCurrentMonth,
                'is_today' => $dateStr === $now->toDateString(),
                'is_past' => $cursor->copy()->endOfDay()->isPast(),
                'is_workday' => $isWorkday,
                'expected_start_time' => $expectedTime,
                'expected_start_time_formatted' => $formatTime12($expectedTime),
                'source_type' => $sourceType,
                'source_label' => $sourceLabel,
                'period_id' => $activePeriod?->id,
                'period_name' => $activePeriod?->name,
                'period_start_date' => $activePeriod?->start_date?->toDateString(),
                'period_end_date' => $activePeriod?->end_date?->toDateString(),
                'period_updated_at' => $activePeriod?->updated_at?->toIso8601String(),
                'period_updated_at_human' => $activePeriod?->updated_at?->diffForHumans(),
            ];

            $gridDays[] = $dayData;

            if ($isCurrentMonth) {
                $monthDays[] = $dayData;
            }
        }

        // Paginated schedule days for list / table view
        $monthDaysCollection = collect($monthDays);
        $paginatedDays = new LengthAwarePaginator(
            $monthDaysCollection->forPage($page, $perPage)->values(),
            $monthDaysCollection->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        // Map period helper
        $mapPeriod = function (SchedulePeriod $period, string $scope) use ($formatTime12) {
            $isPast = $period->end_date->copy()->endOfDay()->isPast();
            $isUpcoming = $period->start_date->copy()->startOfDay()->isFuture();
            $isActive = ! $isPast && ! $isUpcoming;

            return [
                'id' => $period->id,
                'name' => $period->name ?: ($scope === 'hte' ? 'HTE Time Schedule' : 'Global OJT Schedule'),
                'scope' => $scope,
                'scope_label' => $scope === 'hte' ? 'HTE Time Schedule' : 'Global OJT Schedule',
                'hte_name' => $period->hte?->hte_name,
                'start_date' => $period->start_date->toDateString(),
                'end_date' => $period->end_date->toDateString(),
                'formatted_range' => $period->start_date->format('M d, Y') . ' – ' . $period->end_date->format('M d, Y'),
                'status' => $isActive ? 'active' : ($isUpcoming ? 'upcoming' : 'past'),
                'day_schedule' => $period->day_schedule,
                'created_at' => $period->created_at?->toIso8601String(),
                'created_at_human' => $period->created_at?->diffForHumans(),
                'updated_at' => $period->updated_at?->toIso8601String(),
                'updated_at_human' => $period->updated_at?->diffForHumans(),
            ];
        };

        $formattedGlobalPeriods = $globalPeriods->map(fn ($p) => $mapPeriod($p, 'global'))->values();
        $formattedHtePeriods = $htePeriods->map(fn ($p) => $mapPeriod($p, 'hte'))->values();

        // Recent schedule notifications for this intern
        $recentNotifications = $user->notifications()
            ->where('data->type', 'schedule_updated')
            ->latest()
            ->take(15)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? 'Schedule Update',
                    'message' => $n->data['message'] ?? '',
                    'action' => $n->data['action'] ?? 'updated',
                    'scope' => $n->data['scope'] ?? 'global',
                    'schedule_name' => $n->data['schedule_name'] ?? null,
                    'hte_name' => $n->data['hte_name'] ?? null,
                    'schedule_period_id' => $n->data['schedule_period_id'] ?? null,
                    'created_at' => $n->created_at->toIso8601String(),
                    'created_at_human' => $n->created_at->diffForHumans(),
                    'read_at' => $n->read_at?->toIso8601String(),
                ];
            })
            ->values();

        return Inertia::render('intern/schedule', [
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'currentMonth' => $now->format('Y-m'),
            'todayDate' => $now->toDateString(),
            'days' => $gridDays,
            'paginatedDays' => $paginatedDays,
            'stats' => [
                'workdays_count' => $monthWorkdayCount,
                'restdays_count' => $monthRestdayCount,
                'total_days' => $month->daysInMonth,
                'hte_overrides_count' => $formattedHtePeriods->where('status', '!=', 'past')->count(),
                'global_periods_count' => $formattedGlobalPeriods->where('status', '!=', 'past')->count(),
            ],
            'hte' => $hte ? [
                'id' => $hte->hte_id,
                'name' => $hte->hte_name,
            ] : null,
            'globalPeriods' => $formattedGlobalPeriods,
            'htePeriods' => $formattedHtePeriods,
            'recentNotifications' => $recentNotifications,
            'defaultExpectedStartTime' => $defaultExpectedStartTime,
            'defaultExpectedStartTimeFormatted' => $formatTime12($defaultExpectedStartTime),
        ]);
    }
}
