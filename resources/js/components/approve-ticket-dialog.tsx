import { router } from '@inertiajs/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AttendanceBadge } from '@/components/ui/badges/attendance-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TicketActionsProps = {
    ticketId: number;
    type: 'missing_time_in' | 'open' | 'no_record';
    proposedTimeIn: string | null;
    proposedTimeOut: string | null;
    className?: string;
};

export const badgeStyles: Record<TicketActionsProps['type'], string> = {
    missing_time_in:
        'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800',
    open: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    no_record:
        'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
};

export function formatTo12Hour(timeStr: string | null): string {
    if (!timeStr) {
        return '—';
    }

    try {
        const cleanTime = timeStr.trim();

        if (/am|pm/i.test(cleanTime)) {
            return cleanTime;
        }

        const date = new Date(`2000-01-01T${cleanTime}`);

        if (isNaN(date.getTime())) {
            return cleanTime;
        }

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return timeStr;
    }
}

// Backend sends proposed_time_in/out as a 12-hour display string
// (e.g. "1:35 PM"), but the approve endpoint expects 24-hour "H:i"
// (e.g. "13:35"). Converts correctly, respecting AM/PM — a plain
// string slice/regex here would silently turn PM times into their
// AM equivalent (1:35 PM -> wrongly sent as 01:35).
function to24Hour(timeStr: string | null): string | null {
    if (!timeStr) {
        return null;
    }

    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!match) {
        return timeStr; // already 24-hour, or unrecognized — pass through
    }

    const [, hoursStr, minutes, meridiem] = match;
    let hours = parseInt(hoursStr, 10);

    if (meridiem) {
        const isPM = meridiem.toUpperCase() === 'PM';

        if (isPM && hours !== 12) {
            hours += 12;
        }

        if (!isPM && hours === 12) {
            hours = 0;
        }
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function TicketActions({
    ticketId,
    type,
    proposedTimeIn,
    proposedTimeOut,
    className,
}: TicketActionsProps) {
    const needsTimeIn = type === 'missing_time_in' || type === 'no_record';
    const needsTimeOut = type === 'open' || type === 'no_record';

    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionError, setRejectionError] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleApprove = () => {
        setProcessing(true);
        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/approve`,
            {
                ...(needsTimeIn
                    ? { final_time_in: to24Hour(proposedTimeIn) }
                    : {}),
                ...(needsTimeOut
                    ? { final_time_out: to24Hour(proposedTimeOut) }
                    : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Resolution request approved.');
                    setOpenApprove(false);
                },
                onError: (errors) =>
                    toast.error(
                        Object.values(errors)[0] ??
                            'Could not approve this ticket.',
                    ),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleOpenRejectChange = (open: boolean) => {
        setOpenReject(open);

        if (!open) {
            setRejectionReason('');
            setRejectionError('');
        }
    };

    const handleReject = () => {
        const trimmed = rejectionReason.trim();

        if (!trimmed) {
            setRejectionError(
                'Please provide a reason for rejecting this resolution request.',
            );

            return;
        }

        setProcessing(true);
        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/reject`,
            {
                rejection_reason: trimmed,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Resolution request rejected.');
                    setOpenReject(false);
                    setRejectionReason('');
                    setRejectionError('');
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors)[0] ??
                        'Could not reject this ticket.';
                    setRejectionError(message);
                    toast.error(message);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <div
            className={cn('flex items-center justify-center gap-1', className)}
        >
            {/* APPROVE MODAL */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenApprove(true)}
                        disabled={processing}
                        aria-label="Approve"
                    >
                        <CheckCircle2 className="size-4 text-emerald-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Approve</TooltipContent>
            </Tooltip>

            <Dialog open={openApprove} onOpenChange={setOpenApprove}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2">
                            <DialogTitle>Confirm Approval</DialogTitle>
                            <AttendanceBadge status={type} />
                        </div>
                        <DialogDescription className="space-y-3 text-left">
                            <p>
                                Are you sure you want to approve this resolution
                                ticket? This action cannot be undone.
                            </p>
                            <div className="rounded-md bg-muted p-3 text-sm text-foreground">
                                <p className="mb-1 font-semibold">
                                    Proposed Changes:
                                </p>
                                <ul className="list-inside list-disc space-y-0.5 opacity-90">
                                    {needsTimeIn && (
                                        <li>
                                            Time In:{' '}
                                            <span className="font-medium">
                                                {formatTo12Hour(proposedTimeIn)}
                                            </span>
                                        </li>
                                    )}
                                    {needsTimeOut && (
                                        <li>
                                            Time Out:{' '}
                                            <span className="font-medium">
                                                {formatTo12Hour(
                                                    proposedTimeOut,
                                                )}
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpenApprove(false)}
                            disabled={processing}
                        >
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
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenReject(true)}
                        disabled={processing}
                        aria-label="Reject"
                    >
                        <XCircle className="size-4 text-destructive" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Reject</TooltipContent>
            </Tooltip>

            <Dialog open={openReject} onOpenChange={handleOpenRejectChange}>
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-2">
                            <DialogTitle>Reject Resolution Request</DialogTitle>
                            <AttendanceBadge status={type} />
                        </div>
                        <DialogDescription className="space-y-3 text-left">
                            <p>
                                Please state the reason for rejecting this
                                resolution request. The intern will receive a
                                notification with your reason.
                            </p>
                            <div className="rounded-md bg-muted p-3 text-sm text-foreground">
                                <p className="mb-1 font-semibold">
                                    Proposed Changes to Reject:
                                </p>
                                <ul className="list-inside list-disc space-y-0.5 opacity-90">
                                    {needsTimeIn && (
                                        <li>
                                            Time In:{' '}
                                            <span className="font-medium">
                                                {formatTo12Hour(proposedTimeIn)}
                                            </span>
                                        </li>
                                    )}
                                    {needsTimeOut && (
                                        <li>
                                            Time Out:{' '}
                                            <span className="font-medium">
                                                {formatTo12Hour(
                                                    proposedTimeOut,
                                                )}
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-1">
                        <Label
                            htmlFor={`rejection-reason-${ticketId}`}
                            className="text-sm font-medium"
                        >
                            Reason for Rejection{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id={`rejection-reason-${ticketId}`}
                            value={rejectionReason}
                            onChange={(e) => {
                                setRejectionReason(e.target.value);

                                if (rejectionError) {
setRejectionError('');
}
                            }}
                            placeholder="e.g., No supervisor confirmation on site, incorrect time indicated, etc."
                            rows={3}
                            maxLength={1000}
                            disabled={processing}
                            className={`max-h-[200px] min-h-[90px] resize-y [overflow-wrap:anywhere] break-words ${
                                rejectionError
                                    ? 'border-destructive focus-visible:ring-destructive'
                                    : ''
                            }`}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span
                                className={`min-w-0 flex-1 break-words ${rejectionError ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                            >
                                {rejectionError ||
                                    'Explain why this request is being rejected.'}
                            </span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">
                                {rejectionReason.length}/1000
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => handleOpenRejectChange(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={processing || !rejectionReason.trim()}
                            onClick={handleReject}
                            className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
                        >
                            {processing ? 'Rejecting…' : 'Reject Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
