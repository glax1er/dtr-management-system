import type {
    IdCardData,
    IdCardOrientation,
    IdCardSide,
} from '@/components/id-card';

interface PrintIdCardParams {
    name: string;
    email: string;
    avatarUrl: string | null;
    role: 'admin' | 'supervisor' | 'intern' | string;
    data?: IdCardData | null;
    orientation: IdCardOrientation;
    defaultSide?: IdCardSide | 'both';
}

const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrator',
    supervisor: 'Supervisor',
    intern: 'Intern',
};

/**
 * Opens a standalone popup window containing the ID card, styled
 * with plain CSS (no Tailwind), and triggers the browser's print dialog.
 * Sized to standard CR80 card specifications (85.60mm × 53.98mm / 3.375in × 2.125in).
 * Optimized for cardstock badge printing with center fold line and cut guides.
 */
export function printIdCard({
    name,
    email,
    avatarUrl,
    role,
    data,
    orientation,
    defaultSide = 'both',
}: PrintIdCardParams) {
    const isLandscape = orientation === 'landscape';
    const cardData = data ?? {
        id_number: null,
        subtitle: null,
        detail: null,
        has_qr_code: false,
        qr_code_url: null,
    };
    const roleLabel =
        ROLE_LABEL[role] ??
        (role
            ? String(role).charAt(0).toUpperCase() + String(role).slice(1)
            : 'Member');

    // Exact on-screen dimensions matching IdCard component (420x265 landscape, 270x430 portrait)
    const cardWidth = isLandscape ? '420px' : '270px';
    const cardHeight = isLandscape ? '265px' : '430px';

    // Physical millimeter dimensions for exact CR80 (ISO/IEC 7810 ID-1 standard)
    const printCardWidth = isLandscape ? '85.6mm' : '53.98mm';
    const printCardHeight = isLandscape ? '53.98mm' : '85.6mm';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>ID Card — ${name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --card-border: rgba(228, 228, 231, 0.95);
            --card-bg: #ffffff;
            --primary: #18181b;
            --text-main: #09090b;
            --text-muted: #71717a;
            --text-sub: #52525b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        html, body {
            margin: 0;
            padding: 0;
            background: #f4f4f5;
            font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: var(--text-main);
        }

        /* Toolbar (hidden on print) */
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 50;
            background: #ffffff;
            border-bottom: 1px solid #e4e4e7;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .toolbar-info {
            display: flex;
            flex-direction: column;
        }

        .toolbar-title {
            font-size: 14px;
            font-weight: 800;
            color: #18181b;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cr80-badge {
            font-size: 10px;
            font-weight: 700;
            background: #f4f4f5;
            color: #52525b;
            border: 1px solid #d4d4d8;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .toolbar-subtitle {
            font-size: 11.5px;
            color: #71717a;
            margin-top: 2px;
        }

        .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .segmented-control {
            display: inline-flex;
            background: #f4f4f5;
            padding: 3px;
            border-radius: 8px;
            border: 1px solid #e4e4e7;
        }

        .seg-btn {
            padding: 5px 12px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            background: transparent;
            color: #71717a;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .seg-btn.active {
            background: #ffffff;
            color: #18181b;
            box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }

        .btn-print {
            padding: 7px 18px;
            font-size: 12px;
            font-weight: 700;
            background: #18181b;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .btn-print:hover {
            background: #27272a;
        }

        /* Tips banner */
        .tips-banner {
            background: #fafafa;
            border-bottom: 1px solid #e4e4e7;
            padding: 8px 24px;
            font-size: 11px;
            color: #52525b;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .tips-banner strong {
            color: #18181b;
        }

        /* Printable workspace */
        .workspace {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
            min-height: calc(100vh - 100px);
        }

        /* Sheet containing the cards and fold line */
        .card-sheet {
            display: flex;
            flex-direction: ${isLandscape ? 'column' : 'row'};
            align-items: center;
            justify-content: center;
            position: relative;
            background: #ffffff;
            padding: 4px;
            border: 1px dashed #d4d4d8;
            border-radius: 18px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        /* Uniform card styles */
        .card {
            width: ${cardWidth};
            height: ${cardHeight};
            border: 1px solid var(--card-border);
            border-radius: 16px;
            background-color: var(--card-bg);
            background-image: linear-gradient(rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.86)), url('/images/cic-bg.jpg');
            background-size: cover;
            background-position: center;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            box-sizing: border-box;
            position: relative;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        /* Center Fold Line */
        .fold-guide {
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isLandscape ? cardWidth : '28px'};
            height: ${isLandscape ? '24px' : cardHeight};
            position: relative;
        }

        .fold-line {
            width: ${isLandscape ? '100%' : '1px'};
            height: ${isLandscape ? '1px' : '100%'};
            border-top: ${isLandscape ? '1.5px dashed #a1a1aa' : 'none'};
            border-left: ${isLandscape ? 'none' : '1.5px dashed #a1a1aa'};
        }

        .fold-label {
            position: absolute;
            background: #ffffff;
            border: 1px solid #e4e4e7;
            padding: ${isLandscape ? '2px 8px' : '4px 6px'};
            border-radius: 4px;
            font-size: 7.5px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: #71717a;
            text-transform: uppercase;
            white-space: nowrap;
            writing-mode: ${isLandscape ? 'horizontal-tb' : 'vertical-rl'};
            transform: ${isLandscape ? 'none' : 'rotate(180deg)'};
        }

        /* Header (Identical for Front & Back) */
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(228, 228, 231, 0.8);
            padding-bottom: 8px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }

        .logo {
            height: 40px;
            width: auto;
            object-fit: contain;
            flex-shrink: 0;
        }

        .brand-group {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
            min-width: 0;
        }

        .brand-title {
            font-size: ${isLandscape ? '10.5px' : '8.5px'};
            font-weight: 900;
            letter-spacing: 0.025em;
            color: var(--primary);
            text-transform: uppercase;
            line-height: 1.15;
        }

        .brand-sub {
            font-size: 7.5px;
            font-weight: 600;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            text-transform: uppercase;
            line-height: 1.15;
        }

        .role-pill {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--primary);
            background: rgba(24, 24, 27, 0.08);
            border: 1px solid rgba(24, 24, 27, 0.22);
            padding: 2px 8px;
            border-radius: 9999px;
            white-space: nowrap;
            flex-shrink: 0;
        }

        .side-pill {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #52525b;
            background: #f4f4f5;
            border: 1px solid #d4d4d8;
            padding: 2px 6px;
            border-radius: 9999px;
            white-space: nowrap;
            flex-shrink: 0;
        }

        /* Front Body */
        .body-front {
            display: flex;
            align-items: center;
            flex: 1;
            ${
                isLandscape
                    ? 'flex-direction: row; gap: 16px; padding: 10px 0;'
                    : 'flex-direction: column; justify-content: center; text-align: center; gap: 8px; padding: 8px 0;'
            }
        }

        .photo {
            width: ${isLandscape ? '120px' : '128px'};
            height: ${isLandscape ? '120px' : '128px'};
            border-radius: ${isLandscape ? '14px' : '16px'};
            border: 2px solid rgba(255, 255, 255, 0.95);
            outline: 1px solid rgba(228, 228, 231, 0.7);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            object-fit: cover;
            flex-shrink: 0;
            background: #f4f4f5;
        }

        .photo-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .info-front {
            min-width: 0;
            ${isLandscape ? 'flex: 1;' : 'width: 100%;'}
        }

        .name {
            font-size: 15px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.025em;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        }

        .subtitle {
            font-size: 11px;
            font-weight: 700;
            color: var(--primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
            margin-top: 2px;
        }

        .detail {
            font-size: 10.5px;
            font-weight: 500;
            color: var(--text-sub);
            line-height: 1.35;
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin-top: 2px;
        }

        .id-badge-wrap {
            margin-top: 4px;
        }

        .id-badge {
            display: inline-block;
            font-size: 9.5px;
            font-weight: 700;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #e4e4e7;
            padding: 2px 6px;
            border-radius: 4px;
            letter-spacing: 0.05em;
            color: var(--primary);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .email {
            font-size: 9px;
            font-weight: 500;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 3px;
        }

        /* Back Body: Enlarged Centered QR Code & Instruction */
        .body-back {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            padding: 4px 0;
        }

        .qr-container-back {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-align: center;
            margin: auto;
        }

        .qr-instruction-title {
            font-size: ${isLandscape ? '10px' : '11px'};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #18181b;
            line-height: 1.1;
        }

        .qr-box-centered {
            width: ${isLandscape ? '134px' : '195px'};
            height: ${isLandscape ? '134px' : '195px'};
            border: 1px solid #d4d4d8;
            border-radius: ${isLandscape ? '12px' : '16px'};
            padding: ${isLandscape ? '6px' : '10px'};
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin: auto;
        }

        .qr-box-centered img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            image-rendering: pixelated;
        }

        /* Footers (Identical layout) */
        .card-footer {
            border-top: 1px solid rgba(228, 228, 231, 0.8);
            padding-top: 6px;
            font-size: 7.5px;
            font-weight: 600;
            color: var(--text-muted);
            letter-spacing: 0.03em;
            display: flex;
            align-items: center;
            justify-content: space-between;
            text-transform: uppercase;
        }

        .card-footer-center {
            justify-content: center;
            text-align: center;
            text-transform: none;
            font-weight: 500;
        }

        /* Visibility control */
        body[data-mode="front"] .card-back,
        body[data-mode="front"] .fold-guide {
            display: none !important;
        }

        body[data-mode="back"] .card-front,
        body[data-mode="back"] .fold-guide {
            display: none !important;
        }

        /* Print Media Queries - CR80 Physical Dimensions */
        @page {
            size: portrait;
            margin: 8mm;
        }

        @media print {
            .toolbar,
            .tips-banner {
                display: none !important;
            }

            html, body {
                height: 100%;
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: transparent !important;
            }

            .workspace {
                padding: 0 !important;
                min-height: auto !important;
                height: 100%;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .card-sheet {
                box-shadow: none !important;
                border: 0.5pt dashed #71717a !important; /* Cutting boundary */
                border-radius: 0 !important;
                padding: 0 !important;
                margin: auto !important;
                background: #ffffff !important;
                flex-direction: ${isLandscape ? 'column' : 'row'} !important;
            }

            .card {
                width: ${printCardWidth} !important;
                height: ${printCardHeight} !important;
                border-radius: 3.18mm !important; /* CR80 standard 1/8" corner radius */
                border: 0.5pt solid #d4d4d8 !important;
                box-shadow: none !important;
                padding: 4mm !important;
                page-break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            .photo {
                width: ${isLandscape ? '31mm' : '34mm'} !important;
                height: ${isLandscape ? '31mm' : '34mm'} !important;
            }

            .qr-box-centered {
                width: ${isLandscape ? '28mm' : '40mm'} !important;
                height: ${isLandscape ? '28mm' : '40mm'} !important;
            }

            .fold-guide {
                width: ${isLandscape ? printCardWidth : '0'} !important;
                height: ${isLandscape ? '0' : printCardHeight} !important;
                border-top: ${isLandscape ? '0.5pt dashed #71717a' : 'none'} !important;
                border-left: ${isLandscape ? 'none' : '0.5pt dashed #71717a'} !important;
                position: relative !important;
                margin: 0 !important;
            }

            .fold-guide .fold-label {
                display: none !important;
            }
        }
    </style>
</head>
<body data-mode="${defaultSide}">
    <!-- Preview Controls Toolbar -->
    <div class="toolbar">
        <div class="toolbar-info">
            <div class="toolbar-title">
                <span>ID Card Print Preview — ${name}</span>
                <span class="cr80-badge">CR80 (85.6mm × 54mm)</span>
            </div>
            <div class="toolbar-subtitle">
                Both Front and Back faces sized uniformly for standard foldable badge holders
            </div>
        </div>

        <div class="toolbar-actions">
            <div class="segmented-control">
                <button type="button" class="seg-btn ${defaultSide === 'both' ? 'active' : ''}" data-target="both" onclick="setMode('both')">
                    Both Sides (Foldable)
                </button>
                <button type="button" class="seg-btn ${defaultSide === 'front' ? 'active' : ''}" data-target="front" onclick="setMode('front')">
                    Front Only
                </button>
                <button type="button" class="seg-btn ${defaultSide === 'back' ? 'active' : ''}" data-target="back" onclick="setMode('back')">
                    Back Only
                </button>
            </div>

            <button type="button" class="btn-print" onclick="window.print()">
                Print ID Card
            </button>
        </div>
    </div>

    <!-- Helpful Printing Tips -->
    <div class="tips-banner">
        <div><strong>Print Tip:</strong> Set Scale to <strong>100%</strong> (do not "Fit to page") and enable <strong>Background graphics</strong>.</div>
        <div>Print on heavy cardstock (200–250 gsm), cut along the outer boundary, and fold down the center guide.</div>
    </div>

    <!-- Printable workspace -->
    <div class="workspace">
        <div class="card-sheet">
            <!-- ================= FRONT SIDE ================= -->
            <div class="card card-front">
                <div class="card-header">
                    <div class="header-left">
                        <img src="/images/cims-logo-light.png?v=3" class="logo" alt="Logo">
                        <div class="brand-group">
                            <span class="brand-title">University of Southeastern Philippines</span>
                            <span class="brand-sub">Internship Management System</span>
                        </div>
                    </div>
                    <span class="role-pill">${roleLabel}</span>
                </div>

                <div class="body-front">
                    ${
                        avatarUrl
                            ? `<img src="${avatarUrl}" class="photo" alt="${name}">`
                            : `<div class="photo photo-placeholder">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                               </div>`
                    }

                    <div class="info-front">
                        <div class="name">${name}</div>
                        ${cardData.subtitle ? `<div class="subtitle">${cardData.subtitle}</div>` : ''}
                        ${cardData.detail ? `<div class="detail">${cardData.detail}</div>` : ''}
                        ${cardData.id_number ? `<div class="id-badge-wrap"><span class="id-badge">ID: ${cardData.id_number}</span></div>` : ''}
                        <div class="email">${email}</div>
                    </div>
                </div>

                <div class="card-footer card-footer-center">
                    <span>Official Identification</span>
                </div>
            </div>

            <!-- ================= CENTER FOLD LINE ================= -->
            <div class="fold-guide">
                <div class="fold-line"></div>
                <div class="fold-label">✂ FOLD HERE</div>
            </div>

            <!-- ================= BACK SIDE (CENTERED QR) ================= -->
            <div class="card card-back">
                <div class="card-header">
                    <div class="header-left">
                        <img src="/images/cims-logo-light.png?v=3" class="logo" alt="Logo">
                        <div class="brand-group">
                            <span class="brand-title">University of Southeastern Philippines</span>
                            <span class="brand-sub">Attendance Verification Pass</span>
                        </div>
                    </div>
                </div>

                <div class="body-back">
                    ${
                        cardData.has_qr_code && cardData.qr_code_url
                            ? `<div class="qr-container-back">
                                <span class="qr-instruction-title">Scan for Attendance</span>
                                <div class="qr-box-centered">
                                    <img src="${cardData.qr_code_url}" alt="Attendance QR Code">
                                </div>
                               </div>`
                            : `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex: 1; padding: 12px;">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                                    <path d="m9 12 2 2 4-4"/>
                                </svg>
                                <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #18181b;">Official Credential</div>
                                <div style="font-size: 10px; font-weight: 500; color: #52525b; margin-top: 4px; max-width: 260px;">
                                    Authorized ${roleLabel} credential for USeP Internship Management System.
                                </div>
                                <div style="font-size: 9px; font-family: monospace; color: #71717a; margin-top: 6px;">${email}</div>
                               </div>`
                    }
                </div>

                <div class="card-footer card-footer-center">
                    Non-transferable • Property of USeP • If found, return to OJT Coordinator's office
                </div>
            </div>
        </div>
    </div>

    <script>
        function setMode(mode) {
            document.body.setAttribute('data-mode', mode);
            document.querySelectorAll('.seg-btn').forEach(function(btn) {
                btn.classList.toggle('active', btn.getAttribute('data-target') === mode);
            });
        }
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1000,height=720');

    if (!printWindow) {
        alert('Please allow popups for this site to print the ID card.');

        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = () => {
        printWindow.focus();
        printWindow.print();
    };

    if (printWindow.document.readyState === 'complete') {
        setTimeout(triggerPrint, 350);
    } else {
        printWindow.onload = () => {
            setTimeout(triggerPrint, 350);
        };
    }
}
