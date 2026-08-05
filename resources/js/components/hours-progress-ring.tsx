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
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        // CHANGED — was a fixed-pixel width/height box (default 330px),
        // which never shrank on narrow screens and overflowed its card.
        // Now it's fluid: bounded by `size` as an upper limit, but scales
        // down with the container via w-full + aspect-square, so it never
        // exceeds the space it's actually given.
        <div
            className="relative mx-auto aspect-square w-full"
            style={{ maxWidth: size }}
        >
            <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                <span className="text-xl font-semibold tabular-nums sm:text-2xl">{clamped}%</span>
                <span className="text-center text-xs text-muted-foreground">
                    {totalRendered.toFixed(1)} / {required} hrs
                </span>
            </div>
        </div>
    );
}
