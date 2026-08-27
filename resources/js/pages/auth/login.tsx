import { Form, Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import ForgotPasswordDialog from '@/components/forgot-password-dialog';
import InputError from '@/components/input-error';
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

    useEffect(() => {
        if (showVerification) {
            setShowVerifyModal(true);
            if (verificationEmail) {
                setVerifyEmail(verificationEmail);
            }
        }
    }, [showVerification, verificationEmail]);

    useEffect(() => {
        if (page.props.errors?.unverified_email) {
            setVerifyEmail(page.props.errors.unverified_email);
            setShowVerifyModal(true);
        }
    }, [page.props.errors?.unverified_email]);

    return (
        <>
            <Head title="Log in" />

            {status && (
                <div className="mb-2 flex items-start gap-2.5 p-3.5 text-xs font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-lg animate-in fade-in-50 duration-300">
                    <span className="shrink-0 mt-0.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="leading-relaxed">{status}</span>
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@usep.edu.ph"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPassword(true)}
                                            className="ml-auto text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer transition-colors"
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
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5}>
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
