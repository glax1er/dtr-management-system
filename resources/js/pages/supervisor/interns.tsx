import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    SlidersHorizontal,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    punctuality: 'on_time' | 'late' | 'missing_time_in' | 'no_record' | 'unscheduled';
    raw_scan_count: number;
}

interface AccumulatedHoursRow {
    intern_user_id: number;
    intern_name: string;
    total_hours: number;
}

type SortField = 'date' | 'name';
type SortDirection = 'asc' | 'desc';
type RemarksFilter = 'on_time' | 'late' | 'missing_time_in' | 'no_record' | 'open';

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
    return `${formatMonthDayYear(from)} – ${formatMonthDayYear(to)}`;
}

function formatLongTime(time: string | null): string {
    return time ? time.trim() : '—';
}

function formatLongDuration(hours: number): string {
    if (hours <= 0) {
        return '—';
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
    const [search, setSearch] = useState(filters.search);
    const [fromDraft, setFromDraft] = useState(filters.from);
    const [toDraft, setToDraft] = useState(filters.to);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const hasActiveFilters =
        filters.search !== '' || filters.remarks !== null || mode === 'range';

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const baseParams = () => ({
        ...(mode === 'range'
            ? { from: filters.from, to: filters.to }
            : { month: month ?? undefined }),
        search: filters.search || undefined,
        remarks: filters.remarks ?? undefined,
        sort: filters.sort,
        direction: filters.direction,
        per_page: String(filters.per_page),
    });

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
        visit({ ...baseParams(), search: search || undefined, page: undefined });
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
                        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Users className="size-5" />
                            </span>
                            My Interns
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Attendance log for {internCount} intern{internCount === 1 ? '' : 's'} assigned to {scopeName ?? 'your HTE'}.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name…"
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
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
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
                                    <SelectItem value="all">All remarks</SelectItem>
                                    {REMARKS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
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
                                    <SelectItem value="all">All remarks</SelectItem>
                                    {REMARKS_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
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
                                    onClick={() => goToMonth(shiftMonth(month, -1))}
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
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile inline search */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => { applySearch(e); setMobileSearchOpen(false); }}
                        className="flex items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name…"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { clearSearch(); setMobileSearchOpen(false); }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" size="sm">Search</Button>
                    </form>
                )}

                {/* Date range filter card / Active filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-xs">
                    <form onSubmit={applyRange} className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="size-3.5" /> Date range:
                        </span>
                        <div className="w-40">
                            <DatePicker
                                date={fromDraft}
                                onDateChange={(d) => setFromDraft(d)}
                                placeholder="From date"
                                maxDate={toDraft || undefined}
                                className="h-8 text-xs"
                            />
                        </div>
                        <span className="text-xs text-muted-foreground">to</span>
                        <div className="w-40">
                            <DatePicker
                                date={toDraft}
                                onDateChange={(d) => setToDraft(d)}
                                placeholder="To date"
                                minDate={fromDraft || undefined}
                                className="h-8 text-xs"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            variant="secondary"
                            disabled={!fromDraft || !toDraft}
                            className="h-8 text-xs"
                        >
                            Apply Range
                        </Button>
                        {mode === 'range' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearRange}
                                className="h-8 text-xs text-muted-foreground"
                            >
                                Switch to Month
                            </Button>
                        )}
                    </form>

                    {hasActiveFilters && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                                Active:
                            </span>
                            {filters.search !== '' && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    Name: {filters.search}
                                </Badge>
                            )}
                            {mode === 'range' && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    {filters.from} to {filters.to}
                                </Badge>
                            )}
                            {filters.remarks !== null && (
                                <Badge variant="secondary" className="font-normal text-xs">
                                    {REMARKS_OPTIONS.find((o) => o.value === filters.remarks)?.label}
                                </Badge>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-6 px-2 text-xs text-muted-foreground"
                            >
                                <X className="size-3 mr-1" />
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
                                            className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-background shadow-2xs"
                                        >
                                            <span className="text-sm font-medium">
                                                {row.intern_name}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {formatLongDuration(row.total_hours)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Attendance Log Table */}
                <Card className="flex-1">
                    <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                            Attendance Logs
                        </CardTitle>
                        {mode === 'range' && (
                            <span className="text-xs text-muted-foreground">
                                {formatLongDateRange(filters.from, filters.to)}
                            </span>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {logs.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for this {mode === 'month' ? 'month' : 'range'}.
                            </p>
                        ) : (
                            <>
                                {/* Table — desktop only */}
                                <div className="hidden sm:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSort('date')}
                                                        className="inline-flex items-center hover:text-foreground font-medium"
                                                    >
                                                        Date {sortIcon('date')}
                                                    </button>
                                                </TableHead>
                                                <TableHead className="px-6">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSort('name')}
                                                        className="inline-flex items-center hover:text-foreground font-medium"
                                                    >
                                                        Intern {sortIcon('name')}
                                                    </button>
                                                </TableHead>
                                                <TableHead className="px-6 text-center">Time In</TableHead>
                                                <TableHead className="px-6 text-center">Time Out</TableHead>
                                                <TableHead className="px-6 text-center">Hours Rendered</TableHead>
                                                <TableHead className="px-6 text-center">Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.data.map((log) => (
                                                <TableRow key={`${log.intern_user_id}-${log.date}`}>
                                                    <TableCell className="px-6 whitespace-nowrap font-medium">
                                                        {formatLongDate(log.date, log.day)}
                                                    </TableCell>
                                                    <TableCell className="px-6">
                                                        {log.intern_name}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center whitespace-nowrap">
                                                        {formatLongTime(log.time_in)}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center whitespace-nowrap">
                                                        {formatLongTime(log.time_out)}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center whitespace-nowrap">
                                                        {formatLongDuration(log.hours_rendered)}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center">
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {log.punctuality === 'on_time' && (
                                                                <Badge className="bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                    On Time
                                                                </Badge>
                                                            )}
                                                            {log.punctuality === 'unscheduled' && (
                                                                <Badge className="bg-teal-100 text-teal-600 border-teal-300 dark:bg-teal-950/40 dark:text-teal-400">
                                                                    Unscheduled
                                                                </Badge>
                                                            )}
                                                            {log.punctuality === 'missing_time_in' && (
                                                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400">
                                                                    Missing Time In
                                                                </Badge>
                                                            )}
                                                            {log.punctuality === 'no_record' && (
                                                                <Badge className="bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-400">
                                                                    No Record
                                                                </Badge>
                                                            )}
                                                            {log.punctuality === 'late' && (
                                                                <Badge className="bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400">
                                                                    Late
                                                                </Badge>
                                                            )}
                                                            {log.status === 'open' && (
                                                                <Badge variant="outline" className="text-muted-foreground border-dashed">
                                                                    No time-out yet
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Card list — mobile only */}
                                <div className="divide-y sm:hidden">
                                    {logs.data.map((log) => (
                                        <div
                                            key={`${log.intern_user_id}-${log.date}`}
                                            className="flex flex-col gap-2 p-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">
                                                    {log.intern_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatLongDate(log.date, log.day)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>In: {formatLongTime(log.time_in)}</span>
                                                <span>Out: {formatLongTime(log.time_out)}</span>
                                                <span>Hours: {formatLongDuration(log.hours_rendered)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {log.punctuality === 'on_time' && (
                                                    <Badge className="bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                        On Time
                                                    </Badge>
                                                )}
                                                {log.punctuality === 'unscheduled' && (
                                                    <Badge className="bg-teal-100 text-teal-600 border-teal-300 dark:bg-teal-950/40 dark:text-teal-400">
                                                        Unscheduled
                                                    </Badge>
                                                )}
                                                {log.punctuality === 'missing_time_in' && (
                                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400">
                                                        Missing Time In
                                                    </Badge>
                                                )}
                                                {log.punctuality === 'no_record' && (
                                                    <Badge className="bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-400">
                                                        No Record
                                                    </Badge>
                                                )}
                                                {log.punctuality === 'late' && (
                                                    <Badge className="bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400">
                                                        Late
                                                    </Badge>
                                                )}
                                                {log.status === 'open' && (
                                                    <Badge variant="outline" className="text-muted-foreground border-dashed">
                                                        No time-out yet
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pb-4">
                                    <NumberedPagination
                                        meta={logs}
                                        itemLabel="record"
                                        onPageChange={goToPage}
                                        onPerPageChange={changePerPage}
                                        idPrefix="attendance-logs-per-page"
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
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
