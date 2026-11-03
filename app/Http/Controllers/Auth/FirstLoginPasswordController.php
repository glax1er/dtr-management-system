<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FirstLoginPasswordController extends Controller
{
    /**
     * Display the first-time password change prompt.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->requiresPasswordChange()) {
            return redirect()->route($user->homeRouteName());
        }

        return Inertia::render('auth/first-time-password', [
            'name' => $user->name,
            'email' => $user->email,
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Update the user's initial temporary password to a personal secure password.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        if (! $user->requiresPasswordChange()) {
            return redirect()->route($user->homeRouteName());
        }

        $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::defaults()->mixedCase()->numbers()->symbols()->min(8),
            ],
        ], [
            'current_password.current_password' => 'The current password you entered does not match your temporary password.',
            'password.confirmed' => 'The password confirmation does not match.',
            'password.mixed_case' => 'Password must include uppercase and lowercase letters.',
            'password.numbers' => 'Password must include at least one number.',
            'password.symbols' => 'Password must include at least one special symbol.',
            'password.min' => 'Password must be at least 8 characters long.',
        ]);

        $defaultPassword = config('supervisor.default_supervisor_password', 'Supervisor@123');
        if ($request->password === $defaultPassword || $request->password === 'Supervisor@123') {
            throw ValidationException::withMessages([
                'password' => 'Your new password cannot be the default placeholder password. Please choose a new, unique password.',
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false,
        ]);

        return redirect()->route($user->homeRouteName())->with('success', 'Your password has been set successfully! Welcome to your dashboard.');
    }
}
