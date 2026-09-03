import { useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import type { FormEventHandler} from 'react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

interface ForgotPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({
    open,
    onOpenChange,
}: ForgotPasswordDialogProps) {
    const page = usePage<{ status?: string }>();
    const [sentStatus, setSentStatus] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            email: '',
        });

    // useForm's reset/clearErrors aren't guaranteed to keep a stable identity
    // across renders, so we route through a ref instead of listing them
    // directly in the deps array below — that would either be a lie (if they
    // are in fact stable) or re-run this effect on every render (if they're
    // not), re-firing reset()/clearErrors() in a loop while the dialog is
    // closed. The ref always holds the latest versions without either risk.
    const formActionsRef = useRef({ reset, clearErrors });
    useEffect(() => {
        formActionsRef.current = { reset, clearErrors };
    });

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!open) {
            formActionsRef.current.reset();
            formActionsRef.current.clearErrors();
            // Reset the form when the dialog closes; this catches parent-driven
            // close events that do not flow through a clicked submit action.
            setSentStatus(null);
        }
    }, [open]);
    /* eslint-enable react-hooks/set-state-in-effect */

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (page.props.status && open) {
            // Track status from session or direct response.
            setSentStatus(page.props.status);
        }
    }, [page.props.status, open]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setSentStatus(null);

        post('/forgot-password', {
            preserveScroll: true,
            onSuccess: (pageResponse) => {
                const responseStatus = (
                    pageResponse.props as { status?: string }
                ).status;

                if (responseStatus) {
                    setSentStatus(responseStatus);
                } else {
                    setSentStatus('We have emailed your password reset link.');
                }

                reset('email');
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-6 sm:max-w-md">
                <DialogHeader className="flex flex-col items-center space-y-3 text-center">
                    <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                        <KeyRound className="h-7 w-7" />
                    </div>

                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-center text-lg font-semibold tracking-tight text-foreground">
                            Forgot your password?
                        </DialogTitle>
                        <DialogDescription className="mx-auto max-w-xs text-center text-xs text-muted-foreground">
                            Enter your email address below and we'll send you a
                            link to reset your password.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {sentStatus && (
                    <div className="flex w-full animate-in items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 duration-300 fade-in-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{sentStatus}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-4 pt-1">
                    <div className="grid gap-2">
                        <Label
                            htmlFor="forgot-password-email"
                            className="text-xs font-medium"
                        >
                            Email address
                        </Label>
                        <Input
                            id="forgot-password-email"
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="email"
                            autoFocus
                            required
                            placeholder="email@usep.edu.ph"
                            className="h-10"
                            disabled={processing}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            type="submit"
                            className="h-10 w-full font-medium"
                            disabled={processing || !data.email}
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Sending reset link...
                                </>
                            ) : (
                                'Send Password Reset Link'
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Back to log in
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
