import { Head, usePage } from '@inertiajs/react';
import {
    CalendarCheck2,
    ClipboardCheck,
    Clock,
    GraduationCap,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AttendanceRing, CountUp } from '@/components/dashboard-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PageProps } from '@/types';
import { dashboard } from '@/routes';

interface RecentScan {
    intern_name: string;
    label: 'time_in' | 'time_out';
    scanned_at: string;
}

interface TrendPoint {
    date: string;
    label: string;
    count: number;
}

interface TodayAttendance {
    checked_in: number;
    total: number;
    percent: number;
}

interface TicketStatusCount {
    status: 'pending' | 'approved' | 'rejected';
    count: number;
}

interface TopIntern {
    name: string;
    count: number;
}

interface SupervisorDashboardProps {
    myInternsCount: number;
    scansToday: number;
    scansThisWeek: number;
    pendingTickets: number;
    recentScans: RecentScan[];
    scansTrend: TrendPoint[];
    todayAttendance: TodayAttendance;
    ticketBreakdown: TicketStatusCount[];
    topInterns: TopIntern[];
    scopeName?: string;
}

const TICKET_STATUS_META: Record<
    TicketStatusCount['status'],
    { label: string; barClass: string; dotClass: string }
> = {
    approved: {
        label: 'Approved',
        barClass: 'bg-chart-2',
        dotClass: 'bg-chart-2',
    },
    pending: {
        label: 'Pending',
        barClass: 'bg-chart-4',
        dotClass: 'bg-chart-4',
    },
    rejected: {
        label: 'Rejected',
        barClass: 'bg-destructive',
        dotClass: 'bg-destructive',
    },
};

export default function SupervisorDashboard({
    myInternsCount,
    scansToday,
    scansThisWeek,
    pendingTickets,
    recentScans,
    scansTrend,
    todayAttendance,
    ticketBreakdown,
    topInterns,
    scopeName,
}: SupervisorDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    // Drives the "grow in" animations for bars and the ring below.
    // Charts render at their resting state on the very first paint (0
    // height/width, ring at 0%) and flip to `true` a tick later so the
    // CSS transitions actually animate instead of snapping straight to
    // the final value.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));

        return () => cancelAnimationFrame(id);
    }, []);

    const stats = [
        { label: 'My Interns', value: myInternsCount, icon: GraduationCap },
        { label: 'Scans Today', value: scansToday, icon: ClipboardCheck },
        { label: 'Scans This Week', value: scansThisWeek, icon: Clock },
        {
            label: 'Pending Tickets',
            value: pendingTickets,
            icon: CalendarCheck2,
        },
    ];

    const totalTicketCount = ticketBreakdown.reduce(
        (sum, s) => sum + s.count,
        0,
    );
    const scansTotal = scansTrend.reduce((sum, point) => sum + point.count, 0);
    const trendMax = Math.max(1, ...scansTrend.map((point) => point.count));
    const topInternMax = Math.max(1, ...topInterns.map((i) => i.count));

    return (
        <>
            <Head title="Supervisor Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-3 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {scopeName ? `${scopeName} · ` : ''}Attendance is
                        recorded through the shared scanning station.
                    </p>
                </div>

                {/* Top-line counts */}
                <div className="grid auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map(({ label, value, icon: Icon }, i) => (
                        <Card
                            key={label}
                            className="animate-in py-4 duration-500 fade-in-0 fill-mode-backwards slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 75}ms` }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1">
                                <CardTitle className="text-sm font-medium">
                                    {label}
                                </CardTitle>
                                <Icon className="size-4 shrink-0 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="text-2xl font-bold tabular-nums">
                                    <CountUp value={value} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Analytics row 1: scan momentum + right-now attendance */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Card className="animate-in py-4 duration-500 fade-in-0 fill-mode-backwards slide-in-from-bottom-2 lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 pb-1">
                            <div>
                                <CardTitle className="text-sm font-medium">
                                    Scans, last 14 days
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {scansTotal} scan
                                    {scansTotal === 1 ? '' : 's'} in this window
                                </p>
                            </div>
                            <TrendingUp className="size-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="px-4">
                            {scansTotal === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No scans in the last 14 days.
                                </p>
                            ) : (
                                <div className="flex h-28 items-end gap-1 sm:gap-1.5">
                                    {scansTrend.map((point, i) => (
                                        <div
                                            key={point.date}
                                            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                                            title={`${point.label}: ${point.count} scan${point.count === 1 ? '' : 's'}`}
                                        >
                                            <div
                                                className={`w-full rounded-t-sm transition-[height] duration-700 ease-out ${
                                                    point.count > 0
                                                        ? 'bg-chart-1/70 group-hover:bg-chart-1 group-hover:duration-150'
                                                        : 'bg-muted'
                                                }`}
                                                style={{
                                                    height: mounted
                                                        ? `${Math.max((point.count / trendMax) * 100, 4)}%`
                                                        : '0%',
                                                    transitionDelay: `${i * 30}ms`,
                                                }}
                                            />
                                            <span className="hidden text-[10px] text-muted-foreground tabular-nums sm:block">
                                                {point.label.split(' ')[1]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card
                        className="animate-in py-4 duration-500 fade-in-0 fill-mode-backwards slide-in-from-bottom-2"
                        style={{ animationDelay: '75ms' }}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1">
                            <CardTitle className="text-sm font-medium">
                                Today's Attendance
                            </CardTitle>
                            <CalendarCheck2 className="size-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex flex-col items-center px-4">
                            {todayAttendance.total === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No approved interns yet.
                                </p>
                            ) : (
                                <AttendanceRing
                                    percent={
                                        mounted ? todayAttendance.percent : 0
                                    }
                                    checkedIn={todayAttendance.checked_in}
                                    total={todayAttendance.total}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics row 2: ticket pipeline + top interns */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Card
                        className="animate-in py-4 duration-500 fade-in-0 fill-mode-backwards slide-in-from-bottom-2"
                        style={{ animationDelay: '150ms' }}
                    >
                        <CardHeader className="px-4 pb-1">
                            <CardTitle className="text-sm font-medium">
                                Resolution Ticket Pipeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                {totalTicketCount > 0 &&
                                    ticketBreakdown.map(
                                        (item, i) =>
                                            item.count > 0 && (
                                                <div
                                                    key={item.status}
                                                    className={`transition-[width] duration-700 ease-out ${TICKET_STATUS_META[item.status].barClass}`}
                                                    style={{
                                                        width: mounted
                                                            ? `${(item.count / totalTicketCount) * 100}%`
                                                            : '0%',
                                                        transitionDelay: `${150 + i * 80}ms`,
                                                    }}
                                                    title={`${TICKET_STATUS_META[item.status].label}: ${item.count}`}
                                                />
                                            ),
                                    )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {ticketBreakdown.map((item) => (
                                    <div
                                        key={item.status}
                                        className="flex items-center justify-between rounded-md px-1.5 py-1.5 text-sm"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                className={`size-2.5 shrink-0 rounded-full ${TICKET_STATUS_META[item.status].dotClass}`}
                                            />
                                            {
                                                TICKET_STATUS_META[item.status]
                                                    .label
                                            }
                                        </span>
                                        <span className="font-medium text-muted-foreground tabular-nums">
                                            <CountUp value={item.count} />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="animate-in py-4 duration-500 fade-in-0 fill-mode-backwards slide-in-from-bottom-2 lg:col-span-2"
                        style={{ animationDelay: '200ms' }}
                    >
                        <CardHeader className="px-4 pb-1">
                            <CardTitle className="text-sm font-medium">
                                Top Interns by Scans (last 14 days)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4">
                            {topInterns.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No scans recorded in the last 14 days.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {topInterns.map((intern, i) => (
                                        <div
                                            key={intern.name}
                                            className="flex flex-col gap-1 px-1.5 py-1"
                                        >
                                            <div className="flex items-center justify-between gap-2 text-sm">
                                                <span className="truncate font-medium">
                                                    {intern.name}
                                                </span>
                                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                                    <CountUp
                                                        value={intern.count}
                                                    />{' '}
                                                    scan
                                                    {intern.count === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-chart-1 transition-[width] duration-700 ease-out"
                                                    style={{
                                                        width: mounted
                                                            ? `${(intern.count / topInternMax) * 100}%`
                                                            : '0%',
                                                        transitionDelay: `${200 + i * 60}ms`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="flex-1 py-4">
                    <CardHeader className="px-4 pb-1">
                        <CardTitle className="text-sm font-medium sm:text-base">
                            Recent Scans
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 px-4">
                        {recentScans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No scans recorded yet — this list fills up as
                                interns from your HTE scan in.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentScans.map((scan, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {scan.intern_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {scan.label === 'time_in'
                                                    ? 'Timed In'
                                                    : 'Timed Out'}{' '}
                                                · {scan.scanned_at}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};