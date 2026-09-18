import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Landmark,
    MapPin,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { CountUp } from '@/components/dashboard-analytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampusItem {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    colleges_count: number;
    interns_count: number;
    admins_count: number;
}

export interface CampusAnalytics {
    total: number;
    active: number;
    items: CampusItem[];
}

export interface CollegeItem {
    id: number;
    name: string;
    code: string;
    campus: string | null;
    is_active: boolean;
    programs_count: number;
    interns_count: number;
    admins_count: number;
    has_admin: boolean;
    admin_names: string | null;
}

export interface CollegeAnalytics {
    total: number;
    active: number;
    items: CollegeItem[];
}

export interface UnassignedCollege {
    id: number;
    name: string;
    code: string;
}

export interface AdminAnalytics {
    total: number;
    active: number;
    inactive: number;
    super_admins: number;
    college_admins: number;
    colleges_count: number;
    colleges_with_admin: number;
    coverage_percent: number;
    unassigned_colleges: UnassignedCollege[];
}

export interface SuperAdminAnalytics {
    campuses: CampusAnalytics;
    colleges: CollegeAnalytics;
    admins: AdminAnalytics;
}

// ─── Scrollable list wrapper with bottom fade shadow ─────────────────────────

function ScrollList({
    children,
    maxHeight = 320,
}: {
    children: React.ReactNode;
    maxHeight?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [atBottom, setAtBottom] = useState(false);

    const handleScroll = () => {
        const el = ref.current;

        if (!el) {
return;
}

        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 8);
    };

    return (
        <div className="relative">
            <div
                ref={ref}
                onScroll={handleScroll}
                className="flex flex-col divide-y divide-border overflow-y-auto"
                style={{ maxHeight }}
            >
                {children}
            </div>
            {/* Bottom fade — hidden when scrolled to end */}
            <div
                className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent transition-opacity duration-200',
                    atBottom ? 'opacity-0' : 'opacity-100',
                )}
            />
        </div>
    );
}

// ─── Sticky summary row ───────────────────────────────────────────────────────

function SummaryRow({
    stats,
}: {
    stats: { label: string; value: number | string }[];
}) {
    return (
        <div className="sticky top-0 z-10 flex items-stretch divide-x divide-border border-b bg-muted/30 backdrop-blur-sm">
            {stats.map(({ label, value }) => (
                <div
                    key={label}
                    className="flex flex-1 flex-col gap-0.5 px-3 py-2 sm:px-5 sm:py-3"
                >
                    <span className="text-base font-bold text-foreground tabular-nums sm:text-lg">
                        {typeof value === 'number' ? (
                            <CountUp value={value} />
                        ) : (
                            value
                        )}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground sm:text-xs">
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Clickable list row ───────────────────────────────────────────────────────

function ListRow({
    onClick,
    children,
}: {
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            className="group relative flex cursor-pointer flex-col gap-2 px-3.5 py-3 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 active:bg-muted sm:px-5 sm:py-3.5"
        >
            {children}
            {/* Hover arrow — appears at the right edge */}
            <ArrowRight className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 sm:right-4" />
        </div>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {message}
        </div>
    );
}

// ─── Footer manage button ─────────────────────────────────────────────────────

function ManageFooter({ label, href }: { label: string; href: string }) {
    return (
        <div className="border-t px-5 py-2.5">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between rounded-md px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => router.visit(href)}
            >
                <span>{label}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
        </div>
    );
}

// ─── Campus tab panel ─────────────────────────────────────────────────────────

function CampusesTab({
    data,
    mounted,
}: {
    data: CampusAnalytics;
    mounted: boolean;
}) {
    const maxInterns = Math.max(1, ...data.items.map((c) => c.interns_count));
    const totalInterns = data.items.reduce((s, c) => s + c.interns_count, 0);

    return (
        <>
            <SummaryRow
                stats={[
                    { label: 'Total', value: data.total },
                    { label: 'Active', value: data.active },
                    { label: 'Total Interns', value: totalInterns },
                ]}
            />

            <ScrollList>
                {data.items.length === 0 ? (
                    <EmptyState message="No campuses registered yet." />
                ) : (
                    data.items.map((campus, index) => {
                        const pct =
                            maxInterns > 0
                                ? Math.max(
                                      (campus.interns_count / maxInterns) * 100,
                                      3,
                                  )
                                : 3;

                        return (
                            <ListRow
                                key={campus.id}
                                onClick={() =>
                                    router.visit(
                                        `/admin/colleges?campus=${encodeURIComponent(campus.name)}`,
                                    )
                                }
                            >
                                {/* Top row */}
                                <div className="flex items-center justify-between gap-4 pr-6">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                            {index + 1}
                                        </span>
                                        <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                                            {campus.name}
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                            {campus.code}
                                        </span>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-sm font-semibold text-foreground tabular-nums">
                                            <CountUp
                                                value={campus.interns_count}
                                            />
                                        </span>
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            intern
                                            {campus.interns_count !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress + meta */}
                                <div className="ml-8 flex flex-col gap-1.5">
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                                        <div
                                            className="h-full rounded-full bg-foreground/20 transition-all duration-700 ease-out group-hover:bg-foreground/40"
                                            style={{
                                                width: mounted
                                                    ? `${pct}%`
                                                    : '0%',
                                                transitionDelay: `${index * 50}ms`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                        <span>
                                            {campus.colleges_count} college
                                            {campus.colleges_count !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                        <span>·</span>
                                        <span>
                                            {campus.admins_count} admin
                                            {campus.admins_count !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                        {!campus.is_active && (
                                            <>
                                                <span>·</span>
                                                <span className="text-muted-foreground/50 italic">
                                                    Inactive
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </ListRow>
                        );
                    })
                )}
            </ScrollList>

            <ManageFooter label="Manage Campuses" href="/admin/campuses" />
        </>
    );
}

// ─── Colleges tab panel ───────────────────────────────────────────────────────

function CollegesTab({
    data,
    mounted,
}: {
    data: CollegeAnalytics;
    mounted: boolean;
}) {
    const maxInterns = Math.max(1, ...data.items.map((c) => c.interns_count));
    const noAdminCount = data.items.filter((c) => !c.has_admin).length;
    const totalInterns = data.items.reduce((s, c) => s + c.interns_count, 0);

    return (
        <>
            <SummaryRow
                stats={[
                    { label: 'Total', value: data.total },
                    { label: 'Active', value: data.active },
                    { label: 'Total Interns', value: totalInterns },
                    { label: 'No Admin', value: noAdminCount },
                ]}
            />

            <ScrollList>
                {data.items.length === 0 ? (
                    <EmptyState message="No colleges registered yet." />
                ) : (
                    data.items.map((college, index) => {
                        const pct =
                            maxInterns > 0
                                ? Math.max(
                                      (college.interns_count / maxInterns) *
                                          100,
                                      3,
                                  )
                                : 3;

                        return (
                            <ListRow
                                key={college.id}
                                onClick={() =>
                                    router.visit(
                                        `/admin/colleges?search=${encodeURIComponent(college.code)}`,
                                    )
                                }
                            >
                                {/* Top row */}
                                <div className="flex items-center justify-between gap-4 pr-6">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                            {index + 1}
                                        </span>
                                        <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                                            {college.code}
                                        </span>
                                        <span
                                            className="truncate text-xs text-muted-foreground"
                                            title={college.name}
                                        >
                                            {college.name}
                                        </span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {!college.has_admin && (
                                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                No admin
                                            </span>
                                        )}
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                                <CountUp
                                                    value={
                                                        college.interns_count
                                                    }
                                                />
                                            </span>
                                            <span className="ml-1 text-xs text-muted-foreground">
                                                intern
                                                {college.interns_count !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress + meta */}
                                <div className="ml-8 flex flex-col gap-1.5">
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                                        <div
                                            className="h-full rounded-full bg-foreground/20 transition-all duration-700 ease-out group-hover:bg-foreground/40"
                                            style={{
                                                width: mounted
                                                    ? `${pct}%`
                                                    : '0%',
                                                transitionDelay: `${index * 50}ms`,
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                        <span>
                                            {college.programs_count} program
                                            {college.programs_count !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                        {college.campus && (
                                            <>
                                                <span>·</span>
                                                <span>{college.campus}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </ListRow>
                        );
                    })
                )}
            </ScrollList>

            <ManageFooter label="Manage Colleges" href="/admin/colleges" />
        </>
    );
}

// ─── Admin Coverage tab panel ─────────────────────────────────────────────────

function AdminCoverageTab({
    data,
    mounted,
}: {
    data: AdminAnalytics;
    mounted: boolean;
}) {
    const isFullCoverage = data.coverage_percent >= 100;

    return (
        <>
            <SummaryRow
                stats={[
                    { label: 'Total Admins', value: data.total },
                    { label: 'Active', value: data.active },
                    { label: 'Super', value: data.super_admins },
                    { label: 'College', value: data.college_admins },
                ]}
            />

            <div className="flex flex-col gap-5 px-5 py-5">
                {/* Coverage meter */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">
                            College Coverage
                        </span>
                        <span
                            className={cn(
                                'font-bold tabular-nums',
                                isFullCoverage
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400',
                            )}
                        >
                            {data.coverage_percent}%
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-700 ease-out',
                                isFullCoverage
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500',
                            )}
                            style={{
                                width: mounted
                                    ? `${Math.min(data.coverage_percent, 100)}%`
                                    : '0%',
                            }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            {data.colleges_with_admin} of {data.colleges_count}{' '}
                            colleges assigned
                        </span>
                        {isFullCoverage ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="size-3" />
                                Full coverage
                            </span>
                        ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                                {data.colleges_count - data.colleges_with_admin}{' '}
                                unassigned
                            </span>
                        )}
                    </div>
                </div>

                {/* Unassigned alert / all-clear */}
                {data.unassigned_colleges.length > 0 ? (
                    <div className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <AlertCircle className="size-3.5 shrink-0" />
                            {data.unassigned_colleges.length} college
                            {data.unassigned_colleges.length !== 1 ? 's' : ''}{' '}
                            without an administrator
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {data.unassigned_colleges.map((col) => (
                                <button
                                    key={col.id}
                                    type="button"
                                    title={`Assign admin to ${col.name}`}
                                    onClick={() =>
                                        router.visit(
                                            `/admin/admins?college_id=${col.id}`,
                                        )
                                    }
                                    className="group flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 font-mono text-[11px] font-medium text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm active:scale-95 dark:border-amber-500/30 dark:bg-background dark:text-amber-300 dark:hover:bg-amber-500/10"
                                >
                                    {col.code}
                                    <ArrowRight className="size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-400">
                            All colleges have an assigned administrator.
                        </span>
                    </div>
                )}

                {/* Inactive note */}
                {data.inactive > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {data.inactive} inactive admin
                        {data.inactive !== 1 ? 's' : ''} not included in active
                        count.
                    </p>
                )}
            </div>

            <ManageFooter label="Manage Admins" href="/admin/admins" />
        </>
    );
}

// ─── Main export: single tabbed card ─────────────────────────────────────────

/**
 * Unified Institutional Overview card with three internal tabs:
 * Campuses · Colleges · Admin Coverage
 */
export function InstitutionalOverviewCard({
    data,
    mounted,
}: {
    data: SuperAdminAnalytics;
    mounted: boolean;
}) {
    const [tab, setTab] = useState<'campuses' | 'colleges' | 'coverage'>(
        'campuses',
    );

    return (
        <Card className="overflow-hidden shadow-xs">
            <CardHeader className="border-b px-3.5 pt-3.5 pb-0 sm:px-5 sm:pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Landmark className="size-4" />
                        </span>
                        <div>
                            <CardTitle className="text-sm leading-none font-semibold">
                                Institutional Overview
                            </CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Campuses, colleges &amp; admin coverage
                            </p>
                        </div>
                    </div>

                    {/* Quick summary badges */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge
                            variant="outline"
                            className="gap-1 text-xs font-normal"
                        >
                            <MapPin className="size-3 text-muted-foreground" />
                            {data.campuses.active} campus
                            {data.campuses.active !== 1 ? 'es' : ''}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="gap-1 text-xs font-normal"
                        >
                            <Landmark className="size-3 text-muted-foreground" />
                            {data.colleges.active} college
                            {data.colleges.active !== 1 ? 's' : ''}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="gap-1 text-xs font-normal"
                        >
                            <Users className="size-3 text-muted-foreground" />
                            {data.admins.active} admin
                            {data.admins.active !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                </div>

                {/* Underline-style tab bar */}
                <Tabs
                    value={tab}
                    onValueChange={(v) => setTab(v as typeof tab)}
                >
                    <TabsList className="h-9 w-full rounded-none border-0 bg-transparent p-0 shadow-none">
                        <TabsTrigger
                            value="campuses"
                            className="relative h-full flex-1 rounded-none border-0 bg-transparent px-2 text-[11px] shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-full after:transition-colors data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-foreground sm:text-xs"
                        >
                            <MapPin className="mr-1 size-3 sm:mr-1.5 sm:size-3.5" />
                            <span>Campuses</span>
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground sm:ml-1.5">
                                {data.campuses.total}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="colleges"
                            className="relative h-full flex-1 rounded-none border-0 bg-transparent px-2 text-[11px] shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-full after:transition-colors data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-foreground sm:text-xs"
                        >
                            <Landmark className="mr-1 size-3 sm:mr-1.5 sm:size-3.5" />
                            <span>Colleges</span>
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground sm:ml-1.5">
                                {data.colleges.total}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="coverage"
                            className="relative h-full flex-1 rounded-none border-0 bg-transparent px-2 text-[11px] shadow-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-full after:transition-colors data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-foreground sm:text-xs"
                        >
                            <ShieldCheck className="mr-1 size-3 sm:mr-1.5 sm:size-3.5" />
                            <span>Coverage</span>
                            <span
                                className={cn(
                                    'ml-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-normal sm:ml-1.5',
                                    data.admins.coverage_percent >= 100
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                )}
                            >
                                {data.admins.coverage_percent}%
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>

            {/* Tab panels — animate in on switch */}
            <CardContent className="p-0">
                <div key={tab} className="animate-in duration-150 fade-in-0">
                    {tab === 'campuses' && (
                        <CampusesTab data={data.campuses} mounted={mounted} />
                    )}
                    {tab === 'colleges' && (
                        <CollegesTab data={data.colleges} mounted={mounted} />
                    )}
                    {tab === 'coverage' && (
                        <AdminCoverageTab
                            data={data.admins}
                            mounted={mounted}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Legacy named exports (kept for any other consumers) ──────────────────────

/** @deprecated Use InstitutionalOverviewCard instead */
export function CampusDistributionCard(props: {
    data: CampusAnalytics;
    mounted: boolean;
}) {
    void props;

    return null;
}

/** @deprecated Use InstitutionalOverviewCard instead */
export function CollegeEnrollmentCard(props: {
    data: CollegeAnalytics;
    mounted: boolean;
}) {
    void props;

    return null;
}

/** @deprecated Use InstitutionalOverviewCard instead */
export function AdminCoverageCard(props: {
    data: AdminAnalytics;
    mounted: boolean;
}) {
    void props;

    return null;
}

