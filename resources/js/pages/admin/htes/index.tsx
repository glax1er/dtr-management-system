import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Archive, Building2, LayoutGrid, Pencil, Power, PowerOff, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import PaginationFooter from '@/components/pagination-footer';
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
    per_page: number;
}

interface HtesIndexProps {
    htes: Paginated<Hte>;
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function HtesIndex({ htes, filters }: HtesIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [addOpen, setAddOpen] = useState(false);
    const [editingHte, setEditingHte] = useState<Hte | null>(null);
    const [search, setSearch] = useState(filters.search);
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

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/admin/htes', {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset();
                setAddOpen(false);
            },
        });
    };

    const openEditDialog = (hte: Hte) => {
        editForm.setData({
            hte_name: hte.hte_name,
            address: hte.address ?? '',
            contact_number: hte.contact_number ?? '',
        });
        setEditingHte(hte);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingHte) return;

        editForm.patch(`/admin/htes/${editingHte.hte_id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingHte(null);
            },
        });
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

    const baseParams = () => ({
        search: filters.search || undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/htes', params, { preserveState: true, preserveScroll: true });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage) });
    };

    return (
        <>
            <Head title="HTEs" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Building2 className="size-5" />
                            </div>
                            <span>Host Training Establishments</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                            <TabsList>
                                <TabsTrigger value="table">
                                    <TableIcon className="size-4" />
                                </TabsTrigger>
                                <TabsTrigger value="grid">
                                    <LayoutGrid className="size-4" />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button onClick={() => setAddOpen(true)}>Add HTE</Button>
                    </div>
                </div>

                {htes.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No HTEs match{filters.search !== '' ? ' this search.' : ' yet.'}
                        </CardContent>
                    </Card>
                ) : view === 'table' ? (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 text-center">Host Training Establishment</TableHead>
                                        <TableHead className="px-6 text-center">Address</TableHead>
                                        <TableHead className="px-6 text-center">Contact</TableHead>
                                        <TableHead className="px-6 text-center">Status</TableHead>
                                        <TableHead className="px-6 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {htes.data.map((hte) => (
                                        <TableRow key={hte.hte_id}>
                                            <TableCell className="px-6 font-medium">{hte.hte_name}</TableCell>
                                            <TableCell
                                                className="max-w-xs truncate px-6 text-center text-muted-foreground"
                                                title={hte.address ?? undefined}
                                            >
                                                {hte.address ?? '—'}
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <div>
                                                    <p className="truncate" title={hte.contact_person ?? undefined}>
                                                        {hte.contact_person ?? '—'}
                                                    </p>
                                                    {hte.contact_number && (
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {hte.contact_number}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <StatusBadge status={hte.status} />
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditDialog(hte)}
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
                                                                onClick={() => {
                                                                    router.patch(
                                                                        `/admin/htes/${hte.hte_id}/status`,
                                                                        { status: hte.status === 'active' ? 'inactive' : 'active' },
                                                                        { preserveScroll: true, preserveState: true },
                                                                    );
                                                                }}
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
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={hte.status === 'active'}
                                                                onClick={() => openArchiveDialog(hte.hte_id, hte.hte_name)}
                                                            >
                                                                <Archive className="size-4 text-orange-600" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {hte.status === 'active'
                                                                ? 'Archive inactive HTEs only'
                                                                : 'Archive to collection'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="border-t px-6 py-4">
                                <PaginationFooter
                                    meta={htes}
                                    itemLabel="HTE"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="htes-per-page"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {htes.data.map((hte) => (
                                <Card key={hte.hte_id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{hte.hte_name}</CardTitle>
                                                <StatusBadge status={hte.status} />
                                            </div>
                                            <div className="flex gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(hte)}
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
                                                            onClick={() => {
                                                                router.patch(
                                                                    `/admin/htes/${hte.hte_id}/status`,
                                                                    { status: hte.status === 'active' ? 'inactive' : 'active' },
                                                                    { preserveScroll: true, preserveState: true },
                                                                );
                                                            }}
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={hte.status === 'active'}
                                                            onClick={() => openArchiveDialog(hte.hte_id, hte.hte_name)}
                                                        >
                                                            <Archive className="size-4 text-orange-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {hte.status === 'active'
                                                            ? 'Archive inactive HTEs only'
                                                            : 'Archive to collection'}
                                                    </TooltipContent>
                                                </Tooltip>
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
                    </div>
                )}
            </div>

            <Dialog open={editingHte !== null} onOpenChange={(open) => !open && setEditingHte(null)}>
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
                                />
                                <InputError message={editForm.errors.address} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_contact_number">Contact Number</Label>
                                <Input
                                    id="edit_contact_number"
                                    value={editForm.data.contact_number}
                                    onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                />
                                <InputError message={editForm.errors.contact_number} />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingHte(null)} type="button">
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

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                            />
                            <InputError message={addForm.errors.address} />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="contact_number">Contact Number</Label>
                            <Input
                                id="contact_number"
                                value={addForm.data.contact_number}
                                onChange={(e) => addForm.setData('contact_number', e.target.value)}
                            />
                            <InputError message={addForm.errors.contact_number} />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddOpen(false)} type="button">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addForm.processing}>
                                Create HTE
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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