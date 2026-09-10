<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\SupervisorProfile;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/profile', [
            // Email verification is intern-only — supervisors and admins
            // are exempt (see User::hasVerifiedEmail()), so they should
            // never see the "verify your email" prompt on this page.
            'mustVerifyEmail' => $user instanceof MustVerifyEmail
                && $user->isIntern(),
            'status' => $request->session()->get('status'),
            'idCard' => $this->idCardData($user),
            'profileDetails' => $this->profileDetails($user),
        ]);
    }

    /**
     * Role-specific fields for the printable ID card — nothing here
     * lives on the shared users table, so it isn't already available
     * via the globally-shared auth.user prop.
     *
     * @return array<string, mixed>
     */
    private function idCardData(User $user): array
    {
        if ($user->isIntern()) {
            $profile = $user->internProfile()->with([
                'hte' => fn ($q) => $q->withTrashed(),
                'program' => fn ($q) => $q->withTrashed(),
            ])->first();

            return [
                'id_number' => $profile?->id_number,
                'subtitle' => $profile?->program->program_name ?? 'Not assigned',
                'detail' => $profile?->hte->hte_name ?? 'Not assigned',
                'has_qr_code' => $profile?->qr_code_value !== null,
                'qr_code_url' => $profile?->qr_code_value !== null
                    ? route('intern.qr-code.show')
                    : null,
                'bg_url' => $profile?->hte?->id_bg_url ?? '/images/cic-bg.jpg',
            ];
        }

        if ($user->isSupervisor()) {
            $profile = $user->supervisorProfile()->with([
                'hte' => fn ($q) => $q->withTrashed(),
                'program' => fn ($q) => $q->withTrashed(),
            ])->first();

            return [
                'id_number' => null,
                'subtitle' => $profile?->isOjtSupervisor() ? 'OJT Supervisor' : 'HTE Supervisor',
                'detail' => $profile?->getScopeName(),
                'has_qr_code' => false,
                'qr_code_url' => null,
                'bg_url' => $profile?->hte?->id_bg_url ?? '/images/cic-bg.jpg',
            ];
        }

        return [
            'id_number' => null,
            'subtitle' => 'System Administrator',
            'detail' => null,
            'has_qr_code' => false,
            'qr_code_url' => null,
            'bg_url' => '/images/cic-bg.jpg',
        ];
    }

    /**
     * Non-editable profile assignment details (role, id_number, program,
     * HTE, and supervisor names) shown in the profile settings form.
     *
     * @return array<string, mixed>
     */
    private function profileDetails(User $user): array
    {
        if ($user->isIntern()) {
            $profile = $user->internProfile()->with([
                'hte' => fn ($q) => $q->withTrashed(),
                'program' => fn ($q) => $q->withTrashed(),
            ])->first();

            $hteSupervisorNames = null;
            if ($profile?->hte_id) {
                $names = SupervisorProfile::where('hte_id', $profile->hte_id)
                    ->where('supervisor_type', 'hte')
                    ->where('status', 'active')
                    ->with('user:id,name')
                    ->get()
                    ->pluck('user.name')
                    ->filter()
                    ->values();

                $hteSupervisorNames = $names->isNotEmpty()
                    ? $names->implode(', ')
                    : ($profile->hte?->contact_person ?: null);
            }

            $ojtSupervisorNames = null;
            if ($profile?->program_id) {
                $names = SupervisorProfile::where('program_id', $profile->program_id)
                    ->where('supervisor_type', 'ojt')
                    ->where('status', 'active')
                    ->with('user:id,name')
                    ->get()
                    ->pluck('user.name')
                    ->filter()
                    ->values();

                $ojtSupervisorNames = $names->isNotEmpty()
                    ? $names->implode(', ')
                    : null;
            }

            return [
                'role' => 'Intern',
                'id_number' => $profile?->id_number,
                'program' => $profile?->program?->program_name,
                'hte' => $profile?->hte?->hte_name,
                'hte_supervisor' => $hteSupervisorNames,
                'ojt_supervisor' => $ojtSupervisorNames,
            ];
        }

        if ($user->isSupervisor()) {
            $profile = $user->supervisorProfile()->with([
                'hte' => fn ($q) => $q->withTrashed(),
                'program' => fn ($q) => $q->withTrashed(),
            ])->first();

            return [
                'role' => $profile?->isOjtSupervisor() ? 'OJT Supervisor' : 'HTE Supervisor',
                'id_number' => null,
                'program' => $profile?->program?->program_name,
                'hte' => $profile?->hte?->hte_name,
                'hte_supervisor' => null,
                'ojt_supervisor' => null,
            ];
        }

        return [
            'role' => 'System Administrator',
            'id_number' => null,
            'program' => null,
            'hte' => null,
            'hte_supervisor' => null,
            'ojt_supervisor' => null,
        ];
    }

    /**
     * Update the user's profile information. Email is intentionally
     * excluded — it's permanent once the account exists, changeable
     * only by an admin working directly with the record, not via this
     * self-service form.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        unset($validated['email']);

        $request->user()->fill($validated);
        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('home');
    }
}
