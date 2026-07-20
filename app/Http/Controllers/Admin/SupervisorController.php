<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSupervisorRequest;
use App\Models\Archive;
use App\Models\Hte;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SupervisorController extends Controller
{
    /**
     * Show all supervisors (active & inactive).
     * Soft Delete button appears only when status is inactive.
     */
    public function index(): Response
    {
        $supervisors = SupervisorProfile::query()
            ->with(['user:id,name,email', 'hte:hte_id,hte_name'])
            ->get()
            ->map(fn (SupervisorProfile $profile) => [
                'user_id'  => $profile->user_id,
                'name'     => $profile->user->name,
                'email'    => $profile->user->email,
                'hte_name' => $profile->hte->hte_name,
                'status'   => $profile->status,
            ]);

        return Inertia::render('admin/supervisors/index', [
            'supervisors' => $supervisors,
            'htes' => Hte::where('status', 'active')->orderBy('hte_name')->get(['hte_id', 'hte_name']),
        ]);
    }

    /**
     * Centralized Archives — queries the polymorphic archives table.
     */
    public function archives(): Response
    {
        $archives = Archive::query()
            ->where('archivable_type', SupervisorProfile::class)
            ->whereNull('restored_at')
            ->orderByDesc('archived_at')
            ->get()
            ->map(fn (Archive $archive) => [
                'archive_id'  => $archive->id,
                'user_id'     => $archive->archivable_id,
                'name'        => $archive->data['user_name']  ?? 'Unknown',
                'email'       => $archive->data['user_email'] ?? 'Unknown',
                'hte_name'    => $archive->data['hte_name']   ?? 'Unknown',
                'archived_at' => $archive->archived_at->format('M d, Y g:i A'),
            ]);

        return Inertia::render('admin/supervisors/archives', [
            'supervisors' => $archives,
        ]);
    }

    /**
     * Toggle status between active and inactive.
     */
    public function updateStatus(Request $request, SupervisorProfile $supervisorProfile): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);

        $supervisorProfile->update(['status' => $validated['status']]);

        return back()->with('success', 'Supervisor status updated.');
    }

    /**
     * Soft Delete: only allowed when status is inactive.
     * Snapshots the row into archives, then deletes from supervisor_profiles.
     */
    public function softDelete(SupervisorProfile $supervisorProfile): RedirectResponse
    {
        if ($supervisorProfile->status !== 'inactive') {
            return back()->with('error', 'Only inactive supervisors can be archived.');
        }

        $snapshot = $supervisorProfile->toArray();
        $snapshot['user_name']  = $supervisorProfile->user->name;
        $snapshot['user_email'] = $supervisorProfile->user->email;
        $snapshot['hte_name']   = $supervisorProfile->hte->hte_name;

        DB::transaction(function () use ($supervisorProfile, $snapshot) {
            Archive::create([
                'archivable_type' => SupervisorProfile::class,
                'archivable_id'   => $supervisorProfile->user_id,
                'data'            => $snapshot,
                'archived_at'     => now(),
            ]);

            $supervisorProfile->delete();
        });

        return redirect()->route('admin.supervisors.index')
            ->with('success', 'Supervisor moved to archives.');
    }

    /**
     * Restore: re-insert the profile from the archive snapshot as active.
     */
    public function restore(Request $request, int $userId): RedirectResponse
    {
        $archive = Archive::query()
            ->where('archivable_type', SupervisorProfile::class)
            ->where('archivable_id', $userId)
            ->whereNull('restored_at')
            ->firstOrFail();

        DB::transaction(function () use ($archive) {
            SupervisorProfile::create([
                'user_id' => $archive->data['user_id'],
                'hte_id'  => $archive->data['hte_id'],
                'status'  => 'active',
            ]);

            $archive->update(['restored_at' => now()]);
        });

        return redirect()->route('admin.supervisors.archives')
            ->with('success', 'Supervisor restored successfully.');
    }

    /**
     * Permanent Delete: delete the user account and the archive snapshot.
     */
    public function destroy(Request $request, int $userId): RedirectResponse
    {
        $archive = Archive::query()
            ->where('archivable_type', SupervisorProfile::class)
            ->where('archivable_id', $userId)
            ->whereNull('restored_at')
            ->firstOrFail();

        DB::transaction(function () use ($archive, $userId) {
            User::where('id', $userId)->delete();
            $archive->delete();
        });

        return redirect()->route('admin.supervisors.archives')
            ->with('success', 'Supervisor permanently deleted.');
    }

    public function store(StoreSupervisorRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::create([
                'name'     => $request->validated('name'),
                'email'    => $request->validated('email'),
                'password' => config('supervisor.default_supervisor_password'),
                'role'     => User::ROLE_SUPERVISOR,
            ]);

            SupervisorProfile::create([
                'user_id' => $user->id,
                'hte_id'  => $request->validated('hte_id'),
                'status'  => 'active',
            ]);
        });

        return redirect()->route('admin.supervisors.index')
            ->with('success', 'Supervisor account created. Default password: ' . config('supervisor.default_supervisor_password'));
    }
}