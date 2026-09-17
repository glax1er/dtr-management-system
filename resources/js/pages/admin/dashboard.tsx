import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Building2,
    CalendarCheck2,
    ClipboardCheck,
    GraduationCap,
    Landmark,
    LayoutGrid,
    MapPin,
    ShieldCheck,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AttendanceRing,
    RankedList,
    StatCard,
    StatusPieChart,
    TrendBarChart,
} from '@/components/dashboard-analytics';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import {
    InstitutionalOverviewCard,
} from '@/components/super-admin-analytics';
import type { SuperAdminAnalytics } from '@/components/super-admin-analytics';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

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
    college?: { id: number; name: string; code: string } | null;
    superAdminAnalytics?: SuperAdminAnalytics | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Dashboard Component ──────────────────────────────────────────────────────

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
    superAdminAnalytics,
}: AdminDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const isSuperAdmin =
        Boolean(auth.user?.is_super_admin) ||
        auth.user?.role === 'super_admin' ||
        Boolean(superAdminAnalytics);

    const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'institution'>('overview');

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));

        return () => cancelAnimationFrame(id);
    }, []);

    // ── Primary Operational KPI Cards ─────────────────────────────────────────
    const operationalStats = [
        {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: ClipboardCheck,
            variant: 'warning' as const,
            badge:
                pendingApprovals > 0 ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Review needed
                    </span>
                ) : undefined,
            onClick: () => router.visit('/admin/interns?status=pending'),
        },
        {
            label: 'Total Interns',
            value: totalInterns,
            icon: GraduationCap,
            variant: 'primary' as const,
            onClick: () => router.visit('/admin/interns?status=approved'),
        },
        {
            label: 'Supervisors',
            value: totalSupervisors,
            icon: Users,
            variant: 'success' as const,
            onClick: () => router.visit('/admin/supervisors'),
        },
        {
            label: 'Active HTEs',
            value: activeHtes,
            icon: Building2,
            variant: 'default' as const,
            onClick: () => router.visit('/admin/htes'),
        },
    ];

    // ── Super Admin Institutional KPI Cards ───────────────────────────────────
    const institutionalStats = superAdminAnalytics
        ? [
              {
                  label: 'Total Admins',
                  value: superAdminAnalytics.admins.total,
                  icon: ShieldCheck,
                  variant: 'purple' as const,
                  badge: (
                      <span className="text-[10px] text-muted-foreground">
                          {superAdminAnalytics.admins.super_admins}S · {superAdminAnalytics.admins.college_admins}C
                      </span>
                  ),
                  onClick: () => router.visit('/admin/admins'),
              },
              {
                  label: 'Active Colleges',
                  value: superAdminAnalytics.colleges.active,
                  icon: Landmark,
                  variant: 'primary' as const,
                  badge: (
                      <span className="text-[10px] text-muted-foreground">
                          of {superAdminAnalytics.colleges.total}
                      </span>
                  ),
                  onClick: () => router.visit('/admin/colleges'),
              },
              {
                  label: 'Active Campuses',
                  value: superAdminAnalytics.campuses.active,
                  icon: MapPin,
                  variant: 'success' as const,
                  badge: (
                      <span className="text-[10px] text-muted-foreground">
                          of {superAdminAnalytics.campuses.total}
                      </span>
                  ),
                  onClick: () => router.visit('/admin/campuses'),
              },
              {
                  label: 'Admin Coverage',
                  displayValue: `${superAdminAnalytics.admins.coverage_percent}%`,
                  icon: ShieldCheck,
                  variant:
                      superAdminAnalytics.admins.coverage_percent >= 100
                          ? ('success' as const)
                          : ('warning' as const),
                  badge: (
                      <span className="text-[10px] text-muted-foreground">
                          {superAdminAnalytics.admins.colleges_with_admin}/{superAdminAnalytics.admins.colleges_count}
                      </span>
                  ),
                  onClick: () => router.visit('/admin/admins'),
              },
          ]
        : [];

    // ── Pagination helpers ────────────────────────────────────────────────────
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
    const totalHteInterns = topHtes.reduce((sum, hte) => sum + hte.count, 0);

    const showOperations = activeTab === 'overview' || activeTab === 'operations';
    const showInstitution = isSuperAdmin && superAdminAnalytics && (activeTab === 'overview' || activeTab === 'institution');
    const unassignedColleges = superAdminAnalytics?.admins?.unassigned_colleges ?? [];

    return (
        <>
            <Head title="Admin Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-black sm:gap-3 sm:text-2xl dark:text-white">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:size-10">
                            <LayoutGrid className="size-4 sm:size-5" />
                        </span>
                        <span>
                            Welcome, {auth.user?.name || 'User'}
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:text-sm">
                                Dashboard overview
                            </span>
                        </span>
                        {isSuperAdmin && (
                            <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                            >
                                <ShieldCheck className="mr-1 size-3.5" />
                                Super Admin
                            </Badge>
                        )}
                    </h1>
                </div>

                {/* ── Tab Navigation (Super Admin only) ──────────────────── */}
                {isSuperAdmin && (
                    <Tabs
                        value={activeTab}
                        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
                        className="w-full"
                    >
                        <TabsList className="h-9 w-full grid grid-cols-3 sm:w-auto sm:inline-flex">
                            <TabsTrigger value="overview" className="gap-1 px-1.5 text-xs sm:gap-1.5 sm:px-3 sm:text-sm">
                                <LayoutGrid className="size-3.5 shrink-0" />
                                <span className="truncate">Overview</span>
                            </TabsTrigger>
                            <TabsTrigger value="operations" className="gap-1 px-1.5 text-xs sm:gap-1.5 sm:px-3 sm:text-sm">
                                <GraduationCap className="size-3.5 shrink-0" />
                                <span className="truncate">Interns</span>
                                <span className="hidden sm:inline">&nbsp;&amp; Attendance</span>
                            </TabsTrigger>
                            <TabsTrigger value="institution" className="gap-1 px-1.5 text-xs sm:gap-1.5 sm:px-3 sm:text-sm">
                                <Landmark className="size-3.5 shrink-0" />
                                <span className="truncate">Institution</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                {/* ── Unassigned Colleges Warning ────────────────────────── */}
                {isSuperAdmin && unassignedColleges.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <AlertCircle className="size-3.5" />
                            </span>
                            <div className="space-y-1">
                                <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    {unassignedColleges.length === 1
                                        ? '1 college does not have an assigned administrator'
                                        : `${unassignedColleges.length} colleges do not have an assigned administrator`}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                                    <span className="font-medium">Unassigned:</span>
                                    {unassignedColleges.map((col) => (
                                        <button
                                            key={col.id}
                                            type="button"
                                            onClick={() =>
                                                router.visit(
                                                    `/admin/admins?college_id=${col.id}`,
                                                )
                                            }
                                            className="group inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-background/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-800 transition-colors hover:border-amber-500/60 hover:bg-background dark:text-amber-300"
                                            title={`Assign administrator for ${col.name}`}
                                        >
                                            {col.code}
                                            <ArrowRight className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full shrink-0 justify-center border-amber-500/40 bg-background text-xs font-medium text-amber-800 hover:bg-amber-500/15 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-500/20 sm:w-auto"
                            onClick={() => router.visit('/admin/admins')}
                        >
                            <span>Manage Admins</span>
                            <ArrowRight className="ml-1.5 size-3.5" />
                        </Button>
                    </div>
                )}

                {/* ── Institutional KPIs (Institution tab) ───────────────── */}
                {activeTab === 'institution' && institutionalStats.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                        {institutionalStats.map((stat, i) => (
                            <StatCard
                                key={stat.label}
                                label={stat.label}
                                value={'value' in stat ? stat.value : undefined}
                                displayValue={stat.displayValue}
                                icon={stat.icon}
                                variant={stat.variant}
                                badge={stat.badge}
                                onClick={stat.onClick}
                                index={i}
                            />
                        ))}
                    </div>
                )}

                {/* ── Operational KPI Cards ──────────────────────────────── */}
                {showOperations && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                        {operationalStats.map((stat, i) => (
                            <StatCard
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
                                icon={stat.icon}
                                variant={stat.variant}
                                badge={stat.badge}
                                onClick={stat.onClick}
                                index={i}
                            />
                        ))}
                    </div>
                )}

                {/* ── Charts Row ─────────────────────────────────────────── */}
                {showOperations && (
                    <>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {/* Registration Trend */}
                            <Card className="shadow-xs lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <TrendingUp className="size-4" />
                                        </span>
                                        <CardTitle className="text-base font-semibold">
                                            Registration Trend
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs font-normal">
                                        {registrationsTotal} new
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    <TrendBarChart
                                        data={registrationsTrend}
                                        mounted={mounted}
                                        barColor="bg-primary"
                                    />
                                </CardContent>
                            </Card>

                            {/* Today's Attendance */}
                            <Card className="flex flex-col shadow-xs">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <CalendarCheck2 className="size-4" />
                                        </span>
                                        <CardTitle className="text-base font-semibold">
                                            Today's Attendance
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col items-center justify-center py-4">
                                    {todayAttendance.total === 0 ? (
                                        <div className="py-8 text-center text-xs text-muted-foreground sm:text-sm">
                                            No approved interns enrolled yet.
                                        </div>
                                    ) : (
                                        <AttendanceRing
                                            percent={mounted ? todayAttendance.percent : 0}
                                            checkedIn={todayAttendance.checked_in}
                                            total={todayAttendance.total}
                                            subtitle="Live check-in progress"
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Approval Status + Top Establishments */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {/* Approval Status Pie Chart */}
                            <Card className="flex flex-col shadow-xs">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                <ClipboardCheck className="size-4" />
                                            </span>
                                            <div>
                                                <CardTitle className="text-base font-semibold">
                                                    Approval Status
                                                </CardTitle>
                                                <CardDescription className="text-xs">
                                                    Registration verification breakdown
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-xs font-normal"
                                        >
                                            {totalStatusCount} total
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col justify-center pt-2">
                                    <StatusPieChart
                                        data={statusBreakdown}
                                        mounted={mounted}
                                        onStatusClick={(status) =>
                                            router.visit(
                                                `/admin/interns?status=${status}`,
                                            )
                                        }
                                    />
                                </CardContent>
                            </Card>

                            {/* Top Establishments */}
                            <Card className="flex flex-col shadow-xs lg:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Building2 className="size-4" />
                                        </span>
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                Top Establishments
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Leading host partners by approved intern placement
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {topHtes.length > 0 && (
                                            <Badge
                                                variant="outline"
                                                className="hidden font-mono text-xs font-normal sm:inline-flex"
                                            >
                                                {totalHteInterns} placed
                                            </Badge>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() => router.visit('/admin/htes')}
                                        >
                                            <span>Manage HTEs</span>
                                            <ArrowRight className="size-3.5" />
                                        </Button>
                                    </div>
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
                    </>
                )}

                {/* ── Institutional Analytics ────────────────────────────── */}
                {showInstitution && (
                    <>
                        {/* Section divider with label — only shown in Overview */}
                        {activeTab === 'overview' && (
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-border/60" />
                                <span className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                    <Landmark className="size-3" />
                                    Institutional Overview
                                </span>
                                <div className="h-px flex-1 bg-border/60" />
                            </div>
                        )}

                        <InstitutionalOverviewCard
                            data={superAdminAnalytics!}
                            mounted={mounted}
                        />
                    </>
                )}

                {/* ── Recent Registrations Table (Unchanged) ─────────────── */}
                {showOperations && (
                    <Card className="shadow-xs">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <GraduationCap className="size-4" />
                                    </span>
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            Recent Registrations
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Latest student intern sign-ups awaiting approval
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-xs font-normal"
                                >
                                    Total {recentRegistrations.total}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="flex flex-col gap-4">
                            {recentRegistrations.data.length === 0 ? (
                                <div className="py-12 text-center text-xs text-muted-foreground sm:text-sm">
                                    No registrations recorded yet.
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-xs font-semibold">
                                                    Student Name
                                                </TableHead>
                                                <TableHead className="text-center text-xs font-semibold">
                                                    ID Number
                                                </TableHead>
                                                <TableHead className="text-center text-xs font-semibold">
                                                    Program
                                                </TableHead>
                                                <TableHead className="text-center text-xs font-semibold">
                                                    HTE
                                                </TableHead>
                                                <TableHead className="text-center text-xs font-semibold">
                                                    Registered
                                                </TableHead>
                                                <TableHead className="text-center text-xs font-semibold">
                                                    Status
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentRegistrations.data.map(
                                                (intern) => (
                                                    <TableRow
                                                        key={intern.user_id}
                                                        className={
                                                            intern.status ===
                                                            'pending'
                                                                ? 'cursor-pointer hover:bg-muted/50'
                                                                : undefined
                                                        }
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
                                                        <TableCell className="font-medium">
                                                            <div className="font-medium text-foreground">
                                                                {intern.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {intern.email}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                                                            {intern.id_number}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-[180px] truncate text-center text-xs"
                                                            title={
                                                                intern.program_name
                                                            }
                                                        >
                                                            {intern.program_name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-[180px] truncate text-center text-xs"
                                                            title={intern.hte_name}
                                                        >
                                                            {intern.hte_name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="whitespace-nowrap text-center text-xs text-muted-foreground"
                                                            title={
                                                                intern.registered_at_full
                                                            }
                                                        >
                                                            {intern.registered_at}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <StatusBadge
                                                                status={
                                                                    intern.status
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
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
                )}
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
