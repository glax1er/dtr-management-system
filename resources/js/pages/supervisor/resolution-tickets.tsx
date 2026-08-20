import { Head } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    FileWarning,
    LayoutGrid,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { TicketActions, badgeStyles } from '@/components/approve-ticket-dialog';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

type ResolutionTicketsProps = {
    tickets: ResolutionTicketRow[];
};

type ViewMode = 'table' | 'grid';
type TypeFilter = 'all' | 'missing_time_in' | 'open' | 'no_record';

const typeLabel: Record<ResolutionTicketRow['type'], string> = {
    missing_time_in: 'Missing Time In',
    open: 'No Time Out',
    no_record: 'No Record',
};

export default function ResolutionTickets({ tickets }: ResolutionTicketsProps) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [view, setView] = useState<ViewMode>('table');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            if (typeFilter !== 'all' && ticket.type !== typeFilter) {
                return false;
            }
            if (search.trim() !== '') {
                const query = search.toLowerCase();
                const nameMatch = ticket.intern_name.toLowerCase().includes(query);
                const reasonMatch = ticket.reason.toLowerCase().includes(query);
                const dateMatch = ticket.date.toLowerCase().includes(query);
                if (!nameMatch && !reasonMatch && !dateMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [tickets, search, typeFilter]);

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
                            Pending requests from interns for missing Time In/Out on their DTR.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <div className="relative hidden sm:block">
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
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Mobile search toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Type filter dropdown */}
                        <div className="hidden sm:block">
                            <Select
                                value={typeFilter}
                                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="missing_time_in">Missing Time In</SelectItem>
                                    <SelectItem value="open">No Time Out</SelectItem>
                                    <SelectItem value="no_record">No Record</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={typeFilter}
                                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">All types</SelectItem>
                                    <SelectItem value="missing_time_in">Missing Time In</SelectItem>
                                    <SelectItem value="open">No Time Out</SelectItem>
                                    <SelectItem value="no_record">No Record</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View toggle — desktop only */}
                        <div className="hidden sm:block">
                            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <TabsList>
                                    <TabsTrigger value="table"><TableIcon className="size-4" /></TabsTrigger>
                                    <TabsTrigger value="grid"><LayoutGrid className="size-4" /></TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs shrink-0">
                            {filteredTickets.length} Pending
                        </Badge>
                    </div>
                </div>

                {/* Mobile inline search */}
                {mobileSearchOpen && (
                    <div className="flex items-center gap-2 sm:hidden">
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
                                    onClick={() => { setSearch(''); setMobileSearchOpen(false); }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
                {filteredTickets.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            {tickets.length === 0 ? 'No pending resolution requests.' : 'No requests match your current filters.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table — desktop only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="flex-1">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="px-6 font-semibold">Intern</TableHead>
                                                    <TableHead className="px-6 font-semibold">Date</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Type</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Proposed In</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Proposed Out</TableHead>
                                                    <TableHead className="px-6 font-semibold">Reason</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTickets.map((ticket) => (
                                                    <TableRow key={ticket.id}>
                                                        <TableCell className="px-6 font-medium whitespace-nowrap text-foreground">
                                                            {ticket.intern_name}
                                                        </TableCell>
                                                        <TableCell className="px-6 whitespace-nowrap text-muted-foreground">
                                                            {ticket.date}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <Badge className={badgeStyles[ticket.type]}>
                                                                {typeLabel[ticket.type]}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap font-medium text-foreground">
                                                            {ticket.proposed_time_in ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap font-medium text-foreground">
                                                            {ticket.proposed_time_out ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="max-w-xs px-6">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <p className="truncate text-muted-foreground cursor-default">
                                                                        {ticket.reason}
                                                                    </p>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-sm">
                                                                    {ticket.reason}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <TicketActions
                                                                ticketId={ticket.id}
                                                                type={ticket.type}
                                                                proposedTimeIn={ticket.proposed_time_in}
                                                                proposedTimeOut={ticket.proposed_time_out}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTickets.map((ticket) => (
                                    <Card key={ticket.id} className="flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {ticket.intern_name}
                                                    </CardTitle>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{ticket.date}</p>
                                                </div>
                                                <Badge className={badgeStyles[ticket.type]}>
                                                    {typeLabel[ticket.type]}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-0 text-xs">
                                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5 border">
                                                <div>
                                                    <span className="block text-[10px] text-muted-foreground">Proposed In</span>
                                                    <span className="font-semibold text-foreground">{ticket.proposed_time_in ?? '—'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-muted-foreground">Proposed Out</span>
                                                    <span className="font-semibold text-foreground">{ticket.proposed_time_out ?? '—'}</span>
                                                </div>
                                            </div>

                                            {ticket.reason && (
                                                <p className="text-muted-foreground bg-muted/20 p-2 rounded-md italic">
                                                    "{ticket.reason}"
                                                </p>
                                            )}

                                            <div className="flex justify-end pt-1 border-t">
                                                <TicketActions
                                                    ticketId={ticket.id}
                                                    type={ticket.type}
                                                    proposedTimeIn={ticket.proposed_time_in}
                                                    proposedTimeOut={ticket.proposed_time_out}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Mobile cards list */}
                        <div className="divide-y rounded-lg border bg-card sm:hidden">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.id} className="flex flex-col gap-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-sm text-foreground">{ticket.intern_name}</p>
                                            <p className="text-xs text-muted-foreground">{ticket.date}</p>
                                        </div>
                                        <Badge className={badgeStyles[ticket.type]}>
                                            {typeLabel[ticket.type]}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border">
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">Proposed In</span>
                                            <span className="font-semibold text-foreground">{ticket.proposed_time_in ?? '—'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground">Proposed Out</span>
                                            <span className="font-semibold text-foreground">{ticket.proposed_time_out ?? '—'}</span>
                                        </div>
                                    </div>

                                    {ticket.reason && (
                                        <p className="text-xs text-muted-foreground bg-muted/10 p-2 rounded-md italic">
                                            "{ticket.reason}"
                                        </p>
                                    )}

                                    <div className="flex justify-end pt-1">
                                        <TicketActions
                                            ticketId={ticket.id}
                                            type={ticket.type}
                                            proposedTimeIn={ticket.proposed_time_in}
                                            proposedTimeOut={ticket.proposed_time_out}
                                        />
                                    </div>
                                </div>
                            ))}
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
