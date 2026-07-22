import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { resend } from '@/routes/verification';

const RESEND_COOLDOWN_SECONDS = 30;

type VerifyEmailDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The email a new verification link should be sent to. */
    email?: string;
    title: string;
    description: string;
    /** Optional extra footer button, e.g. "Go to login". */
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
};

/**
 * "Verify your email" dialog with a resend button that's disabled for
 * RESEND_COOLDOWN_SECONDS after each send. Posts to the guest-accessible
 * verification.resend route (see VerificationResendController) since the
 * person viewing this dialog is never logged in at this point — right
 * after registering, or when login was just blocked for being unverified.
 */
export default function VerifyEmailDialog({
    open,
    onOpenChange,
    email,
    title,
    description,
    secondaryAction,
}: VerifyEmailDialogProps) {
    const [cooldown, setCooldown] = useState(0);
    const [sending, setSending] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Tick the cooldown down once a second while it's active.
    useEffect(() => {
        if (cooldown <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setCooldown((seconds) => Math.max(0, seconds - 1));
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [cooldown]);

    // Fresh dialog for a fresh email — don't carry over a stale cooldown.
    useEffect(() => {
        if (open) {
            setCooldown(0);
        }
    }, [open, email]);

    const handleResend = () => {
        if (!email || cooldown > 0 || sending) {
            return;
        }

        setSending(true);

        router.post(
            resend.url(),
            { email },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setSending(false);
                    setCooldown(RESEND_COOLDOWN_SECONDS);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <DialogFooter className="sm:justify-between">
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={cooldown > 0 || sending || !email}
                        onClick={handleResend}
                    >
                        {sending && <Spinner />}
                        {cooldown > 0
                            ? `Resend in ${cooldown}s`
                            : 'Resend verification email'}
                    </Button>

                    {secondaryAction && (
                        <Button type="button" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}