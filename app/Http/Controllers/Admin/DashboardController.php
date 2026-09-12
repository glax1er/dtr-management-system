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
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $user = $request->user();
        $collegeId = $user->isCollegeAdmin() ? $user->college_id : null;

        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = InternProfile::query()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc');

        if ($collegeId !== null) {
            $query->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
        }

        $recentRegistrations = $query
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

        $approvedQuery = InternProfile::where('status', 'approved');
        $pendingQuery = InternProfile::where('status', 'pending');

        if ($collegeId !== null) {
            $approvedQuery->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
            $pendingQuery->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
        }

        $totalInterns = $approvedQuery->count();

        $supervisorQuery = User::where('role', User::ROLE_SUPERVISOR);
        if ($collegeId !== null) {
            $supervisorQuery->whereHas('supervisorProfile', fn ($q) => $q->where('supervisor_type', 'hte')
                ->orWhereHas('program', fn ($pq) => $pq->where('college_id', $collegeId)));
        }

        return Inertia::render('admin/dashboard', [
            'pendingApprovals' => $pendingQuery->count(),
            'totalInterns' => $totalInterns,
            'totalSupervisors' => $supervisorQuery->count(),
            'activeHtes' => Hte::where('status', 'active')->count(),
            'recentRegistrations' => $recentRegistrations,
            'statusBreakdown' => $this->statusBreakdown($collegeId),
            'registrationsTrend' => $this->registrationsTrend($collegeId),
            'topHtes' => $this->topHtes($collegeId),
            'todayAttendance' => $this->todayAttendance($totalInterns, $collegeId),
            'college' => $user->college ? [
                'id' => $user->college->id,
                'name' => $user->college->name,
                'code' => $user->college->code,
            ] : null,
        ]);
    }

    /**
     * Pending / approved / rejected counts across intern profiles
     *
     * @return array<int, array{status: string, count: int}>
     */
    private function statusBreakdown(?int $collegeId = null): array
    {
        $query = InternProfile::query();
        if ($collegeId !== null) {
            $query->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
        }

        $counts = $query
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
     * Daily registration counts for the last TREND_DAYS days
     *
     * @return array<int, array{date: string, label: string, count: int}>
     */
    private function registrationsTrend(?int $collegeId = null): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone)->startOfDay();
        $rangeStart = $today->clone()->subDays(self::TREND_DAYS - 1);

        $query = InternProfile::query()->where('registered_at', '>=', $rangeStart);
        if ($collegeId !== null) {
            $query->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
        }

        $countsByDate = $query
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
     * The HTEs currently hosting the most approved interns
     *
     * @return array<int, array{name: string, count: int}>
     */
    private function topHtes(?int $collegeId = null): array
    {
        return Hte::query()
            ->withCount([
                'internProfiles as interns_count' => function ($query) use ($collegeId) {
                    $query->where('status', 'approved');
                    if ($collegeId !== null) {
                        $query->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
                    }
                },
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
     * Today's attendance
     *
     * @return array{checked_in: int, total: int, percent: int}
     */
    private function todayAttendance(int $totalApprovedInterns, ?int $collegeId = null): array
    {
        $timezone = config('dtr.timezone');
        $today = Carbon::now($timezone);

        $query = AttendanceLog::query()
            ->whereBetween('scan_timestamp', [$today->clone()->startOfDay(), $today->clone()->endOfDay()])
            ->whereHas('internProfile', function ($query) use ($collegeId) {
                $query->where('status', 'approved');
                if ($collegeId !== null) {
                    $query->whereHas('program', fn ($q) => $q->where('college_id', $collegeId));
                }
            });

        $checkedIn = $query
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
