import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    scope?: 'global' | 'college' | 'hte';
    college_id?: number | null;
    college?: {
        id: number;
        name: string;
        code: string;
    } | null;
}

interface ScheduleProps {
    periods: SchedulePeriod[];
    globalPeriods: SchedulePeriod[];
    collegePeriods?: SchedulePeriod[];
    highlightId?: number | null;
    college?: {
        id: number;
        name: string;
        code: string;
    } | null;
    hte?: {
        id: number;
        name: string;
    } | null;
}

interface FormState {
    name: string;
    startDate: string;
    endDate: string;
    daySchedule: Record<string, string>;
}

type PeriodStatus = 'active' | 'upcoming' | 'past';

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

        if (isNaN(h) || isNaN(m)) {
            return time;
        }

        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;

        return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    } catch {
        return time;
    }
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
    daySchedule: Record<string, string | null> | undefined,
): string {
    if (!daySchedule) {
        return 'No schedule defined';
    }

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
    hteName,
}: {
    form: FormState;
    onChange: (patch: Partial<FormState>) => void;
    hteName?: string;
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

                <div className="flex items-center gap-2.5 rounded-lg border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300">
                    <Building2 className="size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <span>
                        This override is for your specific HTE
                        {hteName ? (
                            <>
                                {' '}
                                (<strong>{hteName}</strong>)
                            </>
                        ) : null}
                        . It will apply to all interns assigned to your HTE,
                        overriding college and university baselines.
                    </span>
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
                            follow the normal college or university baseline
                            schedule.
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

// ── Period Card ───────────────────────────────────────────────────────────────
function PeriodCard({
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
    const status = getPeriodStatus(period.start_date, period.end_date);
    const workSummary = getWorkdaysSummary(period.day_schedule);
    const isCollegeScope =
        period.scope === 'college' || Boolean(period.college_id);
    const isHteOverride = !readOnly || period.scope === 'hte';

    return (
        <div
            id={`schedule-period-${period.id}`}
            className={cn(
                'group rounded-xl border bg-card p-4 transition-all duration-300 sm:p-5',
                isHighlighted
                    ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10'
                    : 'border-border/80 hover:border-border hover:shadow-xs',
            )}
        >
            {/* Header / Badges Row */}
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Scope Badge */}
                    {isHteOverride ? (
                        <Badge className="gap-1.5 border border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            <Building2 className="size-3.5 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold">HTE Override</span>
                        </Badge>
                    ) : isCollegeScope ? (
                        <Badge className="gap-1.5 border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <GraduationCap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold">
                                College Baseline (
                                {period.college?.code ??
                                    period.college?.name ??
                                    'College'}
                                )
                            </span>
                        </Badge>
                    ) : (
                        <Badge className="gap-1.5 border border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            <Globe className="size-3.5 text-sky-600 dark:text-sky-400" />
                            <span className="font-semibold">
                                University Baseline
                            </span>
                        </Badge>
                    )}

                    {/* Status Badge */}
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

                    {/* Read-only badge */}
                    {readOnly && (
                        <Badge
                            variant="outline"
                            className="gap-1 border-dashed text-xs text-muted-foreground"
                        >
                            <Lock className="size-3" />
                            Read-only Reference
                        </Badge>
                    )}

                    {/* Notification Focus Badge */}
                    {isHighlighted && (
                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                            <Sparkles className="size-3" />
                            Focus
                        </Badge>
                    )}
                </div>

                {/* Actions for HTE Overrides */}
                {!readOnly && status !== 'past' && (
                    <div className="flex shrink-0 items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit?.(period)}
                                    className="size-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                                    aria-label={`Edit ${period.name || 'override'}`}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Override</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete?.(period)}
                                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Delete ${period.name || 'override'}`}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Override</TooltipContent>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Period Title & Date Info */}
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-foreground">
                        {period.name ||
                            (isHteOverride
                                ? 'HTE Override Period'
                                : 'Baseline Schedule Period')}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <CalendarDays className="size-3.5 text-primary" />
                            {formatDateNice(period.start_date)} –{' '}
                            {formatDateNice(period.end_date)}
                        </span>
                        <span>&bull;</span>
                        <span>{workSummary}</span>
                    </div>
                </div>
            </div>

            {/* Weekly Schedule Visual Strip */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {DAYS.map((day) => {
                    const time = period.day_schedule?.[day];
                    const isWorkday = Boolean(time);
                    const isWeekend = day === 'saturday' || day === 'sunday';

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
                                    {DAY_SHORT[day]}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {isWeekend ? 'Wkd' : 'Wk'}
                                </span>
                            </div>
                            <div className="mt-2">
                                {isWorkday ? (
                                    <span className="text-xs font-bold tracking-tight text-primary tabular-nums">
                                        {formatTime12(time)}
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
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupervisorSchedule({
    periods,
    globalPeriods,
    collegePeriods = [],
    highlightId,
    hte,
}: ScheduleProps) {
    const hteName = hte?.name;

    const [processing, setProcessing] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState<FormState>(emptyForm);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>(emptyForm);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState('');

    // Filtering & View state
    const [activeTab, setActiveTab] = useState<
        'all' | 'overrides' | 'college' | 'global'
    >('all');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

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
    }, [highlightId]);

    // Derived counts
    const totalPeriodsCount =
        periods.length + collegePeriods.length + globalPeriods.length;

    // Filter helper
    const filterList = useCallback(
        (list: SchedulePeriod[]) => {
            return list.filter((period) => {
                // Status filter
                if (filterStatus !== 'all') {
                    const status = getPeriodStatus(
                        period.start_date,
                        period.end_date,
                    );

                    if (status !== filterStatus) {
                        return false;
                    }
                }

                // Search filter
                if (search.trim() !== '') {
                    const q = search.toLowerCase();
                    const nameMatch = (period.name ?? '')
                        .toLowerCase()
                        .includes(q);
                    const collegeMatch =
                        (period.college?.code ?? '')
                            .toLowerCase()
                            .includes(q) ||
                        (period.college?.name ?? '').toLowerCase().includes(q);
                    const dateMatch =
                        period.start_date.includes(q) ||
                        period.end_date.includes(q);

                    if (!nameMatch && !collegeMatch && !dateMatch) {
                        return false;
                    }
                }

                return true;
            });
        },
        [filterStatus, search],
    );

    const filteredOverrides = useMemo(
        () => filterList(periods),
        [periods, filterList],
    );
    const filteredCollege = useMemo(
        () => filterList(collegePeriods),
        [collegePeriods, filterList],
    );
    const filteredGlobal = useMemo(
        () => filterList(globalPeriods),
        [globalPeriods, filterList],
    );

    const hasActiveFilters = search.trim() !== '' || filterStatus !== 'all';

    const handleResetFilters = () => {
        setSearch('');
        setFilterStatus('all');
    };

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

            <div className="flex h-full flex-1 flex-col gap-5 p-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                                <CalendarClock className="size-5" />
                            </span>
                            HTE Schedule
                        </h1>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            Configure custom working schedule overrides for your
                            interns and view the effective college and
                            university baseline schedules.
                        </p>
                    </div>

                    <Button
                        onClick={() => setAddOpen(true)}
                        className="gap-1.5 shadow-xs"
                    >
                        <Plus className="size-4" />
                        <span>Add Override</span>
                    </Button>
                </div>

                {/* Precedence Hierarchy Information Card */}
                <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <CalendarDays className="size-4.5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                Schedule Precedence Hierarchy
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Interns assigned to your HTE follow custom
                                overrides first. When no override is set for a
                                date, they follow the College Baseline, falling
                                back to the University Baseline.
                            </p>
                        </div>
                    </div>

                    {/* Precedence steps */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2 py-1 font-medium text-purple-800 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            <Building2 className="size-3 text-purple-600 dark:text-purple-400" />
                            1. HTE Override
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <GraduationCap className="size-3 text-emerald-600 dark:text-emerald-400" />
                            2. College Baseline
                        </span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-1 font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            <Globe className="size-3 text-sky-600 dark:text-sky-400" />
                            3. Global Baseline
                        </span>
                    </div>
                </div>

                {/* Main Card with Tabs and Filter Toolbar */}
                <Card className="flex-1 shadow-xs">
                    <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Tabs (using reusable Tabs component) */}
                        <Tabs
                            value={activeTab}
                            onValueChange={(val) => setActiveTab(val as any)}
                            className="w-full sm:w-auto"
                        >
                            <TabsList className="h-9 w-full sm:w-auto">
                                <TabsTrigger value="all" className="text-xs">
                                    All Schedules ({totalPeriodsCount})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="overrides"
                                    className="text-xs"
                                >
                                    Your Overrides ({periods.length})
                                </TabsTrigger>
                                {collegePeriods.length > 0 && (
                                    <TabsTrigger
                                        value="college"
                                        className="text-xs"
                                    >
                                        College Baseline (
                                        {collegePeriods.length})
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="global" className="text-xs">
                                    University Baseline ({globalPeriods.length})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search & Status Filter Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search schedules…"
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

                            {/* Status Filter (reusable Select component) */}
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
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active Now
                                    </SelectItem>
                                    <SelectItem value="upcoming">
                                        Upcoming
                                    </SelectItem>
                                    <SelectItem value="past">Past</SelectItem>
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
                        {/* Tab: All Schedules */}
                        {activeTab === 'all' && (
                            <div className="flex flex-col gap-6">
                                {/* HTE Overrides Section */}
                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="size-4 text-purple-600 dark:text-purple-400" />
                                            <h4 className="text-sm font-semibold text-foreground">
                                                Your HTE Overrides
                                            </h4>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {filteredOverrides.length}
                                            </Badge>
                                        </div>
                                        {periods.length === 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setAddOpen(true)}
                                                className="h-7 text-xs"
                                            >
                                                <Plus className="mr-1 size-3" />
                                                Add Override
                                            </Button>
                                        )}
                                    </div>

                                    {filteredOverrides.length === 0 ? (
                                        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                                            {periods.length === 0
                                                ? 'No custom overrides set. Your interns currently follow the baseline schedules below.'
                                                : 'No overrides match your current filter.'}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {filteredOverrides.map((period) => (
                                                <PeriodCard
                                                    key={period.id}
                                                    period={period}
                                                    readOnly={false}
                                                    isHighlighted={
                                                        highlightId ===
                                                        period.id
                                                    }
                                                    onEdit={openEdit}
                                                    onDelete={openDelete}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* College Baseline Section (if exists) */}
                                {collegePeriods.length > 0 && (
                                    <div>
                                        <div className="mb-3 flex items-center gap-2">
                                            <GraduationCap className="size-4 text-emerald-600 dark:text-emerald-400" />
                                            <h4 className="text-sm font-semibold text-foreground">
                                                College Baseline Schedule
                                                (Reference)
                                            </h4>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {filteredCollege.length}
                                            </Badge>
                                        </div>

                                        {filteredCollege.length === 0 ? (
                                            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                                                No college schedules match your
                                                current filter.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {filteredCollege.map(
                                                    (period) => (
                                                        <PeriodCard
                                                            key={period.id}
                                                            period={period}
                                                            readOnly
                                                            isHighlighted={
                                                                highlightId ===
                                                                period.id
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* University Baseline Section */}
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <Globe className="size-4 text-sky-600 dark:text-sky-400" />
                                        <h4 className="text-sm font-semibold text-foreground">
                                            University Baseline Schedule
                                            (Reference)
                                        </h4>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {filteredGlobal.length}
                                        </Badge>
                                    </div>

                                    {filteredGlobal.length === 0 ? (
                                        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                                            {globalPeriods.length === 0
                                                ? 'No university baseline schedule configured yet.'
                                                : 'No university schedules match your current filter.'}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {filteredGlobal.map((period) => (
                                                <PeriodCard
                                                    key={period.id}
                                                    period={period}
                                                    readOnly
                                                    isHighlighted={
                                                        highlightId ===
                                                        period.id
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab: Your Overrides Only */}
                        {activeTab === 'overrides' && (
                            <div>
                                {filteredOverrides.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                            <Building2 className="size-6" />
                                        </div>
                                        <h4 className="mt-3 text-sm font-semibold text-foreground">
                                            {hasActiveFilters
                                                ? 'No overrides match your filters'
                                                : 'No HTE Overrides Configured'}
                                        </h4>
                                        <p className="mt-1 max-w-md text-xs text-muted-foreground">
                                            {hasActiveFilters
                                                ? 'Try clearing your search or status filter to see all overrides.'
                                                : 'Your interns currently follow the college or university baseline schedule. If your company requires different workdays or start times, click "Add Override" below.'}
                                        </p>
                                        <div className="mt-4 flex gap-2">
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleResetFilters}
                                                    className="text-xs"
                                                >
                                                    <RotateCcw className="mr-1.5 size-3.5" />
                                                    Reset Filters
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={() => setAddOpen(true)}
                                                className="text-xs"
                                            >
                                                <Plus className="mr-1.5 size-3.5" />
                                                Add Override
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {filteredOverrides.map((period) => (
                                            <PeriodCard
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
                            </div>
                        )}

                        {/* Tab: College Baseline Only */}
                        {activeTab === 'college' && (
                            <div>
                                {filteredCollege.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                            <GraduationCap className="size-6" />
                                        </div>
                                        <h4 className="mt-3 text-sm font-semibold text-foreground">
                                            {hasActiveFilters
                                                ? 'No college schedules match your filters'
                                                : 'No college baseline schedules configured'}
                                        </h4>
                                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                            {hasActiveFilters
                                                ? 'Try clearing your search or status filter to see all college schedules.'
                                                : 'Your college has not configured a custom baseline. Interns will follow the university baseline.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {filteredCollege.map((period) => (
                                            <PeriodCard
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
                            </div>
                        )}

                        {/* Tab: University Baseline Only */}
                        {activeTab === 'global' && (
                            <div>
                                {filteredGlobal.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                            <Globe className="size-6" />
                                        </div>
                                        <h4 className="mt-3 text-sm font-semibold text-foreground">
                                            {hasActiveFilters
                                                ? 'No university schedules match your filters'
                                                : 'No university baseline schedule configured'}
                                        </h4>
                                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                            {hasActiveFilters
                                                ? 'Try clearing your search or status filter to see all schedules.'
                                                : 'No global university schedule has been set by administrators yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {filteredGlobal.map((period) => (
                                            <PeriodCard
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
                            Add Override Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            Set custom effective date ranges and daily expected
                            arrival times specifically for your HTE.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={addForm}
                        onChange={(patch) =>
                            setAddForm((f) => ({ ...f, ...patch }))
                        }
                        hteName={hteName}
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
                                <CalendarDays className="size-5" />
                            </span>
                            Edit Override Period
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                            Update the date range or expected arrival times for
                            each day.
                        </DialogDescription>
                    </DialogHeader>
                    <PeriodForm
                        form={editForm}
                        onChange={(patch) =>
                            setEditForm((f) => ({ ...f, ...patch }))
                        }
                        hteName={hteName}
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
