import { Form, Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import ForgotPasswordDialog from '@/components/forgot-password-dialog';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import VerifyEmailDialog from '@/components/verify-email-dialog';
import { register } from '@/routes';
import { store } from '@/routes/login';

type Props = {
    status?: string;
    canResetPassword: boolean;
    showVerification?: boolean;
    verificationEmail?: string;
};

export default function Login({
    status,
    canResetPassword,
    showVerification = false,
    verificationEmail = '',
}: Props) {
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(showVerification);
    const [verifyEmail, setVerifyEmail] = useState(verificationEmail);

    const page = usePage<{ errors?: Record<string, string> }>();

    // Both effects below react to Inertia updating this page's props in
    // place after a server round-trip (e.g. a failed login submit
    // redirects back to /login with new errors/flags) — the component
    // instance isn't remounted, so these can't be replaced by an
    // initializer or a local event handler.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (showVerification) {
            // These flags arrive from server-side redirects/props and are
            // intentionally mirrored into the dialog state when the page is re-rendered.
            setShowVerifyModal(true);

            if (verificationEmail) {
                setVerifyEmail(verificationEmail);
            }
        }
    }, [showVerification, verificationEmail]);
    /* eslint-enable react-hooks/set-state-in-effect */

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (page.props.errors?.unverified_email) {
            // Page errors trigger the verification modal after a login attempt.
            setVerifyEmail(page.props.errors.unverified_email);
            setShowVerifyModal(true);
        }
    }, [page.props.errors?.unverified_email]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return (
        <>
            <Head title="Log in">
                <link rel="preload" as="image" href="/images/USeP-Eagle-opt.jpg" />
            </Head>

            {status && (
                <div className="mb-4 flex animate-in items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 duration-200">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="leading-relaxed">{status}</span>
                </div>
            )}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="email@usep.edu.ph"
                                        className="h-10 pl-9"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-sm font-medium">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowForgotPassword(true)
                                            }
                                            className="cursor-pointer text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </button>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    className="h-10"
                                    startIcon={<Lock className="size-4" />}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-2.5 pt-0.5">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="cursor-pointer"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="cursor-pointer text-sm font-normal text-muted-foreground select-none hover:text-foreground transition-colors"
                                >
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 h-10 w-full text-sm font-medium shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <>
                                        <Spinner className="mr-2 size-4" />
                                        <span>Logging in...</span>
                                    </>
                                ) : (
                                    'Log in'
                                )}
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground pt-1">
                            Don't have an account?{' '}
                            <TextLink
                                href={register()}
                                tabIndex={5}
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                Sign up
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            <ForgotPasswordDialog
                open={showForgotPassword}
                onOpenChange={setShowForgotPassword}
            />

            <VerifyEmailDialog
                open={showVerifyModal}
                onOpenChange={setShowVerifyModal}
                email={verifyEmail}
            />
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
