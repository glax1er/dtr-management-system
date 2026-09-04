import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    LayoutGrid,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { TypeBadge } from '@/components/ui/badges/type-badge';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';

// -- Types --------------------------------------------------------------------
interface Hte {
    hte_id: number;
    hte_name: string;
}
interface Program {
    program_id: number;
    program_name: string;
}

interface Supervisor {
    user_id: number;
    name: string;
    email: string;
    supervisor_type: 'hte' | 'ojt';
    scope_name: string;
    status: 'active' | 'inactive';
    hte_id: number | null;
    program_id: number | null;
}

interface Filters {
    search: string;
    type: 'hte' | 'ojt' | null;
    per_page: number;
}

interface SupervisorsIndexProps {
    supervisors: Paginated<Supervisor>;
    htes: Hte[];
    programs: Program[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

// -- Main page -----------------------------------------------------------------
export default function SupervisorsIndex({
    supervisors,
    htes,
    programs,
    filters,
}: SupervisorsIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const [addOpen, setAddOpen] = useState(false);
    const [editingSupervisor, setEditingSupervisor] =
        useState<Supervisor | null>(null);

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveId, setArchiveId] = useState<number | null>(null);
    const [archiveName, setArchiveName] = useState('');

    const addForm = useForm({
        name: '',
        email: '',
        supervisor_type: 'hte' as 'hte' | 'ojt',
        hte_id: '',
        program_id: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        hte_id: '',
        program_id: '',
    });

    // -- Navigation ---------------------------------------------------------
    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) =>
        router.get('/admin/supervisors', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });

    const baseParams = () => ({
        search: search || undefined,
        type: filters.type ?? undefined,
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
        // Navigation helpers intentionally remain local to preserve current filters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const applyType = (value: string) => {
        visit({
            ...baseParams(),
            type: value === 'all' ? undefined : value,
            page: undefined,
        });
    };

    const goToPage = (page: number) =>
        visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    // -- CRUD ---------------------------------------------------------------
    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const url =
            addForm.data.supervisor_type === 'ojt'
                ? '/admin/supervisors/ojt'
                : '/admin/supervisors';
        addForm.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset();
                setAddOpen(false);
            },
        });
    };

    const openEditDialog = (supervisor: Supervisor) => {
        editForm.setData({
            name: supervisor.name,
            email: supervisor.email,
            hte_id: supervisor.hte_id ? String(supervisor.hte_id) : '',
            program_id: supervisor.program_id
                ? String(supervisor.program_id)
                : '',
        });
        setEditingSupervisor(supervisor);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingSupervisor) {
            return;
        }

        editForm.patch(`/admin/supervisors/${editingSupervisor.user_id}`, {
            preserveScroll: true,
            onSuccess: () => setEditingSupervisor(null),
        });
    };

    const changeStatus = (userId: number, status: string) =>
        router.patch(
            `/admin/supervisors/${userId}/status`,
            { status },
            {
                preserveScroll: true,
            },
        );

    const openArchiveDialog = (supervisor: Supervisor) => {
        setArchiveId(supervisor.user_id);
        setArchiveName(supervisor.name);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (archiveId === null) {
            return;
        }

        router.delete(`/admin/supervisors/${archiveId}`, {
            preserveScroll: true,
        });
        setArchiveOpen(false);
        setArchiveId(null);
        setArchiveName('');
    };

    // -- Per-row actions (shared between table and grid) --------------------
    const SupervisorActions = ({ supervisor }: { supervisor: Supervisor }) => (
        <div className="flex justify-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(supervisor)}
                    >
                        <Pencil className="size-4 text-blue-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                            changeStatus(
                                supervisor.user_id,
                                supervisor.status === 'active'
                                    ? 'inactive'
                                    : 'active',
                            )
                        }
                    >
                        {supervisor.status === 'active' ? (
                            <PowerOff className="size-4 text-destructive" />
                        ) : (
                            <Power className="size-4 text-emerald-600" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {supervisor.status === 'active' ? 'Deactivate' : 'Activate'}
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={supervisor.status === 'active'}
                        onClick={() => openArchiveDialog(supervisor)}
                    >
                        <Archive className="size-4 text-orange-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {supervisor.status === 'active'
                        ? 'Archive inactive supervisors only'
                        : 'Archive'}
                </TooltipContent>
            </Tooltip>
        </div>
    );

    // -- Render -------------------------------------------------------------
    return (
        <>
            <Head title="Supervisors" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Users className="size-5" />
                        </span>
                        Supervisors
                    </h1>

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
                                placeholder="Search supervisors"
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

                        {/* Type filter — full on desktop, icon-only on mobile */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.type ?? 'all'}
                                onValueChange={applyType}
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="hte">
                                        HTE Supervisor
                                    </SelectItem>
                                    <SelectItem value="ojt">
                                        OJT Supervisor
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={filters.type ?? 'all'}
                                onValueChange={applyType}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">
                                        All Types
                                    </SelectItem>
                                    <SelectItem value="hte">
                                        HTE Supervisor
                                    </SelectItem>
                                    <SelectItem value="ojt">
                                        OJT Supervisor
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View toggle — desktop only */}
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

                        {/* Add button */}
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">
                                Add Supervisor
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Mobile inline search */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
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
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search supervisors…"
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

                {/* Content */}
                {supervisors.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No supervisors
                            {filters.search || filters.type
                                ? ' match this filter.'
                                : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table — desktop only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">
                                                        Name
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Email
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Type
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Scope
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {supervisors.data.map(
                                                    (supervisor) => (
                                                        <TableRow
                                                            key={
                                                                supervisor.user_id
                                                            }
                                                        >
                                                            <TableCell className="px-6 font-medium whitespace-nowrap">
                                                                {
                                                                    supervisor.name
                                                                }
                                                            </TableCell>
                                                            <TableCell
                                                                className="max-w-[200px] truncate px-6 text-center text-muted-foreground"
                                                                title={
                                                                    supervisor.email
                                                                }
                                                            >
                                                                {
                                                                    supervisor.email
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <TypeBadge
                                                                    type={
                                                                        supervisor.supervisor_type
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell
                                                                className="max-w-[180px] truncate px-6 text-center"
                                                                title={
                                                                    supervisor.scope_name
                                                                }
                                                            >
                                                                {
                                                                    supervisor.scope_name
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <StatusBadge
                                                                    status={
                                                                        supervisor.status
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <SupervisorActions
                                                                    supervisor={
                                                                        supervisor
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={supervisors}
                                            itemLabel="supervisor"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="supervisors-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid — always on mobile, desktop when grid tab selected */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {supervisors.data.map((supervisor) => (
                                    <Card key={supervisor.user_id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="truncate text-base">
                                                        {supervisor.name}
                                                    </CardTitle>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {supervisor.email}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        <TypeBadge
                                                            type={
                                                                supervisor.supervisor_type
                                                            }
                                                        />
                                                        <StatusBadge
                                                            status={
                                                                supervisor.status
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <SupervisorActions
                                                        supervisor={supervisor}
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">
                                                    Scope
                                                </span>
                                                <span className="text-right">
                                                    {supervisor.scope_name}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="mt-4">
                                <NumberedPagination
                                    meta={supervisors}
                                    itemLabel="supervisor"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="supervisors-grid-per-page"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* -- Add dialog ------------------------------------------------- */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <form
                        onSubmit={handleAddSubmit}
                        className="flex flex-col gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Add Supervisor</DialogTitle>
                            <DialogDescription>
                                Create an HTE or OJT supervisor. They'll receive
                                a default password and can change it after
                                logging in.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="supervisor_type">
                                    Supervisor Type
                                </Label>
                                <Select
                                    value={addForm.data.supervisor_type}
                                    onValueChange={(v) =>
                                        addForm.setData(
                                            'supervisor_type',
                                            v as 'hte' | 'ojt',
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="supervisor_type"
                                        className="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hte">
                                            HTE Supervisor
                                        </SelectItem>
                                        <SelectItem value="ojt">
                                            OJT Supervisor
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="add_name">Name</Label>
                                <Input
                                    id="add_name"
                                    value={addForm.data.name}
                                    onChange={(e) =>
                                        addForm.setData('name', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={addForm.errors.name} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="add_email">Email</Label>
                                <Input
                                    id="add_email"
                                    type="email"
                                    value={addForm.data.email}
                                    onChange={(e) =>
                                        addForm.setData('email', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={addForm.errors.email} />
                            </div>

                            {addForm.data.supervisor_type === 'hte' ? (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="add_hte_id">
                                        Host Training Establishment
                                    </Label>
                                    <Select
                                        value={addForm.data.hte_id}
                                        onValueChange={(v) =>
                                            addForm.setData('hte_id', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="add_hte_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select HTE" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {htes.map((hte) => (
                                                <SelectItem
                                                    key={hte.hte_id}
                                                    value={String(hte.hte_id)}
                                                >
                                                    {hte.hte_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={addForm.errors.hte_id}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="add_program_id">
                                        Program
                                    </Label>
                                    <Select
                                        value={addForm.data.program_id}
                                        onValueChange={(v) =>
                                            addForm.setData('program_id', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="add_program_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select program" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs.map((program) => (
                                                <SelectItem
                                                    key={program.program_id}
                                                    value={String(
                                                        program.program_id,
                                                    )}
                                                >
                                                    {program.program_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={addForm.errors.program_id}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setAddOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addForm.processing}>
                                Create Supervisor
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -- Edit dialog ------------------------------------------------ */}
            <Dialog
                open={editingSupervisor !== null}
                onOpenChange={(open) => !open && setEditingSupervisor(null)}
            >
                <DialogContent>
                    <form
                        onSubmit={handleEditSubmit}
                        className="flex flex-col gap-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Edit Supervisor</DialogTitle>
                            <DialogDescription>
                                Update this supervisor's account and assignment.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_name">Name</Label>
                                <Input
                                    id="edit_name"
                                    value={editForm.data.name}
                                    onChange={(e) =>
                                        editForm.setData('name', e.target.value)
                                    }
                                    required
                                />
                                <InputError message={editForm.errors.name} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_email">Email</Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'email',
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={editForm.errors.email} />
                            </div>

                            {editingSupervisor?.supervisor_type === 'hte' ? (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="edit_hte_id">
                                        Host Training Establishment
                                    </Label>
                                    <Select
                                        value={editForm.data.hte_id}
                                        onValueChange={(v) =>
                                            editForm.setData('hte_id', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="edit_hte_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select HTE" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {htes.map((hte) => (
                                                <SelectItem
                                                    key={hte.hte_id}
                                                    value={String(hte.hte_id)}
                                                >
                                                    {hte.hte_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={editForm.errors.hte_id}
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="edit_program_id">
                                        Program
                                    </Label>
                                    <Select
                                        value={editForm.data.program_id}
                                        onValueChange={(v) =>
                                            editForm.setData('program_id', v)
                                        }
                                    >
                                        <SelectTrigger
                                            id="edit_program_id"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select program" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs.map((program) => (
                                                <SelectItem
                                                    key={program.program_id}
                                                    value={String(
                                                        program.program_id,
                                                    )}
                                                >
                                                    {program.program_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={editForm.errors.program_id}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setEditingSupervisor(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -- Archive confirmation ---------------------------------------- */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive Supervisor"
                description={`Archive "${archiveName}"? It will be moved to the archives and can be restored later.`}
                onConfirm={submitArchive}
                confirmText="Archive"
            />
        </>
    );
}

SupervisorsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Supervisors', href: '/admin/supervisors' },
    ],
};
