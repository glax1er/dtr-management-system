<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Hte;
use App\Models\InternProfile;
use App\Models\SupervisorProfile;
use App\Services\Attendance\DailyAttendanceCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HtesController extends Controller
{
    public function __construct(
        private readonly DailyAttendanceCalculator $calculator,
    ) {}

    /**
     * Read-only list of every HTE currently hosting an intern from this
     * OJT Supervisor's program — same scope as InternsController's
     * roster (program-wide, across every HTE), just grouped by HTE
     * instead of by intern. Each HTE also carries its own scoped intern
     * list, so the frontend can expand a row into a mini-roster without
     * a second request. Paginated the same way the student roster is,
     * so both surfaces behave consistently once the list grows past a
     * page. This route is gated to OJT Supervisors only (see
     * EnsureOjtSupervisor) — an HTE Supervisor is already scoped to a
     * single HTE, so a list of HTEs adds nothing for them.
     */
    public function index(Request $request): Response
    {
        /** @var SupervisorProfile $supervisorProfile */
        $supervisorProfile = $request->user()->supervisorProfile;
        $program = $supervisorProfile->program;

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? null;

        $htesQuery = Hte::query()
            ->whereHas('internProfiles', fn ($query) => $query->where('program_id', $program->program_id))
            ->withCount([
                // scoped to interns from this OJT supervisor's program only —
                // not the HTE's total roster across every program, and only
                // approved ones, matching the admin HTE list's convention.
                'internProfiles as interns_count' => fn ($query) => $query
                    ->where('program_id', $program->program_id)
                    ->where('status', 'approved'),
            ])
            ->with([
                // Feeds the per-row "interns under this HTE" dropdown —
                // same scope as interns_count above, plus the user record
                // for name/email.
                'internProfiles' => fn ($query) => $query
                    ->where('program_id', $program->program_id)
                    ->where('status', 'approved')
                    ->with('user')
                    ->orderBy('user_id'),
            ]);

        if ($search !== '') {
            $htesQuery->where('hte_name', 'like', "%{$search}%");
        }

        if ($status !== null) {
            $htesQuery->where('status', $status);
        }

        $htes = $htesQuery->orderBy('hte_name')->get()
            ->map(fn (Hte $hte) => [
                'hte_id' => $hte->hte_id,
                'hte_name' => $hte->hte_name,
                'address' => $hte->address,
                'contact_person' => $hte->contact_person,
                'contact_number' => $hte->contact_number,
                'status' => $hte->status,
                'interns_count' => $hte->interns_count,
                'interns' => $hte->internProfiles
                    ->map(fn (InternProfile $intern) => [
                        'intern_user_id' => $intern->user_id,
                        'name' => $intern->user->name,
                        'email' => $intern->user->email,
                        'id_number' => $intern->id_number,
                        'contact_number' => $intern->contact_number,
                        'total_hours' => $this->calculator->totalHours($intern->user_id, $hte->hte_id),
                    ])
                    ->sortBy('name')
                    ->values(),
            ]);

        $perPage = (int) ($validated['per_page'] ?? 20);
        $total = $htes->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($validated['page'] ?? 1), $lastPage);

        $pagedHtes = $htes->forPage($page, $perPage)->values();

        return Inertia::render('supervisor/htes', [
            'htes' => [
                'data' => $pagedHtes,
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total === 0 ? null : ($page - 1) * $perPage + 1,
                'to' => $total === 0 ? null : min($page * $perPage, $total),
            ],
            'hteCount' => $total,
            'scopeName' => $supervisorProfile->getScopeName(),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }
}
