import { Head, router } from '@inertiajs/react';
import {
    Award,
    Building2,
    CheckCircle2,
    Clock,
    FileCheck2,
    GraduationCap,
    LayoutGrid,
    Phone,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

import { CompletionSummaryDialog } from '@/components/completion-summary-dialog';
import { InternDocumentsDialog } from '@/components/intern-documents-dialog';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { dashboard } from '@/routes';

interface StudentRow {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    hte_name: string;
    total_hours: number;
    required_hours: number;
    progress_percent: number;
    hours_completed: boolean;
    approved_docs_count: number;
    total_required_docs_count: number;
    docs_completed: boolean;
    is_completed: boolean;
}

interface HteOption {
    hte_id: number;
    hte_name: string;
}

interface StudentsProps {
    students: Paginated<StudentRow>;
    hteOptions: HteOption[];
    filters: {
        search: string;
        hte_id?: number | null;
        completion_status?: string;
        per_page?: number;
    };
    completedCount: number;
    inProgressCount: number;
}

type ViewMode = 'table' | 'grid';

const ALL_HTES = 'all';
const ALL_STATUSES = 'all';

function formatHours(hours: number): string {
    const whole = Math.floor(hours);
    const frac = Math.round((hours - whole) * 60);

    if (frac === 0) {
        return `${whole}h`;
    }

    return `${whole}h ${frac}m`;
}

export default function MyStudents({
    students,
    hteOptions,
    filters,
    completedCount,
    inProgressCount,
}: StudentsProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [view, setView] = useState<ViewMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('supervisor_students_view');
            if (saved === 'table' || saved === 'grid') return saved;
        }
        return 'table';
    });
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    useEffect(() => {
        localStorage.setItem('supervisor_students_view', view);
    }, [view]);

    const baseParams = () => ({
        search: search || undefined,
        hte_id: filters.hte_id ? String(filters.hte_id) : undefined,
        completion_status:
            filters.completion_status && filters.completion_status !== 'all'
                ? filters.completion_status
                : undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (params: Record<string, string | undefined>, replace = true) => {
        router.get('/supervisor/interns', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    // Automatically trigger search as user types
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (debouncedSearch !== (filters.search || '')) {
            visit({
                ...baseParams(),
                search: debouncedSearch || undefined,
                page: undefined,
            });
        }
    }, [debouncedSearch]);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined, page: undefined });
    };

    const changeHte = (value: string) => {
        visit({
            ...baseParams(),
            hte_id: value === ALL_HTES ? undefined : value,
            page: undefined,
        });
    };

    const changeCompletionStatus = (value: string) => {
        visit({
            ...baseParams(),
            completion_status: value === ALL_STATUSES ? undefined : value,
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) }, false);
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });
    };

    return (
        <>
            <Head title="My Students" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="size-5" />
                            </span>
                            Program Interns
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search students…"
                                className="h-9 w-48 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile search toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        {/* HTE filter dropdown */}
                        <div className="hidden sm:block">
                            <Select
                                value={
                                    filters.hte_id
                                        ? String(filters.hte_id)
                                        : ALL_HTES
                                }
                                onValueChange={changeHte}
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All HTEs" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_HTES}>
                                        All HTEs
                                    </SelectItem>
                                    {hteOptions.map((hte) => (
                                        <SelectItem
                                            key={hte.hte_id}
                                            value={String(hte.hte_id)}
                                        >
                                            {hte.hte_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Completion Status filter */}
                        <div className="hidden sm:block">
                            <Select
                                value={
                                    filters.completion_status || ALL_STATUSES
                                }
                                onValueChange={changeCompletionStatus}
                            >
                                <SelectTrigger className="h-9 w-48">
                                    <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        All Students
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        Completed Requirements ({completedCount}
                                        )
                                    </SelectItem>
                                    <SelectItem value="in_progress">
                                        In Progress ({inProgressCount})
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View Switcher */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger value="table">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Mobile search input */}
                {mobileSearchOpen && (
                    <form onSubmit={applySearch} className="relative sm:hidden">
                        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search students…"
                            className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                        />
                    </form>
                )}

                {/* Content Section */}
                {students.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            No interns match{' '}
                            {filters.search !== '' ||
                            filters.hte_id ||
                            (filters.completion_status &&
                                filters.completion_status !== 'all')
                                ? 'these filters.'
                                : 'your program yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table view */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">Name</TableHead>
                                                    <TableHead className="px-4 text-center">ID Number</TableHead>
                                                    <TableHead className="px-4">Assigned HTE</TableHead>
                                                    <TableHead className="px-4">Hours Rendered</TableHead>
                                                    <TableHead className="px-4 text-center">Documents</TableHead>
                                                    <TableHead className="px-4 text-center">Requirement Status</TableHead>
                                                    <TableHead className="px-6 text-center">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {students.data.map((student) => (
                                                    <TableRow key={student.intern_user_id} className="hover:bg-muted/40 transition-colors">
                                                        <TableCell className="px-6 py-3">
                                                            <p className="font-medium whitespace-nowrap text-foreground">{student.name}</p>
                                                            <p className="max-w-[180px] truncate text-xs text-muted-foreground" title={student.email}>
                                                                {student.email}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            <Badge variant="outline" className="font-mono text-xs">
                                                                {student.id_number ?? '—'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-[160px] truncate px-4 py-3" title={student.hte_name}>
                                                            <span className="font-medium text-foreground">{student.hte_name}</span>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1 min-w-[110px]">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="font-medium text-foreground">{formatHours(student.total_hours)}</span>
                                                                    <span className="text-muted-foreground">/ {student.required_hours}h</span>
                                                                </div>
                                                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                                            student.hours_completed ? 'bg-emerald-500' : 'bg-primary'
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, student.progress_percent)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            <StatusBadge
                                                                status={student.docs_completed ? 'approved' : student.approved_docs_count > 0 ? 'pending_review' : 'not_submitted'}
                                                                label={`${student.approved_docs_count}/${student.total_required_docs_count} Cleared`}
                                                                className="text-xs"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 whitespace-nowrap text-center">
                                                            <StatusBadge
                                                                status={student.is_completed ? 'approved' : student.hours_completed ? 'pending_review' : 'active'}
                                                                label={student.is_completed ? 'Completed' : student.hours_completed ? 'Docs Pending' : `${Math.round(student.progress_percent)}% Rendered`}
                                                                className="text-xs"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 py-3 whitespace-nowrap text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <CompletionSummaryDialog
                                                                    internUserId={student.intern_user_id}
                                                                    internName={student.name}
                                                                    isCompleted={student.is_completed}
                                                                />
                                                                <InternDocumentsDialog
                                                                    internUserId={student.intern_user_id}
                                                                    internName={student.name}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view */}
                        {view === 'grid' && (
                            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                                {students.data.map((student) => (
                                    <Card key={student.intern_user_id} className="flex flex-col justify-between hover:border-primary/30 transition-all duration-200 shadow-2xs">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base font-semibold truncate text-foreground">
                                                        {student.name}
                                                    </CardTitle>
                                                    <p
                                                        className="mt-0.5 truncate text-xs text-muted-foreground"
                                                        title={student.email}
                                                    >
                                                        {student.email}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0 font-mono text-xs"
                                                >
                                                    {student.id_number ??
                                                        'No ID'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-2.5 pt-0 text-xs text-muted-foreground">
                                            {student.contact_number && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                                                    <span>{student.contact_number}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
                                                <span className="truncate font-medium text-foreground">{student.hte_name}</span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between border-t pt-2.5">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="size-3.5 text-primary" /> Rendered:
                                                </span>
                                                <span className="font-semibold text-foreground text-xs">
                                                    {formatHours(student.total_hours)} / {student.required_hours}h ({Math.round(student.progress_percent)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        student.hours_completed ? 'bg-emerald-500' : 'bg-primary'
                                                    }`}
                                                    style={{ width: `${Math.min(100, student.progress_percent)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <StatusBadge
                                                    status={student.docs_completed ? 'approved' : student.approved_docs_count > 0 ? 'pending_review' : 'not_submitted'}
                                                    label={`${student.approved_docs_count}/${student.total_required_docs_count} Docs`}
                                                    className="text-[11px] px-2 py-0.5"
                                                />
                                                <StatusBadge
                                                    status={student.is_completed ? 'approved' : student.hours_completed ? 'pending_review' : 'active'}
                                                    label={student.is_completed ? 'Completed' : student.hours_completed ? 'Docs Pending' : `${Math.round(student.progress_percent)}%`}
                                                    className="text-[11px] px-2 py-0.5"
                                                />
                                            </div>
                                        </CardContent>
                                        <CardFooter className="border-t px-4 py-2.5 flex items-center justify-end gap-2 bg-muted/20">
                                            <CompletionSummaryDialog
                                                internUserId={student.intern_user_id}
                                                internName={student.name}
                                                isCompleted={student.is_completed}
                                            />
                                            <InternDocumentsDialog
                                                internUserId={student.intern_user_id}
                                                internName={student.name}
                                            />
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Mobile list view */}
                        <div className="flex flex-col gap-3 sm:hidden">
                            {students.data.map((student) => (
                                <Card key={student.intern_user_id} className="shadow-2xs">
                                    <CardContent className="p-4 flex flex-col gap-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {student.name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {student.email}
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="shrink-0 font-mono text-xs"
                                            >
                                                {student.id_number ?? 'No ID'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                                            <span className="truncate max-w-[160px] font-medium text-foreground">{student.hte_name}</span>
                                            <span className="font-semibold text-foreground">{formatHours(student.total_hours)} / {student.required_hours}h</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <StatusBadge
                                                status={student.docs_completed ? 'approved' : student.approved_docs_count > 0 ? 'pending_review' : 'not_submitted'}
                                                label={`${student.approved_docs_count}/${student.total_required_docs_count} Docs`}
                                                className="text-[11px] px-2 py-0.5"
                                            />
                                            <StatusBadge
                                                status={student.is_completed ? 'approved' : student.hours_completed ? 'pending_review' : 'active'}
                                                label={student.is_completed ? 'Completed' : student.hours_completed ? 'Docs Pending' : `${Math.round(student.progress_percent)}%`}
                                                className="text-[11px] px-2 py-0.5"
                                            />
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t">
                                            <CompletionSummaryDialog
                                                internUserId={student.intern_user_id}
                                                internName={student.name}
                                                isCompleted={student.is_completed}
                                            />
                                            <InternDocumentsDialog
                                                internUserId={student.intern_user_id}
                                                internName={student.name}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <NumberedPagination
                            meta={students}
                            itemLabel="student"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="students-per-page"
                        />
                    </>
                )}
            </div>
        </>
    );
}

MyStudents.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Students', href: '/supervisor/interns' },
    ],
};
