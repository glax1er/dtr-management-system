import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    GraduationCap,
    TrendingUp,
    Users,
    User as UserIcon,
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
import { StatusBadge } from '@/components/ui/badges/status-badge';
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

interface RecentRegistration {
    user_id: number;
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    status: 'pending' | 'approved' | 'rejected';
    registered_at: string;
    registered_at_full: string;
}

interface StatusCount {
    status: 'pending' | 'approved' | 'rejected';
    count: number;
}

interface TrendPoint {
    date: string;
    label: string;
    count: number;
}

interface TopHte {
    name: string;
    count: number;
}

interface TodayAttendance {
    checked_in: number;
    total: number;
    percent: number;
}

interface AdminDashboardProps {
    pendingApprovals: number;
    totalInterns: number;
    totalSupervisors: number;
    activeHtes: number;
    recentRegistrations: Paginated<RecentRegistration>;
    statusBreakdown: StatusCount[];
    registrationsTrend: TrendPoint[];
    topHtes: TopHte[];
    todayAttendance: TodayAttendance;
}

const STATUS_META: Record<
    StatusCount['status'],
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

export default function AdminDashboard({
    pendingApprovals,
    totalInterns,
    totalSupervisors,
    activeHtes,
    recentRegistrations,
    statusBreakdown,
    registrationsTrend,
    topHtes,
    todayAttendance,
}: AdminDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));

        return () => cancelAnimationFrame(id);
    }, []);

    const stats = [
        {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: ClipboardCheck,
            variant: 'warning' as const,
            description: pendingApprovals > 0 ? 'Requires your review' : 'All caught up',
            onClick: () => router.visit('/admin/interns?status=pending'),
        },
        {
            label: 'Total Interns',
            value: totalInterns,
            icon: GraduationCap,
            variant: 'primary' as const,
            description: 'Approved student accounts',
            onClick: () => router.visit('/admin/interns?status=approved'),
        },
        {
            label: 'Total Supervisors',
            value: totalSupervisors,
            icon: Users,
            variant: 'success' as const,
            description: 'Assigned HTE mentors',
        },
        {
            label: 'Active HTEs',
            value: activeHtes,
            icon: Building2,
            variant: 'default' as const,
            description: 'Host training establishments',
        },
    ];

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/dashboard', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        visit({
            page: String(page),
            per_page: String(recentRegistrations.per_page),
        });
    };

    const changePerPage = (perPage: number) => {
        visit({ per_page: String(perPage) });
    };

    const totalStatusCount = statusBreakdown.reduce(
        (sum, s) => sum + s.count,
        0,
    );
    const registrationsTotal = registrationsTrend.reduce(
        (sum, point) => sum + point.count,
        0,
    );

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-5 p-4 sm:p-6">
                {/* Header banner */}
                <div className="flex items-center gap-4">
                    <div className="shrink-0">
                        <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted shadow-xs sm:size-16">
                            {auth.user.avatar ? (
                                <img
                                    src={auth.user.avatar}
                                    alt={auth.user.name}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <UserIcon className="size-7 text-muted-foreground sm:size-8" />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Welcome back, {auth.user.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Real-time overview of registrations, attendance, and training establishments.
                        </p>
                    </div>
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

                {/* Analytics row 1: registration momentum + right-now attendance */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="lg:col-span-2 shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Registration Activity (Last 14 Days)
                                </CardTitle>
                                <CardDescription>
                                    {registrationsTotal} new sign-up
                                    {registrationsTotal === 1 ? '' : 's'} across this window
                                </CardDescription>
                            </div>
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                <TrendingUp className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <TrendBarChart
                                data={registrationsTrend}
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
                                    No approved interns enrolled yet.
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

                {/* Analytics row 2: approval pipeline + top HTEs */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">
                                Approval Pipeline
                            </CardTitle>
                            <CardDescription>
                                Distribution of student onboarding status
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            {/* Segmented multi-color progress bar */}
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                                {totalStatusCount > 0 &&
                                    statusBreakdown.map(
                                        (item, i) =>
                                            item.count > 0 && (
                                                <div
                                                    key={item.status}
                                                    className={`transition-[width] duration-700 ease-out ${STATUS_META[item.status].barClass}`}
                                                    style={{
                                                        width: mounted
                                                            ? `${(item.count / totalStatusCount) * 100}%`
                                                            : '0%',
                                                        transitionDelay: `${150 + i * 80}ms`,
                                                    }}
                                                    title={`${STATUS_META[item.status].label}: ${item.count}`}
                                                />
                                            ),
                                    )}
                            </div>

                            {/* Status list with interactive filter links */}
                            <div className="flex flex-col gap-1.5">
                                {statusBreakdown.map((item) => (
                                    <button
                                        key={item.status}
                                        type="button"
                                        onClick={() =>
                                            router.visit(
                                                `/admin/interns?status=${item.status}`,
                                            )
                                        }
                                        className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-muted/60"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={`size-3 shrink-0 rounded-full ${STATUS_META[item.status].dotClass}`}
                                            />
                                            <span className="font-medium text-foreground">
                                                {STATUS_META[item.status].label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-foreground tabular-nums">
                                                <CountUp value={item.count} />
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ({totalStatusCount > 0 ? Math.round((item.count / totalStatusCount) * 100) : 0}%)
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
                                Top HTEs by Approved Interns
                            </CardTitle>
                            <CardDescription>
                                Establishments with the highest intern placement
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RankedList
                                items={topHtes}
                                mounted={mounted}
                                onItemClick={(name) =>
                                    router.visit(
                                        `/admin/htes?search=${encodeURIComponent(name)}`,
                                    )
                                }
                                emptyMessage="No approved interns assigned to an HTE yet."
                                itemLabel="intern"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Registrations Table with Shadcn UI Table */}
                <Card className="shadow-xs">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Recent Registrations
                                </CardTitle>
                                <CardDescription>
                                    Latest student intern sign-ups awaiting approval
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-normal">
                                Total {recentRegistrations.total}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {recentRegistrations.data.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                No registrations recorded yet.
                            </div>
                        ) : (
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow>
                                            <TableHead className="font-semibold">Student Name</TableHead>
                                            <TableHead className="font-semibold text-center">ID Number</TableHead>
                                            <TableHead className="font-semibold text-center">Program</TableHead>
                                            <TableHead className="font-semibold text-center">HTE</TableHead>
                                            <TableHead className="font-semibold text-center">Registered</TableHead>
                                            <TableHead className="font-semibold text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentRegistrations.data.map((intern) => (
                                            <TableRow
                                                key={intern.user_id}
                                                className={
                                                    intern.status === 'pending'
                                                        ? 'cursor-pointer hover:bg-muted/50'
                                                        : undefined
                                                }
                                                onClick={
                                                    intern.status === 'pending'
                                                        ? () =>
                                                              router.visit(
                                                                  `/admin/interns?status=pending&search=${encodeURIComponent(intern.name)}`,
                                                              )
                                                        : undefined
                                                }
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="font-medium text-foreground">
                                                        {intern.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {intern.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground tabular-nums text-center">
                                                    {intern.id_number}
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate text-center" title={intern.program_name}>
                                                    {intern.program_name}
                                                </TableCell>
                                                <TableCell className="max-w-[180px] truncate text-center" title={intern.hte_name}>
                                                    {intern.hte_name}
                                                </TableCell>
                                                <TableCell
                                                    className="text-muted-foreground whitespace-nowrap text-xs text-center"
                                                    title={intern.registered_at_full}
                                                >
                                                    {intern.registered_at}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <StatusBadge status={intern.status}/>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <NumberedPagination
                            meta={recentRegistrations}
                            itemLabel="registration"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="dashboard-per-page"
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};

