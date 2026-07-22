import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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

interface HtesIndexProps {
    htes: Hte[];
}

export default function HtesIndex({ htes }: HtesIndexProps) {
    const [addOpen, setAddOpen] = useState(false);
    // tracks which HTE's edit dialog is open (null = none open)
    const [editingHte, setEditingHte] = useState<Hte | null>(null);

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

    return (
        <>
            <Head title="HTEs" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Host Training Establishments</h1>
                        <p className="text-muted-foreground text-sm">Manage HTEs that interns and supervisors are assigned to.</p>
                    </div>

                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button>Add HTE</Button>
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
                        <CardTitle>All HTEs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {htes.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No HTEs yet.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {htes.map((hte) => (
                                    <div key={hte.hte_id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium">{hte.hte_name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {hte.address ?? 'No address'}
                                                {hte.contact_number && ` · ${hte.contact_number}`}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Contact: {hte.contact_person ?? 'No supervisor assigned yet'}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                {hte.interns_count} intern{hte.interns_count !== 1 && 's'} ·{' '}
                                                {hte.supervisors_count} supervisor{hte.supervisors_count !== 1 && 's'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEditDialog(hte)}>
                                                Edit
                                            </Button>

                                            <Select
                                                value={hte.status}
                                                onValueChange={(value) => {
                                                    router.patch(
                                                        `/admin/htes/${hte.hte_id}/status`,
                                                        { status: value },
                                                        { preserveScroll: true },
                                                    );
                                                }}
                                            >
                                                <SelectTrigger className="w-27.5">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Active</SelectItem>
                                                    <SelectItem value="inactive">Inactive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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