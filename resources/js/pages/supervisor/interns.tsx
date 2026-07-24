import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    status: 'open' | 'complete';
    punctuality: 'on_time' | 'late';
    raw_scan_count: number;
}

interface AccumulatedHoursRow {
    intern_user_id: number;
    intern_name: string;
    total_hours: number;
}

interface PaginatedLogs {
    data: AttendanceLogRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

type SortField = 'date' | 'name';
type SortDirection = 'asc' | 'desc';

interface Filters {
    from: string;
    to: string;
    search: string;
    sort: SortField;
    direction: SortDirection;
    per_page: number;
}

interface MyInternsProps {
    logs: PaginatedLogs;
    accumulatedHours: AccumulatedHoursRow[];
    mode: 'month' | 'range';
    month: string | null;
    monthLabel: string | null;
    canGoNextMonth: boolean;
    internCount: number;
    filters: Filters;
}

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** "2026-07-24" + "Friday" → "Friday, July 24, 2026" — reads naturally
 * instead of the raw ISO date. */
function formatLongDate(dateStr: string, day: string): string {
    const monthDayYear = formatMonthDayYear(dateStr);

    return `${day}, ${monthDayYear}`;
}

/** "2026-07-24" → "July 24, 2026" */
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

/** "2026-07-01", "2026-07-30" → "July 1, 2026 – July 30, 2026" */
function formatLongDateRange(from: string, to: string): string {
    return `${formatMonthDayYear(from)} – ${formatMonthDayYear(to)}`;
}

/** "08:03:00" → "8:03 AM" — a 12-hour clock reads faster than 24-hour
 * time with seconds most people never need. */
function formatLongTime(time: string | null): string {
    if (!time) {
        return '—';
    }

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** 8.5 → "8 hours 30 minutes" — spelled out instead of a bare decimal
 * that forces the reader to do the minutes math themselves. */
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
}: MyInternsProps) {
    const [search, setSearch] = useState(filters.search);
    const [fromDraft, setFromDraft] = useState(filters.from);
    const [toDraft, setToDraft] = useState(filters.to);
    const [perPageDraft, setPerPageDraft] = useState(String(filters.per_page));

    const hasActiveFilters = filters.search !== '' || mode === 'range';

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, { preserveState: true, preserveScroll: true });
    };

    // Base params shared by every navigation action (month vs. range,
    // search, sort). Anything that changes what rows match resets back
    // to page 1 by simply omitting the page param.
    const baseParams = () => ({
        ...(mode === 'range' ? { from: filters.from, to: filters.to } : { month: month ?? undefined }),
        search: filters.search || undefined,
        sort: filters.sort,
        direction: filters.direction,
        per_page: String(filters.per_page),
    });

    const goToMonth = (targetMonth: string) => {
        visit({ ...baseParams(), from: undefined, to: undefined, month: targetMonth });
    };

    const applyRange = (e: FormEvent) => {
        e.preventDefault();

        if (!fromDraft || !toDraft) {
            return;
        }

        visit({ ...baseParams(), from: fromDraft, to: toDraft, month: undefined });
    };

    const clearRange = () => {
        setFromDraft('');
        setToDraft('');
        visit({ ...baseParams(), from: undefined, to: undefined, month: undefined });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearAllFilters = () => {
        setSearch('');
        setFromDraft('');
        setToDraft('');
        visit({ sort: filters.sort, direction: filters.direction, per_page: String(filters.per_page) });
    };

    const toggleSort = (field: SortField) => {
        const direction: SortDirection =
            filters.sort === field && filters.direction === 'asc' ? 'desc' : 'asc';

        visit({ ...baseParams(), sort: field, direction });
    };

    const commitPerPage = () => {
        const parsed = parseInt(perPageDraft, 10);
        const clamped = Number.isNaN(parsed)
            ? filters.per_page
            : Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, parsed));

        setPerPageDraft(String(clamped));

        if (clamped === filters.per_page) {
            return;
        }

        visit({ ...baseParams(), per_page: String(clamped) });
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > logs.last_page) {
            return;
        }

        visit({ ...baseParams(), page: String(page) });
    };

    const sortIcon = (field: SortField) => {
        if (filters.sort !== field) {
            return <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground" />;
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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        My Interns
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Attendance log for {internCount} intern{internCount === 1 ? '' : 's'} assigned to your HTE.
                    </p>
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-5 pt-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
                            <form onSubmit={applySearch} className="flex items-end gap-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="search" className="text-xs text-muted-foreground">
                                        Search by intern name
                                    </Label>
                                    <Input
                                        id="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="e.g. Juan Dela Cruz"
                                        className="w-52"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="sm">
                                    Search
                                </Button>
                            </form>

                            <form onSubmit={applyRange} className="flex flex-wrap items-end gap-2">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="from" className="text-xs text-muted-foreground">
                                        From date
                                    </Label>
                                    <Input
                                        id="from"
                                        type="date"
                                        value={fromDraft}
                                        onChange={(e) => setFromDraft(e.target.value)}
                                        max={toDraft || undefined}
                                        className="w-40"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="to" className="text-xs text-muted-foreground">
                                        To date
                                    </Label>
                                    <Input
                                        id="to"
                                        type="date"
                                        value={toDraft}
                                        onChange={(e) => setToDraft(e.target.value)}
                                        min={fromDraft || undefined}
                                        className="w-40"
                                    />
                                </div>
                                <Button type="submit" size="sm" disabled={!fromDraft || !toDraft}>
                                    View date range
                                </Button>
                            </form>
                        </div>

                        {hasActiveFilters && (
                            <div className="flex items-center gap-2 border-t pt-3">
                                <span className="text-xs text-muted-foreground">Active filters:</span>
                                {filters.search !== '' && (
                                    <Badge variant="secondary" className="font-normal">
                                        Name: {filters.search}
                                    </Badge>
                                )}
                                {mode === 'range' && (
                                    <Badge variant="secondary" className="font-normal">
                                        {filters.from} to {filters.to}
                                    </Badge>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={mode === 'range' && filters.search === '' ? clearRange : clearAllFilters}
                                    className="h-6 px-2 text-xs text-muted-foreground"
                                >
                                    <X className="size-3" />
                                    Clear all
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {mode === 'range' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Accumulated Hours</CardTitle>
                            <CardDescription>
                                {formatLongDateRange(filters.from, filters.to)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {accumulatedHours.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    No interns match the current filter.
                                </p>
                            ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {accumulatedHours.map((row) => (
                                        <div
                                            key={row.intern_user_id}
                                            className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                                        >
                                            <span className="text-sm">{row.intern_name}</span>
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

                <Card className="flex-1">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base">Attendance Logs</CardTitle>
                            {mode === 'range' && (
                                <CardDescription>
                                    {formatLongDateRange(filters.from, filters.to)}
                                </CardDescription>
                            )}
                        </div>
                        {mode === 'month' && month && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => goToMonth(shiftMonth(month, -1))}>
                                    <ChevronLeft />
                                </Button>
                                <span className="min-w-32 text-center text-sm font-medium">{monthLabel}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!canGoNextMonth}
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {logs.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for this {mode === 'month' ? 'month' : 'range'}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort('date')}
                                                    className="inline-flex items-center hover:text-foreground"
                                                >
                                                    Date {sortIcon('date')}
                                                </button>
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort('name')}
                                                    className="inline-flex items-center hover:text-foreground"
                                                >
                                                    Intern {sortIcon('name')}
                                                </button>
                                            </th>
                                            <th className="py-2 pr-4 font-medium">Time In</th>
                                            <th className="py-2 pr-4 font-medium">Time Out</th>
                                            <th className="py-2 pr-4 font-medium">Hours Rendered</th>
                                            <th className="py-2 pr-4 font-medium">Lunch Deducted</th>
                                            <th className="py-2 font-medium">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.data.map((log) => (
                                            <tr
                                                key={`${log.intern_user_id}-${log.date}`}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongDate(log.date, log.day)}
                                                </td>
                                                <td className="py-2.5 pr-4">{log.intern_name}</td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">{formatLongTime(log.time_in)}</td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">{formatLongTime(log.time_out)}</td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongDuration(log.hours_rendered)}
                                                </td>
                                                <td className="py-2.5 pr-4">{log.lunch_deducted ? 'Yes' : 'No'}</td>
                                                <td className="py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {log.punctuality === 'on_time' ? (
                                                            <Badge className="border-transparent bg-green-600 text-white dark:bg-green-600/80">
                                                                On Time
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Late</Badge>
                                                        )}
                                                        {!log.time_in && (
                                                            <Badge variant="outline">No time-in yet</Badge>
                                                        )}
                                                        {log.status === 'open' && (
                                                            <Badge variant="outline">No time-out yet</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {logs.total > 0 && (
                            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span>
                                        Showing {logs.from}–{logs.to} of {logs.total} entr{logs.total === 1 ? 'y' : 'ies'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="per-page" className="text-xs whitespace-nowrap">
                                            Rows per page
                                        </Label>
                                        <Input
                                            id="per-page"
                                            type="number"
                                            inputMode="numeric"
                                            min={MIN_PER_PAGE}
                                            max={MAX_PER_PAGE}
                                            value={perPageDraft}
                                            onChange={(e) => setPerPageDraft(e.target.value)}
                                            onBlur={commitPerPage}
                                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitPerPage();
                                                }
                                            }}
                                            className="h-8 w-[4.5rem]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={logs.current_page <= 1}
                                        onClick={() => goToPage(logs.current_page - 1)}
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        Previous
                                    </Button>
                                    <span className="min-w-24 text-center text-sm text-muted-foreground">
                                        Page {logs.current_page} of {logs.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={logs.current_page >= logs.last_page}
                                        onClick={() => goToPage(logs.current_page + 1)}
                                    >
                                        Next
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
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