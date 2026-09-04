import { Head, router } from '@inertiajs/react';
import {
    BookOpen,
    LayoutGrid,
    Plus,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { ProgramActions } from '@/components/program-actions';
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

interface Program {
    program_id: number;
    program_name: string;
    is_active: boolean;
    required_hours: number;
    approved_intern_count: number;
    ojt_supervisors: string[];
}

interface Filters {
    search: string;
    status: string;
    per_page: number;
}

interface ProgramsProps {
    programs: Paginated<Program>;
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function AdminPrograms({ programs, filters }: ProgramsProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addHours, setAddHours] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editHours, setEditHours] = useState('');

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
            per_page: String(perPage),
            page: undefined,
        });
    };

    const submitAdd = () => {
        if (!addName.trim() || !addHours) {
            toast.error('Program name and required hours are required.');

            return;
        }

        router.post(
            '/admin/programs',
            {
                program_name: addName.trim(),
                required_hours: addHours,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setAddName('');
                    setAddHours('');
                },
            },
        );
    };

    const openEdit = (program: Program) => {
        setEditingId(program.program_id);
        setEditName(program.program_name);
        setEditHours(String(program.required_hours));
        setEditOpen(true);
    };

    const submitEdit = () => {
        if (!editingId || !editName.trim() || !editHours) {
            toast.error('Program name and required hours are required.');

            return;
        }

        router.patch(
            `/admin/programs/${editingId}`,
            {
                program_name: editName.trim(),
                required_hours: editHours,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditOpen(false);
                    setEditingId(null);
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
        names.length === 0 ? 'â€”' : names.join(', ');

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
                                placeholder="Search programsâ€¦"
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
                                placeholder="Search programsâ€¦"
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
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6 text-center">
                                                        Program
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Required Hours
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Approved Interns
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
                                    <Card key={program.program_id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <CardTitle className="text-base">
                                                        {program.program_name}
                                                    </CardTitle>
                                                    <div className="mt-2">
                                                        <StatusBadge
                                                            status={
                                                                program.is_active
                                                                    ? 'active'
                                                                    : 'inactive'
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="shrink-0">
                                                    <ProgramActions
                                                        program={program}
                                                        onEdit={openEdit}
                                                        onToggleActive={
                                                            toggleActive
                                                        }
                                                        onArchive={
                                                            openArchiveDialog
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="text-muted-foreground">
                                                    Required Hours
                                                </span>
                                                <span>
                                                    {program.required_hours} hrs
                                                </span>
                                            </div>

                                            <div className="flex justify-between gap-2">
                                                <span className="text-muted-foreground">
                                                    Approved Interns
                                                </span>
                                                <span>
                                                    {
                                                        program.approved_intern_count
                                                    }
                                                </span>
                                            </div>

                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">
                                                    OJT Supervisor(s)
                                                </span>
                                                <span className="text-right">
                                                    {supervisorLabel(
                                                        program.ojt_supervisors,
                                                    )}
                                                </span>
                                            </div>
                                        </CardContent>
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
