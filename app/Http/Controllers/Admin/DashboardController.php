<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const DEFAULT_PER_PAGE = 8;

    private const MAX_PER_PAGE = 50;

    /** How many days of registration history to chart on the dashboard. */
    private const TREND_DAYS = 14;

    /** How many HTEs to surface in the "Top HTEs" ranking. */
    private const TOP_HTE_LIMIT = 5;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $recentRegistrations = InternProfile::query()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte?->hte_name ?? 'Deleted HTE',
                'program_name' => $profile->program?->program_name ?? 'Deleted Program',
                'status' => $profile->status,
                'registered_at' => $profile->registered_at->diffForHumans(),
                'registered_at_full' => $profile->registered_at->format('M j, Y g:i A'),
            ]);

        $totalInterns = InternProfile::where('status', 'approved')->count();

        return Inertia::render('admin/dashboard', [
            'pendingApprovals' => InternProfile::where('status', 'pending')->count(),
            'totalInterns' => $totalInterns,
            'totalSupervisors' => User::where('role', User::ROLE_SUPERVISOR)->count(),
            'activeHtes' => Hte::where('status', 'active')->count(),
            'recentRegistrations' => $recentRegistrations,
            'statusBreakdown' => $this->statusBreakdown(),
            'registrationsTrend' => $this->registrationsTrend(),
            'topHtes' => $this->topHtes(),
            'todayAttendance' => $this->todayAttendance($totalInterns),
        ]);
    }

    /**
     * Pending / approved / rejected counts across every intern profile
     * ever registered — gives the admin an at-a-glance approval-pipeline
     * shape, not just the raw "pending" number.
     *
     * @return array<int, array{status: string, count: int}>
     */
    private function statusBreakdown(): array
    {
        $counts = InternProfile::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return collect(['pending', 'approved', 'rejected'])
            ->map(fn (string $status) => [
                'status' => $status,
                'count' => (int) ($counts[$status] ?? 0),
            ])
            ->all();
    }

    /**
     * Daily registration counts for the last TREND_DAYS days (including
     * today), oldest first — powers the "signups over time" mini bar
     * chart so momentum is visible without opening the interns list.
     *
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function registrationsTrend(): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone)->startOfDay();
        $rangeStart = $today->clone()->subDays(self::TREND_DAYS - 1);

        $countsByDate = InternProfile::query()
            ->where('registered_at', '>=', $rangeStart)
            ->get(['registered_at'])
            ->countBy(fn (InternProfile $profile) => $profile->registered_at
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
     * The HTEs currently hosting the most approved interns — helps the
     * admin spot which partners are most active (or which ones might be
     * under-utilized) without cross-referencing the HTE list by hand.
     *
     * @return array<int, array{name: string, count: int}>
     */
    private function topHtes(): array
    {
        return Hte::query()
            ->withCount([
                'internProfiles as interns_count' => fn ($query) => $query->where('status', 'approved'),
            ])
            ->orderByDesc('interns_count')
            ->orderBy('hte_name')
            ->take(self::TOP_HTE_LIMIT)
            ->get(['hte_id', 'hte_name'])
            ->filter(fn (Hte $hte) => $hte->interns_count > 0)
            ->map(fn (Hte $hte) => [
                'name' => $hte->hte_name,
                'count' => $hte->interns_count,
            ])
            ->values()
            ->all();
    }

    /**
     * How many approved interns have scanned in at least once today, out
     * of every approved intern — the single most useful "right now"
     * signal on a DTR system, distinct from the lifetime totals above.
     *
     * @return array{checked_in: int, total: int, percent: int}
     */
    private function todayAttendance(int $totalApprovedInterns): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $checkedIn = AttendanceLog::query()
            ->whereBetween('scan_timestamp', [$today->clone()->startOfDay(), $today->clone()->endOfDay()])
            ->whereHas('internProfile', fn ($query) => $query->where('status', 'approved'))
            ->distinct('intern_user_id')
            ->count('intern_user_id');

        return [
            'checked_in' => $checkedIn,
            'total' => $totalApprovedInterns,
            'percent' => $totalApprovedInterns > 0
                ? (int) round(($checkedIn / $totalApprovedInterns) * 100)
                : 0,
        ];
    }
}
