import { Head, usePage } from '@inertiajs/react';
import { ClipboardCheck, Clock, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

interface SupervisorDashboardProps {
    myInternsCount?: number;
    pendingDtrApprovals?: number;
    hoursLoggedThisWeek?: number;
}

export default function SupervisorDashboard({
    myInternsCount = 0,
    pendingDtrApprovals = 0,
    hoursLoggedThisWeek = 0,
}: SupervisorDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const stats = [
        { label: 'My Interns', value: myInternsCount, icon: GraduationCap },
        { label: 'Pending DTR Approvals', value: pendingDtrApprovals, icon: ClipboardCheck },
        { label: 'Hours Logged This Week', value: hoursLoggedThisWeek, icon: Clock },
    ];

    return (
        <>
            <Head title="Supervisor Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {auth.user.name}</h1>
                    <p className="text-muted-foreground text-sm">Track your interns' hours and approvals here.</p>
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
                        <CardTitle>DTR Entries Awaiting Approval</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            No entries to review yet — this list will populate once your interns start logging time.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};