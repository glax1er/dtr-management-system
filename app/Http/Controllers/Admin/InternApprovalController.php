<?php
// app/Http/Controllers/Admin/InternApprovalController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use App\Http\Requests\Admin\UpdateSupervisorRequest;

class InternApprovalController extends Controller
{
    public function approve(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'approved',
            'approved_at' => now(),
            'qr_code_value' => (string) Str::uuid(), // only a unique random token string, modify if qr generation wil be applied
        ]);

        return back()->with('success', "{$internProfile->user->name} has been approved.");
    }

    public function reject(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'rejected',
        ]);

        return back()->with('success', "{$internProfile->user->name} has been rejected.");
    }

    public function undo(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'pending',
            'approved_at' => null,
            'qr_code_value' => null,
        ]);

        return back()->with('success', "{$internProfile->user->name} has been reverted to pending.");
    }
    public function destroy(InternProfile $internProfile): RedirectResponse
    {
        if ($internProfile->status !== 'rejected') {
            return back()->with('error', 'Only rejected intern records can be deleted.');
        }

        $internProfile->delete();

        return back()->with('success', "{$internProfile->user->name} has been removed.");
    }
}