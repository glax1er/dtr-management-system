import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function HtesIndex({ htes, filters }: HtesIndexProps) {
    const [addOpen, setAddOpen] = useState(false);
    // tracks which HTE's edit dialog is open (null = none open)
    const [editingHte, setEditingHte] = useState<Hte | null>(null);
    const [search, setSearch] = useState(filters.search);

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

    // Base params shared by every navigation action. A search change
    // resets back to page 1 by simply omitting the page param.
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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Host Training Establishments</h1>
                        <p className="text-muted-foreground text-sm">Manage HTEs that interns and supervisors are assigned to.</p>
                    </div>

                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">Add HTE</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleAddSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Add HTE</DialogTitle>
                                    <DialogDescription>
                                        This HTE will become available for assigning interns and supervisors.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="hte_name">Name</Label>
                                        <Input
                                            id="hte_name"
                                            value={addForm.data.hte_name}
                                            onChange={(e) => addForm.setData('hte_name', e.target.value)}
                                            required
                                        />
                                        <InputError message={addForm.errors.hte_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={addForm.data.address}
                                            onChange={(e) => addForm.setData('address', e.target.value)}
                                        />
                                        <InputError message={addForm.errors.address} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="contact_number">Contact number</Label>
                                        <Input
                                            id="contact_number"
                                            value={addForm.data.contact_number}
                                            onChange={(e) => addForm.setData('contact_number', e.target.value)}
                                        />
                                        <InputError message={addForm.errors.contact_number} />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="submit" disabled={addForm.processing}>
                                        Create HTE
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">All HTEs</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <form onSubmit={applySearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="hte-search" className="text-xs text-muted-foreground">
                                    Search by HTE name
                                </Label>
                                <Input
                                    id="hte-search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="e.g. Acme Corporation"
                                    className="w-full sm:w-64"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" variant="secondary" size="sm">
                                    Search
                                </Button>
                                {filters.search !== '' && (
                                    <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </form>

                        {htes.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No HTEs match{filters.search !== '' ? ' this search.' : ' yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">Address</th>
                                            <th className="py-2 pr-4 font-medium">Contact</th>
                                            <th className="py-2 pr-4 font-medium">Interns</th>
                                            <th className="py-2 pr-4 font-medium">Supervisors</th>
                                            <th className="py-2 font-medium">Status</th>
                                            <th className="py-2 pl-4 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {htes.data.map((hte) => (
                                            <tr key={hte.hte_id} className="border-b last:border-0 hover:bg-muted/40">
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                    {hte.hte_name}
                                                </td>
                                                <td
                                                    className="max-w-[180px] truncate py-2.5 pr-4"
                                                    title={hte.address ?? undefined}
                                                >
                                                    {hte.address ?? 'No address'}
                                                </td>
                                                <td className="max-w-[180px] py-2.5 pr-4">
                                                    <p
                                                        className="truncate"
                                                        title={hte.contact_person ?? undefined}
                                                    >
                                                        {hte.contact_person ?? 'No supervisor assigned'}
                                                    </p>
                                                    {hte.contact_number && (
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {hte.contact_number}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {hte.interns_count}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {hte.supervisors_count}
                                                </td>
                                                <td className="py-2.5">
                                                    <Select
                                                        value={hte.status}
                                                        onValueChange={(value) => {
                                                            router.patch(
                                                                `/admin/htes/${hte.hte_id}/status`,
                                                                { status: value },
                                                                { preserveScroll: true, preserveState: true },
                                                            );
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8 w-[7.5rem]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="active">Active</SelectItem>
                                                            <SelectItem value="inactive">Inactive</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-2.5 pl-4">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(hte)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationFooter
                            meta={htes}
                            itemLabel="HTE"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="htes-per-page"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Edit dialog — opened per-row via openEditDialog(hte) */}
            <Dialog open={editingHte !== null} onOpenChange={(open) => !open && setEditingHte(null)}>
                <DialogContent>
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit HTE</DialogTitle>
                            <DialogDescription>Update this HTE's details.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_hte_name">Name</Label>
                                <Input
                                    id="edit_hte_name"
                                    value={editForm.data.hte_name}
                                    onChange={(e) => editForm.setData('hte_name', e.target.value)}
                                    required
                                />
                                <InputError message={editForm.errors.hte_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_address">Address</Label>
                                <Input
                                    id="edit_address"
                                    value={editForm.data.address}
                                    onChange={(e) => editForm.setData('address', e.target.value)}
                                />
                                <InputError message={editForm.errors.address} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_contact_number">Contact number</Label>
                                <Input
                                    id="edit_contact_number"
                                    value={editForm.data.contact_number}
                                    onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                />
                                <InputError message={editForm.errors.contact_number} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={editForm.processing}>
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

HtesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'HTEs', href: '/admin/htes' },
    ],
};
