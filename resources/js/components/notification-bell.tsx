import { Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
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
import type { Notification, PageProps } from '@/types';

export function NotificationBell() {
    const { notifications } = usePage<PageProps>().props;

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
                            className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px]"
                        >
                            {count > 99 ? '99+' : count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-[22rem] overflow-hidden rounded-2xl border border-border bg-popover p-0 shadow-lg"
            >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                        <DropdownMenuLabel className="p-0">
                            Notifications
                        </DropdownMenuLabel>

                        <p className="text-xs text-muted-foreground">
                            {count > 0
                                ? `${count} unread notification${
                                      count === 1 ? '' : 's'
                                  }`
                                : 'No unread notifications'}
                        </p>
                    </div>

                    {count > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearNotifications}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                        No unread notifications
                    </div>
                ) : (
                    <div className="max-h-[24rem] space-y-1 overflow-y-auto p-2">
                        {items.map((notification: Notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="p-0 focus:bg-transparent"
                                asChild
                            >
                                <button
                                    type="button"
                                    onClick={() => markAsRead(notification)}
                                    className="flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-accent/10"
                                >
                                    <span className="font-medium text-foreground">
                                        {notification.title}
                                    </span>

                                    <span className="text-xs text-muted-foreground">
                                        {notification.message}
                                    </span>

                                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                        View
                                        <ChevronRight className="size-3" />
                                    </span>
                                </button>
                            </DropdownMenuItem>
                        ))}
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