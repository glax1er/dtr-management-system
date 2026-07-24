import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

interface AttendanceLogRow {
    date: string;
    day: string;
    intern_user_id: number;
    intern_name: string;
    time_in: string;
    time_out: string | null;
    hours_rendered: number;
    lunch_deducted: boolean;
    status: 'open' | 'complete';
    punctuality: 'on_time' | 'late';
    raw_scan_count: number;
}

interface MyInternsProps {
    logs: AttendanceLogRow[];
    month: string;
    monthLabel: string;
    canGoNextMonth: boolean;
    internCount: number;
}

function shiftMonth(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function MyInterns({
    logs,
    month,
    monthLabel,
    canGoNextMonth,
    internCount,
}: MyInternsProps) {
    const goToMonth = (targetMonth: string) => {
        router.get('/supervisor/interns', { month: targetMonth }, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="My Interns" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        My Interns
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Attendance log for {internCount} intern{internCount === 1 ? '' : 's'} assigned to your HTE.
                    </p>
                </div>

                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => goToMonth(shiftMonth(month, -1))}>
                                <ChevronLeft />
                            </Button>
                            <CardTitle className="min-w-32 text-center text-base">{monthLabel}</CardTitle>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={!canGoNextMonth}
                                onClick={() => goToMonth(shiftMonth(month, 1))}
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No attendance logs recorded for {monthLabel}.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Date</th>
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">Time In</th>
                                            <th className="py-2 pr-4 font-medium">Time Out</th>
                                            <th className="py-2 pr-4 font-medium">Hours</th>
                                            <th className="py-2 pr-4 font-medium">Lunch Deducted</th>
                                            <th className="py-2 font-medium">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr
                                                key={`${log.intern_user_id}-${log.date}`}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4">
                                                    {log.date}
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        {log.day.slice(0, 3)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">{log.intern_name}</td>
                                                <td className="py-2 pr-4">{log.time_in}</td>
                                                <td className="py-2 pr-4">{log.time_out ?? '—'}</td>
                                                <td className="py-2 pr-4 tabular-nums">
                                                    {log.hours_rendered.toFixed(2)}
                                                </td>
                                                <td className="py-2 pr-4">{log.lunch_deducted ? 'Yes' : 'No'}</td>
                                                <td className="py-2">
                                                    <Badge variant={log.punctuality === 'on_time' ? 'default' : 'destructive'}>
                                                        {log.punctuality === 'on_time' ? 'On Time' : 'Late'}
                                                    </Badge>
                                                    {log.status === 'open' && (
                                                        <Badge variant="outline" className="ml-1">
                                                            No time-out
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

MyInterns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Interns', href: '/supervisor/interns' },
    ],
};