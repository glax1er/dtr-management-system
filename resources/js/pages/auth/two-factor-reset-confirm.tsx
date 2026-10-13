import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, CheckCircle2, KeyRound, LoaderCircle, ShieldAlert } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';

interface TwoFactorResetConfirmProps {
    isValid: boolean;
    token?: string;
    userName?: string;
    userEmail?: string;
    requestedAt?: string;
    reason?: string | null;
    userIp?: string | null;
    errorMessage?: string;
}

export default function TwoFactorResetConfirm({
    isValid,
    token,
    userName,
    userEmail,
    requestedAt,
    reason,
    userIp,
    errorMessage,
}: TwoFactorResetConfirmProps) {
    const { post, processing, errors } = useForm<{ token?: string }>({});

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (token) {
            post(`/two-factor-reset/confirm/${token}`);
        }
    };

    if (!isValid) {
        return (
            <>
                <Head title="Invalid 2FA Reset Link" />
                <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-base font-semibold text-foreground">Link Expired or Invalid</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {errorMessage || 'This authorization link has already been used, cancelled, or expired.'}
                        </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                        <Button asChild variant="outline" className="h-10 w-full text-xs">
                            <Link href="/two-factor-reset">Request a New Link</Link>
                        </Button>
                        <Button asChild variant="ghost" className="h-9 w-full text-xs">
                            <Link href="/login">Return to Login</Link>
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Grant 2FA Reset Permission" />

            <div className="space-y-5">
                <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-border/70">
                        <span className="text-muted-foreground font-medium">Account</span>
                        <span className="font-semibold text-foreground">{userName}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/70">
                        <span className="text-muted-foreground font-medium">Email</span>
                        <span className="font-mono text-muted-foreground">{userEmail}</span>
                    </div>
                    {requestedAt && (
                        <div className="flex justify-between items-center pb-2 border-b border-border/70">
                            <span className="text-muted-foreground font-medium">Requested At</span>
                            <span className="text-foreground">{requestedAt}</span>
                        </div>
                    )}
                    {userIp && (
                        <div className="flex justify-between items-center pb-2 border-b border-border/70">
                            <span className="text-muted-foreground font-medium">IP Address</span>
                            <span className="font-mono text-muted-foreground">{userIp}</span>
                        </div>
                    )}
                    {reason && (
                        <div className="pt-1">
                            <span className="text-muted-foreground font-medium block mb-1">Reason:</span>
                            <p className="bg-muted/50 p-2 rounded text-muted-foreground italic">{reason}</p>
                        </div>
                    )}
                </div>

                <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        Please Confirm Your Permission
                    </p>
                    <p className="leading-relaxed">
                        By clicking below, you verify that you are the legitimate owner of this account and authorize administrators to clear your current two-factor authenticator codes.
                    </p>
                </div>

                {errors.token && <InputError message={errors.token} />}

                <form onSubmit={submit} className="space-y-3">
                    <Button
                        type="submit"
                        className="h-10 w-full font-medium bg-red-600 hover:bg-red-700 text-white"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Confirming Authorization...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Grant 2FA Reset Permission
                            </>
                        )}
                    </Button>

                    <Button asChild variant="ghost" className="h-9 w-full text-xs text-muted-foreground">
                        <Link href="/login">Cancel and Return to Login</Link>
                    </Button>
                </form>
            </div>
        </>
    );
}

TwoFactorResetConfirm.layout = {
    title: 'Authorize 2FA Reset',
    description: 'Grant administrator permission to reset your two-factor authenticator',
};
