import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CalendarClock,
    CalendarDays,
    Clock,
    Filter,
    Globe,
    GraduationCap,
    Lock,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

const DAY_SHORT: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
};

// ── Types ────────────────────────────────────────────────────────────────────
interface SchedulePeriod {
    id: number;
    name: string | null;
    start_date: string;
    end_date: string;
    day_schedule: Record<string, string | null>;
    college_id?: number | null;
    college?: {
        id: number;
        name: string;
        code: string;
    } | null;
    hte_id?: number | null;
    hte?: {
        id: number;
        name: string;
    } | null;
    scope?: 'global' | 'college' | 'hte';
    scope_label?: string;
    is_owner?: boolean;
}

interface ScheduleProps {
    periods: SchedulePeriod[];
    isSuperAdmin?: boolean;
    colleges?: Array<{ id: number; name: string; code: string }>;
    userCollege?: { id: number; name: string; code: string } | null;
}

interface FormState {
    name: string;
    startDate: string;
    endDate: string;
    daySchedule: Record<string, string>;
    collegeId: string;
}

type PeriodStatus = 'active' | 'upcoming' | 'past';

// ── Helpers ──────────────────────────────────────────────────────────────────
const emptyForm = (): FormState => ({
    name: '',
    startDate: '',
    endDate: '',
    daySchedule: Object.fromEntries(DAYS.map((d) => [d, ''])),
    collegeId: '',
});

const formFromPeriod = (p: SchedulePeriod): FormState => ({
    name: p.name ?? '',
    startDate: p.start_date,
    endDate: p.end_date,
    daySchedule: Object.fromEntries(
        DAYS.map((d) => [d, p.day_schedule[d] ?? '']),
    ),
    collegeId: p.college_id ? String(p.college_id) : '',
});

const buildPayload = (form: FormState) =>
    Object.fromEntries(DAYS.map((d) => [d, form.daySchedule[d] || null]));

function formatTime12(time: string | null): string {
    if (!time) {
        return '—';
    }

    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);

    if (isNaN(h) || isNaN(m)) {
        return time;
    }

    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;

    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateNice(dateStr: string | null | undefined): string {
    if (!dateStr) {
        return '—';
    }

    try {
        const [y, m, d] = dateStr.split('-').map(Number);

        if (!y || !m || !d) {
            return dateStr;
        }

        const date = new Date(y, m - 1, d);

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function getPeriodStatus(
    startDateStr: string,
    endDateStr: string,
): PeriodStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [ey, em, ed] = endDateStr.split('-').map(Number);

    if (!sy || !sm || !sd || !ey || !em || !ed) {
        return 'active';
    }

    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    if (today > end) {
        return 'past';
    }

    if (today < start) {
        return 'upcoming';
    }

    return 'active';
}

function getWorkdaysSummary(
    daySchedule: Record<string, string | null>,
): string {
    const activeDays = DAYS.filter((d) => Boolean(daySchedule[d]));

    if (activeDays.length === 0) {
        return 'No scheduled workdays';
    }

    const isMonFri =
        activeDays.length === 5 &&
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].every((d) =>
            activeDays.includes(d as (typeof DAYS)[number]),
        );

    if (isMonFri) {
        const firstTime = daySchedule.monday;
        const allSameTime = activeDays.every(
            (d) => daySchedule[d] === firstTime,
        );

        return allSameTime && firstTime
            ? `Mon – Fri • ${formatTime12(firstTime)}`
            : 'Mon – Fri';
    }

    return `${activeDays.length} workday${activeDays.length === 1 ? '' : 's'} / week`;
}

// ── Shared form fields ────────────────────────────────────────────────────────
function PeriodForm({
    form,
    onChange,
    isSuperAdmin = false,
    colleges = [],
    userCollege = null,
}: {
    form: FormState;
    onChange: (patch: Partial<FormState>) => void;
    isSuperAdmin?: boolean;
    colleges?: Array<{ id: number; name: string; code: string }>;
    userCollege?: { id: number; name: string; code: string } | null;
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
                    <span>Period Details</span>
                </div>

                {/* Scope selector for Super Admin or College notice for College Admin */}
                {isSuperAdmin ? (
                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="target-scope"
                            className="text-sm font-medium"
                        >
                            Schedule Scope{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.collegeId || 'global'}
                            onValueChange={(val) =>
                                onChange({
                                    collegeId: val === 'global' ? '' : val,
                                })
                            }
                        >
                            <SelectTrigger id="target-scope" className="h-9">
                                <SelectValue placeholder="Select target scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">
                                    University-Wide Global (Applies to all
                                    colleges)
                                </SelectItem>
                                {colleges.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.code} — {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            {form.collegeId
                                ? 'This schedule will apply to interns enrolled in this college, overriding the university-wide baseline.'
                                : 'University-wide baseline schedule. Colleges without their own global schedule will follow this.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <GraduationCap className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            This schedule will apply to all interns in{' '}
                            <strong>
                                {userCollege?.name ?? 'your college'}
                            </strong>
                            , overriding the university-wide baseline.
                        </span>
                    </div>
                )}

                {/* Period Name */}
                <div className="grid gap-1.5">
                    <Label
                        htmlFor="period-name"
                        className="text-sm font-medium"
                    >
                        Period Name{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                            (optional)
                        </span>
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
                        <Label
                            htmlFor="start-date"
                            className="text-sm font-medium"
                        >
                            Start Date{' '}
                            <span className="text-destructive">*</span>
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
                        <Label
                            htmlFor="end-date"
                            className="text-sm font-medium"
                        >
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
                        <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Clock className="size-4 text-primary" />
                            Expected Start Times
                        </Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Set arrival time for workdays. Days left blank are
                            rest / off days.
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSchedule({
    periods,
    isSuperAdmin = false,
    colleges = [],
    userCollege = null,
}: ScheduleProps) {
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<FormState>(emptyForm);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(emptyForm);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [filterScope, setFilterScope] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const highlightId =
        typeof window !== 'undefined'
            ? Number(
                  new URLSearchParams(window.location.search).get('highlight'),
              ) || null
            : null;

    // Scroll to and briefly highlight the period indicated by the notification
    useEffect(() => {
        if (!highlightId) {
            return;
        }

        const el = document.getElementById(`schedule-period-${highlightId}`);

        if (!el) {
            return;
        }

        const raf = requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        return () => cancelAnimationFrame(raf);
    }, [highlightId, periods]);

    // Derived counts
    const globalCount = useMemo(
        () =>
            periods.filter(
                (p) =>
                    p.scope === 'global' ||
                    (!p.hte_id && p.college_id === null),
            ).length,
        [periods],
    );

    const collegeCount = useMemo(
        () =>
            periods.filter(
                (p) =>
                    p.scope === 'college' ||
                    (!p.hte_id && p.college_id !== null),
            ).length,
        [periods],
    );

    const hteCount = useMemo(
        () =>
            periods.filter((p) => p.scope === 'hte' || Boolean(p.hte_id))
                .length,
        [periods],
    );

    const activeCount = useMemo(
        () =>
            periods.filter(
                (p) => getPeriodStatus(p.start_date, p.end_date) === 'active',
            ).length,
        [periods],
    );

    const upcomingCount = useMemo(
        () =>
            periods.filter(
                (p) => getPeriodStatus(p.start_date, p.end_date) === 'upcoming',
            ).length,
        [periods],
    );

    const pastCount = useMemo(
        () =>
            periods.filter(
                (p) => getPeriodStatus(p.start_date, p.end_date) === 'past',
            ).length,
        [periods],
    );

    // Filter periods based on search, scope, and status
    const filteredPeriods = useMemo(() => {
        return periods.filter((period) => {
            const isHte = period.scope === 'hte' || Boolean(period.hte_id);
            const isGlobal =
                period.scope === 'global' ||
                (!period.hte_id && period.college_id === null);
            const isCollege =
                period.scope === 'college' ||
                (!period.hte_id && period.college_id !== null);

            // Scope filter
            if (isSuperAdmin) {
                if (filterScope === 'global' && !isGlobal) {
                    return false;
                }

                if (filterScope === 'hte' && !isHte) {
                    return false;
                }

                if (
                    filterScope !== 'all' &&
                    filterScope !== 'global' &&
                    filterScope !== 'hte' &&
                    String(period.college_id) !== filterScope
                ) {
                    return false;
                }
            } else {
                // For College Admin: 'all', 'college' (own college), 'hte' (HTE overrides), 'global' (baseline fallback)
                if (filterScope === 'college' && !isCollege) {
                    return false;
                }

                if (filterScope === 'hte' && !isHte) {
                    return false;
                }

                if (filterScope === 'global' && !isGlobal) {
                    return false;
                }
            }

            // Status filter
            const status = getPeriodStatus(period.start_date, period.end_date);

            if (filterStatus !== 'all' && status !== filterStatus) {
                return false;
            }

            // Search filter
            if (search.trim() !== '') {
                const q = search.toLowerCase();
                const nameMatch = (period.name ?? '').toLowerCase().includes(q);
                const codeMatch = (period.college?.code ?? '')
                    .toLowerCase()
                    .includes(q);
                const collegeNameMatch = (period.college?.name ?? '')
                    .toLowerCase()
                    .includes(q);
                const hteMatch = (period.hte?.name ?? '')
                    .toLowerCase()
                    .includes(q);
                const dateMatch =
                    period.start_date.includes(q) ||
                    period.end_date.includes(q);

                if (
                    !nameMatch &&
                    !codeMatch &&
                    !collegeNameMatch &&
                    !hteMatch &&
                    !dateMatch
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [periods, filterScope, filterStatus, search, isSuperAdmin]);

    const hasActiveFilters =
        search.trim() !== '' || filterScope !== 'all' || filterStatus !== 'all';

    const handleResetFilters = () => {
        setSearch('');
        setFilterScope('all');
        setFilterStatus('all');
    };

    // ── Handlers ───────────────────────────────────────────────────────────
    const submitAdd = () => {
        if (!addForm.startDate || !addForm.endDate) {
            toast.error('Start date and end date are required.');

            return;
        }

        const payload: Record<string, any> = {
            name: addForm.name || undefined,
            start_date: addForm.startDate,
            end_date: addForm.endDate,
            day_schedule: buildPayload(addForm),
        };

        if (isSuperAdmin) {
            payload.college_id = addForm.collegeId
                ? Number(addForm.collegeId)
                : null;
        }

        router.post('/admin/schedule', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setAddOpen(false);
                setAddForm(emptyForm());
            },
        });
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

        const payload: Record<string, any> = {
            name: editForm.name || undefined,
            start_date: editForm.startDate,
            end_date: editForm.endDate,
            day_schedule: buildPayload(editForm),
        };

        if (isSuperAdmin) {
            payload.college_id = editForm.collegeId
                ? Number(editForm.collegeId)
                : null;
        }

        router.patch(`/admin/schedule/${editingId}`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                setEditingId(null);
            },
        });
    };

    const openDelete = (period: SchedulePeriod) => {
        setDeleteId(period.id);
        setDeleteName(period.name ?? 'this period');
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (deleteId === null) {
            return;
        }

        router.delete(`/admin/schedule/${deleteId}`, { preserveScroll: true });
        setDeleteOpen(false);
        setDeleteId(null);
        setDeleteName('');
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            <Head
                title={
                    isSuperAdmin
                        ? 'Global & College Schedules'
                        : `${userCollege?.code ?? 'College'} Schedule`
                }
            />

            <div className="flex h-full flex-1 flex-col gap-5 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                                <CalendarClock className="size-5" />
                            </span>
                            {isSuperAdmin
                                ? 'Global & College Schedules'
                                : `${userCollege?.code ?? 'College'} Schedule`}
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {isSuperAdmin
                                ? 'Manage university-wide baseline schedules and college-specific schedules that override the baseline.'
                                : `Manage schedule periods for ${userCollege?.name ?? 'your college'}. Schedules you create override the university-wide baseline for your interns.`}
                        </p>
                    </div>

                    <Button
                        onClick={() => setAddOpen(true)}
                        className="gap-1.5 shadow-xs"
                    >
                        <Plus className="size-4" />
                        <span>Add Period</span>
                    </Button>
                </div>

                {/* Quick metrics summary strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarDays className="size-4.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase">
                                Total Periods
                            </p>
                            <p className="text-lg font-bold tracking-tight text-foreground">
                                {periods.length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Clock className="size-4.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase">
                                Active Now
                            </p>
                            <p className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {activeCount}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <Globe className="size-4.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase">
                                {isSuperAdmin
                                    ? 'Your Baseline'
                                    : 'Global Baseline'}
                            </p>
                            <p className="text-lg font-bold tracking-tight text-foreground">
                                {globalCount}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <GraduationCap className="size-4.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase">
                                {isSuperAdmin
                                    ? 'College Schedules'
                                    : `${userCollege?.code ?? 'Your College'}`}
                            </p>
                            <p className="text-lg font-bold tracking-tight text-foreground">
                                {collegeCount}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Building2 className="size-4.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase">
                                HTE Overrides
                            </p>
                            <p className="text-lg font-bold tracking-tight text-foreground">
                                {hteCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Periods Card & Filter Controls */}
                <Card className="flex-1 shadow-xs">
                    <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Schedule Periods
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Showing {filteredPeriods.length} of{' '}
                                {periods.length} schedule period
                                {periods.length === 1 ? '' : 's'}.
                            </CardDescription>
                        </div>

                        {/* Filter Toolbar using reusable components */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search input */}
                            <div className="relative">
                                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search periods…"
                                    className="h-9 w-44 rounded-md pr-8 pl-8 text-xs sm:w-48"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Scope Filter for Super Admin */}
                            {isSuperAdmin && colleges.length > 0 && (
                                <Select
                                    value={filterScope}
                                    onValueChange={setFilterScope}
                                >
                                    <SelectTrigger
                                        className="h-9 w-48 text-xs"
                                        aria-label="Filter schedule scope"
                                    >
                                        <Building2 className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="All Scopes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Scopes ({periods.length})
                                        </SelectItem>
                                        <SelectItem value="global">
                                            University Baseline ({globalCount})
                                        </SelectItem>
                                        {hteCount > 0 && (
                                            <SelectItem value="hte">
                                                HTE Overrides ({hteCount})
                                            </SelectItem>
                                        )}
                                        {colleges.map((c) => {
                                            const count = periods.filter(
                                                (p) =>
                                                    p.college_id === c.id &&
                                                    !p.hte_id &&
                                                    p.scope !== 'hte',
                                            ).length;

                                            return (
                                                <SelectItem
                                                    key={c.id}
                                                    value={String(c.id)}
                                                >
                                                    {c.code} ({count})
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Scope Filter for College Admin (Distinguishes Your College vs Baseline vs HTE Overrides) */}
                            {!isSuperAdmin && (
                                <Select
                                    value={filterScope}
                                    onValueChange={setFilterScope}
                                >
                                    <SelectTrigger
                                        className="h-9 w-52 text-xs"
                                        aria-label="Filter schedule ownership"
                                    >
                                        <GraduationCap className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="All Schedules" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Schedules ({periods.length})
                                        </SelectItem>
                                        <SelectItem value="college">
                                            Your College Schedules (
                                            {collegeCount})
                                        </SelectItem>
                                        <SelectItem value="hte">
                                            HTE Overrides ({hteCount})
                                        </SelectItem>
                                        <SelectItem value="global">
                                            University Baseline ({globalCount})
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Status Filter (using reusable Select) */}
                            <Select
                                value={filterStatus}
                                onValueChange={setFilterStatus}
                            >
                                <SelectTrigger
                                    className="h-9 w-36 text-xs"
                                    aria-label="Filter schedule status"
                                >
                                    <Filter className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status ({periods.length})
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active Now ({activeCount})
                                    </SelectItem>
                                    <SelectItem value="upcoming">
                                        Upcoming ({upcomingCount})
                                    </SelectItem>
                                    <SelectItem value="past">
                                        Past ({pastCount})
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Reset filters button */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="mr-1 size-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-5">
                        {filteredPeriods.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Calendar className="size-6" />
                                </div>
                                <h4 className="mt-3 text-sm font-semibold text-foreground">
                                    {hasActiveFilters
                                        ? 'No matching schedule periods'
                                        : 'No schedule periods configured'}
                                </h4>
                                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                    {hasActiveFilters
                                        ? 'Try adjusting your search query, scope, or status filter to find what you are looking for.'
                                        : 'Get started by clicking "Add Period" above to configure baseline or college schedule periods.'}
                                </p>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="mt-4 text-xs"
                                    >
                                        <RotateCcw className="mr-1.5 size-3.5" />
                                        Clear All Filters
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {filteredPeriods.map((period) => {
                                    const isHighlighted =
                                        highlightId === period.id;
                                    const status = getPeriodStatus(
                                        period.start_date,
                                        period.end_date,
                                    );
                                    const workSummary = getWorkdaysSummary(
                                        period.day_schedule,
                                    );
                                    const isHtePeriod =
                                        period.scope === 'hte' ||
                                        Boolean(period.hte_id);
                                    const isCollegePeriod =
                                        !isHtePeriod &&
                                        period.college_id !== null;
                                    const isOwnCollegeSchedule =
                                        !isSuperAdmin && isCollegePeriod;

                                    return (
                                        <div
                                            key={period.id}
                                            id={`schedule-period-${period.id}`}
                                            className={cn(
                                                'group rounded-xl border bg-card p-4 transition-all duration-300 sm:p-5',
                                                isHighlighted
                                                    ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10'
                                                    : 'border-border/80 hover:border-border hover:shadow-xs',
                                            )}
                                        >
                                            {/* Card Top Row: Badges & Actions */}
                                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Scope & Ownership badge */}
                                                    {isHtePeriod ? (
                                                        <>
                                                            <Badge className="gap-1.5 border border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                                                                <Building2 className="size-3.5 text-purple-600 dark:text-purple-400" />
                                                                <span className="font-semibold">
                                                                    HTE Override
                                                                </span>
                                                                {period.hte
                                                                    ?.name && (
                                                                    <span className="rounded bg-purple-200/90 px-1.5 py-0.5 text-[10px] font-bold text-purple-900 dark:bg-purple-900/90 dark:text-purple-200">
                                                                        {
                                                                            period
                                                                                .hte
                                                                                .name
                                                                        }
                                                                    </span>
                                                                )}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 border-dashed text-xs text-muted-foreground"
                                                            >
                                                                <Lock className="size-3" />
                                                                HTE Managed
                                                            </Badge>
                                                        </>
                                                    ) : isOwnCollegeSchedule ? (
                                                        <>
                                                            <Badge className="gap-1.5 border border-emerald-400 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200">
                                                                <GraduationCap className="size-3.5 text-emerald-700 dark:text-emerald-400" />
                                                                <span className="font-semibold">
                                                                    Your College
                                                                    Schedule
                                                                </span>
                                                                {period.college
                                                                    ?.code && (
                                                                    <span className="rounded bg-emerald-200/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900/90 dark:text-emerald-200">
                                                                        {
                                                                            period
                                                                                .college
                                                                                .code
                                                                        }
                                                                    </span>
                                                                )}
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 border-emerald-300/80 bg-emerald-50/70 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                            >
                                                                Managed by You
                                                            </Badge>
                                                        </>
                                                    ) : isCollegePeriod ? (
                                                        <Badge className="gap-1.5 border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                            <GraduationCap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                                            <span className="font-semibold">
                                                                College Schedule
                                                            </span>
                                                            {period.college
                                                                ?.code && (
                                                                <span className="rounded bg-emerald-200/90 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900/90 dark:text-emerald-200">
                                                                    {
                                                                        period
                                                                            .college
                                                                            .code
                                                                    }
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    ) : (
                                                        <>
                                                            <Badge className="gap-1.5 border border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                                                <Globe className="size-3.5 text-sky-600 dark:text-sky-400" />
                                                                <span className="font-semibold">
                                                                    University
                                                                    Baseline
                                                                </span>
                                                                <span className="rounded bg-sky-200/90 px-1.5 py-0.5 text-[10px] font-bold text-sky-900 dark:bg-sky-900/90 dark:text-sky-200">
                                                                    {isSuperAdmin
                                                                        ? 'Your Baseline'
                                                                        : 'Global Fallback'}
                                                                </span>
                                                            </Badge>
                                                            {!isSuperAdmin && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1 border-dashed text-xs text-muted-foreground"
                                                                >
                                                                    <Lock className="size-3" />
                                                                    Read-only
                                                                    Baseline
                                                                </Badge>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Status badge */}
                                                    {status === 'active' && (
                                                        <Badge className="gap-1.5 border border-emerald-300 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                            Active Now
                                                        </Badge>
                                                    )}
                                                    {status === 'upcoming' && (
                                                        <Badge
                                                            variant="outline"
                                                            className="gap-1.5 border-sky-300 bg-sky-50 font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                                                        >
                                                            <Calendar className="size-3 text-sky-600 dark:text-sky-400" />
                                                            Upcoming
                                                        </Badge>
                                                    )}
                                                    {status === 'past' && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="gap-1 font-normal text-muted-foreground"
                                                        >
                                                            <Clock className="size-3" />
                                                            Past
                                                        </Badge>
                                                    )}

                                                    {/* Highlight indicator */}
                                                    {isHighlighted && (
                                                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                            <Sparkles className="size-3" />
                                                            Focus
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {status !== 'past' &&
                                                    period.is_owner !==
                                                        false && (
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            openEdit(
                                                                                period,
                                                                            )
                                                                        }
                                                                        className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                                                                        aria-label={`Edit ${period.name ?? 'period'}`}
                                                                    >
                                                                        <Pencil className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Edit Period
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            openDelete(
                                                                                period,
                                                                            )
                                                                        }
                                                                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                        aria-label={`Delete ${period.name ?? 'period'}`}
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Delete
                                                                    Period
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                            </div>

                                            {/* Period Title & Date Info */}
                                            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                                                <div>
                                                    <h3 className="text-base font-semibold text-foreground">
                                                        {period.name ||
                                                            (isHtePeriod
                                                                ? `${period.hte?.name ?? 'HTE'} Override Period`
                                                                : isOwnCollegeSchedule
                                                                  ? `${userCollege?.code ?? 'College'} Schedule Period`
                                                                  : 'Schedule Period')}
                                                    </h3>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                                                            <CalendarDays className="size-3.5 text-primary" />
                                                            {formatDateNice(
                                                                period.start_date,
                                                            )}{' '}
                                                            –{' '}
                                                            {formatDateNice(
                                                                period.end_date,
                                                            )}
                                                        </span>
                                                        <span>&bull;</span>
                                                        <span>
                                                            {workSummary}
                                                        </span>
                                                        {isHtePeriod && (
                                                            <>
                                                                <span>
                                                                    &bull;
                                                                </span>
                                                                <span className="font-medium text-purple-700 dark:text-purple-400">
                                                                    Applies to{' '}
                                                                    {period.hte
                                                                        ?.name ??
                                                                        'HTE'}{' '}
                                                                    interns
                                                                </span>
                                                            </>
                                                        )}
                                                        {isOwnCollegeSchedule && (
                                                            <>
                                                                <span>
                                                                    &bull;
                                                                </span>
                                                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                                                    In effect
                                                                    for{' '}
                                                                    {userCollege?.name ??
                                                                        'your college'}{' '}
                                                                    interns
                                                                </span>
                                                            </>
                                                        )}
                                                        {!isSuperAdmin &&
                                                            !isCollegePeriod &&
                                                            !isHtePeriod && (
                                                                <>
                                                                    <span>
                                                                        &bull;
                                                                    </span>
                                                                    <span className="text-muted-foreground italic">
                                                                        Fallback
                                                                        baseline
                                                                    </span>
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Weekly Schedule Visual Strip */}
                                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                                                {DAYS.map((day) => {
                                                    const time =
                                                        period.day_schedule[
                                                            day
                                                        ];
                                                    const isWorkday =
                                                        Boolean(time);
                                                    const isWeekend =
                                                        day === 'saturday' ||
                                                        day === 'sunday';

                                                    return (
                                                        <div
                                                            key={day}
                                                            className={cn(
                                                                'flex flex-col justify-between rounded-lg p-2.5 text-left transition-all',
                                                                isWorkday
                                                                    ? 'border border-primary/25 bg-primary/5 shadow-2xs dark:bg-primary/10'
                                                                    : 'border border-dashed border-border/70 bg-muted/20 opacity-70',
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span
                                                                    className={cn(
                                                                        'text-xs font-semibold',
                                                                        isWorkday
                                                                            ? 'text-foreground'
                                                                            : 'text-muted-foreground',
                                                                    )}
                                                                >
                                                                    {
                                                                        DAY_SHORT[
                                                                            day
                                                                        ]
                                                                    }
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {isWeekend
                                                                        ? 'Wkd'
                                                                        : 'Wk'}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2">
                                                                {isWorkday ? (
                                                                    <span className="text-xs font-bold tracking-tight text-primary tabular-nums">
                                                                        {formatTime12(
                                                                            time,
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium text-muted-foreground/60 italic">
                                                                        Off
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
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
                                <CalendarDays className="size-5" />
                            </span>
                            Add Schedule Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            {isSuperAdmin
                                ? 'Set the target scope (university-wide baseline or specific college), effective date range, and expected arrival times.'
                                : `Set the effective date range and expected arrival times for ${userCollege?.name ?? 'your college'}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={addForm}
                        onChange={(patch) =>
                            setAddForm((f) => ({ ...f, ...patch }))
                        }
                        isSuperAdmin={isSuperAdmin}
                        colleges={colleges}
                        userCollege={userCollege}
                    />
                    <DialogFooter className="gap-2 border-t pt-3 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setAddOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitAdd}>Save Period</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Edit dialog ──────────────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
                    <DialogHeader className="gap-1.5 border-b pb-3">
                        <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                                <CalendarDays className="size-5" />
                            </span>
                            Edit Schedule Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            Update the scope, date range, or expected start
                            times for each day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={editForm}
                        onChange={(patch) =>
                            setEditForm((f) => ({ ...f, ...patch }))
                        }
                        isSuperAdmin={isSuperAdmin}
                        colleges={colleges}
                        userCollege={userCollege}
                    />
                    <DialogFooter className="gap-2 border-t pt-3 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setEditOpen(false)}
                        >
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
