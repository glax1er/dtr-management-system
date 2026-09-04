import { Head, router } from '@inertiajs/react';
import {
    FileWarning,
    LayoutGrid,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { TicketActions } from '@/components/approve-ticket-dialog';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { AttendanceBadge } from '@/components/ui/badges/attendance-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';

type ResolutionTicketRow = {
    id: number;
    intern_name: string;
    date: string;
    type: 'missing_time_in' | 'open' | 'no_record';
    proposed_time_in: string | null;
    proposed_time_out: string | null;
    reason: string;
};

type ViewMode = 'table' | 'grid';
type TypeFilter = 'all' | 'missing_time_in' | 'open' | 'no_record';

interface Filters {
    search: string;
    type: TypeFilter;
    per_page: number;
}

type ResolutionTicketsProps = {
    tickets: Paginated<ResolutionTicketRow>;
    totalPending?: number;
    filters?: Filters;
};

export default function ResolutionTickets({
    tickets,
    totalPending = tickets.total,
    filters = { search: '', type: 'all', per_page: 20 },
}: ResolutionTicketsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [view, setView] = useState<ViewMode>('table');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    const baseParams = () => ({
        search: search || undefined,
        type: filters.type && filters.type !== 'all' ? filters.type : undefined,
        per_page: String(filters.per_page),
    });

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/supervisor/resolution-tickets', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

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
    }, [debouncedSearch]);

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
        visit({
            ...baseParams(),
            search: undefined,
            page: undefined,
        });
    };

    const changeType = (value: TypeFilter) => {
        visit({
            ...baseParams(),
            type: value === 'all' ? undefined : value,
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) }, false);
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });
    };

    const hasActiveFilters = Boolean(
        filters.search || (filters.type && filters.type !== 'all'),
    );

    const clearAllFilters = () => {
        setSearch('');
        visit({ per_page: String(filters.per_page) });
    };

    return (
        <>
            <Head title="Resolution Tickets" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <FileWarning className="size-5" />
                            </span>
                            Resolution Tickets
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pending requests from interns for missing Time
                            In/Out on their DTR.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="shrink-0 px-3 py-1 text-xs font-semibold"
                        >
                            {tickets.total} Pending
                        </Badge>
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
                                placeholder="Search tickets…"
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

                        {/* Type filter dropdown */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(v) =>
                                    changeType(v as TypeFilter)
                                }
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    <SelectItem value="missing_time_in">
                                        Missing Time In
                                    </SelectItem>
                                    <SelectItem value="open">
                                        No Time Out
                                    </SelectItem>
                                    <SelectItem value="no_record">
                                        No Record
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(v) =>
                                    changeType(v as TypeFilter)
                                }
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    <SelectItem value="missing_time_in">
                                        Missing Time In
                                    </SelectItem>
                                    <SelectItem value="open">
                                        No Time Out
                                    </SelectItem>
                                    <SelectItem value="no_record">
                                        No Record
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View toggle — desktop only */}
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
                                placeholder="Search tickets…"
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

                {/* Active filters pill list */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">
                            Active:
                        </span>
                        {filters.search && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                            >
                                Search: {filters.search}
                            </Badge>
                        )}
                        {filters.type && filters.type !== 'all' && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                            >
                                Type:{' '}
                                {filters.type === 'missing_time_in'
                                    ? 'Missing Time In'
                                    : filters.type === 'open'
                                      ? 'No Time Out'
                                      : 'No Record'}
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear all
                        </Button>
                    </div>
                )}

                {/* Content */}
                {tickets.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            {hasActiveFilters
                                ? 'No requests match your current filters.'
                                : 'No pending resolution requests.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table — desktop only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="px-6 font-semibold">
                                                        Intern
                                                    </TableHead>
                                                    <TableHead className="px-6 font-semibold">
                                                        Date
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Type
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Proposed In
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Proposed Out
                                                    </TableHead>
                                                    <TableHead className="px-6 font-semibold">
                                                        Reason
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tickets.data.map((ticket) => (
                                                    <TableRow key={ticket.id}>
                                                        <TableCell className="px-6 font-medium whitespace-nowrap text-foreground">
                                                            {ticket.intern_name}
                                                        </TableCell>
                                                        <TableCell className="px-6 whitespace-nowrap text-muted-foreground">
                                                            {ticket.date}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <AttendanceBadge
                                                                status={
                                                                    ticket.type
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center font-medium whitespace-nowrap text-foreground">
                                                            {ticket.proposed_time_in ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center font-medium whitespace-nowrap text-foreground">
                                                            {ticket.proposed_time_out ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs px-6">
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <p className="cursor-default truncate text-muted-foreground">
                                                                        {
                                                                            ticket.reason
                                                                        }
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-sm [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap">
                                                                    {
                                                                        ticket.reason
                                                                    }
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <TicketActions
                                                                ticketId={
                                                                    ticket.id
                                                                }
                                                                type={
                                                                    ticket.type
                                                                }
                                                                proposedTimeIn={
                                                                    ticket.proposed_time_in
                                                                }
                                                                proposedTimeOut={
                                                                    ticket.proposed_time_out
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={tickets}
                                            itemLabel="ticket"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="resolution-tickets-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:flex sm:flex-col sm:gap-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {tickets.data.map((ticket) => (
                                        <Card
                                            key={ticket.id}
                                            className="flex flex-col justify-between"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <CardTitle className="truncate text-base font-semibold">
                                                            {ticket.intern_name}
                                                        </CardTitle>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {ticket.date}
                                                        </p>
                                                    </div>
                                                    <AttendanceBadge
                                                        status={ticket.type}
                                                    />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3 pt-0 text-xs">
                                                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-2.5">
                                                    <div>
                                                        <span className="block text-[10px] text-muted-foreground">
                                                            Proposed In
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            {ticket.proposed_time_in ??
                                                                '—'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] text-muted-foreground">
                                                            Proposed Out
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            {ticket.proposed_time_out ??
                                                                '—'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {ticket.reason && (
                                                    <p className="line-clamp-3 rounded-md bg-muted/20 p-2 [overflow-wrap:anywhere] break-words [word-break:break-word] text-muted-foreground italic">
                                                        &ldquo;{ticket.reason}
                                                        &rdquo;
                                                    </p>
                                                )}

                                                <div className="flex justify-end border-t pt-1">
                                                    <TicketActions
                                                        ticketId={ticket.id}
                                                        type={ticket.type}
                                                        proposedTimeIn={
                                                            ticket.proposed_time_in
                                                        }
                                                        proposedTimeOut={
                                                            ticket.proposed_time_out
                                                        }
                                                        className="justify-end"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <NumberedPagination
                                    meta={tickets}
                                    itemLabel="ticket"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="resolution-tickets-grid-per-page"
                                />
                            </div>
                        )}

                        {/* Mobile cards list */}
                        <div className="flex flex-col gap-4 sm:hidden">
                            <div className="divide-y rounded-lg border bg-card">
                                {tickets.data.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex flex-col gap-3 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {ticket.intern_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {ticket.date}
                                                </p>
                                            </div>
                                            <AttendanceBadge
                                                status={ticket.type}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    Proposed In
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {ticket.proposed_time_in ??
                                                        '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground">
                                                    Proposed Out
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {ticket.proposed_time_out ??
                                                        '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {ticket.reason && (
                                            <p className="rounded-md bg-muted/10 p-2 text-xs [overflow-wrap:anywhere] break-words [word-break:break-word] text-muted-foreground italic">
                                                &ldquo;{ticket.reason}&rdquo;
                                            </p>
                                        )}

                                        <div className="flex justify-end pt-1">
                                            <TicketActions
                                                ticketId={ticket.id}
                                                type={ticket.type}
                                                proposedTimeIn={
                                                    ticket.proposed_time_in
                                                }
                                                proposedTimeOut={
                                                    ticket.proposed_time_out
                                                }
                                                className="justify-end"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <NumberedPagination
                                meta={tickets}
                                itemLabel="ticket"
                                onPageChange={goToPage}
                                onPerPageChange={changePerPage}
                                idPrefix="resolution-tickets-mobile-per-page"
                            />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

ResolutionTickets.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resolution Tickets', href: '/supervisor/resolution-tickets' },
    ],
};
