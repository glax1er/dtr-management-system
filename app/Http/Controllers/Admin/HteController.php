<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHteRequest;
use App\Http\Requests\Admin\UpdateHteRequest;
use App\Models\Hte;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HteController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? '';
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

        if ($status !== '') {
            $query->where('status', $status);
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
                'id_bg_url' => $hte->id_bg_url,
                'interns_count' => $hte->interns_count,
                'supervisors_count' => $hte->supervisor_profiles_count,
            ]);

        return Inertia::render('admin/htes/index', [
            'htes' => $htes,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function store(StoreHteRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('id_bg')) {
            $data['id_bg_path'] = $request->file('id_bg')->store('hte-backgrounds', 'public');
        }

        unset($data['id_bg']);

        Hte::create([
            ...$data,
            'status' => 'active',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE added.']);

        return back();
    }

    public function update(UpdateHteRequest $request, Hte $hte): RedirectResponse
    {
        $data = $request->validated();

        if ($request->boolean('remove_id_bg')) {
            if ($hte->id_bg_path) {
                Storage::disk('public')->delete($hte->id_bg_path);
            }
            $data['id_bg_path'] = null;
        } elseif ($request->hasFile('id_bg')) {
            if ($hte->id_bg_path) {
                Storage::disk('public')->delete($hte->id_bg_path);
            }
            $data['id_bg_path'] = $request->file('id_bg')->store('hte-backgrounds', 'public');
        }

        unset($data['id_bg'], $data['remove_id_bg']);

        $hte->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE updated.']);

        return back();
    }

    public function updateStatus(Request $request, Hte $hte): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $hte->update(['status' => $validated['status']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE status updated.']);

        return back();
    }

    public function destroy(Hte $hte): RedirectResponse
    {
        if ($hte->status !== 'inactive') {
            return back()->with('error', 'Only inactive HTEs can be deleted.');
        }

        $hte->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'HTE archived.']);

        return back();
    }
}
