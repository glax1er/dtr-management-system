import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastFlash {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface FlashPageProps {
    toast?: ToastFlash | null;
    flash?: {
        toast?: ToastFlash | null;
        success?: string | null;
        error?: string | null;
    };
    [key: string]: unknown;
}

export function FlashToaster() {
    const { toast, flash } = usePage<FlashPageProps>().props;

    useEffect(() => {
        const flashToast = toast ?? flash?.toast;
        if (flashToast?.message) {
            const fn = sonnerToast[flashToast.type] ?? sonnerToast.success;
            fn(flashToast.message);
            return;
        }

        if (flash?.success) {
            sonnerToast.success(flash.success);
            return;
        }

        if (flash?.error) {
            sonnerToast.error(flash.error);
        }
    }, [toast, flash]);

    return null;
}