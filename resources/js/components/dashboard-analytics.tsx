import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number counting up from 0 to `value` whenever `value`
 * changes (e.g. on first mount, or after an Inertia partial reload
 * brings back fresh stats). Uses an ease-out curve over a fixed
 * duration rather than a fixed increment so small and large numbers
 * both feel snappy.
 */
export function CountUp({
    value,
    duration = 700,
}: {
    value: number;
    duration?: number;
}) {
    const [display, setDisplay] = useState(0);
    const frame = useRef<number | null>(null);

    useEffect(() => {
        const start = performance.now();
        const from = 0;

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(from + (value - from) * eased));

            if (progress < 1) {
                frame.current = requestAnimationFrame(tick);
            }
        };

        frame.current = requestAnimationFrame(tick);

        return () => {
            if (frame.current !== null) {
                cancelAnimationFrame(frame.current);
            }
        };
    }, [value, duration]);

    return <>{display}</>;
}

/**
 * Self-contained "checked in today" progress ring — a percentage of
 * some approved/assigned roster against how many of them have
 * scanned in today. Shared between the admin dashboard (whole
 * system) and the supervisor dashboard (their own roster) so both
 * render identically.
 */
export function AttendanceRing({
    percent,
    checkedIn,
    total,
}: {
    percent: number;
    checkedIn: number;
    total: number;
}) {
    const size = 148;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div
            className="relative mx-auto aspect-square w-full"
            style={{ maxWidth: size }}
        >
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="h-full w-full -rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="fill-none stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="fill-none stroke-chart-2 transition-[stroke-dashoffset] duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                <span className="text-xl font-semibold tabular-nums sm:text-2xl">
                    <CountUp value={clamped} />%
                </span>
                <span className="text-center text-xs text-muted-foreground">
                    {checkedIn} / {total} interns
                </span>
            </div>
        </div>
    );
}
