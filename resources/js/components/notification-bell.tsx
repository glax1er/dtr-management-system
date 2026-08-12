import { Link, usePage } from '@inertiajs/react';
import { Bell, ChevronRight } from 'lucide-react';
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
import type { PageProps, Notification } from '@/types';

export function NotificationBell() {
    const { notifications } = usePage<PageProps>().props;
    const count = notifications?.count ?? 0;
    const items = notifications?.items ?? [];

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
                            className={
                                'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px] ' +
                                (count > 0 ? 'animate-pulse' : '')
                            }
                        >
                            {count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-full max-w-[22rem] min-w-[16rem] overflow-hidden rounded-2xl border border-border bg-popover p-0 shadow-lg">
                <div className="space-y-1 border-b border-border px-4 py-3">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <p className="text-xs text-muted-foreground">
                        {count > 0 ? (
                            <>
                                You have{' '}
                                <span className="font-medium text-foreground">
                                    {count}
                                </span>{' '}
                                pending request{count === 1 ? '' : 's'}
                            </>
                        ) : (
                            'No new notifications'
                        )}
                    </p>
                </div>

                {count === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                        No pending notifications
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {items.map((notification: Notification) => (
                            <DropdownMenuItem asChild key={notification.id}>
                                <Link
                                    href={notification.href}
                                    className="flex w-full flex-col gap-1 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-accent/10"
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
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link
                        href="/supervisor/resolution-tickets"
                        className="flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
                    >
                        <span>View all requests</span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
