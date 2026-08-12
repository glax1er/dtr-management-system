import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    QrCode,
    Camera,
    User as UserIcon,
    X,
} from 'lucide-react';
import { HoursProgressRing } from '@/components/hours-progress-ring';
import { ResolutionRequestDialog } from '@/components/resolution-request-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InternDashboardProps } from '@/types/intern';

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

/** Monday–Sunday range containing `date`. */
function weekRangeOf(date: Date): { start: string; end: string } {
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7; // Sun(0) -> 6, Mon(1) -> 0, ...
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

    return { start: fmtDate(monday), end: fmtDate(sunday) };
}

/** First–last day of the given 'YYYY-MM' month string. */
function monthRangeOf(month: string): { start: string; end: string } {
    const [year, m] = month.split('-').map(Number);
    const first = new Date(year, m - 1, 1);
    const last = new Date(year, m, 0);

    return { start: fmtDate(first), end: fmtDate(last) };
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
    // Default the report range to the current week, so "weekly" is genuinely
    // the default rather than a fallback to a month-wide report.
    const defaultWeek = weekRangeOf(new Date());
    const [startDate, setStartDate] = useState<string>(defaultWeek.start);
    const [endDate, setEndDate] = useState<string>(defaultWeek.end);
    const rangeIsValid = Boolean(startDate) && Boolean(endDate) && startDate <= endDate;

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        router.post('/intern/profile-photo', formData, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const handlePhotoRemove = () => {
        if (confirm('Remove your profile photo?')) {
            router.delete('/intern/profile-photo', { preserveScroll: true });
        }
    };

    const cancelRequest = (ticketId: number) => {
        if (!confirm('Cancel this resolution request?')) {
            return;
        }
        router.patch(
            `/intern/resolution-tickets/${ticketId}/cancel`,
            {},
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Welcome, {profile.name.split(' ')[0]}
                    </h1>
                    <p className="text-muted-foreground">
                        {profile.program_name} &middot; {profile.hte_name}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Profile + Today, merged into one card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                                        {profile.photo_url ? (
                                            <img
                                                src={profile.photo_url}
                                                alt={profile.name}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="size-8 text-muted-foreground" />
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
                                        title="Change photo"
                                    >
                                        <Camera className="size-3.5" />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handlePhotoSelect}
                                    />
                                </div>

                                <div>
                                    <CardTitle>My Profile</CardTitle>
                                    <CardDescription>
                                        {profile.id_number}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">
                                    Email
                                </span>
                                <span className="min-w-0 text-right break-words">
                                    {profile.email}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">
                                    HTE
                                </span>
                                <span className="min-w-0 text-right break-words">
                                    {profile.hte_name}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">
                                    Program
                                </span>
                                <span className="min-w-0 text-right break-words">
                                    {profile.program_name}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="shrink-0 text-muted-foreground">
                                    Status
                                </span>
                                <Badge
                                    variant={
                                        profile.status === 'approved'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {profile.status}
                                </Badge>
                            </div>

                            {/* Today's status, now a section within this same card */}
                            <div className="mt-4 border-t pt-4">
                                <p className="mb-2 text-sm font-medium">
                                    Today &middot; {today.date}
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between gap-4">
                                        <span className="shrink-0 text-muted-foreground">
                                            Time In
                                        </span>
                                        <span className="min-w-0 text-right break-words">{today.time_in ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="shrink-0 text-muted-foreground">
                                            Time Out
                                        </span>
                                        <span className="min-w-0 text-right break-words">{today.time_out ?? '—'}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span className="shrink-0 text-muted-foreground">
                                            Status
                                        </span>
                                        <Badge
                                            variant={
                                                today.status === 'complete'
                                                    ? 'default'
                                                    : today.status ===
                                                        'missing_time_in'
                                                      ? 'destructive'
                                                      : 'outline'
                                            }
                                        >
                                            {today.status === 'not_started'
                                                ? 'Not started'
                                                : today.status === 'open'
                                                  ? 'In progress'
                                                  : today.status ===
                                                      'missing_time_in'
                                                    ? 'Missing time in'
                                                    : 'Complete'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* QR code — unchanged, stays as the middle card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>My QR Code</CardTitle>
                            <CardDescription>
                                Present this to your supervisor to time in/out
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {profile.has_qr_code ? (
                                <>
                                    <div className="flex aspect-square items-center justify-center rounded-lg border p-4">
                                        <img
                                            src={`/intern/qr-code?v=${encodeURIComponent(profile.id_number)}`}
                                            alt="Your QR code"
                                            className="h-full w-full object-contain"
                                        />
                                    </div>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <a
                                            href={`/intern/qr-code?v=${encodeURIComponent(profile.id_number)}`}
                                            download={`${profile.name.replace(/\s+/g, '_')}.png`}
                                        >
                                            <Download className="mr-2 size-4" />
                                            Download PNG
                                        </a>
                                    </Button>
                                </>
                            ) : (
                                <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sidebar-border/70 text-muted-foreground">
                                    <QrCode className="size-10" />
                                    <span className="text-xs">
                                        Generated once your account is verified
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hours rendered progress — now the 3rd top-row card */}
                    <Card className="flex flex-col items-center justify-center gap-4 p-6">
                        <CardTitle className="text-base">
                            Hours Rendered
                        </CardTitle>
                        <HoursProgressRing
                            percent={hours.progress_percent}
                            totalRendered={hours.total_rendered}
                            required={hours.required}
                        />
                    </Card>
                </div>

                {/* Full attendance log, now full width on its own row */}
                <Card>
                    <CardHeader className="flex flex-col gap-4">
                        {/* Month navigation for the log view below + running total */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => goToMonth(shiftMonth(month, -1))}
                                >
                                    <ChevronLeft />
                                </Button>
                                <CardTitle className="min-w-32 text-center text-base">
                                    {monthLabel}
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!canGoNextMonth}
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Total:{' '}
                                <span className="font-medium text-foreground tabular-nums">
                                    {monthTotalHours.toFixed(2)} hrs
                                </span>
                            </span>
                        </div>

                        {/* DTR report generator — defaults to the current week */}
                        <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                            <p className="mb-3 text-sm font-medium">
                                Generate DTR Report
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-2">
                                    <div className="flex flex-col gap-1">
                                        <Label htmlFor="dtr-start" className="text-xs text-muted-foreground">
                                            From
                                        </Label>
                                        <Input
                                            id="dtr-start"
                                            type="date"
                                            className="h-9 text-sm"
                                            value={startDate}
                                            max={endDate || undefined}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            aria-label="DTR start date"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label htmlFor="dtr-end" className="text-xs text-muted-foreground">
                                            To
                                        </Label>
                                        <Input
                                            id="dtr-end"
                                            type="date"
                                            className="h-9 text-sm"
                                            value={endDate}
                                            min={startDate || undefined}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            aria-label="DTR end date"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const { start, end } = weekRangeOf(new Date());
                                            setStartDate(start);
                                            setEndDate(end);
                                        }}
                                    >
                                        This week
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const { start, end } = monthRangeOf(month);
                                            setStartDate(start);
                                            setEndDate(end);
                                        }}
                                    >
                                        This month
                                    </Button>
                                </div>

                                <Button
                                    size="sm"
                                    className="sm:ml-auto"
                                    disabled={!rangeIsValid}
                                    onClick={() => {
                                        const url = `/intern/dtr-report?start=${startDate}&end=${endDate}`;
                                        window.open(url, '_blank', 'noopener');
                                    }}
                                >
                                    <Download className="mr-2 size-4" />
                                    Download PDF
                                </Button>
                            </div>
                            {!rangeIsValid && (startDate || endDate) && (
                                <p className="mt-2 text-xs text-destructive">
                                    Select a valid start and end date (start must not be after end).
                                </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {startDate && endDate
                                    ? `Report will cover ${startDate} to ${endDate}.`
                                    : 'Pick a date range to generate the report.'}
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for {monthLabel}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                Date
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Time In
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Time Out
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Hours
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Status
                                            </th>
                                            <th className="py-2 font-medium">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr
                                                key={log.date}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4">
                                                    {log.date}
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        {log.day.slice(0, 3)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {log.time_in ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {log.time_out ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4 tabular-nums">
                                                    {log.hours_rendered.toFixed(
                                                        2,
                                                    )}
                                                </td>
                                                <td className="py-2">
                                                    <Badge
                                                        variant={
                                                            log.status ===
                                                            'complete'
                                                                ? 'default'
                                                                : log.status ===
                                                                        'missing_time_in' ||
                                                                    log.status ===
                                                                        'no_record'
                                                                  ? 'destructive'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {log.status ===
                                                        'complete'
                                                            ? 'Complete'
                                                            : log.status ===
                                                                'missing_time_in'
                                                              ? 'Missing time in'
                                                              : log.status ===
                                                                  'no_record'
                                                                ? 'No record'
                                                                : 'No time-out'}
                                                    </Badge>
                                                </td>
                                                <td className="py-2">
                                                    {log.status ===
                                                    'complete' ? (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    ) : log.pending_ticket_id !==
                                                      null ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary">
                                                                Pending
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    cancelRequest(
                                                                        log.pending_ticket_id!,
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <ResolutionRequestDialog
                                                            date={log.date}
                                                            day={log.day}
                                                            status={log.status}
                                                            existingTimeIn={
                                                                log.time_in
                                                            }
                                                            existingTimeOut={
                                                                log.time_out
                                                            }
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}