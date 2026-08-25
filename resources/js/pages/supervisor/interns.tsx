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
import type { FormEvent } from 'react';
import PaginationFooter from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


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
    logs: PaginatedLogs;
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

function formatLongTime(time: string | null): string {
    return time ? time.trim() : '—';
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
    scopeName,
}: MyInternsProps) {
    const [search, setSearch] = useState(filters.search);
    const [fromDraft, setFromDraft] = useState(filters.from);
    const [toDraft, setToDraft] = useState(filters.to);

    const hasActiveFilters =
        filters.search !== '' || filters.remarks !== null || mode === 'range';

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Base params shared by every navigation action (month vs. range,
    // search, sort). Anything that changes what rows match resets back
    // to page 1 by simply omitting the page param.
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
        visit({ ...baseParams(), search: search || undefined });
    };

    const applyRemarks = (value: string) => {
        visit({
            ...baseParams(),
            remarks: value === 'all' ? undefined : value,
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
        visit({ ...baseParams(), per_page: String(perPage) });
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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                {/* CHANGED — title/subtitle + filters now sit directly on
                    the page, not inside a Card */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            My Interns
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {`Attendance log for ${internCount} intern${internCount === 1 ? '' : 's'} assigned to ${scopeName ?? 'your HTE'}.`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-end">
                        <form
                            onSubmit={applySearch}
                            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="search"
                                    className="text-xs text-muted-foreground"
                                >
                                    Search by intern name
                                </Label>
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="w-full sm:w-52"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="secondary"
                                size="sm"
                                className="w-full sm:w-auto"
                            >
                                Search
                            </Button>
                        </form>

                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="remarks-filter"
                                className="text-xs text-muted-foreground"
                            >
                                Filter by remarks
                            </Label>
                            <Select
                                value={filters.remarks ?? 'all'}
                                onValueChange={applyRemarks}
                            >
                                <SelectTrigger
                                    id="remarks-filter"
                                    size="sm"
                                    className="w-full sm:w-44"
                                >
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

                        <form
                            onSubmit={applyRange}
                            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2"
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="from"
                                    className="text-xs text-muted-foreground"
                                >
                                    From date
                                </Label>
                                <Input
                                    id="from"
                                    type="date"
                                    value={fromDraft}
                                    onChange={(e) =>
                                        setFromDraft(e.target.value)
                                    }
                                    max={toDraft || undefined}
                                    className="w-full sm:w-40"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="to"
                                    className="text-xs text-muted-foreground"
                                >
                                    To date
                                </Label>
                                <Input
                                    id="to"
                                    type="date"
                                    value={toDraft}
                                    onChange={(e) =>
                                        setToDraft(e.target.value)
                                    }
                                    min={fromDraft || undefined}
                                    className="w-full sm:w-40"
                                />
                            </div>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!fromDraft || !toDraft}
                                className="w-full sm:w-auto"
                            >
                                View date range
                            </Button>
                        </form>
                    </div>
                </div>

                {hasActiveFilters && (
                    <Card>
                        <CardContent className="flex flex-col gap-4">
                            {hasActiveFilters && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        Active filters:
                                    </span>
                                    {filters.search !== '' && (
                                        <Badge
                                            variant="secondary"
                                            className="font-normal"
                                        >
                                            Name: {filters.search}
                                        </Badge>
                                    )}
                                    {mode === 'range' && (
                                        <Badge
                                            variant="secondary"
                                            className="font-normal"
                                        >
                                            {filters.from} to {filters.to}
                                        </Badge>
                                    )}
                                    {filters.remarks !== null && (
                                        <Badge
                                            variant="secondary"
                                            className="font-normal"
                                        >
                                            Remarks:{' '}
                                            {
                                                REMARKS_OPTIONS.find(
                                                    (option) =>
                                                        option.value ===
                                                        filters.remarks,
                                                )?.label
                                            }
                                        </Badge>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={
                                            mode === 'range' &&
                                            filters.search === '' &&
                                            filters.remarks === null
                                                ? clearRange
                                                : clearAllFilters
                                        }
                                        className="h-6 px-2 text-xs text-muted-foreground"
                                    >
                                        <X className="size-3" />
                                        Clear all
                                    </Button>
                                </div>
                            )}

                            {mode === 'range' && (
                                <div
                                    className={
                                        hasActiveFilters ? 'border-t pt-4' : ''
                                    }
                                >
                                    <p className="text-sm font-medium">
                                        Accumulated Hours
                                    </p>
                                    <p className="mb-3 text-xs text-muted-foreground">
                                        {formatLongDateRange(
                                            filters.from,
                                            filters.to,
                                        )}
                                    </p>

                                    {accumulatedHours.length === 0 ? (
                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                            No interns match the current
                                            filter.
                                        </p>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {accumulatedHours.map((row) => (
                                                <div
                                                    key={row.intern_user_id}
                                                    className="flex flex-col justify-center rounded-lg border px-3 py-2.5"
                                                >
                                                    <span className="text-sm font-medium truncate">
                                                        {row.intern_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatLongDuration(
                                                            row.total_hours,
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card className="flex-1">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base">
                                Attendance Logs
                            </CardTitle>
                            {mode === 'range' && (
                                <CardDescription>
                                    {formatLongDateRange(
                                        filters.from,
                                        filters.to,
                                    )}
                                </CardDescription>
                            )}
                        </div>
                        {mode === 'month' && month && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        goToMonth(shiftMonth(month, -1))
                                    }
                                >
                                    <ChevronLeft />
                                </Button>
                                <span className="min-w-32 text-center text-sm font-medium">
                                    {monthLabel}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!canGoNextMonth}
                                    onClick={() =>
                                        goToMonth(shiftMonth(month, 1))
                                    }
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {logs.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for this{' '}
                                {mode === 'month' ? 'month' : 'range'}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-190 text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleSort('date')
                                                    }
                                                    className="inline-flex items-center hover:text-foreground"
                                                >
                                                    Date {sortIcon('date')}
                                                </button>
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleSort('name')
                                                    }
                                                    className="inline-flex items-center hover:text-foreground"
                                                >
                                                    Intern {sortIcon('name')}
                                                </button>
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Time In
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Time Out
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Hours Rendered
                                            </th>
                                            <th className="py-2 font-medium">
                                                Remarks
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.data.map((log) => (
                                            <tr
                                                key={`${log.intern_user_id}-${log.date}`}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongDate(
                                                        log.date,
                                                        log.day,
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-4">
                                                    {log.intern_name}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongTime(
                                                        log.time_in,
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongTime(
                                                        log.time_out,
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {formatLongDuration(
                                                        log.hours_rendered,
                                                    )}
                                                </td>
                                                <td className="py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {log.punctuality ===
                                                        'on_time' ? (
                                                            <Badge className="bg-green-100 text-green-400 border-green-500">
                                                                On Time
                                                            </Badge>
                                                        ) : log.punctuality ===
                                                          'unscheduled' ? (
                                                            <Badge className="bg-teal-100 text-teal-400 border-teal-500">
                                                                Unscheduled
                                                            </Badge>
                                                        ) : log.punctuality ===
                                                          'missing_time_in' ? (
                                                            <Badge className="bg-yellow-100 text-yellow-400 border-yellow-500">
                                                                Missing Time In
                                                            </Badge>
                                                        ) : log.punctuality ===
                                                          'no_record' ? (
                                                            <Badge className="bg-red-100 text-red-400 border-red-500">
                                                                No Record
                                                            </Badge>
                                                        ) : log.punctuality ===
                                                          'late' ? (
                                                            <Badge className="bg-orange-100 text-orange-400 border-orange-500">
                                                                Late
                                                            </Badge>
                                                        ) : null}
                                                        {log.status ===
                                                            'open' && (
                                                            <Badge className="bg-gray-100 text-gray-400 border-gray-500">
                                                                No time-out yet
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationFooter
                            meta={logs}
                            itemLabel="record"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="attendance-logs-per-page"
                        />
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
