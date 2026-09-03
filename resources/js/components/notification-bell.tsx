import { Link, router, usePage } from '@inertiajs/react';
import { Bell, BellOff, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RejectedResolutionDialog } from '@/components/rejected-resolution-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    formatRelativeTime,
    getNotificationTone,
    isRejectedResolutionNotification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Notification, PageProps } from '@/types';

export function NotificationBell() {
    const { notifications } = usePage<PageProps>().props;
    const [selectedRejectedNotification, setSelectedRejectedNotification] =
        useState<Notification | null>(null);

    const count = notifications?.count ?? 0;
    const items = notifications?.items ?? [];

    useEffect(() => {
        const interval = window.setInterval(() => {
            router.reload({
                only: ['notifications'],
            });
        }, 15000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        if (isRejectedResolutionNotification(notification)) {
            if (!notification.read_at) {
                router.post(
                    `/notifications/${notification.id}/read`,
                    {},
                    {
                        preserveScroll: true,
                        preserveState: true,
                    },
                );
            }
            setSelectedRejectedNotification(notification);
            return;
        }

        markAsRead(notification);
    };

    const markAsRead = (notification: Notification) => {
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

    const clearNotifications = () => {
        router.delete('/notifications', {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-full"
                    aria-label="Notifications"
                >
                    <Bell className="size-5" />

                    {count > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute top-0 right-0 flex h-4 min-w-4 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full border-2 border-background px-1 text-[10px] leading-none"
                        >
                            {count > 99 ? '99+' : count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-popover p-0 shadow-lg sm:w-96"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                        <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">
                            Notifications
                        </DropdownMenuLabel>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {count > 0
                                ? `${count} unread notification${count === 1 ? '' : 's'}`
                                : 'You’re all caught up'}
                        </p>
                    </div>

                    {count > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={clearNotifications}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <BellOff className="size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            No notifications yet
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[24rem] space-y-1 overflow-y-auto p-2">
                        {items.map((notification: Notification) => {
                            const unread = !notification.read_at;
                            const { icon: Icon, badgeClassName } =
                                getNotificationTone(notification);

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className="p-0 focus:bg-transparent"
                                    asChild
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/10',
                                            unread && 'bg-primary/5',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-full',
                                                badgeClassName,
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </span>

                                        <span className="min-w-0 flex-1 space-y-0.5">
                                            <span className="flex items-center gap-1.5">
                                                <span className="truncate text-sm font-medium text-foreground">
                                                    {notification.title}
                                                </span>

                                                {unread && (
                                                    <span
                                                        className="size-1.5 shrink-0 rounded-full bg-primary"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>

                                            <span className="block truncate text-xs text-muted-foreground">
                                                {notification.message}
                                            </span>

                                            <span className="text-[11px] text-muted-foreground">
                                                {formatRelativeTime(
                                                    notification.created_at,
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link
                        href="/notifications"
                        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
                    >
                        <span>View all notifications</span>
                        <ChevronRight className="size-3" />
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <RejectedResolutionDialog
            open={selectedRejectedNotification !== null}
            onOpenChange={(open) => {
                if (!open) {
                    setSelectedRejectedNotification(null);
                }
            }}
            notification={selectedRejectedNotification}
        />
        </>
    );
}