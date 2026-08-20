import { Head, router } from '@inertiajs/react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dashboard } from '@/routes';

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

// ── Types ────────────────────────────────────────────────────────────────────
interface SchedulePeriod {
    id: number;
    name: string | null;
    start_date: string;
    end_date: string;
    day_schedule: Record<string, string | null>;
}

interface FormState {
    name: string;
    startDate: string;
    endDate: string;
    daySchedule: Record<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const emptyForm = (): FormState => ({
    name: '',
    startDate: '',
    endDate: '',
    daySchedule: Object.fromEntries(DAYS.map((d) => [d, ''])),
});

const formFromPeriod = (p: SchedulePeriod): FormState => ({
    name: p.name ?? '',
    startDate: p.start_date,
    endDate: p.end_date,
    daySchedule: Object.fromEntries(DAYS.map((d) => [d, p.day_schedule[d] ?? ''])),
});

const buildPayload = (form: FormState) =>
    Object.fromEntries(DAYS.map((d) => [d, form.daySchedule[d] || null]));

function formatTime12(time: string | null): string {
    if (!time) return '—';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${period}`;
}

const isPast = (dateStr: string) =>
    new Date(dateStr) < new Date(new Date().toDateString());

// ── Shared form fields ────────────────────────────────────────────────────────
function PeriodForm({
    form,
    onChange,
}: {
    form: FormState;
    onChange: (patch: Partial<FormState>) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            {/* Date range + name */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                    <Label>Name <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                        value={form.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="e.g. Off-semester AY 2026-2027"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label>Start Date</Label>
                    <Input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => onChange({ startDate: e.target.value })}
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label>End Date</Label>
                    <Input
                        type="date"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        onChange={(e) => onChange({ endDate: e.target.value })}
                    />
                </div>
            </div>

            {/* Day schedule */}
            <div className="grid gap-2 sm:grid-cols-2">
                {DAYS.map((day) => (
                    <div key={day} className="flex items-center rounded-lg border bg-background px-3 py-1">
                        <span className="w-24 shrink-0 text-sm font-medium">{DAY_LABELS[day]}</span>
                        <Input
                            type="time"
                            value={form.daySchedule[day]}
                            onChange={(e) =>
                                onChange({ daySchedule: { ...form.daySchedule, [day]: e.target.value } })
                            }
                            className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-xs"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSchedule({ periods }: { periods: SchedulePeriod[] }) {
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<FormState>(emptyForm);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(emptyForm);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState('');

    // ── Handlers ───────────────────────────────────────────────────────────
    const submitAdd = () => {
        if (!addForm.startDate || !addForm.endDate) {
            toast.error('Start date and end date are required.');
            return;
        }
        router.post(
            '/admin/schedule',
            {
                name: addForm.name || undefined,
                start_date: addForm.startDate,
                end_date: addForm.endDate,
                day_schedule: buildPayload(addForm),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setAddForm(emptyForm());
                },
            },
        );
    };

    const openEdit = (period: SchedulePeriod) => {
        setEditingId(period.id);
        setEditForm(formFromPeriod(period));
        setEditOpen(true);
    };

    const submitEdit = () => {
        if (!editingId || !editForm.startDate || !editForm.endDate) {
            toast.error('Start date and end date are required.');
            return;
        }
        router.patch(
            `/admin/schedule/${editingId}`,
            {
                name: editForm.name || undefined,
                start_date: editForm.startDate,
                end_date: editForm.endDate,
                day_schedule: buildPayload(editForm),
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

    const openDelete = (period: SchedulePeriod) => {
        setDeleteId(period.id);
        setDeleteName(period.name ?? 'this period');
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (deleteId === null) return;
        router.delete(`/admin/schedule/${deleteId}`, { preserveScroll: true });
        setDeleteOpen(false);
        setDeleteId(null);
        setDeleteName('');
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="Global Schedule" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <CalendarDays className="size-5" />
                        </span>
                        Global Schedule
                    </h1>

                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">Add Period</span>
                    </Button>
                </div>

                {/* Existing periods */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">Schedule Periods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {periods.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No schedule periods configured yet.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {periods.map((period) => (
                                    <div key={period.id} className="rounded-lg border p-4">
                                        {/* Period header */}
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium">
                                                    {period.name ?? 'Unnamed period'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {period.start_date} – {period.end_date}
                                                    {isPast(period.end_date) && (
                                                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                                            Past
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {!isPast(period.end_date) && (
                                                <div className="flex shrink-0 gap-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEdit(period)}
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
                                                                onClick={() => openDelete(period)}
                                                            >
                                                                <Trash2 className="size-4 text-destructive" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </div>

                                        {/* Day schedule grid */}
                                        <div className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-4">
                                            {DAYS.map((day) => (
                                                <div
                                                    key={day}
                                                    className="flex justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5"
                                                >
                                                    <span className="text-muted-foreground">
                                                        {DAY_LABELS[day].slice(0, 3)}
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        {formatTime12(period.day_schedule[day])}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Add dialog ───────────────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Schedule Period</DialogTitle>
                        <DialogDescription>
                            Set the date range and expected start time for each day of the week.
                            Leave a day blank if there's no work that day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={addForm}
                        onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitAdd}>Save Period</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit dialog ──────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Period</DialogTitle>
                        <DialogDescription>
                            Update the date range or expected start times for each day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={editForm}
                        onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation ──────────────────────────────────────── */}
            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Schedule Period"
                description={`Delete "${deleteName}"? This cannot be undone.`}
                onConfirm={submitDelete}
                confirmText="Delete"
            />
        </>
    );
}

AdminSchedule.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Schedule', href: '/admin/schedule' },
    ],
};