<?php

// app/Http/Controllers/Supervisor/DashboardController.php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\ResolutionTicket;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const DEFAULT_PER_PAGE = 8;

    private const MAX_PER_PAGE = 50;

    /** How many days of scan history to chart on the dashboard. */
    private const TREND_DAYS = 14;

    /** How many interns to surface in the "Top Interns" ranking. */
    private const TOP_INTERN_LIMIT = 5;

    public function index(Request $request): Response|RedirectResponse
    {
        $supervisor = auth()->user();
        $supervisorProfile = $supervisor->supervisorProfile;

        if ($supervisorProfile?->isOjtSupervisor()) {
            return redirect()->route('supervisor.interns.index');
        }

        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $internUserIds = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->pluck('user_id');

        $myInternsCount = $internUserIds->count();

        // Scope every scan query to those interns — kiosk scans no
        // longer record who scanned it, only who was scanned.
        $baseQuery = fn () => AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds);

        $timezone = config('dtr.timezone');
        $todayStart = Carbon::now($timezone)->startOfDay();
        $todayEnd = Carbon::now($timezone)->endOfDay();
        $weekStart = Carbon::now($timezone)->startOfWeek();
        $now = Carbon::now($timezone);

        $scansToday = $baseQuery()
            ->whereBetween('scan_timestamp', [$todayStart, $todayEnd])
            ->count();

        $scansThisWeek = $baseQuery()
            ->whereBetween('scan_timestamp', [$weekStart, $now])
            ->count();

        $recentScans = $baseQuery()
            ->with(['intern:id,name', 'intern.internProfile'])
            ->latest('scan_timestamp')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(function (AttendanceLog $log) {
                $timezone = config('dtr.timezone');
                $localTimestamp = $log->scan_timestamp->clone()->setTimezone($timezone);
                $dayStart = $localTimestamp->clone()->startOfDay();
                $dayEnd = $localTimestamp->clone()->endOfDay();
                $cutoff = Carbon::parse($localTimestamp->toDateString().' '.config('dtr.time_out_cutoff'), $timezone);

                $earliestScanToday = AttendanceLog::where('intern_user_id', $log->intern_user_id)
                    ->whereBetween('scan_timestamp', [$dayStart, $dayEnd])
                    ->orderBy('scan_timestamp', 'asc')
                    ->first();

                $isEarliestScan = $earliestScanToday?->log_id === $log->log_id;
                $earliestIsAfterCutoff = $earliestScanToday && $earliestScanToday->scan_timestamp->clone()->setTimezone($timezone)->gt($cutoff);

                $label = ($isEarliestScan && ! $earliestIsAfterCutoff) ? 'time_in' : 'time_out';

                return [
                    'id' => $log->log_id,
                    'intern_name' => $log->intern->name,
                    'id_number' => $log->intern->internProfile?->id_number,
                    'label' => $label,
                    'scanned_at' => $log->scan_timestamp->diffForHumans(),
                    'scanned_at_full' => $localTimestamp->format('M j, Y g:i A'),
                ];
            });

        return Inertia::render('supervisor/dashboard', [
            'myInternsCount' => $myInternsCount,
            'scansToday' => $scansToday,
            'scansThisWeek' => $scansThisWeek,
            'pendingTickets' => ResolutionTicket::whereIn('intern_user_id', $internUserIds)
                ->where('status', ResolutionTicket::STATUS_PENDING)
                ->count(),
            'recentScans' => $recentScans,
            'scansTrend' => $this->scansTrend($internUserIds),
            'todayAttendance' => $this->todayAttendance($internUserIds, $myInternsCount),
            'ticketBreakdown' => $this->ticketBreakdown($internUserIds),
            'topInterns' => $this->topInterns($internUserIds),
            'scopeName' => $supervisorProfile->getScopeName(),
        ]);
    }

    /**
     * Daily scan counts for the last TREND_DAYS days (including today),
     * oldest first, scoped to this supervisor's interns — mirrors the
     * admin dashboard's "registrations over time" chart, but for scans.
     *
     * @param  Collection<int, int>  $internUserIds
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function scansTrend(Collection $internUserIds): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone)->startOfDay();
        $rangeStart = $today->clone()->subDays(self::TREND_DAYS - 1);

        $countsByDate = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->where('scan_timestamp', '>=', $rangeStart)
            ->get(['scan_timestamp'])
            ->countBy(fn (AttendanceLog $log) => $log->scan_timestamp
                ->clone()
                ->setTimezone($timezone)
                ->toDateString());

        return collect(range(0, self::TREND_DAYS - 1))
            ->map(function (int $offset) use ($rangeStart, $countsByDate) {
                $date = $rangeStart->clone()->addDays($offset);
                $key = $date->toDateString();

                return [
                    'date' => $key,
                    'label' => $date->format('M j'),
                    'count' => (int) ($countsByDate[$key] ?? 0),
                ];
            })
            ->all();
    }

    /**
     * How many of this supervisor's approved interns have scanned in at
     * least once today — the same "right now" signal as the admin
     * dashboard's attendance ring, scoped to just this roster.
     *
     * @param  Collection<int, int>  $internUserIds
     * @return array{checked_in: int, total: int, percent: int}
     */
    private function todayAttendance(Collection $internUserIds, int $totalInterns): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $checkedIn = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->whereBetween('scan_timestamp', [$today->clone()->startOfDay(), $today->clone()->endOfDay()])
            ->distinct('intern_user_id')
            ->count('intern_user_id');

        return [
            'checked_in' => $checkedIn,
            'total' => $totalInterns,
            'percent' => $totalInterns > 0
                ? (int) round(($checkedIn / $totalInterns) * 100)
                : 0,
        ];
    }

    /**
     * Pending / approved / rejected counts across this roster's DTR
     * resolution tickets — the supervisor's equivalent of the admin
     * dashboard's approval pipeline.
     *
     * @param  Collection<int, int>  $internUserIds
     * @return array<int, array{status: string, count: int}>
     */
    private function ticketBreakdown(Collection $internUserIds): array
    {
        $counts = ResolutionTicket::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect([
            ResolutionTicket::STATUS_PENDING,
            ResolutionTicket::STATUS_APPROVED,
            ResolutionTicket::STATUS_REJECTED,
        ])
            ->map(fn (string $status) => [
                'status' => $status,
                'count' => (int) ($counts[$status] ?? 0),
            ])
            ->all();
    }

    /**
     * The interns with the most scans in the trend window — helps the
     * supervisor spot who's been consistently checking in, the same way
     * the admin dashboard ranks "Top HTEs by Approved Interns".
     *
     * @param  Collection<int, int>  $internUserIds
     * @return array<int, array{name: string, count: int}>
     */
    private function topInterns(Collection $internUserIds): array
    {
        $rangeStart = Carbon::now(config('dtr.timezone'))->startOfDay()->subDays(self::TREND_DAYS - 1);

        return AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->where('scan_timestamp', '>=', $rangeStart)
            ->selectRaw('intern_user_id, count(*) as aggregate')
            ->groupBy('intern_user_id')
            ->orderByDesc('aggregate')
            ->take(self::TOP_INTERN_LIMIT)
            ->get()
            ->map(function ($row) {
                /** @var User|null $intern */
                $intern = User::find($row->intern_user_id, ['id', 'name']);

                return [
                    'name' => $intern?->name ?? 'Deleted Intern',
                    'count' => (int) $row->aggregate,
                ];
            })
            ->all();
    }
}
