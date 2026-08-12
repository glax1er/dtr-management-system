import { Link, usePage } from '@inertiajs/react';
import { Bell, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Button,
} from '@/components/ui/button';
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
                    className="relative h-9 w-9 rounded-full"
                    aria-label="Notifications"
                >
                    <Bell className="size-5" />
                    {count > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute right-0 top-0 translate-x-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[10px]"
                        >
                            {count}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[20rem] min-w-[16rem]">
                <div className="px-3 py-2">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <p className="text-xs text-muted-foreground">
                        {count > 0
                            ? `You have ${count} pending request${count === 1 ? '' : 's'}`
                            : 'No new notifications'}
                    </p>
                </div>
                <DropdownMenuSeparator />
                {count === 0 ? (
                    <DropdownMenuItem disabled>
                        <span className="text-sm text-muted-foreground">
                            No pending notifications
                        </span>
                    </DropdownMenuItem>
                ) : (
                    items.map((notification: Notification) => (
                        <DropdownMenuItem asChild key={notification.id}>
                            <Link
                                href={notification.href}
                                className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-2 text-sm"
                            >
                                <span className="font-medium">
                                    {notification.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {notification.message}
                                </span>
                                <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                                    View
                                    <ChevronRight className="size-3" />
                                </span>
                            </Link>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
