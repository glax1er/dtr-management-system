import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = (flash?.toast ?? flash) as FlashToast | undefined;

            if (data?.message) {
                const type = data.type ?? 'success';
                toast[type](data.message);
                return;
            }

            if (flash?.success) {
                toast.success(flash.success);
                return;
            }

            if (flash?.error) {
                toast.error(flash.error);
            }
        });
    }, []);
}
