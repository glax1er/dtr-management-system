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
    | 'archived'
    | 'workday'
    | 'work_day'
    | 'restday'
    | 'rest_day'
    | 'hte_override'
    | 'global_schedule'
    | 'default_schedule'
    | 'today';

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
    workday: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    work_day: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    restday: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    rest_day: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
    hte_override: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    global_schedule: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    default_schedule: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
    today: 'bg-primary/10 text-primary border-primary dark:bg-primary/20 dark:text-primary dark:border-primary',
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
    workday: 'Work Day',
    work_day: 'Work Day',
    restday: 'Rest Day',
    rest_day: 'Rest Day',
    hte_override: 'HTE Time Schedule',
    global_schedule: 'Global OJT Schedule',
    default_schedule: 'Standard 8:00 AM',
    today: 'Today',
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