import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const FLASH_DURATION_MS = 3000;
const REPROCESS_COOLDOWN_MS = FLASH_DURATION_MS;

type ScanFlash =
    | {
          kind: 'success';
          internName: string;
          idNumber: string;
          label: 'time_in' | 'time_out';
          timestamp: string;
          isDuplicate: boolean;
      }
    | { kind: 'error'; message: string };

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface KioskScanProps {
    kioskId: number;
    kioskName: string;
}

export default function KioskScan({ kioskName }: KioskScanProps) {
    const [flash, setFlash] = useState<ScanFlash | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const busyRef = useRef(false);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // The token is the last path segment of the current URL — no props
    // needed for it, since the browser URL already has it.
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
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ qr_code_value: qrCodeValue }),
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    setFlash({ kind: 'error', message: data.message ?? 'Scan rejected.' });
                    return;
                }

                setFlash({
                    kind: 'success',
                    internName: data.intern_name,
                    idNumber: data.id_number,
                    label: data.label,
                    timestamp: data.timestamp,
                    isDuplicate: data.is_duplicate,
                });
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
            <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-black p-4">
                <h1 className="text-lg font-medium text-white">{kioskName}</h1>

                <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-lg bg-black">
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

                    {flash && (
                        <div
                            className={
                                'absolute inset-x-0 top-0 p-4 text-sm shadow-md backdrop-blur-sm ' +
                                (flash.kind === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-destructive/90 text-white')
                            }
                        >
                            {flash.kind === 'success' ? (
                                <>
                                    <div className="text-lg font-semibold">{flash.internName}</div>
                                    <div className="text-white/90">{flash.idNumber}</div>
                                    <div className="text-white/90">
                                        {flash.label === 'time_in' ? 'Timed In' : 'Timed Out'} · {formatTime(flash.timestamp)}
                                        {flash.isDuplicate && ' (already recorded)'}
                                    </div>
                                </>
                            ) : (
                                <div className="text-lg font-medium">{flash.message}</div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-sm text-white/60">Present your QR code to the camera above.</p>
            </div>
        </>
    );
}