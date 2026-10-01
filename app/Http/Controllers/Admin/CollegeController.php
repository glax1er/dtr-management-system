<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campus;
use App\Models\College;
use App\Models\InternProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CollegeController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
            'campus' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? '';
        $campus = trim($validated['campus'] ?? '');
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = College::query()
            ->withCount(['programs', 'admins'])
            ->with([
                'programs' => fn ($q) => $q->select(['program_id', 'college_id', 'program_name', 'is_active', 'required_hours'])->orderBy('program_name'),
                'admins' => fn ($q) => $q->select(['id', 'name', 'email', 'college_id']),
            ])
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($status !== '') {
            $query->where('is_active', $status === 'active');
        }

        if ($campus !== '') {
            $query->where('campus', $campus);
        }

        $campuses = Campus::where('is_active', true)->orderBy('name')->pluck('name')->toArray();
        if (empty($campuses)) {
            $knownCampuses = ['Obrero', 'Mintal', 'Tagum', 'Mabini', 'Malabog'];
            $dbCampuses = College::whereNotNull('campus')->where('campus', '!=', '')->distinct()->pluck('campus')->toArray();
            $campuses = array_values(array_unique(array_merge($knownCampuses, $dbCampuses)));
            sort($campuses);
        }

        $colleges = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        $internCounts = [];
        foreach ($colleges as $college) {
            $internCounts[$college->id] = InternProfile::verified()
                ->where('status', 'approved')
                ->forCollege($college->id)
                ->count();
        }

        $colleges->through(fn (College $college) => [
            'id' => $college->id,
            'name' => $college->name,
            'code' => $college->code,
            'campus' => $college->campus,
            'description' => $college->description,
            'is_active' => (bool) $college->is_active,
            'programs_count' => $college->programs_count,
            'admins_count' => $college->admins_count,
            'interns_count' => $internCounts[$college->id] ?? 0,
            'admin_email' => $college->admins->isNotEmpty()
                ? $college->admins->pluck('email')->join(', ')
                : null,
            'programs' => $college->programs->map(fn ($p) => [
                'program_id' => $p->program_id,
                'program_name' => $p->program_name,
                'is_active' => (bool) $p->is_active,
                'required_hours' => $p->required_hours,
            ])->values()->all(),
            'created_at' => $college->created_at?->format('M d, Y'),
        ]);

        return Inertia::render('admin/colleges/index', [
            'colleges' => $colleges,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'campus' => $campus,
                'per_page' => $perPage,
            ],
            'campuses' => $campuses,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:50', 'unique:colleges,code'],
            'campus' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $campusName = $validated['campus'] ?? null;
        $campusId = $campusName ? Campus::where('name', $campusName)->value('id') : null;

        College::create([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'campus' => $campusName,
            'campus_id' => $campusId,
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'College added.']);

        return back();
    }

    public function update(Request $request, College $college): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:50', Rule::unique('colleges', 'code')->ignore($college->id)],
            'campus' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $campusName = $validated['campus'] ?? null;
        $campusId = $campusName ? Campus::where('name', $campusName)->value('id') : null;

        $college->update([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'campus' => $campusName,
            'campus_id' => $campusId,
            'description' => $validated['description'] ?? null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'College updated.']);

        return back();
    }

    public function updateStatus(Request $request, College $college): RedirectResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $college->update(['is_active' => $validated['is_active']]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $validated['is_active'] ? 'College activated.' : 'College deactivated.',
        ]);

        return back();
    }

    public function destroy(Request $request, College $college): RedirectResponse
    {
        $college->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'College archived.']);

        return back();
    }
}