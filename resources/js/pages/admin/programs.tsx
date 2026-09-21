import { Head, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    Clock,
    GraduationCap,
    LayoutGrid,
    Plus,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    UserCheck,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { ProgramActions } from '@/components/program-actions';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types/auth';

interface CollegeOption {
    id: number;
    name: string;
    code: string;
}

interface Program {
    program_id: number;
    college_id?: number | null;
    college?: CollegeOption | null;
    program_name: string;
    is_active: boolean;
    required_hours: number;
    approved_intern_count: number;
    ojt_supervisors: string[];
}

interface Filters {
    search: string;
    status: string;
    college_id?: number | null;
    per_page: number;
}

interface ProgramsProps {
    programs: Paginated<Program>;
    colleges?: CollegeOption[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function AdminPrograms({
    programs,
    colleges = [],
    filters,
}: ProgramsProps) {
    const { auth } = usePage<PageProps>().props;
    const isSuperAdmin =
        auth?.user?.is_super_admin ??
        (auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin');

    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [collegeFilter, setCollegeFilter] = useState<number | null>(
        filters.college_id ?? null,
    );
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addHours, setAddHours] = useState('');
    const [addCollegeId, setAddCollegeId] = useState<string>('');

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editHours, setEditHours] = useState('');
    const [editCollegeId, setEditCollegeId] = useState<string>('');

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveId, setArchiveId] = useState<number | null>(null);
    const [archiveName, setArchiveName] = useState('');

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/programs', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        college_id: collegeFilter ? String(collegeFilter) : undefined,
        per_page: String(filters.per_page),
    });

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
        // Navigation helpers intentionally remain local to preserve the current
        // filter state while debounced search requests are issued.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({
            status: status || undefined,
            college_id: collegeFilter ? String(collegeFilter) : undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const applyStatus = (value: string) => {
        const nextStatus = value === 'all' ? '' : value;

        setStatus(nextStatus);

        visit({
            search: search || undefined,
            status: nextStatus || undefined,
            college_id: collegeFilter ? String(collegeFilter) : undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const applyCollege = (value: string) => {
        const nextCollege = value === 'all' ? null : Number(value);

        setCollegeFilter(nextCollege);

        visit({
            search: search || undefined,
            status: status || undefined,
            college_id: nextCollege ? String(nextCollege) : undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit(
            {
                ...baseParams(),
                page: String(page),
            },
            false,
        );
    };

    const changePerPage = (perPage: number) => {
        visit({
            search: search || undefined,
            status: status || undefined,
            college_id: collegeFilter ? String(collegeFilter) : undefined,
            per_page: String(perPage),
            page: undefined,
        });
    };

    const submitAdd = () => {
        if (!addName.trim() || !addHours) {
            toast.error('Program name and required hours are required.');

            return;
        }

        if (isSuperAdmin && !addCollegeId) {
            toast.error('Please select a college for this program.');

            return;
        }

        router.post(
            '/admin/programs',
            {
                program_name: addName.trim(),
                required_hours: addHours,
                ...(isSuperAdmin && addCollegeId
                    ? { college_id: Number(addCollegeId) }
                    : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setAddName('');
                    setAddHours('');
                    setAddCollegeId('');
                },
            },
        );
    };

    const openEdit = (program: Program) => {
        setEditingId(program.program_id);
        setEditName(program.program_name);
        setEditHours(String(program.required_hours));
        setEditCollegeId(program.college_id ? String(program.college_id) : '');
        setEditOpen(true);
    };

    const submitEdit = () => {
        if (!editingId || !editName.trim() || !editHours) {
            toast.error('Program name and required hours are required.');

            return;
        }

        if (isSuperAdmin && !editCollegeId) {
            toast.error('Please select a college for this program.');

            return;
        }

        router.patch(
            `/admin/programs/${editingId}`,
            {
                program_name: editName.trim(),
                required_hours: editHours,
                ...(isSuperAdmin && editCollegeId
                    ? { college_id: Number(editCollegeId) }
                    : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditOpen(false);
                    setEditingId(null);
                    setEditCollegeId('');
                },
            },
        );
    };

    const toggleActive = (program: Program) => {
        router.patch(
            `/admin/programs/${program.program_id}/status`,
            { is_active: !program.is_active },
            { preserveScroll: true },
        );
    };

    const openArchiveDialog = (program: Program) => {
        setArchiveId(program.program_id);
        setArchiveName(program.program_name);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (archiveId === null) {
            return;
        }

        router.delete(`/admin/programs/${archiveId}`, {
            preserveScroll: true,
        });

        setArchiveOpen(false);
        setArchiveId(null);
        setArchiveName('');
    };

    const supervisorLabel = (names: string[]) =>
        names.length === 0 ? '—' : names.join(', ');

    return (
        <>
            <Head title="Programs" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <BookOpen className="size-5" />
                        </span>
                        Programs
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search programs…"
                                className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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

                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((open) => !open)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        <div className="hidden sm:block">
                            <Select
                                value={status || 'all'}
                                onValueChange={applyStatus}
                            >
                                <SelectTrigger className="h-9 w-36">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isSuperAdmin && colleges.length > 0 && (
                            <div className="hidden sm:block">
                                <Select
                                    value={
                                        collegeFilter
                                            ? String(collegeFilter)
                                            : 'all'
                                    }
                                    onValueChange={applyCollege}
                                >
                                    <SelectTrigger className="h-9 w-44">
                                        <Building2 className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="All Colleges" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Colleges
                                        </SelectItem>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} — {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="sm:hidden">
                            <Select
                                value={status || 'all'}
                                onValueChange={applyStatus}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isSuperAdmin && colleges.length > 0 && (
                            <div className="sm:hidden">
                                <Select
                                    value={
                                        collegeFilter
                                            ? String(collegeFilter)
                                            : 'all'
                                    }
                                    onValueChange={applyCollege}
                                >
                                    <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                        <Building2 className="size-4 text-muted-foreground" />
                                    </SelectTrigger>
                                    <SelectContent align="end">
                                        <SelectItem value="all">
                                            All Colleges
                                        </SelectItem>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} — {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(value) =>
                                    setView(value as ViewMode)
                                }
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

                        <Button onClick={() => setAddOpen(true)}>
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">
                                Add Program
                            </span>
                        </Button>
                    </div>
                </div>

                {mobileSearchOpen && (
                    <form
                        onSubmit={(event) => {
                            applySearch(event);
                            setMobileSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search programs…"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSearch();
                                        setMobileSearchOpen(false);
                                    }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <Button type="submit" size="sm">
                            Search
                        </Button>
                    </form>
                )}

                {programs.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No programs
                            {filters.search || filters.status
                                ? ' match this filter.'
                                : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6 text-center">
                                                        Program
                                                    </TableHead>
                                                    {isSuperAdmin && (
                                                        <TableHead className="px-6 text-center">
                                                            College
                                                        </TableHead>
                                                    )}
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Required Hours
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Interns
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        OJT Supervisor(s)
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {programs.data.map(
                                                    (program) => (
                                                        <TableRow
                                                            key={
                                                                program.program_id
                                                            }
                                                        >
                                                            <TableCell className="px-6 font-medium">
                                                                {
                                                                    program.program_name
                                                                }
                                                            </TableCell>
                                                            {isSuperAdmin && (
                                                                <TableCell className="px-6 text-center">
                                                                    {program.college ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="font-semibold text-primary"
                                                                        >
                                                                            {
                                                                                program
                                                                                    .college
                                                                                    .code
                                                                            }
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="px-6 text-center">
                                                                <StatusBadge
                                                                    status={
                                                                        program.is_active
                                                                            ? 'active'
                                                                            : 'inactive'
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                {
                                                                    program.required_hours
                                                                }{' '}
                                                                hrs
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                {
                                                                    program.approved_intern_count
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center text-muted-foreground">
                                                                {supervisorLabel(
                                                                    program.ojt_supervisors,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <ProgramActions
                                                                    program={
                                                                        program
                                                                    }
                                                                    onEdit={
                                                                        openEdit
                                                                    }
                                                                    onToggleActive={
                                                                        toggleActive
                                                                    }
                                                                    onArchive={
                                                                        openArchiveDialog
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={programs}
                                            itemLabel="program"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                        />
                                    </CardContent>
                                </Card>
                                <div className="mt-4"></div>
                            </div>
                        )}

                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {programs.data.map((program) => (
                                    <Card key={program.program_id} className="flex flex-col justify-between h-full rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:border-border">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1" title={program.program_name}>
                                                        {program.program_name}
                                                    </CardTitle>
                                                    {isSuperAdmin && program.college && (
                                                        <span className="text-xs text-muted-foreground truncate block mt-1" title={program.college.name}>
                                                            {program.college.code} — {program.college.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        program.is_active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                />
                                            </div>
                                        </CardHeader>

                                        <CardContent className="flex-1 space-y-2.5 pb-3 text-sm">
                                            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <Clock className="size-3.5 text-muted-foreground" />
                                                        Required Hours:
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        {program.required_hours} hrs
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <GraduationCap className="size-3.5 text-muted-foreground" />
                                                        Interns Enrolled:
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {program.approved_intern_count}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <UserCheck className="size-3.5 text-muted-foreground" />
                                                        Supervisor(s):
                                                    </span>
                                                    <span className="font-medium text-foreground truncate text-right" title={supervisorLabel(program.ojt_supervisors)}>
                                                        {supervisorLabel(program.ojt_supervisors)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>

                                        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                            <span>{program.required_hours}h required</span>
                                            <ProgramActions
                                                program={program}
                                                onEdit={openEdit}
                                                onToggleActive={toggleActive}
                                                onArchive={openArchiveDialog}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <div className="mt-4">
                                <NumberedPagination
                                    meta={programs}
                                    itemLabel="program"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Program</DialogTitle>
                        <DialogDescription>
                            Create a new program with its required OJT hours.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {isSuperAdmin ? (
                            <div className="grid gap-1.5">
                                <Label>College</Label>
                                <Select
                                    value={addCollegeId}
                                    onValueChange={setAddCollegeId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a college" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} — {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : auth.user?.college ? (
                            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                                Assigning program to{' '}
                                <span className="font-semibold text-foreground">
                                    {auth.user.college.code} —{' '}
                                    {auth.user.college.name}
                                </span>
                            </div>
                        ) : null}

                        <div className="grid gap-1.5">
                            <Label>Program Name</Label>
                            <Input
                                value={addName}
                                onChange={(event) =>
                                    setAddName(event.target.value)
                                }
                                placeholder="e.g. BSIT"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label>Required Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                value={addHours}
                                onChange={(event) =>
                                    setAddHours(event.target.value)
                                }
                                placeholder="e.g. 486"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAddOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitAdd}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Program</DialogTitle>
                        <DialogDescription>
                            Changing required hours immediately affects every
                            enrolled intern&apos;s hours-rendered progress ring.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {isSuperAdmin && (
                            <div className="grid gap-1.5">
                                <Label>College</Label>
                                <Select
                                    value={editCollegeId}
                                    onValueChange={setEditCollegeId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a college" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} — {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-1.5">
                            <Label>Program Name</Label>
                            <Input
                                value={editName}
                                onChange={(event) =>
                                    setEditName(event.target.value)
                                }
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label>Required Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                value={editHours}
                                onChange={(event) =>
                                    setEditHours(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive Program"
                description={`Archive "${archiveName}"? It will be moved to the archives and can be restored later.`}
                onConfirm={submitArchive}
                confirmText="Archive"
            />
        </>
    );
}

AdminPrograms.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/admin/programs' },
    ],
};
