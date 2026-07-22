import { QrCode } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <QrCode className="size-5 text-white" strokeWidth={2.25} />
            </div>

            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="leading-tight font-semibold">
                    CIC - DTR System
                </span>
            </div>
        </>
    );
}