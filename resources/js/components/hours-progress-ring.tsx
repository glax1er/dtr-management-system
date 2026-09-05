import { CountUp } from '@/components/dashboard-analytics';

type HoursProgressRingProps = {
    percent: number;
    totalRendered: number;
    required: number;
    size?: number;
};

export function HoursProgressRing({
    percent,
    totalRendered,
    required,
    size = 220,
}: HoursProgressRingProps) {
    const strokeWidth = 14;
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
                className="h-full w-full -rotate-90 drop-shadow-xs"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="fill-none stroke-muted/80"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="fill-none stroke-primary transition-all duration-700 ease-out"
                />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                <span className="text-2xl leading-none font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
                    <CountUp value={clamped} />%
                </span>
                <span className="mt-1 text-xs font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
                    {totalRendered.toFixed(1)} / {required} hrs
                </span>
            </div>
        </div>
    );
}
