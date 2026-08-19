import { useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
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

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        email: '',
    });

    useEffect(() => {
        if (!open) {
            reset();
            clearErrors();
            setSentStatus(null);
        }
    }, [open]);

    // Track status from session or direct response
    useEffect(() => {
        if (page.props.status && open) {
            setSentStatus(page.props.status);
        }
    }, [page.props.status, open]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setSentStatus(null);

        post('/forgot-password', {
            preserveScroll: true,
            onSuccess: (pageResponse) => {
                const responseStatus = (pageResponse.props as { status?: string }).status;
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
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="flex flex-col items-center text-center space-y-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                        <KeyRound className="h-7 w-7" />
                    </div>

                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-lg font-semibold tracking-tight text-foreground text-center">
                            Forgot your password?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground text-center max-w-xs mx-auto">
                            Enter your email address below and we'll send you a link to reset your password.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {sentStatus && (
                    <div className="w-full flex items-center justify-center gap-2 p-3 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg animate-in fade-in-50 duration-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{sentStatus}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-4 pt-1">
                    <div className="grid gap-2">
                        <Label htmlFor="forgot-password-email" className="text-xs font-medium">
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
                            className="w-full h-10 font-medium"
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
                            className="text-xs text-muted-foreground hover:text-foreground h-8"
                        >
                            Back to log in
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
