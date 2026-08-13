import { Head, router } from '@inertiajs/react';
import { BookOpen, LayoutGrid, Pencil, Power, PowerOff, Table as TableIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Program {
    program_id: number;
    program_name: string;
    is_active: boolean;
    required_hours: number;
    approved_intern_count: number;
    ojt_supervisors: string[];
}

interface ProgramsProps {
    programs: Program[];
}

type ViewMode = 'table' | 'grid';

export default function AdminPrograms({ programs }: ProgramsProps) {
    const [view, setView] = useState<ViewMode>('table');

    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addHours, setAddHours] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editHours, setEditHours] = useState('');

    const submitAdd = () => {
        if (!addName || !addHours) {
            toast.error('Program name and required hours are required.');
            return;
        }

        router.post(
            '/admin/programs',
            { program_name: addName, required_hours: addHours },
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
        if (!editingId || !editName || !editHours) {
            toast.error('Program name and required hours are required.');
            return;
        }

        router.patch(
            `/admin/programs/${editingId}`,
            { program_name: editName, required_hours: editHours },
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

    const supervisorLabel = (names: string[]) =>
        names.length === 0 ? '—' : names.join(', ');

    return (
        <>
            <Head title="Programs" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <BookOpen className="size-5" />
                            </div>
                            <span>Programs</span>
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
                        <Button onClick={() => setAddOpen(true)}>Add Program</Button>
                    </div>
                </div>

                {programs.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No programs yet.
                        </CardContent>
                    </Card>
                ) : view === 'table' ? (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6 text-left">Program</TableHead>
                                        <TableHead className="px-6 text-center">Status</TableHead>
                                        <TableHead className="px-6 text-center">Required Hours</TableHead>
                                        <TableHead className="px-6 text-center">Approved Interns</TableHead>
                                        <TableHead className="px-6 text-center">OJT Supervisor(s)</TableHead>
                                        <TableHead className="px-6 text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {programs.map((program) => (
                                        <TableRow key={program.program_id}>
                                            <TableCell className="px-6 text-left font-medium">
                                                {program.program_name}
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <StatusBadge status={program.is_active ? 'active' : 'inactive'} />
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                {program.required_hours} hrs
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                {program.approved_intern_count}
                                            </TableCell>
                                            <TableCell className="px-6 text-center text-muted-foreground">
                                                {supervisorLabel(program.ojt_supervisors)}
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEdit(program)}
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
                                                                onClick={() => toggleActive(program)}
                                                            >
                                                                {program.is_active ? (
                                                                    <PowerOff className="size-4 text-destructive" />
                                                                ) : (
                                                                    <Power className="size-4 text-emerald-600" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {program.is_active ? 'Deactivate' : 'Activate'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {programs.map((program) => (
                            <Card key={program.program_id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-base">{program.program_name}</CardTitle>
                                            <StatusBadge
                                                status={program.is_active ? 'active' : 'inactive'}
                                            />
                                        </div>
                                        <div className="flex gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(program)}
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
                                                        onClick={() => toggleActive(program)}
                                                    >
                                                        {program.is_active ? (
                                                            <PowerOff className="size-4 text-destructive" />
                                                        ) : (
                                                            <Power className="size-4 text-emerald-600" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {program.is_active ? 'Deactivate' : 'Activate'}
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Required Hours</span>
                                        <span>{program.required_hours} hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Approved Interns</span>
                                        <span>{program.approved_intern_count}</span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <span className="shrink-0 text-muted-foreground">OJT Supervisor(s)</span>
                                        <span className="text-right">{supervisorLabel(program.ojt_supervisors)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Program</DialogTitle>
                        <DialogDescription>Create a new program with its required OJT hours.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-1.5">
                            <Label>Program Name</Label>
                            <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. BSIT" />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Required Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                value={addHours}
                                onChange={(e) => setAddHours(e.target.value)}
                                placeholder="e.g. 486"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>
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
                            Changing required hours immediately affects every enrolled intern's hours-rendered
                            progress ring.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-1.5">
                            <Label>Program Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Required Hours</Label>
                            <Input
                                type="number"
                                min={1}
                                value={editHours}
                                onChange={(e) => setEditHours(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminPrograms.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/admin/programs' },
    ],
};