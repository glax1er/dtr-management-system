import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    LayoutGrid,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { AttendanceBadge } from '@/components/ui/badges/attendance-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';

interface AttendanceLogRow {
    date: string;
    day: string;
    intern_user_id: number;
    intern_name: string;
    time_in: string | null;
    time_out: string | null;
    hours_rendered: number;
    lunch_deducted: boolean;
    status: 'open' | 'missing_time_in' | 'no_record' | 'complete';
    punctuality:
        'on_time' | 'late' | 'missing_time_in' | 'no_record' | 'unscheduled';
    raw_scan_count: number;
}

interface AccumulatedHoursRow {
    intern_user_id: number;
    intern_name: string;
    total_hours: number;
}

type SortField = 'date' | 'name';
type SortDirection = 'asc' | 'desc';
type RemarksFilter =
    'on_time' | 'late' | 'missing_time_in' | 'no_record' | 'open';
type ViewMode = 'table' | 'grid';

const REMARKS_OPTIONS: { value: RemarksFilter; label: string }[] = [
    { value: 'on_time', label: 'On Time' },
    { value: 'late', label: 'Late' },
    { value: 'missing_time_in', label: 'Missing Time In' },
    { value: 'no_record', label: 'No Record' },
    { value: 'open', label: 'No time-out yet' },
];

interface Filters {
    from: string;
    to: string;
    search: string;
    remarks: RemarksFilter | null;
    sort: SortField;
    direction: SortDirection;
    per_page: number;
}

interface MyInternsProps {
    logs: Paginated<AttendanceLogRow>;
    accumulatedHours: AccumulatedHoursRow[];
    mode: 'month' | 'range';
    month: string | null;
    monthLabel: string | null;
    canGoNextMonth: boolean;
    internCount: number;
    filters: Filters;
    scopeName?: string;
}

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatLongDate(dateStr: string, day: string): string {
    const monthDayYear = formatMonthDayYear(dateStr);

    return `${day}, ${monthDayYear}`;
}

function formatMonthDayYear(dateStr: string): string {
    const [year, month, date] = dateStr.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, date));

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(parsed);
}

function formatLongDateRange(from: string, to: string): string {
    return `${formatMonthDayYear(from)} â€“ ${formatMonthDayYear(to)}`;
}

function formatLongTime(time: string | null): string {
    return time ? time.trim() : 'â€”';
}

function formatLongDuration(hours: number): string {
    if (hours <= 0) {
        return 'â€”';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];

    if (wholeHours > 0) {
        parts.push(`${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`);
    }

    if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 minutes';
}

export default function MyInterns({
    logs,
    accumulatedHours,
    mode,
    month,
    monthLabel,
    canGoNextMonth,
    internCount,
    filters,
    scopeName,
}: MyInternsProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [fromDraft, setFromDraft] = useState(filters.from);
    const [toDraft, setToDraft] = useState(filters.to);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const hasActiveFilters =
        filters.search !== '' || filters.remarks !== null || mode === 'range';

    const visit = (params: Record<string, string | undefined>, replace = true) => {
        router.get('/supervisor/interns', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    const baseParams = () => ({
        ...(mode === 'range'
            ? { from: filters.from, to: filters.to }
            : { month: month ?? undefined }),
        search: search || undefined,
        remarks: filters.remarks ?? undefined,
        sort: filters.sort,
        direction: filters.direction,
        per_page: String(filters.per_page),
    });

    // Automatically trigger search as user types
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        if (debouncedSearch !== (filters.search || '')) {
            visit({
                ...baseParams(),
                search: debouncedSearch || undefined,
                page: undefined,
            });
        }
    // Navigation helpers intentionally remain local to preserve current filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const goToMonth = (targetMonth: string) => {
        visit({
            ...baseParams(),
            from: undefined,
            to: undefined,
            month: targetMonth,
        });
    };

    const applyRange = (e: FormEvent) => {
        e.preventDefault();

        if (!fromDraft || !toDraft) {
            return;
        }

        visit({
            ...baseParams(),
            from: fromDraft,
            to: toDraft,
            month: undefined,
        });
    };

    const clearRange = () => {
        setFromDraft('');
        setToDraft('');
        visit({
            ...baseParams(),
            from: undefined,
            to: undefined,
            month: undefined,
        });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined, page: undefined });
    };

    const applyRemarks = (value: string) => {
        visit({
            ...baseParams(),
            remarks: value === 'all' ? undefined : (value as RemarksFilter),
            page: undefined,
        });
    };

    const clearAllFilters = () => {
        setSearch('');
        setFromDraft('');
        setToDraft('');
        visit({
            sort: filters.sort,
            direction: filters.direction,
            per_page: String(filters.per_page),
        });
    };

    const toggleSort = (field: SortField) => {
        const direction: SortDirection =
            filters.sort === field && filters.direction === 'asc'
                ? 'desc'
                : 'asc';

        visit({ ...baseParams(), sort: field, direction });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });
    };

    const sortIcon = (field: SortField) => {
        if (filters.sort !== field) {
            return (
                <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground" />
            );
        }

        return filters.direction === 'asc' ? (
            <ArrowUp className="ml-1 inline size-3.5" />
        ) : (
            <ArrowDown className="ml-1 inline size-3.5" />
        );
    };

    return (
        <>
            <Head title="My Interns" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="size-5" />
                            </span>
                            My Interns
                        </h1>
                        <p className="mt-1 ml-[3.25rem] text-sm text-muted-foreground">
                            {internCount}{' '}
                            {internCount === 1 ? 'intern' : 'interns'}
                            {scopeName ? ` â€¢ ${scopeName}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by nameâ€¦"
                                className="h-9 w-48 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile search toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        {/* Remarks filter */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.remarks ?? 'all'}
                                onValueChange={applyRemarks}
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All remarks" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All remarks
                                    </SelectItem>
                                    {REMARKS_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={filters.remarks ?? 'all'}
                                onValueChange={applyRemarks}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">
                                        All remarks
                                    </SelectItem>
                                    {REMARKS_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month Selector in Month mode */}
                        {mode === 'month' && month && (
                            <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                        goToMonth(shiftMonth(month, -1))
                                    }
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <span className="px-2 text-xs font-medium sm:text-sm">
                                    {monthLabel}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={!canGoNextMonth}
                                    onClick={() =>
                                        goToMonth(shiftMonth(month, 1))
                                    }
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        )}

                        {/* View toggle â€” desktop only */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger value="table">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Mobile inline search */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by nameâ€¦"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSearch();
                                        setMobileSearchOpen(false);
                                    }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" size="sm">
                            Search
                        </Button>
                    </form>
                )}

                {/* Date range filter card / Active filters */}
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
                    <form
                        onSubmit={applyRange}
                        className="flex w-full flex-wrap items-center gap-2 sm:gap-2.5 lg:w-auto"
                    >
                        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Calendar className="size-3.5" /> Date range:
                        </span>
                        <div className="flex w-full min-w-0 flex-1 items-center gap-1.5 sm:w-auto sm:flex-initial">
                            <div className="min-w-0 flex-1 sm:w-44 sm:flex-initial">
                                <DatePicker
                                    date={fromDraft}
                                    onDateChange={(d) => setFromDraft(d)}
                                    placeholder="From date"
                                    maxDate={toDraft || undefined}
                                    className="h-9 text-xs sm:text-sm"
                                    clearable
                                />
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                to
                            </span>
                            <div className="min-w-0 flex-1 sm:w-44 sm:flex-initial">
                                <DatePicker
                                    date={toDraft}
                                    onDateChange={(d) => setToDraft(d)}
                                    placeholder="To date"
                                    minDate={fromDraft || undefined}
                                    className="h-9 text-xs sm:text-sm"
                                    clearable
                                    align="end"
                                />
                            </div>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <Button
                                type="submit"
                                size="sm"
                                variant="secondary"
                                disabled={!fromDraft || !toDraft}
                                className="h-9 flex-1 px-3 text-xs sm:flex-initial sm:text-sm"
                            >
                                Apply Range
                            </Button>
                            {mode === 'range' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearRange}
                                    className="h-9 flex-1 px-3 text-xs text-muted-foreground hover:text-foreground sm:flex-initial sm:text-sm"
                                >
                                    Switch to Month
                                </Button>
                            )}
                        </div>
                    </form>

                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2 border-t pt-2 lg:border-t-0 lg:pt-0">
                            <span className="shrink-0 text-xs text-muted-foreground">
                                Active:
                            </span>
                            {filters.search !== '' && (
                                <Badge
                                    variant="secondary"
                                    className="text-xs font-normal"
                                >
                                    Name: {filters.search}
                                </Badge>
                            )}
                            {mode === 'range' && (
                                <Badge
                                    variant="secondary"
                                    className="text-xs font-normal"
                                >
                                    {filters.from} to {filters.to}
                                </Badge>
                            )}
                            {filters.remarks !== null && (
                                <Badge
                                    variant="secondary"
                                    className="text-xs font-normal"
                                >
                                    {
                                        REMARKS_OPTIONS.find(
                                            (o) => o.value === filters.remarks,
                                        )?.label
                                    }
                                </Badge>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="mr-1 size-3" />
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>

                {/* Accumulated hours in Range mode */}
                {mode === 'range' && (
                    <Card>
                        <CardHeader className="px-6 py-4">
                            <CardTitle className="text-base font-semibold">
                                Accumulated Hours
                            </CardTitle>
                            <CardDescription>
                                {formatLongDateRange(filters.from, filters.to)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            {accumulatedHours.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    No interns match the current filter.
                                </p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {accumulatedHours.map((row) => (
                                        <div
                                            key={row.intern_user_id}
                                            className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 shadow-2xs"
                                        >
                                            <span className="text-sm font-medium">
                                                {row.intern_name}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {formatLongDuration(
                                                    row.total_hours,
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Attendance Logs Content */}
                {logs.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No attendance logs recorded for this{' '}
                            {mode === 'month' ? 'month' : 'range'}.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table View â€” desktop */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="flex-1">
                                    <CardHeader className="flex flex-row items-center justify-between ">
                                        <CardTitle className="text-base font-semibold">
                                            Attendance Logs
                                        </CardTitle>
                                        {mode === 'range' && (
                                            <span className="text-xs text-muted-foreground">
                                                {formatLongDateRange(
                                                    filters.from,
                                                    filters.to,
                                                )}
                                            </span>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="px-6">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleSort(
                                                                    'date',
                                                                )
                                                            }
                                                            className="inline-flex items-center font-semibold hover:text-foreground"
                                                        >
                                                            Date{' '}
                                                            {sortIcon('date')}
                                                        </button>
                                                    </TableHead>
                                                    <TableHead className="px-6">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleSort(
                                                                    'name',
                                                                )
                                                            }
                                                            className="inline-flex items-center font-semibold hover:text-foreground"
                                                        >
                                                            Intern{' '}
                                                            {sortIcon('name')}
                                                        </button>
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Time In
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Time Out
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Hours Rendered
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Remarks
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {logs.data.map((log) => (
                                                    <TableRow
                                                        key={`${log.intern_user_id}-${log.date}`}
                                                    >
                                                        <TableCell className="px-6 font-medium whitespace-nowrap">
                                                            {formatLongDate(
                                                                log.date,
                                                                log.day,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 font-medium text-foreground">
                                                            {log.intern_name}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap text-muted-foreground">
                                                            {formatLongTime(
                                                                log.time_in,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap text-muted-foreground">
                                                            {formatLongTime(
                                                                log.time_out,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center font-medium whitespace-nowrap">
                                                            {formatLongDuration(
                                                                log.hours_rendered,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <div className="flex flex-wrap justify-center gap-1">
                                                                {log.punctuality && (
                                                                    <AttendanceBadge
                                                                        status={
                                                                            log.punctuality
                                                                        }
                                                                    />
                                                                )}
                                                                {log.status ===
                                                                    'open' && (
                                                                    <AttendanceBadge status="open" />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid View â€” desktop */}
                        {view === 'grid' && (
                            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                                {logs.data.map((log) => (
                                    <Card
                                        key={`${log.intern_user_id}-${log.date}`}
                                        className="flex flex-col justify-between"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="truncate text-base font-semibold">
                                                        {log.intern_name}
                                                    </CardTitle>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {formatLongDate(
                                                            log.date,
                                                            log.day,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-wrap gap-1">
                                                    {log.punctuality && (
                                                        <AttendanceBadge
                                                            status={
                                                                log.punctuality
                                                            }
                                                        />
                                                    )}
                                                    {log.status === 'open' && (
                                                        <AttendanceBadge status="open" />
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 pt-0 text-xs text-muted-foreground">
                                            <div className="flex items-center justify-between border-t pt-2">
                                                <span>Time In:</span>
                                                <span className="font-medium text-foreground">
                                                    {formatLongTime(
                                                        log.time_in,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Time Out:</span>
                                                <span className="font-medium text-foreground">
                                                    {formatLongTime(
                                                        log.time_out,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Hours Rendered:</span>
                                                <span className="font-semibold text-foreground">
                                                    {formatLongDuration(
                                                        log.hours_rendered,
                                                    )}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Mobile List View */}
                        <div className="divide-y rounded-lg border bg-card sm:hidden">
                            {logs.data.map((log) => (
                                <div
                                    key={`${log.intern_user_id}-${log.date}`}
                                    className="flex flex-col gap-2.5 p-4"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-foreground">
                                                {log.intern_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatLongDate(
                                                    log.date,
                                                    log.day,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-1">
                                            {log.punctuality && (
                                                <AttendanceBadge
                                                    status={log.punctuality}
                                                />
                                            )}
                                            {log.status === 'open' && (
                                                <AttendanceBadge status="open" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 rounded-md border bg-muted/30 p-2 text-center text-xs text-muted-foreground">
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">
                                                Time In
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {formatLongTime(log.time_in)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">
                                                Time Out
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {formatLongTime(log.time_out)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">
                                                Hours
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {formatLongDuration(
                                                    log.hours_rendered,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <NumberedPagination
                            meta={logs}
                            itemLabel="record"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="attendance-logs-per-page"
                        />
                    </>
                )}
            </div>
        </>
    );
}

MyInterns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Interns', href: '/supervisor/interns' },
    ],
};
