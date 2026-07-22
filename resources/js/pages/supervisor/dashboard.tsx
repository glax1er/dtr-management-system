import { Head, usePage } from '@inertiajs/react';
import { Html5Qrcode } from 'html5-qrcode';
import { ClipboardCheck, Clock, GraduationCap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

const SCANNER_ELEMENT_ID = 'qr-scanner-viewport';

// How long a successful/rejected scan stays on screen before clearing —
// matches the spec: "display briefly ... then disappear."
const FLASH_DURATION_MS = 3000;

// How long to ignore further decoded frames after handling one scan.
// html5-qrcode calls its success callback on every frame it manages to
// decode — without this, a single physical QR sitting in view for a
// couple of seconds would fire a dozen POSTs, not one. This is a
// separate, client-side concern from RecordScan's own 5-minute
// server-side debounce, which guards the database, not the network.
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

function readXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
}

interface RecentScan {
    intern_name: string;
    label: 'time_in' | 'time_out';
    scanned_at: string;
}

interface SupervisorDashboardProps {
    myInternsCount: number;
    scansToday: number;
    scansThisWeek: number;
    recentScans: RecentScan[];
}

export default function SupervisorDashboard({
    myInternsCount = 0,
    scansToday,
    scansThisWeek,
    recentScans
}: SupervisorDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const [flash, setFlash] = useState<ScanFlash | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const busyRef = useRef(false);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        let cancelled = false;

        const startPromise = scanner
            .start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    // A fixed pixel qrbox (e.g. 250x250) looks tiny on a
                    // tablet and cramped on a small phone. Sizing it as a
                    // fraction of whatever the camera's actual viewfinder
                    // turns out to be keeps the framing box sensible on
                    // any device — this is html5-qrcode's documented
                    // pattern for responsive scan regions.
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const edge = Math.floor(
                            Math.min(viewfinderWidth, viewfinderHeight) * 0.7,
                        );
                        return { width: edge, height: edge };
                    },
                    // Force a square feed regardless of the phone's native
                    // camera aspect ratio (varies a lot device to device)
                    // so the preview always matches the square container
                    // below instead of being stretched or letterboxed.
                    aspectRatio: 1,
                },
                (decodedText) => {
                    if (!cancelled) submitScan(decodedText);
                },
                () => {
                    // Fires continuously while no code is in frame — expected, not an error.
                },
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
            // Wait for start() to actually settle (success OR failure)
            // before calling stop(). Calling stop() while start() is
            // still mid-flight is what breaks the camera under React
            // StrictMode's dev-only double mount/unmount/remount — it
            // interrupts the first attempt right as it's requesting the
            // camera, leaving the real (second) mount fighting over a
            // half-initialized stream. This ordering fixes that without
            // needing to touch StrictMode itself.
            startPromise.finally(() => {
                scanner.stop().catch(() => {});
            });
        };
    }, []);

    function submitScan(qrCodeValue: string) {
        if (busyRef.current) return;
        busyRef.current = true;

        fetch('/supervisor/scan', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            body: JSON.stringify({ qr_code_value: qrCodeValue }),
        })
            .then(async (response) => {
                const data = await response.json();

                if (!response.ok) {
                    setFlash({
                        kind: 'error',
                        message: data.message ?? 'Scan rejected.',
                    });
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
                    message:
                        'Could not reach the server. Check your connection and try again.',
                });
            })
            .finally(() => {
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(
                    () => setFlash(null),
                    FLASH_DURATION_MS,
                );

                setTimeout(() => {
                    busyRef.current = false;
                }, REPROCESS_COOLDOWN_MS);
            });
    }

    const stats = [
    { label: 'My Interns', value: myInternsCount, icon: GraduationCap },
    { label: 'Scans Today', value: scansToday, icon: ClipboardCheck },
    { label: 'Scans This Week', value: scansThisWeek, icon: Clock },
    ];

    return (
        <>
            <Head title="Supervisor Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Scan an intern's QR code to record their time in/out.
                    </p>
                </div>

                {/* The scanner is the primary, first thing on this page —
                    not a secondary link buried in the sidebar. For a
                    supervisor, this IS the app; everything else here is
                    supporting context underneath it. */}
                <Card className="gap-4 py-4 sm:gap-6 sm:py-6">
                    <CardHeader className="px-4 sm:px-6">
                        <CardTitle className="text-lg sm:text-xl">
                            Scan Intern QR Code
                        </CardTitle>
                        <CardDescription>
                            Have the intern present their QR code to the camera
                            below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-black">
                            {/* Always mounted — hidden via CSS if there's an error,
                                never conditionally unmounted. html5-qrcode
                                manipulates this div's DOM directly; removing and
                                remounting it fights the library instead of
                                working with it. */}
                            <div
                                id={SCANNER_ELEMENT_ID}
                                className={
                                    cameraError
                                        ? 'hidden'
                                        : 'h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover'
                                }
                            />

                            {cameraError && (
                                <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-white/80">
                                    {cameraError}
                                </div>
                            )}

                            {/* Overlaid on top of the camera feed, not stacked
                                above it — a scan every few seconds otherwise
                                shifts the whole layout up and down, which is
                                disorienting when someone's actively holding a
                                phone steady to line up a QR code. */}
                            {flash && (
                                <div
                                    className={
                                        'absolute inset-x-0 top-0 p-3 text-sm shadow-md backdrop-blur-sm ' +
                                        (flash.kind === 'success'
                                            ? 'bg-emerald-500/90 text-white'
                                            : 'bg-destructive/90 text-white')
                                    }
                                >
                                    {flash.kind === 'success' ? (
                                        <>
                                            <div className="text-base font-semibold sm:text-lg">
                                                {flash.internName}
                                            </div>
                                            <div className="text-white/90">
                                                {flash.idNumber}
                                            </div>
                                            <div className="text-white/90">
                                                {flash.label === 'time_in'
                                                    ? 'Timed In'
                                                    : 'Timed Out'}{' '}
                                                · {formatTime(flash.timestamp)}
                                                {flash.isDuplicate &&
                                                    ' (already recorded)'}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-base font-medium sm:text-lg">
                                            {flash.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    {stats.map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {label}
                                </CardTitle>
                                <Icon className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {value}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Recent Scans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentScans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No scans recorded yet — this list fills up as you scan intern QR codes.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentScans.map((scan, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{scan.intern_name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {scan.label === 'time_in' ? 'Timed In' : 'Timed Out'} · {scan.scanned_at}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
