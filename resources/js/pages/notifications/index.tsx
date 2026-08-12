import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { PageProps, Notification } from '@/types';

export default function NotificationsPage() {
    const { notifications } = usePage<PageProps>().props;

    const count = notifications?.count ?? 0;
    const items = notifications?.items ?? [];

    const clearNotifications = () => {
        router.delete('/notifications', {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const markAsRead = (notification: Notification) => {
        router.post(
            `/notifications/${notification.id}/read`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

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
                        Review your notification history.
                    </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                    <Badge variant="secondary">
                        {count} Unread
                    </Badge>

                    {items.length > 0 && (
                        <Button
                            variant="secondary"
                            onClick={clearNotifications}
                        >
                            Clear all
                        </Button>
                    )}
                </div>
            </div>

            {items.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        You have no notifications.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {items.map((notification: Notification) => {
                        const unread = !notification.read_at;

                        return (
                            <Card
                                key={notification.id}
                                className={
                                    unread
                                        ? 'border-primary/40'
                                        : ''
                                }
                            >
                                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-medium text-foreground">
                                                {notification.title}
                                            </p>

                                            {unread && (
                                                <Badge>New</Badge>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            {notification.message}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Bell className="size-4 text-muted-foreground" />

                                        {unread && (
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    markAsRead(notification)
                                                }
                                            >
                                                Mark read
                                            </Button>
                                        )}

                                        <Link
                                            href={notification.href}
                                            onClick={() => {
                                                if (unread) {
                                                    markAsRead(notification);
                                                }
                                            }}
                                            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                        >
                                            View
                                        </Link>
                                    </div>
                                </CardHeader>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}