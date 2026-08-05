<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHteRequest;
use App\Http\Requests\Admin\UpdateHteRequest;
use App\Models\Hte;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Admin\UpdateSupervisorRequest;

class HteController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = Hte::query()
            ->withCount([
                // only count interns whose registration has actually been
                // approved, not pending/rejected ones
                'internProfiles as interns_count' => fn ($q) => $q->where('status', 'approved'),
                'supervisorProfiles',
            ]);

        if ($search !== '') {
            $query->where('hte_name', 'like', "%{$search}%");
        }

        $htes = $query
            ->orderBy('hte_name')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (Hte $hte) => [
                'hte_id' => $hte->hte_id,
                'hte_name' => $hte->hte_name,
                'address' => $hte->address,
                'contact_person' => $hte->contact_person,
                'contact_number' => $hte->contact_number,
                'status' => $hte->status,
                'interns_count' => $hte->interns_count,
                'supervisors_count' => $hte->supervisor_profiles_count,
            ]);

        return Inertia::render('admin/htes/index', [
            'htes' => $htes,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(StoreHteRequest $request): RedirectResponse
    {
        Hte::create([
            ...$request->validated(),
            'status' => 'active',
        ]);

        return back()->with('success', 'HTE added.');
    }

    public function update(UpdateHteRequest $request, Hte $hte): RedirectResponse
    {
        $hte->update($request->validated());

        return back()->with('success', 'HTE updated.');
    }

    public function updateStatus(Request $request, Hte $hte): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $hte->update(['status' => $validated['status']]);

        return back()->with('success', 'HTE status updated.');
    }
    public function destroy(Hte $hte): RedirectResponse
    {
        if ($hte->status !== 'inactive') {
            return back()->with('error', 'Only inactive HTEs can be deleted.');
        }

        $hte->delete();

        return back()->with('success', 'HTE removed.');
    }
}
