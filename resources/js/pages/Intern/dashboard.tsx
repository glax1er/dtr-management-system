import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Download, QrCode } from 'lucide-react';
import { HoursProgressRing } from '@/components/hours-progress-ring';
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
        router.get('/intern/dashboard', { month: targetMonth }, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Welcome, {profile.name.split(' ')[0]}</h1>
                    <p className="text-muted-foreground">
                        {profile.program_name} &middot; {profile.hte_name}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Profile / ID card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>My Profile</CardTitle>
                            <CardDescription>{profile.id_number}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Email</span>
                                <span>{profile.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">HTE</span>
                                <span>{profile.hte_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Program</span>
                                <span>{profile.program_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={profile.status === 'approved' ? 'default' : 'secondary'}>
                                    {profile.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* QR code placeholder — intentionally not wired up yet. */}
                    <Card>
                        <CardHeader>
                            <CardTitle>My QR Code</CardTitle>
                            <CardDescription>Present this to your supervisor to time in/out</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-sidebar-border/70 text-muted-foreground">
                                <QrCode className="size-10" />
                                <span className="text-xs">
                                    {profile.has_qr_code ? 'QR code coming soon' : 'Generated once your account is verified'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Today's status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Today</CardTitle>
                            <CardDescription>{today.date}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time In</span>
                                <span>{today.time_in ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time Out</span>
                                <span>{today.time_out ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant={today.status === 'complete' ? 'default' : 'outline'}>
                                    {today.status === 'not_started'
                                        ? 'Not started'
                                        : today.status === 'open'
                                          ? 'In progress'
                                          : 'Complete'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Hours rendered progress */}
                    <Card className="flex flex-col items-center justify-center gap-4 p-6 md:col-span-1">
                        <CardTitle className="text-base">Hours Rendered</CardTitle>
                        <HoursProgressRing
                            percent={hours.progress_percent}
                            totalRendered={hours.total_rendered}
                            required={hours.required}
                        />
                    </Card>

                    {/* Full attendance log, paged by month — merged in from the
                        old standalone attendance-logs page. */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => goToMonth(shiftMonth(month, -1))}>
                                    <ChevronLeft />
                                </Button>
                                <CardTitle className="min-w-32 text-center text-base">{monthLabel}</CardTitle>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!canGoNextMonth}
                                    onClick={() => goToMonth(shiftMonth(month, 1))}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">
                                    Total:{' '}
                                    <span className="font-medium text-foreground tabular-nums">
                                        {monthTotalHours.toFixed(2)} hrs
                                    </span>
                                </span>
                                <Button size="sm" asChild>
                                    <a href={`/intern/dtr-report?month=${month}`} target="_blank" rel="noopener">
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
                                                <th className="py-2 pr-4 font-medium">Date</th>
                                                <th className="py-2 pr-4 font-medium">Time In</th>
                                                <th className="py-2 pr-4 font-medium">Time Out</th>
                                                <th className="py-2 pr-4 font-medium">Hours</th>
                                                <th className="py-2 pr-4 font-medium">Lunch Deducted</th>
                                                <th className="py-2 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log) => (
                                                <tr key={log.date} className="border-b last:border-0">
                                                    <td className="py-2 pr-4">
                                                        {log.date}
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            {log.day.slice(0, 3)}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-4">{log.time_in}</td>
                                                    <td className="py-2 pr-4">{log.time_out ?? '—'}</td>
                                                    <td className="py-2 pr-4 tabular-nums">
                                                        {log.hours_rendered.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 pr-4">{log.lunch_deducted ? 'Yes' : 'No'}</td>
                                                    <td className="py-2">
                                                        <Badge variant={log.status === 'complete' ? 'default' : 'outline'}>
                                                            {log.status === 'complete' ? 'Complete' : 'No time-out'}
                                                        </Badge>
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
            </div>
        </>
    );
}
