import { Head, router } from '@inertiajs/react';
import {
    Award,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileCheck2,
    GraduationCap,
    SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
    Building2,
    Clock,
    GraduationCap,
    LayoutGrid,
    Phone,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CompletionSummaryDialog } from '@/components/completion-summary-dialog';
import { InternDocumentsDialog } from '@/components/intern-documents-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

interface Filters {
    search: string;
    hte_id: number | null;
    completion_status?: 'all' | 'completed' | 'in_progress';
    per_page: number;
}

interface MyStudentsProps {
    students: Paginated<StudentRow>;
    studentCount: number;
    completedCount?: number;
    inProgressCount?: number;
    scopeName?: string;
    hteOptions: HteOption[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

const ALL_HTES = 'all';
const ALL_STATUSES = 'all';

function formatLongDuration(hours: number): string {
    if (hours <= 0) {
        return '0 hrs';
    }
    return `${hours.toFixed(1)} hrs`;
}

export default function MyStudents({
    students,
    studentCount,
    completedCount = 0,
    inProgressCount = 0,
    scopeName,
    hteOptions,
    filters,
}: MyStudentsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPageDraft, setPerPageDraft] = useState(String(filters.per_page));

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    // Base params shared by every navigation action — anything that
    // changes what rows match (search/hte_id/completion_status) resets back to page 1 by
    // simply omitting the page param.
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const baseParams = () => ({
        search: filters.search || undefined,
        hte_id: filters.hte_id ? String(filters.hte_id) : undefined,
        completion_status: filters.completion_status && filters.completion_status !== 'all' ? filters.completion_status : undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined, page: undefined });
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
        });
    };

    const commitPerPage = () => {
        const parsed = parseInt(perPageDraft, 10);
        const clamped = Number.isNaN(parsed)
            ? filters.per_page
            : Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, parsed));

        setPerPageDraft(String(clamped));

        if (clamped === filters.per_page) {
            return;
        }

        visit({ ...baseParams(), per_page: String(clamped) });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
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
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="size-5" />
                            </span>
                            My Students
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentCount} intern{studentCount === 1 ? '' : 's'} in {scopeName ?? 'your program'}, across every HTE.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
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
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* HTE filter dropdown */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.hte_id ? String(filters.hte_id) : ALL_HTES}
                                onValueChange={changeHte}
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All HTEs" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_HTES}>All HTEs</SelectItem>
                                    {hteOptions.map((hte) => (
                                        <SelectItem key={hte.hte_id} value={String(hte.hte_id)}>
                                            {hte.hte_name}
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

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="completion-filter"
                                    className="text-xs text-muted-foreground"
                                >
                                    Completion Status
                                </Label>
                                <Select
                                    value={filters.completion_status || ALL_STATUSES}
                                    onValueChange={changeCompletionStatus}
                                >
                                    <SelectTrigger
                                        id="completion-filter"
                                        className="w-full sm:w-48"
                                    >
                                        <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_STATUSES}>
                                            All Students
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            Completed Requirements ({completedCount})
                                        </SelectItem>
                                        <SelectItem value="in_progress">
                                            In Progress ({inProgressCount})
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            </div>
                        </form>

                        {students.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No interns match{' '}
                                {filters.search !== '' || filters.hte_id || (filters.completion_status && filters.completion_status !== 'all')
                                    ? 'these filters.'
                                    : 'your program yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2.5 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="py-2.5 pr-4 font-medium">
                                                ID Number
                                            </th>
                                            <th className="py-2.5 pr-4 font-medium">
                                                Assigned HTE
                                            </th>
                                            <th className="py-2.5 pr-4 font-medium">
                                                Hours Rendered
                                            </th>
                                            <th className="py-2.5 pr-4 font-medium">
                                                Documents
                                            </th>
                                            <th className="py-2.5 pr-4 font-medium">
                                                Requirement Status
                                            </th>
                                            <th className="py-2.5 font-medium text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.data.map((student) => (
                                            <tr
                                                key={student.intern_user_id}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-3 pr-4">
                                                    <p className="font-medium whitespace-nowrap">
                                                        {student.name}
                                                    </p>
                                                    <p
                                                        className="max-w-[160px] truncate text-xs text-muted-foreground"
                                                        title={student.email}
                                                    >
                                                        {student.email}
                                                    </p>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {student.id_number ?? '—'}
                                                </td>
                                                <td
                                                    className="max-w-[140px] truncate py-3 pr-4"
                                                    title={student.hte_name}
                                                >
                                                    {student.hte_name}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 min-w-[110px]">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-medium">{formatHours(student.total_hours)}</span>
                                                            <span className="text-muted-foreground">/ {student.required_hours}h</span>
                                                        </div>
                                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    student.hours_completed ? 'bg-emerald-500' : 'bg-primary'
                                                                }`}
                                                                style={{ width: `${Math.min(100, student.progress_percent)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs gap-1 ${
                                                            student.docs_completed
                                                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300'
                                                                : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        <FileCheck2 className="size-3" />
                                                        {student.approved_docs_count} / {student.total_required_docs_count} Approved
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    {student.is_completed ? (
                                                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs gap-1">
                                                            <CheckCircle2 className="size-3.5" />
                                                            Completed
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs text-muted-foreground font-normal"
                                                        >
                                                            {student.hours_completed
                                                                ? 'Hours Met • Docs Pending'
                                                                : `${Math.round(student.progress_percent)}% Rendered`}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
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
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Grid view — desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {students.data.map((student) => (
                                    <Card key={student.intern_user_id} className="flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {student.name}
                                                    </CardTitle>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={student.email}>
                                                        {student.email}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="shrink-0 text-xs font-mono">
                                                    {student.id_number ?? 'No ID'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-2.5 text-xs text-muted-foreground pt-0">
                                            {student.contact_number && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="size-3.5 shrink-0" />
                                                    <span>{student.contact_number}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Building2 className="size-3.5 shrink-0" />
                                                <span className="truncate font-medium text-foreground">{student.hte_name}</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="size-3.5" /> Rendered:
                                                </span>
                                                <span className="font-semibold text-foreground text-xs">
                                                    {formatLongDuration(student.total_hours)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Mobile list view */}
                        <div className="sm:hidden flex flex-col gap-3">
                            {students.data.map((student) => (
                                <Card key={student.intern_user_id}>
                                    <CardContent className="p-4 flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs shrink-0 font-mono">
                                                {student.id_number ?? 'No ID'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                                            <span className="truncate max-w-[160px] font-medium text-foreground">{student.hte_name}</span>
                                            <span className="font-semibold text-foreground">{formatLongDuration(student.total_hours)}</span>
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