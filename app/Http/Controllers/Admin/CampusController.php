<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Campus;
use App\Models\InternProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CampusController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,inactive'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? '';
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = Campus::query()
            ->withCount('colleges')
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        if ($status !== '') {
            $query->where('is_active', $status === 'active');
        }

        $campuses = $query
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString();

        $internCounts = [];
        foreach ($campuses as $campus) {
            $internCounts[$campus->id] = InternProfile::verified()
                ->where('status', 'approved')
                ->forCampus($campus)
                ->count();
        }

        $campuses->through(fn (Campus $campus) => [
            'id' => $campus->id,
            'name' => $campus->name,
            'code' => $campus->code,
            'address' => $campus->address,
            'description' => $campus->description,
            'is_active' => (bool) $campus->is_active,
            'colleges_count' => $campus->colleges_count,
            'interns_count' => $internCounts[$campus->id] ?? 0,
            'created_at' => $campus->created_at?->format('M d, Y'),
        ]);

        return Inertia::render('admin/campuses/index', [
            'campuses' => $campuses,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:campuses,name'],
            'code' => ['required', 'string', 'max:50', 'unique:campuses,code'],
            'address' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        Campus::create([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'address' => $validated['address'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Campus created successfully.']);

        return back();
    }

    public function update(Request $request, Campus $campus): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('campuses', 'name')->ignore($campus->id)],
            'code' => ['required', 'string', 'max:50', Rule::unique('campuses', 'code')->ignore($campus->id)],
            'address' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $campus->update([
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'address' => $validated['address'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Campus updated successfully.']);

        return back();
    }

    public function updateStatus(Request $request, Campus $campus): RedirectResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $campus->update(['is_active' => $validated['is_active']]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $validated['is_active'] ? 'Campus activated.' : 'Campus deactivated.',
        ]);

        return back();
    }

    public function destroy(Request $request, Campus $campus): RedirectResponse
    {
        $campus->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Campus archived.']);

        return back();
    }
}
