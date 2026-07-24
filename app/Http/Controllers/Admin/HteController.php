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

class HteController extends Controller
{
    public function index(): Response
    {
        $htes = Hte::query()
            ->withCount([
                // only count interns whose registration has actually been
                // approved, not pending/rejected ones
                'internProfiles as interns_count' => fn ($query) => $query->where('status', 'approved'),
                'supervisorProfiles',
            ])
            ->orderBy('hte_name')
            ->get()
            ->map(fn (Hte $hte) => [
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
}