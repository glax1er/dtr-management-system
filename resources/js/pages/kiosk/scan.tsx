import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const FLASH_DURATION_MS = 3000;
const REPROCESS_COOLDOWN_MS = FLASH_DURATION_MS;

interface ScannedIntern {
    internName: string;
    idNumber: string;
    programName: string;
    hteName: string;
    label: 'time_in' | 'time_out';
    timestamp: string;
    isDuplicate: boolean;
}

type ScanFlash = { kind: 'success' } | { kind: 'error'; message: string };

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface KioskScanProps {
    kioskId: number;
    kioskName: string;
}

export default function KioskScan({ kioskName }: KioskScanProps) {
    const [flash, setFlash] = useState<ScanFlash | null>(null);
    const [lastIntern, setLastIntern] = useState<ScannedIntern | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const busyRef = useRef(false);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const token = window.location.pathname.split('/').filter(Boolean).pop() ?? '';

    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        let cancelled = false;

        const startPromise = scanner
            .start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
                        return { width: edge, height: edge };
                    },
                    aspectRatio: 1,
                },
                (decodedText) => {
                    if (!cancelled) submitScan(decodedText);
                },
                () => {},
            )
            .catch((err: unknown) => {
                if (!cancelled) {
                    setCameraError(
                        'Could not access the camera. Make sure this page has camera permission and that no other app is using it.',
                    );
                    console.error(err);
                }
            });

        return () => {
            cancelled = true;
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            startPromise.finally(() => {
                scanner.stop().catch(() => {});
            });
        };
    }, []);

    function submitScan(qrCodeValue: string) {
        if (busyRef.current) return;
        busyRef.current = true;

        fetch(`/kiosk/${token}/scan`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ qr_code_value: qrCodeValue }),
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    setFlash({ kind: 'error', message: data.message ?? 'Scan rejected.' });
                    return;
                }

                setLastIntern({
                    internName: data.intern_name,
                    idNumber: data.id_number,
                    programName: data.program_name,
                    hteName: data.hte_name,
                    label: data.label,
                    timestamp: data.timestamp,
                    isDuplicate: data.is_duplicate,
                });
                setFlash({ kind: 'success' });
            })
            .catch(() => {
                setFlash({
                    kind: 'error',
                    message: 'Could not reach the server. Check your connection and try again.',
                });
            })
            .finally(() => {
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
                setTimeout(() => {
                    busyRef.current = false;
                }, REPROCESS_COOLDOWN_MS);
            });
    }

    return (
        <>
            <Head title={kioskName} />
            <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-black p-4">
                <h1 className="text-lg font-medium text-white">{kioskName}</h1>

                <div className="flex w-full max-w-4xl flex-col gap-6 md:flex-row">
                    {/* Camera */}
                    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg bg-black">
                        <div
                            id={SCANNER_ELEMENT_ID}
                            className={
                                cameraError
                                    ? 'hidden'
                                    : 'h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:scale-x-[-1] [&>video]:object-cover'
                            }
                        />

                        {cameraError && (
                            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-white/80">
                                {cameraError}
                            </div>
                        )}

                        {flash?.kind === 'error' && (
                            <div className="absolute inset-x-0 top-0 bg-destructive/90 p-4 text-sm text-white shadow-md backdrop-blur-sm">
                                <div className="text-lg font-medium">{flash.message}</div>
                            </div>
                        )}
                    </div>

                    {/* ID card — persists until the next scan, doesn't
                        auto-clear like the old flash overlay did */}
                    <div className="mx-auto w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 text-white backdrop-blur-sm">
                        {!lastIntern ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-white/40">
                                <UserIcon className="size-16" />
                                <p className="text-sm">Scan a QR code to see intern details</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {/* Photo placeholder — no photo upload feature exists yet */}
                                <div className="mx-auto flex size-28 items-center justify-center rounded-full bg-white/10">
                                    <UserIcon className="size-14 text-white/40" />
                                </div>

                                <div className="text-center">
                                    <p className="text-xl font-semibold">{lastIntern.internName}</p>
                                    <p className="text-white/60">{lastIntern.idNumber}</p>
                                </div>

                                <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Program</span>
                                        <span>{lastIntern.programName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">HTE</span>
                                        <span>{lastIntern.hteName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Status</span>
                                        <span
                                            className={
                                                lastIntern.label === 'time_in' ? 'text-emerald-400' : 'text-amber-400'
                                            }
                                        >
                                            {lastIntern.label === 'time_in' ? 'Timed In' : 'Timed Out'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Time</span>
                                        <span>{formatTime(lastIntern.timestamp)}</span>
                                    </div>
                                    {lastIntern.isDuplicate && (
                                        <p className="pt-2 text-center text-xs text-amber-400">
                                            Already recorded within the last few minutes.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}