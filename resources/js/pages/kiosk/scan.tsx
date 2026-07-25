import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const FLASH_DURATION_MS = 5000;
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

// ADDED — reads the intern's name and time-in/out status aloud
function speakAnnouncement(intern: ScannedIntern) {
    if (!('speechSynthesis' in window)) return;
    if (intern.isDuplicate) return;

    const statusText = intern.label === 'time_in' ? 'Timed In' : 'Timed Out';
    const utterance = new SpeechSynthesisUtterance(`${intern.internName}, ${statusText}`);
    utterance.rate = 1;
    utterance.lang = 'en-US';

    // stop any announcement still playing from a previous scan
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
    const inFlightRef = useRef(false);
    const lastProcessedRef = useRef<{ value: string; at: number } | null>(null);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

    const token =
        typeof window !== 'undefined'
            ? (window.location.pathname.split('/').filter(Boolean).pop() ?? '')
            : '';

    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        let cancelled = false;

        // Preload audio files to avoid startup delays
        const soundPaths = ['/sounds/scan-duplicate.mp3', '/sounds/time-in.mp3', '/sounds/time-out.mp3', '/sounds/scan-error.mp3'];
        soundPaths.forEach((path) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audioRef.current[path] = audio;
        });

        // Warm up each audio file
        Object.values(audioRef.current).forEach((audio) => {
            audio.muted = true;
            audio
                .play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = false;
                })
                .catch(() => {
                    audio.muted = false;
                });
        });

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

    // ADDED — plays a short sound effect alongside the voice announcement
    function playSound(src: string) {
        const audio = audioRef.current[src];
        if (!audio) {
            console.warn(`Audio not found: ${src}`);
            return;
        }
        audio.currentTime = 0;
        audio.play().catch((err) => {
            // Log to console for debugging — autoplay can be blocked until
            // the page has real user interaction, though camera permission
            // usually satisfies this requirement.
            console.warn(`Could not play sound ${src}:`, err);
        });
    }

    function submitScan(qrCodeValue: string) {
        const now = Date.now();

        // Block only while a request is actually in flight — prevents
        // firing multiple requests from the same physical scan burst.
        if (inFlightRef.current) return;

        // Block only if THIS SAME QR was processed within the cooldown —
        // a different intern's QR is never blocked by this check.
        if (
            lastProcessedRef.current &&
            lastProcessedRef.current.value === qrCodeValue &&
            now - lastProcessedRef.current.at < REPROCESS_COOLDOWN_MS
        ) {
            return;
        }

        inFlightRef.current = true;
        lastProcessedRef.current = { value: qrCodeValue, at: now };

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
                    playSound('/sounds/scan-error.mp3'); // ADDED
                    return;
                }

                // ADDED — build the object once so it can be reused for both
                // display and the spoken announcement
                const internData: ScannedIntern = {
                    internName: data.intern_name,
                    idNumber: data.id_number,
                    programName: data.program_name,
                    hteName: data.hte_name,
                    label: data.label,
                    timestamp: data.timestamp,
                    isDuplicate: data.is_duplicate,
                };

                setLastIntern(internData);
                setFlash({ kind: 'success' });

                if (internData.isDuplicate) {
                    // ADDED — play a different sound for duplicate scans
                    playSound('/sounds/scan-duplicate.mp3');
                } else {
                    // CHANGED — separate sound per direction instead of one generic beep
                    playSound(
                        internData.label === 'time_in'
                            ? '/sounds/time-in.mp3'
                            : '/sounds/time-out.mp3',
                    );
                }
                speakAnnouncement(internData);
            })
            .catch(() => {
                setFlash({
                    kind: 'error',
                    message: 'Could not reach the server. Check your connection and try again.',
                });
            })
            .finally(() => {
                inFlightRef.current = false;
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => {
                    setFlash(null);
                    setLastIntern(null);
                }, FLASH_DURATION_MS);
            });
    }

    return (
        <>
            <Head title={kioskName} />
            <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-black p-4">
                <h1 className="text-lg font-medium text-white">{kioskName}</h1>

                <div className="flex w-full max-w-4xl flex-col gap-6 md:flex-row">
                    {/* Camera */}
                    <div
                        className={`relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border-2 bg-black transition-colors duration-300 ${
                            flash?.kind === 'error' ? 'border-destructive' : 'border-transparent'
                        }`}
                    >
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
                    <div
                        className={`mx-auto w-full max-w-sm rounded-lg border-4 p-6 text-white backdrop-blur-sm transition-colors duration-300 ${
                            !lastIntern
                                ? 'border-white/10 bg-white/5'
                                : lastIntern.isDuplicate
                                  ? 'border-red-500 bg-red-500/5'
                                  : lastIntern.label === 'time_in'
                                    ? 'border-emerald-400 bg-emerald-400/5'
                                    : 'border-amber-400 bg-amber-400/5'
                        }`}
                    >
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
                                    <p className="text-2xl font-semibold">{lastIntern.internName}</p>
                                    <p className="text-base text-white/60">{lastIntern.idNumber}</p>
                                </div>

                                <div className="space-y-2 border-t border-white/10 pt-4 text-base">
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
                                                lastIntern.isDuplicate
                                                    ? 'font-medium text-red-500'
                                                    : lastIntern.label === 'time_in'
                                                      ? 'font-medium text-emerald-400'
                                                      : 'font-medium text-amber-400'
                                            }
                                        >
                                            {lastIntern.isDuplicate
                                                ? 'Duplicate'
                                                : lastIntern.label === 'time_in'
                                                  ? 'Timed In'
                                                  : 'Timed Out'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/50">Time</span>
                                        <span>{formatTime(lastIntern.timestamp)}</span>
                                    </div>
                                    {lastIntern.isDuplicate && (
                                        <p className="pt-2 text-center text-sm text-red-500">
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