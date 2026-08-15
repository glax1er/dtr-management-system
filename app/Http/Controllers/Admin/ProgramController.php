<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Models\Program;
use App\Models\SupervisorProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search'   => ['nullable', 'string', 'max:255'],
            'status'   => ['nullable', 'in:active,inactive'],
            'page'     => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $search  = trim($validated['search'] ?? '');
        $status  = $validated['status'] ?? '';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $approvedCounts = InternProfile::where('status', 'approved')
            ->selectRaw('program_id, count(*) as total')
            ->groupBy('program_id')
            ->pluck('total', 'program_id');

        $ojtSupervisors = SupervisorProfile::where('supervisor_type', 'ojt')
            ->with('user:id,name')
            ->get()
            ->groupBy('program_id');

        $query = Program::orderBy('program_name');

        if ($search !== '') {
            $query->where('program_name', 'like', "%{$search}%");
        }

        if ($status !== '') {
            $query->where('is_active', $status === 'active');
        }

        $programs = $query
            ->paginate($perPage, ['program_id', 'program_name', 'is_active', 'required_hours'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (Program $program) => [
                'program_id'           => $program->program_id,
                'program_name'         => $program->program_name,
                'is_active'            => $program->is_active,
                'required_hours'       => $program->required_hours,
                'approved_intern_count' => $approvedCounts->get($program->program_id, 0),
                'ojt_supervisors'      => $ojtSupervisors->get($program->program_id, collect())
                    ->pluck('user.name')
                    ->values(),
            ]);

        return Inertia::render('admin/programs', [
            'programs' => $programs,
            'filters'  => [
                'search'   => $search,
                'status'   => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'program_name' => ['required', 'string', 'max:255', 'unique:programs,program_name'],
            'required_hours' => ['required', 'integer', 'min:1', 'max:2000'],
        ]);

        Program::create([
            'program_name' => $validated['program_name'],
            'required_hours' => $validated['required_hours'],
            'is_active' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Program added.']);

        return back();
    }

    public function update(Request $request, Program $program): RedirectResponse
    {
        $validated = $request->validate([
            'program_name' => ['required', 'string', 'max:255', 'unique:programs,program_name,'.$program->program_id.',program_id'],
            'required_hours' => ['required', 'integer', 'min:1', 'max:2000'],
        ]);

        $program->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Program updated.']);

        return back();
    }

    public function updateStatus(Request $request, Program $program): RedirectResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $program->update(['is_active' => $validated['is_active']]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $validated['is_active'] ? 'Program activated.' : 'Program deactivated.',
        ]);

        return back();
    }

    public function destroy(Program $program): RedirectResponse
    {
        $program->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Program archived.']);

        return back();
    }
}