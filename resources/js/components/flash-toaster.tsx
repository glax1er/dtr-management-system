import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastFlash {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

interface FlashPageProps {
    toast?: ToastFlash | null;
    [key: string]: unknown;
}

export function FlashToaster() {
    const { toast } = usePage<FlashPageProps>().props;

    useEffect(() => {
        if (!toast?.message) return;

        const fn = sonnerToast[toast.type] ?? sonnerToast.success;
        fn(toast.message);
    }, [toast]);

    return null;
}