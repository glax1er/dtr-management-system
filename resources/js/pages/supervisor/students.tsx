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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CompletionSummaryDialog } from '@/components/completion-summary-dialog';
import { InternDocumentsDialog } from '@/components/intern-documents-dialog';

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

interface PaginatedStudents {
    data: StudentRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
    students: PaginatedStudents;
    studentCount: number;
    completedCount?: number;
    inProgressCount?: number;
    scopeName?: string;
    hteOptions: HteOption[];
    filters: Filters;
}

// Radix's Select doesn't allow an item with an empty-string value, so
// "every HTE" gets its own sentinel that we translate back to
// undefined (i.e. no hte_id filter) before it hits the URL.
const ALL_HTES = 'all';
const ALL_STATUSES = 'all';

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;

/** 8.5 → "8 hours 30 minutes" */
function formatHours(hours: number): string {
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
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
    };

    const changeHte = (value: string) => {
        visit({
            ...baseParams(),
            hte_id: value === ALL_HTES ? undefined : value,
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
        if (page < 1 || page > students.last_page) {
            return;
        }

        visit({ ...baseParams(), page: String(page) });
    };

    return (
        <>
            <Head title="My Students" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl flex items-center gap-2">
                            <GraduationCap className="size-6 text-primary" />
                            My Students
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {`${studentCount} intern${studentCount === 1 ? '' : 's'} in the ${scopeName ?? 'selected'} program, across every HTE.`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 gap-1.5 py-1 px-2.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold">{completedCount}</span> Completed Requirements
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400 gap-1.5 py-1 px-2.5">
                            <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold">{inProgressCount}</span> In Progress
                        </Badge>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Assigned Interns &amp; Requirement Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <form
                            onSubmit={applySearch}
                            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="search"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Search by name
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="search"
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="w-full sm:w-52"
                                        />
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            size="sm"
                                        >
                                            Search
                                        </Button>
                                        {filters.search !== '' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSearch}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="hte-filter"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Assigned HTE
                                    </Label>
                                    <Select
                                        value={
                                            filters.hte_id
                                                ? String(filters.hte_id)
                                                : ALL_HTES
                                        }
                                        onValueChange={changeHte}
                                    >
                                        <SelectTrigger
                                            id="hte-filter"
                                            className="w-full sm:w-48"
                                        >
                                            <SelectValue />
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
                                <table className="w-full text-sm">
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
                                                </td>
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

                        {students.total > 0 && (
                            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span>
                                        Showing {students.from}–{students.to} of{' '}
                                        {students.total} intern
                                        {students.total === 1 ? '' : 's'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Label
                                            htmlFor="per-page"
                                            className="text-xs whitespace-nowrap"
                                        >
                                            Rows per page
                                        </Label>
                                        <Input
                                            id="per-page"
                                            type="number"
                                            inputMode="numeric"
                                            min={MIN_PER_PAGE}
                                            max={MAX_PER_PAGE}
                                            value={perPageDraft}
                                            onChange={(e) =>
                                                setPerPageDraft(e.target.value)
                                            }
                                            onBlur={commitPerPage}
                                            onKeyDown={(
                                                e: KeyboardEvent<HTMLInputElement>,
                                            ) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitPerPage();
                                                }
                                            }}
                                            className="h-8 w-[4.5rem]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={students.current_page <= 1}
                                        onClick={() =>
                                            goToPage(students.current_page - 1)
                                        }
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        Previous
                                    </Button>
                                    <span className="min-w-24 text-center text-sm text-muted-foreground">
                                        Page {students.current_page} of{' '}
                                        {students.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            students.current_page >=
                                            students.last_page
                                        }
                                        onClick={() =>
                                            goToPage(students.current_page + 1)
                                        }
                                    >
                                        Next
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

MyStudents.layout = {
    breadcrumbs: [{ title: 'My Students', href: '/supervisor/interns' }],
};
