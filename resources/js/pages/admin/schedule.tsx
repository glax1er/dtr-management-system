import { Head, router } from '@inertiajs/react';
import { Calendar, CalendarDays, Clock, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
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
import { cn } from '@/lib/utils';
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
    const handleSetAllWeekdays = (time: string) => {
        const updated = { ...form.daySchedule };
        (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).forEach(
            (day) => {
                updated[day] = time;
            }
        );
        onChange({ daySchedule: updated });
    };

    const handleClearAll = () => {
        const cleared = Object.fromEntries(DAYS.map((d) => [d, '']));
        onChange({ daySchedule: cleared });
    };

    return (
        <div className="flex flex-col gap-5 py-2">
            {/* Section 1: Period Details */}
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="size-3.5" />
                    <span>Period Details</span>
                </div>

                {/* Period Name */}
                <div className="grid gap-1.5">
                    <Label htmlFor="period-name" className="text-sm font-medium">
                        Period Name <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                        id="period-name"
                        value={form.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="e.g. 1st Semester AY 2026-2027, Summer Term"
                        className="h-9"
                    />
                </div>

                {/* Date range in 2 spacious columns */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="start-date" className="text-sm font-medium">
                            Start Date <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            id="start-date"
                            date={form.startDate}
                            onDateChange={(d) => onChange({ startDate: d })}
                            placeholder="Select start date"
                            maxDate={form.endDate || undefined}
                            clearable
                            className="h-9"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="end-date" className="text-sm font-medium">
                            End Date <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            id="end-date"
                            date={form.endDate}
                            onDateChange={(d) => onChange({ endDate: d })}
                            placeholder="Select end date"
                            minDate={form.startDate || undefined}
                            clearable
                            className="h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Section 2: Daily Expected Start Time */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Clock className="size-4 text-primary" />
                            Expected Start Times
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Set arrival time for workdays. Days left blank are rest / off days.
                        </p>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetAllWeekdays('08:00')}
                            className="h-7 text-xs px-2 gap-1 rounded-md text-muted-foreground hover:text-foreground"
                        >
                            <Sparkles className="size-3 text-primary" />
                            Mon–Fri 8:00 AM
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Day schedule cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DAYS.map((day) => {
                        const isSet = Boolean(form.daySchedule[day]);
                        const isWeekend = day === 'saturday' || day === 'sunday';

                        return (
                            <div
                                key={day}
                                className={cn(
                                    "flex items-center justify-between rounded-xl border p-2.5 px-3.5 transition-all gap-3",
                                    isSet
                                        ? "border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-xs"
                                        : "border-border bg-background/60 hover:bg-muted/30"
                                )}
                            >
                                <div className="flex items-center gap-2.5 min-w-28">
                                    <span
                                        className={cn(
                                            "size-2 rounded-full shrink-0",
                                            isSet
                                                ? "bg-primary"
                                                : "bg-muted-foreground/30"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium leading-none">
                                            {DAY_LABELS[day]}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-0.5">
                                            {isWeekend ? 'Weekend' : 'Weekday'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                                    <Input
                                        type="time"
                                        value={form.daySchedule[day] ?? ''}
                                        onChange={(e) =>
                                            onChange({
                                                daySchedule: {
                                                    ...form.daySchedule,
                                                    [day]: e.target.value,
                                                },
                                            })
                                        }
                                        className={cn(
                                            "h-8 text-xs rounded-lg px-2 bg-background",
                                            isSet
                                                ? "font-medium text-foreground border-primary/30"
                                                : "text-muted-foreground border-input"
                                        )}
                                    />
                                    {isSet && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange({
                                                    daySchedule: {
                                                        ...form.daySchedule,
                                                        [day]: '',
                                                    },
                                                })
                                            }
                                            className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted cursor-pointer"
                                            title="Clear day"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                <DialogContent className="max-h-[92vh] sm:max-w-2xl overflow-y-auto p-6 gap-5">
                    <DialogHeader className="gap-1.5 pb-3 border-b">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                                <CalendarDays className="size-5" />
                            </span>
                            Add Schedule Period
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Set the effective date range and expected arrival time for each workday.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={addForm}
                        onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
                    />
                    <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setAddOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitAdd}>Save Period</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit dialog ──────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[92vh] sm:max-w-2xl overflow-y-auto p-6 gap-5">
                    <DialogHeader className="gap-1.5 pb-3 border-b">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                                <CalendarDays className="size-5" />
                            </span>
                            Edit Schedule Period
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Update the date range or expected start times for each day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={editForm}
                        onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                    />
                    <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
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