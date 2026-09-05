import { router } from '@inertiajs/react';
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

function showFlash(props: FlashPageProps) {
    const flashToast = props.toast ?? props.flash?.toast;

    if (flashToast?.message) {
        const fn = sonnerToast[flashToast.type] ?? sonnerToast.success;
        fn(flashToast.message);

        return;
    }

    if (props.flash?.success) {
        sonnerToast.success(props.flash.success);

        return;
    }

    if (props.flash?.error) {
        sonnerToast.error(props.flash.error);
    }
}

// Reads flash/toast data straight from Inertia's router events rather than
// usePage(), because this component is mounted as a sibling of the Inertia
// <App> (see app.tsx's withApp), not as a descendant of it — usePage()'s
// context provider only wraps <App>'s own children, so calling it here
// throws "usePage must be used within the Inertia component". The
// 'navigate' event fires on every completed visit, including the very
// first page load, so it covers both the initial load and later redirects.
export function FlashToaster() {
    useEffect(() => {
        return router.on('navigate', (event) => {
            showFlash(event.detail.page.props as FlashPageProps);
        });
    }, []);

    return null;
}
