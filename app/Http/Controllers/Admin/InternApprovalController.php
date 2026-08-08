<?php
// app/Http/Controllers/Admin/InternApprovalController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;

class InternApprovalController extends Controller
{
    public function approve(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'approved',
            'approved_at' => now(),
            'qr_code_value' => (string) Str::uuid(), // only a unique random token string, modify if qr generation wil be applied
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been approved."]);
        return back();
    }

    public function reject(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'rejected',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been rejected."]);
        return back();
    }

    public function undo(InternProfile $internProfile): RedirectResponse
    {
        $internProfile->update([
            'status' => 'pending',
            'approved_at' => null,
            'qr_code_value' => null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$internProfile->user->name} has been reverted to pending."]);
        return back();
    }
}