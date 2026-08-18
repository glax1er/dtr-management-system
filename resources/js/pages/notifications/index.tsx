import { router, usePage } from '@inertiajs/react';
import { BellOff, Check, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    NOTIFICATION_CATEGORY_LABELS,
    formatRelativeTime,
    getNotificationCategory,
    getNotificationTone
    
} from '@/lib/notifications';
import type {NotificationCategory} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { Notification, PageProps } from '@/types';

type StatusFilter = 'all' | 'unread' | 'read';
type CategoryFilter = 'all' | NotificationCategory;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
];

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All types' },
    { value: 'approved', label: NOTIFICATION_CATEGORY_LABELS.approved },
    { value: 'rejected', label: NOTIFICATION_CATEGORY_LABELS.rejected },
    { value: 'pending', label: NOTIFICATION_CATEGORY_LABELS.pending },
    { value: 'general', label: NOTIFICATION_CATEGORY_LABELS.general },
];

/** Buckets a notification's timestamp into a coarse, human-friendly group. */
function getDateGroup(dateString?: string | null): string {
    if (!dateString) {
        return 'Earlier';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return 'Earlier';
    }

    const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    const today = startOfDay(new Date());
    const day = startOfDay(date);
    const diffDays = Math.round((today - day) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
return 'Today';
}

    if (diffDays === 1) {
return 'Yesterday';
}

    if (diffDays <= 7) {
return 'This week';
}

    if (diffDays <= 30) {
return 'This month';
}

    return 'Earlier';
}

const GROUP_ORDER = [
    'Today',
    'Yesterday',
    'This week',
    'This month',
    'Earlier',
];

export default function NotificationsPage() {
    const { notifications } = usePage<PageProps>().props;

    const count = notifications?.count ?? 0;
    const items = useMemo(
        () => notifications?.items ?? [],
        [notifications?.items],
    );

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [query, setQuery] = useState('');

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

    const filteredItems = useMemo(() => {
        const q = query.trim().toLowerCase();

        return items.filter((notification) => {
            const unread = !notification.read_at;

            if (statusFilter === 'unread' && !unread) {
return false;
}

            if (statusFilter === 'read' && unread) {
return false;
}

            if (
                categoryFilter !== 'all' &&
                getNotificationCategory(notification) !== categoryFilter
            ) {
                return false;
            }

            if (
                q &&
                !notification.title.toLowerCase().includes(q) &&
                !notification.message.toLowerCase().includes(q)
            ) {
                return false;
            }

            return true;
        });
    }, [items, statusFilter, categoryFilter, query]);

    const groups = useMemo(() => {
        const buckets = new Map<string, Notification[]>();

        for (const notification of filteredItems) {
            const key = getDateGroup(notification.created_at);
            const bucket = buckets.get(key) ?? [];
            bucket.push(notification);
            buckets.set(key, bucket);
        }

        return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
            key,
            items: buckets.get(key)!,
        }));
    }, [filteredItems]);

    const isFiltering =
        statusFilter !== 'all' || categoryFilter !== 'all' || query !== '';

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Notifications
                    </h1>
                    <p className="text-muted-foreground">
                        {count > 0
                            ? `${count} unread notification${count === 1 ? '' : 's'}`
                            : 'You\u2019re all caught up.'}
                    </p>
                </div>

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

            {items.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Search */}
                    <div className="relative lg:max-w-xs lg:flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) =>
                                setQuery(event.target.value)
                            }
                            placeholder="Search notifications"
                            className="pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status filter */}
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_FILTERS.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() =>
                                        setStatusFilter(filter.value)
                                    }
                                    className={cn(
                                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                        statusFilter === filter.value
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        <div className="hidden h-5 w-px bg-border lg:block" />

                        {/* Category filter */}
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORY_FILTERS.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    onClick={() =>
                                        setCategoryFilter(filter.value)
                                    }
                                    className={cn(
                                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                        categoryFilter === filter.value
                                            ? 'border-foreground/80 bg-foreground/5 text-foreground'
                                            : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty states */}
            {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-muted">
                        <BellOff className="size-7 text-muted-foreground" />
                    </span>
                    <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                            No notifications yet
                        </p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                            Updates about your requests and documents will
                            show up here as soon as something happens.
                        </p>
                    </div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-muted">
                        <Search className="size-7 text-muted-foreground" />
                    </span>
                    <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                            No matches
                        </p>
                        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                            No notifications match these filters. Try
                            adjusting or resetting them.
                        </p>
                    </div>
                    {isFiltering && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setStatusFilter('all');
                                setCategoryFilter('all');
                                setQuery('');
                            }}
                        >
                            Reset filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-6 pb-6">
                    {groups.map((group) => (
                        <div key={group.key} className="space-y-2">
                            <div className="flex items-center gap-2 px-1">
                                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {group.key}
                                </h2>
                                <span className="text-xs text-muted-foreground/70">
                                    {group.items.length}
                                </span>
                            </div>

                            <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
                                {group.items.map((notification) => {
                                    const unread = !notification.read_at;
                                    const { icon: Icon, badgeClassName } =
                                        getNotificationTone(notification);

                                    return (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'flex items-start gap-3 p-3.5 transition-colors sm:items-center',
                                                unread && 'bg-primary/[0.03]',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-full',
                                                    badgeClassName,
                                                )}
                                            >
                                                <Icon className="size-4" />
                                            </span>

                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {notification.title}
                                                    </p>

                                                    {unread && (
                                                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                                                    )}
                                                </div>

                                                <p className="line-clamp-1 text-sm text-muted-foreground sm:line-clamp-none sm:truncate">
                                                    {notification.message}
                                                </p>

                                                <p className="text-xs text-muted-foreground/80 sm:hidden">
                                                    {formatRelativeTime(
                                                        notification.created_at,
                                                    )}
                                                </p>
                                            </div>

                                            <span className="hidden shrink-0 text-xs whitespace-nowrap text-muted-foreground/80 sm:block">
                                                {formatRelativeTime(
                                                    notification.created_at,
                                                )}
                                            </span>

                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {unread && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Mark as read"
                                                        onClick={() =>
                                                            markAsRead(
                                                                notification,
                                                            )
                                                        }
                                                    >
                                                        <Check className="size-4" />
                                                    </Button>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    title="View"
                                                    onClick={() =>
                                                        openNotification(
                                                            notification,
                                                        )
                                                    }
                                                >
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}