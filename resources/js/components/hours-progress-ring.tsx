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
    size = 160,
}: HoursProgressRingProps) {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
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
                    className="fill-none stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{clamped}%</span>
                <span className="text-center text-xs text-muted-foreground">
                    {totalRendered.toFixed(1)} / {required} hrs
                </span>
            </div>
        </div>
    );
}