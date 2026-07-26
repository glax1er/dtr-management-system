import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ApproveTicketDialogProps = {
    ticketId: number;
    type: 'missing_time_in' | 'open' | 'no_record';
    proposedTimeIn: string | null;
    proposedTimeOut: string | null;
};

export function ApproveTicketDialog({ ticketId, type, proposedTimeIn, proposedTimeOut }: ApproveTicketDialogProps) {
    const needsTimeIn = type === 'missing_time_in' || type === 'no_record';
    const needsTimeOut = type === 'open' || type === 'no_record';

    const [open, setOpen] = useState(false);
    const [timeIn, setTimeIn] = useState(proposedTimeIn ?? '');
    const [timeOut, setTimeOut] = useState(proposedTimeOut ?? '');
    const [processing, setProcessing] = useState(false);

    const handleApprove = () => {
        setProcessing(true);

        router.patch(
            `/supervisor/resolution-tickets/${ticketId}/approve`,
            {
                ...(needsTimeIn ? { final_time_in: timeIn } : {}),
                ...(needsTimeOut ? { final_time_out: timeOut } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
                onError: (errors) => {
                    toast.error(Object.values(errors)[0] ?? 'Could not approve this ticket.');
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Approve</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve Resolution</DialogTitle>
                    <DialogDescription>
                        Confirm the time(s) below — edit them first if what was agreed differs from what was
                        submitted.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {needsTimeIn && (
                        <div className="space-y-1">
                            <Label htmlFor="final_time_in">Time In</Label>
                            <Input
                                id="final_time_in"
                                type="time"
                                value={timeIn}
                                onChange={(e) => setTimeIn(e.target.value)}
                            />
                        </div>
                    )}
                    {needsTimeOut && (
                        <div className="space-y-1">
                            <Label htmlFor="final_time_out">Time Out</Label>
                            <Input
                                id="final_time_out"
                                type="time"
                                value={timeOut}
                                onChange={(e) => setTimeOut(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={processing}>
                        Cancel
                    </Button>
                    <Button onClick={handleApprove} disabled={processing}>
                        {processing ? 'Approving…' : 'Approve'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
