<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSupervisorRequest;
use App\Http\Requests\Admin\StoreOjtSupervisorRequest;
use App\Http\Requests\Admin\UpdateSupervisorRequest;
use App\Models\Hte;
use App\Models\Program;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    private const DEFAULT_PER_PAGE = 10;

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:hte,ojt'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:' . self::MAX_PER_PAGE],
        ]);

        $search = trim($validated['search'] ?? '');
        $type = $validated['type'] ?? null;
        $perPage = (int) ($validated['per_page'] ?? self::DEFAULT_PER_PAGE);

        $query = SupervisorProfile::query()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name']);

        if ($search !== '') {
            $query->whereHas(
                'user',
                fn ($q) => $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            );
        }

        if ($type !== null) {
            $query->where('supervisor_type', $type);
        }

        $supervisors = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $validated['page'] ?? 1)
            ->withQueryString()
            ->through(fn (SupervisorProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'supervisor_type' => $profile->supervisor_type,
                'scope_name' => $profile->getScopeName(),
                'status' => $profile->status,
                'hte_id' => $profile->hte_id,
                'program_id' => $profile->program_id,
            ]);

        return Inertia::render('admin/supervisors/index', [
            'supervisors' => $supervisors,
            'htes' => Hte::where('status', 'active')->orderBy('hte_name')->get(['hte_id', 'hte_name']),
            'programs' => Program::where('is_active', true)->orderBy('program_name')->get(['program_id', 'program_name']),
            'filters' => [
                'search' => $search,
                'type' => $type,
                'per_page' => $perPage,
            ],
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
            $supervisorProfile->hte?->refreshContactPerson();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supervisor status updated.']);
        return back();
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
            $supervisorProfile->hte?->refreshContactPerson();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "HTE Supervisor account created.\nDefault password: ".config('supervisor.default_supervisor_password')]);

        return redirect()->route('admin.supervisors.index');
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

        Inertia::flash('toast', ['type' => 'success', 'message' => "OJT Supervisor account created.\nDefault password: " . config('supervisor.default_supervisor_password')]);

        return redirect()->route('admin.supervisors.index');
    }

    public function update(UpdateSupervisorRequest $request, SupervisorProfile $supervisorProfile): RedirectResponse
    {
        DB::transaction(function () use ($request, $supervisorProfile) {
            $supervisorProfile->user->update([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
            ]);

            if ($supervisorProfile->supervisor_type === 'hte') {
                $supervisorProfile->update(['hte_id' => $request->validated('hte_id')]);
                $supervisorProfile->hte?->refreshContactPerson();
            } else {
                $supervisorProfile->update(['program_id' => $request->validated('program_id')]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supervisor updated.']);
        return back();
    }

    public function destroy(SupervisorProfile $supervisorProfile): RedirectResponse
    {
        if ($supervisorProfile->status !== 'inactive') {
            return back()->with('error', 'Only inactive supervisors can be deleted.');
        }

        $supervisorProfile->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supervisor archived.']);
        return back();
    }
}