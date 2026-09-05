<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Models\ResolutionTicket;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

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
            'month' => ['nullable', 'date_format:Y-m'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            'highlight_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $page = (int) ($validated['page'] ?? 1);
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m-d', $validated['month'].'-01', $timezone)->startOfMonth()
            : $today->clone()->startOfMonth();

        $monthDays = $this->calculator->forIntern(
            $user->id,
            $profile->hte_id,
            from: $month->clone()->startOfMonth(),
            to: $month->clone()->endOfMonth(),
            approvedAt: $profile->approved_at,
        );

        $todayEntry = $this->calculator
            ->forIntern($user->id, $profile->hte_id, from: $today->clone()->startOfDay(), to: $today->clone()->endOfDay())
            ->first();

        $requiredHours = $profile->program?->required_hours ?? config('dtr.default_required_hours');
        $totalHours = $this->calculator->totalHours($user->id, $profile->hte_id);

        $pendingTicketsByDate = ResolutionTicket::query()
            ->where('intern_user_id', $user->id)
            ->where('status', ResolutionTicket::STATUS_PENDING)
            ->whereBetween('date', [$month->clone()->startOfMonth()->toDateString(), $month->clone()->endOfMonth()->toDateString()])
            ->get()
            ->mapWithKeys(fn (ResolutionTicket $ticket) => [$ticket->date->toDateString() => $ticket->id]);

        $mappedLogs = $monthDays->map(fn ($day) => [
            ...$day->toArray(),
            'pending_ticket_id' => $pendingTicketsByDate->get($day->date),
        ])->sortByDesc('date')->values();

        // If highlight_date is requested and no explicit page was supplied,
        // auto-jump to the page that actually contains that date so the
        // frontend scroll always succeeds on the first load.
        if (isset($validated['highlight_date']) && ! isset($validated['page'])) {
            $highlightDate = $validated['highlight_date'];
            $dateIndex = $mappedLogs->search(fn ($log) => $log['date'] === $highlightDate);
            if ($dateIndex !== false) {
                $page = (int) ceil(($dateIndex + 1) / $perPage);
            }
        }

        $paginatedLogs = new LengthAwarePaginator(
            $mappedLogs->forPage($page, $perPage)->values(),
            $mappedLogs->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('intern/dashboard', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte?->hte_name ?? 'Deleted HTE',
                'program_name' => $profile->program?->program_name ?? 'Deleted Program',
                'status' => $profile->status,
                'has_qr_code' => $profile->qr_code_value !== null,
                'photo_url' => $profile->profile_photo_url,
            ],
            'today' => [
                'date' => $today->toDateString(),
                'time_in' => $todayEntry?->timeIn?->clone()->setTimezone($timezone)->format('g:i A'),
                'time_out' => $todayEntry?->timeOut?->clone()->setTimezone($timezone)->format('g:i A'),
                'status' => match (true) {
                    $todayEntry === null => 'not_started',
                    $todayEntry->isMissingTimeIn() => 'missing_time_in',
                    $todayEntry->isOpen() => 'open',
                    default => 'complete',
                },
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
            'logs' => $paginatedLogs,
            'monthTotalHours' => round($monthDays->sum('hoursRendered'), 2),
            'canGoNextMonth' => $month->clone()->addMonthNoOverflow()->lessThanOrEqualTo($today->clone()->startOfMonth()),
        ]);
    }
}
