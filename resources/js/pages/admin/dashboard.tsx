import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarCheck2,
    ClipboardCheck,
    GraduationCap,
    TrendingUp,
    Users,
} from 'lucide-react';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    const stats = [
        {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: ClipboardCheck,
            onClick: () => router.visit('/admin/interns?status=pending'),
        },
        {
            label: 'Total Interns',
            value: totalInterns,
            icon: GraduationCap,
            onClick: () => router.visit('/admin/interns?status=approved'),
        },
        { label: 'Total Supervisors', value: totalSupervisors, icon: Users },
        { label: 'Active HTEs', value: activeHtes, icon: Building2 },
    ];

    const statusVariant = (status: string) =>
        status === 'approved'
            ? 'default'
            : status === 'rejected'
              ? 'destructive'
              : 'secondary';

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
    const trendMax = Math.max(
        1,
        ...registrationsTrend.map((point) => point.count),
    );
    const topHteMax = Math.max(1, ...topHtes.map((h) => h.count));

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-3 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's happening across the system.
                    </p>
                </div>

                {/* Top-line counts */}
                <div className="grid auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map(({ label, value, icon: Icon, onClick }) => (
                        <Card
                            key={label}
                            className={`py-4 ${onClick ? 'cursor-pointer transition-colors hover:bg-muted/50' : ''}`}
                            onClick={onClick}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1">
                                <CardTitle className="text-sm font-medium">
                                    {label}
                                </CardTitle>
                                <Icon className="size-4 shrink-0 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="px-4">
                                <div className="text-2xl font-bold">
                                    {value}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Analytics row 1: registration momentum + right-now attendance */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Card className="py-4 lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 pb-1">
                            <div>
                                <CardTitle className="text-sm font-medium">
                                    Registrations, last 14 days
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {registrationsTotal} new sign-up
                                    {registrationsTotal === 1 ? '' : 's'} in
                                    this window
                                </p>
                            </div>
                            <TrendingUp className="size-4 shrink-0 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="px-4">
                            {registrationsTotal === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No registrations in the last 14 days.
                                </p>
                            ) : (
                                <div className="flex h-28 items-end gap-1 sm:gap-1.5">
                                    {registrationsTrend.map((point) => (
                                        <div
                                            key={point.date}
                                            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
                                            title={`${point.label}: ${point.count} registration${point.count === 1 ? '' : 's'}`}
                                        >
                                            <div
                                                className={`w-full rounded-t-sm transition-colors ${
                                                    point.count > 0
                                                        ? 'bg-chart-1/70 group-hover:bg-chart-1'
                                                        : 'bg-muted'
                                                }`}
                                                style={{
                                                    height: `${Math.max((point.count / trendMax) * 100, 4)}%`,
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

                    <Card className="py-4">
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
                                    percent={todayAttendance.percent}
                                    checkedIn={todayAttendance.checked_in}
                                    total={todayAttendance.total}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Analytics row 2: approval pipeline + top HTEs */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Card className="py-4">
                        <CardHeader className="px-4 pb-1">
                            <CardTitle className="text-sm font-medium">
                                Approval Pipeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 px-4">
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                {totalStatusCount > 0 &&
                                    statusBreakdown.map(
                                        (item) =>
                                            item.count > 0 && (
                                                <div
                                                    key={item.status}
                                                    className={
                                                        STATUS_META[item.status]
                                                            .barClass
                                                    }
                                                    style={{
                                                        width: `${(item.count / totalStatusCount) * 100}%`,
                                                    }}
                                                    title={`${STATUS_META[item.status].label}: ${item.count}`}
                                                />
                                            ),
                                    )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {statusBreakdown.map((item) => (
                                    <button
                                        key={item.status}
                                        type="button"
                                        onClick={() =>
                                            router.visit(
                                                `/admin/interns?status=${item.status}`,
                                            )
                                        }
                                        className="flex items-center justify-between rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-muted/50"
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                className={`size-2.5 shrink-0 rounded-full ${STATUS_META[item.status].dotClass}`}
                                            />
                                            {STATUS_META[item.status].label}
                                        </span>
                                        <span className="font-medium text-muted-foreground tabular-nums">
                                            {item.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="py-4 lg:col-span-2">
                        <CardHeader className="px-4 pb-1">
                            <CardTitle className="text-sm font-medium">
                                Top HTEs by Approved Interns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4">
                            {topHtes.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No approved interns are assigned to an HTE
                                    yet.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {topHtes.map((hte) => (
                                        <button
                                            key={hte.name}
                                            type="button"
                                            onClick={() =>
                                                router.visit(
                                                    `/admin/htes?search=${encodeURIComponent(hte.name)}`,
                                                )
                                            }
                                            className="group flex flex-col gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
                                        >
                                            <div className="flex items-center justify-between gap-2 text-sm">
                                                <span className="truncate font-medium group-hover:underline">
                                                    {hte.name}
                                                </span>
                                                <span className="shrink-0 text-muted-foreground tabular-nums">
                                                    {hte.count} intern
                                                    {hte.count === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-chart-1"
                                                    style={{
                                                        width: `${(hte.count / topHteMax) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="flex-1 py-4">
                    <CardHeader className="px-4 pb-1">
                        <CardTitle className="text-sm font-medium sm:text-base">
                            Recent Registrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 px-4">
                        {recentRegistrations.data.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No registrations yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                ID Number
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Program
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                HTE
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Registered
                                            </th>
                                            <th className="py-2 font-medium">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentRegistrations.data.map(
                                            (intern) => (
                                                <tr
                                                    key={intern.user_id}
                                                    className={`border-b last:border-0 hover:bg-muted/40 ${intern.status === 'pending' ? 'cursor-pointer' : ''}`}
                                                    onClick={
                                                        intern.status ===
                                                        'pending'
                                                            ? () =>
                                                                  router.visit(
                                                                      `/admin/interns?status=pending&search=${encodeURIComponent(intern.name)}`,
                                                                  )
                                                            : undefined
                                                    }
                                                >
                                                    <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                        <div>{intern.name}</div>
                                                        <div className="text-xs font-normal text-muted-foreground">
                                                            {intern.email}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                                                        {intern.id_number}
                                                    </td>
                                                    <td
                                                        className="max-w-[160px] truncate py-2.5 pr-4"
                                                        title={
                                                            intern.program_name
                                                        }
                                                    >
                                                        {intern.program_name}
                                                    </td>
                                                    <td
                                                        className="max-w-[160px] truncate py-2.5 pr-4"
                                                        title={intern.hte_name}
                                                    >
                                                        {intern.hte_name}
                                                    </td>
                                                    <td
                                                        className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground"
                                                        title={
                                                            intern.registered_at_full
                                                        }
                                                    >
                                                        {intern.registered_at}
                                                    </td>
                                                    <td className="py-2.5">
                                                        <Badge
                                                            variant={statusVariant(
                                                                intern.status,
                                                            )}
                                                            className="capitalize"
                                                        >
                                                            {intern.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationFooter
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

/**
 * Self-contained progress ring for the "checked in today" metric. Kept
 * local to this page (rather than reusing `HoursProgressRing`) since the
 * label shape here — "3 / 10 interns" against a percentage of the
 * approved roster — is different from that component's hours-rendered
 * semantics, and duplicating a ~20-line SVG is cheaper than overloading
 * a shared component's props for a one-off case.
 */
function AttendanceRing({
    percent,
    checkedIn,
    total,
}: {
    percent: number;
    checkedIn: number;
    total: number;
}) {
    const size = 148;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div
            className="relative mx-auto aspect-square w-full"
            style={{ maxWidth: size }}
        >
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="h-full w-full -rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="fill-none stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="fill-none stroke-chart-2 transition-[stroke-dashoffset] duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
                <span className="text-xl font-semibold tabular-nums sm:text-2xl">
                    {clamped}%
                </span>
                <span className="text-center text-xs text-muted-foreground">
                    {checkedIn} / {total} interns
                </span>
            </div>
        </div>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
