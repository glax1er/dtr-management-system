@extends('emails.layout')

@section('preheader')
Reset your password for {{ $appName ?? config('app.name', 'DTR Management System') }}.
@endsection

@section('content')
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <!-- Icon Header -->
    <tr>
        <td align="center" style="padding-bottom: 20px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #eff6ff; border: 2px solid #dbeafe; border-radius: 50%; text-align: center;">
                <span style="font-size: 26px; line-height: 56px; vertical-align: middle;">🔑</span>
            </div>
        </td>
    </tr>

    <!-- Title & Greeting -->
    <tr>
        <td align="center" style="padding-bottom: 8px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">
                Reset Your Password
            </h1>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-bottom: 28px;">
            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b; max-width: 440px;">
                Hello <strong>{{ $user->name ?? 'there' }}</strong>, we received a request to reset the password for your account on <strong>{{ $appName }}</strong>. Click the button below to choose a new password:
            </p>
        </td>
    </tr>

    <!-- Action Button -->
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: auto;">
                <tr>
                    <td align="center" style="border-radius: 10px; background-color: #991b1b;">
                        <a href="{{ $resetUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px; background-color: #991b1b; border: 1px solid #7f1d1d;">
                            Reset Password &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Expiration Badge -->
    <tr>
        <td align="center" style="padding-bottom: 28px;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: auto;">
                <tr>
                    <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #92400e; text-align: center;">
                        ⏱️ Link expires in <strong>{{ $expiresInMinutes ?? 60 }} minutes</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Fallback Direct Link -->
    <tr>
        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                Trouble clicking the button?
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #475569; word-break: break-all;">
                Copy and paste this URL into your web browser:<br>
                <a href="{{ $resetUrl }}" style="color: #991b1b; text-decoration: underline; font-size: 11px;">
                    {{ $resetUrl }}
                </a>
            </p>
        </td>
    </tr>

    <!-- Divider & Security notice -->
    <tr>
        <td style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                If you did not request a password reset, no further action is required. Your account password remains unchanged and secure.
            </p>
        </td>
    </tr>
</table>
@endsection
