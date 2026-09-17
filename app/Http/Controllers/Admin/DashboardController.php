<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Campus;
use App\Models\College;
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
    private const TOP_HTE_LIMIT = 10;

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
            ->verified()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc');

        if ($collegeId !== null) {
            $query->forCollege($collegeId);
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

        $approvedQuery = InternProfile::verified()->where('status', 'approved');
        $pendingQuery = InternProfile::verified()->where('status', 'pending');

        if ($collegeId !== null) {
            $approvedQuery->forCollege($collegeId);
            $pendingQuery->forCollege($collegeId);
        }

        $totalInterns = $approvedQuery->count();

        $supervisorQuery = User::where('role', User::ROLE_SUPERVISOR);
        if ($collegeId !== null) {
            $supervisorQuery->whereHas('supervisorProfile', fn ($q) => $q->where(function ($sq) use ($collegeId) {
                $sq->where(function ($hq) use ($collegeId) {
                    $hq->where('supervisor_type', 'hte')
                        ->whereHas('hte', fn ($sub) => $sub->where('college_id', $collegeId));
                })->orWhere(function ($pq) use ($collegeId) {
                    $pq->where('supervisor_type', 'ojt')
                        ->whereHas('program', fn ($sub) => $sub->where('college_id', $collegeId));
                });
            }));
        }

        $activeHtesQuery = Hte::where('status', 'active');
        if ($collegeId !== null) {
            $activeHtesQuery->where('college_id', $collegeId);
        }

        $isSuperAdmin = $user->isSuperAdmin();

        return Inertia::render('admin/dashboard', [
            'pendingApprovals' => $pendingQuery->count(),
            'totalInterns' => $totalInterns,
            'totalSupervisors' => $supervisorQuery->count(),
            'activeHtes' => $activeHtesQuery->count(),
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
            'superAdminAnalytics' => $isSuperAdmin ? $this->superAdminAnalytics() : null,
        ]);
    }

    /**
     * Aggregated analytics for super administrators (campuses, colleges, admins).
     *
     * @return array{
     *     campuses: array{
     *         total: int,
     *         active: int,
     *         items: array<int, array{
     *             id: int,
     *             name: string,
     *             code: string,
     *             is_active: bool,
     *             colleges_count: int,
     *             interns_count: int,
     *             admins_count: int
     *         }>
     *     },
     *     colleges: array{
     *         total: int,
     *         active: int,
     *         items: array<int, array{
     *             id: int,
     *             name: string,
     *             code: string,
     *             campus: ?string,
     *             is_active: bool,
     *             programs_count: int,
     *             interns_count: int,
     *             admins_count: int,
     *             has_admin: bool,
     *             admin_names: ?string
     *         }>
     *     },
     *     admins: array{
     *         total: int,
     *         active: int,
     *         inactive: int,
     *         super_admins: int,
     *         college_admins: int,
     *         colleges_count: int,
     *         colleges_with_admin: int,
     *         coverage_percent: int,
     *         unassigned_colleges: array<int, array{id: int, name: string, code: string}>
     *     }
     * }
     */
    private function superAdminAnalytics(): array
    {
        return [
            'campuses' => $this->campusAnalytics(),
            'colleges' => $this->collegeAnalytics(),
            'admins' => $this->adminAnalytics(),
        ];
    }

    /**
     * Campuses with college counts, intern counts, and admin counts
     *
     * @return array{
     *     total: int,
     *     active: int,
     *     items: array<int, array{
     *         id: int,
     *         name: string,
     *         code: string,
     *         is_active: bool,
     *         colleges_count: int,
     *         interns_count: int,
     *         admins_count: int
     *     }>
     * }
     */
    private function campusAnalytics(): array
    {
        $campuses = Campus::query()
            ->withCount('colleges')
            ->orderBy('name')
            ->get();

        $items = $campuses->map(function (Campus $campus) {
            $internsCount = InternProfile::verified()
                ->where('status', 'approved')
                ->where(function ($q) use ($campus) {
                    $q->whereHas('program.college', fn ($cq) => $cq->where('campus_id', $campus->id))
                        ->orWhere('campus', $campus->name);
                })
                ->count();

            $adminsCount = User::whereIn('role', [User::ROLE_COLLEGE_ADMIN, User::ROLE_ADMIN])
                ->where(function ($q) use ($campus) {
                    $q->whereHas('collegeAdminProfile', fn ($pq) => $pq->where('campus_id', $campus->id))
                        ->orWhereHas('college', fn ($cq) => $cq->where('campus_id', $campus->id))
                        ->orWhere('campus', $campus->name);
                })
                ->count();

            return [
                'id' => $campus->id,
                'name' => $campus->name,
                'code' => $campus->code,
                'is_active' => (bool) $campus->is_active,
                'colleges_count' => (int) $campus->colleges_count,
                'interns_count' => $internsCount,
                'admins_count' => $adminsCount,
            ];
        })->all();

        return [
            'total' => count($items),
            'active' => collect($items)->where('is_active', true)->count(),
            'items' => $items,
        ];
    }

    /**
     * Colleges with programs, interns, and admin assignment status
     *
     * @return array{
     *     total: int,
     *     active: int,
     *     items: array<int, array{
     *         id: int,
     *         name: string,
     *         code: string,
     *         campus: ?string,
     *         is_active: bool,
     *         programs_count: int,
     *         interns_count: int,
     *         admins_count: int,
     *         has_admin: bool,
     *         admin_names: ?string
     *     }>
     * }
     */
    private function collegeAnalytics(): array
    {
        $colleges = College::query()
            ->withCount([
                'programs',
                'admins',
                'internProfiles as interns_count' => function ($query) {
                    $query->verified()->where('status', 'approved');
                },
            ])
            ->with([
                'campus:id,name',
                'admins:id,name,email,college_id',
            ])
            ->orderByDesc('interns_count')
            ->orderBy('name')
            ->get();

        $items = $colleges->map(function (College $college) {
            $adminNames = $college->admins->isNotEmpty()
                ? $college->admins->pluck('name')->join(', ')
                : null;

            return [
                'id' => $college->id,
                'name' => $college->name,
                'code' => $college->code,
                'campus' => $college->campus?->name ?? $college->campus,
                'is_active' => (bool) $college->is_active,
                'programs_count' => (int) $college->programs_count,
                'interns_count' => (int) $college->interns_count,
                'admins_count' => (int) $college->admins_count,
                'has_admin' => $college->admins_count > 0,
                'admin_names' => $adminNames,
            ];
        })->all();

        return [
            'total' => count($items),
            'active' => collect($items)->where('is_active', true)->count(),
            'items' => $items,
        ];
    }

    /**
     * Overview of super admins and college admins across the system
     *
     * @return array{
     *     total: int,
     *     active: int,
     *     inactive: int,
     *     super_admins: int,
     *     college_admins: int,
     *     colleges_count: int,
     *     colleges_with_admin: int,
     *     coverage_percent: int,
     *     unassigned_colleges: array<int, array{id: int, name: string, code: string}>
     * }
     */
    private function adminAnalytics(): array
    {
        $admins = User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_COLLEGE_ADMIN, User::ROLE_ADMIN])
            ->get(['id', 'role', 'college_id', 'is_active']);

        $totalAdmins = $admins->count();
        $activeAdmins = $admins->where('is_active', true)->count();
        $inactiveAdmins = $totalAdmins - $activeAdmins;

        $superAdmins = $admins->filter(fn (User $u) => $u->isSuperAdmin())->count();
        $collegeAdmins = $admins->filter(fn (User $u) => $u->isCollegeAdmin())->count();

        $activeColleges = College::where('is_active', true)
            ->withCount('admins')
            ->get(['id', 'name', 'code']);

        $totalActiveColleges = $activeColleges->count();
        $collegesWithAdmin = $activeColleges->where('admins_count', '>', 0)->count();

        $unassignedColleges = $activeColleges
            ->where('admins_count', 0)
            ->map(fn (College $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'code' => $c->code,
            ])
            ->values()
            ->all();

        $coveragePercent = $totalActiveColleges > 0
            ? (int) round(($collegesWithAdmin / $totalActiveColleges) * 100)
            : 0;

        return [
            'total' => $totalAdmins,
            'active' => $activeAdmins,
            'inactive' => $inactiveAdmins,
            'super_admins' => $superAdmins,
            'college_admins' => $collegeAdmins,
            'colleges_count' => $totalActiveColleges,
            'colleges_with_admin' => $collegesWithAdmin,
            'coverage_percent' => $coveragePercent,
            'unassigned_colleges' => $unassignedColleges,
        ];
    }

    /**
     * Pending / approved / rejected counts across intern profiles
     *
     * @return array<int, array{status: string, count: int}>
     */
    private function statusBreakdown(?int $collegeId = null): array
    {
        $query = InternProfile::query()->verified();
        if ($collegeId !== null) {
            $query->forCollege($collegeId);
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

        $query = InternProfile::query()->verified()->where('registered_at', '>=', $rangeStart);
        if ($collegeId !== null) {
            $query->forCollege($collegeId);
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
        $query = Hte::query();
        if ($collegeId !== null) {
            $query->where('college_id', $collegeId);
        }

        return $query
            ->withCount([
                'internProfiles as interns_count' => function ($query) use ($collegeId) {
                    $query->verified()->where('status', 'approved');
                    if ($collegeId !== null) {
                        $query->forCollege($collegeId);
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
                $query->verified()->where('status', 'approved');
                if ($collegeId !== null) {
                    $query->forCollege($collegeId);
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
