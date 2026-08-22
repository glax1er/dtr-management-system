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
            <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90 drop-shadow-xs">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-foreground leading-none">
                    <CountUp value={clamped} />%
                </span>
                <span className="text-xs font-semibold text-muted-foreground mt-1 tabular-nums whitespace-nowrap">
                    {totalRendered.toFixed(1)} / {required} hrs
                </span>
            </div>
        </div>
    );
}

