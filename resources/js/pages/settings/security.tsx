import { Form, Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, KeyRound, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import TwoFactorEnforcementDialog from '@/components/two-factor-enforcement-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { edit } from '@/routes/security';

type Props = {
    passwordRules: string;
    twoFactorRequired?: boolean;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const page = usePage<{
        auth?: {
            user?: {
                is_super_admin?: boolean;
                is_college_admin?: boolean;
            };
        };
    }>();

    const isAdmin = Boolean(
        page.props.auth?.user?.is_super_admin || page.props.auth?.user?.is_college_admin
    );

    const hasMfaConfigured = Boolean(
        props.twoFactorEnabled || (props.passkeys && props.passkeys.length > 0)
    );

    const isEnforced = Boolean(props.twoFactorRequired && !hasMfaConfigured);

    const [showEnforceDialog, setShowEnforceDialog] = useState<boolean>(isEnforced);

    const handleSelectTwoFactor = () => {
        setShowEnforceDialog(false);
        setTimeout(() => {
            document.getElementById('two-factor-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSelectPasskey = () => {
        setShowEnforceDialog(false);
        setTimeout(() => {
            document.getElementById('passkeys-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            {/* Mandatory Security Enforcement Dialog (Non-dismissible) */}
            <TwoFactorEnforcementDialog
                open={showEnforceDialog && isEnforced}
                onSelectTwoFactor={handleSelectTwoFactor}
                onSelectPasskey={handleSelectPasskey}
                canManageTwoFactor={props.canManageTwoFactor}
                canManagePasskeys={props.canManagePasskeys}
            />

            {/* Top Banner when required and unfulfilled */}
            {isEnforced && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                <ShieldAlert className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold text-sm text-amber-950 dark:text-amber-200">
                                        Security Action Required: Set Up 2FA or Passkey
                                    </h2>
                                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/70 dark:text-amber-300">
                                        Mandatory for Admins
                                    </span>
                                </div>
                                <p className="text-xs text-amber-800 leading-relaxed dark:text-amber-300/90">
                                    Your administrator account is restricted. You must configure an <strong>Authenticator App (2FA)</strong> or register a <strong>Passkey</strong> below to unlock the dashboard.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowEnforceDialog(true)}
                            className="shrink-0 border-amber-300 bg-white/90 text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
                        >
                            View Requirement
                        </Button>
                    </div>
                </div>
            )}

            {/* Success Banner when fulfilled for administrators */}
            {hasMfaConfigured && isAdmin && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-700/60 dark:bg-emerald-950/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                <ShieldCheck className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-emerald-950 dark:text-emerald-200">
                                    Administrator Security Requirement Fulfilled
                                </p>
                                <p className="text-xs text-emerald-800 dark:text-emerald-300/90">
                                    Your account is verified with {props.twoFactorEnabled && props.passkeys?.length ? 'Two-Factor Authentication and a Passkey' : props.twoFactorEnabled ? 'Two-Factor Authentication' : 'a Passkey'}.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            asChild
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm"
                        >
                            <Link href="/admin/dashboard">
                                Go to Dashboard
                                <ArrowRight className="ml-1.5 size-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-w-xl space-y-6">
                <Heading
                    variant="small"
                    title="Update password"
                    description="Ensure your account is using a long, random password to stay secure"
                />

                <Form
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    Current password
                                </Label>

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder="Current password"
                                />

                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">New password</Label>

                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder="New password"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    className="mt-1 block w-full"
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-password-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <div
                id="two-factor-section"
                className={cn(
                    'transition-all duration-300',
                    isEnforced &&
                        'rounded-2xl border-2 border-amber-400/80 bg-amber-50/20 p-5 shadow-sm dark:border-amber-600/60 dark:bg-amber-950/10'
                )}
            >
                {isEnforced && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                        <Smartphone className="size-4" />
                        <span>Required Setup Option 1: Authenticator App (2FA)</span>
                    </div>
                )}
                <ManageTwoFactor
                    canManageTwoFactor={props.canManageTwoFactor}
                    requiresConfirmation={props.requiresConfirmation}
                    twoFactorEnabled={props.twoFactorEnabled}
                />
            </div>

            <div
                id="passkeys-section"
                className={cn(
                    'transition-all duration-300',
                    isEnforced &&
                        'rounded-2xl border-2 border-amber-400/80 bg-amber-50/20 p-5 shadow-sm dark:border-amber-600/60 dark:bg-amber-950/10'
                )}
            >
                {isEnforced && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                        <KeyRound className="size-4" />
                        <span>Required Setup Option 2: Biometric Passkey</span>
                    </div>
                )}
                <ManagePasskeys
                    canManagePasskeys={props.canManagePasskeys}
                    passkeys={props.passkeys}
                />
            </div>

        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
