<?php
// app/Http/Controllers/Admin/SupervisorController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSupervisorRequest;
use App\Http\Requests\Admin\StoreOjtSupervisorRequest;
use Illuminate\Http\Request;
use App\Models\Hte;
use App\Models\Program;
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
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->get()
            ->map(fn (SupervisorProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'supervisor_type' => $profile->supervisor_type,
                'scope_name' => $profile->getScopeName(),
                'hte_name' => $profile->hte?->hte_name,
                'program_name' => $profile->program?->program_name,
                'status' => $profile->status,
            ]);

        return Inertia::render('admin/supervisors/index', [
            'supervisors' => $supervisors,
            'htes' => Hte::where('status', 'active')->orderBy('hte_name')->get(['hte_id', 'hte_name']),
            'programs' => Program::where('is_active', true)->orderBy('program_name')->get(['program_id', 'program_name']),
        ]);
    }

    public function updateStatus(Request $request, SupervisorProfile $supervisorProfile): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $supervisorProfile->update(['status' => $validated['status']]);

        // Keep the HTE's stored contact_person in sync — an inactive
        // HTE supervisor should stop being listed as the contact.
        if ($supervisorProfile->isHteSupervisor() && $supervisorProfile->hte) {
            $supervisorProfile->hte->refreshContactPerson();
        }

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
                'supervisor_type' => 'hte',
                'status' => 'active',
                'created_at' => now(),
            ]);

            // Keep the HTE's stored contact_person in sync.
            $supervisorProfile->hte->refreshContactPerson();
        });

        return redirect()->route('admin.supervisors.index')
            ->with('success', 'HTE Supervisor account created. Default password: '.config('supervisor.default_supervisor_password'));
    }

    public function storeOjtSupervisor(StoreOjtSupervisorRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => config('supervisor.default_supervisor_password'),
                'role' => User::ROLE_SUPERVISOR,
            ]);

            SupervisorProfile::create([
                'user_id' => $user->id,
                'program_id' => $request->validated('program_id'),
                'supervisor_type' => 'ojt',
                'status' => 'active',
                'created_at' => now(),
            ]);
        });

        return redirect()->route('admin.supervisors.index')
            ->with('success', 'OJT Supervisor account created. Default password: '.config('supervisor.default_supervisor_password'));
    }
}