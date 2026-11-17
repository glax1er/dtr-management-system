import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    History,
    LayoutGrid,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    UserCheck,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { ResolutionTicketsNav } from '@/components/resolution-tickets-nav';
import {
    ScanPhotoDialog
    
} from '@/components/scan-photo-dialog';
import type {ScanPhotoDialogData} from '@/components/scan-photo-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AttendanceBadge } from '@/components/ui/badges/attendance-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';

export type ResolvedTicketRow = {
    id: number;
    intern_user_id: number;
    intern_name: string;
    intern_id_number?: string | null;
    intern_profile_photo_url?: string | null;
    date: string;
    type: 'missing_time_in' | 'open' | 'no_record';
    status: 'approved' | 'rejected' | 'cancelled';
    proposed_time_in: string | null;
    proposed_time_out: string | null;
    final_time_in: string | null;
    final_time_out: string | null;
    reason: string;
    rejection_reason?: string | null;
    resolved_by_name: string;
    resolved_at?: string | null;
    resolved_at_relative?: string | null;
    created_at?: string | null;
    time_in_photo_url?: string | null;
    time_in_scanned_at?: string | null;
    time_out_photo_url?: string | null;
    time_out_scanned_at?: string | null;
};

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'approved' | 'rejected' | 'cancelled';
type TypeFilter = 'all' | 'missing_time_in' | 'open' | 'no_record';

interface Filters {
    search: string;
    status: StatusFilter;
    type: TypeFilter;
    per_page: number;
}

interface ResolutionTicketLogsProps {
    tickets: Paginated<ResolvedTicketRow>;
    totalResolved: number;
    totalApproved?: number;
    totalRejected?: number;
    totalCancelled?: number;
    totalPending?: number;
    totalSnapshots?: number;
    filters?: Filters;
}

const buildParams = (
    search: string,
    status: StatusFilter,
    type: TypeFilter,
    perPage: number,
): Record<string, string | undefined> => ({
    search: search || undefined,
    status: status && status !== 'all' ? status : undefined,
    type: type && type !== 'all' ? type : undefined,
    per_page: String(perPage),
});

export default function ResolutionTicketLogs({
    tickets,
    totalResolved = tickets.total,
    totalApproved = 0,
    totalRejected = 0,
    totalPending = 0,
    totalSnapshots = 0,
    filters = { search: '', status: 'all', type: 'all', per_page: 20 },
}: ResolutionTicketLogsProps) {
    const getInitials = useInitials();
    const [search, setSearch] = useState<string>(() => filters.search || '');
    const [view, setView] = useState<ViewMode>('table');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [photoModalData, setPhotoModalData] =
        useState<ScanPhotoDialogData | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/supervisor/resolution-tickets/logs', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        if (debouncedSearch !== (filters.search || '')) {
            visit({
                ...buildParams(
                    search,
                    filters.status,
                    filters.type,
                    filters.per_page,
                ),
                search: debouncedSearch || undefined,
                page: undefined,
            });
        }
    }, [
        debouncedSearch,
        filters.search,
        filters.status,
        filters.type,
        filters.per_page,
        search,
    ]);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...buildParams(
                search,
                filters.status,
                filters.type,
                filters.per_page,
            ),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({
            ...buildParams(
                '',
                filters.status,
                filters.type,
                filters.per_page,
            ),
            search: undefined,
            page: undefined,
        });
    };

    const changeStatus = (value: StatusFilter) => {
        visit({
            ...buildParams(search, value, filters.type, filters.per_page),
            page: undefined,
        });
    };

    const changeType = (value: TypeFilter) => {
        visit({
            ...buildParams(search, filters.status, value, filters.per_page),
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit(
            {
                ...buildParams(
                    search,
                    filters.status,
                    filters.type,
                    filters.per_page,
                ),
                page: String(page),
            },
            false,
        );
    };

    const changePerPage = (perPage: number) => {
        visit({
            ...buildParams(
                search,
                filters.status,
                filters.type,
                perPage,
            ),
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(
        filters.search ||
            (filters.status && filters.status !== 'all') ||
            (filters.type && filters.type !== 'all'),
    );

    const clearAllFilters = () => {
        setSearch('');
        visit({ per_page: String(filters.per_page) });
    };

    const renderStatusBadge = (status: ResolvedTicketRow['status']) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Approved
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="gap-1 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20">
                        <XCircle className="size-3" />
                        Rejected
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <AlertCircle className="size-3" />
                        Cancelled
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title="Resolution Ticket Logs" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <History className="size-5" />
                            </span>
                            Resolution Ticket Logs
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            History of previously resolved and cancelled attendance correction requests.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge
                            variant="secondary"
                            className="shrink-0 px-3 py-1 text-xs font-semibold"
                        >
                            {totalResolved} Resolved Total
                        </Badge>
                        {totalApproved > 0 && (
                            <Badge
                                variant="outline"
                                className="hidden shrink-0 border-emerald-500/30 bg-emerald-500/5 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 sm:inline-flex dark:text-emerald-400"
                            >
                                {totalApproved} Approved
                            </Badge>
                        )}
                        {totalRejected > 0 && (
                            <Badge
                                variant="outline"
                                className="hidden shrink-0 border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive sm:inline-flex"
                            >
                                {totalRejected} Rejected
                            </Badge>
                        )}

                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search intern, reason, resolver…"
                                className="h-9 w-64 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(v) => changeStatus(v as StatusFilter)}
                        >
                            <SelectTrigger className="h-9 w-36 sm:w-40">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.type || 'all'}
                            onValueChange={(v) => changeType(v as TypeFilter)}
                        >
                            <SelectTrigger className="h-9 w-40 sm:w-44">
                                <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
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

                {/* Sub-Navigation Tabs */}
                <ResolutionTicketsNav
                    currentTab="logs"
                    totalPending={totalPending}
                    totalResolved={totalResolved}
                    totalSnapshots={totalSnapshots}
                />

                {/* Mobile Inline Search */}
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
                                placeholder="Search logs…"
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

                {/* Active Filters Pill List */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">
                            Active:
                        </span>
                        {filters.search && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Search: {filters.search}
                            </Badge>
                        )}
                        {filters.status && filters.status !== 'all' && (
                            <Badge variant="secondary" className="text-xs font-normal capitalize">
                                Status: {filters.status}
                            </Badge>
                        )}
                        {filters.type && filters.type !== 'all' && (
                            <Badge variant="secondary" className="text-xs font-normal">
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
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            <History className="mx-auto mb-3 size-10 opacity-30" />
                            <p className="font-medium text-foreground">No resolution ticket logs found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try clearing your filters or search criteria.'
                                    : 'Previously approved or rejected resolution requests will appear here.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table View — Desktop */}
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
                                                        Discrepancy
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Proposed
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Final Resolved
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">
                                                        Scan Snapshots
                                                    </TableHead>
                                                    <TableHead className="px-6 font-semibold">
                                                        Reason / Resolution
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tickets.data.map((ticket) => (
                                                    <TableRow
                                                        key={ticket.id}
                                                        className="transition-colors hover:bg-muted/40"
                                                    >
                                                        {/* Intern Name & Info */}
                                                        <TableCell className="px-6 font-medium whitespace-nowrap text-foreground">
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="size-8 shrink-0">
                                                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                                        {getInitials(ticket.intern_name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-medium leading-none text-foreground">
                                                                        {ticket.intern_name}
                                                                    </p>
                                                                    {ticket.intern_id_number && (
                                                                        <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                                                                            {ticket.intern_id_number}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Ticket Date */}
                                                        <TableCell className="px-6 whitespace-nowrap text-muted-foreground">
                                                            {ticket.date}
                                                        </TableCell>

                                                        {/* Discrepancy Type */}
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <AttendanceBadge status={ticket.type} />
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            {renderStatusBadge(ticket.status)}
                                                        </TableCell>

                                                        {/* Proposed In / Out */}
                                                        <TableCell className="px-6 text-center font-medium whitespace-nowrap text-foreground">
                                                            <div className="text-xs">
                                                                <div>
                                                                    <span className="text-[10px] text-muted-foreground">In: </span>
                                                                    <span>{ticket.proposed_time_in ?? '—'}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] text-muted-foreground">Out: </span>
                                                                    <span>{ticket.proposed_time_out ?? '—'}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Final Resolved In / Out */}
                                                        <TableCell className="px-6 text-center font-medium whitespace-nowrap text-foreground">
                                                            {ticket.status === 'approved' ? (
                                                                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {ticket.final_time_in && (
                                                                        <div>In: {ticket.final_time_in}</div>
                                                                    )}
                                                                    {ticket.final_time_out && (
                                                                        <div>Out: {ticket.final_time_out}</div>
                                                                    )}
                                                                    {!ticket.final_time_in && !ticket.final_time_out && '—'}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>

                                                        {/* Scan Snapshots Taken at Kiosk */}
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {ticket.time_in_photo_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPhotoModalData({
                                                                                internName: ticket.intern_name,
                                                                                idNumber: ticket.intern_id_number,
                                                                                label: 'time_in',
                                                                                scannedAt: ticket.time_in_scanned_at
                                                                                    ? `${ticket.date} ${ticket.time_in_scanned_at}`
                                                                                    : ticket.date,
                                                                                capturedPhotoUrl: ticket.time_in_photo_url!,
                                                                                profilePhotoUrl: ticket.intern_profile_photo_url,
                                                                            })
                                                                        }
                                                                        className="group relative flex size-8 items-center justify-center overflow-hidden rounded-md border border-emerald-500/30 bg-muted hover:border-emerald-500 hover:shadow-xs"
                                                                        title="View Time In scan snapshot"
                                                                    >
                                                                        <img
                                                                            src={ticket.time_in_photo_url}
                                                                            alt="Time In scan"
                                                                            className="size-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                            <Camera className="size-3 text-white" />
                                                                        </div>
                                                                    </button>
                                                                )}

                                                                {ticket.time_out_photo_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setPhotoModalData({
                                                                                internName: ticket.intern_name,
                                                                                idNumber: ticket.intern_id_number,
                                                                                label: 'time_out',
                                                                                scannedAt: ticket.time_out_scanned_at
                                                                                    ? `${ticket.date} ${ticket.time_out_scanned_at}`
                                                                                    : ticket.date,
                                                                                capturedPhotoUrl: ticket.time_out_photo_url!,
                                                                                profilePhotoUrl: ticket.intern_profile_photo_url,
                                                                            })
                                                                        }
                                                                        className="group relative flex size-8 items-center justify-center overflow-hidden rounded-md border border-sky-500/30 bg-muted hover:border-sky-500 hover:shadow-xs"
                                                                        title="View Time Out scan snapshot"
                                                                    >
                                                                        <img
                                                                            src={ticket.time_out_photo_url}
                                                                            alt="Time Out scan"
                                                                            className="size-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                            <Camera className="size-3 text-white" />
                                                                        </div>
                                                                    </button>
                                                                )}

                                                                {!ticket.time_in_photo_url && !ticket.time_out_photo_url && (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {/* Reason & Resolution Detail */}
                                                        <TableCell className="max-w-xs px-6">
                                                            <div className="space-y-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="cursor-default truncate text-xs text-foreground">
                                                                            <span className="font-medium text-muted-foreground">Reason: </span>
                                                                            {ticket.reason}
                                                                        </p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-sm [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap">
                                                                        {ticket.reason}
                                                                    </TooltipContent>
                                                                </Tooltip>

                                                                {ticket.rejection_reason && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <p className="cursor-default truncate text-xs text-destructive">
                                                                                <span className="font-semibold">Rejection: </span>
                                                                                {ticket.rejection_reason}
                                                                            </p>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-sm [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap text-destructive">
                                                                            {ticket.rejection_reason}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                    <UserCheck className="size-3 shrink-0" />
                                                                    <span>{ticket.resolved_by_name}</span>
                                                                    {ticket.resolved_at && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span title={ticket.resolved_at}>
                                                                                {ticket.resolved_at_relative || ticket.resolved_at}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
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
                                            idPrefix="resolution-ticket-logs-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid View — Desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:flex sm:flex-col sm:gap-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {tickets.data.map((ticket) => (
                                        <Card
                                            key={ticket.id}
                                            className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border hover:shadow-md"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <Avatar className="size-9 shrink-0">
                                                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                                {getInitials(ticket.intern_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <CardTitle className="line-clamp-1 text-base font-semibold text-foreground">
                                                                {ticket.intern_name}
                                                            </CardTitle>
                                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>{ticket.date}</span>
                                                                {ticket.intern_id_number && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="font-mono">{ticket.intern_id_number}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        {renderStatusBadge(ticket.status)}
                                                        <AttendanceBadge status={ticket.type} />
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="flex-1 space-y-3 pb-3 text-sm">
                                                {/* Proposed vs Resolved times */}
                                                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                                                    <div>
                                                        <span className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                                            Proposed
                                                        </span>
                                                        <span className="mt-0.5 block text-foreground">
                                                            In: <span className="font-semibold">{ticket.proposed_time_in ?? '—'}</span>
                                                        </span>
                                                        <span className="block text-foreground">
                                                            Out: <span className="font-semibold">{ticket.proposed_time_out ?? '—'}</span>
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                                            Resolved
                                                        </span>
                                                        {ticket.status === 'approved' ? (
                                                            <div className="text-emerald-600 dark:text-emerald-400">
                                                                <span className="mt-0.5 block">
                                                                    In: <span className="font-semibold">{ticket.final_time_in ?? '—'}</span>
                                                                </span>
                                                                <span className="block">
                                                                    Out: <span className="font-semibold">{ticket.final_time_out ?? '—'}</span>
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="mt-1 block text-muted-foreground italic">
                                                                {ticket.status === 'rejected' ? 'Rejected' : 'Cancelled'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Scan Snapshots taken during scanning */}
                                                {(ticket.time_in_photo_url || ticket.time_out_photo_url) && (
                                                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-xs">
                                                        <span className="block text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                                                            Scan Snapshots at Kiosk
                                                        </span>
                                                        <div className="mt-1.5 flex items-center gap-2">
                                                            {ticket.time_in_photo_url && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPhotoModalData({
                                                                            internName: ticket.intern_name,
                                                                            idNumber: ticket.intern_id_number,
                                                                            label: 'time_in',
                                                                            scannedAt: ticket.time_in_scanned_at
                                                                                ? `${ticket.date} ${ticket.time_in_scanned_at}`
                                                                                : ticket.date,
                                                                            capturedPhotoUrl: ticket.time_in_photo_url!,
                                                                            profilePhotoUrl: ticket.intern_profile_photo_url,
                                                                        })
                                                                    }
                                                                    className="group relative flex size-10 items-center justify-center overflow-hidden rounded-md border border-emerald-500/30 bg-muted hover:border-emerald-500 hover:shadow-xs"
                                                                    title="Time In scan snapshot"
                                                                >
                                                                    <img
                                                                        src={ticket.time_in_photo_url}
                                                                        alt="Time In scan"
                                                                        className="size-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                        <Camera className="size-3.5 text-white" />
                                                                    </div>
                                                                </button>
                                                            )}
                                                            {ticket.time_out_photo_url && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPhotoModalData({
                                                                            internName: ticket.intern_name,
                                                                            idNumber: ticket.intern_id_number,
                                                                            label: 'time_out',
                                                                            scannedAt: ticket.time_out_scanned_at
                                                                                ? `${ticket.date} ${ticket.time_out_scanned_at}`
                                                                                : ticket.date,
                                                                            capturedPhotoUrl: ticket.time_out_photo_url!,
                                                                            profilePhotoUrl: ticket.intern_profile_photo_url,
                                                                        })
                                                                    }
                                                                    className="group relative flex size-10 items-center justify-center overflow-hidden rounded-md border border-sky-500/30 bg-muted hover:border-sky-500 hover:shadow-xs"
                                                                    title="Time Out scan snapshot"
                                                                >
                                                                    <img
                                                                        src={ticket.time_out_photo_url}
                                                                        alt="Time Out scan"
                                                                        className="size-full object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                        <Camera className="size-3.5 text-white" />
                                                                    </div>
                                                                </button>
                                                            )}
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Click to inspect photo verification
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Intern Reason */}
                                                {ticket.reason && (
                                                    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground italic">
                                                        <p className="line-clamp-2 [overflow-wrap:anywhere] break-words [word-break:break-word]">
                                                            &ldquo;{ticket.reason}&rdquo;
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Rejection Reason if rejected */}
                                                {ticket.rejection_reason && (
                                                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                                                        <span className="font-semibold">Rejection reason: </span>
                                                        <p className="mt-0.5 line-clamp-2 [overflow-wrap:anywhere] break-words [word-break:break-word]">
                                                            {ticket.rejection_reason}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>

                                            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                                <span className="text-[11px] text-muted-foreground">
                                                    Ticket #{ticket.id}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                    <UserCheck className="size-3 shrink-0" />
                                                    <span className="truncate max-w-[120px]">{ticket.resolved_by_name}</span>
                                                    {ticket.resolved_at_relative && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{ticket.resolved_at_relative}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>

                                <NumberedPagination
                                    meta={tickets}
                                    itemLabel="ticket"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="resolution-ticket-logs-grid-per-page"
                                />
                            </div>
                        )}

                        {/* Mobile Cards List */}
                        <div className="flex flex-col gap-4 sm:hidden">
                            <div className="divide-y rounded-lg border bg-card">
                                {tickets.data.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex flex-col gap-3 p-4 transition-colors"
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
                                            <div className="flex flex-col items-end gap-1">
                                                {renderStatusBadge(ticket.status)}
                                                <AttendanceBadge status={ticket.type} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground">Proposed</span>
                                                <span className="block font-medium text-foreground">
                                                    In: {ticket.proposed_time_in ?? '—'}
                                                </span>
                                                <span className="block font-medium text-foreground">
                                                    Out: {ticket.proposed_time_out ?? '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground">Resolved</span>
                                                {ticket.status === 'approved' ? (
                                                    <span className="block font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {ticket.final_time_in || ticket.final_time_out
                                                            ? `${ticket.final_time_in ?? '—'} - ${ticket.final_time_out ?? '—'}`
                                                            : 'Approved'}
                                                    </span>
                                                ) : (
                                                    <span className="block text-muted-foreground italic capitalize">
                                                        {ticket.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile Snapshots */}
                                        {(ticket.time_in_photo_url || ticket.time_out_photo_url) && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">Scan Photos:</span>
                                                {ticket.time_in_photo_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPhotoModalData({
                                                                internName: ticket.intern_name,
                                                                idNumber: ticket.intern_id_number,
                                                                label: 'time_in',
                                                                scannedAt: ticket.time_in_scanned_at
                                                                    ? `${ticket.date} ${ticket.time_in_scanned_at}`
                                                                    : ticket.date,
                                                                capturedPhotoUrl: ticket.time_in_photo_url!,
                                                                profilePhotoUrl: ticket.intern_profile_photo_url,
                                                            })
                                                        }
                                                        className="flex size-7 items-center justify-center rounded-md border border-emerald-500/30 bg-muted text-emerald-600"
                                                        title="View Time In photo"
                                                    >
                                                        <Camera className="size-3.5" />
                                                    </button>
                                                )}
                                                {ticket.time_out_photo_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPhotoModalData({
                                                                internName: ticket.intern_name,
                                                                idNumber: ticket.intern_id_number,
                                                                label: 'time_out',
                                                                scannedAt: ticket.time_out_scanned_at
                                                                    ? `${ticket.date} ${ticket.time_out_scanned_at}`
                                                                    : ticket.date,
                                                                capturedPhotoUrl: ticket.time_out_photo_url!,
                                                                profilePhotoUrl: ticket.intern_profile_photo_url,
                                                            })
                                                        }
                                                        className="flex size-7 items-center justify-center rounded-md border border-sky-500/30 bg-muted text-sky-600"
                                                        title="View Time Out photo"
                                                    >
                                                        <Camera className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {ticket.reason && (
                                            <p className="rounded-md bg-muted/10 p-2 text-xs text-muted-foreground italic">
                                                &ldquo;{ticket.reason}&rdquo;
                                            </p>
                                        )}

                                        {ticket.rejection_reason && (
                                            <p className="rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                                                <span className="font-semibold">Rejection: </span>
                                                {ticket.rejection_reason}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                                            <span>Ticket #{ticket.id}</span>
                                            <span>{ticket.resolved_by_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <NumberedPagination
                                meta={tickets}
                                itemLabel="ticket"
                                onPageChange={goToPage}
                                onPerPageChange={changePerPage}
                                idPrefix="resolution-ticket-logs-mobile-per-page"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Snapshot Photo Modal */}
            <ScanPhotoDialog
                open={Boolean(photoModalData)}
                onOpenChange={(open) => !open && setPhotoModalData(null)}
                data={photoModalData}
            />
        </>
    );
}

ResolutionTicketLogs.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resolution Tickets', href: '/supervisor/resolution-tickets' },
        { title: 'Resolution Logs', href: '/supervisor/resolution-tickets/logs' },
    ],
};
