import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarCheck2,
    ClipboardCheck,
    Clock,
    GraduationCap,
    TrendingUp,
    FileWarning,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AttendanceRing,
    CountUp,
    RankedList,
    StatCard,
    TrendBarChart,
} from '@/components/dashboard-analytics';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { PageProps } from '@/types';
import { dashboard } from '@/routes';

interface RecentScan {
    id: number;
    intern_name: string;
    id_number?: string | null;
    label: 'time_in' | 'time_out';
    scanned_at: string;
    scanned_at_full: string;
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
    recentScans: Paginated<RecentScan>;
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
        barClass: 'bg-emerald-500',
        dotClass: 'bg-emerald-500',
    },
    pending: {
        label: 'Pending',
        barClass: 'bg-amber-500',
        dotClass: 'bg-amber-500',
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

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));

        return () => cancelAnimationFrame(id);
    }, []);

    const stats = [
        {
            label: 'My Interns',
            value: myInternsCount,
            icon: GraduationCap,
            variant: 'primary' as const,
            description: 'Assigned to your establishment',
            onClick: () => router.visit('/supervisor/interns'),
        },
        {
            label: 'Scans Today',
            value: scansToday,
            icon: ClipboardCheck,
            variant: 'success' as const,
            description: 'Total time-ins & time-outs',
        },
        {
            label: 'Scans This Week',
            value: scansThisWeek,
            icon: Clock,
            variant: 'default' as const,
            description: 'Weekly cumulative activity',
        },
        {
            label: 'Pending Tickets',
            value: pendingTickets,
            icon: FileWarning,
            variant: 'warning' as const,
            description: pendingTickets > 0 ? 'Awaiting resolution' : 'Zero pending requests',
            onClick: () => router.visit('/supervisor/resolution-tickets'),
        },
    ];

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/dashboard', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        visit({
            page: String(page),
            per_page: String(recentScans.per_page),
        });
    };

    const changePerPage = (perPage: number) => {
        visit({ per_page: String(perPage) });
    };

    const totalTicketCount = ticketBreakdown.reduce(
        (sum, s) => sum + s.count,
        0,
    );
    const scansTotal = scansTrend.reduce((sum, point) => sum + point.count, 0);

    return (
        <>
            <Head title="Supervisor Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-5 p-4 sm:p-6">
                {/* Header banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Welcome back, {auth.user.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Real-time overview of attendance tracking, kiosk scans, and resolution requests.
                        </p>
                    </div>
                    {scopeName && (
                        <Badge variant="secondary" className="px-3 py-1 font-medium text-xs shadow-xs">
                            {scopeName}
                        </Badge>
                    )}
                </div>

                {/* Top-line KPI Stat Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <StatCard
                            key={stat.label}
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            variant={stat.variant}
                            description={stat.description}
                            onClick={stat.onClick}
                            index={i}
                        />
                    ))}
                </div>

                {/* Analytics row 1: scan momentum + right-now attendance */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Scan Momentum (Last 14 Days)
                                </CardTitle>
                                <CardDescription>
                                    {scansTotal} scan
                                    {scansTotal === 1 ? '' : 's'} recorded in this window
                                </CardDescription>
                            </div>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <TrendingUp className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <TrendBarChart
                                data={scansTrend}
                                mounted={mounted}
                                barColor="bg-primary"
                            />
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs flex flex-col justify-between">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Today's Attendance
                                </CardTitle>
                                <CardDescription>
                                    Live check-in progress
                                </CardDescription>
                            </div>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <CalendarCheck2 className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-4">
                            {todayAttendance.total === 0 ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                    No approved interns assigned yet.
                                </div>
                            ) : (
                                <AttendanceRing
                                    percent={
                                        mounted ? todayAttendance.percent : 0
                                    }
                                    checkedIn={todayAttendance.checked_in}
                                    total={todayAttendance.total}
                                    subtitle="Interns checked in"
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics row 2: ticket pipeline + top interns */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">
                                Resolution Ticket Pipeline
                            </CardTitle>
                            <CardDescription>
                                Status distribution of attendance change requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {/* Segmented multi-color progress bar */}
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
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

                            {/* Status items with filter navigation */}
                            <div className="flex flex-col gap-1.5">
                                {ticketBreakdown.map((item) => (
                                    <button
                                        key={item.status}
                                        type="button"
                                        onClick={() => router.visit('/supervisor/resolution-tickets')}
                                        className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-muted/60 text-left w-full"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={`size-3 shrink-0 rounded-full ${TICKET_STATUS_META[item.status].dotClass}`}
                                            />
                                            <span className="font-medium text-foreground">
                                                {TICKET_STATUS_META[item.status].label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground tabular-nums">
                                                <CountUp value={item.count} />
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ({totalTicketCount > 0 ? Math.round((item.count / totalTicketCount) * 100) : 0}%)
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">
                                Top Interns by Scans (Last 14 Days)
                            </CardTitle>
                            <CardDescription>
                                Interns with the highest scanning activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RankedList
                                items={topInterns}
                                mounted={mounted}
                                onItemClick={(name) =>
                                    router.visit(
                                        `/supervisor/interns?search=${encodeURIComponent(name)}`,
                                    )
                                }
                                emptyMessage="No scans recorded in the last 14 days."
                                itemLabel="scan"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Scans with Shadcn UI Table & NumberedPagination */}
                <Card className="shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Recent Scans
                                </CardTitle>
                                <CardDescription>
                                    Live activity log from the HTE scanning station
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-normal">
                                Total {recentScans.total}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {recentScans.data.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                No scans recorded yet — this list fills up as interns from your HTE scan in.
                            </div>
                        ) : (
                            <>
                                {/* Table — desktop view */}
                                <div className="hidden sm:block rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="font-semibold px-4">Intern Name</TableHead>
                                                <TableHead className="font-semibold text-center px-4">ID Number</TableHead>
                                                <TableHead className="font-semibold text-center px-4">Type</TableHead>
                                                <TableHead className="font-semibold text-right px-4">Scanned At</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentScans.data.map((scan) => (
                                                <TableRow key={scan.id}>
                                                    <TableCell className="font-medium text-foreground px-4">
                                                        {scan.intern_name}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground tabular-nums px-4">
                                                        {scan.id_number ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="text-center px-4">
                                                        <Badge
                                                            variant={scan.label === 'time_in' ? 'default' : 'secondary'}
                                                            className="font-medium text-xs shadow-xs"
                                                        >
                                                            {scan.label === 'time_in' ? 'Time In' : 'Time Out'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-right text-muted-foreground whitespace-nowrap text-xs px-4"
                                                        title={scan.scanned_at_full}
                                                    >
                                                        {scan.scanned_at}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile card list */}
                                <div className="divide-y rounded-lg border sm:hidden">
                                    {recentScans.data.map((scan) => (
                                        <div
                                            key={scan.id}
                                            className="flex items-center justify-between p-3.5"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm text-foreground">
                                                    {scan.intern_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground" title={scan.scanned_at_full}>
                                                    {scan.scanned_at}
                                                </span>
                                            </div>
                                            <Badge
                                                variant={scan.label === 'time_in' ? 'default' : 'secondary'}
                                                className="font-medium text-xs"
                                            >
                                                {scan.label === 'time_in' ? 'Time In' : 'Time Out'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>

                                <NumberedPagination
                                    meta={recentScans}
                                    itemLabel="scan"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="dashboard-recent-scans-per-page"
                                />
                            </>
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