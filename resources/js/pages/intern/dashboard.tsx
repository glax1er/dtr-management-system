import { Head, router } from '@inertiajs/react';
import { useRef } from 'react';
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
import type { InternDashboardProps } from '@/types/intern';

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
                                            download={profile.name}
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
                    <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                                Total:{' '}
                                <span className="font-medium text-foreground tabular-nums">
                                    {monthTotalHours.toFixed(2)} hrs
                                </span>
                            </span>
                            <Button size="sm" asChild>
                                <a
                                    href={`/intern/dtr-report?month=${month}`}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    <Download />
                                    DTR Report
                                </a>
                            </Button>
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