<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
    <title>{{ $subject ?? ($appName ?? config('app.name', 'DTR Management System')) }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; }
            .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
            .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
            .stack-column-center { text-align: center !important; }
            .content-padding { padding: 24px 16px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b;">
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
        @yield('preheader', $appName ?? config('app.name', 'DTR Management System'))
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 32px 16px 40px 16px;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="560">
                <tr>
                <td align="center" valign="top" width="560">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; margin: auto;">
                    <!-- Brand Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <div style="display: inline-block; padding: 8px 16px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                                            <span style="font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">
                                                USeP &bull; CIC
                                            </span>
                                            <span style="color: #94a3b8; margin: 0 4px;">|</span>
                                            <span style="font-size: 13px; font-weight: 500; color: #64748b;">
                                                {{ $appName ?? config('app.name', 'Internship Management System') }}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Content Card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <!-- Top Accent Bar -->
                                <tr>
                                    <td style="height: 4px; background: linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #ea580c 100%);"></td>
                                </tr>
                                <tr>
                                    <td class="content-padding" style="padding: 36px 32px 32px 32px;">
                                        @yield('content')
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 24px; padding-bottom: 16px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center;">
                                        <p style="margin: 0 0 8px 0;">
                                            This is an automated system notification from the <strong>{{ $appName ?? config('app.name', 'DTR Management System') }}</strong>.
                                        </p>
                                        <p style="margin: 0 0 8px 0;">
                                            University of Southeastern Philippines &bull; College of Information and Computing
                                        </p>
                                        <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                                            &copy; {{ date('Y') }} {{ $appName ?? config('app.name', 'DTR Management System') }}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
