import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
    Archive,
    Building2,
    LayoutGrid,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dashboard } from '@/routes';

interface Hte {
    hte_id: number;
    hte_name: string;
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    status: 'active' | 'inactive';
    interns_count: number;
    supervisors_count: number;
}

interface Filters {
    search: string;
    status: string;
    per_page: number;
}

interface HtesIndexProps {
    htes: Paginated<Hte>;
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

interface HteActionsProps {
    hte: Hte;
    onEdit: (hte: Hte) => void;
    onToggleStatus: (hte: Hte) => void;
    onArchive: (hteId: number, name: string) => void;
}

function HteActions({ hte, onEdit, onToggleStatus, onArchive }: HteActionsProps) {
    return (
        <div className="flex justify-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(hte)}
                        aria-label={`Edit ${hte.hte_name}`}
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
                        onClick={() => onToggleStatus(hte)}
                        aria-label={hte.status === 'active' ? `Deactivate ${hte.hte_name}` : `Activate ${hte.hte_name}`}
                    >
                        {hte.status === 'active' ? (
                            <PowerOff className="size-4 text-destructive" />
                        ) : (
                            <Power className="size-4 text-emerald-600" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {hte.status === 'active' ? 'Deactivate' : 'Activate'}
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={hte.status === 'active' ? 0 : undefined} className="inline-flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={hte.status === 'active'}
                            onClick={() => onArchive(hte.hte_id, hte.hte_name)}
                            aria-label={`Archive ${hte.hte_name}`}
                        >
                            <Archive className="size-4 text-orange-600" />
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {hte.status === 'active' ? 'Archive inactive HTEs only' : 'Archive to collection'}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default function HtesIndex({ htes, filters }: HtesIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const [addOpen, setAddOpen] = useState(false);
    const [editingHte, setEditingHte] = useState<Hte | null>(null);

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveHteId, setArchiveHteId] = useState<number | null>(null);
    const [archiveHteName, setArchiveHteName] = useState('');

    const addForm = useForm({
        hte_name: '',
        address: '',
        contact_number: '',
    });

    const editForm = useForm({
        hte_name: '',
        address: '',
        contact_number: '',
    });

    // Keep local search and status in sync with filter props
    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    useEffect(() => {
        setStatus(filters.status || '');
    }, [filters.status]);

    // ── Navigation helpers ──────────────────────────────────────────
    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/htes', params, { preserveState: true, preserveScroll: true });
    };

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        per_page: String(filters.per_page),
    });

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        visit({ ...baseParams(), page: undefined });
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
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({
            search: search || undefined,
            status: status || undefined,
            per_page: String(perPage),
            page: undefined,
        });
    };

    // ── CRUD helpers ────────────────────────────────────────────────
    const openAddDialog = () => {
        addForm.reset();
        addForm.clearErrors();
        setAddOpen(true);
    };

    const closeAddDialog = () => {
        setAddOpen(false);
        addForm.reset();
        addForm.clearErrors();
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/admin/htes', {
            preserveScroll: true,
            onSuccess: () => {
                closeAddDialog();
            },
        });
    };

    const openEditDialog = (hte: Hte) => {
        editForm.clearErrors();
        editForm.setData({
            hte_name: hte.hte_name,
            address: hte.address ?? '',
            contact_number: hte.contact_number ?? '',
        });
        setEditingHte(hte);
    };

    const closeEditDialog = () => {
        setEditingHte(null);
        editForm.clearErrors();
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingHte) return;
        editForm.patch(`/admin/htes/${editingHte.hte_id}`, {
            preserveScroll: true,
            onSuccess: () => closeEditDialog(),
        });
    };

    const toggleStatus = (hte: Hte) => {
        router.patch(
            `/admin/htes/${hte.hte_id}/status`,
            { status: hte.status === 'active' ? 'inactive' : 'active' },
            { preserveScroll: true, preserveState: true },
        );
    };

    const openArchiveDialog = (hteId: number, name: string) => {
        setArchiveHteId(hteId);
        setArchiveHteName(name);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (archiveHteId !== null) {
            router.delete(`/admin/htes/${archiveHteId}`, { preserveScroll: true });
            setArchiveOpen(false);
            setArchiveHteId(null);
            setArchiveHteName('');
        }
    };

    return (
        <>
            <Head title="HTEs" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* ── Header toolbar ────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Building2 className="size-5" />
                        </span>
                        Host Training Establishments
                    </h1>

                    <div className="flex items-center gap-2">
                        {/* Desktop: full search input */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs..."
                                className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile: search icon toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Status filter — full on sm+, icon-only on mobile */}
                        <div className="hidden sm:block">
                            <Select value={status || 'all'} onValueChange={applyStatus}>
                                <SelectTrigger className="h-9 w-36">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select value={status || 'all'} onValueChange={applyStatus}>
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View toggle — desktop only */}
                        <div className="hidden sm:block">
                            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <TabsList>
                                    <TabsTrigger value="table" aria-label="Table view">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid" aria-label="Grid view">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Add HTE — icon+text on desktop, icon-only on mobile */}
                        <Button onClick={openAddDialog}>
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Add HTE</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile inline search bar */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs..."
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
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" size="sm">Search</Button>
                    </form>
                )}

                {/* ── Content ───────────────────────────────────────────── */}
                {htes.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No HTEs{filters.search || filters.status ? ' match this filter.' : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table view — desktop only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">
                                                        Host Training Establishment
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">Address</TableHead>
                                                    <TableHead className="px-6 text-center">Contact</TableHead>
                                                    <TableHead className="px-6 text-center">Status</TableHead>
                                                    <TableHead className="px-6 text-center">Interns</TableHead>
                                                    <TableHead className="px-6 text-center">Supervisors</TableHead>
                                                    <TableHead className="px-6 text-center">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {htes.data.map((hte) => (
                                                    <TableRow key={hte.hte_id}>
                                                        <TableCell className="px-6 font-medium">
                                                            {hte.hte_name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-xs truncate px-6 text-center text-muted-foreground"
                                                            title={hte.address ?? undefined}
                                                        >
                                                            {hte.address ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <p className="truncate" title={hte.contact_person ?? undefined}>
                                                                {hte.contact_person ?? '—'}
                                                            </p>
                                                            {hte.contact_number && (
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {hte.contact_number}
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <StatusBadge status={hte.status} />
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            {hte.interns_count}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            {hte.supervisors_count}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <HteActions
                                                                hte={hte}
                                                                onEdit={openEditDialog}
                                                                onToggleStatus={toggleStatus}
                                                                onArchive={openArchiveDialog}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={htes}
                                            itemLabel="HTE"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="htes-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — always on mobile, desktop only when grid tab selected */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {htes.data.map((hte) => (
                                    <Card key={hte.hte_id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <CardTitle className="text-base">
                                                        {hte.hte_name}
                                                    </CardTitle>
                                                    <div className="mt-2">
                                                        <StatusBadge status={hte.status} />
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <HteActions
                                                        hte={hte}
                                                        onEdit={openEditDialog}
                                                        onToggleStatus={toggleStatus}
                                                        onArchive={openArchiveDialog}
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Address</span>
                                                <span className="text-right" title={hte.address ?? undefined}>
                                                    {hte.address ?? '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Contact Person</span>
                                                <span className="text-right">{hte.contact_person ?? '—'}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Contact Number</span>
                                                <span className="text-right">{hte.contact_number ?? '—'}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Interns</span>
                                                <span>{hte.interns_count}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Supervisors</span>
                                                <span>{hte.supervisors_count}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="mt-4">
                                <NumberedPagination
                                    meta={htes}
                                    itemLabel="HTE"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="htes-grid-per-page"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Edit dialog ───────────────────────────────────────── */}
            <Dialog open={editingHte !== null} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit HTE</DialogTitle>
                        <DialogDescription>Update this HTE's details.</DialogDescription>
                    </DialogHeader>
                    {editingHte && (
                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_hte_name">Name</Label>
                                <Input
                                    id="edit_hte_name"
                                    value={editForm.data.hte_name}
                                    onChange={(e) => editForm.setData('hte_name', e.target.value)}
                                    maxLength={150}
                                    required
                                />
                                <InputError message={editForm.errors.hte_name} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_address">Address</Label>
                                <Input
                                    id="edit_address"
                                    value={editForm.data.address}
                                    onChange={(e) => editForm.setData('address', e.target.value)}
                                    maxLength={255}
                                    required
                                />
                                <InputError message={editForm.errors.address} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_contact_number">Contact Number</Label>
                                <Input
                                    id="edit_contact_number"
                                    value={editForm.data.contact_number}
                                    onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                    maxLength={20}
                                />
                                <InputError message={editForm.errors.contact_number} />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={closeEditDialog}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Add dialog ────────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={(open) => (open ? openAddDialog() : closeAddDialog())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add HTE</DialogTitle>
                        <DialogDescription>
                            This HTE will become available for assigning interns and supervisors.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="hte_name">Name</Label>
                            <Input
                                id="hte_name"
                                value={addForm.data.hte_name}
                                onChange={(e) => addForm.setData('hte_name', e.target.value)}
                                maxLength={150}
                                required
                            />
                            <InputError message={addForm.errors.hte_name} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={addForm.data.address}
                                onChange={(e) => addForm.setData('address', e.target.value)}
                                maxLength={255}
                                required
                            />
                            <InputError message={addForm.errors.address} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="contact_number">Contact Number</Label>
                            <Input
                                id="contact_number"
                                value={addForm.data.contact_number}
                                onChange={(e) => addForm.setData('contact_number', e.target.value)}
                                maxLength={20}
                            />
                            <InputError message={addForm.errors.contact_number} />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={closeAddDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addForm.processing}>
                                Create HTE
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Archive confirmation ──────────────────────────────── */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive HTE"
                description={`Archive "${archiveHteName}"? It will be moved to the archives and can be restored later.`}
                onConfirm={submitArchive}
                confirmText="Archive"
            />
        </>
    );
}

HtesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'HTEs', href: '/admin/htes' },
    ],
};
