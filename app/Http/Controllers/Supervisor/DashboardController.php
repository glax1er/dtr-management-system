<?php

// app/Http/Controllers/Supervisor/DashboardController.php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\ResolutionTicket;
use App\Models\User;
use App\Services\Attendance\DailyAttendanceCalculator;
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

    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        $supervisor = auth()->user();
        $supervisorProfile = $supervisor->supervisorProfile;

        if ($supervisorProfile?->isOjtSupervisor()) {
            return $this->ojtDashboard($request, $supervisorProfile);
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
            ->with(['intern:id,name,profile_photo_path', 'intern.internProfile'])
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
                    'profile_photo_url' => $log->intern->profile_photo_url,
                    'id_number' => $log->intern->internProfile?->id_number,
                    'label' => $label,
                    'scanned_at' => $log->scan_timestamp->diffForHumans(),
                    'scanned_at_full' => $localTimestamp->format('M j, Y g:i A'),
                    'captured_photo_url' => $log->captured_photo_url,
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

    /**
     * Dedicated comprehensive landing dashboard for OJT Supervisors.
     * Provides an instant high-level overview of their program's interns:
     * milestone breakdown (0-24%, 25-49%, 50-74%, 75-99%, 100%+ finished),
     * finished & cleared interns, HTE deployment distribution, document clearance
     * compliance, and quick inspection actions.
     */
    private function ojtDashboard(Request $request, $supervisorProfile): Response
    {
        $programId = $supervisorProfile->program_id;

        // Fetch verified, approved interns assigned to this supervisor's program
        $interns = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->with(['user', 'hte', 'program', 'internDocuments'])
            ->get();

        $internUserIds = $interns->pluck('user_id');

        // Attendance scans for all program interns
        $allScansByIntern = AttendanceLog::query()
            ->whereIn('intern_user_id', $internUserIds)
            ->orderBy('scan_timestamp')
            ->get()
            ->groupBy('intern_user_id');

        // Document requirements for this program
        $programDocTypes = $programId ? InternDocument::getDocumentTypesForProgram($programId) : [];
        $requiredDocKeys = array_keys(array_filter($programDocTypes, fn ($c) => $c['required'] ?? false));
        $totalRequiredDocsCount = count($requiredDocKeys);

        // Compute metrics for each intern
        $allStudents = $interns->map(function (InternProfile $intern) use ($requiredDocKeys, $totalRequiredDocsCount, $allScansByIntern) {
            $requiredHours = (int) ($intern->program->required_hours ?? config('dtr.default_required_hours'));
            $internScans = $allScansByIntern->get($intern->user_id, collect());
            $totalHours = $this->calculator->totalHoursForScans($internScans, (int) ($intern->hte_id ?? 0));
            $hoursCompleted = $totalHours >= $requiredHours;

            $approvedRequiredDocs = $intern->internDocuments
                ->where('status', InternDocument::STATUS_APPROVED)
                ->whereIn('document_type', $requiredDocKeys)
                ->count();

            $pendingDocs = $intern->internDocuments
                ->where('status', InternDocument::STATUS_PENDING)
                ->count();

            $docsCompleted = $approvedRequiredDocs >= $totalRequiredDocsCount;
            $isFullyCompleted = $hoursCompleted && $docsCompleted;

            $progressPercent = $requiredHours > 0
                ? min(100, round(($totalHours / $requiredHours) * 100, 1))
                : 0;

            $milestone = match (true) {
                $progressPercent >= 100 => 'completed',
                $progressPercent >= 75 => 'near_completion',
                $progressPercent >= 50 => 'midway',
                $progressPercent >= 25 => 'in_progress',
                default => 'early_stage',
            };

            $milestoneLabel = match ($milestone) {
                'completed' => '100% Completed',
                'near_completion' => 'Near Completion (75–99%)',
                'midway' => 'Midway (50–74%)',
                'in_progress' => 'Steady Progress (25–49%)',
                default => 'Early Stage (<25%)',
            };

            return [
                'intern_user_id' => $intern->user_id,
                'name' => $intern->user->name,
                'email' => $intern->user->email,
                'id_number' => $intern->id_number,
                'contact_number' => $intern->contact_number,
                'hte_name' => $intern->hte?->hte_name ?? 'Unassigned HTE',
                'hte_id' => $intern->hte_id,
                'total_hours' => $totalHours,
                'required_hours' => $requiredHours,
                'progress_percent' => $progressPercent,
                'hours_completed' => $hoursCompleted,
                'approved_docs_count' => $approvedRequiredDocs,
                'total_required_docs_count' => $totalRequiredDocsCount,
                'pending_docs_count' => $pendingDocs,
                'docs_completed' => $docsCompleted,
                'is_completed' => $isFullyCompleted,
                'milestone' => $milestone,
                'milestone_label' => $milestoneLabel,
                'profile_photo_url' => $intern->profile_photo_url,
            ];
        })->sortByDesc('progress_percent')->values();

        // Milestone progression breakdown (ordered left-to-right from 0% to 100%)
        $milestones = [
            [
                'key' => 'early_stage',
                'label' => 'Early Stage (0%–24%)',
                'description' => 'Newly started or beginning internship',
                'count' => $allStudents->where('milestone', 'early_stage')->count(),
                'color' => 'slate',
            ],
            [
                'key' => 'in_progress',
                'label' => 'Steady Progress (25%–49%)',
                'description' => 'Past initial orientation and onboarding',
                'count' => $allStudents->where('milestone', 'in_progress')->count(),
                'color' => 'purple',
            ],
            [
                'key' => 'midway',
                'label' => 'Midway (50%–74%)',
                'description' => 'Crossed the 50% midpoint of training',
                'count' => $allStudents->where('milestone', 'midway')->count(),
                'color' => 'blue',
            ],
            [
                'key' => 'near_completion',
                'label' => 'Near Completion (75%–99%)',
                'description' => 'Final stretch, approaching target hours',
                'count' => $allStudents->where('milestone', 'near_completion')->count(),
                'color' => 'amber',
            ],
            [
                'key' => 'completed',
                'label' => 'Completed (100%+)',
                'description' => 'Met or exceeded required training hours',
                'count' => $allStudents->where('milestone', 'completed')->count(),
                'color' => 'emerald',
            ],
        ];

        $totalInterns = $allStudents->count();
        $hoursCompletedCount = $allStudents->where('hours_completed', true)->count();
        $fullyCompletedCount = $allStudents->where('is_completed', true)->count();
        $nearCompletionCount = $allStudents->where('milestone', 'near_completion')->count();
        $totalHoursRendered = round((float) $allStudents->sum('total_hours'), 1);
        $averageProgress = $totalInterns > 0 ? round((float) $allStudents->avg('progress_percent'), 1) : 0;
        $totalPendingDocs = (int) $allStudents->sum('pending_docs_count');

        // Document compliance breakdown across all program interns
        $allDocs = InternDocument::whereIn('user_id', $internUserIds)->get();
        $docStats = [
            'total_submitted' => $allDocs->count(),
            'approved' => $allDocs->where('status', InternDocument::STATUS_APPROVED)->count(),
            'pending_review' => $allDocs->where('status', InternDocument::STATUS_PENDING)->count(),
            'rejected' => $allDocs->where('status', InternDocument::STATUS_REJECTED)->count(),
        ];

        // HTE Partner placement distribution
        $hteDistribution = $interns
            ->groupBy('hte_id')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'hte_id' => $first->hte_id,
                    'name' => $first->hte?->hte_name ?? 'Unassigned HTE',
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->all();

        // Finished interns list
        $finishedInterns = $allStudents
            ->where('hours_completed', true)
            ->values()
            ->all();

        return Inertia::render('supervisor/ojt-dashboard', [
            'scopeName' => $supervisorProfile->getScopeName(),
            'programName' => $supervisorProfile->program?->program_name ?? 'Program',
            'stats' => [
                'totalInterns' => $totalInterns,
                'hoursCompletedCount' => $hoursCompletedCount,
                'fullyCompletedCount' => $fullyCompletedCount,
                'nearCompletionCount' => $nearCompletionCount,
                'totalHoursRendered' => $totalHoursRendered,
                'averageProgress' => $averageProgress,
                'totalPendingDocs' => $totalPendingDocs,
                'totalHtes' => count($hteDistribution),
            ],
            'milestones' => $milestones,
            'students' => $allStudents->all(),
            'finishedInterns' => $finishedInterns,
            'hteDistribution' => $hteDistribution,
            'docStats' => $docStats,
            'scansTrend' => $this->scansTrend($internUserIds),
            'todayAttendance' => $this->todayAttendance($internUserIds, $totalInterns),
        ]);
    }
}
