import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { PageProps, Notification } from '@/types';

export default function NotificationsPage() {
    const { auth, notifications } = usePage<PageProps>().props;
    const count = notifications?.count ?? 0;
    const items = notifications?.items ?? [];
    const isSupervisor = auth.user?.role === 'supervisor';
    const isIntern = auth.user?.role === 'intern';

    const clearNotifications = () => {
        router.post('/notifications/clear');
    };

    useEffect(() => {
        if (count > 0) {
            router.post('/notifications/mark-read', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => router.reload(),
            });
        }
    }, [count]);

    const pageDescription = isSupervisor
        ? 'Review your pending resolution requests and recent responses.'
        : isIntern
          ? 'Review your recent request responses.'
          : 'Currently notifications are only available for HTE supervisors and interns.';

    const emptyMessage = isSupervisor
        ? 'You have no pending resolution requests.'
        : isIntern
          ? 'You have no recent notifications yet.'
          : 'Notifications are not yet available for your account.';

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
                        Notifications
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                        All notifications
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {pageDescription}
                    </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                    <Badge variant="secondary">
                        {count} Notification{count === 1 ? '' : 's'}
                    </Badge>
                    <Button variant="secondary" onClick={clearNotifications}>
                        Clear all
                    </Button>
                </div>
            </div>

            {count === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {items.map((notification: Notification) => (
                        <Card key={notification.id} className="overflow-hidden">
                            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <p className="text-base font-medium text-foreground">
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {notification.message}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Bell className="size-4 text-muted-foreground" />
                                    <Link
                                        href={notification.href}
                                        className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                    >
                                        View
                                    </Link>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
