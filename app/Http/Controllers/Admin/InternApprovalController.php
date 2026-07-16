<?php
// app/Http/Controllers/Admin/InternApprovalController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

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
}