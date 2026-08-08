import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    CalendarDays,
    History,
    Info,
    LoaderCircle,
    Plus,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

interface Intern {
    user_id: number;
    name: string;
}

interface Entry {
    [key: string]: string;
    date: string;
    time_in: string;
    time_out: string;
}

interface Conflict {
    date: string;
    source: 'kiosk' | 'manual';
}

interface ManualAttendanceProps {
    interns: Intern[];
}

const emptyEntry = (): Entry => ({
    date: '',
    time_in: '',
    time_out: '',
});

export default function ManualAttendance({ interns }: ManualAttendanceProps) {
    const [internId, setInternId] = useState('');
    const [entries, setEntries] = useState<Entry[]>([emptyEntry()]);
    const [processing, setProcessing] = useState(false);

    // Per-row "we found an existing record for this date and pre-filled
    // it below" hint. Kept as a parallel array (indexed the same as
    // `entries`) rather than baked into Entry itself, since it's just a
    // transient UI note, not form data that gets submitted.
    const [rowNotices, setRowNotices] = useState<(string | null)[]>([null]);
    // Tracked per row index (not a single shared counter) so a lookup
    // fired for one row can't invalidate an in-flight lookup for another.
    const lookupRequestIds = useRef<Record<number, number>>({});

    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [dialog, setDialog] = useState<'error' | 'conflict' | null>(null);
    const [error, setError] = useState('');

    const selectedIntern = useMemo(
        () => interns.find((intern) => String(intern.user_id) === internId),
        [internId, interns],
    );

    // A row only needs a date plus *either* a time in or a time out (or
    // both) — a supervisor might only know one side of the shift, e.g.
    // the intern forgot to scan in and only has a time-out on record.
    const isRowValid = (entry: Entry) =>
        Boolean(entry.date) && Boolean(entry.time_in || entry.time_out);

    const isRowStarted = (entry: Entry) =>
        Boolean(entry.date || entry.time_in || entry.time_out);

    const completedEntries = entries.filter(isRowValid);

    const conflictDates = [
        ...new Set(conflicts.map((conflict) => conflict.date)),
    ];

    const hasKioskConflict = conflicts.some(
        (conflict) => conflict.source === 'kiosk',
    );

    const hasManualConflict = conflicts.some(
        (conflict) => conflict.source === 'manual',
    );

    const showError = (message: string) => {
        setError(message);
        setDialog('error');
    };

    const addRow = () => {
        setEntries((current) => [...current, emptyEntry()]);
        setRowNotices((current) => [...current, null]);
    };

    const removeRow = (index: number) => {
        setEntries((current) =>
            current.filter((_, currentIndex) => currentIndex !== index),
        );
        setRowNotices((current) =>
            current.filter((_, currentIndex) => currentIndex !== index),
        );
    };

    const updateRow = (index: number, field: keyof Entry, value: string) => {
        setEntries((current) =>
            current.map((entry, currentIndex) =>
                currentIndex === index ? { ...entry, [field]: value } : entry,
            ),
        );

        // Any manual edit — including picking a new date — means whatever
        // was pre-filled no longer necessarily reflects the saved record,
        // so clear the hint until a fresh lookup (if any) confirms it.
        setRowNotices((current) =>
            current.map((notice, currentIndex) =>
                currentIndex === index ? null : notice,
            ),
        );
    };

    const readXsrfToken = (): string => {
        const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

        return match ? decodeURIComponent(match[1]) : '';
    };

    // When a supervisor picks a date that already has attendance on file
    // (a kiosk scan or an earlier manual entry), pre-fill that row's time
    // in / time out from what's already there instead of leaving them to
    // retype — and re-check whenever they switch interns too, since the
    // same date can carry a different record per intern.
    const lookupExisting = async (
        index: number,
        date: string,
        forInternId: string = internId,
    ) => {
        if (!forInternId || !date) {
            return;
        }

        const requestId = (lookupRequestIds.current[index] =
            (lookupRequestIds.current[index] ?? 0) + 1);

        try {
            const response = await fetch(
                '/supervisor/manual-attendance/lookup',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({
                        intern_user_id: forInternId,
                        date,
                    }),
                },
            );

            if (!response.ok || requestId !== lookupRequestIds.current[index]) {
                return;
            }

            const data: {
                found: boolean;
                time_in?: string | null;
                time_out?: string | null;
            } = await response.json();

            // Resolve the row either way — when nothing is found we still
            // need to clear out whatever a previous lookup pre-filled,
            // otherwise switching to a blank date/intern just leaves the
            // old values sitting there looking "stuck".
            setEntries((current) =>
                current.map((entry, currentIndex) =>
                    currentIndex === index && entry.date === date
                        ? {
                              ...entry,
                              time_in: data.found ? (data.time_in ?? '') : '',
                              time_out: data.found
                                  ? (data.time_out ?? '')
                                  : '',
                          }
                        : entry,
                ),
            );

            setRowNotices((current) =>
                current.map((notice, currentIndex) =>
                    currentIndex === index
                        ? data.found
                            ? 'Existing record found for this date — time in / time out pre-filled below.'
                            : null
                        : notice,
                ),
            );
        } catch {
            // Prefill is a convenience, not a requirement for saving —
            // fail silently and let the supervisor type it in manually.
        }
    };

    const submit = async (force = false) => {
        if (!internId) {
            toast.error('Select an intern first.');

            return;
        }

        const partiallyFilledRow = entries.some(
            (entry) => isRowStarted(entry) && !isRowValid(entry),
        );

        if (partiallyFilledRow) {
            showError(
                'Each record needs a date and at least a time in or a time out. Complete or remove unfinished rows before saving.',
            );

            return;
        }

        if (completedEntries.length === 0) {
            showError(
                'Add at least one attendance record with a date and a time in or time out.',
            );

            return;
        }

        setProcessing(true);

        try {
            if (!force) {
                const response = await fetch(
                    '/supervisor/manual-attendance/check',
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': readXsrfToken(),
                        },
                        body: JSON.stringify({
                            intern_user_id: internId,
                            dates: completedEntries.map((entry) => entry.date),
                        }),
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        'We could not check for existing attendance records. Please try again.',
                    );
                }

                // Supports either:
                // ["2026-07-20"]
                // or [{ date: "2026-07-20", source: "kiosk" }]
                const data: {
                    conflicts?: Array<Conflict | string>;
                } = await response.json();

                const normalizedConflicts: Conflict[] = (
                    data.conflicts ?? []
                ).map((conflict) => {
                    if (typeof conflict === 'string') {
                        return {
                            date: conflict,
                            source: 'kiosk',
                        };
                    }

                    return conflict;
                });

                if (normalizedConflicts.length > 0) {
                    setConflicts(normalizedConflicts);
                    setDialog('conflict');
                    setProcessing(false);

                    return;
                }
            }

            router.post(
                '/supervisor/manual-attendance',
                {
                    intern_user_id: internId,
                    entries: completedEntries,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setConflicts([]);
                        setEntries([emptyEntry()]);
                        setRowNotices([null]);
                    },
                    onError: () => {
                        showError(
                            'The records could not be saved. Please review the details and try again.',
                        );
                    },
                    onFinish: () => setProcessing(false),
                },
            );
        } catch (caughtError) {
            setProcessing(false);

            showError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Something went wrong. Please try again.',
            );
        }
    };

    return (
        <>
            <Head title="Manual Attendance" />

            {/*
              Mobile: the overall page scrolls.
              Desktop: the page stays fixed and only the records list scrolls.
              Change 4rem if your dashboard header uses a different height.
            */}
            <div className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:p-6">
                <section className="flex shrink-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <CalendarDays className="size-5" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Manual attendance
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Add verified attendance from paper records or missed
                            kiosk scans.
                        </p>
                    </div>
                </section>

                <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,1.7fr)] lg:overflow-hidden">
                    <Card className="h-fit border-border/70 shadow-sm">
                        <CardHeader className="">
                            <div className="flex items-center gap-2">
                                <UserRound className="size-4 text-primary" />
                                <CardTitle className="text-base">
                                    Intern
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Select the person whose attendance you are
                                adding.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="intern">Intern name</Label>

                                <Select
                                    value={internId}
                                    onValueChange={(value) => {
                                        setInternId(value);
                                        setConflicts([]);
                                        setRowNotices(entries.map(() => null));

                                        // Re-check any rows that already
                                        // have a date filled in, since a
                                        // different intern can have a
                                        // completely different record (or
                                        // none) for that same day.
                                        entries.forEach((entry, index) => {
                                            if (entry.date) {
                                                void lookupExisting(
                                                    index,
                                                    entry.date,
                                                    value,
                                                );
                                            }
                                        });
                                    }}
                                >
                                    <SelectTrigger id="intern">
                                        <SelectValue placeholder="Choose an intern" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {interns.map((intern) => (
                                            <SelectItem
                                                key={intern.user_id}
                                                value={String(intern.user_id)}
                                            >
                                                {intern.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedIntern ? (
                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                    Adding records for{' '}
                                    <span className="font-medium text-foreground">
                                        {selectedIntern.name}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex gap-2 rounded-lg bg-muted/50 p-2.5 text-xs leading-5 text-muted-foreground">
                                    <Info className="mt-0.5 size-4 shrink-0" />
                                    Select an intern first, then enter the
                                    attendance details.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex min-h-0 flex-col overflow-hidden border-border/70 shadow-sm lg:h-full">
                        <CardHeader className="shrink-0 border-b bg-muted/20">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-5">
                                <div>
                                    <CardTitle className="text-base">
                                        Attendance records
                                    </CardTitle>
                                    <CardDescription className="mt-0.5">
                                        Time in and time out are each optional —
                                        enter whichever was actually recorded.
                                    </CardDescription>
                                </div>

                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                    {completedEntries.length}{' '}
                                    {completedEntries.length === 1
                                        ? 'record ready'
                                        : 'records ready'}
                                </span>
                            </div>
                        </CardHeader>

                        {/*
                          On mobile this gets its own short scroll area.
                          On desktop it fills the available card height.
                        */}
                        <CardContent className="max-h-[48dvh] flex-1 space-y-3 overflow-y-auto pb-2 lg:max-h-[60vh] lg:min-h-0 lg:pb-2">
                            <div className="space-y-2.5">
                                {entries.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="rounded-lg border bg-card p-3"
                                    >
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <p className="text-sm font-medium">
                                                Record {index + 1}
                                            </p>

                                            {entries.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                                                    onClick={() =>
                                                        removeRow(index)
                                                    }
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    Remove
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid gap-2.5 sm:grid-cols-3">
                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor={`date-${index}`}
                                                >
                                                    Date
                                                </Label>
                                                <Input
                                                    id={`date-${index}`}
                                                    type="date"
                                                    value={entry.date}
                                                    onChange={(event) => {
                                                        const value =
                                                            event.target.value;
                                                        updateRow(
                                                            index,
                                                            'date',
                                                            value,
                                                        );
                                                        void lookupExisting(
                                                            index,
                                                            value,
                                                        );
                                                    }}
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor={`time-in-${index}`}
                                                >
                                                    Time in{' '}
                                                    <span className="text-muted-foreground">
                                                        (optional)
                                                    </span>
                                                </Label>
                                                <Input
                                                    id={`time-in-${index}`}
                                                    type="time"
                                                    value={entry.time_in}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            'time_in',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label
                                                    htmlFor={`time-out-${index}`}
                                                >
                                                    Time out{' '}
                                                    <span className="text-muted-foreground">
                                                        (optional)
                                                    </span>
                                                </Label>
                                                <Input
                                                    id={`time-out-${index}`}
                                                    type="time"
                                                    value={entry.time_out}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            'time_out',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {rowNotices[index] && (
                                            <div className="mt-2.5 flex items-start gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs leading-4 text-primary">
                                                <History className="mt-0.5 size-3.5 shrink-0" />
                                                {rowNotices[index]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={addRow}
                                className="w-full border-dashed sm:w-auto"
                            >
                                <Plus className="size-4" />
                                Add another day
                            </Button>
                        </CardContent>

                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-muted-foreground">
                                Submit only verified attendance records.
                            </p>

                            <Button
                                type="button"
                                onClick={() => submit(false)}
                                disabled={processing}
                                className="sm:min-w-36"
                            >
                                {processing && (
                                    <LoaderCircle className="size-4 animate-spin" />
                                )}
                                Save records
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Dialog
                open={dialog === 'error'}
                onOpenChange={(open) => !open && setDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            Unable to save records
                        </DialogTitle>
                        <DialogDescription>{error}</DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button onClick={() => setDialog(null)}>
                            Review records
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={dialog === 'conflict'}
                onOpenChange={(open) => !open && setDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-amber-600" />
                            {hasManualConflict && hasKioskConflict
                                ? 'Existing attendance records found'
                                : hasManualConflict
                                  ? 'Existing manual record found'
                                  : 'Existing kiosk scan found'}
                        </DialogTitle>

                        <DialogDescription>
                            {hasManualConflict && hasKioskConflict
                                ? 'Some dates contain manual entries and kiosk scans. Continuing will replace the existing records.'
                                : hasManualConflict
                                  ? 'These dates were previously entered manually. Continuing will replace those earlier manual entries.'
                                  : 'These dates already have kiosk scan data. Continuing will replace the original kiosk records.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Dates affected
                        </p>

                        <ul className="flex flex-wrap gap-1.5">
                            {conflictDates.map((date) => (
                                <li
                                    key={date}
                                    className="rounded-md bg-background px-2.5 py-1 text-sm font-medium shadow-sm"
                                >
                                    {date}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialog(null)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            disabled={processing}
                            onClick={() => {
                                setDialog(null);
                                submit(true);
                            }}
                        >
                            {processing && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            Replace existing records
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ManualAttendance.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Manual Attendance', href: '/supervisor/manual-attendance' },
    ],
};
