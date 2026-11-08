import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Award,
    Building2,
    CalendarCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    Eye,
    FileCheck2,
    FileStack,
    FileText,
    Filter,
    GraduationCap,
    LayoutGrid,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CompletionSummaryDialog } from '@/components/completion-summary-dialog';
import {
    AttendanceRing,
    CountUp,
    RankedList,
    StatCard,
    TrendBarChart,
} from '@/components/dashboard-analytics';
import { InternDocumentsDialog } from '@/components/intern-documents-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, PageProps } from '@/types';

export interface StudentMilestoneItem {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    hte_name: string;
    hte_id: number | null;
    total_hours: number;
    required_hours: number;
    progress_percent: number;
    hours_completed: boolean;
    approved_docs_count: number;
    total_required_docs_count: number;
    pending_docs_count: number;
    docs_completed: boolean;
    is_completed: boolean;
    milestone: 'completed' | 'near_completion' | 'midway' | 'in_progress' | 'early_stage';
    milestone_label: string;
    profile_photo_url?: string | null;
}

export interface MilestoneCategory {
    key: 'completed' | 'near_completion' | 'midway' | 'in_progress' | 'early_stage';
    label: string;
    description: string;
    count: number;
    color: string;
}

export interface HtePartner {
    hte_id: number | null;
    name: string;
    count: number;
}

export interface DocStats {
    total_submitted: number;
    approved: number;
    pending_review: number;
    rejected: number;
}

export interface TrendPoint {
    date: string;
    label: string;
    count: number;
}

export interface TodayAttendance {
    checked_in: number;
    total: number;
    percent: number;
}

export interface DashboardStats {
    totalInterns: number;
    hoursCompletedCount: number;
    fullyCompletedCount: number;
    nearCompletionCount: number;
    totalHoursRendered: number;
    averageProgress: number;
    totalPendingDocs: number;
    totalHtes: number;
}

export interface OjtDashboardProps {
    scopeName: string;
    programName: string;
    stats: DashboardStats;
    milestones: MilestoneCategory[];
    students: StudentMilestoneItem[];
    finishedInterns: StudentMilestoneItem[];
    hteDistribution: HtePartner[];
    docStats: DocStats;
    scansTrend: TrendPoint[];
    todayAttendance: TodayAttendance;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'OJT Dashboard',
        href: '/supervisor/dashboard',
    },
];

const MILESTONE_COLORS: Record<string, { bg: string; text: string; bar: string; badge: string; border: string }> = {
    completed: {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-300',
        bar: 'bg-emerald-500',
        badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/40',
    },
    near_completion: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-700 dark:text-amber-300',
        bar: 'bg-amber-500',
        badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/40',
    },
    midway: {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-700 dark:text-blue-300',
        bar: 'bg-blue-500',
        badge: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
        border: 'border-blue-500/40',
    },
    in_progress: {
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-700 dark:text-purple-300',
        bar: 'bg-purple-500',
        badge: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400',
        border: 'border-purple-500/40',
    },
    early_stage: {
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-700 dark:text-slate-300',
        bar: 'bg-slate-400 dark:bg-slate-600',
        badge: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400',
        border: 'border-slate-500/40',
    },
};

const ITEMS_PER_PAGE = 10;

export default function OjtDashboard({
    scopeName,
    programName,
    stats,
    milestones,
    students,
    finishedInterns,
    hteDistribution,
    docStats,
    scansTrend,
    todayAttendance,
}: OjtDashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();
    const [search, setSearch] = useState('');
    const [selectedMilestone, setSelectedMilestone] = useState<string>('all');
    const [selectedHte, setSelectedHte] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Dialog state
    const [summaryIntern, setSummaryIntern] = useState<{ id: number; name: string } | null>(null);
    const [docsIntern, setDocsIntern] = useState<{ id: number; name: string } | null>(null);

    // Filter students
    const studentsWithPendingDocs = useMemo(() => {
        return students.filter((s) => s.pending_docs_count > 0);
    }, [students]);

    const handleShowPendingReviews = () => {
        setSelectedMilestone('pending_docs');
        setSearch('');
        setSelectedHte('all');
        setCurrentPage(1);
        const el = document.getElementById('interns-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            // Milestone filter
            if (selectedMilestone === 'pending_docs') {
                if (student.pending_docs_count === 0) return false;
            } else if (selectedMilestone !== 'all' && student.milestone !== selectedMilestone) {
                return false;
            }

            // HTE filter
            if (selectedHte !== 'all') {
                const hteIdNum = Number(selectedHte);
                if (student.hte_id !== hteIdNum) return false;
            }

            // Search query
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchesName = student.name.toLowerCase().includes(q);
                const matchesId = student.id_number?.toLowerCase().includes(q) ?? false;
                const matchesEmail = student.email.toLowerCase().includes(q);
                const matchesHte = student.hte_name.toLowerCase().includes(q);
                return matchesName || matchesId || matchesEmail || matchesHte;
            }

            return true;
        });
    }, [students, selectedMilestone, selectedHte, search]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredStudents, currentPage]);

    // Handle filter reset
    const resetFilters = () => {
        setSearch('');
        setSelectedMilestone('all');
        setSelectedHte('all');
        setCurrentPage(1);
    };

    const handleMilestoneClick = (key: string) => {
        setSelectedMilestone(key === selectedMilestone ? 'all' : key);
        setCurrentPage(1);
    };

    const handleHteClick = (hteName: string) => {
        const found = hteDistribution.find((h) => h.name === hteName);
        if (found && found.hte_id) {
            setSelectedHte(String(found.hte_id));
        } else {
            setSearch(hteName);
        }
        setCurrentPage(1);
    };

    return (
        <>
            <Head title={`OJT Dashboard — ${programName}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6 w-full">
                {/* ── Top Header & Program Welcome ────────────────────────────── */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3.5">
                        <Avatar className="size-14 border-2 border-primary/20 shadow-xs sm:size-16 shrink-0">
                            {auth?.user?.avatar && (
                                <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-base sm:text-lg font-bold text-primary">
                                {auth?.user?.name ? getInitials(auth.user.name) : 'SP'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                                    Internship Program Dashboard
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="border-primary/30 bg-primary/10 text-primary font-semibold shrink-0"
                                >
                                    {programName}
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
                                High-level overview of intern milestones, hours completion, and establishment deployments for{' '}
                                <span className="font-semibold text-foreground">{scopeName}</span>.
                            </p>
                        </div>
                    </div>

                    {/* Navigation shortcuts */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
                            <Link href="/supervisor/interns">
                                <GraduationCap className="size-4 text-primary" />
                                <span>My Interns</span>
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                                    {stats.totalInterns}
                                </Badge>
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
                            <Link href="/supervisor/document-templates">
                                <FileStack className="size-4 text-muted-foreground" />
                                <span>Document Templates</span>
                            </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="gap-1.5 shadow-xs">
                            <Link href="/supervisor/htes">
                                <Building2 className="size-4 text-muted-foreground" />
                                <span>HTEs</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* ── KPI Stat Cards Grid ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-4">
                    <StatCard
                        label="Enrolled Interns"
                        value={stats.totalInterns}
                        icon={Users}
                        variant="primary"
                        description={`Placed across ${stats.totalHtes} Host Training Establishments`}
                        onClick={() => {
                            setSelectedMilestone('all');
                            setCurrentPage(1);
                        }}
                    />

                    <StatCard
                        label="Finished Interns (100%+)"
                        value={stats.hoursCompletedCount}
                        icon={Award}
                        variant="success"
                        badge={
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                {stats.fullyCompletedCount} Fully Cleared
                            </span>
                        }
                        description="Completed all required training hours"
                        onClick={() => {
                            setSelectedMilestone('completed');
                            setCurrentPage(1);
                        }}
                    />

                    <StatCard
                        label="Near Completion"
                        value={stats.nearCompletionCount}
                        icon={TrendingUp}
                        variant="warning"
                        badge={
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                75%–99%
                            </span>
                        }
                        description="Approaching completion; ready for final clearance"
                        onClick={() => {
                            setSelectedMilestone('near_completion');
                            setCurrentPage(1);
                        }}
                    />

                    <StatCard
                        label="Pending Documents"
                        value={stats.totalPendingDocs}
                        icon={FileCheck2}
                        variant="info"
                        badge={
                            stats.totalPendingDocs > 0 ? (
                                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                                    Action Required
                                </span>
                            ) : undefined
                        }
                        description="Intern requirement submissions awaiting review"
                        onClick={handleShowPendingReviews}
                    />

                    <StatCard
                        label="Program Progress"
                        displayValue={`${stats.averageProgress}%`}
                        icon={Clock}
                        variant="purple"
                        badge={
                            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                                Avg Rendered
                            </span>
                        }
                        description={`${stats.totalHoursRendered.toLocaleString()} hrs rendered in program`}
                    />
                </div>

                {/* ── Milestone Progress Overview & Visual Distribution ──────── */}
                <Card className="overflow-hidden shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Internship Milestone Progression
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Categorized distribution of program interns towards completing their required hours.
                                </CardDescription>
                            </div>

                            {selectedMilestone !== 'all' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedMilestone('all')}
                                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                    <span>Reset milestone filter</span>
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                        {/* Segmented Proportional Progress Bar */}
                        <div className="space-y-1.5">
                            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-muted/70 p-0.5">
                                {stats.totalInterns > 0 ? (
                                    milestones.map((m) => {
                                        const pct = (m.count / stats.totalInterns) * 100;
                                        if (pct <= 0) return null;
                                        const colors = MILESTONE_COLORS[m.key] || MILESTONE_COLORS.early_stage;

                                        return (
                                            <div
                                                key={m.key}
                                                style={{ width: `${pct}%` }}
                                                className={cn(
                                                    'h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full',
                                                    colors.bar,
                                                    selectedMilestone === m.key
                                                        ? 'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background'
                                                        : 'hover:opacity-90',
                                                )}
                                                title={`${m.label}: ${m.count} interns (${Math.round(pct)}%)`}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="h-full w-full bg-muted rounded-full" />
                                )}
                            </div>

                            {/* Scale Indicators */}
                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground select-none px-1">
                                <span>0% (Start)</span>
                                <span>25%</span>
                                <span>50% (Midway)</span>
                                <span>75%</span>
                                <span>100% (Completed)</span>
                            </div>
                        </div>

                        {/* Interactive Milestone Cards */}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                            {milestones.map((milestone) => {
                                const colors = MILESTONE_COLORS[milestone.key] || MILESTONE_COLORS.early_stage;
                                const isSelected = selectedMilestone === milestone.key;
                                const pct =
                                    stats.totalInterns > 0
                                        ? Math.round((milestone.count / stats.totalInterns) * 100)
                                        : 0;

                                return (
                                    <button
                                        key={milestone.key}
                                        type="button"
                                        onClick={() => handleMilestoneClick(milestone.key)}
                                        className={cn(
                                            'group flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200',
                                            isSelected
                                                ? cn(colors.bg, colors.border, 'ring-2 ring-primary/40 shadow-xs')
                                                : 'border-border/60 bg-card hover:border-border hover:bg-muted/40',
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className={cn('text-xs font-semibold', colors.text)}>
                                                    {milestone.label}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'size-2 rounded-full',
                                                        colors.bar,
                                                        isSelected && 'animate-pulse',
                                                    )}
                                                />
                                            </div>
                                            <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                                {milestone.description}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-2">
                                            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
                                                <CountUp value={milestone.count} />
                                            </span>
                                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                                                {pct}% of interns
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Partner Deployments & Compliance Momentum ────────────────── */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* HTE Partner Establishments */}
                    <Card className="shadow-xs xl:col-span-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                        <Building2 className="size-4.5 text-primary" />
                                        <span>Host Training Establishments</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Intern deployment across approved industry partners and organizations.
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
                                    <Link href="/supervisor/htes">
                                        <span>View Directory</span>
                                        <ArrowRight className="size-3" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {hteDistribution.length > 0 ? (
                                <RankedList
                                    items={hteDistribution.map((h) => ({ name: h.name, count: h.count }))}
                                    mounted={true}
                                    onItemClick={handleHteClick}
                                    itemLabel="intern"
                                    emptyMessage="No partner establishments assigned yet."
                                    defaultShowAll={false}
                                />
                            ) : (
                                <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                                    <Building2 className="mb-2 size-8 text-muted-foreground/50" />
                                    <p>No interns placed in Host Training Establishments yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Requirements Compliance & Daily Attendance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 xl:col-span-1">
                        {/* Document Clearance Summary */}
                        <Card className="shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <FileText className="size-4.5 text-primary" />
                                    <span>Document Clearance</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Clearance status across required training documents.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 dark:bg-emerald-500/15">
                                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                            Approved Docs
                                        </span>
                                        <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                            <CountUp value={docStats.approved} />
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleShowPendingReviews}
                                        className={cn(
                                            'group flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all',
                                            docStats.pending_review > 0
                                                ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 hover:bg-amber-500/20 cursor-pointer shadow-xs active:scale-[0.99] dark:bg-amber-500/15'
                                                : 'border-muted bg-muted/30 cursor-default opacity-80',
                                        )}
                                        title={docStats.pending_review > 0 ? 'Click to view interns with pending documents' : undefined}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                                Pending Review
                                            </span>
                                            {docStats.pending_review > 0 && (
                                                <ArrowRight className="size-3 text-amber-700 opacity-0 transition-opacity group-hover:opacity-100 dark:text-amber-300" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                                            <CountUp value={docStats.pending_review} />
                                        </p>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs">
                                    <span className="text-muted-foreground">Total Uploaded Documents</span>
                                    <span className="font-semibold text-foreground tabular-nums">
                                        {docStats.total_submitted}
                                    </span>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        'w-full gap-1.5 text-xs font-medium cursor-pointer transition-all shadow-xs',
                                        docStats.pending_review > 0
                                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 hover:text-amber-900 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 active:scale-[0.99]'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                    onClick={handleShowPendingReviews}
                                >
                                    <FileCheck2 className="size-3.5" />
                                    <span>
                                        {docStats.pending_review > 0
                                            ? `Show ${docStats.pending_review} Pending ${docStats.pending_review === 1 ? 'Review' : 'Reviews'}`
                                            : 'Filter Directory by Pending Reviews'}
                                    </span>
                                    <ArrowRight className="ml-auto size-3 opacity-60" />
                                </Button>

                                {studentsWithPendingDocs.length > 0 && (
                                    <div className="space-y-1.5 border-t border-border/40 pt-2.5">
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span className="font-medium">Submissions awaiting review:</span>
                                            <span>{studentsWithPendingDocs.length} {studentsWithPendingDocs.length === 1 ? 'intern' : 'interns'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin">
                                            {studentsWithPendingDocs.map((student) => (
                                                <div
                                                    key={student.intern_user_id}
                                                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/90 p-2 text-xs shadow-2xs"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-semibold text-foreground">{student.name}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{student.hte_name} • {student.pending_docs_count} pending</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-7 px-2.5 text-[11px] font-semibold text-primary gap-1 shrink-0 cursor-pointer hover:bg-primary/10 active:scale-[0.98]"
                                                        onClick={() => setDocsIntern({ id: student.intern_user_id, name: student.name })}
                                                        title={`Review documents for ${student.name}`}
                                                    >
                                                        <span>Review</span>
                                                        <ArrowRight className="size-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Program Activity Trend */}
                        <Card className="shadow-xs">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <CalendarCheck className="size-4.5 text-primary" />
                                    <span>Program Attendance Trend</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Daily scan check-ins recorded across all HTEs (last 14 days).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <TrendBarChart data={scansTrend} mounted={true} barColor="bg-primary/80" />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Interns Milestone Directory & Inspection Table ─────────── */}
                <Card id="interns-section" className="overflow-hidden shadow-xs">
                    <CardHeader className="border-b border-border/40 pb-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <GraduationCap className="size-4.5 text-primary" />
                                <span>Program Interns & Milestone Directory</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Showing {filteredStudents.length} of {students.length} interns matching active criteria.
                            </CardDescription>
                        </div>

                        {/* Search, Filters, and Full Roster Toolbar */}
                        <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {/* Search and Filters */}
                            <div className="flex flex-1 flex-wrap items-center gap-2.5">
                                {/* Search box */}
                                <div className="relative w-full sm:w-72 lg:w-80">
                                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search intern name, ID number, email, or HTE..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 pl-8 pr-8 text-xs"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>

                                {/* HTE Partner Filter */}
                                <div className="w-full sm:w-56">
                                    <Select
                                        value={selectedHte}
                                        onValueChange={(val) => {
                                            setSelectedHte(val);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="All Partner HTEs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Partner HTEs</SelectItem>
                                            {hteDistribution.map((hte) => (
                                                <SelectItem
                                                    key={hte.hte_id ?? `hte-${hte.name}`}
                                                    value={String(hte.hte_id ?? 'all')}
                                                >
                                                    {hte.name} ({hte.count})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Reset button */}
                                {(search || selectedMilestone !== 'all' || selectedHte !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                        <span>Clear Filters</span>
                                    </Button>
                                )}
                            </div>

                            {/* View Full Roster button */}
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="gap-1.5 shrink-0 text-xs shadow-xs"
                            >
                                <Link href="/supervisor/interns">
                                    <span>Open Full Roster Page</span>
                                    <ExternalLink className="size-3" />
                                </Link>
                            </Button>
                        </div>

                        {/* Milestone Pill Filter Tabs */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('all');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'all'
                                        ? 'bg-foreground text-background font-semibold shadow-xs'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <span>All Interns</span>
                                <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-bold">
                                    {students.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('completed');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'completed'
                                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                        : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400',
                                )}
                            >
                                <Award className="size-3.5" />
                                <span>100% Completed</span>
                                <span className="rounded-full bg-emerald-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-emerald-100/20">
                                    {stats.hoursCompletedCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('near_completion');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'near_completion'
                                        ? 'bg-amber-600 text-white font-semibold shadow-xs'
                                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400',
                                )}
                            >
                                <TrendingUp className="size-3.5" />
                                <span>Near Completion (75–99%)</span>
                                <span className="rounded-full bg-amber-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-amber-100/20">
                                    {stats.nearCompletionCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('midway');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'midway'
                                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                        : 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400',
                                )}
                            >
                                <span>Midway (50–74%)</span>
                                <span className="rounded-full bg-blue-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-blue-100/20">
                                    {milestones.find((m) => m.key === 'midway')?.count ?? 0}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('in_progress');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'in_progress'
                                        ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                        : 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-400',
                                )}
                            >
                                <span>Steady (25–49%)</span>
                                <span className="rounded-full bg-purple-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-purple-100/20">
                                    {milestones.find((m) => m.key === 'in_progress')?.count ?? 0}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('early_stage');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'early_stage'
                                        ? 'bg-slate-700 text-white font-semibold shadow-xs dark:bg-slate-300 dark:text-slate-900'
                                        : 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/20 dark:text-slate-400',
                                )}
                            >
                                <span>Early Stage (&lt;25%)</span>
                                <span className="rounded-full bg-slate-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-slate-100/20">
                                    {milestones.find((m) => m.key === 'early_stage')?.count ?? 0}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMilestone('pending_docs');
                                    setCurrentPage(1);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                                    selectedMilestone === 'pending_docs'
                                        ? 'bg-amber-600 text-white font-semibold shadow-xs'
                                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400',
                                )}
                            >
                                <FileCheck2 className="size-3.5" />
                                <span>Needs Doc Review</span>
                                <span className="rounded-full bg-amber-950/20 px-1.5 py-0.2 text-[10px] font-bold dark:bg-amber-100/20">
                                    {stats.totalPendingDocs}
                                </span>
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {paginatedStudents.length > 0 ? (
                            <Table className="min-w-[880px]">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[280px] font-semibold">Intern</TableHead>
                                        <TableHead className="text-center font-semibold">Assigned HTE</TableHead>
                                        <TableHead className="text-center font-semibold min-w-[190px]">Training Hours & Progress</TableHead>
                                        <TableHead className="text-center font-semibold">Milestone Stage</TableHead>
                                        <TableHead className="text-center font-semibold">Document Clearance</TableHead>
                                        <TableHead className="text-center font-semibold">Quick Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedStudents.map((intern) => {
                                        const colors =
                                            MILESTONE_COLORS[intern.milestone] || MILESTONE_COLORS.early_stage;

                                        return (
                                            <TableRow key={intern.intern_user_id} className="hover:bg-muted/40">
                                                {/* Student Identity */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="size-9 border border-border/60">
                                                            {intern.profile_photo_url && (
                                                                <AvatarImage
                                                                    src={intern.profile_photo_url}
                                                                    alt={intern.name}
                                                                />
                                                            )}
                                                            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                                                {getInitials(intern.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="truncate font-semibold text-foreground text-xs sm:text-sm">
                                                                    {intern.name}
                                                                </span>
                                                                {intern.is_completed && (
                                                                    <span title="Fully Cleared: Hours completed & all required documents approved">
                                                                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                                <span>{intern.id_number ?? 'No ID'}</span>
                                                                <span>•</span>
                                                                <span className="truncate">{intern.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Assigned HTE */}
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5 text-xs text-foreground">
                                                        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                                                        <span className="truncate font-medium max-w-[180px]" title={intern.hte_name}>
                                                            {intern.hte_name}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Hours & Progress Bar */}
                                                <TableCell className="text-center">
                                                    <div className="mx-auto max-w-[190px] space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="font-semibold tabular-nums text-foreground">
                                                                {intern.total_hours.toFixed(1)} / {intern.required_hours} hrs
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'font-bold tabular-nums text-[11px]',
                                                                    intern.hours_completed
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : 'text-muted-foreground',
                                                                )}
                                                            >
                                                                {intern.progress_percent}%
                                                            </span>
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full transition-all duration-500',
                                                                    colors.bar,
                                                                )}
                                                                style={{ width: `${Math.min(100, intern.progress_percent)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Milestone Badge */}
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn('text-[11px] font-semibold whitespace-nowrap', colors.badge)}
                                                        >
                                                            {intern.milestone === 'completed' && <Award className="mr-1 size-3" />}
                                                            {intern.milestone_label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                {/* Document Clearance Badge */}
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                                        {intern.docs_completed ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="size-3.5" />
                                                                <span>All Docs Approved ({intern.approved_docs_count}/{intern.total_required_docs_count})</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {intern.approved_docs_count} of {intern.total_required_docs_count} approved
                                                            </span>
                                                        )}

                                                        {intern.pending_docs_count > 0 && (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400 whitespace-nowrap"
                                                            >
                                                                {intern.pending_docs_count} awaiting review
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1 px-2.5 text-xs shadow-xs"
                                                            onClick={() =>
                                                                setSummaryIntern({
                                                                    id: intern.intern_user_id,
                                                                    name: intern.name,
                                                                })
                                                            }
                                                            title="View comprehensive completion summary"
                                                        >
                                                            <Eye className="size-3.5 text-primary" />
                                                            <span>Summary</span>
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1 px-2.5 text-xs shadow-xs"
                                                            onClick={() =>
                                                                setDocsIntern({
                                                                    id: intern.intern_user_id,
                                                                    name: intern.name,
                                                                })
                                                            }
                                                            title="Inspect and review student requirements"
                                                        >
                                                            <FileText className="size-3.5 text-muted-foreground" />
                                                            <span>Docs</span>
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                            title="Open in My Interns roster"
                                                        >
                                                            <Link href={`/supervisor/interns?highlight=${intern.intern_user_id}`}>
                                                                <ExternalLink className="size-3.5" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <GraduationCap className="mb-2 size-10 text-muted-foreground/40" />
                                <h3 className="text-sm font-semibold text-foreground">No interns match your filters</h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Try adjusting your search query, milestone filter, or partner establishment selection.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="mt-4 gap-1.5 text-xs"
                                >
                                    <X className="size-3.5" />
                                    <span>Reset All Filters</span>
                                </Button>
                            </div>
                        )}
                    </CardContent>

                    {/* Pagination Footer */}
                    {filteredStudents.length > ITEMS_PER_PAGE && (
                        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                                {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of{' '}
                                {filteredStudents.length} interns
                            </span>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="h-8 text-xs"
                                >
                                    Previous
                                </Button>
                                <span className="px-2 text-xs font-medium text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>

            {/* ── Dialog Modals ────────────────────────────────────────────── */}
            {summaryIntern && (
                <CompletionSummaryDialog
                    key={`summary-${summaryIntern.id}`}
                    defaultOpen={true}
                    onOpenChange={(open) => {
                        if (!open) setSummaryIntern(null);
                    }}
                    internUserId={summaryIntern.id}
                    internName={summaryIntern.name}
                />
            )}

            {docsIntern && (
                <InternDocumentsDialog
                    internUserId={docsIntern.id}
                    internName={docsIntern.name}
                    defaultOpen={true}
                    onOpenChange={(open) => {
                        if (!open) setDocsIntern(null);
                    }}
                />
            )}
        </>
    );
}

OjtDashboard.layout = {
    breadcrumbs: [
        {
            title: 'OJT Dashboard',
            href: '/supervisor/dashboard',
        },
    ],
};
