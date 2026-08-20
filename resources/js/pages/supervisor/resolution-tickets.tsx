import { Head } from '@inertiajs/react';
import { Calendar, Clock, FileText, TicketCheck, User } from 'lucide-react';
import { TicketActions, badgeStyles } from '@/components/approve-ticket-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const typeLabel: Record<ResolutionTicketRow['type'], string> = {
    missing_time_in: 'Missing Time In',
    open: 'No Time Out',
    no_record: 'No Record',
};

export default function ResolutionTickets({ tickets }: ResolutionTicketsProps) {
    return (
        <>
            <Head title="Resolution Tickets" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <TicketCheck className="size-5" />
                            </span>
                            Resolution Tickets
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pending requests from interns for missing Time In/Out on their DTR.
                        </p>
                    </div>

                    <Badge variant="secondary" className="px-3 py-1 font-medium text-xs">
                        {tickets.length} Pending
                    </Badge>
                </div>

                {/* Content */}
                <Card className="flex-1">
                    <CardHeader className="px-6 py-4">
                        <CardTitle className="text-base font-semibold">
                            Pending Requests ({tickets.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {tickets.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No pending resolution requests.
                            </p>
                        ) : (
                            <>
                                {/* Table — desktop only */}
                                <div className="hidden sm:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6">Intern</TableHead>
                                                <TableHead className="px-6">Date</TableHead>
                                                <TableHead className="px-6 text-center">Type</TableHead>
                                                <TableHead className="px-6 text-center">Proposed Time In</TableHead>
                                                <TableHead className="px-6 text-center">Proposed Time Out</TableHead>
                                                <TableHead className="px-6">Reason</TableHead>
                                                <TableHead className="px-6 text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tickets.map((ticket) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell className="px-6 font-medium whitespace-nowrap">
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
                                                    <TableCell className="px-6 text-center whitespace-nowrap">
                                                        {ticket.proposed_time_in ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center whitespace-nowrap">
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
                                </div>

                                {/* Mobile cards list */}
                                <div className="divide-y sm:hidden">
                                    {tickets.map((ticket) => (
                                        <div key={ticket.id} className="flex flex-col gap-3 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-sm">{ticket.intern_name}</p>
                                                    <p className="text-xs text-muted-foreground">{ticket.date}</p>
                                                </div>
                                                <Badge className={badgeStyles[ticket.type]}>
                                                    {typeLabel[ticket.type]}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border">
                                                <div>
                                                    <span className="text-muted-foreground">Proposed In: </span>
                                                    <span className="font-medium">{ticket.proposed_time_in ?? '—'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Proposed Out: </span>
                                                    <span className="font-medium">{ticket.proposed_time_out ?? '—'}</span>
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
                    </CardContent>
                </Card>
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
