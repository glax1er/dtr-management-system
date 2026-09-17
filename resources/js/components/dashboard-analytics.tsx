import { ArrowRight, Trophy, type LucideIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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

const VARIANT_STYLES = {
    default: 'bg-muted text-muted-foreground group-hover:text-foreground',
    primary: 'bg-primary/10 text-primary group-hover:bg-primary/15',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/15',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/15',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/15',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/15',
} as const;

const BORDER_ACCENT = {
    default: '',
    primary: 'border-l-2 border-l-primary/60',
    success: 'border-l-2 border-l-emerald-500/60',
    warning: 'border-l-2 border-l-amber-500/60',
    purple: 'border-l-2 border-l-purple-500/60',
    info: 'border-l-2 border-l-blue-500/60',
} as const;

/**
 * Clean, modern KPI Stat Card consistent with HTEs, Programs, and Campuses pages.
 * Features a left-border accent, icon container, and clear typographic hierarchy.
 */
export function StatCard({
    label,
    value,
    displayValue,
    icon: Icon,
    onClick,
    description,
    badge,
    variant = 'default',
    index = 0,
}: {
    label: string;
    value?: number;
    displayValue?: React.ReactNode;
    icon: LucideIcon;
    onClick?: () => void;
    description?: string;
    badge?: React.ReactNode;
    variant?: keyof typeof VARIANT_STYLES;
    index?: number;
}) {
    return (
        <Card
            className={cn(
                'group relative overflow-hidden transition-all duration-200 shadow-xs hover:shadow-sm',
                BORDER_ACCENT[variant] ?? '',
                onClick &&
                    'cursor-pointer hover:border-primary/40 active:scale-[0.99]',
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
                        'flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
                        VARIANT_STYLES[variant] ?? VARIANT_STYLES.default,
                    )}
                >
                    <Icon className="size-4.5" />
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="flex items-end justify-between gap-2">
                    <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                        {displayValue !== undefined ? (
                            displayValue
                        ) : value !== undefined ? (
                            <CountUp value={value} />
                        ) : null}
                    </div>
                    {badge && <div className="mb-0.5 shrink-0">{badge}</div>}
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
 * Clean, self-contained attendance progress ring with percentage and count ratio.
 */
export function AttendanceRing({
    percent,
    checkedIn,
    total,
    subtitle,
    size = 140,
}: {
    percent: number;
    checkedIn: number;
    total: number;
    subtitle?: string;
    size?: number;
}) {
    const strokeWidth = 11;
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
                    className="h-full w-full -rotate-90"
                >
                    {/* Background track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        className="fill-none stroke-muted"
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
                    <span className="mt-1 text-xs font-semibold tabular-nums text-muted-foreground">
                        {checkedIn} / {total}
                    </span>
                </div>
            </div>
            {subtitle && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

/**
 * Clean 14-day activity momentum bar chart with animated bars and date labels.
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
        <div className="flex flex-col gap-2 pt-1">
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
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute -top-8 z-20 hidden items-center gap-1 rounded-md border bg-popover px-2 py-1 text-[11px] font-medium whitespace-nowrap text-popover-foreground shadow-md transition-all group-hover:flex">
                                <span>{point.count}</span>
                                <span className="text-muted-foreground">
                                    ({point.label})
                                </span>
                            </div>

                            {/* Bar element */}
                            <div
                                className={cn(
                                    'w-full rounded-t-sm transition-all duration-500 ease-out group-hover:opacity-90',
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

            {/* Date labels */}
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

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'HT';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Modern Ranked Item List with medal badges, company initials avatar,
 * placement share indicator, proportional animated progress track, and smooth hover effects.
 */
export function RankedList({
    items,
    mounted,
    onItemClick,
    emptyMessage = 'No items recorded yet.',
    itemLabel = 'intern',
    defaultShowAll = false,
}: {
    items: { name: string; count: number }[];
    mounted: boolean;
    onItemClick?: (name: string) => void;
    emptyMessage?: string;
    itemLabel?: string;
    defaultShowAll?: boolean;
}) {
    const [viewMode, setViewMode] = useState<'top5' | 'all'>(
        defaultShowAll || items.length <= 5 ? 'all' : 'top5',
    );

    const isFiltered = items.length > 5 && viewMode === 'top5';
    const displayedItems = isFiltered ? items.slice(0, 5) : items;
    const isTwoColumn = displayedItems.length > 5;

    const max = Math.max(1, ...displayedItems.map((i) => i.count));
    const totalCount = items.reduce((sum, i) => sum + i.count, 0);

    if (items.length === 0) {
        return (
            <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs text-muted-foreground sm:text-sm">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            {/* View switcher when there are more than 5 items */}
            {items.length > 5 && (
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        Showing {displayedItems.length} of {items.length} establishments
                    </span>
                    <div className="flex items-center rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('top5')}
                            className={cn(
                                'rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
                                viewMode === 'top5'
                                    ? 'bg-background font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Top 5
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('all')}
                            className={cn(
                                'rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
                                viewMode === 'all'
                                    ? 'bg-background font-semibold text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            All ({items.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Scrollable list container with maximum height constraint */}
            <div className="relative">
                <div
                    className={cn(
                        'max-h-[350px] overflow-y-auto pr-1 scrollbar-thin transition-all',
                        isTwoColumn
                            ? 'grid grid-cols-1 gap-2 md:grid-cols-2'
                            : 'flex flex-col gap-2',
                    )}
                >
                    {displayedItems.map((item, index) => {
                        const widthPercent = mounted
                            ? Math.max((item.count / max) * 100, 8)
                            : 0;
                        const share =
                            totalCount > 0
                                ? Math.round((item.count / totalCount) * 100)
                                : 0;
                        const initials = getInitials(item.name);

                        return (
                            <div
                                key={item.name}
                                onClick={() => onItemClick?.(item.name)}
                                className={cn(
                                    'group relative flex flex-col gap-2 rounded-xl border border-border/40 bg-card p-2.5 transition-all duration-200',
                                    onItemClick &&
                                        'cursor-pointer hover:border-border hover:bg-muted/40 hover:shadow-xs active:scale-[0.99]',
                                )}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        {/* Rank badge */}
                                        <div
                                            className={cn(
                                                'flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-transform group-hover:scale-105',
                                                index === 0
                                                    ? 'border border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                    : index === 1
                                                      ? 'border border-slate-500/30 bg-slate-500/15 text-slate-600 dark:text-slate-300'
                                                      : index === 2
                                                        ? 'border border-orange-500/30 bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                                        : 'border border-border/60 bg-muted font-mono text-[11px] text-muted-foreground',
                                            )}
                                        >
                                            {index === 0 ? (
                                                <Trophy className="size-3 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                index + 1
                                            )}
                                        </div>

                                        {/* Initials avatar */}
                                        <div
                                            className={cn(
                                                'flex size-7 shrink-0 select-none items-center justify-center rounded-lg font-mono text-[11px] font-semibold',
                                                index === 0
                                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                                    : 'bg-primary/10 text-primary',
                                            )}
                                        >
                                            {initials}
                                        </div>

                                        {/* Title & Share */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-primary sm:text-sm"
                                                    title={item.name}
                                                >
                                                    {item.name}
                                                </span>
                                                {index === 0 && !isTwoColumn && (
                                                    <span className="hidden rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400 sm:inline-flex">
                                                        Top Partner
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                <span>{share}% of placements</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Count & Arrow */}
                                    <div className="flex shrink-0 items-center gap-1.5 text-right">
                                        <div>
                                            <span className="text-xs font-bold tabular-nums text-foreground sm:text-sm">
                                                <CountUp value={item.count} />
                                            </span>
                                            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                                {itemLabel}
                                                {item.count === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                                    </div>
                                </div>

                                {/* Progress track */}
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-700 ease-out',
                                            index === 0
                                                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                                : 'bg-gradient-to-r from-primary to-primary/60 group-hover:from-primary group-hover:to-primary/80',
                                        )}
                                        style={{
                                            width: `${widthPercent}%`,
                                            transitionDelay: `${index * 40}ms`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Approval Status Pie Chart ────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    'approved' | 'pending' | 'rejected',
    {
        label: string;
        color: string;
        dot: string;
        badge: string;
        textColor: string;
    }
> = {
    approved: {
        label: 'Approved',
        color: '#10b981',
        dot: 'bg-emerald-500',
        badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    pending: {
        label: 'Pending',
        color: '#f59e0b',
        dot: 'bg-amber-500',
        badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        textColor: 'text-amber-600 dark:text-amber-400',
    },
    rejected: {
        label: 'Rejected',
        color: '#f43f5e',
        dot: 'bg-rose-500',
        badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
        textColor: 'text-rose-600 dark:text-rose-400',
    },
};

export function StatusPieChart({
    data,
    mounted,
    onStatusClick,
}: {
    data: { status: 'pending' | 'approved' | 'rejected'; count: number }[];
    mounted: boolean;
    onStatusClick?: (status: 'pending' | 'approved' | 'rejected') => void;
}) {
    const [hoveredStatus, setHoveredStatus] = useState<
        'pending' | 'approved' | 'rejected' | null
    >(null);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    const radius = 50;
    const strokeWidth = 14;
    const size = 136;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    const activeItems = data.filter((item) => item.count > 0);
    const gap = activeItems.length > 1 ? 3 : 0;
    const availableCircumference = circumference - activeItems.length * gap;

    let accumulatedOffset = 0;
    const segments = activeItems.map((item) => {
        const sliceLength =
            total > 0
                ? (item.count / total) * availableCircumference
                : 0;
        const offset = accumulatedOffset;
        accumulatedOffset += sliceLength + gap;
        return {
            ...item,
            sliceLength,
            offset,
        };
    });

    const activeHoverItem = hoveredStatus
        ? data.find((d) => d.status === hoveredStatus)
        : null;

    return (
        <div className="flex flex-col items-center justify-between gap-4">
            {/* Chart SVG */}
            <div className="relative aspect-square w-[136px] select-none">
                <svg
                    viewBox={`0 0 ${size} ${size}`}
                    className="h-full w-full -rotate-90"
                >
                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        strokeWidth={strokeWidth}
                        className="fill-none stroke-muted/40"
                    />

                    {/* Slices */}
                    {total > 0 &&
                        segments.map((seg) => {
                            const isHovered = hoveredStatus === seg.status;
                            const config = STATUS_CONFIG[seg.status];

                            return (
                                <circle
                                    key={seg.status}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                                    stroke={config.color}
                                    strokeDasharray={`${mounted ? seg.sliceLength : 0} ${circumference}`}
                                    strokeDashoffset={-seg.offset}
                                    strokeLinecap="round"
                                    className="cursor-pointer fill-none transition-all duration-300 ease-out"
                                    style={{
                                        filter: isHovered
                                            ? `drop-shadow(0 0 6px ${config.color}90)`
                                            : undefined,
                                    }}
                                    onMouseEnter={() => setHoveredStatus(seg.status)}
                                    onMouseLeave={() => setHoveredStatus(null)}
                                    onClick={() => onStatusClick?.(seg.status)}
                                />
                            );
                        })}
                </svg>

                {/* Center text metric */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
                    {activeHoverItem ? (
                        <>
                            <span className="text-2xl font-bold leading-none tabular-nums text-foreground">
                                <CountUp value={activeHoverItem.count} />
                            </span>
                            <span
                                className={cn(
                                    'mt-1 text-[11px] font-semibold leading-none',
                                    STATUS_CONFIG[activeHoverItem.status].textColor,
                                )}
                            >
                                {STATUS_CONFIG[activeHoverItem.status].label}
                            </span>
                            <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                                {total > 0
                                    ? Math.round(
                                          (activeHoverItem.count / total) * 100,
                                      )
                                    : 0}
                                %
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl font-bold leading-none tabular-nums text-foreground">
                                <CountUp value={total} />
                            </span>
                            <span className="mt-1 text-[11px] font-medium leading-none text-muted-foreground">
                                Total
                            </span>
                            <span className="mt-0.5 text-[10px] text-muted-foreground/80">
                                Interns
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Interactive Legend List */}
            <div className="flex w-full flex-col gap-1">
                {data.map((item) => {
                    const config = STATUS_CONFIG[item.status];
                    const pct =
                        total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const isHovered = hoveredStatus === item.status;

                    return (
                        <button
                            key={item.status}
                            type="button"
                            onMouseEnter={() => setHoveredStatus(item.status)}
                            onMouseLeave={() => setHoveredStatus(null)}
                            onClick={() => onStatusClick?.(item.status)}
                            className={cn(
                                'group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                                isHovered
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                            )}
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className={cn(
                                        'size-2.5 shrink-0 rounded-full transition-transform',
                                        config.dot,
                                        isHovered && 'scale-125',
                                    )}
                                />
                                <span className="font-medium text-foreground">
                                    {config.label}
                                </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="font-semibold tabular-nums text-foreground">
                                    <CountUp value={item.count} />
                                </span>
                                <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">
                                    {pct}%
                                </span>
                                <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

