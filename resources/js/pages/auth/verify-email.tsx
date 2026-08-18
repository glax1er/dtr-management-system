import { Form, Head, router, useForm } from '@inertiajs/react';
import { Mail, RefreshCw, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';

interface Props {
    status?: string;
    email?: string;
}

export default function VerifyEmail({ status, email }: Props) {
    const [cooldown, setCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
    });

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
            onError: () => {
                reset('code');
            },
        });
    };

    const handleResend = () => {
        if (cooldown > 0 || isResending) return;

        setIsResending(true);
        router.post(
            '/email/verification-notification',
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsResending(false);
                    setCooldown(60); // 60s cooldown
                },
            },
        );
    };

    return (
        <>
            <Head title="Email Verification" />

            <div className="flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                    <ShieldCheck className="h-8 w-8" />
                </div>

                <div className="space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        Check your email inbox
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-sm">
                        We sent a 6-digit verification code to
                    </p>
                    {email && (
                        <p className="font-medium text-xs text-foreground bg-muted/60 py-1 px-3 rounded-md inline-block border border-border/50">
                            {email}
                        </p>
                    )}
                </div>

                {status && (
                    <div className="w-full flex items-center justify-center gap-2 p-3 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 rounded-lg animate-in fade-in-50 duration-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{status}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-5 pt-2">
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

                <div className="flex flex-col items-center gap-3 pt-2 text-xs w-full border-t border-border/60">
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

                    <form onSubmit={(e) => { e.preventDefault(); router.post(logout()); }}>
                        <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground h-8"
                        >
                            <LogOut className="mr-1.5 h-3.5 w-3.5" />
                            Log out & try another account
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verify Your Email',
    description: 'Please verify your email address to proceed',
};
