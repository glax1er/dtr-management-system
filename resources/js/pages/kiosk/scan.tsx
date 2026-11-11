import { Head } from '@inertiajs/react';
import * as faceapi from 'face-api.js';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
    AlertTriangle,
    Camera,
    Loader2,
    ScanFace,
    User as UserIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';
const FLASH_DURATION_MS = 5000;
const REPROCESS_COOLDOWN_MS = FLASH_DURATION_MS;

/** How often (ms) to run the face-detection poll while the scanner is active */
const FACE_DETECT_INTERVAL_MS = 400;
const FACE_FRAME_UPDATE_THRESHOLD = 1;

/** Path where model weights are served from */
const MODELS_URL = '/models';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScannedIntern {
    internName: string;
    idNumber: string;
    programName: string;
    hteName: string;
    photoUrl: string | null;
    capturedPhotoUrl: string | null;
    label: 'time_in' | 'time_out';
    timestamp: string;
    isDuplicate: boolean;
}

type ScanFlash = { kind: 'success' } | { kind: 'error'; message: string };

type FaceStatus = 'loading' | 'detected' | 'missing' | 'error';

interface FaceFrame {
    left: number;
    top: number;
    width: number;
    height: number;
}

interface KioskScanProps {
    kioskId: number;
    kioskName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    if (intern.isDuplicate) return;

    const statusText = intern.label === 'time_in' ? 'Timed In' : 'Timed Out';
    const utterance = new SpeechSynthesisUtterance(
        `${intern.internName}, ${statusText}`,
    );
    utterance.rate = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

/**
 * Captures a JPEG snapshot from the QR scanner video element (front-facing).
 * Stored un-mirrored so it matches the registered physical orientation.
 */
function captureSnapshot(): string | null {
    try {
        const video = document.querySelector<HTMLVideoElement>(
            `#${SCANNER_ELEMENT_ID} video`,
        );
        if (!video || video.readyState < 2 || !video.videoWidth) return null;

        const maxDim = 640;
        let w = video.videoWidth;
        let h = video.videoHeight;

        if (w > maxDim || h > maxDim) {
            if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
            } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.75);
    } catch (err) {
        console.warn('Could not capture snapshot:', err);
        return null;
    }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/**
 * 5-second animated countdown progress bar for confirmation auto-dismiss.
 */
function CountdownProgressBar({
    durationMs,
    label,
    isDuplicate,
}: {
    durationMs: number;
    label: 'time_in' | 'time_out';
    isDuplicate: boolean;
}) {
    return (
        <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>Resetting for next intern...</span>
                <span className="font-mono font-medium text-white/70">5s</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5 ring-inset">
                <div
                    className={`h-full rounded-full ${
                        isDuplicate
                            ? 'bg-rose-400'
                            : label === 'time_in'
                              ? 'bg-emerald-400'
                              : 'bg-sky-400'
                    }`}
                    style={{
                        animation: `kioskCountdown ${durationMs}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
}

/**
 * Idle state for the right panel when awaiting intern scans.
 */
function IdleStandbyCard() {
    return (
        <div className="flex h-full min-h-[360px] flex-col justify-between gap-5 py-2">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white/40">
                        <Camera className="size-8" />
                    </div>
                    <p className="text-center text-[11px] text-white/55">
                        Scan photo
                    </p>
                </div>
                <div className="space-y-1.5">
                    <div className="mx-auto flex aspect-square w-full max-w-40 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white/40">
                        <UserIcon className="size-8" />
                    </div>
                    <p className="text-center text-[11px] text-white/55">
                        Profile photo
                    </p>
                </div>
            </div>

            <div className="space-y-2 border-t border-white/15 pt-4">
                <h2 className="text-center text-lg font-semibold text-white">
                    Ready for scan
                </h2>
                <p className="text-center text-sm leading-relaxed text-white/65">
                    Face the camera and hold your QR badge anywhere in the
                    frame. Attendance records automatically when both are
                    detected.
                </p>
            </div>
        </div>
    );
}

function PendingScanCard({ photo }: { photo: string | null }) {
    return (
        <div className="flex h-full min-h-[360px] flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <span className="text-sm font-medium text-white">
                    Recording attendance
                </span>
                <Loader2 className="size-4 animate-spin text-white/70" />
            </div>

            <div className="space-y-2">
                <span className="text-xs text-white/55">Scan snapshot</span>
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-black/40">
                    {photo ? (
                        <img
                            src={photo}
                            alt="Live camera snapshot for attendance check"
                            className="size-full object-cover"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-white/40">
                            <Camera className="size-8" />
                        </div>
                    )}
                </div>
            </div>

            <p className="text-sm text-white/65">Please wait a moment.</p>
        </div>
    );
}

/**
 * Scanned state showing live snapshot vs registered ID photo side-by-side with full intern details.
 */
function ScannedInternCard({ intern }: { intern: ScannedIntern }) {
    const isDuplicate = intern.isDuplicate;
    const isTimeIn = intern.label === 'time_in';

    const cardBadge = isDuplicate
        ? {
              text: 'Duplicate',
              class: 'text-rose-300',
          }
        : isTimeIn
          ? {
                text: 'Timed in',
                class: 'text-emerald-300',
            }
          : {
                text: 'Timed out',
                class: 'text-sky-300',
            };

    return (
        <div className="flex h-full min-h-[360px] flex-col justify-between gap-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                    <span
                        className={`text-sm font-semibold ${cardBadge.class}`}
                    >
                        {cardBadge.text}
                    </span>
                    <span className="text-xs text-white/70">
                        {formatTime(intern.timestamp)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <div className="mx-auto aspect-square w-full max-w-40 overflow-hidden rounded-md border border-white/20 bg-black/40">
                            {intern.capturedPhotoUrl ? (
                                <img
                                    src={intern.capturedPhotoUrl}
                                    alt={`Scan snapshot of ${intern.internName}`}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center text-white/40">
                                    <Camera className="size-7" />
                                </div>
                            )}
                        </div>
                        <p className="text-center text-[11px] text-white/65">
                            Scan photo
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="mx-auto aspect-square w-full max-w-40 overflow-hidden rounded-md border border-white/20 bg-white/5">
                            {intern.photoUrl ? (
                                <img
                                    src={intern.photoUrl}
                                    alt={`Profile photo of ${intern.internName}`}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full items-center justify-center text-white/40">
                                    <UserIcon className="size-8" />
                                </div>
                            )}
                        </div>
                        <p className="text-center text-[11px] text-white/65">
                            Profile photo
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-lg leading-snug font-semibold text-white">
                        {intern.internName}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-white/60">
                        {intern.idNumber}
                    </p>
                </div>

                <div className="space-y-2 border-t border-white/15 pt-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                        <span className="shrink-0 text-white/55">Program</span>
                        <span className="text-right text-white/90">
                            {intern.programName}
                        </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                        <span className="shrink-0 text-white/55">HTE</span>
                        <span className="text-right text-white/90">
                            {intern.hteName}
                        </span>
                    </div>
                </div>

                {isDuplicate && (
                    <div className="border-t border-rose-400/30 pt-3 text-center text-xs text-rose-200">
                        <p className="font-medium">Already recorded</p>
                        <p className="mt-1 text-rose-200/75">
                            Attendance was recorded within the last five
                            minutes.
                        </p>
                    </div>
                )}
            </div>

            <CountdownProgressBar
                durationMs={FLASH_DURATION_MS}
                label={intern.label}
                isDuplicate={isDuplicate}
            />
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function KioskScan({ kioskName }: KioskScanProps) {
    const [flash, setFlash] = useState<ScanFlash | null>(null);
    const [lastIntern, setLastIntern] = useState<ScannedIntern | null>(null);
    const [pendingScan, setPendingScan] = useState(false);
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [faceStatus, setFaceStatus] = useState<FaceStatus>('loading');
    const [faceFrame, setFaceFrame] = useState<FaceFrame | null>(null);

    const inFlightRef = useRef(false);
    const lastProcessedRef = useRef<{ value: string; at: number } | null>(null);
    const requestSeqRef = useRef(0);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const faceDetectTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const modelsLoadedRef = useRef(false);
    const faceFrameRef = useRef<FaceFrame | null>(null);

    // Keep face status available to the QR callback without waiting for a render.
    const faceStatusRef = useRef<FaceStatus>('loading');

    const token =
        typeof window !== 'undefined'
            ? (window.location.pathname.split('/').filter(Boolean).pop() ?? '')
            : '';

    // ── Sound helpers ─────────────────────────────────────────────────────────
    const playSound = useCallback((src: string) => {
        const audio = audioRef.current[src];
        if (!audio) return;
        audio.currentTime = 0;
        audio
            .play()
            .catch((err) => console.warn(`Could not play ${src}:`, err));
    }, []);

    // ── Submit scan ───────────────────────────────────────────────────────────
    const submitScan = useCallback(
        (qrCodeValue: string, photo: string | null = null) => {
            const now = Date.now();

            if (inFlightRef.current) return;

            if (
                lastProcessedRef.current &&
                lastProcessedRef.current.value === qrCodeValue &&
                now - lastProcessedRef.current.at < REPROCESS_COOLDOWN_MS
            ) {
                return;
            }

            if (faceStatusRef.current !== 'detected') {
                return;
            }

            inFlightRef.current = true;
            lastProcessedRef.current = { value: qrCodeValue, at: now };
            setPendingPhoto(photo);
            setPendingScan(true);
            setLastIntern(null);
            setFlash(null);

            const mySeq = ++requestSeqRef.current;

            fetch(`/kiosk/${token}/scan`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ qr_code_value: qrCodeValue, photo }),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (mySeq !== requestSeqRef.current) return;

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
                        capturedPhotoUrl: data.captured_photo_url,
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
                    if (mySeq !== requestSeqRef.current) return;
                    setFlash({
                        kind: 'error',
                        message:
                            'Could not reach the server. Check your connection and try again.',
                    });
                })
                .finally(() => {
                    inFlightRef.current = false;
                    setPendingScan(false);
                    if (mySeq !== requestSeqRef.current) return;

                    if (flashTimerRef.current)
                        clearTimeout(flashTimerRef.current);
                    flashTimerRef.current = setTimeout(() => {
                        setFlash(null);
                        setLastIntern(null);
                    }, FLASH_DURATION_MS);
                });
        },
        [token, playSound],
    );

    // ── Load face-api.js models once, then start QR scanner + face polling ───
    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
        });
        let cancelled = false;
        let isDetecting = false;
        const updateFaceStatus = (status: FaceStatus) => {
            if (faceStatusRef.current === status) {
                return;
            }

            faceStatusRef.current = status;
            setFaceStatus(status);
        };

        const updateFaceFrame = (frame: FaceFrame | null) => {
            const previous = faceFrameRef.current;

            if (
                frame &&
                previous &&
                Math.abs(frame.left - previous.left) <
                    FACE_FRAME_UPDATE_THRESHOLD &&
                Math.abs(frame.top - previous.top) <
                    FACE_FRAME_UPDATE_THRESHOLD &&
                Math.abs(frame.width - previous.width) <
                    FACE_FRAME_UPDATE_THRESHOLD &&
                Math.abs(frame.height - previous.height) <
                    FACE_FRAME_UPDATE_THRESHOLD
            ) {
                return;
            }

            faceFrameRef.current = frame;
            setFaceFrame(frame);
        };

        // Pre-load sounds
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
        Object.values(audioRef.current).forEach((a) => a.load());

        // Load the tiny face detector model weights from public/models/
        faceapi.nets.tinyFaceDetector
            .loadFromUri(MODELS_URL)
            .then(() => {
                if (cancelled) {
                    return;
                }

                modelsLoadedRef.current = true;
            })
            .catch((err) => {
                console.error('face-api model load failed:', err);

                if (!cancelled) {
                    updateFaceStatus('error');
                }
            });

        // Omitting qrbox makes the decoder scan the full camera frame.
        const startPromise = scanner
            .start(
                { facingMode: 'user' },
                {
                    fps: 12,
                    aspectRatio: 16 / 9,
                },
                (decodedText) => {
                    if (!cancelled && faceStatusRef.current === 'detected') {
                        submitScan(decodedText, captureSnapshot());
                    }
                },
                () => {
                    /* QR decode failure — intentionally ignored */
                },
            )
            .then(() => {
                if (cancelled) return;

                // Start periodic face detection once the camera stream is live
                faceDetectTimerRef.current = setInterval(async () => {
                    if (cancelled || !modelsLoadedRef.current || isDetecting)
                        return;

                    const video = document.querySelector<HTMLVideoElement>(
                        `#${SCANNER_ELEMENT_ID} video`,
                    );
                    if (!video || video.readyState < 2 || !video.videoWidth)
                        return;

                    isDetecting = true;
                    try {
                        const result = await faceapi.detectSingleFace(
                            video,
                            new faceapi.TinyFaceDetectorOptions({
                                inputSize: 320,
                                scoreThreshold: 0.5,
                            }),
                        );

                        if (!cancelled) {
                            if (result) {
                                const videoRect = video.getBoundingClientRect();
                                const scale = Math.max(
                                    videoRect.width / video.videoWidth,
                                    videoRect.height / video.videoHeight,
                                );
                                const offsetX =
                                    (videoRect.width -
                                        video.videoWidth * scale) /
                                    2;
                                const offsetY =
                                    (videoRect.height -
                                        video.videoHeight * scale) /
                                    2;
                                const paddingX = result.box.width * 0.04;
                                const paddingY = result.box.height * 0.06;
                                const sourceLeft = Math.max(
                                    0,
                                    result.box.x - paddingX,
                                );
                                const sourceRight = Math.min(
                                    video.videoWidth,
                                    result.box.x + result.box.width + paddingX,
                                );
                                const top = Math.max(
                                    0,
                                    result.box.y - paddingY,
                                );
                                const bottom = Math.min(
                                    video.videoHeight,
                                    result.box.y + result.box.height + paddingY,
                                );
                                const left = video.videoWidth - sourceRight;
                                const width = sourceRight - sourceLeft;
                                const height = bottom - top;

                                updateFaceFrame({
                                    left:
                                        ((offsetX + left * scale) /
                                            videoRect.width) *
                                        100,
                                    top:
                                        ((offsetY + top * scale) /
                                            videoRect.height) *
                                        100,
                                    width:
                                        ((width * scale) / videoRect.width) *
                                        100,
                                    height:
                                        ((height * scale) / videoRect.height) *
                                        100,
                                });
                                updateFaceStatus('detected');
                            } else {
                                updateFaceFrame(null);
                                updateFaceStatus('missing');
                            }
                        }
                    } catch (err) {
                        console.warn('Face detection error:', err);
                        if (!cancelled) {
                            updateFaceFrame(null);
                            updateFaceStatus('error');
                        }
                    } finally {
                        isDetecting = false;
                    }
                }, FACE_DETECT_INTERVAL_MS);
            })
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
            if (faceDetectTimerRef.current)
                clearInterval(faceDetectTimerRef.current);
            startPromise.finally(() => {
                scanner.stop().catch(() => {});
            });
        };
    }, [submitScan]);

    // ── Face status styling map ───────────────────────────────────────────────
    const faceStatusConfig = {
        loading: {
            text: 'Starting camera…',
        },
        detected: {
            text: 'Face detected',
        },
        missing: {
            text: 'Look toward the camera',
        },
        error: {
            text: 'Face check unavailable',
        },
    } as const;

    const fc = faceStatusConfig[faceStatus];

    // Card styling
    const cardBorder = !lastIntern
        ? 'border-white/20 bg-black/60'
        : lastIntern.isDuplicate
          ? 'border-rose-500/80 bg-black/70'
          : lastIntern.label === 'time_in'
            ? 'border-emerald-500/70 bg-black/70'
            : 'border-sky-500/70 bg-black/70';

    return (
        <>
            <Head title={kioskName} />

            {/* Countdown animation */}
            <style>{`
                @keyframes kioskCountdown {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>

            <div
                className="dark min-h-screen w-full bg-slate-950 text-white"
                style={{
                    backgroundImage: `linear-gradient(rgba(5, 8, 14, 0.84), rgba(5, 8, 14, 0.91)), url('/images/cic-bg.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8 lg:max-w-7xl">
                    <header className="mb-5 text-center sm:mb-6">
                        <div className="mb-2 flex items-end justify-center gap-3">
                            <div className="flex items-end gap-0">
                                <img
                                    src="/images/usep-logo.png"
                                    alt="USEP"
                                    className="size-10 object-contain sm:size-12"
                                />
                                <img
                                    src="/images/uims-logo-dark.png?v=5"
                                    alt="UIMS"
                                    className="size-20 object-contain sm:size-24"
                                />
                                <img
                                    src="/images/cic-logo.png"
                                    alt="CIC"
                                    className="size-12 object-contain sm:size-14"
                                />
                            </div>
                        </div>
                        <h1 className="text-base font-semibold text-white sm:text-lg">
                            {kioskName}
                        </h1>
                    </header>

                    <main className="grid w-full gap-4 md:grid-cols-[1.35fr_1fr] md:gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-6">
                        <section className="relative aspect-video w-full overflow-hidden rounded-md border border-white/20 bg-black md:aspect-auto md:h-full md:min-h-[440px]">
                            <div
                                id={SCANNER_ELEMENT_ID}
                                className={
                                    cameraError
                                        ? 'hidden'
                                        : 'h-full w-full [&_#qr-shaded-region]:hidden [&_video]:!h-full [&_video]:!max-h-none [&_video]:!w-full [&_video]:!max-w-none [&_video]:scale-x-[-1] [&_video]:!object-cover'
                                }
                            />

                            {cameraError && (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                                        <Camera className="size-7" />
                                    </div>
                                    <p className="text-sm font-medium text-white">
                                        Camera Feed Unavailable
                                    </p>
                                    <p className="max-w-md text-xs text-white/60">
                                        {cameraError}
                                    </p>
                                </div>
                            )}

                            {!cameraError && (
                                <>
                                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-2.5 sm:p-3">
                                        <div
                                            className={`flex min-w-0 items-center gap-1.5 rounded-sm bg-black/65 px-2 py-1 text-[11px] font-medium ${faceStatus === 'detected' ? 'text-emerald-200' : faceStatus === 'missing' ? 'text-amber-100' : 'text-white/75'}`}
                                        >
                                            {faceStatus === 'loading' ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : faceStatus === 'detected' ? (
                                                <ScanFace className="size-3.5 text-emerald-400" />
                                            ) : faceStatus === 'missing' ? (
                                                <ScanFace className="size-3.5 text-amber-400" />
                                            ) : (
                                                <ScanFace className="size-3.5 text-white/40" />
                                            )}
                                            <span>{fc.text}</span>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5 rounded-sm bg-black/65 px-2 py-1 text-[10px] text-white/85 sm:text-[11px]">
                                            <span className="size-1.5 rounded-full bg-emerald-400" />
                                            <span>Camera on</span>
                                        </div>
                                    </div>

                                    <div className="pointer-events-none absolute inset-0">
                                        {faceFrame ? (
                                            <div
                                                className="absolute rounded-sm border-2 border-emerald-300/90 transition-all duration-300"
                                                style={{
                                                    left: `${faceFrame.left}%`,
                                                    top: `${faceFrame.top}%`,
                                                    width: `${faceFrame.width}%`,
                                                    height: `${faceFrame.height}%`,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className={`absolute top-[10%] left-1/2 aspect-[3/4] h-[52%] max-h-64 -translate-x-1/2 rounded-sm border border-dashed transition-colors ${
                                                    faceStatus === 'missing'
                                                        ? 'border-amber-300/70'
                                                        : 'border-white/45'
                                                }`}
                                            />
                                        )}
                                    </div>

                                    {faceStatus === 'missing' &&
                                        flash?.kind !== 'error' && (
                                            <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-center justify-center gap-2 rounded-sm bg-black/80 px-3 py-2 text-center text-xs font-medium text-amber-100 sm:inset-x-4 sm:bottom-4">
                                                <ScanFace className="size-4 shrink-0 animate-pulse text-amber-400" />
                                                <span>
                                                    Please look directly at the
                                                    camera while presenting your
                                                    QR code
                                                </span>
                                            </div>
                                        )}

                                    {flash?.kind === 'error' && (
                                        <div className="pointer-events-none absolute inset-x-2 top-14 z-20 flex items-center gap-3 rounded-sm bg-rose-800/95 px-3 py-2.5 text-white sm:inset-x-3 sm:top-14">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                                                <AlertTriangle className="size-4 text-white" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-rose-100">
                                                    Scan Rejected
                                                </p>
                                                <p className="text-xs font-medium text-white">
                                                    {flash.message}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        <section
                            aria-live="polite"
                            className={`flex min-w-0 flex-col rounded-md border p-4 transition-colors duration-200 sm:p-5 md:min-h-[440px] ${cardBorder}`}
                        >
                            {pendingScan ? (
                                <PendingScanCard photo={pendingPhoto} />
                            ) : !lastIntern ? (
                                <IdleStandbyCard />
                            ) : (
                                <ScannedInternCard intern={lastIntern} />
                            )}
                        </section>
                    </main>

                    <p className="mt-3 text-center text-xs text-white/60 sm:mt-4">
                        Keep your face in view. Your QR code can be anywhere in
                        the frame.
                    </p>
                </div>
            </div>
        </>
    );
}
