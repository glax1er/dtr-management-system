import { Head, router } from '@inertiajs/react';
import { MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';

interface KioskProps {
    kiosk: {
        id: number;
        name: string;
        device_token: string;
        is_active: boolean;
        scan_url: string;
    };
}

export default function AdminKiosk({ kiosk }: KioskProps) {
    const [copied, setCopied] = useState(false);

    const copyLink = async () => {
        await navigator.clipboard.writeText(kiosk.scan_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const regenerate = () => {
        if (
            confirm(
                'Regenerate the kiosk link? The old link will stop working immediately.',
            )
        ) {
            router.post(
                `/admin/kiosk/${kiosk.id}/regenerate`,
                {},
                { preserveScroll: true },
            );
        }
    };

    const toggle = () => {
        router.post(
            `/admin/kiosk/${kiosk.id}/toggle`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Kiosk" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <MonitorSmartphone className="size-5" />
                    </span>
                    Scanning Kiosk
                </h1>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="mb-2">
                                    {kiosk.name}
                                </CardTitle>
                                <CardDescription>
                                    Open this link on the shared tablet/device.
                                </CardDescription>
                            </div>
                            <StatusBadge
                                status={kiosk.is_active ? 'active' : 'inactive'}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={kiosk.scan_url}
                                className="font-mono text-sm"
                            />
                            <Button variant="outline" onClick={copyLink}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={regenerate}>
                                Regenerate Link
                            </Button>
                            <Button onClick={toggle}>
                                {kiosk.is_active
                                    ? 'Disable Kiosk'
                                    : 'Enable Kiosk'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminKiosk.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Kiosk', href: '/admin/kiosk' },
    ],
};
