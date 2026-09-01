import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
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
import { Textarea } from '@/components/ui/textarea';

type ResolutionRequestDialogProps = {
    date: string;
    day: string;
    status: 'missing_time_in' | 'open' | 'no_record';
    existingTimeIn: string | null;
    existingTimeOut: string | null;
};

export function ResolutionRequestDialog({
    date,
    day,
    status,
    existingTimeIn,
    existingTimeOut,
}: ResolutionRequestDialogProps) {
    const needsTimeIn = status === 'missing_time_in' || status === 'no_record';
    const needsTimeOut = status === 'open' || status === 'no_record';

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'confirm'>('form');

    const form = useForm({
        date,
        proposed_time_in: '',
        proposed_time_out: '',
        reason: '',
    });

    // Helper inside the file to format 24h ("17:00") into 12h without leading zeros ("5:00 PM")
    const formatTo12Hour = (time24: string | null) => {
        if (!time24) return '—';
        const [h, m] = time24.split(':');
        const hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${m} ${ampm}`;
    };

    const closeAndReset = () => {
        setOpen(false);
        setStep('form');
        form.reset();
        form.clearErrors();
    };

    const handleContinue = () => {
        setStep('confirm');
    };

    const handleSubmit = () => {
        form.post('/intern/resolution-tickets', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Resolution request submitted for review.');
                closeAndReset();
            },
            onError: (errors) => {
                const msg = Object.values(errors)[0] ?? 'Could not submit resolution request.';
                toast.error(msg);
                setStep('form');
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setStep('form');
                    form.reset();
                    form.clearErrors();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Request Resolution
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
                {step === 'form' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Request Resolution</DialogTitle>
                            <DialogDescription>
                                {day}, {date} — fill in what's missing and explain why.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {needsTimeIn ? (
                                <div className="space-y-1">
                                    <Label htmlFor="proposed_time_in">Time In</Label>
                                    <Input
                                        id="proposed_time_in"
                                        type="time"
                                        value={form.data.proposed_time_in}
                                        onChange={(e) => form.setData('proposed_time_in', e.target.value)}
                                    />
                                    <InputError message={form.errors.proposed_time_in} />
                                </div>
                            ) : (
                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="shrink-0 text-muted-foreground">Time In (already recorded)</span>
                                    <span className="min-w-0 text-right break-words">{existingTimeIn ?? '—'}</span>
                                </div>
                            )}

                            {needsTimeOut ? (
                                <div className="space-y-1">
                                    <Label htmlFor="proposed_time_out">Time Out</Label>
                                    <Input
                                        id="proposed_time_out"
                                        type="time"
                                        value={form.data.proposed_time_out}
                                        onChange={(e) => form.setData('proposed_time_out', e.target.value)}
                                    />
                                    <InputError message={form.errors.proposed_time_out} />
                                </div>
                            ) : (
                                <div className="flex justify-between gap-4 text-sm">
                                    <span className="shrink-0 text-muted-foreground">Time Out (already recorded)</span>
                                    <span className="min-w-0 text-right break-words">{existingTimeOut ?? '—'}</span>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label htmlFor="reason">Reason</Label>
                                <Textarea
                                    id="reason"
                                    value={form.data.reason}
                                    onChange={(e) => form.setData('reason', e.target.value)}
                                    placeholder="What happened on this day?"
                                    maxLength={1000}
                                    className="min-h-[80px] max-h-[180px] resize-y break-words [overflow-wrap:anywhere]"
                                />
                                <InputError message={form.errors.reason} />
                            </div>
                            <InputError message={form.errors.date} />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={closeAndReset}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleContinue}
                                disabled={
                                    (needsTimeIn && !form.data.proposed_time_in) ||
                                    (needsTimeOut && !form.data.proposed_time_out) ||
                                    !form.data.reason
                                }
                            >
                                Continue
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Confirm Resolution Request</DialogTitle>
                            <DialogDescription>
                                Double-check this before sending it to your supervisor.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="min-w-0 space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Date</span>
                                <span className="min-w-0 text-right break-words">
                                    {day}, {date}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Time In</span>
                                <span className="min-w-0 text-right break-words">
                                    {needsTimeIn ? formatTo12Hour(form.data.proposed_time_in) : (existingTimeIn ?? '—')}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">Time Out</span>
                                <span className="min-w-0 text-right break-words">
                                    {needsTimeOut ? formatTo12Hour(form.data.proposed_time_out) : (existingTimeOut ?? '—')}
                                </span>
                            </div>
                            <div className="min-w-0 border-t pt-2 space-y-1">
                                <span className="text-muted-foreground block text-xs">Reason</span>
                                <p className="break-words [overflow-wrap:anywhere] [word-break:break-word] text-foreground text-sm whitespace-pre-wrap">
                                    {form.data.reason}
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStep('form')}>
                                Back
                            </Button>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={form.processing}
                            >
                                {form.processing ? 'Submitting...' : 'Confirm & Submit'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}