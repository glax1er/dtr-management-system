import { Link, router, usePage } from '@inertiajs/react';
import { Bell, BellOff, CheckCheck, ChevronRight, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast as sonnerToast } from 'sonner';
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
import { formatRelativeTime, getNotificationTone } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Notification, PageProps } from '@/types';

export function NotificationBell() {
    const { notifications } = usePage<PageProps>().props;

    const count = notifications?.count ?? 0;
    const items = notifications?.items ?? [];

    const seenIds = useRef<Set<string>>(
        new Set(items.map((n: Notification) => n.id)),
    );
    const isInitialMount = useRef(true);

    // `items` is a fresh array reference on every Inertia response (the 15s
    // poll below included), even when its content hasn't changed, so
    // depending on the array itself would re-run the toast effect on every
    // poll/navigation. Depend on this derived id list instead — its value
    // (not reference) only changes when the actual set of notifications does.
    const itemsKey = useMemo(
        () => items.map((n: Notification) => n.id).join(','),
        [items],
    );

    // Mirrors the latest `items` into a ref so the toast effect below can
    // read the current list without needing `items` itself in its deps
    // (which would reintroduce the reference-identity problem `itemsKey`
    // exists to avoid).
    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    });

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

    // Defined above the toast effect below (which calls it from inside a
    // "View" action) rather than further down the component — referencing
    // a const before its declaration only works at runtime because effects
    // and click handlers fire after the whole component body has run, but
    // eslint's exhaustive-deps check is purely lexical and flags it
    // regardless. Wrapped in useCallback (stable, since it only closes
    // over the imported `router` singleton) so it can be listed as a real
    // effect dependency below without changing identity on every render.
    const markAsRead = useCallback((notification: Notification) => {
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
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        for (const item of itemsRef.current) {
            if (!seenIds.current.has(item.id)) {
                seenIds.current.add(item.id);

                if (!item.read_at) {
                    sonnerToast(item.title, {
                        description: item.message,
                        action: {
                            label: 'View',
                            onClick: () => markAsRead(item),
                        },
                    });
                }
            }
        }
    }, [itemsKey, markAsRead]);

    const markAllAsRead = () => {
        router.post(
            '/notifications/mark-all-read',
            {},
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const deleteNotification = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        router.delete(`/notifications/${id}`, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const clearNotifications = () => {
        router.delete('/notifications', {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
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
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
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

                    <div className="flex items-center gap-1">
                        {count > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={markAllAsRead}
                                title="Mark all as read"
                            >
                                <CheckCheck className="mr-1 size-3.5" />
                                Mark read
                            </Button>
                        )}

                        {items.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={clearNotifications}
                                title="Clear all notifications"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
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
                                    className="group relative p-0 focus:bg-transparent"
                                    asChild
                                >
                                    <div
                                        onClick={() => markAsRead(notification)}
                                        className={cn(
                                            'flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/10',
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

                                        <span className="min-w-0 flex-1 space-y-0.5 pr-6">
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

                                        <button
                                            type="button"
                                            title="Delete notification"
                                            onClick={(e) =>
                                                deleteNotification(
                                                    e,
                                                    notification.id,
                                                )
                                            }
                                            className="absolute top-3 right-2.5 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus:opacity-100"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
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
    );
}
