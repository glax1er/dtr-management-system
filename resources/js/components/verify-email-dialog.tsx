import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
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

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            code: '',
            email: email || '',
        });

    // useForm's setData/reset/clearErrors aren't guaranteed to keep a stable
    // identity across renders, so both effects below read through this ref
    // instead of listing them directly as deps — that would either be a lie
    // (if they are in fact stable) or re-run the effects on every render (if
    // they're not). The ref always holds the latest versions without either
    // risk. See forgot-password-dialog.tsx for the same pattern.
    const formActionsRef = useRef({ setData, reset, clearErrors });
    useEffect(() => {
        formActionsRef.current = { setData, reset, clearErrors };
    });

    useEffect(() => {
        if (email) {
            formActionsRef.current.setData('email', email);
        }
    }, [email]);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);

        if (!next) {
            formActionsRef.current.reset();
            formActionsRef.current.clearErrors();
            setResendStatus(null);
        }
    };

    // Countdown timer for resend button
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(
                () => setCooldown((prev) => prev - 1),
                1000,
            );

            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (data.code.length !== 6) {
return;
}

        post('/email/verify/code', {
            preserveScroll: true,
            onError: () => {
                reset('code');
            },
        });
    };

    const handleResend = () => {
        if (cooldown > 0 || isResending) {
return;
}

        setIsResending(true);
        setResendStatus(null);

        router.post(
            '/email/verification-notification',
            { email: email || data.email },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResendStatus(
                        'A new verification code has been sent to your email.',
                    );
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
        router.visit(login());
    };

    const activeStatus = resendStatus || status;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="p-6 sm:max-w-md">
                <DialogHeader className="flex flex-col items-center space-y-3 text-center">
                    <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                        <ShieldCheck className="h-7 w-7" />
                    </div>

                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-center text-lg font-semibold tracking-tight text-foreground">
                            Verify your email address
                        </DialogTitle>
                        <DialogDescription className="text-center text-xs text-muted-foreground">
                            We sent a 6-digit verification code to
                        </DialogDescription>
                        {(email || data.email) && (
                            <p className="mt-1 inline-block max-w-[280px] truncate rounded-md border border-border/50 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
                                {email || data.email}
                            </p>
                        )}
                    </div>
                </DialogHeader>

                {activeStatus && (
                    <div className="flex w-full animate-in items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 duration-300 fade-in-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
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
                                <InputOTPSlot
                                    index={0}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                                <InputOTPSlot
                                    index={1}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                                <InputOTPSlot
                                    index={2}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                                <InputOTPSlot
                                    index={3}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                                <InputOTPSlot
                                    index={4}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                                <InputOTPSlot
                                    index={5}
                                    className="h-11 w-10 border-input text-base font-semibold sm:h-12 sm:w-11"
                                />
                            </InputOTPGroup>
                        </InputOTP>

                        <InputError
                            message={errors.code}
                            className="mt-1 text-xs"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={processing || data.code.length !== 6}
                        className="h-10 w-full font-medium"
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

                <div className="flex w-full flex-col items-center gap-2.5 border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <span>Didn't receive the code?</span>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={cooldown > 0 || isResending}
                            className="ml-1 inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
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
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Cancel / Back to log in
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}