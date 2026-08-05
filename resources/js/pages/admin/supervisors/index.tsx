import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
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

const ALL_TYPES = 'all';

export default function SupervisorsIndex({ supervisors, htes, programs, filters }: SupervisorsIndexProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters.search);
    const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        supervisor_type: 'hte',
        hte_id: '',
        program_id: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        hte_id: '',
        program_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const url = data.supervisor_type === 'ojt' ? '/admin/supervisors/ojt' : '/admin/supervisors';

        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    const openEditDialog = (supervisor: Supervisor) => {
        editForm.setData({
            name: supervisor.name,
            email: supervisor.email,
            hte_id: supervisor.hte_id ? String(supervisor.hte_id) : '',
            program_id: supervisor.program_id ? String(supervisor.program_id) : '',
        });
        setEditingSupervisor(supervisor);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSupervisor) return;

        editForm.patch(`/admin/supervisors/${editingSupervisor.user_id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingSupervisor(null);
            },
        });
    };

    const deleteSupervisor = (userId: number, name: string) => {
        if (confirm(`Permanently delete ${name}'s supervisor record? This cannot be undone from the UI.`)) {
            router.delete(`/admin/supervisors/${userId}`, { preserveScroll: true });
        }
    };

    const baseParams = () => ({
        search: filters.search || undefined,
        type: filters.type ?? undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/supervisors', params, { preserveState: true, preserveScroll: true });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
    };

    const changeType = (value: string) => {
        visit({ ...baseParams(), type: value === ALL_TYPES ? undefined : value });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage) });
    };

    const changeStatus = (userId: number, status: string) => {
        router.patch(`/admin/supervisors/${userId}/status`, { status }, { preserveScroll: true, preserveState: true });
    };

    return (
        <>
            <Head title="Supervisors" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Supervisors</h1>
                        <p className="text-muted-foreground text-sm">Manage supervisor accounts and their assigned HTE.</p>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">Add Supervisor</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Add Supervisor</DialogTitle>
                                    <DialogDescription>
                                        Create either an HTE Supervisor or an OJT Supervisor. The supervisor will receive a default password and can change it after logging in.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="supervisor_type">Supervisor type</Label>
                                        <Select
                                            value={data.supervisor_type}
                                            onValueChange={(value) => setData('supervisor_type', value as 'hte' | 'ojt')}
                                            required
                                        >
                                            <SelectTrigger id="supervisor_type" className="w-full">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hte">HTE Supervisor</SelectItem>
                                                <SelectItem value="ojt">OJT Supervisor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    {data.supervisor_type === 'hte' ? (
                                        <div className="grid gap-2">
                                            <Label htmlFor="hte_id">Host training establishment</Label>
                                            <Select
                                                value={data.hte_id}
                                                onValueChange={(value) => setData('hte_id', value)}
                                                required
                                            >
                                                <SelectTrigger id="hte_id" className="w-full">
                                                    <SelectValue placeholder="Select HTE" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {htes.map((hte) => (
                                                        <SelectItem key={hte.hte_id} value={String(hte.hte_id)}>
                                                            {hte.hte_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.hte_id} />
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <Label htmlFor="program_id">Program</Label>
                                            <Select
                                                value={data.program_id}
                                                onValueChange={(value) => setData('program_id', value)}
                                                required
                                            >
                                                <SelectTrigger id="program_id" className="w-full">
                                                    <SelectValue placeholder="Select program" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {programs.map((program) => (
                                                        <SelectItem key={program.program_id} value={String(program.program_id)}>
                                                            {program.program_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.program_id} />
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button type="submit" disabled={processing}>
                                        Create Supervisor
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">All Supervisors</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <form
                            onSubmit={applySearch}
                            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="search" className="text-xs text-muted-foreground">
                                        Search by name or email
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="search"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="w-full sm:w-56"
                                        />
                                        <Button type="submit" variant="secondary" size="sm" className="shrink-0">
                                            Search
                                        </Button>
                                        {filters.search !== '' && (
                                            <Button type="button" variant="ghost" size="sm" onClick={clearSearch} className="shrink-0">
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="type-filter" className="text-xs text-muted-foreground">
                                        Supervisor type
                                    </Label>
                                    <Select value={filters.type ?? ALL_TYPES} onValueChange={changeType}>
                                        <SelectTrigger id="type-filter" className="w-full sm:w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_TYPES}>All types</SelectItem>
                                            <SelectItem value="hte">HTE Supervisor</SelectItem>
                                            <SelectItem value="ojt">OJT Supervisor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </form>

                        {supervisors.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No supervisors match{' '}
                                {filters.search !== '' || filters.type ? 'these filters.' : 'yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">Email</th>
                                            <th className="py-2 pr-4 font-medium">Type</th>
                                            <th className="py-2 pr-4 font-medium">Scope</th>
                                            <th className="py-2 pr-4 font-medium">Status</th>
                                            <th className="py-2 pl-4 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supervisors.data.map((supervisor) => (
                                            <tr key={supervisor.user_id} className="border-b last:border-0 hover:bg-muted/40">
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                    {supervisor.name}
                                                </td>
                                                <td className="max-w-[200px] truncate py-2.5 pr-4" title={supervisor.email}>
                                                    {supervisor.email}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    <Badge variant="outline" className="uppercase tracking-[0.08em]">
                                                        {supervisor.supervisor_type === 'ojt' ? 'OJT' : 'HTE'}
                                                    </Badge>
                                                </td>
                                                <td className="max-w-[180px] truncate py-2.5 pr-4" title={supervisor.scope_name}>
                                                    {supervisor.scope_name}
                                                </td>
                                                <td className="py-2.5 pr-4">
                                                    <Select
                                                        value={supervisor.status}
                                                        onValueChange={(value) => changeStatus(supervisor.user_id, value)}
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
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEditDialog(supervisor)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        {supervisor.status === 'inactive' && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    deleteSupervisor(supervisor.user_id, supervisor.name)
                                                                }
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationFooter
                            meta={supervisors}
                            itemLabel="supervisor"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="supervisors-per-page"
                        />
                    </CardContent>
                </Card>
            </div>

            <Dialog open={editingSupervisor !== null} onOpenChange={(open) => !open && setEditingSupervisor(null)}>
                <DialogContent>
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit Supervisor</DialogTitle>
                            <DialogDescription>Update this supervisor's account and assignment.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_sup_name">Name</Label>
                                <Input
                                    id="edit_sup_name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={editForm.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_sup_email">Email</Label>
                                <Input
                                    id="edit_sup_email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={editForm.errors.email} />
                            </div>

                            {editingSupervisor?.supervisor_type === 'hte' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit_sup_hte_id">Host training establishment</Label>
                                    <Select
                                        value={editForm.data.hte_id}
                                        onValueChange={(value) => editForm.setData('hte_id', value)}
                                        required
                                    >
                                        <SelectTrigger id="edit_sup_hte_id" className="w-full">
                                            <SelectValue placeholder="Select HTE" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {htes.map((hte) => (
                                                <SelectItem key={hte.hte_id} value={String(hte.hte_id)}>
                                                    {hte.hte_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editForm.errors.hte_id} />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit_sup_program_id">Program</Label>
                                    <Select
                                        value={editForm.data.program_id}
                                        onValueChange={(value) => editForm.setData('program_id', value)}
                                        required
                                    >
                                        <SelectTrigger id="edit_sup_program_id" className="w-full">
                                            <SelectValue placeholder="Select program" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs.map((program) => (
                                                <SelectItem key={program.program_id} value={String(program.program_id)}>
                                                    {program.program_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editForm.errors.program_id} />
                                </div>
                            )}
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

SupervisorsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Supervisors', href: '/admin/supervisors' },
    ],
};