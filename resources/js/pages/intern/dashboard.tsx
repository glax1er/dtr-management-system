import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    CalendarCheck2,
    Camera,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleDashed,
    ClipboardCheck,
    Clock,
    Download,
    QrCode,
    TrendingUp,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { StatCard } from '@/components/dashboard-analytics';
import { HoursProgressRing } from '@/components/hours-progress-ring';
import { ResolutionRequestDialog } from '@/components/resolution-request-dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AttendanceDay, InternDashboardProps } from '@/types/intern';

/**
 * Single source of truth for attendance status labeling and color tokens.
 * Matches supervisor table tokens and supports light & dark theme seamlessly.
 */
const STATUS_META: Record<
    AttendanceDay['status'],
    { label: string; className: string }
> = {
    complete: {
        label: 'Complete',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium',
    },
    missing_time_in: {
        label: 'Missing time in',
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium',
    },
    no_record: {
        label: 'No record',
        className: 'border-destructive/20 bg-destructive/10 text-destructive font-medium',
    },
    open: {
        label: 'In progress',
        className: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium',
    },
};

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function InternDashboard({
    profile,
    today,
    hours,
    month,
    monthLabel,
    logs,
    monthTotalHours,
    canGoNextMonth,
}: InternDashboardProps) {
    const goToMonth = (targetMonth: string) => {
        router.get(
            '/intern/dashboard',
            { month: targetMonth },
            { preserveState: true, preserveScroll: true },
        );
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('photo', file);

        router.post('/intern/profile-photo', formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => toast.success('Profile photo updated.'),
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] ?? 'Could not upload photo.',
                ),
        });
    };

    const cancelRequest = (ticketId: number) => {
        if (!confirm('Cancel this resolution request?')) {
            return;
        }

        router.patch(
            `/intern/resolution-tickets/${ticketId}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success('Resolution request cancelled.'),
                onError: () =>
                    toast.error('Could not cancel resolution request.'),
            },
        );
    };

    const remainingHours = Math.max(0, hours.required - hours.total_rendered);
    const remainingPercent = Math.max(0, 100 - hours.progress_percent);

    const milestones = [
        {
            label: '25% Milestone',
            targetHours: hours.required * 0.25,
            percent: 25,
        },
        {
            label: '50% Halfway',
            targetHours: hours.required * 0.5,
            percent: 50,
        },
        {
            label: '75% Stretch',
            targetHours: hours.required * 0.75,
            percent: 75,
        },
        {
            label: '100% Complete',
            targetHours: hours.required,
            percent: 100,
        },
    ];

    return (
        <>
            <Head title="Intern Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 sm:p-6">
                {/* Header Banner with Avatar & Identity */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar with photo change & remove triggers */}
                        <div className="relative group shrink-0">
                            <div className="flex size-14 sm:size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted shadow-xs">
                                {profile.photo_url ? (
                                    <img
                                        src={profile.photo_url}
                                        alt={profile.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="size-7 sm:size-8 text-muted-foreground" />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -right-1 -bottom-1 flex size-6 sm:size-6.5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110"
                                title="Change profile photo"
                            >
                                <Camera className="size-3" />
                            </button>


                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoSelect}
                            />
                        </div>

                        {/* Name & Academic / Placement Info */}
                        <div className="space-y-0.5">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                Welcome back, {profile.name.split(' ')[0]}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground/90">{profile.program_name}</span>
                                <span>•</span>
                                <span>{profile.hte_name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 font-mono text-xs font-normal">
                            ID: {profile.id_number}
                        </Badge>
                        <StatusBadge status={profile.status} />
                    </div>
                </div>

                {/* Top KPI Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Hours Rendered"
                        displayValue={
                            <span className="flex items-baseline gap-1.5">
                                <span>{hours.total_rendered.toFixed(1)}</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    / {hours.required} hrs
                                </span>
                            </span>
                        }
                        icon={Clock}
                        variant="primary"
                        description={`${hours.progress_percent}% of required OJT completed`}
                        index={0}
                    />
                    <StatCard
                        label="Remaining Hours"
                        displayValue={
                            <span className="flex items-baseline gap-1.5">
                                <span>{remainingHours.toFixed(1)}</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    hrs left
                                </span>
                            </span>
                        }
                        icon={TrendingUp}
                        variant="default"
                        description={`${remainingPercent.toFixed(1)}% remaining towards target`}
                        index={1}
                    />
                    <StatCard
                        label="Logged This Month"
                        displayValue={
                            <span className="flex items-baseline gap-1.5">
                                <span>{monthTotalHours.toFixed(1)}</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    hrs
                                </span>
                            </span>
                        }
                        icon={CalendarCheck2}
                        variant="success"
                        description={`Accumulated in ${monthLabel}`}
                        index={2}
                    />
                    <StatCard
                        label="Today's Status"
                        displayValue={
                            <span className="text-xl sm:text-2xl font-bold">
                                {today.status === 'complete'
                                    ? 'Completed'
                                    : today.status === 'open'
                                      ? 'In Progress'
                                      : today.status === 'missing_time_in'
                                        ? 'Missing In'
                                        : 'Not Started'}
                            </span>
                        }
                        icon={ClipboardCheck}
                        variant={
                            today.status === 'complete'
                                ? 'success'
                                : today.status === 'open'
                                  ? 'primary'
                                  : today.status === 'missing_time_in'
                                    ? 'warning'
                                    : 'default'
                        }
                        description={
                            today.time_in
                                ? `In: ${today.time_in}${today.time_out ? ` • Out: ${today.time_out}` : ''}`
                                : `Date: ${today.date}`
                        }
                        index={3}
                    />
                </div>

                {/* Middle Section: Progress & Milestones (2/3 width) + QR Pass (1/3 width) */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    {/* OJT Hours & Milestones Card */}
                    <Card className="flex flex-col justify-between shadow-xs lg:col-span-2">
                        <CardHeader className="pb-3 border-b border-border/60">
                            <CardTitle className="text-base font-semibold">
                                OJT Hours Progress & Milestones
                            </CardTitle>
                            <CardDescription>
                                Track your overall completion towards the required {hours.required} total hours
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5 pb-5">
                            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
                                {/* Circular Progress Ring (Single visual hero - no duplicate progress bars) */}
                                <div className="shrink-0">
                                    <HoursProgressRing
                                        percent={hours.progress_percent}
                                        totalRendered={hours.total_rendered}
                                        required={hours.required}
                                        size={176}
                                    />
                                </div>

                                {/* Milestone Checkpoints */}
                                <div className="w-full sm:max-w-xs space-y-2.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Milestones Checklist
                                    </p>
                                    <div className="space-y-2">
                                        {milestones.map((m) => {
                                            const isDone = hours.total_rendered >= m.targetHours;

                                            return (
                                                <div
                                                    key={m.percent}
                                                    className={cn(
                                                        'flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors',
                                                        isDone
                                                            ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
                                                            : 'border-border/60 bg-muted/30 text-muted-foreground',
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isDone ? (
                                                            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                        ) : (
                                                            <CircleDashed className="size-4 text-muted-foreground/50 shrink-0" />
                                                        )}
                                                        <span className={cn('font-medium', isDone && 'text-foreground')}>
                                                            {m.label}
                                                        </span>
                                                    </div>
                                                    <span className="tabular-nums font-semibold text-foreground/80">
                                                        {m.targetHours.toFixed(0)} hrs
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attendance QR Pass Card */}
                    <Card className="flex flex-col justify-between shadow-xs lg:col-span-1">
                        <CardHeader className="pb-3 border-b border-border/60">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold">
                                    Attendance QR Pass
                                </CardTitle>
                                <QrCode className="size-4 text-muted-foreground" />
                            </div>
                            <CardDescription>
                                Scan at the kiosk to log time in and out
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5 pb-5 flex flex-col items-center justify-center">
                            {profile.has_qr_code ? (
                                <>
                                    <div className="flex aspect-square w-40 items-center justify-center rounded-2xl border border-border bg-card p-3 shadow-xs">
                                        <img
                                            src={`/intern/qr-code?v=${encodeURIComponent(profile.id_number)}`}
                                            alt="Your QR code"
                                            className="size-full object-contain"
                                        />
                                    </div>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="w-full gap-2 text-xs"
                                    >
                                        <a
                                            href={`/intern/qr-code?v=${encodeURIComponent(profile.id_number)}`}
                                            download={`${profile.name.replace(/\s+/g, '_')}_QR.png`}
                                        >
                                            <Download className="size-3.5" />
                                            Download QR Code
                                        </a>
                                    </Button>
                                </>
                            ) : (
                                <div className="flex aspect-square w-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 text-center p-4">
                                    <QrCode className="size-10 text-muted-foreground/60" />
                                    <span className="text-xs text-muted-foreground leading-tight">
                                        Generated automatically once your account is approved.
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly Attendance Logs Table Card */}
                <Card className="shadow-xs">
                    <CardHeader className="flex flex-col gap-4 border-b border-border/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-base font-semibold">
                                Monthly Attendance Log
                            </CardTitle>
                            <CardDescription>
                                Daily check-ins, rendered hours, and resolution ticket status
                            </CardDescription>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                            {/* Month Selector Pill */}
                            <div className="flex items-center justify-between sm:justify-start gap-1.5 rounded-xl border border-border bg-muted/40 p-1 w-full sm:w-auto">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-lg shrink-0"
                                    onClick={() => goToMonth(shiftMonth(month, -1))}
                                    title="Previous month"
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <div className="px-2 text-center flex-1 sm:flex-initial">
                                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                                        {monthLabel}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground tabular-nums">
                                        {monthTotalHours.toFixed(2)} hrs total
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-lg shrink-0"
                                    disabled={!canGoNextMonth}
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                    title="Next month"
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>

                            {/* Date Range Picker + DTR Report */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <div className="flex items-center gap-1.5 flex-1 min-w-[200px] sm:min-w-0">
                                    <div className="flex-1 sm:w-36 sm:flex-initial">
                                        <DatePicker
                                            date={startDate}
                                            onDateChange={(d) => setStartDate(d)}
                                            placeholder="Start date"
                                            maxDate={endDate || undefined}
                                            className="h-8 text-xs"
                                            clearable
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0">to</span>
                                    <div className="flex-1 sm:w-36 sm:flex-initial">
                                        <DatePicker
                                            date={endDate}
                                            onDateChange={(d) => setEndDate(d)}
                                            placeholder="End date"
                                            minDate={startDate || undefined}
                                            className="h-8 text-xs"
                                            clearable
                                        />
                                    </div>
                                </div>

                                {/* DTR Report Button */}
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="gap-1.5 h-8 text-xs font-medium w-full sm:w-auto shrink-0"
                                    onClick={() => {
                                        const base = '/intern/dtr-report';
                                        let url = base + '?';

                                        if (startDate && endDate) {
                                            url += `start=${startDate}&end=${endDate}`;
                                        } else {
                                            url += `month=${month}`;
                                        }

                                        window.open(url, '_blank', 'noopener');
                                    }}
                                >
                                    <Download className="size-3.5" />
                                    <span>DTR Report</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                                <CalendarCheck2 className="size-8 text-muted-foreground/50" />
                                <p className="text-sm font-medium text-foreground">
                                    No attendance records for {monthLabel}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Your daily scans and approved resolution tickets will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden sm:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-b">
                                                <TableHead className="w-40 pl-6">Date</TableHead>
                                                <TableHead>Time In</TableHead>
                                                <TableHead>Time Out</TableHead>
                                                <TableHead>Hours</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => {
                                                const badge = STATUS_META[log.status];

                                                return (
                                                    <TableRow key={log.date} className="hover:bg-muted/40">
                                                        <TableCell className="font-medium pl-6">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{log.date}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({log.day.slice(0, 3)})
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="tabular-nums">
                                                            {log.time_in ?? (
                                                                <span className="text-muted-foreground/60">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="tabular-nums">
                                                            {log.time_out ?? (
                                                                <span className="text-muted-foreground/60">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="tabular-nums font-medium">
                                                            {log.hours_rendered > 0 ? (
                                                                <span>{log.hours_rendered.toFixed(2)} hrs</span>
                                                            ) : (
                                                                <span className="text-muted-foreground/60">0.00</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn('capitalize text-xs font-medium', badge.className)}
                                                            >
                                                                {badge.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            {log.status === 'complete' ? (
                                                                <span className="text-xs text-muted-foreground/50">—</span>
                                                            ) : log.pending_ticket_id !== null ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        Pending Review
                                                                    </Badge>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => cancelRequest(log.pending_ticket_id!)}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <ResolutionRequestDialog
                                                                    date={log.date}
                                                                    day={log.day}
                                                                    status={log.status}
                                                                    existingTimeIn={log.time_in}
                                                                    existingTimeOut={log.time_out}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="divide-y divide-border sm:hidden">
                                    {logs.map((log) => {
                                        const badge = STATUS_META[log.status];

                                        return (
                                            <div key={log.date} className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {log.date}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {log.day}
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn('text-xs capitalize', badge.className)}
                                                    >
                                                        {badge.label}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] uppercase text-muted-foreground font-medium">Time In</p>
                                                        <p className="text-xs font-semibold tabular-nums mt-0.5">
                                                            {log.time_in ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] uppercase text-muted-foreground font-medium">Time Out</p>
                                                        <p className="text-xs font-semibold tabular-nums mt-0.5">
                                                            {log.time_out ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] uppercase text-muted-foreground font-medium">Hours</p>
                                                        <p className="text-xs font-semibold tabular-nums mt-0.5">
                                                            {log.hours_rendered.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Mobile Action */}
                                                <div className="pt-1 flex items-center justify-end">
                                                    {log.status === 'complete' ? (
                                                        <span className="text-xs text-muted-foreground/60">Complete</span>
                                                    ) : log.pending_ticket_id !== null ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="text-xs">
                                                                Pending Review
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => cancelRequest(log.pending_ticket_id!)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <ResolutionRequestDialog
                                                            date={log.date}
                                                            day={log.day}
                                                            status={log.status}
                                                            existingTimeIn={log.time_in}
                                                            existingTimeOut={log.time_out}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}