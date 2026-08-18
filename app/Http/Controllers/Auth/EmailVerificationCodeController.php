<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\EmailVerificationCode;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        ], [
            'code.required' => 'Please enter the 6-digit verification code.',
            'code.size' => 'The verification code must be exactly 6 digits.',
        ]);

        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        $isValid = EmailVerificationCode::verify($user->email, $request->code);

        if (! $isValid) {
            throw ValidationException::withMessages([
                'code' => 'The 6-digit verification code is invalid or has expired. Please check the code or request a new one.',
            ]);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        // If intern registration is still pending approval, log them out and notify them
        if ($user->isIntern() && $user->internProfile?->status !== 'approved') {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with(
                'status',
                'Email verified successfully! Your account registration is currently pending administrator approval. You will receive access once approved.',
            );
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
        $user = $request->user();

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
