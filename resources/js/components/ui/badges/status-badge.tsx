import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Status =
    | 'active'
    | 'inactive'
    | 'approved'
    | 'pending'
    | 'rejected'
    | 'pending_review'
    | 'ready'
    | 'configured'
    | 'missing'
    | 'no_template'
    | 'not_submitted'
    | 'not_uploaded'
    | 'required'
    | 'optional'
    | 'archived';

const styles: Record<Status, string> = {
    active: 'bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    inactive: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    approved: 'bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    pending: 'bg-amber-100 text-amber-600 border-amber-400 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    rejected: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    pending_review: 'bg-amber-100 text-amber-600 border-amber-400 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    ready: 'bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    configured: 'bg-emerald-100 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    missing: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    no_template: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    not_submitted: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    not_uploaded: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    required: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    optional: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    archived: 'bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
};

const labels: Record<Status, string> = {
    active: 'Active',
    inactive: 'Inactive',
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    pending_review: 'Pending Review',
    ready: 'Ready',
    configured: 'Configured',
    missing: 'No Template',
    no_template: 'No Template',
    not_submitted: 'Not Submitted',
    not_uploaded: 'Not Uploaded',
    required: 'Required',
    optional: 'Optional',
    archived: 'Archived',
};

export interface StatusBadgeProps {
    status: Status;
    label?: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
}

export function StatusBadge({ status, label, className, icon }: StatusBadgeProps) {
    const styleClass = styles[status] || 'bg-slate-100 text-slate-600 border-slate-300';
    const textLabel = label ?? labels[status] ?? status;

    return (
        <Badge className={cn(styleClass, 'font-medium', className)}>
            {icon}
            {textLabel}
        </Badge>
    );
}