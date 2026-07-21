<?php
// app/Http/Controllers/Admin/SupervisorController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSupervisorRequest;
use Illuminate\Http\Request;
use App\Models\Hte;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    public function index(): Response
    {
        $supervisors = SupervisorProfile::query()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name'])
            ->get()
            ->map(fn (SupervisorProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'hte_name' => $profile->hte->hte_name,
                'status' => $profile->status,
            ]);

        return Inertia::render('admin/supervisors/index', [
            'supervisors' => $supervisors,
            'htes' => Hte::where('status', 'active')->orderBy('hte_name')->get(['hte_id', 'hte_name']),
        ]);
    }

    public function updateStatus(Request $request, SupervisorProfile $supervisorProfile): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $supervisorProfile->update(['status' => $validated['status']]);

        // Keep the HTE's stored contact_person in sync — an inactive
        // supervisor should stop being listed as the contact.
        $supervisorProfile->hte->refreshContactPerson();

        return back()->with('success', 'Supervisor status updated.');
    }

    public function store(StoreSupervisorRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => config('supervisor.default_supervisor_password'),
                'role' => User::ROLE_SUPERVISOR,
            ]);

            $supervisorProfile = SupervisorProfile::create([
                'user_id' => $user->id,
                'hte_id' => $request->validated('hte_id'),
                'status' => 'active',
            ]);

            // Keep the HTE's stored contact_person in sync.
            $supervisorProfile->hte->refreshContactPerson();
        });

        return redirect()->route('admin.supervisors.index')
            ->with('success', 'Supervisor account created. Default password: '.config('supervisor.default_supervisor_password'));
    }
}