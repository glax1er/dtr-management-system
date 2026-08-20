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

export function formatTo12Hour(timeStr: string | null): string {
    if (!timeStr) return '—';
    
    try {
        const cleanTime = timeStr.trim();
        if (/am|pm/i.test(cleanTime)) return cleanTime;
        const date = new Date(`2000-01-01T${cleanTime}`);
        if (isNaN(date.getTime())) return cleanTime;
        
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return timeStr;
    }
}

// Backend sends proposed_time_in/out as a 12-hour display string
// (e.g. "1:35 PM"), but the approve endpoint expects 24-hour "H:i"
// (e.g. "13:35"). Converts correctly, respecting AM/PM — a plain
// string slice/regex here would silently turn PM times into their
// AM equivalent (1:35 PM -> wrongly sent as 01:35).
function to24Hour(timeStr: string | null): string | null {
    if (!timeStr) return null;

    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return timeStr; // already 24-hour, or unrecognized — pass through

    let [, hoursStr, minutes, meridiem] = match;
    let hours = parseInt(hoursStr, 10);

    if (meridiem) {
        const isPM = meridiem.toUpperCase() === 'PM';
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
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
                ...(needsTimeIn ? { final_time_in: to24Hour(proposedTimeIn) } : {}),
                ...(needsTimeOut ? { final_time_out: to24Hour(proposedTimeOut) } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Resolution request approved.');
                    setOpenApprove(false);
                },
                onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Could not approve this ticket.'),
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
                onSuccess: () => {
                    toast.success('Resolution request rejected.');
                    setOpenReject(false);
                },
                onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Could not reject this ticket.'),
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
