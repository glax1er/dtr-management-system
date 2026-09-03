import { Head, router } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Clock,
    Coffee,
    LayoutGrid,
    Search,
    Sparkles,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { PaginationMeta } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

// ── Types ────────────────────────────────────────────────────────────────────
export interface CalendarDay {
    date: string;
    day_number: number;
    day_of_week: string;
    day_name: string;
    day_short: string;
    is_current_month: boolean;
    is_today: boolean;
    is_past: boolean;
    is_workday: boolean;
    expected_start_time: string | null;
    expected_start_time_formatted: string | null;
    source_type: 'hte_override' | 'global_schedule' | 'default_schedule';
    source_label: string;
    period_id: number | null;
    period_name: string | null;
    period_start_date: string | null;
    period_end_date: string | null;
    period_updated_at: string | null;
    period_updated_at_human: string | null;
}

export interface PaginatedDays extends PaginationMeta {
    data: CalendarDay[];
}

export interface SchedulePeriodItem {
    id: number;
    name: string;
    scope: 'hte' | 'global';
    scope_label: string;
    hte_name?: string | null;
    start_date: string;
    end_date: string;
    formatted_range: string;
    status: 'active' | 'upcoming' | 'past';
    day_schedule: Record<string, string | null>;
    created_at: string | null;
    created_at_human: string | null;
    updated_at: string | null;
    updated_at_human: string | null;
}

export interface InternScheduleProps {
    month: string;
    monthLabel: string;
    currentMonth: string;
    todayDate: string;
    days: CalendarDay[];
    paginatedDays: PaginatedDays;
    stats: {
        workdays_count: number;
        restdays_count: number;
        total_days: number;
        hte_overrides_count: number;
        global_periods_count: number;
    };
    hte: {
        id: number;
        name: string;
    } | null;
    globalPeriods: SchedulePeriodItem[];
    htePeriods: SchedulePeriodItem[];
    recentNotifications?: Array<{
        id: string;
        title: string;
        message: string;
        action: string;
        scope: string;
        schedule_name: string | null;
        hte_name: string | null;
        schedule_period_id: number | null;
        created_at: string;
        created_at_human: string;
        read_at: string | null;
    }>;
    defaultExpectedStartTime: string;
    defaultExpectedStartTimeFormatted: string | null;
}

type ViewMode = 'grid' | 'table';

const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MINI_WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function InternSchedule({
    month,
    monthLabel,
    currentMonth,
    days,
    paginatedDays,
    stats,
    hte,
}: InternScheduleProps) {
    const [view, setView] = useState<ViewMode>('grid');
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Checkbox Filters for Schedule Types (HTE, Global, Standard, Rest Days)
    const [showHteSchedule, setShowHteSchedule] = useState(true);
    const [showGlobalSchedule, setShowGlobalSchedule] = useState(true);
    const [showStandardSchedule, setShowStandardSchedule] = useState(true);
    const [showRestDays, setShowRestDays] = useState(true);

    const highlightDate =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get(
                  'highlight_date',
              ) || null
            : null;
    const highlightPeriod =
        typeof window !== 'undefined'
            ? Number(
                  new URLSearchParams(window.location.search).get(
                      'highlight_period',
                  ),
              ) || null
            : null;

    // Scroll to highlighted day or period
    useEffect(() => {
        if (!highlightDate && !highlightPeriod) return;

        const targetDate =
            highlightDate ||
            (highlightPeriod
                ? days.find((d) => d.period_id === highlightPeriod)?.date
                : null);

        if (targetDate) {
            const el =
                document.getElementById(`grid-day-${targetDate}`) ||
                document.getElementById(`table-row-${targetDate}`);
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 250);
                return () => clearTimeout(timer);
            }
        }
    }, [highlightDate, highlightPeriod, days, paginatedDays.data, view]);

    // ── Schedule auto-refresh ──────────────────────────────────────────────────
    // Poll every 60 s to silently reload schedule props so the intern always
    // sees the latest data after an admin or HTE supervisor updates a period.
    useEffect(() => {
        const interval = window.setInterval(() => {
            router.reload({
                only: [
                    'days',
                    'paginatedDays',
                    'stats',
                    'globalPeriods',
                    'htePeriods',
                ],
            });
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

    // ── Month Navigation ───────────────────────────────────────────────────────
    const handleNavigateMonth = (direction: 'prev' | 'next' | 'current') => {
        if (direction === 'current') {
            router.get(
                '/intern/schedule',
                { month: currentMonth, page: 1 },
                { preserveScroll: true, preserveState: true },
            );
            return;
        }

        const [yStr, mStr] = month.split('-');
        let year = Number(yStr);
        let m = Number(mStr);

        if (direction === 'prev') {
            m -= 1;
            if (m < 1) {
                m = 12;
                year -= 1;
            }
        } else {
            m += 1;
            if (m > 12) {
                m = 1;
                year += 1;
            }
        }

        const nextMonthParam = `${year}-${String(m).padStart(2, '0')}`;
        router.get(
            '/intern/schedule',
            { month: nextMonthParam, page: 1 },
            { preserveScroll: true, preserveState: true },
        );
    };

    const goToPage = (page: number) => {
        router.get(
            '/intern/schedule',
            { month, page, per_page: paginatedDays.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const changePerPage = (perPage: number) => {
        router.get(
            '/intern/schedule',
            { month, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleOpenDay = (day: CalendarDay) => {
        setSelectedDay(day);
        setDayModalOpen(true);
    };

    // Filter table rows if searching or using filters
    const filteredTableDays = useMemo(() => {
        return paginatedDays.data.filter((day) => {
            if (!showHteSchedule && day.source_type === 'hte_override')
                return false;
            if (!showGlobalSchedule && day.source_type === 'global_schedule')
                return false;
            if (
                !showStandardSchedule &&
                day.source_type === 'default_schedule' &&
                day.is_workday
            )
                return false;
            if (!showRestDays && !day.is_workday) return false;

            if (search.trim()) {
                const q = search.toLowerCase();
                if (
                    !day.date.toLowerCase().includes(q) &&
                    !day.day_name.toLowerCase().includes(q) &&
                    !day.source_label.toLowerCase().includes(q) &&
                    !(day.expected_start_time_formatted || '')
                        .toLowerCase()
                        .includes(q)
                ) {
                    return false;
                }
            }
            return true;
        });
    }, [
        paginatedDays.data,
        showHteSchedule,
        showGlobalSchedule,
        showStandardSchedule,
        showRestDays,
        search,
    ]);

    return (
        <>
            <Head title="Work Schedule" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* ── Top Header Toolbar (Same UI as My Documents) ─────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <CalendarClock className="size-5" />
                            </span>
                            Work Schedule
                        </h1>
                    </div>

                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search schedule…"
                                className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none lg:w-56"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Month Navigator */}
                        <div className="flex items-center rounded-lg border bg-card shadow-2xs">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-r-none"
                                onClick={() => handleNavigateMonth('prev')}
                                title="Previous month"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="px-3 text-xs font-semibold whitespace-nowrap text-foreground">
                                {monthLabel}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-r-none"
                                onClick={() => handleNavigateMonth('next')}
                                title="Next month"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        {/* View Mode Switcher (Grid & Table Tabs) */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger
                                        value="table"
                                        className="gap-1.5 text-xs"
                                    >
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="grid"
                                        className="gap-1.5 text-xs"
                                    >
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Workdays Indicator */}
                        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-1.5">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-foreground">
                                    {stats.workdays_count} Work Days
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {stats.restdays_count} rest days
                                </p>
                            </div>
                            <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* ── Main Google Calendar Workspace Layout ────────────────────── */}
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
                    {/* ── Left Sidebar (Google Calendar Style) ────────────────── */}
                    <div className="space-y-3 lg:col-span-3">
                        {/* Mini Month Calendar */}
                        <Card className="border p-3.5 shadow-2xs">
                            <div className="mb-2 flex items-center justify-between border-b pb-2">
                                <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                                    <CalendarIcon className="size-3.5 text-primary" />
                                    {monthLabel}
                                </span>
                                <div className="flex items-center gap-0.5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                            handleNavigateMonth('prev')
                                        }
                                        title="Previous month"
                                    >
                                        <ChevronLeft className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6 text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                            handleNavigateMonth('next')
                                        }
                                        title="Next month"
                                    >
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Mini Weekday Headers */}
                            <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                                {MINI_WEEKDAYS.map((w, idx) => (
                                    <span
                                        key={`mini-w-${idx}`}
                                        className="text-[10px] font-bold text-muted-foreground/70"
                                    >
                                        {w}
                                    </span>
                                ))}
                            </div>

                            {/* Mini Days Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {days.slice(0, 35).map((d) => (
                                    <button
                                        key={`mini-${d.date}`}
                                        type="button"
                                        onClick={() => handleOpenDay(d)}
                                        className={cn(
                                            'flex size-7 cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-all',
                                            d.is_today
                                                ? 'bg-primary font-bold text-primary-foreground shadow-xs'
                                                : d.is_current_month
                                                  ? d.source_type ===
                                                        'hte_override' &&
                                                    d.is_workday
                                                      ? 'font-semibold text-purple-700 hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-950/50'
                                                      : 'text-foreground hover:bg-muted/70'
                                                  : 'text-muted-foreground/35 hover:bg-muted/20',
                                        )}
                                    >
                                        {d.day_number}
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Schedule Type Filters (Interactive Checkboxes) */}
                        <Card className="space-y-3 border p-3.5 shadow-2xs">
                            <span className="block text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Schedule Filters
                            </span>

                            <div className="space-y-2.5 text-xs">
                                {/* 🟣 HTE Time Schedule */}
                                <label className="group flex cursor-pointer items-center justify-between select-none">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={showHteSchedule}
                                            onCheckedChange={(checked) =>
                                                setShowHteSchedule(
                                                    Boolean(checked),
                                                )
                                            }
                                        />
                                        <span className="font-medium text-foreground transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                            HTE Time Schedule
                                            {hte ? ` (${hte.name})` : ''}
                                        </span>
                                    </div>
                                    <span className="size-2.5 shrink-0 rounded-full bg-purple-600" />
                                </label>

                                {/* 🔵 Global OJT Schedule */}
                                <label className="group flex cursor-pointer items-center justify-between select-none">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={showGlobalSchedule}
                                            onCheckedChange={(checked) =>
                                                setShowGlobalSchedule(
                                                    Boolean(checked),
                                                )
                                            }
                                        />
                                        <span className="font-medium text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                            Global OJT Schedule
                                        </span>
                                    </div>
                                    <span className="size-2.5 shrink-0 rounded-full bg-blue-600" />
                                </label>

                                {/* ⚪ Standard 8:00 AM */}
                                <label className="group flex cursor-pointer items-center justify-between select-none">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={showStandardSchedule}
                                            onCheckedChange={(checked) =>
                                                setShowStandardSchedule(
                                                    Boolean(checked),
                                                )
                                            }
                                        />
                                        <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                                            Standard 8:00 AM
                                        </span>
                                    </div>
                                    <span className="size-2.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                                </label>

                                {/* ☕ Rest Days */}
                                <label className="group flex cursor-pointer items-center justify-between select-none">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={showRestDays}
                                            onCheckedChange={(checked) =>
                                                setShowRestDays(
                                                    Boolean(checked),
                                                )
                                            }
                                        />
                                        <span className="font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                                            Rest Days
                                        </span>
                                    </div>
                                    <span className="size-2.5 shrink-0 rounded-full border bg-muted-foreground/30" />
                                </label>
                            </div>
                        </Card>
                    </div>

                    {/* ── Main Area: Grid View / Table View ───────────────────── */}
                    <div className="space-y-4 lg:col-span-9">
                        {view === 'grid' ? (
                            /* ── GOOGLE CALENDAR GRID VIEW ────────────────────────── */
                            <Card className="overflow-hidden border shadow-xs">
                                <div className="flex flex-col">
                                    {/* Weekday Column Headers */}
                                    <div className="grid grid-cols-7 border-b bg-muted/40 text-center">
                                        {WEEKDAY_NAMES.map((name, i) => (
                                            <div
                                                key={`head-${name}`}
                                                className={cn(
                                                    'border-r py-2.5 text-[11px] font-semibold tracking-wider uppercase last:border-r-0 sm:text-xs',
                                                    i === 0 || i === 6
                                                        ? 'text-muted-foreground/60'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {name}
                                            </div>
                                        ))}
                                    </div>

                                    {/* 7-Column Spacious Calendar Grid */}
                                    <div className="grid grid-cols-7 divide-x divide-y divide-border/60 bg-background">
                                        {days.map((day) => {
                                            // Check visibility based on filters
                                            let isVisible = true;
                                            if (
                                                !showRestDays &&
                                                !day.is_workday
                                            )
                                                isVisible = false;
                                            if (
                                                !showHteSchedule &&
                                                day.source_type ===
                                                    'hte_override'
                                            )
                                                isVisible = false;
                                            if (
                                                !showGlobalSchedule &&
                                                day.source_type ===
                                                    'global_schedule'
                                            )
                                                isVisible = false;
                                            if (
                                                !showStandardSchedule &&
                                                day.source_type ===
                                                    'default_schedule' &&
                                                day.is_workday
                                            )
                                                isVisible = false;

                                            const isDayHighlighted =
                                                highlightDate === day.date ||
                                                (highlightPeriod !== null &&
                                                    day.period_id ===
                                                        highlightPeriod);

                                            return (
                                                <button
                                                    key={`grid-day-${day.date}`}
                                                    id={`grid-day-${day.date}`}
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenDay(day)
                                                    }
                                                    className={cn(
                                                        'group relative flex min-h-[95px] cursor-pointer flex-col justify-between overflow-hidden p-2 text-left transition-all hover:bg-muted/30 sm:min-h-[115px]',
                                                        !day.is_current_month &&
                                                            'bg-muted/15 opacity-40 hover:opacity-70',
                                                        day.is_today &&
                                                            'bg-primary/5 ring-1 ring-primary/40 ring-inset',
                                                        isDayHighlighted &&
                                                            'bg-primary/10 font-medium shadow-md ring-2 ring-primary dark:bg-primary/20',
                                                    )}
                                                >
                                                    {/* Day number */}
                                                    <div className="mb-1 flex w-full items-center justify-between">
                                                        <span
                                                            className={cn(
                                                                'flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-transform sm:size-6.5',
                                                                day.is_today
                                                                    ? 'bg-primary font-bold text-primary-foreground shadow-xs'
                                                                    : day.is_current_month
                                                                      ? 'text-foreground'
                                                                      : 'text-muted-foreground/60',
                                                            )}
                                                        >
                                                            {day.day_number}
                                                        </span>

                                                        <div className="flex items-center gap-1">
                                                            {isDayHighlighted && (
                                                                <Badge className="animate-pulse gap-0.5 bg-primary px-1 py-0 text-[8px] font-bold text-primary-foreground uppercase">
                                                                    <Sparkles className="size-2.5" />{' '}
                                                                    Focus
                                                                </Badge>
                                                            )}
                                                            {day.is_today && (
                                                                <span className="hidden pr-1 text-[9px] font-bold tracking-wider text-primary uppercase sm:inline-block">
                                                                    Today
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Event Chip */}
                                                    {isVisible && (
                                                        <div className="mt-auto w-full">
                                                            {day.is_workday ? (
                                                                <div
                                                                    className={cn(
                                                                        'flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium shadow-2xs transition-all',
                                                                        day.source_type ===
                                                                            'hte_override'
                                                                            ? 'border-l-3 border-l-purple-600 bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:border-l-purple-400 dark:text-purple-300'
                                                                            : day.source_type ===
                                                                                'global_schedule'
                                                                              ? 'border-l-3 border-l-blue-600 bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:border-l-blue-400 dark:text-blue-300'
                                                                              : 'border-l-3 border-l-slate-400 bg-muted/80 text-foreground hover:bg-muted dark:border-l-slate-500',
                                                                    )}
                                                                >
                                                                    <span className="truncate font-bold tabular-nums">
                                                                        {
                                                                            day.expected_start_time_formatted
                                                                        }
                                                                    </span>
                                                                    {day.source_type ===
                                                                        'hte_override' && (
                                                                        <span className="hidden truncate text-[9px] font-semibold opacity-85 sm:inline-block">
                                                                            HTE
                                                                        </span>
                                                                    )}
                                                                    {day.source_type ===
                                                                        'global_schedule' && (
                                                                        <span className="hidden truncate text-[9px] font-semibold opacity-85 sm:inline-block">
                                                                            Global
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex w-full items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                    <Coffee className="size-2.5 shrink-0 opacity-60" />
                                                                    <span className="truncate">
                                                                        Rest Day
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            /* ── TABLE VIEW (With NumberedPagination matching existing pages) ── */
                            <Card className="overflow-hidden border shadow-xs">
                                <CardHeader className="border-b bg-card px-4 py-3 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-semibold">
                                            Schedule Roster for {monthLabel}
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground">
                                            {paginatedDays.total} total days
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex flex-col justify-between p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="pl-6 font-semibold">
                                                    Date
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Day
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Expected Arrival
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Schedule Type
                                                </TableHead>
                                                <TableHead className="pr-6 text-center font-semibold">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredTableDays.map((day) => {
                                                const isDayHighlighted =
                                                    highlightDate ===
                                                        day.date ||
                                                    (highlightPeriod !== null &&
                                                        day.period_id ===
                                                            highlightPeriod);

                                                return (
                                                    <TableRow
                                                        key={`table-row-${day.date}`}
                                                        id={`table-row-${day.date}`}
                                                        className={cn(
                                                            'transition-colors hover:bg-muted/40',
                                                            isDayHighlighted &&
                                                                'bg-primary/10 font-medium ring-2 ring-primary/40 dark:bg-primary/20',
                                                        )}
                                                    >
                                                        <TableCell className="pl-6 font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {day.date}
                                                                </span>
                                                                {isDayHighlighted && (
                                                                    <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                        <Sparkles className="size-3" />{' '}
                                                                        Focus
                                                                    </Badge>
                                                                )}
                                                                {day.is_today && (
                                                                    <StatusBadge
                                                                        status="today"
                                                                        label="Today"
                                                                        className="border-primary py-0 text-[10px] font-bold text-primary"
                                                                    />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs text-muted-foreground">
                                                            {day.day_name}
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs font-semibold tabular-nums">
                                                            {day.is_workday ? (
                                                                <span className="text-foreground">
                                                                    {
                                                                        day.expected_start_time_formatted
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="font-normal text-muted-foreground/60">
                                                                    Rest Day
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <StatusBadge
                                                                status={
                                                                    !day.is_workday
                                                                        ? 'rest_day'
                                                                        : day.source_type
                                                                }
                                                                label={
                                                                    day.is_workday
                                                                        ? day.source_label
                                                                        : 'Rest Days'
                                                                }
                                                                className="text-xs font-medium"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="pr-6 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs font-medium"
                                                                onClick={() =>
                                                                    handleOpenDay(
                                                                        day,
                                                                    )
                                                                }
                                                            >
                                                                View Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>

                                    {/* Numbered Pagination */}
                                    <div className="py-3">
                                        <NumberedPagination
                                            meta={paginatedDays}
                                            itemLabel="schedule day"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="intern-schedule-per-page"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Day Details Modal ────────────────────────────────────────── */}
            <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
                <DialogContent className="gap-4 p-6 sm:max-w-md">
                    {selectedDay && (
                        <>
                            <DialogHeader className="border-b pr-8 pb-2 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge
                                        status={
                                            selectedDay.source_type ===
                                            'hte_override'
                                                ? 'hte_override'
                                                : selectedDay.source_type ===
                                                    'global_schedule'
                                                  ? 'global_schedule'
                                                  : selectedDay.is_workday
                                                    ? 'work_day'
                                                    : 'rest_day'
                                        }
                                        label={
                                            selectedDay.source_type ===
                                            'hte_override'
                                                ? 'HTE Time Schedule'
                                                : selectedDay.source_type ===
                                                    'global_schedule'
                                                  ? 'Global OJT Schedule'
                                                  : selectedDay.is_workday
                                                    ? 'Work Day'
                                                    : 'Rest Day'
                                        }
                                        className="px-2.5 py-0.5 text-xs"
                                    />

                                    {selectedDay.is_today && (
                                        <StatusBadge
                                            status="today"
                                            label="Today"
                                            className="border-primary text-xs font-bold text-primary"
                                        />
                                    )}
                                </div>

                                <DialogTitle className="mt-2 text-xl font-bold text-foreground">
                                    {selectedDay.day_name}, {selectedDay.date}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-3 py-1">
                                {/* Expected Arrival Time Display */}
                                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3.5">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                'shrink-0 rounded-lg p-2',
                                                selectedDay.is_workday
                                                    ? selectedDay.source_type ===
                                                      'hte_override'
                                                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                        : 'bg-primary/10 text-primary'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {selectedDay.is_workday ? (
                                                <Clock className="size-5" />
                                            ) : (
                                                <Coffee className="size-5" />
                                            )}
                                        </div>
                                        <div>
                                            <span className="block text-xs font-medium text-muted-foreground">
                                                Expected Check-in Time
                                            </span>
                                            <strong className="text-lg font-bold text-foreground">
                                                {selectedDay.is_workday
                                                    ? selectedDay.expected_start_time_formatted
                                                    : 'No Check-in Required'}
                                            </strong>
                                        </div>
                                    </div>

                                    {selectedDay.is_workday && (
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            ({selectedDay.expected_start_time})
                                        </span>
                                    )}
                                </div>

                                {/* Active Schedule Period Specifications (Only shown for configured HTE / Global periods) */}
                                {selectedDay.period_name && (
                                    <div className="space-y-2 rounded-xl border p-3.5 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Schedule Type:
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {selectedDay.source_label}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">
                                                Period Name:
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {selectedDay.period_name}
                                            </span>
                                        </div>

                                        {selectedDay.period_start_date &&
                                            selectedDay.period_end_date && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">
                                                        Effective Dates:
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {
                                                            selectedDay.period_start_date
                                                        }{' '}
                                                        –{' '}
                                                        {
                                                            selectedDay.period_end_date
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                        {selectedDay.period_updated_at_human && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    Last Updated:
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {
                                                        selectedDay.period_updated_at_human
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="border-t pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setDayModalOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

InternSchedule.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Work Schedule', href: '/intern/schedule' },
    ],
};
