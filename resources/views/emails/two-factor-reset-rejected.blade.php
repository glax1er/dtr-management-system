@extends('emails.layout')

@section('preheader')
Update regarding your Two-Factor Authentication reset request for {{ $appName ?? config('app.name', 'DTR Management System') }}.
@endsection

@section('content')
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <!-- Icon Header -->
    <tr>
        <td align="center" style="padding-bottom: 20px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 50%; text-align: center;">
                <span style="font-size: 26px; line-height: 56px; vertical-align: middle;">ℹ️</span>
            </div>
        </td>
    </tr>

    <!-- Title & Greeting -->
    <tr>
        <td align="center" style="padding-bottom: 8px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">
                2FA Reset Request Declined
            </h1>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b; max-width: 440px;">
                Hello <strong>{{ $user->name ?? 'there' }}</strong>, your request to reset Two-Factor Authentication on <strong>{{ $appName }}</strong> has been reviewed by an administrator and declined.
            </p>
        </td>
    </tr>

    <!-- Rejection details -->
    @if(!empty($rejectionReason))
    <tr>
        <td style="padding-bottom: 24px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                    Reason provided:
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #334155;">
                    {{ $rejectionReason }}
                </p>
            </div>
        </td>
    </tr>
    @endif

    <tr>
        <td style="padding-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #475569;">
                Your existing two-factor authentication configuration remains unchanged. You may still log in using your authenticator code or one of your saved recovery codes. If you believe this was a mistake, please reach out to your department coordinator or institutional administrator directly.
            </p>
        </td>
    </tr>

    <!-- Login Button -->
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: auto;">
                <tr>
                    <td align="center" style="border-radius: 10px; background-color: #0f172a;">
                        <a href="{{ $loginUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px; background-color: #0f172a; border: 1px solid #0f172a;">
                            Return to Login &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
@endsection
