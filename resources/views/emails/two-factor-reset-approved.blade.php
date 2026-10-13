@extends('emails.layout')

@section('preheader')
Security Alert: Two-Factor Authentication on your account has been reset.
@endsection

@section('content')
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <!-- Icon Header -->
    <tr>
        <td align="center" style="padding-bottom: 20px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #fee2e2; border: 2px solid #fecaca; border-radius: 50%; text-align: center;">
                <span style="font-size: 26px; line-height: 56px; vertical-align: middle;">🚨</span>
            </div>
        </td>
    </tr>

    <!-- Title & Greeting -->
    <tr>
        <td align="center" style="padding-bottom: 8px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #991b1b; letter-spacing: -0.5px;">
                Security Alert: 2FA Reset Completed
            </h1>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b; max-width: 440px;">
                Hello <strong>{{ $user->name ?? 'there' }}</strong>, following your confirmed authorization, Two-Factor Authentication has been reset on your account by an administrator.
            </p>
        </td>
    </tr>

    <!-- Audit Details Box -->
    <tr>
        <td style="padding-bottom: 24px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #334155;">
                    <tr>
                        <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Approved by Admin:</td>
                        <td align="right" style="padding: 4px 0; font-weight: 600;">{{ $adminName }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; font-weight: 600; color: #64748b;">Reset Completed At:</td>
                        <td align="right" style="padding: 4px 0;">{{ $actionAt }}</td>
                    </tr>
                </table>
            </div>
        </td>
    </tr>

    <!-- What to do next -->
    <tr>
        <td style="padding-bottom: 24px;">
            <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 20px; color: #334155;">
                <strong>What this means:</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 22px; color: #475569;">
                <li>Your previous authenticator app codes and recovery codes are now deactivated.</li>
                <li>You can now log in using your registered email and password.</li>
                <li>To keep your account secure, we strongly recommend navigating to <strong>Settings &rarr; Security</strong> to set up an authenticator app again immediately.</li>
            </ul>
        </td>
    </tr>

    <!-- Login Button -->
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: auto;">
                <tr>
                    <td align="center" style="border-radius: 10px; background-color: #0f172a;">
                        <a href="{{ $loginUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px; background-color: #0f172a; border: 1px solid #0f172a;">
                            Log In to Your Account &rarr;
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Warning if unauthorized -->
    <tr>
        <td style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 14px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #991b1b;">
                    ⚠️ Important Security Warning
                </p>
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #b91c1c;">
                    If you did NOT request or authorize this 2FA reset, your account credentials may be compromised. Please contact system administrators and reset your password immediately.
                </p>
            </div>
        </td>
    </tr>
</table>
@endsection
