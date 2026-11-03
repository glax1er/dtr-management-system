import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, LoaderCircle, ShieldAlert } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TwoFactorResetProps {
    prefilledEmail?: string | null;
    status?: string;
}

export default function TwoFactorReset({
    prefilledEmail,
    status,
}: TwoFactorResetProps) {
    const { data, setData, post, processing, errors } = useForm({
        email: prefilledEmail || '',
        reason: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/two-factor-reset');
    };

    return (
        <>
            <Head title="Request 2FA Reset" />

            <div className="space-y-5">
                {status && (
                    <div className="flex animate-in items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 duration-300 fade-in-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="leading-relaxed">{status}</span>
                    </div>
                )}

                <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        Verification Process
                    </p>
                    <p className="text-muted-foreground dark:text-amber-300/80 leading-relaxed">
                        To prevent unauthorized account takeovers, an authorization email will be sent to your verified email address. You must click the link to grant permission before an administrator can approve the reset.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-xs font-medium">
                            Account Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            autoComplete="email"
                            autoFocus={!prefilledEmail}
                            required
                            placeholder="your-email@example.com"
                            className="h-10"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reason" className="text-xs font-medium">
                            Reason for Reset (Optional)
                        </Label>
                        <Textarea
                            id="reason"
                            name="reason"
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            placeholder="e.g., Lost my phone, changed devices without exporting authenticator app"
                            rows={3}
                            className="text-xs"
                        />
                        <InputError message={errors.reason} />
                    </div>

                    <Button
                        type="submit"
                        className="h-10 w-full font-medium"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Sending Authorization Email...
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Request 2FA Reset
                            </>
                        )}
                    </Button>
                </form>

                <div className="border-t border-border/60 pt-2 text-center text-xs text-muted-foreground">
                    <span>Remember your codes or found your phone? </span>
                    <Link
                        href="/login"
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                        Return to login
                    </Link>
                </div>
            </div>
        </>
    );
}

TwoFactorReset.layout = {
    title: 'Reset Two-Factor Authentication',
    description: 'Lost access to your authenticator app and recovery codes?',
};
