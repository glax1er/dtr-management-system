<?php
// app/Http/Controllers/Supervisor/DashboardController.php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\ResolutionTicket;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** How many days of scan history to chart on the dashboard. */
    private const TREND_DAYS = 14;

    /** How many interns to surface in the "Top Interns" ranking. */
    private const TOP_INTERN_LIMIT = 5;

    public function index(): Response|RedirectResponse
    {
        $supervisor = auth()->user();
        $supervisorProfile = $supervisor->supervisorProfile;

        // OJT Supervisors don't have a dashboard of their own — login and
        // the generic /dashboard route already send them straight to their
        // roster, but this catches a direct hit or stale bookmark too.
if (! $supervisorProfile->isHteSupervisor()) {
      return redirect()->route('supervisor.students.index');
  }

$internUserIds = $supervisorProfile->getHteAssignedInterns()
      ->where('status', 'approved')
      ->pluck('user_id');

        $myInternsCount = $internUserIds->count();

        // Scope every scan query to those interns — kiosk scans no
        // longer record who scanned it, only who was scanned.
        $baseQuery = fn () => AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds);

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