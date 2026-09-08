@extends('emails.layout')

@section('preheader')
Your email verification code is {{ $code }}. Valid for {{ $expiresInMinutes ?? 15 }} minutes.
@endsection

@section('content')
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <!-- Icon Header -->
    <tr>
        <td align="center" style="padding-bottom: 20px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #fef2f2; border: 2px solid #fee2e2; border-radius: 50%; text-align: center;">
                <span style="font-size: 26px; line-height: 56px; vertical-align: middle;">🛡️</span>
            </div>
        </td>
    </tr>

    <!-- Title & Greeting -->
    <tr>
        <td align="center" style="padding-bottom: 8px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">
                Verify Your Email Address
            </h1>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b; max-width: 420px;">
                Hello <strong>{{ $user->name ?? 'there' }}</strong>, thank you for joining the <strong>{{ $appName }}</strong>. Please use the verification code below to verify your account:
            </p>
        </td>
    </tr>

    <!-- Code Card Box -->
    <tr>
        <td align="center" style="padding-bottom: 24px;">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: auto; width: 100%; max-width: 380px;">
                <tr>
                    <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px 16px;">
                        <span style="display: block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: 10px; padding-left: 10px;">
                            {{ $code }}
                        </span>
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
                        ⏱️ Code expires in <strong>{{ $expiresInMinutes ?? 15 }} minutes</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Divider -->
    <tr>
        <td style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; color: #64748b;">
                <strong>Security Notice:</strong> Never share this verification code with anyone. Our administrators and supervisors will never ask for your code.
            </p>
            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                If you did not initiate this request or create an account, you can safely ignore this email.
            </p>
        </td>
    </tr>
</table>
@endsection
