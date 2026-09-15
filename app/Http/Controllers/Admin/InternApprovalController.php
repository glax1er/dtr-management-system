<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
            $internCollegeId = $internProfile->program?->college_id ?? $internProfile->user?->college_id;
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

        $internProfile->user?->notify(new InternApprovalNotification($internProfile, 'approved'));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been approved."]);

        return back();
    }

    public function reject(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        if (! $internProfile->user->hasVerifiedEmail()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'The intern must verify their email address before rejection.']);

            return back();
        }

        $internProfile->update([
            'status' => 'rejected',
        ]);

        $internProfile->user?->notify(new InternApprovalNotification($internProfile, 'rejected'));

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been rejected."]);

        return back();
    }

    public function undo(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        $internProfile->update([
            'status' => 'pending',
            'approved_at' => null,
            'qr_code_value' => null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been reverted to pending."]);

        return back();
    }

    public function destroy(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

        if ($internProfile->status !== 'rejected') {
            return back()->with('error', 'Only rejected intern records can be archived.');
        }

        $internProfile->delete();

        return back()->with('success', "{$internProfile->user->name} has been moved to Archives.");
    }
}
