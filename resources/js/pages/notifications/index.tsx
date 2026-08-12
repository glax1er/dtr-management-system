import { router, usePage } from '@inertiajs/react';
import { BellOff, Check, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatRelativeTime, getNotificationTone } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Notification, PageProps } from '@/types';

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

    const openNotification = (notification: Notification) => {
        router.post(
            `/notifications/${notification.id}/read`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    router.visit(notification.href);
                },
            },
        );
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">
                        Notifications
                    </p>

                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        All notifications
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Review your notification history.
                    </p>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <Badge variant="secondary" className="shrink-0">
                        {count} unread
                    </Badge>

                    {items.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearNotifications}
                        >
                            Clear all
                        </Button>
                    )}
                </div>
            </div>

            {items.length === 0 ? (
                <Card className="items-center gap-2 py-14 text-center">
                    <BellOff className="size-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        You have no notifications.
                    </p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {items.map((notification: Notification) => {
                        const unread = !notification.read_at;
                        const { icon: Icon, badgeClassName } =
                            getNotificationTone(notification);

                        return (
                            <Card
                                key={notification.id}
                                className={cn(
                                    'flex-row items-start gap-3 p-4 sm:items-center sm:gap-4',
                                    unread && 'border-primary/40 bg-primary/5',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                                        badgeClassName,
                                    )}
                                >
                                    <Icon className="size-5" />
                                </span>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-foreground sm:text-base">
                                            {notification.title}
                                        </p>

                                        {unread && (
                                            <Badge className="shrink-0">
                                                New
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        {notification.message}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {formatRelativeTime(
                                            notification.created_at,
                                        )}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                    {unread && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                markAsRead(notification)
                                            }
                                        >
                                            <Check className="size-4" />
                                            Mark read
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                            openNotification(notification)
                                        }
                                    >
                                        View
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}