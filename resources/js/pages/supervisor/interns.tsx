import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
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
    time_in: string;
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

type SortField = 'date' | 'name';
type SortDirection = 'asc' | 'desc';

interface Filters {
    from: string;
    to: string;
    search: string;
    sort: SortField;
    direction: SortDirection;
}

interface MyInternsProps {
    logs: AttendanceLogRow[];
    accumulatedHours: AccumulatedHoursRow[];
    mode: 'month' | 'range';
    month: string | null;
    monthLabel: string | null;
    canGoNextMonth: boolean;
    internCount: number;
    filters: Filters;
}

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
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

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, { preserveState: true, preserveScroll: true });
    };

    const goToMonth = (targetMonth: string) => {
        visit({ month: targetMonth, search: filters.search || undefined, sort: filters.sort, direction: filters.direction });
    };

    const applyRange = (e: FormEvent) => {
        e.preventDefault();

        if (!fromDraft || !toDraft) {
            return;
        }

        visit({
            from: fromDraft,
            to: toDraft,
            search: filters.search || undefined,
            sort: filters.sort,
            direction: filters.direction,
        });
    };

    const clearRange = () => {
        setFromDraft('');
        setToDraft('');
        visit({ search: filters.search || undefined, sort: filters.sort, direction: filters.direction });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        const base = mode === 'range' ? { from: filters.from, to: filters.to } : { month: month ?? undefined };
        visit({ ...base, search: search || undefined, sort: filters.sort, direction: filters.direction });
    };

    const toggleSort = (field: SortField) => {
        const direction: SortDirection =
            filters.sort === field && filters.direction === 'asc' ? 'desc' : 'asc';

        const base = mode === 'range' ? { from: filters.from, to: filters.to } : { month: month ?? undefined };
        visit({ ...base, search: filters.search || undefined, sort: field, direction });
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
                    <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                        <form onSubmit={applySearch} className="flex items-end gap-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="search" className="text-xs text-muted-foreground">
                                    Filter by name
                                </Label>
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Intern name"
                                    className="w-48"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">
                                Apply
                            </Button>
                        </form>

                        <form onSubmit={applyRange} className="flex flex-wrap items-end gap-2">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="from" className="text-xs text-muted-foreground">
                                    From
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
                                    To
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
                                View range
                            </Button>
                            {mode === 'range' && (
                                <Button type="button" variant="ghost" size="sm" onClick={clearRange}>
                                    <X className="size-3.5" />
                                    Clear
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {mode === 'range' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Accumulated Hours — {filters.from} to {filters.to}
                            </CardTitle>
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
                                            className="flex items-center justify-between rounded-lg border px-3 py-2"
                                        >
                                            <span className="text-sm">{row.intern_name}</span>
                                            <span className="text-sm font-semibold tabular-nums">
                                                {row.total_hours.toFixed(2)} hrs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        {mode === 'month' && month ? (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => goToMonth(shiftMonth(month, -1))}>
                                    <ChevronLeft />
                                </Button>
                                <CardTitle className="min-w-32 text-center text-base">{monthLabel}</CardTitle>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!canGoNextMonth}
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        ) : (
                            <CardTitle className="text-base">
                                {filters.from} – {filters.to}
                            </CardTitle>
                        )}
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for this {mode === 'month' ? 'month' : 'range'}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
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
                                                    Name {sortIcon('name')}
                                                </button>
                                            </th>
                                            <th className="py-2 pr-4 font-medium">Time In</th>
                                            <th className="py-2 pr-4 font-medium">Time Out</th>
                                            <th className="py-2 pr-4 font-medium">Hours</th>
                                            <th className="py-2 pr-4 font-medium">Lunch Deducted</th>
                                            <th className="py-2 font-medium">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr
                                                key={`${log.intern_user_id}-${log.date}`}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4">
                                                    {log.date}
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        {log.day.slice(0, 3)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">{log.intern_name}</td>
                                                <td className="py-2 pr-4">{log.time_in}</td>
                                                <td className="py-2 pr-4">{log.time_out ?? '—'}</td>
                                                <td className="py-2 pr-4 tabular-nums">
                                                    {log.hours_rendered.toFixed(2)}
                                                </td>
                                                <td className="py-2 pr-4">{log.lunch_deducted ? 'Yes' : 'No'}</td>
                                                <td className="py-2">
                                                    <Badge variant={log.punctuality === 'on_time' ? 'default' : 'destructive'}>
                                                        {log.punctuality === 'on_time' ? 'On Time' : 'Late'}
                                                    </Badge>
                                                    {log.status === 'open' && (
                                                        <Badge variant="outline" className="ml-1">
                                                            No time-out
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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