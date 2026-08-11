import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type TicketActionsProps = {
    ticketId: number;
    type: 'missing_time_in' | 'open' | 'no_record';
    proposedTimeIn: string | null;
    proposedTimeOut: string | null;
};

export const badgeStyles: Record<TicketActionsProps['type'], string> = {
    missing_time_in: 'bg-red-100 text-red-400 border-red-500',
    open: 'bg-amber-100 text-amber-400 border-amber-500',
    no_record: 'bg-red-100 text-red-400 border-red-500',
};

const typeLabel: Record<TicketActionsProps['type'], string> = {
    missing_time_in: 'Missing Time In',
    open: 'No Time Out',
    no_record: 'No Record',
};

// Helper function to safely format 24h string to 12h AM/PM format
function formatTo12Hour(timeStr: string | null): string {
    if (!timeStr) return '—';
    
    // Split the hours and minutes from the time string
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr ? minutesStr.substring(0, 2) : '00';
    
    if (isNaN(hours)) return timeStr; // Fallback if data is weird

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    
    return `${hours}:${minutes} ${ampm}`;
}

export function TicketActions({ ticketId, type, proposedTimeIn, proposedTimeOut }: TicketActionsProps) {
    const needsTimeIn = type === 'missing_time_in' || type === 'no_record';
    const needsTimeOut = type === 'open' || type === 'no_record';

    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleApprove = () => {
        setProcessing(true);
        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/approve`,
            {
                ...(needsTimeIn ? { final_time_in: proposedTimeIn } : {}),
                ...(needsTimeOut ? { final_time_out: proposedTimeOut } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpenApprove(false),
                onError: (errors) => toast.error(Object.values(errors) ?? 'Could not approve this ticket.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleReject = () => {
        setProcessing(true);
        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/reject`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setOpenReject(false),
                onError: (errors) => toast.error(Object.values(errors) ?? 'Could not reject this ticket.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <div className="flex items-center gap-2">
            {/* APPROVE MODAL */}
            <Dialog open={openApprove} onOpenChange={setOpenApprove}>
                <DialogTrigger asChild>
                    <Button 
                        size="sm" 
                        className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                        Approve
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <DialogTitle>Confirm Approval</DialogTitle>
                            <Badge className={badgeStyles[type]}>
                                {typeLabel[type]}
                            </Badge>
                        </div>
                        <DialogDescription className="space-y-3">
                            <p>Are you sure you want to approve this resolution ticket? This action cannot be undone.</p>
                            <div className="rounded-md bg-muted p-3 text-sm text-foreground">
                                <p className="font-semibold mb-1">Proposed Changes:</p>
                                <ul className="list-inside list-disc space-y-0.5 opacity-90">
                                    {needsTimeIn && <li>Time In: <span className="font-medium">{formatTo12Hour(proposedTimeIn)}</span></li>}
                                    {needsTimeOut && <li>Time Out: <span className="font-medium">{formatTo12Hour(proposedTimeOut)}</span></li>}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenApprove(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleApprove} 
                            disabled={processing}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                        >
                            {processing ? 'Approving…' : 'Yes, Approve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* REJECT MODAL */}
            <Dialog open={openReject} onOpenChange={setOpenReject}>
                <DialogTrigger asChild>
                    <Button 
                        size="sm" 
                        className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                    >
                        Reject
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <DialogTitle>Confirm Rejection</DialogTitle>
                            <Badge className={badgeStyles[type]}>
                                {typeLabel[type]}
                            </Badge>
                        </div>
                        <DialogDescription className="space-y-3">
                            <p>Reject this resolution request? The day will go back to looking missing.</p>
                            <div className="rounded-md bg-muted p-3 text-sm text-foreground">
                                <p className="font-semibold mb-1">Proposed Changes to Reject:</p>
                                <ul className="list-inside list-disc space-y-0.5 opacity-90">
                                    {needsTimeIn && <li>Time In: <span className="font-medium">{formatTo12Hour(proposedTimeIn)}</span></li>}
                                    {needsTimeOut && <li>Time Out: <span className="font-medium">{formatTo12Hour(proposedTimeOut)}</span></li>}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenReject(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            disabled={processing}
                            onClick={handleReject}
                            className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                        >
                            {processing ? 'Rejecting…' : 'Yes, Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
