<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationPreferencesController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $roleLabel = $user->role;
        if ($user->isSupervisor() && $user->supervisorProfile) {
            $roleLabel = $user->supervisorProfile->isOjtSupervisor() ? 'OJT Supervisor' : 'HTE Supervisor';
        }

        return Inertia::render('settings/notifications', [
            'preferences' => $user->getNotificationPreferences(),
            'options' => array_values($user->getAvailableNotificationOptions()),
            'role' => $roleLabel,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $availableOptions = $user->getAvailableNotificationOptions();

        $rules = [];
        foreach (array_keys($availableOptions) as $key) {
            $rules[$key] = ['required', 'boolean'];
        }

        $validated = $request->validate($rules);

        $user->update([
            'notification_preferences' => $validated,
        ]);

        return back()->with('success', 'Notification preferences updated successfully.');
    }
}
