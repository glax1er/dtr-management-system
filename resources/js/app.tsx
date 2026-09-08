import { createInertiaApp, router } from '@inertiajs/react';
import { FlashToaster } from '@/components/flash-toaster';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'TIMS';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('kiosk/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <FlashToaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Safety net: a Radix Dialog light-dismiss can, in rare timing cases,
// leave `pointer-events: none` stuck on <body> (see resources/js/components/ui/dialog.tsx
// for the primary fix). Every page navigation is a natural point where no
// dialog should legitimately still be open, so use it to guarantee the
// page never stays frozen.
router.on('navigate', () => {
    if (
        typeof document !== 'undefined' &&
        document.body &&
        !document.querySelector(
            '[data-slot="dialog-content"][data-state="open"]',
        ) &&
        document.body.style.pointerEvents === 'none'
    ) {
        document.body.style.removeProperty('pointer-events');
    }
});
