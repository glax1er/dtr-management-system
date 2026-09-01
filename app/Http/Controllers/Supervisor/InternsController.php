<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\Hte;
use App\Models\InternDocument;
use App\Models\InternProfile;
use App\Models\SupervisorProfile;
use App\Models\SchedulePeriod;
use App\Services\Attendance\DailyAttendance;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

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
     * assigned, total hours rendered to date, and requirement completion status.
     */
    private function roster(Request $request, SupervisorProfile $supervisorProfile): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'hte_id' => ['nullable', 'integer'],
            'completion_status' => ['nullable', 'string', 'in:all,completed,in_progress'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $search = trim($validated['search'] ?? '');
        $hteId = $validated['hte_id'] ?? null;
        $completionStatus = $validated['completion_status'] ?? 'all';

        $internsQuery = $supervisorProfile->getAssignedInterns()
            ->where('status', 'approved')
            ->with(['user', 'hte', 'program', 'internDocuments']);

        if ($search !== '') {
            $internsQuery->whereHas('user', fn ($query) => $query->where('name', 'like', "%{$search}%"));
        }

        if ($hteId !== null) {
            $internsQuery->where('hte_id', $hteId);
        }

        // Every HTE currently hosting an intern from this program — powers
        // the "Assigned HTE" filter dropdown.
        $hteOptions = Hte::query()
            ->whereHas('internProfiles', fn ($query) => $query->where('program_id', $supervisorProfile->program_id))
            ->orderBy('hte_name')
            ->get(['hte_id', 'hte_name']);

        $programDocTypes = InternDocument::getDocumentTypesForProgram($supervisorProfile->program_id);
        $requiredDocKeys = array_keys(array_filter($programDocTypes, fn ($c) => $c['required'] ?? false));
        $totalRequiredDocsCount = count($requiredDocKeys);

        $interns = $internsQuery->get();

        $allScansByIntern = AttendanceLog::query()
            ->whereIn('intern_user_id', $interns->pluck('user_id'))
            ->orderBy('scan_timestamp')
            ->get()
            ->groupBy('intern_user_id');

        $allStudents = $interns
            ->map(function (InternProfile $intern) use ($requiredDocKeys, $totalRequiredDocsCount, $allScansByIntern) {
                $requiredHours = $intern->program->required_hours ?? config('dtr.default_required_hours');
                $internScans = $allScansByIntern->get($intern->user_id, collect());
                $totalHours = $this->calculator->totalHoursForScans($internScans, $intern->hte_id);
                $hoursCompleted = $totalHours >= $requiredHours;

                $approvedRequiredDocsCount = $intern->internDocuments
                    ->where('status', InternDocument::STATUS_APPROVED)
                    ->whereIn('document_type', $requiredDocKeys)
                    ->count();
                $docsCompleted = $approvedRequiredDocsCount >= $totalRequiredDocsCount;
                $isCompleted = $hoursCompleted && $docsCompleted;

                $progressPercent = $requiredHours > 0
                    ? min(100, round(($totalHours / $requiredHours) * 100, 1))
                    : 0;

                return [
                    'intern_user_id' => $intern->user_id,
                    'name' => $intern->user->name,
                    'email' => $intern->user->email,
                    'id_number' => $intern->id_number,
                    'contact_number' => $intern->contact_number,
                    'hte_name' => $intern->hte?->hte_name ?? 'Deleted HTE',
                    'total_hours' => $totalHours,
                    'required_hours' => $requiredHours,
                    'progress_percent' => $progressPercent,
                    'hours_completed' => $hoursCompleted,
                    'approved_docs_count' => $approvedRequiredDocsCount,
                    'total_required_docs_count' => $totalRequiredDocsCount,
                    'docs_completed' => $docsCompleted,
                    'is_completed' => $isCompleted,
                ];
            })
            ->sortBy('name')
            ->values();

        $completedCount = $allStudents->where('is_completed', true)->count();
        $inProgressCount = $allStudents->where('is_completed', false)->count();

        $filteredStudents = $allStudents;
        if ($completionStatus === 'completed') {
            $filteredStudents = $filteredStudents->where('is_completed', true)->values();
        } elseif ($completionStatus === 'in_progress') {
            $filteredStudents = $filteredStudents->where('is_completed', false)->values();
        }

        $perPage = (int) ($validated['per_page'] ?? 20);
        $total = $filteredStudents->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        $pagedStudents = $filteredStudents->forPage($page, $perPage)->values();

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
            'studentCount' => $allStudents->count(),
            'completedCount' => $completedCount,
            'inProgressCount' => $inProgressCount,
            'scopeName' => $supervisorProfile->getScopeName(),
            'hteOptions' => $hteOptions,
            'filters' => [
                'search' => $search,
                'hte_id' => $hteId,
                'completion_status' => $completionStatus,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Returns a comprehensive completion summary for an intern, detailing
     * rendered vs. required hours, full attendance timeline, and mandatory
     * document approval clearance status.
     */
    public function completionSummary(Request $request, int $internUserId): JsonResponse
    {
        $user = $request->user();
        $internProfile = InternProfile::with(['user', 'hte', 'program', 'internDocuments.reviewer'])
            ->where('user_id', $internUserId)
            ->firstOrFail();

        if (! $user->isAdmin()) {
            if (! $user->isSupervisor()) {
                abort(403, 'Unauthorized.');
            }
            $supervisor = $user->supervisorProfile;
            if (! $supervisor) {
                abort(403, 'Supervisor profile not found.');
            }
            if ($supervisor->isOjtSupervisor()) {
                if ($internProfile->program_id !== $supervisor->program_id) {
                    abort(403, 'Intern is not under your program.');
                }
            } else {
                if ($internProfile->hte_id !== $supervisor->hte_id) {
                    abort(403, 'Intern is not under your HTE.');
                }
            }
        }

        $timezone = config('dtr.timezone');
        $requiredHours = $internProfile->program->required_hours ?? config('dtr.default_required_hours');
        $totalHours = $this->calculator->totalHours($internProfile->user_id, $internProfile->hte_id);
        $progressPercent = $requiredHours > 0 ? min(100, round(($totalHours / $requiredHours) * 100, 1)) : 0;
        $hoursCompleted = $totalHours >= $requiredHours;

        // Get daily attendance history for attendance stats
        $attendanceDays = $this->calculator->forIntern(
            $internProfile->user_id,
            $internProfile->hte_id,
            approvedAt: $internProfile->approved_at,
        );

        $attendedDays = $attendanceDays->filter(fn (DailyAttendance $day) => $day->hoursRendered > 0 || $day->rawScanCount > 0);
        $totalDaysAttended = $attendedDays->count();
        $firstAttendanceDate = $attendedDays->first()?->date;
        $lastAttendanceDate = $attendedDays->last()?->date;

        // Document checklist
        $uploadedDocs = $internProfile->internDocuments->keyBy('document_type');
        $checklist = [];
        $totalRequiredDocs = 0;
        $approvedRequiredDocs = 0;

        $programDocTypes = InternDocument::getDocumentTypesForProgram($internProfile->program_id);
        foreach ($programDocTypes as $typeKey => $typeConfig) {
            $uploaded = $uploadedDocs->get($typeKey);
            $isReq = (bool) $typeConfig['required'];
            if ($isReq) {
                $totalRequiredDocs++;
                if ($uploaded && $uploaded->status === InternDocument::STATUS_APPROVED) {
                    $approvedRequiredDocs++;
                }
            }

            $checklist[] = [
                'document_type' => $typeKey,
                'name' => $typeConfig['name'],
                'category' => $typeConfig['category'],
                'description' => $typeConfig['description'],
                'required' => $isReq,
                'status' => $uploaded ? $uploaded->status : 'missing',
                'id' => $uploaded?->id,
                'original_filename' => $uploaded?->original_filename,
                'file_size' => $uploaded?->formatted_file_size,
                'rejection_reason' => $uploaded?->rejection_reason,
                'submitted_at' => $uploaded?->submitted_at?->format('M d, Y g:i A'),
                'reviewed_at' => $uploaded?->reviewed_at?->format('M d, Y g:i A'),
                'reviewer_name' => $uploaded?->reviewer?->name,
                'preview_url' => $uploaded ? route('documents.review.preview', $uploaded->id) : null,
                'download_url' => $uploaded ? route('documents.review.download', $uploaded->id) : null,
            ];
        }

        $docsCompleted = $approvedRequiredDocs >= $totalRequiredDocs;
        $isCompleted = $hoursCompleted && $docsCompleted;

        return response()->json([
            'intern' => [
                'user_id' => $internProfile->user_id,
                'name' => $internProfile->user->name,
                'email' => $internProfile->user->email,
                'id_number' => $internProfile->id_number,
                'contact_number' => $internProfile->contact_number,
                'sex' => $internProfile->sex,
                'photo_url' => $internProfile->profile_photo_url,
                'registered_at' => $internProfile->registered_at?->format('M d, Y'),
                'approved_at' => $internProfile->approved_at?->format('M d, Y'),
                'program_name' => $internProfile->program?->program_name ?? 'N/A',
                'hte_name' => $internProfile->hte?->hte_name ?? 'N/A',
                'hte_address' => $internProfile->hte?->address,
                'hte_contact_person' => $internProfile->hte?->contact_person,
                'hte_contact_number' => $internProfile->hte?->contact_number,
            ],
            'hours' => [
                'required_hours' => $requiredHours,
                'total_hours' => $totalHours,
                'progress_percent' => $progressPercent,
                'hours_completed' => $hoursCompleted,
                'total_days_attended' => $totalDaysAttended,
                'first_attendance_date' => $firstAttendanceDate ? Carbon::parse($firstAttendanceDate)->format('M d, Y') : null,
                'last_attendance_date' => $lastAttendanceDate ? Carbon::parse($lastAttendanceDate)->format('M d, Y') : null,
            ],
            'documents' => [
                'total_required' => $totalRequiredDocs,
                'approved_required' => $approvedRequiredDocs,
                'docs_completed' => $docsCompleted,
                'checklist' => $checklist,
            ],
            'completion' => [
                'is_completed' => $isCompleted,
                'status' => match (true) {
                    $isCompleted => 'completed',
                    $hoursCompleted && ! $docsCompleted => 'hours_met_documents_pending',
                    ! $hoursCompleted && $docsCompleted => 'documents_met_hours_pending',
                    default => 'in_progress',
                },
                'completion_date' => $isCompleted ? ($lastAttendanceDate ? Carbon::parse($lastAttendanceDate)->format('F d, Y') : Carbon::now($timezone)->format('F d, Y')) : null,
                'generated_at' => Carbon::now($timezone)->format('F d, Y g:i A'),
                'supervisor_name' => $user->name,
                'supervisor_role' => $user->isSupervisor() && $user->supervisorProfile?->isOjtSupervisor() ? 'OJT Supervisor / Coordinator' : ($user->isAdmin() ? 'Administrator' : 'HTE Supervisor'),
            ],
        ]);
    }

    /**
     * Allows a supervisor to download an intern's full official DTR report.
     */
    public function downloadInternDtr(Request $request, int $internUserId): \Symfony\Component\HttpFoundation\Response
    {
        $user = $request->user();
        $internProfile = InternProfile::with(['user', 'hte', 'program'])->where('user_id', $internUserId)->firstOrFail();

        if (! $user->isAdmin()) {
            if (! $user->isSupervisor()) {
                abort(403, 'Unauthorized.');
            }
            $supervisor = $user->supervisorProfile;
            if (! $supervisor) {
                abort(403, 'Supervisor profile not found.');
            }
            if ($supervisor->isOjtSupervisor()) {
                if ($internProfile->program_id !== $supervisor->program_id) {
                    abort(403, 'Intern is not under your program.');
                }
            } else {
                if ($internProfile->hte_id !== $supervisor->hte_id) {
                    abort(403, 'Intern is not under your HTE.');
                }
            }
        }

        $timezone = config('dtr.timezone');
        $approvedAt = $internProfile->approved_at ?? Carbon::now($timezone)->startOfYear();
        $from = $approvedAt->clone()->setTimezone($timezone)->startOfDay();
        $to = Carbon::now($timezone)->endOfDay();

        $days = $this->calculator->forIntern(
            $internProfile->user_id,
            $internProfile->hte_id,
            from: $from,
            to: $to,
            approvedAt: $internProfile->approved_at,
        );

        $html = view('reports.dtr', [
            'user' => $internProfile->user,
            'profile' => $internProfile,
            'from' => $from,
            'to' => $to,
            'days' => $days,
            'totalHours' => $days->sum('hoursRendered'),
        ])->render();

        $mpdf = new Mpdf([
            'format' => 'Letter',
            'margin_top' => 15,
            'margin_bottom' => 15,
            'margin_left' => 15,
            'margin_right' => 15,
        ]);
        $mpdf->WriteHTML($html);

        $filename = sprintf(
            'DTR_%s_Full.pdf',
            str_replace(' ', '_', $internProfile->id_number ?: (string) $internProfile->user_id),
        );

        return response(
            $mpdf->Output($filename, Destination::STRING_RETURN),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ],
        );
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
                        'hte_name' => $intern->hte?->hte_name ?? 'Deleted HTE',
                        'program_name' => $intern->program?->program_name ?? 'Deleted Program', 
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
                'total_hours' => round((float) $rows->where('intern_user_id', $intern->user_id)->sum('hoursRendered'), 2),
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
