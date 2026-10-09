<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Notifications\NewInternRegistrationNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationCodeController extends Controller
{
    /**
     * Display the email verification prompt with code input.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user && $user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        return Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
            'email' => $user?->email,
        ]);
    }

    /**
     * Verify the 6-digit email verification code.
     */
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
            'email' => ['nullable', 'string', 'email'],
        ], [
            'code.required' => 'Please enter the 6-digit verification code.',
            'code.size' => 'The verification code must be exactly 6 digits.',
        ]);

        $email = $request->email ?: $request->user()?->email;

        if (! $email) {
            return redirect()->route('login');
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        $isValid = EmailVerificationCode::verify($email, $request->code);

        if (! $isValid) {
            throw ValidationException::withMessages([
                'code' => 'The 6-digit verification code is invalid or has expired. Please check the code or request a new one.',
            ]);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        // When an intern verifies their email, notify admins that their account is pending approval
        if ($user->isIntern() && $user->internProfile && $user->internProfile->status === 'pending') {
            $internProfile = $user->internProfile;
            $program = $internProfile->program;
            $profileUser = $internProfile->user;
            $internCollegeId = ($program !== null ? $program->college_id : null)
                ?? $internProfile->college_id
                ?? ($profileUser !== null ? $profileUser->college_id : null);

            // Notify college admins responsible for this intern's college
            $collegeAdmins = User::query()
                ->where('is_active', true)
                ->where(function ($query) {
                    $query->where('role', User::ROLE_COLLEGE_ADMIN)
                        ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNotNull('college_id'));
                })
                ->when($internCollegeId, fn ($q) => $q->where('college_id', $internCollegeId))
                ->get()
                ->filter(fn (User $admin) => $admin->wantsNotification('intern_registrations'));

            // Super admins only receive this if they explicitly opted into all_intern_registrations
            $superAdmins = User::query()
                ->where('is_active', true)
                ->where(function ($query) {
                    $query->where('role', User::ROLE_SUPER_ADMIN)
                        ->orWhere(fn ($sub) => $sub->where('role', User::ROLE_ADMIN)->whereNull('college_id'));
                })
                ->get()
                ->filter(fn (User $admin) => $admin->wantsNotification('all_intern_registrations'));

            $recipients = $collegeAdmins->merge($superAdmins);

            if ($recipients->isNotEmpty()) {
                Notification::send($recipients, new NewInternRegistrationNotification($internProfile));
            }
        }

        // If intern registration is still pending approval, ensure logged out and notify them
        if ($user->isIntern() && $user->internProfile?->status !== 'approved') {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with(
                'status',
                'Email verified successfully! Your account registration is currently pending administrator approval. You will receive access once approved.',
            );
        }

        if (! Auth::check()) {
            Auth::login($user);
        }

        return redirect()->intended(route('dashboard'))->with(
            'status',
            'Email verified successfully! Welcome to the system.',
        );
    }

    /**
     * Resend the 6-digit verification code to the user's email.
     */
    public function resend(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['nullable', 'string', 'email'],
        ]);

        $email = $request->email ?: $request->user()?->email;

        if (! $email) {
            return redirect()->route('login');
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        $user->sendEmailVerificationNotification();

        return back()->with('status', 'A new 6-digit verification code has been sent to your email address.');
    }
}
