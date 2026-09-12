<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Notifications\InternApprovalNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InternApprovalController extends Controller
{
    private function authorizeCollege(Request $request, InternProfile $internProfile): void
    {
        if ($request->user()->isCollegeAdmin()) {
            abort_if(
                $internProfile->program?->college_id !== $request->user()->college_id,
                403,
                'Unauthorized action.'
            );
        }
    }

    public function approve(Request $request, InternProfile $internProfile): RedirectResponse
    {
        $this->authorizeCollege($request, $internProfile);

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
