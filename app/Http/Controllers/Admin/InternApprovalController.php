<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\InternProfile;
use App\Notifications\InternApprovalNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InternApprovalController extends Controller
{
    private function authorizeCollege(Request $request, InternProfile $internProfile): void
    {
        if ($request->user()->isCollegeAdmin()) {
            $program = $internProfile->program;
            $profileUser = $internProfile->user;
            $internCollegeId = ($program !== null ? $program->college_id : null)
                ?? ($profileUser !== null ? $profileUser->college_id : null);
            abort_if(
                $internCollegeId !== $request->user()->college_id,
                403,
                'Unauthorized action.'
            );
        }
    }

    public function approve(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        if (! $internProfile->user->hasVerifiedEmail()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'The intern must verify their email address before approval.']);

            return back();
        }

        $internProfile->update([
            'status' => 'approved',
            'approved_at' => now(),
            'qr_code_value' => (string) Str::uuid(),
        ]);

        AuditLog::record(
            action: 'intern_status_approved',
            description: "Intern {$internProfile->user->name} approved by administrator",
            auditable: $internProfile,
            oldValues: ['status' => 'pending'],
            newValues: ['status' => 'approved', 'approved_at' => now()->toIso8601String()],
            user: $request->user(),
        );

        $internProfile->user?->notify(new InternApprovalNotification($internProfile, 'approved'));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been approved."]);

        return back();
    }

    public function reject(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        $oldStatus = $internProfile->status;

        $internProfile->update([
            'status' => 'rejected',
        ]);

        AuditLog::record(
            action: 'intern_status_rejected',
            description: "Intern {$internProfile->user->name} rejected by administrator",
            auditable: $internProfile,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'rejected'],
            user: $request->user(),
        );

        $internProfile->user?->notify(new InternApprovalNotification($internProfile, 'rejected'));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been rejected."]);

        return back();
    }

    public function undo(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        $oldStatus = $internProfile->status;

        $internProfile->update([
            'status' => 'pending',
            'approved_at' => null,
            'qr_code_value' => null,
        ]);

        AuditLog::record(
            action: 'intern_status_reverted',
            description: "Intern {$internProfile->user->name} reverted to pending by administrator",
            auditable: $internProfile,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'pending'],
            user: $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been reverted to pending."]);

        return back();
    }

    public function destroy(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        if ($internProfile->status !== 'rejected') {
            return back()->with('error', 'Only rejected intern records can be archived.');
        }

        AuditLog::record(
            action: 'intern_profile_archived',
            description: "Intern {$internProfile->user->name} moved to archives by administrator",
            auditable: $internProfile,
            oldValues: ['status' => 'rejected'],
            user: $request->user(),
        );

        $internProfile->delete();

        return back()->with('success', "{$internProfile->user->name} has been moved to Archives.");
    }
}
