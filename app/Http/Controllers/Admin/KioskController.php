<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kiosk;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class KioskController extends Controller
{
    public function show(): Response
    {
        // Only one shared kiosk exists right now — create it on first visit
        // if it doesn't exist yet, so there's nothing to manually seed.
        $kiosk = Kiosk::firstOrCreate(
            ['name' => 'Shared Testing Room'],
            ['device_token' => Kiosk::generateToken(), 'is_active' => true],
        );

        return Inertia::render('admin/kiosk', [
            'kiosk' => [
                'id' => $kiosk->id,
                'name' => $kiosk->name,
                'device_token' => $kiosk->device_token,
                'is_active' => $kiosk->is_active,
                'scan_url' => url("/kiosk/{$kiosk->device_token}"),
            ],
        ]);
    }

    public function regenerate(Kiosk $kiosk): RedirectResponse
    {
        $kiosk->update(['device_token' => Kiosk::generateToken()]);

        return back()->with('success', 'Kiosk link regenerated. The old link no longer works.');
    }

    public function toggleActive(Kiosk $kiosk): RedirectResponse
    {
        $kiosk->update(['is_active' => ! $kiosk->is_active]);

        return back()->with('success', $kiosk->is_active ? 'Kiosk enabled.' : 'Kiosk disabled.');
    }
}