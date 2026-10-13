<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\TwoFactorResetRequest;
use App\Models\User;
use App\Notifications\TwoFactorResetConfirmationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorResetRequestController extends Controller
{
    /**
     * Show the form to request a 2FA reset.
     */
    public function create(Request $request): Response
    {
        $prefilledEmail = null;
        if ($challengedId = $request->session()->get('login.id')) {
            $prefilledEmail = User::find($challengedId)?->email;
        }

        return Inertia::render('auth/two-factor-reset', [
            'prefilledEmail' => $prefilledEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Submit a request for a 2FA reset.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $throttleKey = 'two-factor-reset:'.$request->ip().'|'.$email;

        // Rate limit: maximum 3 requests per 15 minutes per IP + email
        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return back()->withErrors([
                'email' => "Too many reset attempts. Please try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($throttleKey, 900);

        $user = User::where('email', $email)->first();

        // Security / Anti-enumeration:
        // Only generate & send confirmation if the user exists AND currently has 2FA enabled.
        // In all cases, return the exact same success message to prevent user enumeration.
        if ($user && $user->hasEnabledTwoFactorAuthentication()) {
            [$resetRequest, $plainToken] = TwoFactorResetRequest::createForUser(
                user: $user,
                reason: $validated['reason'] ?? null,
                requestedBy: null,
                ip: $request->ip(),
                userAgent: $request->userAgent(),
            );

            $user->notify(new TwoFactorResetConfirmationNotification($resetRequest, $plainToken));

            AuditLog::record(
                action: 'two_factor_reset.requested_by_user',
                description: "2FA reset requested by user {$user->name} ({$user->email}). Awaiting email authorization.",
                auditable: $resetRequest,
                user: $user,
            );
        }

        return redirect()->route('two-factor.reset.create')->with(
            'status',
            'If an account with that email has two-factor authentication enabled, an authorization link has been sent to your email.'
        );
    }

    /**
     * Show the confirmation screen when the user clicks the link in their email.
     */
    public function showConfirm(string $token): Response
    {
        $tokenHash = hash('sha256', $token);

        $resetRequest = TwoFactorResetRequest::where('token_hash', $tokenHash)
            ->where('status', TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION)
            ->with('user:id,name,email')
            ->first();

        if (! $resetRequest || $resetRequest->isExpired()) {
            return Inertia::render('auth/two-factor-reset-confirm', [
                'isValid' => false,
                'errorMessage' => 'This 2FA reset authorization link is invalid or has expired. Please submit a new request if needed.',
            ]);
        }

        $user = $resetRequest->user;

        // Mask the email for privacy in the view (e.g., j***n@example.com)
        $emailParts = explode('@', $user->email);
        $namePart = $emailParts[0];
        $domainPart = $emailParts[1] ?? '';
        $maskedEmail = (strlen($namePart) > 2)
            ? substr($namePart, 0, 1).str_repeat('*', strlen($namePart) - 2).substr($namePart, -1).'@'.$domainPart
            : $user->email;

        return Inertia::render('auth/two-factor-reset-confirm', [
            'isValid' => true,
            'token' => $token,
            'userName' => $user->name,
            'userEmail' => $maskedEmail,
            'requestedAt' => $resetRequest->created_at?->format('M d, Y h:i A'),
            'reason' => $resetRequest->reason,
            'userIp' => $resetRequest->user_ip,
        ]);
    }

    /**
     * Process the user's explicit consent / permission to reset 2FA.
     */
    public function confirm(Request $request, string $token): RedirectResponse
    {
        $tokenHash = hash('sha256', $token);

        $resetRequest = TwoFactorResetRequest::where('token_hash', $tokenHash)
            ->where('status', TwoFactorResetRequest::STATUS_PENDING_USER_CONFIRMATION)
            ->first();

        if (! $resetRequest || $resetRequest->isExpired()) {
            return redirect()->route('two-factor.reset.confirm.view', ['token' => $token])->withErrors([
                'token' => 'This authorization link has expired or has already been used.',
            ]);
        }

        $confirmed = $resetRequest->confirmByUser($token);

        if (! $confirmed) {
            return redirect()->route('two-factor.reset.confirm.view', ['token' => $token])->withErrors([
                'token' => 'Unable to confirm authorization. Please request a new reset link.',
            ]);
        }

        AuditLog::record(
            action: 'two_factor_reset.user_confirmed',
            description: "User {$resetRequest->user->name} confirmed permission to reset 2FA via email. Request queued for administrator approval.",
            auditable: $resetRequest,
            user: $resetRequest->user,
        );

        return redirect()->route('login')->with(
            'status',
            'Permission granted successfully! Your 2FA reset request is now queued for administrator review. You will receive an email once approved.'
        );
    }
}
