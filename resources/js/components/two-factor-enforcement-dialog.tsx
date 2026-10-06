import { router } from '@inertiajs/react';
import { KeyRound, LogOut, ShieldAlert, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    open: boolean;
    onSelectTwoFactor: () => void;
    onSelectPasskey: () => void;
    canManageTwoFactor?: boolean;
    canManagePasskeys?: boolean;
};

export default function TwoFactorEnforcementDialog({
    open,
    onSelectTwoFactor,
    onSelectPasskey,
    canManageTwoFactor = true,
    canManagePasskeys = true,
}: Props) {
    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent
                className="sm:max-w-lg [&>button:last-child]:hidden border-amber-300/60 dark:border-amber-700/60 shadow-2xl"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="items-center text-center space-y-3">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner dark:bg-amber-950/60 dark:text-amber-400">
                        <ShieldAlert className="size-8" />
                    </div>

                    <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Administrative Security Requirement
                        </span>
                        <DialogTitle className="text-xl font-bold tracking-tight">
                            Security Setup Required
                        </DialogTitle>
                    </div>

                    <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        Your account has administrative privileges. To protect sensitive intern records, official attendance logs, and institutional systems, you must configure at least one secondary security factor before accessing the system.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <p className="font-medium">
                        ⚠️ <strong>Action Required:</strong> Access to the administrator dashboard and other modules is locked. You cannot exit this screen until you configure one of the options below.
                    </p>
                </div>

                <div className="grid gap-3 pt-1">
                    {canManageTwoFactor && (
                        <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Smartphone className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm leading-none">
                                        Authenticator App (2FA)
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Use Google Authenticator, Microsoft Authenticator, or Authy on your phone to scan a QR code.
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="mt-3 w-full"
                                size="sm"
                                onClick={onSelectTwoFactor}
                            >
                                Set Up Authenticator App
                            </Button>
                        </div>
                    )}

                    {canManagePasskeys && (
                        <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <KeyRound className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-sm leading-none">
                                        Biometric Passkey
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Log in instantly with Windows Hello, Apple Touch ID / Face ID, or a hardware security key.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="mt-3 w-full"
                                size="sm"
                                onClick={onSelectPasskey}
                            >
                                Register a Passkey
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center pt-2">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <LogOut className="size-3.5" />
                        <span>Need to set this up later? Log out of account</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
