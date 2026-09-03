import { Link, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    Clock,
    FileText,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Notification, PageProps } from '@/types';

type RejectedResolutionDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    notification: Notification | null;
};

function formatDisplayDate(dateStr?: string | null): string {
    if (!dateStr) {
return '—';
}

    try {
        const date = new Date(
            dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`,
        );

        if (Number.isNaN(date.getTime())) {
return dateStr;
}

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function formatDisplayDateTime(dateStr?: string | null): string {
    if (!dateStr) {
return '';
}

    try {
        const date = new Date(dateStr);

        if (Number.isNaN(date.getTime())) {
return dateStr;
}

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return dateStr;
    }
}

export function RejectedResolutionDialog({
    open,
    onOpenChange,
    notification,
}: RejectedResolutionDialogProps) {
    const { url } = usePage<PageProps>();

    if (!notification) {
        return null;
    }

    const data = notification.data || {};
    const rejectionReason =
        data.rejection_reason ||
        (notification.message.startsWith('Reason:')
            ? notification.message.replace(/^Reason:\s*/, '')
            : notification.message);
    const date = data.date;
    const proposedTimeIn = data.proposed_time_in;
    const proposedTimeOut = data.proposed_time_out;
    const reason = data.reason;
    const rejectedBy = data.rejected_by || 'Supervisor';
    const resolvedAt = data.resolved_at || notification.created_at;

    const isOnInternDashboard =
        url === '/intern/dashboard' || url.startsWith('/intern/dashboard?');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden p-0 sm:w-full sm:rounded-2xl">
                {/* Top Accent Header */}
                <div className="shrink-0 border-b border-border/70 bg-destructive/5 px-6 pt-6 pb-4">
                    <DialogHeader className="space-y-3 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-xs">
                                <XCircle className="size-5" />
                            </div>

                            <Badge
                                variant="outline"
                                className="border-destructive/30 bg-destructive/10 text-xs font-semibold tracking-wider text-destructive uppercase"
                            >
                                Rejected
                            </Badge>
                        </div>

                        <div>
                            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                                Resolution Request Rejected
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                                Details and supervisor feedback regarding your
                                resolution request.
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                {/* Dialog Body (Scrollable) */}
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {/* Supervisor Rejection Reason Callout */}
                    <div className="space-y-2 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-4 text-sm">
                        <div className="flex items-center gap-1.5 font-semibold text-destructive">
                            <AlertCircle className="size-4 shrink-0" />
                            <span className="text-xs tracking-wider uppercase">
                                Supervisor&apos;s Reason for Rejection
                            </span>
                        </div>

                        <p className="text-sm leading-relaxed font-medium [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap text-foreground">
                            {rejectionReason ||
                                'No specific explanation provided by supervisor.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-destructive/15 pt-2 text-[11px] text-muted-foreground">
                            <span className="flex min-w-0 items-center gap-1">
                                <UserCheck className="size-3 shrink-0 text-destructive/80" />
                                <span className="break-words">
                                    Reviewed by:{' '}
                                    <strong className="text-foreground">
                                        {rejectedBy}
                                    </strong>
                                </span>
                            </span>
                            {resolvedAt && (
                                <span className="shrink-0">
                                    • {formatDisplayDateTime(resolvedAt)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Original Request Details */}
                    <div className="space-y-2.5 rounded-xl border border-border/80 bg-muted/20 p-4">
                        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Request Summary
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Calendar className="size-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] text-muted-foreground">
                                        Attendance Date
                                    </span>
                                    <span className="block truncate text-xs font-semibold text-foreground">
                                        {formatDisplayDate(date)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex min-w-0 items-start gap-2.5">
                                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Clock className="size-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[11px] text-muted-foreground">
                                        Proposed Time
                                    </span>
                                    <span className="block truncate text-xs font-semibold text-foreground tabular-nums">
                                        {proposedTimeIn || proposedTimeOut ? (
                                            <>
                                                {proposedTimeIn
                                                    ? `In: ${proposedTimeIn}`
                                                    : ''}
                                                {proposedTimeIn &&
                                                proposedTimeOut
                                                    ? ' • '
                                                    : ''}
                                                {proposedTimeOut
                                                    ? `Out: ${proposedTimeOut}`
                                                    : ''}
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {reason && (
                            <div className="border-t border-border/60 pt-2.5">
                                <div className="flex min-w-0 items-start gap-2">
                                    <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <span className="block text-[11px] text-muted-foreground">
                                            Your Submitted Reason:
                                        </span>
                                        <p className="text-xs [overflow-wrap:anywhere] break-words [word-break:break-word] whitespace-pre-wrap text-foreground/90 italic">
                                            &ldquo;{reason}&rdquo;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Helpful Notice */}
                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            Need to make adjustments?
                        </span>{' '}
                        You can submit a new resolution request with updated
                        information from your DTR Attendance Log.
                    </p>
                </div>

                {/* Dialog Footer */}
                <DialogFooter className="shrink-0 border-t border-border/70 bg-muted/20 px-6 py-3 sm:justify-between">
                    {!isOnInternDashboard ? (
                        <Button
                            asChild
                            variant="default"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs"
                        >
                            <Link href="/intern/dashboard">
                                Go to DTR Dashboard
                            </Link>
                        </Button>
                    ) : (
                        <div />
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
