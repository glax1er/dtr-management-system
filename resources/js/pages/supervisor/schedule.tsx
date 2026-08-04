import { Head, router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { dashboard } from '@/routes';

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
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

function formatTime12(time: string | null): string {
    if (!time) return 'No work';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date(new Date().toDateString());
}

const emptyDaySchedule = () => Object.fromEntries(DAYS.map((d) => [d, ''])) as Record<string, string>;
const emptyNoWork = () => Object.fromEntries(DAYS.map((d) => [d, false])) as Record<string, boolean>;

interface FormState {
    name: string;
    startDate: string;
    endDate: string;
    daySchedule: Record<string, string>;
    noWork: Record<string, boolean>;
}

function DayFields({
    daySchedule,
    noWork,
    onChange,
}: {
    daySchedule: Record<string, string>;
    noWork: Record<string, boolean>;
    onChange: (day: string, value: string) => void;
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-3">
            {DAYS.map((day) => (
                <div key={day} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                    <span className="w-28 shrink-0 text-sm font-medium">{DAY_LABELS[day]}</span>
                    <Input
                        type="time"
                        value={daySchedule[day]}
                        onChange={(e) => onChange(day, e.target.value)}
                        disabled={noWork[day]}
                        className="w-36"
                    />
                </div>
            ))}
        </div>
    );
}

function ScheduleRow({ period, readOnly, onEdit, onDelete }: {
    period: SchedulePeriod;
    readOnly: boolean;
    onEdit?: (period: SchedulePeriod) => void;
    onDelete?: (id: number) => void;
}) {
    return (
        <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{period.name ?? 'Unnamed period'}</p>
                        {readOnly && (
                            <Badge variant="secondary" className="font-normal">
                                Global (Admin)
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {period.start_date} – {period.end_date}
                    </p>
                </div>
                {!readOnly && !isPast(period.end_date) && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit?.(period)}>
                            <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(period.id)}>
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-5 gap-x-20 text-sm sm:grid-cols-4">
                {DAYS.map((day) => (
                    <div key={day} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{DAY_LABELS[day].slice(0, 3)}</span>
                        <span>{formatTime12(period.day_schedule[day])}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SupervisorSchedule({ periods, globalPeriods }: ScheduleProps) {
    const [addForm, setAddForm] = useState<FormState>({
        name: '',
        startDate: '',
        endDate: '',
        daySchedule: emptyDaySchedule(),
        noWork: emptyNoWork(),
    });

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FormState>({
        name: '',
        startDate: '',
        endDate: '',
        daySchedule: emptyDaySchedule(),
        noWork: emptyNoWork(),
    });

    const resetAddForm = () => {
        setAddForm({ name: '', startDate: '', endDate: '', daySchedule: emptyDaySchedule(), noWork: emptyNoWork() });
    };

    const submitAdd = () => {
        if (!addForm.startDate || !addForm.endDate) {
            alert('Start date and end date are required.');
            return;
        }

        const payload: Record<string, string | null> = {};
        DAYS.forEach((day) => {
            payload[day] = addForm.noWork[day] ? null : addForm.daySchedule[day] || null;
        });

        router.post(
            '/supervisor/schedule',
            { name: addForm.name || undefined, start_date: addForm.startDate, end_date: addForm.endDate, day_schedule: payload },
            { preserveScroll: true, onSuccess: resetAddForm },
        );
    };

    const openEdit = (period: SchedulePeriod) => {
        setEditingId(period.id);
        setEditForm({
            name: period.name ?? '',
            startDate: period.start_date,
            endDate: period.end_date,
            daySchedule: Object.fromEntries(DAYS.map((d) => [d, period.day_schedule[d] ?? ''])) as Record<string, string>,
            noWork: Object.fromEntries(DAYS.map((d) => [d, period.day_schedule[d] == null])) as Record<string, boolean>,
        });
        setEditOpen(true);
    };

    const submitEdit = () => {
        if (!editingId || !editForm.startDate || !editForm.endDate) {
            alert('Start date and end date are required.');
            return;
        }

        const payload: Record<string, string | null> = {};
        DAYS.forEach((day) => {
            payload[day] = editForm.noWork[day] ? null : editForm.daySchedule[day] || null;
        });

        router.patch(
            `/supervisor/schedule/${editingId}`,
            { name: editForm.name || undefined, start_date: editForm.startDate, end_date: editForm.endDate, day_schedule: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditOpen(false);
                    setEditingId(null);
                },
            },
        );
    };

    const remove = (id: number) => {
        if (confirm('Delete this override?')) {
            router.delete(`/supervisor/schedule/${id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="HTE Schedule" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">HTE Schedule</h1>
                    <p className="text-muted-foreground text-sm">
                        Global periods (set by admin) apply to your interns by default. Add an override below only
                        if your HTE's actual schedule differs.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Add New Override Period</CardTitle>
                        <CardDescription>Only future or currently active periods can be added, edited, or removed.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label>Name (optional)</Label>
                                <Input
                                    value={addForm.name}
                                    onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Exam Week"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={addForm.startDate}
                                    onChange={(e) => setAddForm((p) => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={addForm.endDate}
                                    onChange={(e) => setAddForm((p) => ({ ...p, endDate: e.target.value }))}
                                    min={addForm.startDate || undefined}
                                />
                            </div>
                        </div>

                        <DayFields
                            daySchedule={addForm.daySchedule}
                            noWork={addForm.noWork}
                            onChange={(day, value) =>
                                setAddForm((p) => ({ ...p, daySchedule: { ...p.daySchedule, [day]: value } }))
                            }
                        />

                        <Button onClick={submitAdd} className="w-fit">
                            Save Override
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Global Schedule (Reference)</CardTitle>
                        <CardDescription>Set by admin. Not editable here — shown so you know what you'd be overriding.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {globalPeriods.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No global schedule configured yet.</p>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {globalPeriods.map((period) => (
                                    <ScheduleRow key={period.id} period={period} readOnly />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="text-base">Your HTE Overrides</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {periods.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No overrides set — your HTE currently follows the global schedule above.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {periods.map((period) => (
                                    <ScheduleRow
                                        key={period.id}
                                        period={period}
                                        readOnly={false}
                                        onEdit={openEdit}
                                        onDelete={remove}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Override</DialogTitle>
                        <DialogDescription>Update the date range or day-by-day expected start times.</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="grid gap-1.5">
                                <Label>Name (optional)</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.startDate}
                                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.endDate}
                                    onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                                    min={editForm.startDate || undefined}
                                />
                            </div>
                        </div>

                        <DayFields
                            daySchedule={editForm.daySchedule}
                            noWork={editForm.noWork}
                            onChange={(day, value) =>
                                setEditForm((p) => ({ ...p, daySchedule: { ...p.daySchedule, [day]: value } }))
                            }
                        />
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

SupervisorSchedule.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Schedule', href: '/supervisor/schedule' },
    ],
};