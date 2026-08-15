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

export type NotificationCategory =
    | 'approved'
    | 'rejected'
    | 'pending'
    | 'general';

export const NOTIFICATION_CATEGORY_LABELS: Record<
    NotificationCategory,
    string
> = {
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    general: 'General',
};

/**
 * Derives a coarse category from a notification's title, so the same
 * grouping logic can drive both visual tone and filtering.
 */
export function getNotificationCategory(
    notification: Notification,
): NotificationCategory {
    const title = notification.title.toLowerCase();

    if (title.includes('approved')) {
        return 'approved';
    }

    if (title.includes('rejected')) {
        return 'rejected';
    }

    if (title.includes('request') || title.includes('submitted')) {
        return 'pending';
    }

    return 'general';
}

const NOTIFICATION_CATEGORY_TONES: Record<
    NotificationCategory,
    NotificationTone
> = {
    approved: {
        icon: CheckCircle2,
        badgeClassName:
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    rejected: {
        icon: XCircle,
        badgeClassName: 'bg-destructive/10 text-destructive',
    },
    pending: {
        icon: Clock3,
        badgeClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    general: {
        icon: Bell,
        badgeClassName: 'bg-primary/10 text-primary',
    },
};

/**
 * Derives a visual tone (icon + color) for a notification from its title,
 * so approved / rejected / pending / general notifications are always
 * styled the same way, whether shown in the bell dropdown or the full list.
 */
export function getNotificationTone(
    notification: Notification,
): NotificationTone {
    return NOTIFICATION_CATEGORY_TONES[getNotificationCategory(notification)];
}