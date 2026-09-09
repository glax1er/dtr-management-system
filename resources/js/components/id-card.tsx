import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IdCardOrientation = 'landscape' | 'portrait';
export type IdCardSide = 'front' | 'back';

export interface IdCardData {
    id_number: string | null;
    subtitle: string | null;
    detail: string | null;
    has_qr_code: boolean;
    qr_code_url: string | null;
}

export interface IdCardProps {
    name: string;
    email: string;
    avatarUrl: string | null;
    role: 'admin' | 'supervisor' | 'intern' | string;
    data?: IdCardData | null;
    orientation: IdCardOrientation;
    side?: IdCardSide;
    id?: string;
    className?: string;
}

const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrator',
    supervisor: 'Supervisor',
    intern: 'Intern',
};

/** Printable badge-style ID card. Sized to standard CR80 card
 * (3.375in x 2.125in). Front and Back have identical outer dimensions,
 * borders, headers, and footers for a uniform, professional finish. */
export function IdCard({
    name,
    email,
    avatarUrl,
    role,
    data,
    orientation,
    side = 'front',
    id,
    className,
}: IdCardProps) {
    const isLandscape = orientation === 'landscape';
    const isBack = side === 'back';
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

    return (
        <div
            id={
                id ??
                (isBack ? 'printable-id-card-back' : 'printable-id-card-front')
            }
            className={cn(
                'flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white bg-cover bg-center p-4 text-zinc-900 shadow-sm select-none',
                isLandscape
                    ? 'aspect-[3.375/2.125] w-full max-w-[390px] 2xl:max-w-[420px]'
                    : 'aspect-[2.125/3.375] w-[270px]',
                className,
            )}
            style={{
                backgroundImage:
                    "linear-gradient(rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.86)), url('/images/cic-bg.jpg')",
            }}
        >
            {isBack ? (
                /* ========================================================
                   BACK SIDE: Centered QR Code & Verification Pass
                   ======================================================== */
                <>
                    {/* Back Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <img
                                src="/images/cims-logo-light.png?v=3"
                                alt="Logo"
                                className="h-10 w-auto shrink-0 object-contain"
                            />
                            <div className="flex min-w-0 flex-col">
                                <span
                                    className={cn(
                                        'leading-tight font-black tracking-wide text-primary uppercase',
                                        isLandscape
                                            ? 'text-[10px]'
                                            : 'text-[8.5px]',
                                    )}
                                >
                                    University of Southeastern Philippines
                                </span>
                                <span className="text-[7.5px] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                                    Attendance Verification Pass
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Back Body: Enlarged QR Code & Attendance Instruction */}
                    {cardData.has_qr_code && cardData.qr_code_url ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-1 text-center">
                            <p className="text-[10px] font-black tracking-wider text-zinc-800 uppercase">
                                Scan for Attendance
                            </p>
                            <div
                                className={cn(
                                    'flex items-center justify-center border border-zinc-300/90 bg-white shadow-xs',
                                    isLandscape
                                        ? 'size-[124px] rounded-xl p-1.5 2xl:size-[134px]'
                                        : 'size-[195px] rounded-2xl p-2.5',
                                )}
                            >
                                <img
                                    src={cardData.qr_code_url}
                                    alt="Attendance QR code"
                                    className="size-full object-contain"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Back without QR code (Admin / Supervisor) */
                        <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
                            <ShieldCheck className="mb-1 size-12 text-zinc-400" />
                            <p className="text-xs font-black tracking-wider text-zinc-800 uppercase">
                                Official Credential
                            </p>
                            <p className="mt-1 max-w-[280px] text-[10px] font-medium text-zinc-600">
                                Authorized {roleLabel} credential for
                                USeP Internship Management System.
                            </p>
                            <p className="mt-2 font-mono text-[9px] text-zinc-500">
                                {email}
                            </p>
                        </div>
                    )}

                    {/* Back Footer */}
                    <div className="border-t border-zinc-200/80 pt-1.5 text-center text-[7.5px] font-medium tracking-wide text-zinc-500">
                        Non-transferable • Property of USeP • If found,
                        return to OJT Coordinator's office
                    </div>
                </>
            ) : (
                /* ========================================================
                   FRONT SIDE: Visual Identity, Photo, Role & Details
                   ======================================================== */
                <>
                    {/* Front Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <img
                                src="/images/cims-logo-light.png?v=3"
                                alt="Logo"
                                className="h-10 w-auto shrink-0 object-contain"
                            />
                            <div className="flex min-w-0 flex-col">
                                <span
                                    className={cn(
                                        'leading-tight font-black tracking-wide text-primary uppercase',
                                        isLandscape
                                            ? 'text-[10px]'
                                            : 'text-[8.5px]',
                                    )}
                                >
                                    University of Southeastern Philippines
                                </span>
                                <span className="text-[7.5px] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">
                                    Internship Management System
                                </span>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase shadow-xs">
                            {roleLabel}
                        </span>
                    </div>

                    {/* Front Body */}
                    {isLandscape ? (
                        /* Landscape Front: Photo on left, spacious details on right */
                        <div className="flex flex-1 items-center gap-3.5 py-2 2xl:gap-4">
                            <div className="flex size-[112px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/95 bg-zinc-100 shadow-sm ring-1 ring-zinc-200/70 2xl:size-[120px]">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="size-14 text-zinc-400" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="truncate text-base font-black tracking-tight text-zinc-950 uppercase">
                                    {name}
                                </p>
                                {cardData.subtitle && (
                                    <p className="truncate text-xs font-bold text-primary">
                                        {cardData.subtitle}
                                    </p>
                                )}
                                {cardData.detail && (
                                    <p className="line-clamp-2 text-[10.5px] leading-snug font-medium break-words text-zinc-600">
                                        {cardData.detail}
                                    </p>
                                )}
                                {cardData.id_number && (
                                    <div className="pt-0.5">
                                        <span className="inline-block rounded border border-zinc-200 bg-white/95 px-2 py-0.5 font-mono text-[9.5px] font-bold tracking-wider text-zinc-900 shadow-2xs">
                                            ID: {cardData.id_number}
                                        </span>
                                    </div>
                                )}
                                <p className="truncate text-[9.5px] font-medium text-zinc-500">
                                    {email}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Portrait Front: Centered vertical stack with enlarged photo */
                        <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
                            <div className="flex size-[128px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/95 bg-zinc-100 shadow-sm ring-1 ring-zinc-200/70">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="size-16 text-zinc-400" />
                                )}
                            </div>

                            <div className="mt-3 w-full min-w-0 space-y-0.5">
                                <p className="truncate px-2 text-base font-black tracking-tight text-zinc-950 uppercase">
                                    {name}
                                </p>
                                {cardData.subtitle && (
                                    <p className="truncate px-2 text-xs font-bold text-primary">
                                        {cardData.subtitle}
                                    </p>
                                )}
                                {cardData.detail && (
                                    <p className="line-clamp-2 px-2 text-[10px] leading-snug font-medium break-words text-zinc-600">
                                        {cardData.detail}
                                    </p>
                                )}
                                {cardData.id_number && (
                                    <div className="py-1">
                                        <span className="inline-block rounded border border-zinc-200 bg-white/95 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-zinc-900 shadow-2xs">
                                            ID: {cardData.id_number}
                                        </span>
                                    </div>
                                )}
                                <p className="truncate px-2 text-[9px] font-medium text-zinc-500">
                                    {email}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Front Footer */}
                    <div className="border-t border-zinc-200/80 pt-1.5 text-center text-[7.5px] font-semibold tracking-wider text-zinc-500 uppercase">
                        <span>Official Identification</span>
                    </div>
                </>
            )}
        </div>
    );
}
