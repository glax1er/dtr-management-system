import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { ApproveTicketDialog } from '@/components/approve-ticket-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    const reject = (ticketId: number) => {
        if (!confirm('Reject this resolution request? The day will go back to looking missing.')) {
            return;
        }

        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/reject`,
            {},
            {
                preserveScroll: true,
                onError: (errors) => {
                    toast.error(Object.values(errors)[0] ?? 'Could not reject this ticket.');
                },
            },
        );
    };

    return (
        <>
            <Head title="Resolution Tickets" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Resolution Tickets</h1>
                    <p className="text-muted-foreground">
                        Pending requests from interns for missing Time In/Out on their DTR.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Pending ({tickets.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tickets.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No pending resolution requests.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Intern</th>
                                            <th className="py-2 pr-4 font-medium">Date</th>
                                            <th className="py-2 pr-4 font-medium">Type</th>
                                            <th className="py-2 pr-4 font-medium">Proposed Time In</th>
                                            <th className="py-2 pr-4 font-medium">Proposed Time Out</th>
                                            <th className="py-2 pr-4 font-medium">Reason</th>
                                            <th className="py-2 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((ticket) => (
                                            <tr key={ticket.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{ticket.intern_name}</td>
                                                <td className="py-2 pr-4">{ticket.date}</td>
                                                <td className="py-2 pr-4">
                                                    <Badge variant="outline">{typeLabel[ticket.type]}</Badge>
                                                </td>
                                                <td className="py-2 pr-4">{ticket.proposed_time_in ?? '—'}</td>
                                                <td className="py-2 pr-4">{ticket.proposed_time_out ?? '—'}</td>
                                                <td className="max-w-64 py-2 pr-4">
                                                    <p className="truncate" title={ticket.reason}>
                                                        {ticket.reason}
                                                    </p>
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <ApproveTicketDialog
                                                            ticketId={ticket.id}
                                                            type={ticket.type}
                                                            proposedTimeIn={ticket.proposed_time_in}
                                                            proposedTimeOut={ticket.proposed_time_out}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => reject(ticket.id)}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
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

ResolutionTickets.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resolution Tickets', href: '/supervisor/resolution-tickets' },
    ],
};
