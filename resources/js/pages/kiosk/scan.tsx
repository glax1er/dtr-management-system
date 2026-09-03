import { Head } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { User as UserIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const FLASH_DURATION_MS = 5000;
const REPROCESS_COOLDOWN_MS = FLASH_DURATION_MS;

interface ScannedIntern {
    internName: string;
    idNumber: string;
    programName: string;
    hteName: string;
    photoUrl: string | null;
    label: 'time_in' | 'time_out';
    timestamp: string;
    isDuplicate: boolean;
}

type ScanFlash = { kind: 'success' } | { kind: 'error'; message: string };

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function speakAnnouncement(intern: ScannedIntern) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }

    if (intern.isDuplicate) {
return;
}

    const statusText = intern.label === 'time_in' ? 'Timed In' : 'Timed Out';
    const utterance = new SpeechSynthesisUtterance(
        `${intern.internName}, ${statusText}`,
    );
    utterance.rate = 1;
    utterance.lang = 'en-US';

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
    // ADDED â€” monotonically increasing ID; only the response matching the
    // most recent request is ever allowed to update the screen
    const requestSeqRef = useRef(0);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});

    const token =
        typeof window !== 'undefined'
            ? (window.location.pathname.split('/').filter(Boolean).pop() ?? '')
            : '';

    const playSound = useCallback((src: string) => {
        const audio = audioRef.current[src];

        if (!audio) {
            console.warn(`Audio not found: ${src}`);

            return;
        }

        audio.currentTime = 0;
        audio.play().catch((err) => {
            console.warn(`Could not play sound ${src}:`, err);
        });
    }, []);

    const submitScan = useCallback(
        (qrCodeValue: string) => {
            const now = Date.now();

            if (inFlightRef.current) {
return;
}

            if (
                lastProcessedRef.current &&
                lastProcessedRef.current.value === qrCodeValue &&
                now - lastProcessedRef.current.at < REPROCESS_COOLDOWN_MS
            ) {
                return;
            }

            inFlightRef.current = true;
            lastProcessedRef.current = { value: qrCodeValue, at: now };

            // this request's own sequence number, captured at send time
            const mySeq = ++requestSeqRef.current;

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

                    // a newer scan has already started since this one was
                    // sent; this response is stale, ignore it entirely
                    if (mySeq !== requestSeqRef.current) {
return;
}

                    if (!response.ok) {
                        setFlash({
                            kind: 'error',
                            message: data.message ?? 'Scan rejected.',
                        });
                        playSound('/sounds/scan-error.mp3');

                        return;
                    }

                    const internData: ScannedIntern = {
                        internName: data.intern_name,
                        idNumber: data.id_number,
                        programName: data.program_name,
                        hteName: data.hte_name,
                        photoUrl: data.photo_url,
                        label: data.label,
                        timestamp: data.timestamp,
                        isDuplicate: data.is_duplicate,
                    };

                    setLastIntern(internData);
                    setFlash({ kind: 'success' });

                    if (internData.isDuplicate) {
                        playSound('/sounds/scan-duplicate.mp3');
                    } else {
                        playSound(
                            internData.label === 'time_in'
                                ? '/sounds/time-in.mp3'
                                : '/sounds/time-out.mp3',
                        );
                    }

                    speakAnnouncement(internData);
                })
                .catch(() => {
                    // same staleness check for the error path
                    if (mySeq !== requestSeqRef.current) {
return;
}

                    setFlash({
                        kind: 'error',
                        message:
                            'Could not reach the server. Check your connection and try again.',
                    });
                })
                .finally(() => {
                    inFlightRef.current = false;

                    // only this (still-latest) request gets to manage the
                    // auto-clear timer; a stale one shouldn't reset it
                    if (mySeq !== requestSeqRef.current) {
return;
}

                    if (flashTimerRef.current) {
clearTimeout(flashTimerRef.current);
}

                    flashTimerRef.current = setTimeout(() => {
                        setFlash(null);
                        setLastIntern(null);
                    }, FLASH_DURATION_MS);
                });
        },
        [token, playSound],
    );

    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        let cancelled = false;

        const soundPaths = [
            '/sounds/scan-duplicate.mp3',
            '/sounds/time-in.mp3',
            '/sounds/time-out.mp3',
            '/sounds/scan-error.mp3',
        ];
        soundPaths.forEach((path) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audioRef.current[path] = audio;
        });

        Object.values(audioRef.current).forEach((audio) => {
            audio.load();
        });

        const startPromise = scanner
            .start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const edge = Math.floor(
                            Math.min(viewfinderWidth, viewfinderHeight) * 0.7,
                        );

                        return { width: edge, height: edge };
                    },
                    aspectRatio: 1,
                },
                (decodedText) => {
                    if (!cancelled) {
submitScan(decodedText);
}
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

            if (flashTimerRef.current) {
clearTimeout(flashTimerRef.current);
}

            startPromise.finally(() => {
                scanner.stop().catch(() => {});
            });
        };
    }, [submitScan]);

    return (
        <>
            <Head title={kioskName} />
            <div
                className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto bg-black p-4"
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), url('/images/cic-bg.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundAttachment: 'fixed',
                }}
            >
                {/* Content wrapper */}
                <div className="relative my-auto flex w-full flex-col items-center">
                    {/* Logo Section */}
                    <div className="flex items-end justify-center">
                        <img
                            src="/images/usep-logo.png"
                            alt="USEP logo"
                            className="mb-2 h-12 w-auto object-contain"
                        />
                        <img
                            src="/images/cims-logo-light.png"
                            alt="CIC logo"
                            className="h-27 w-auto object-contain dark:hidden"
                        />
                        <img
                            src="/images/cims-logo-dark.png"
                            className="hidden h-27 w-auto object-contain dark:block"
                            alt="CIC logo dark"
                        />
                        <img
                            src="/images/cic-logo.png"
                            alt="App logo"
                            className="mb-2 h-12 w-auto rounded-full object-contain"
                        />
                    </div>

                    <h1 className="text-lg font-medium text-white">
                        {kioskName}
                    </h1>

                    <div className="flex w-full max-w-4xl flex-col gap-6 md:flex-row">
                        {/* Camera */}
                        <div
                            className={`relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-lg border-2 bg-black transition-colors duration-300 ${
                                flash?.kind === 'error'
                                    ? 'border-destructive'
                                    : 'border-transparent'
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
                                    <div className="text-lg font-medium">
                                        {flash.message}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ID card â€” persists until the next scan */}
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
                                    <p className="text-sm">
                                        Scan a QR code to see intern details
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {/* Photo â€” falls back to the generic icon if the
                                    intern hasn't uploaded one */}
                                    <div className="mx-auto flex size-28 items-center justify-center overflow-hidden rounded-full bg-white/10">
                                        {lastIntern.photoUrl ? (
                                            <img
                                                src={lastIntern.photoUrl}
                                                alt={lastIntern.internName}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="size-14 text-white/40" />
                                        )}
                                    </div>

                                    <div className="text-center">
                                        <p className="text-2xl font-semibold">
                                            {lastIntern.internName}
                                        </p>
                                        <p className="text-base text-white/60">
                                            {lastIntern.idNumber}
                                        </p>
                                    </div>

                                    <div className="space-y-2 border-t border-white/10 pt-4 text-base">
                                        <div className="flex justify-between gap-4">
                                            <span className="shrink-0 text-white/50">
                                                Program
                                            </span>
                                            <span className="min-w-0 text-right break-words">
                                                {lastIntern.programName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="shrink-0 text-white/50">
                                                HTE
                                            </span>
                                            <span className="min-w-0 text-right break-words">
                                                {lastIntern.hteName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="shrink-0 text-white/50">
                                                Status
                                            </span>
                                            <span
                                                className={
                                                    'min-w-0 text-right break-words ' +
                                                    (lastIntern.isDuplicate
                                                        ? 'font-medium text-red-500'
                                                        : lastIntern.label ===
                                                            'time_in'
                                                          ? 'font-medium text-emerald-400'
                                                          : 'font-medium text-amber-400')
                                                }
                                            >
                                                {lastIntern.isDuplicate
                                                    ? 'Duplicate'
                                                    : lastIntern.label ===
                                                        'time_in'
                                                      ? 'Timed In'
                                                      : 'Timed Out'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="shrink-0 text-white/50">
                                                Time
                                            </span>
                                            <span className="min-w-0 text-right break-words">
                                                {formatTime(
                                                    lastIntern.timestamp,
                                                )}
                                            </span>
                                        </div>
                                        {lastIntern.isDuplicate && (
                                            <p className="pt-2 text-center text-sm text-red-500">
                                                Already recorded within the last
                                                few minutes.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
