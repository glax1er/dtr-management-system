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
    Sparkles,
    TrendingUp,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StatCard } from '@/components/dashboard-analytics';
import { NumberedPagination } from '@/components/numbered-pagination';
import { AttendanceBadge } from '@/components/ui/badges/attendance-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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

const STATUS_META: Record<
    AttendanceDay['status'],
    { label: string; className: string }
> = {
    complete: {
        label: 'Complete',
        className:
            'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium',
    },
    missing_time_in: {
        label: 'Missing time in',
        className:
            'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium',
    },
    no_record: {
        label: 'No record',
        className:
            'border-destructive/20 bg-destructive/10 text-destructive font-medium',
    },
    open: {
        label: 'In progress',
        className:
            'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium',
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<{ ticketId: number; date: string } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const highlightDate = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('highlight_date') || null
        : null;
    const highlightTicket = typeof window !== 'undefined'
        ? Number(new URLSearchParams(window.location.search).get('highlight_ticket')) || null
        : null;
    const highlightHours = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('highlight_hours') === '1'
        : false;

    useEffect(() => {
        if (highlightHours) {
            const el = document.getElementById('hours-progress-card');
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 250);
                return () => clearTimeout(timer);
            }
        }

        if (!highlightDate && !highlightTicket) return;

        let el: HTMLElement | null = null;
        if (highlightDate) {
            el =
                document.getElementById(`attendance-row-${highlightDate}`) ||
                document.getElementById(`attendance-card-${highlightDate}`);
        }
        if (!el && highlightTicket) {
            const targetLog = logs.data.find((l) => l.pending_ticket_id === highlightTicket);
            if (targetLog) {
                el =
                    document.getElementById(`attendance-row-${targetLog.date}`) ||
                    document.getElementById(`attendance-card-${targetLog.date}`);
            }
        }

        if (el) {
            const timer = setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [highlightDate, highlightTicket, highlightHours, logs.data]);

    const goToMonth = (targetMonth: string) => {
        router.get(
            '/intern/dashboard',
            { month: targetMonth },
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToPage = (page: number) => {
        router.get(
            '/intern/dashboard',
            { month, page, per_page: logs.per_page },
            { preserveState: true, preserveScroll: true },
        );
    };

    const changePerPage = (perPage: number) => {
        router.get(
            '/intern/dashboard',
            { month, per_page: perPage, page: 1 },
            { preserveState: true, preserveScroll: true },
        );
    };

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

    const handleOpenCancelDialog = (ticketId: number, date: string) => {
        setCancelTarget({ ticketId, date });
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = () => {
        if (!cancelTarget) {
            return;
        }

        setIsCancelling(true);
        router.patch(
            `/intern/resolution-tickets/${cancelTarget.ticketId}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Resolution request cancelled.');
                    setCancelDialogOpen(false);
                    setCancelTarget(null);
                },
                onError: () =>
                    toast.error('Could not cancel resolution request.'),
                onFinish: () => setIsCancelling(false),
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
                {/* Header Banner */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="group relative shrink-0">
                            <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted shadow-xs sm:size-16">
                                {profile.photo_url ? (
                                    <img
                                        src={profile.photo_url}
                                        alt={profile.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="size-7 text-muted-foreground sm:size-8" />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-xs transition-transform hover:scale-110 sm:size-6.5"
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

                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                Welcome back, {profile.name.split(' ')[0]}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground/90">
                                    {profile.program_name}
                                </span>
                                <span>•</span>
                                <span>{profile.hte_name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className="px-3 py-1 font-mono text-xs font-normal"
                        >
                            ID: {profile.id_number}
                        </Badge>
                        <StatusBadge status={profile.status} />
                    </div>
                </div>

                {/* KPI Stat Cards */}
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
                            <span className="text-xl font-bold sm:text-2xl">
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

                {/* Progress & QR */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <Card
                        id="hours-progress-card"
                        className={cn(
                            "flex flex-col justify-between shadow-xs lg:col-span-2 transition-all duration-300",
                            highlightHours && "ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10 shadow-md"
                        )}
                    >
                        <CardHeader className="border-b border-border/60 pb-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-semibold">
                                    OJT Hours Progress & Milestones
                                </CardTitle>
                                {highlightHours && (
                                    <Badge className="bg-primary text-primary-foreground font-semibold text-[10px] uppercase gap-1 animate-pulse">
                                        <Sparkles className="size-3" /> Focus
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Track your overall completion towards the required {hours.required} total hours
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5 pb-5">
                            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
                                <div className="shrink-0">
                                    <HoursProgressRing
                                        percent={hours.progress_percent}
                                        totalRendered={hours.total_rendered}
                                        required={hours.required}
                                        size={176}
                                    />
                                </div>

                                <div className="w-full space-y-2.5 sm:max-w-xs">
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
                                                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" />
                                                        )}
                                                        <span
                                                            className={cn(
                                                                'font-medium',
                                                                isDone && 'text-foreground',
                                                            )}
                                                        >
                                                            {m.label}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-foreground/80 tabular-nums">
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

                    <Card className="flex flex-col justify-between shadow-xs lg:col-span-1">
                        <CardHeader className="border-b border-border/60 pb-3">
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
                        <CardContent className="flex flex-col items-center justify-center space-y-4 pt-5 pb-5">
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
                                <div className="flex aspect-square w-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4 text-center">
                                    <QrCode className="size-10 text-muted-foreground/60" />
                                    <span className="text-xs leading-tight text-muted-foreground">
                                        Generated automatically once your account is approved.
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly Attendance Logs Table Card */}
                <Card className="shadow-xs">
                    <CardHeader>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Monthly Attendance Log
                                </CardTitle>
                                <CardDescription>
                                    Daily check-ins, rendered hours, and resolution ticket status
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                                {/* Month Selector */}
                                <div className="flex items-center justify-between sm:justify-start gap-1.5 rounded-xl border border-border bg-muted/40 p-1 w-full sm:w-auto">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 rounded-lg shrink-0"
                                        onClick={() =>
                                            goToMonth(shiftMonth(month, -1))
                                        }
                                        title="Previous month"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <div className="px-2 text-center flex-1 sm:flex-initial">
                                        <span className="text-xs font-semibold whitespace-nowrap text-foreground">
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
                                        onClick={() =>
                                            goToMonth(shiftMonth(month, 1))
                                        }
                                        title="Next month"
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>

                                {/* Date Range Picker + DTR Report */}
                                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0 w-full sm:w-auto sm:flex-initial">
                                        <div className="flex-1 min-w-0 sm:w-43 sm:flex-initial">
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
                                        <div className="flex-1 min-w-0 sm:w-43 sm:flex-initial">
                                            <DatePicker
                                                date={endDate}
                                                onDateChange={(d) => setEndDate(d)}
                                                placeholder="End date"
                                                minDate={startDate || undefined}
                                                className="h-8 text-xs"
                                                clearable
                                                align="end"
                                        />
                                        </div>
                                    </div>

                                    {/* DTR Report Button */}
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="h-8 gap-1.5 text-xs font-medium w-full sm:w-auto shrink-0"
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
                        </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                        {logs.data.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                <CalendarCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                                <p className="font-medium text-foreground">
                                    No attendance records for {monthLabel}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Your daily scans and approved resolution tickets will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden overflow-hidden rounded-lg border sm:block">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="pl-6 font-semibold">
                                                    Date
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Time In
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Time Out
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Hours
                                                </TableHead>
                                                <TableHead className="text-center font-semibold">
                                                    Status
                                                </TableHead>
                                                <TableHead className="pr-6 text-center font-semibold">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.data.map((log) => {
                                                const isHighlighted =
                                                    (highlightDate !== null && log.date === highlightDate) ||
                                                    (highlightTicket !== null && log.pending_ticket_id === highlightTicket);

                                                return (
                                                    <TableRow
                                                        key={log.date}
                                                        id={`attendance-row-${log.date}`}
                                                        className={cn(
                                                            "hover:bg-muted/50 transition-all duration-300",
                                                            isHighlighted && "bg-primary/10 ring-2 ring-primary/40 dark:bg-primary/20"
                                                        )}
                                                    >
                                                        <TableCell className="pl-6 font-medium">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{log.date}</span>
                                                                {isHighlighted && (
                                                                    <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-semibold gap-1 animate-pulse">
                                                                        <Sparkles className="size-2.5" /> Focus
                                                                    </Badge>
                                                                )}
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({log.day.slice(0, 3)})
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-muted-foreground tabular-nums">
                                                            {log.time_in ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="text-center text-muted-foreground tabular-nums">
                                                            {log.time_out ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-medium tabular-nums">
                                                            {log.hours_rendered > 0 ? (
                                                                <span>{log.hours_rendered.toFixed(2)} hrs</span>
                                                            ) : (
                                                                <span className="text-muted-foreground/60">0.00</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
    <AttendanceBadge status={log.pending_ticket_id !== null ? 'pending_review' : log.status} />
</TableCell>
                                                        <TableCell className="pr-6 text-center">
                                                            {log.status === 'complete' ? (
                                                                <span className="text-xs text-muted-foreground/50">—</span>
                                                            ) : log.pending_ticket_id !== null ? (
                                                                <div className="flex items-center justify-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 gap-1 border-destructive/30 px-2.5 text-xs font-medium text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
                                                                        onClick={() =>
                                                                            handleOpenCancelDialog(
                                                                                log.pending_ticket_id!,
                                                                                log.date,
                                                                            )
                                                                        }
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-center">
                                                                    <ResolutionRequestDialog
                                                                        date={log.date}
                                                                        day={log.day}
                                                                        status={log.status}
                                                                        existingTimeIn={log.time_in}
                                                                        existingTimeOut={log.time_out}
                                                                    />
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="divide-y divide-border overflow-hidden rounded-lg border sm:hidden">
                                    {logs.data.map((log) => {
                                        const isHighlighted =
                                            (highlightDate !== null && log.date === highlightDate) ||
                                            (highlightTicket !== null && log.pending_ticket_id === highlightTicket);

                                        return (
                                            <div
                                                key={log.date}
                                                id={`attendance-card-${log.date}`}
                                                className={cn(
                                                    "space-y-3 bg-card p-4 transition-all duration-300",
                                                    isHighlighted && "bg-primary/10 ring-2 ring-primary/40"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {log.date}
                                                            </p>
                                                            {isHighlighted && (
                                                                <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-semibold gap-1 animate-pulse">
                                                                    <Sparkles className="size-2.5" /> Focus
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {log.day}
                                                        </p>
                                                    </div>
                                                    <AttendanceBadge status={log.pending_ticket_id !== null ? 'pending_review' : log.status} />
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] font-medium text-muted-foreground uppercase">
                                                            Time In
                                                        </p>
                                                        <p className="mt-0.5 text-xs font-semibold tabular-nums">
                                                            {log.time_in ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] font-medium text-muted-foreground uppercase">
                                                            Time Out
                                                        </p>
                                                        <p className="mt-0.5 text-xs font-semibold tabular-nums">
                                                            {log.time_out ?? '—'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg bg-muted/40 p-2">
                                                        <p className="text-[10px] font-medium text-muted-foreground uppercase">
                                                            Hours
                                                        </p>
                                                        <p className="mt-0.5 text-xs font-semibold tabular-nums">
                                                            {log.hours_rendered.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end pt-1">
                                                    {log.status === 'complete' ? (
                                                        <span className="text-xs text-muted-foreground/60">
                                                            Complete
                                                        </span>
                                                    ) : log.pending_ticket_id !== null ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 gap-1 border-destructive/30 px-2.5 text-xs font-medium text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
                                                            onClick={() =>
                                                                handleOpenCancelDialog(
                                                                    log.pending_ticket_id!,
                                                                    log.date,
                                                                )
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
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

                                {/* Pagination Controls */}
                                <NumberedPagination
                                    meta={logs}
                                    itemLabel="attendance record"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="intern-attendance-per-page"
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmationDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                title="Cancel Resolution Request"
                description={
                    cancelTarget?.date
                        ? `Are you sure you want to cancel the resolution request for ${cancelTarget.date}?`
                        : 'Are you sure you want to cancel this resolution request?'
                }
                onConfirm={handleConfirmCancel}
                confirmText="Cancel Request"
                isDestructive
                isLoading={isCancelling}
            />
        </>
    );
}