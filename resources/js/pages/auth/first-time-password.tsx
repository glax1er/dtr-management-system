import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleDashed,
    KeyRound,
    LockKeyhole,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { logout } from '@/routes';

interface Props {
    name: string;
    email: string;
    passwordRules: string;
}

export default function FirstTimePassword({
    name,
    email,
    passwordRules,
}: Props) {
    const [open, setOpen] = useState(true);

    const { data, setData, post, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    // Dynamic password rules check matching server validation
    const hasMinLength = data.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(data.password);
    const hasLowercase = /[a-z]/.test(data.password);
    const hasMixedCase = hasUppercase && hasLowercase;
    const hasNumber = /[0-9]/.test(data.password);
    const hasSymbol = /[^A-Za-z0-9]/.test(data.password);
    const isNotDefault =
        data.password.length > 0 &&
        data.password !== 'Supervisor@123' &&
        data.password.toLowerCase() !== 'supervisor@123';

    // Calculate strength score (0 to 4)
    const strengthScore =
        (hasMinLength ? 1 : 0) +
        (hasMixedCase ? 1 : 0) +
        (hasNumber ? 1 : 0) +
        (hasSymbol ? 1 : 0);

    let strengthLabel = 'Very Weak';
    let strengthColorClass = 'text-muted-foreground';
    let progressColor = 'bg-muted';

    if (data.password.length > 0) {
        if (strengthScore <= 1) {
            strengthLabel = 'Weak';
            strengthColorClass = 'text-rose-600 dark:text-rose-400';
            progressColor = 'bg-rose-500';
        } else if (strengthScore === 2) {
            strengthLabel = 'Fair';
            strengthColorClass = 'text-amber-600 dark:text-amber-400';
            progressColor = 'bg-amber-500';
        } else if (strengthScore === 3) {
            strengthLabel = 'Good';
            strengthColorClass = 'text-blue-600 dark:text-blue-400';
            progressColor = 'bg-blue-500';
        } else if (strengthScore === 4 && isNotDefault) {
            strengthLabel = 'Strong';
            strengthColorClass = 'text-emerald-600 dark:text-emerald-400';
            progressColor = 'bg-emerald-500';
        }
    }

    const passwordsMatch =
        data.password_confirmation.length > 0 &&
        data.password === data.password_confirmation;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/password/first-login', {
            preserveScroll: true,
            onFinish: () =>
                reset('password', 'password_confirmation', 'current_password'),
        });
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);

        if (!isOpen) {
            router.post(logout());
        }
    };

    const handleLogout = () => {
        setOpen(false);
        router.post(logout());
    };

    return (
        <>
            <Head title="Set Initial Password" />

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    onPointerDownOutside={(e) => e.preventDefault()}
                    className="max-h-[92vh] overflow-y-auto scrollbar-none p-6 sm:max-w-md"
                >
                    <DialogHeader className="flex flex-col items-center space-y-3 text-center">
                        <div className="rounded-full bg-primary/10 p-3 text-primary ring-8 ring-primary/5">
                            <KeyRound className="h-7 w-7" />
                        </div>

                        <div className="space-y-1 text-center">
                            <DialogTitle className="text-center text-lg font-semibold tracking-tight text-foreground">
                                Set your password
                            </DialogTitle>
                            <DialogDescription className="mx-auto max-w-xs text-center text-xs text-muted-foreground">
                                Because this is your first time logging in, please create a new private password to continue.
                            </DialogDescription>
                        </div>

                        {(name || email) && (
                            <p className="mt-1 inline-block max-w-[280px] truncate rounded-md border border-border/50 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
                                {name ? `${name} ` : ''}{email ? `(${email})` : ''}
                            </p>
                        )}
                    </DialogHeader>

                    <form onSubmit={submit} className="w-full space-y-4 pt-1">
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="current_password"
                                className="text-xs font-medium text-foreground"
                            >
                                Current Password
                            </Label>
                            <PasswordInput
                                id="current_password"
                                name="current_password"
                                value={data.current_password}
                                onChange={(e) =>
                                    setData('current_password', e.target.value)
                                }
                                placeholder="Enter your current password"
                                autoComplete="current-password"
                                autoFocus
                                required
                                disabled={processing}
                                className="h-10"
                            />
                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="password"
                                className="text-xs font-medium text-foreground"
                            >
                                New Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                value={data.password}
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                placeholder="Create a new password"
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                                required
                                disabled={processing}
                                className="h-10"
                            />
                            <InputError message={errors.password} />

                            {data.password.length > 0 && (
                                <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-muted-foreground">
                                            Password strength:
                                        </span>
                                        <span
                                            className={cn(
                                                'font-medium',
                                                strengthColorClass,
                                            )}
                                        >
                                            {strengthLabel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={cn(
                                                    'h-1.5 rounded-full transition-all duration-300',
                                                    strengthScore >= step
                                                        ? progressColor
                                                        : 'bg-muted dark:bg-muted/60',
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-[11px] text-muted-foreground">
                            <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                                <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                                <span>Password Requirements:</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                <div
                                    className={cn(
                                        'flex items-center gap-1.5 transition-colors',
                                        hasMinLength
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {hasMinLength ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    )}
                                    <span>At least 8 characters</span>
                                </div>

                                <div
                                    className={cn(
                                        'flex items-center gap-1.5 transition-colors',
                                        hasMixedCase
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {hasMixedCase ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    )}
                                    <span>Upper & lowercase letters</span>
                                </div>

                                <div
                                    className={cn(
                                        'flex items-center gap-1.5 transition-colors',
                                        hasNumber
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {hasNumber ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    )}
                                    <span>At least one number (0-9)</span>
                                </div>

                                <div
                                    className={cn(
                                        'flex items-center gap-1.5 transition-colors',
                                        hasSymbol
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {hasSymbol ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    )}
                                    <span>At least one symbol (!@#$)</span>
                                </div>

                                <div
                                    className={cn(
                                        'flex items-center gap-1.5 transition-colors sm:col-span-2',
                                        isNotDefault
                                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {isNotDefault ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <CircleDashed className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                    )}
                                    <span>Cannot be default placeholder</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="password_confirmation"
                                className="text-xs font-medium text-foreground"
                            >
                                Confirm New Password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                placeholder="Confirm your new password"
                                autoComplete="new-password"
                                required
                                disabled={processing}
                                className="h-10"
                            />
                            <InputError message={errors.password_confirmation} />

                            {data.password_confirmation.length > 0 && (
                                <div className="pt-0.5">
                                    {passwordsMatch ? (
                                        <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>Passwords match</span>
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                            Passwords do not match yet
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                type="submit"
                                className="h-10 w-full font-medium"
                                disabled={
                                    processing ||
                                    !data.current_password ||
                                    !data.password ||
                                    !data.password_confirmation
                                }
                            >
                                {processing ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Updating password...
                                    </>
                                ) : (
                                    'Update Password & Continue'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

FirstTimePassword.layout = {
    title: 'Set Your Initial Password',
    description: 'Please update your temporary password to continue',
};
