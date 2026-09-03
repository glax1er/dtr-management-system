import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    CalendarClock,
    Clock,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;
const DAY_LABELS: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

// ── Types ────────────────────────────────────────────────────────────────────
interface SchedulePeriod {
    id: number;
    name: string | null;
    start_date: string;
    end_date: string;
    day_schedule: Record<string, string | null>;
    scope?: 'global' | 'hte';
}

interface ScheduleProps {
    periods: SchedulePeriod[];
    globalPeriods: SchedulePeriod[];
    highlightId?: number | null;
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
    daySchedule: Object.fromEntries(
        DAYS.map((d) => [d, p.day_schedule?.[d] ?? '']),
    ),
});

const buildPayload = (form: FormState) =>
    Object.fromEntries(DAYS.map((d) => [d, form.daySchedule[d] || null]));

function formatTime12(time: string | null | undefined): string {
    if (!time) {
        return '—';
    }

    try {
        const [hStr, mStr] = time.split(':');
        const h = Number(hStr);
        const m = Number(mStr);
        if (isNaN(h) || isNaN(m)) return time;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;

        return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    } catch {
        return time;
    }
}

const isPast = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return false;
    const date = new Date(y, m - 1, d);
    return date < today;
};

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
        (
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
        ).forEach((day) => {
            updated[day] = time;
        });
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
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Calendar className="size-3.5" />
                    <span>Override Period Details</span>
                </div>

                {/* Period Name */}
                <div className="grid gap-1.5">
                    <Label
                        htmlFor="override-name"
                        className="text-sm font-medium"
                    >
                        Period Name{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                            (optional)
                        </span>
                    </Label>
                    <Input
                        id="override-name"
                        value={form.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="e.g. Midterm Period, Special Project Week"
                        className="h-9"
                    />
                </div>

                {/* Date range in 2 spacious columns */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="override-start-date"
                            className="text-sm font-medium"
                        >
                            Start Date{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            id="override-start-date"
                            date={form.startDate}
                            onDateChange={(d) => onChange({ startDate: d })}
                            placeholder="Select start date"
                            maxDate={form.endDate || undefined}
                            clearable
                            className="h-9"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="override-end-date"
                            className="text-sm font-medium"
                        >
                            End Date <span className="text-destructive">*</span>
                        </Label>
                        <DatePicker
                            id="override-end-date"
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
                        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock className="size-4 text-primary" />
                            Expected Start Times
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Set arrival time for workdays. Days left blank will
                            follow normal schedule.
                        </p>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetAllWeekdays('08:00')}
                            className="h-7 gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Sparkles className="size-3 text-primary" />
                            Mon–Fri 8:00 AM
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Day schedule cards */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {DAYS.map((day) => {
                        const isSet = Boolean(form.daySchedule[day]);
                        const isWeekend =
                            day === 'saturday' || day === 'sunday';

                        return (
                            <div
                                key={day}
                                className={cn(
                                    'flex items-center justify-between gap-3 rounded-xl border p-2.5 px-3.5 transition-all',
                                    isSet
                                        ? 'border-primary/40 bg-primary/5 shadow-xs dark:bg-primary/10'
                                        : 'border-border bg-background/60 hover:bg-muted/30',
                                )}
                            >
                                <div className="flex min-w-28 items-center gap-2.5">
                                    <span
                                        className={cn(
                                            'size-2 shrink-0 rounded-full',
                                            isSet
                                                ? 'bg-primary'
                                                : 'bg-muted-foreground/30',
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm leading-none font-medium">
                                            {DAY_LABELS[day]}
                                        </span>
                                        <span className="mt-0.5 text-[10px] text-muted-foreground">
                                            {isWeekend ? 'Weekend' : 'Weekday'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex max-w-[140px] flex-1 items-center gap-1.5">
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
                                            'h-8 rounded-lg bg-background px-2 text-xs',
                                            isSet
                                                ? 'border-primary/30 font-medium text-foreground'
                                                : 'border-input text-muted-foreground',
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
                                            className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
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

// ── Shared period row ────────────────────────────────────────────────────────
function PeriodRow({
    period,
    readOnly,
    isHighlighted,
    onEdit,
    onDelete,
}: {
    period: SchedulePeriod;
    readOnly: boolean;
    isHighlighted?: boolean;
    onEdit?: (period: SchedulePeriod) => void;
    onDelete?: (period: SchedulePeriod) => void;
}) {
    return (
        <div
            id={`schedule-period-${period.id}`}
            className={cn(
                'rounded-lg border p-4 transition-all duration-300',
                isHighlighted
                    ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary dark:bg-primary/10'
                    : 'bg-card',
            )}
        >
            {/* Period header */}
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                            {period.name || 'Unnamed period'}
                        </p>
                        {isHighlighted && (
                            <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                <Sparkles className="size-3" />
                                Updated / Focus
                            </Badge>
                        )}
                        {readOnly && (
                            <Badge variant="secondary" className="font-normal">
                                Global (Admin)
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {period.start_date} – {period.end_date}
                        {isPast(period.end_date) && (
                            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                                Past
                            </span>
                        )}
                    </p>
                </div>
                {!readOnly && !isPast(period.end_date) && (
                    <div className="flex shrink-0 gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit?.(period)}
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
                                    onClick={() => onDelete?.(period)}
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
                            {formatTime12(period.day_schedule?.[day] ?? null)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupervisorSchedule({
    periods,
    globalPeriods,
    highlightId,
}: ScheduleProps) {
    const [processing, setProcessing] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<FormState>(emptyForm);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(emptyForm);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState('');

    // Scroll to and briefly highlight the period indicated by the notification
    useEffect(() => {
        if (!highlightId) return;

        const el = document.getElementById(`schedule-period-${highlightId}`);
        if (!el) return;

        // Wait one tick so the DOM has finished rendering
        const raf = requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        return () => cancelAnimationFrame(raf);
    }, [highlightId]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const submitAdd = () => {
        if (!addForm.startDate || !addForm.endDate) {
            toast.error('Start date and end date are required.');

            return;
        }

        setProcessing(true);
        router.post(
            '/supervisor/schedule',
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
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            'Could not create override period.',
                    );
                },
                onFinish: () => setProcessing(false),
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

        setProcessing(true);
        router.patch(
            `/supervisor/schedule/${editingId}`,
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
                onError: (errors) => {
                    toast.error(
                        Object.values(errors)[0] ??
                            'Could not update override period.',
                    );
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const openDelete = (period: SchedulePeriod) => {
        setDeleteId(period.id);
        setDeleteName(period.name || 'this override');
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (deleteId === null) {
            return;
        }

        setProcessing(true);
        router.delete(`/supervisor/schedule/${deleteId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteOpen(false);
                setDeleteId(null);
                setDeleteName('');
            },
            onError: (errors) => {
                toast.error(
                    Object.values(errors)[0] ??
                        'Could not delete override period.',
                );
            },
            onFinish: () => setProcessing(false),
        });
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            <Head title="HTE Schedule" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <CalendarClock className="size-5" />
                            </span>
                            HTE Schedule
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Global periods (set by admin) apply to your interns
                            by default. Add an override if your HTE differs.
                        </p>
                    </div>

                    <Button onClick={() => setAddOpen(true)}>
                        <Plus className="size-4" />
                        <span>Add Override</span>
                    </Button>
                </div>

                {/* Global schedule (reference) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            Global Schedule (Reference)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {globalPeriods.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No global schedule configured yet.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {globalPeriods.map((period) => (
                                    <PeriodRow
                                        key={period.id}
                                        period={period}
                                        readOnly
                                        isHighlighted={
                                            highlightId === period.id
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* HTE overrides */}
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">
                            Your HTE Overrides
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {periods.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No overrides set — your HTE currently follows
                                the global schedule above.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {periods.map((period) => (
                                    <PeriodRow
                                        key={period.id}
                                        period={period}
                                        readOnly={false}
                                        isHighlighted={
                                            highlightId === period.id
                                        }
                                        onEdit={openEdit}
                                        onDelete={openDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Add dialog ───────────────────────────────────────────────── */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
                    <DialogHeader className="gap-1.5 border-b pb-3">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                                <Calendar className="size-5" />
                            </span>
                            Add Override Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            Set custom date ranges and daily expected start
                            times specifically for your HTE.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={addForm}
                        onChange={(patch) =>
                            setAddForm((f) => ({ ...f, ...patch }))
                        }
                    />
                    <DialogFooter className="gap-2 border-t pt-3 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setAddOpen(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitAdd} disabled={processing}>
                            {processing ? 'Saving...' : 'Save Override'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit dialog ──────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
                    <DialogHeader className="gap-1.5 border-b pb-3">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                                <Calendar className="size-5" />
                            </span>
                            Edit Override Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            Update the date range or expected start times for
                            each day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={editForm}
                        onChange={(patch) =>
                            setEditForm((f) => ({ ...f, ...patch }))
                        }
                    />
                    <DialogFooter className="gap-2 border-t pt-3 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitEdit} disabled={processing}>
                            {processing ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation ──────────────────────────────────────── */}
            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Override Period"
                description={`Delete "${deleteName}"? This cannot be undone.`}
                onConfirm={submitDelete}
                confirmText="Delete"
                isDestructive
                isLoading={processing}
            />
        </>
    );
}

SupervisorSchedule.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Schedule', href: '/supervisor/schedule' },
    ],
};
