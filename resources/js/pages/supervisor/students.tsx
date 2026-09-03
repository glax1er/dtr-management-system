import { Head, router } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Clock,
    FileCheck2,
    GraduationCap,
    LayoutGrid,
    Phone,
    Search,
    SlidersHorizontal,
    Sparkles,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { CompletionSummaryDialog } from '@/components/completion-summary-dialog';
import { InternDocumentsDialog } from '@/components/intern-documents-dialog';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
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
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    // Track the filter value search was last synced from, so browser
    // back/forward navigation resets the local draft during render
    // instead of via a post-commit effect.
    const [syncedSearch, setSyncedSearch] = useState(filters.search || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const docInternId =
        typeof window !== 'undefined'
            ? Number(
                  new URLSearchParams(window.location.search).get('doc_intern'),
              ) || null
            : null;
    const highlightDoc =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get(
                  'highlight_doc',
              ) || null
            : null;
    const openSummary =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get(
                  'open_summary',
              ) === '1'
            : false;

    useEffect(() => {
        if (!docInternId) {
            return;
        }

        const el =
            document.getElementById(`student-row-${docInternId}`) ||
            document.getElementById(`student-card-${docInternId}`) ||
            document.getElementById(`student-mobile-${docInternId}`);

        if (!el) {
            return;
        }

        const timer = setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);

        return () => clearTimeout(timer);
    }, [docInternId, students.data]);

    if ((filters.search || '') !== syncedSearch) {
        setSyncedSearch(filters.search || '');
        setSearch(filters.search || '');
    }

    const baseParams = () => ({
        search: filters.search || undefined,
        hte_id: filters.hte_id ? String(filters.hte_id) : undefined,
        completion_status:
            filters.completion_status && filters.completion_status !== 'all'
                ? filters.completion_status
                : undefined,
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
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="size-5" />
                            </span>
                            Program Interns
                        </h1>
                        <p className="mt-1 ml-[3.25rem] text-sm text-muted-foreground">
                            {studentCount}{' '}
                            {studentCount === 1 ? 'intern' : 'interns'}
                            {scopeName ? ` • ${scopeName}` : ''}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* View Switcher */}
                        <div className="hidden items-center rounded-md border bg-muted/40 p-0.5 sm:flex">
                            <Button
                                variant={
                                    view === 'table' ? 'secondary' : 'ghost'
                                }
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setView('table')}
                            >
                                <TableIcon className="mr-1.5 size-4" />
                                Table
                            </Button>
                            <Button
                                variant={
                                    view === 'grid' ? 'secondary' : 'ghost'
                                }
                                size="sm"
                                className="h-8 px-2.5"
                                onClick={() => setView('grid')}
                            >
                                <LayoutGrid className="mr-1.5 size-4" />
                                Grid
                            </Button>
                        </div>

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
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No interns match{' '}
                        {filters.search !== '' ||
                        filters.hte_id ||
                        (filters.completion_status &&
                            filters.completion_status !== 'all')
                            ? 'these filters.'
                            : 'your program yet.'}
                    </p>
                ) : (
                    <>
                        {/* Table view */}
                        {view === 'table' && (
                            <div className="hidden overflow-x-auto rounded-md border sm:block">
                                <Table className="w-full min-w-[720px] text-sm">
                                    <TableHeader>
                                        <TableRow className="border-b text-left text-muted-foreground">
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                Name
                                            </TableHead>
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                ID Number
                                            </TableHead>
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                Assigned HTE
                                            </TableHead>
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                Hours Rendered
                                            </TableHead>
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                Documents
                                            </TableHead>
                                            <TableHead className="py-2.5 pr-4 font-medium">
                                                Requirement Status
                                            </TableHead>
                                            <TableHead className="py-2.5 text-right font-medium">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.data.map((student) => {
                                            const isHighlighted =
                                                docInternId ===
                                                student.intern_user_id;

                                            return (
                                                <TableRow
                                                    key={student.intern_user_id}
                                                    id={`student-row-${student.intern_user_id}`}
                                                    className={cn(
                                                        'border-b transition-all duration-300 last:border-0 hover:bg-muted/40',
                                                        isHighlighted &&
                                                            'bg-primary/10 ring-2 ring-primary/40 dark:bg-primary/20',
                                                    )}
                                                >
                                                    <TableCell className="py-3 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium whitespace-nowrap">
                                                                {student.name}
                                                            </p>
                                                            {isHighlighted && (
                                                                <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                    <Sparkles className="size-3" />{' '}
                                                                    Focus
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p
                                                            className="max-w-[160px] truncate text-xs text-muted-foreground"
                                                            title={
                                                                student.email
                                                            }
                                                        >
                                                            {student.email}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                                                        {student.id_number ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell
                                                        className="max-w-[140px] truncate py-3 pr-4"
                                                        title={student.hte_name}
                                                    >
                                                        {student.hte_name}
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                                                        <div className="flex min-w-[110px] flex-col gap-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="font-medium">
                                                                    {formatHours(
                                                                        student.total_hours,
                                                                    )}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    /{' '}
                                                                    {
                                                                        student.required_hours
                                                                    }
                                                                    h
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className={`h-full rounded-full ${
                                                                        student.hours_completed
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-primary'
                                                                    }`}
                                                                    style={{
                                                                        width: `${Math.min(100, student.progress_percent)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={`gap-1 text-xs ${
                                                                student.docs_completed
                                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            <FileCheck2 className="size-3" />
                                                            {
                                                                student.approved_docs_count
                                                            }{' '}
                                                            /{' '}
                                                            {
                                                                student.total_required_docs_count
                                                            }{' '}
                                                            Approved
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                                                        {student.is_completed ? (
                                                            <Badge className="gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-600">
                                                                <CheckCircle2 className="size-3.5" />
                                                                Completed
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs font-normal text-muted-foreground"
                                                            >
                                                                {student.hours_completed
                                                                    ? 'Hours Met • Docs Pending'
                                                                    : `${Math.round(student.progress_percent)}% Rendered`}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <CompletionSummaryDialog
                                                                internUserId={
                                                                    student.intern_user_id
                                                                }
                                                                internName={
                                                                    student.name
                                                                }
                                                                isCompleted={
                                                                    student.is_completed
                                                                }
                                                                defaultOpen={
                                                                    docInternId ===
                                                                        student.intern_user_id &&
                                                                    openSummary
                                                                }
                                                            />
                                                            <InternDocumentsDialog
                                                                internUserId={
                                                                    student.intern_user_id
                                                                }
                                                                internName={
                                                                    student.name
                                                                }
                                                                defaultOpen={
                                                                    docInternId ===
                                                                        student.intern_user_id &&
                                                                    !openSummary
                                                                }
                                                                highlightDoc={
                                                                    docInternId ===
                                                                    student.intern_user_id
                                                                        ? highlightDoc
                                                                        : null
                                                                }
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Grid view */}
                        {view === 'grid' && (
                            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                                {students.data.map((student) => {
                                    const isHighlighted =
                                        docInternId === student.intern_user_id;

                                    return (
                                        <Card
                                            key={student.intern_user_id}
                                            id={`student-card-${student.intern_user_id}`}
                                            className={cn(
                                                'flex flex-col justify-between transition-all duration-300',
                                                isHighlighted &&
                                                    'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10',
                                            )}
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <CardTitle className="truncate text-base font-semibold">
                                                                {student.name}
                                                            </CardTitle>
                                                            {isHighlighted && (
                                                                <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                    <Sparkles className="size-2.5" />{' '}
                                                                    Focus
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p
                                                            className="mt-0.5 truncate text-xs text-muted-foreground"
                                                            title={
                                                                student.email
                                                            }
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
                                                        <Phone className="size-3.5 shrink-0" />
                                                        <span>
                                                            {
                                                                student.contact_number
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="size-3.5 shrink-0" />
                                                    <span className="truncate font-medium text-foreground">
                                                        {student.hte_name}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Clock className="size-3.5" />{' '}
                                                        Rendered:
                                                    </span>
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {formatHours(
                                                            student.total_hours,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-end gap-1.5 border-t pt-2">
                                                    <CompletionSummaryDialog
                                                        internUserId={
                                                            student.intern_user_id
                                                        }
                                                        internName={
                                                            student.name
                                                        }
                                                        isCompleted={
                                                            student.is_completed
                                                        }
                                                        defaultOpen={
                                                            docInternId ===
                                                                student.intern_user_id &&
                                                            openSummary
                                                        }
                                                    />
                                                    <InternDocumentsDialog
                                                        internUserId={
                                                            student.intern_user_id
                                                        }
                                                        internName={
                                                            student.name
                                                        }
                                                        defaultOpen={
                                                            docInternId ===
                                                                student.intern_user_id &&
                                                            !openSummary
                                                        }
                                                        highlightDoc={
                                                            docInternId ===
                                                            student.intern_user_id
                                                                ? highlightDoc
                                                                : null
                                                        }
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Mobile list view */}
                        <div className="flex flex-col gap-3 sm:hidden">
                            {students.data.map((student) => {
                                const isHighlighted =
                                    docInternId === student.intern_user_id;

                                return (
                                    <Card
                                        key={student.intern_user_id}
                                        id={`student-mobile-${student.intern_user_id}`}
                                        className={cn(
                                            'transition-all duration-300',
                                            isHighlighted &&
                                                'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10',
                                        )}
                                    >
                                        <CardContent className="flex flex-col gap-2 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {student.name}
                                                        </p>
                                                        {isHighlighted && (
                                                            <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                <Sparkles className="size-2.5" />{' '}
                                                                Focus
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="truncate text-xs text-muted-foreground">
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
                                            <div className="flex items-center justify-between border-t pt-1 text-xs text-muted-foreground">
                                                <span className="max-w-[160px] truncate font-medium text-foreground">
                                                    {student.hte_name}
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {formatHours(
                                                        student.total_hours,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1.5 border-t pt-2">
                                                <CompletionSummaryDialog
                                                    internUserId={
                                                        student.intern_user_id
                                                    }
                                                    internName={student.name}
                                                    isCompleted={
                                                        student.is_completed
                                                    }
                                                    defaultOpen={
                                                        docInternId ===
                                                            student.intern_user_id &&
                                                        openSummary
                                                    }
                                                />
                                                <InternDocumentsDialog
                                                    internUserId={
                                                        student.intern_user_id
                                                    }
                                                    internName={student.name}
                                                    defaultOpen={
                                                        docInternId ===
                                                            student.intern_user_id &&
                                                        !openSummary
                                                    }
                                                    highlightDoc={
                                                        docInternId ===
                                                        student.intern_user_id
                                                            ? highlightDoc
                                                            : null
                                                    }
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
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
