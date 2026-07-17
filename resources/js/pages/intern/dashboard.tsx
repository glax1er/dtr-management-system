import { Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

interface InternDashboardProps {
    hoursLoggedThisWeek?: number;
    totalHoursRequired?: number;
    totalHoursCompleted?: number;
}

export default function InternDashboard({
    hoursLoggedThisWeek = 0,
    totalHoursRequired = 0,
    totalHoursCompleted = 0,
}: InternDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const stats = [
        { label: 'Hours This Week', value: hoursLoggedThisWeek, icon: Clock },
        { label: 'Hours Completed', value: totalHoursCompleted, icon: CheckCircle2 },
        { label: 'Hours Required', value: totalHoursRequired, icon: Timer },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {auth.user.name}</h1>
                    <p className="text-muted-foreground text-sm">Here's your internship progress.</p>
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    {stats.map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                <Icon className="text-muted-foreground size-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Recent Time Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            No time entries logged yet — start logging your daily hours once the DTR form is ready.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

InternDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};