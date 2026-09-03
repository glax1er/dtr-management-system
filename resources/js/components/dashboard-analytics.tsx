import React, { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Animates a number counting up from 0 to `value` whenever `value`
 * changes (e.g. on first mount, or after an Inertia partial reload
 * brings back fresh stats). Uses an ease-out cubic curve over a fixed
 * duration.
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
 * Modern shadcn KPI Stat Card with icon container, count-up animation,
 * and optional click action / description / custom display value.
 */
export function StatCard({
    label,
    value,
    displayValue,
    icon: Icon,
    onClick,
    description,
    variant = 'default',
    index = 0,
}: {
    label: string;
    value?: number;
    displayValue?: React.ReactNode;
    icon: LucideIcon;
    onClick?: () => void;
    description?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning';
    index?: number;
}) {
    const variantStyles = {
        default: 'bg-primary/10 text-primary',
        primary: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };

    return (
        <Card
            className={cn(
                'group relative overflow-hidden transition-all duration-300 hover:shadow-md',
                onClick &&
                    'cursor-pointer hover:border-primary/40 hover:bg-card/80 active:scale-[0.99]',
            )}
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
                    {label}
                </CardTitle>
                <div
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-110',
                        variantStyles[variant],
                    )}
                >
                    <Icon className="size-4.5" />
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-3xl">
                    {displayValue !== undefined ? (
                        displayValue
                    ) : value !== undefined ? (
                        <CountUp value={value} />
                    ) : null}
                </div>
                {description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Self-contained "checked in today" progress ring — a percentage of
 * some approved/assigned roster against how many of them have
 * scanned in today.
 */
export function AttendanceRing({
    percent,
    checkedIn,
    total,
    subtitle = 'interns',
    size = 156,
}: {
    percent: number;
    checkedIn: number;
    total: number;
    subtitle?: string;
    size?: number;
}) {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div
                className="relative mx-auto aspect-square w-full"
                style={{ maxWidth: size }}
            >
                <svg
                    viewBox={`0 0 ${size} ${size}`}
                    className="h-full w-full -rotate-90 drop-shadow-xs"
                >
                    {/* Background track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        className="fill-none stroke-muted/80"
                    />
                    {/* Active progress track */}
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
                        {checkedIn} / {total}
                    </span>
                </div>
            </div>
            {subtitle && (
                <p className="mt-2.5 text-center text-xs font-medium text-muted-foreground">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

/**
 * 14-day activity momentum bar chart with animated bars, clean tooltips,
 * and weekday labels.
 */
export function TrendBarChart({
    data,
    mounted,
    barColor = 'bg-primary',
}: {
    data: { date: string; label: string; count: number }[];
    mounted: boolean;
    barColor?: string;
}) {
    const total = data.reduce((sum, p) => sum + p.count, 0);
    const max = Math.max(1, ...data.map((p) => p.count));

    if (total === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">
                    No activity recorded in this period.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 pt-2">
            <div className="flex h-32 items-end gap-1.5 sm:gap-2">
                {data.map((point, i) => {
                    const heightPercent = mounted
                        ? Math.max((point.count / max) * 100, 5)
                        : 0;

                    return (
                        <div
                            key={point.date}
                            className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        >
                            {/* Hover tooltip */}
                            <div className="pointer-events-none absolute -top-8 z-20 hidden items-center gap-1 rounded-md border bg-popover px-2 py-1 text-[11px] font-medium whitespace-nowrap text-popover-foreground shadow-md transition-all group-hover:flex">
                                <span>{point.count}</span>
                                <span className="text-muted-foreground">
                                    ({point.label})
                                </span>
                            </div>

                            {/* Bar element */}
                            <div
                                className={cn(
                                    'w-full rounded-t-md transition-all duration-500 ease-out group-hover:opacity-90',
                                    point.count > 0 ? barColor : 'bg-muted/60',
                                )}
                                style={{
                                    height: `${heightPercent}%`,
                                    transitionDelay: `${i * 25}ms`,
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Date labels below */}
            <div className="flex items-center justify-between px-0.5 text-[10px] text-muted-foreground select-none">
                <span>{data[0]?.label}</span>
                <span className="hidden text-center sm:inline">
                    {data[Math.floor(data.length / 2)]?.label}
                </span>
                <span>{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}

/**
 * Ranked item list with numbered badges, proportional progress bars,
 * and click interaction.
 */
export function RankedList({
    items,
    mounted,
    onItemClick,
    emptyMessage = 'No items recorded yet.',
    itemLabel = 'item',
}: {
    items: { name: string; count: number }[];
    mounted: boolean;
    onItemClick?: (name: string) => void;
    emptyMessage?: string;
    itemLabel?: string;
}) {
    const max = Math.max(1, ...items.map((i) => i.count));

    if (items.length === 0) {
        return (
            <div className="flex h-32 items-center justify-center text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {items.map((item, index) => {
                const widthPercent = mounted
                    ? Math.max((item.count / max) * 100, 6)
                    : 0;

                return (
                    <div
                        key={item.name}
                        onClick={() => onItemClick?.(item.name)}
                        className={cn(
                            'group flex flex-col gap-1.5 rounded-lg p-2 transition-colors',
                            onItemClick && 'cursor-pointer hover:bg-muted/50',
                        )}
                    >
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className={cn(
                                        'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                        index === 0
                                            ? 'bg-primary text-primary-foreground'
                                            : index === 1
                                              ? 'bg-primary/70 text-primary-foreground'
                                              : index === 2
                                                ? 'bg-primary/40 text-foreground'
                                                : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {index + 1}
                                </span>
                                <span className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                                    {item.name}
                                </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                                <CountUp value={item.count} /> {itemLabel}
                                {item.count === 1 ? '' : 's'}
                            </span>
                        </div>

                        {/* Progress track */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                                style={{
                                    width: `${widthPercent}%`,
                                    transitionDelay: `${index * 60}ms`,
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
