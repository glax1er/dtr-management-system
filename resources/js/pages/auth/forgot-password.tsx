import { Form, Head } from '@inertiajs/react';
import { CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot Password" />

            <div className="space-y-5">
                {status && (
                    <div className="flex animate-in items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 duration-300 fade-in-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{status}</span>
                    </div>
                )}

                <Form {...email.form()}>
                    {({ processing, errors }) => (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-medium"
                                >
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    placeholder="your-email@example.com"
                                    className="h-10"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                className="h-10 w-full font-medium"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                            >
                                {processing ? (
                                    <>
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                        Sending reset link...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        Send Password Reset Link
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </Form>

                <div className="border-t border-border/60 pt-2 text-center text-xs text-muted-foreground">
                    <span>Remember your password? </span>
                    <TextLink
                        href={login()}
                        className="font-medium text-primary hover:underline"
                    >
                        Log in
                    </TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
