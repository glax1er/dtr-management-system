import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
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
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';

interface VerifyEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    email?: string;
    status?: string;
}

export default function VerifyEmailDialog({
    open,
    onOpenChange,
    email,
    status,
}: VerifyEmailDialogProps) {
    const [cooldown, setCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const [resendStatus, setResendStatus] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        code: '',
        email: email || '',
    });

    useEffect(() => {
        if (email) {
            setData('email', email);
        }
    }, [email]);

    useEffect(() => {
        if (!open) {
            reset();
            clearErrors();
            setResendStatus(null);
        }
    }, [open]);

    // Countdown timer for resend button
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        if (data.code.length !== 6) return;

        post('/email/verify/code', {
            preserveScroll: true,
            onError: () => {
                reset('code');
            },
        });
    };

    const handleResend = () => {
        if (cooldown > 0 || isResending) return;

        setIsResending(true);
        setResendStatus(null);

        router.post(
            '/email/verification-notification',
            { email: email || data.email },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResendStatus('A new verification code has been sent to your email.');
                },
                onFinish: () => {
                    setIsResending(false);
                    setCooldown(60); // 60s cooldown
                },
            },
        );
    };

    const handleClose = () => {
        onOpenChange(false);
        if (window.location.pathname.includes('/email/verify')) {
            router.visit(login());
        }
    };

    const activeStatus = resendStatus || status;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="flex flex-col items-center text-center space-y-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                        <ShieldCheck className="h-7 w-7" />
                    </div>

                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-lg font-semibold tracking-tight text-foreground text-center">
                            Verify your email address
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground text-center">
                            We sent a 6-digit verification code to
                        </DialogDescription>
                        {(email || data.email) && (
                            <p className="font-medium text-xs text-foreground bg-muted/60 py-1 px-3 rounded-md inline-block border border-border/50 mt-1 max-w-[280px] truncate">
                                {email || data.email}
                            </p>
                        )}
                    </div>
                </DialogHeader>

                {activeStatus && (
                    <div className="w-full flex items-center justify-center gap-2 p-3 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg animate-in fade-in-50 duration-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{activeStatus}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-5 pt-1">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <InputOTP
                            maxLength={6}
                            value={data.code}
                            onChange={(val) => setData('code', val)}
                            disabled={processing}
                            autoFocus
                        >
                            <InputOTPGroup className="gap-1.5 sm:gap-2">
                                <InputOTPSlot index={0} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                                <InputOTPSlot index={1} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                                <InputOTPSlot index={2} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                                <InputOTPSlot index={3} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                                <InputOTPSlot index={4} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                                <InputOTPSlot index={5} className="h-11 w-10 sm:h-12 sm:w-11 text-base font-semibold border-input" />
                            </InputOTPGroup>
                        </InputOTP>

                        <InputError message={errors.code} className="text-xs mt-1" />
                    </div>

                    <Button
                        type="submit"
                        disabled={processing || data.code.length !== 6}
                        className="w-full h-10 font-medium"
                    >
                        {processing ? (
                            <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Verifying...
                            </>
                        ) : (
                            'Verify Email'
                        )}
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-2.5 pt-3 text-xs w-full border-t border-border/60">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <span>Didn't receive the code?</span>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={cooldown > 0 || isResending}
                            className="font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 ml-1"
                        >
                            {isResending ? (
                                <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Sending...
                                </>
                            ) : cooldown > 0 ? (
                                `Resend in ${cooldown}s`
                            ) : (
                                'Resend Code'
                            )}
                        </button>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClose}
                        className="text-xs text-muted-foreground hover:text-foreground h-8"
                    >
                        Cancel / Back to log in
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
