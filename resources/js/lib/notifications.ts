import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Notification } from '@/types/auth';

/**
 * Formats an ISO date string as a short relative time (e.g. "5 min ago").
 * Falls back to an empty string when no date is available.
 */
export function formatRelativeTime(dateString?: string | null): string {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 60 * 60 * 24 * 365],
        ['month', 60 * 60 * 24 * 30],
        ['week', 60 * 60 * 24 * 7],
        ['day', 60 * 60 * 24],
        ['hour', 60 * 60],
        ['minute', 60],
    ];

    for (const [unit, secondsInUnit] of divisions) {
        if (absSeconds >= secondsInUnit) {
            const value = Math.round(diffSeconds / secondsInUnit);

            return new Intl.RelativeTimeFormat('en', {
                numeric: 'auto',
            }).format(value, unit);
        }
    }

    return 'Just now';
}

export type NotificationTone = {
    icon: LucideIcon;
    badgeClassName: string;
};

/**
 * Derives a visual tone (icon + color) for a notification from its title,
 * so approved / rejected / pending / general notifications are always
 * styled the same way, whether shown in the bell dropdown or the full list.
 */
export function getNotificationTone(
    notification: Notification,
): NotificationTone {
    const title = notification.title.toLowerCase();

    if (title.includes('approved')) {
        return {
            icon: CheckCircle2,
            badgeClassName:
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
    }

    if (title.includes('rejected')) {
        return {
            icon: XCircle,
            badgeClassName: 'bg-destructive/10 text-destructive',
        };
    }

    if (title.includes('request') || title.includes('submitted')) {
        return {
            icon: Clock3,
            badgeClassName:
                'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
    }

    return {
        icon: Bell,
        badgeClassName: 'bg-primary/10 text-primary',
    };
}