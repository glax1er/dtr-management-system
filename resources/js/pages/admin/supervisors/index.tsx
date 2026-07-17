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
}

interface Supervisor {
    user_id: number;
    name: string;
    email: string;
    hte_name: string;
    status: 'active' | 'inactive';
}

interface SupervisorsIndexProps {
    supervisors: Supervisor[];
    htes: Hte[];
}

export default function SupervisorsIndex({ supervisors, htes }: SupervisorsIndexProps) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        hte_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/supervisors', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    return (
        <>
            <Head title="Supervisors" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Supervisors</h1>
                        <p className="text-muted-foreground text-sm">Manage supervisor accounts and their assigned HTE.</p>
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Add Supervisor</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Add Supervisor</DialogTitle>
                                    <DialogDescription>
                                        A default password will be assigned. The supervisor can change it after logging in.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
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
                        <CardTitle>All Supervisors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {supervisors.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No supervisors yet.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {supervisors.map((supervisor) => (
                                    <div
                                        key={supervisor.user_id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{supervisor.name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {supervisor.email} · {supervisor.hte_name}
                                            </p>
                                        </div>
                                        <Select
                                            value={supervisor.status}
                                            onValueChange={(value) => {
                                                router.patch(`/admin/supervisors/${supervisor.user_id}/status`, { status: value }, { preserveScroll: true });
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
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Supervisors', href: '/admin/supervisors' },
    ],
};