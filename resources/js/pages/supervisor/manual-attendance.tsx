import { Head, router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';

interface Intern {
    user_id: number;
    name: string;
}

interface Entry {
    date: string;
    time_in: string;
    time_out: string;
    [key: string]: string;
}

interface ManualAttendanceProps {
    interns: Intern[];
}

export default function ManualAttendance({ interns }: ManualAttendanceProps) {
    const [internId, setInternId] = useState('');
    const [entries, setEntries] = useState<Entry[]>([{ date: '', time_in: '', time_out: '' }]);
    const [processing, setProcessing] = useState(false);
    const [conflicts, setConflicts] = useState<string[] | null>(null);

    const addRow = () => setEntries([...entries, { date: '', time_in: '', time_out: '' }]);

    const removeRow = (index: number) => setEntries(entries.filter((_, i) => i !== index));

    const updateRow = (index: number, field: keyof Entry, value: string) => {
        const next = [...entries];
        next[index] = { ...next[index], [field]: value };
        setEntries(next);
    };

    const readXsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

const submit = async (force = false) => {
    if (!internId) {
        alert('Select an intern first.');
        return;
    }

    const validEntries = entries.filter((e) => e.date && e.time_in);

    if (validEntries.length === 0) {
        alert('Fill in at least one complete row (date + time in).');
        return;
    }

    setProcessing(true);

    if (!force) {
        // Step 1: plain fetch, not router.post — safe to receive raw JSON.
        const response = await fetch('/supervisor/manual-attendance/check', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            body: JSON.stringify({
                intern_user_id: internId,
                dates: validEntries.map((e) => e.date),
            }),
        });

        const data = await response.json();

        if (data.conflicts && data.conflicts.length > 0) {
            setConflicts(data.conflicts);
            setProcessing(false);
            return;
        }
    }

    // Step 2: the real save, via Inertia's router.post as normal.
    router.post(
        '/supervisor/manual-attendance',
        { intern_user_id: internId, entries: validEntries },
        {
            preserveScroll: true,
            onSuccess: () => {
                setConflicts(null);
                setEntries([{ date: '', time_in: '', time_out: '' }]);
            },
            onFinish: () => setProcessing(false),
        },
    );
};

    return (
        <>
            <Head title="Manual Attendance" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Manual Attendance Entry</h1>
                    <p className="text-muted-foreground text-sm">
                        Use this to migrate old paper-based records or backfill days an intern never scanned.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Intern</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={internId} onValueChange={setInternId}>
                            <SelectTrigger className="w-full max-w-sm">
                                <SelectValue placeholder="Select an intern" />
                            </SelectTrigger>
                            <SelectContent>
                                {interns.map((intern) => (
                                    <SelectItem key={intern.user_id} value={String(intern.user_id)}>
                                        {intern.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Records to Add</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {entries.map((entry, index) => (
                            <div key={index} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                        type="date"
                                        value={entry.date}
                                        onChange={(e) => updateRow(index, 'date', e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Time In</Label>
                                    <Input
                                        type="time"
                                        value={entry.time_in}
                                        onChange={(e) => updateRow(index, 'time_in', e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Time Out (optional)</Label>
                                    <Input
                                        type="time"
                                        value={entry.time_out}
                                        onChange={(e) => updateRow(index, 'time_out', e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                                {entries.length > 1 && (
                                    <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        <Button variant="outline" onClick={addRow} className="w-fit">
                            <Plus className="size-4" />
                            Add another day
                        </Button>

                        {conflicts && (
                            <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-4 text-sm">
                                <p className="font-medium text-amber-700 dark:text-amber-400">
                                    These dates already have real kiosk scan data:
                                </p>
                                <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-400">
                                    {conflicts.map((date) => (
                                        <li key={date}>{date}</li>
                                    ))}
                                </ul>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => submit(true)}
                                    disabled={processing}
                                >
                                    Overwrite anyway
                                </Button>
                            </div>
                        )}

                        <Button onClick={() => submit(false)} disabled={processing} className="w-fit">
                            Save Records
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ManualAttendance.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Manual Attendance', href: '/supervisor/manual-attendance' },
    ],
};