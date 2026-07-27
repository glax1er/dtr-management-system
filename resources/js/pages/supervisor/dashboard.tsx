import { Head, usePage } from '@inertiajs/react';
import { ClipboardCheck, Clock, GraduationCap } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

interface RecentScan {
    intern_name: string;
    label: 'time_in' | 'time_out';
    scanned_at: string;
}

interface SupervisorDashboardProps {
    myInternsCount: number;
    scansToday: number;
    scansThisWeek: number;
    recentScans: RecentScan[];
    isOjtSupervisor?: boolean;
    scopeName?: string;
}

export default function SupervisorDashboard({
    myInternsCount,
    scansToday,
    scansThisWeek,
    recentScans,
    isOjtSupervisor = false,
    scopeName,
}: SupervisorDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const stats = [
        { label: 'My Interns', value: myInternsCount, icon: GraduationCap },
        { label: 'Scans Today', value: scansToday, icon: ClipboardCheck },
        { label: 'Scans This Week', value: scansThisWeek, icon: Clock },
    ];

    return (
        <>
            <Head title="Supervisor Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isOjtSupervisor
                            ? `Viewing and monitoring every intern in the ${scopeName ?? 'program'} program, across all HTEs.`
                            : 'Attendance is now recorded through the shared scanning station.'}
                    </p>
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    {stats.map(({ label, value, icon: Icon }) => (
                        <Card key={label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {label}
                                </CardTitle>
                                <Icon className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {value}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Recent Scans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentScans.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {isOjtSupervisor
                                    ? 'No scans recorded yet — this list fills up as interns in your program scan in.'
                                    : 'No scans recorded yet — this list fills up as interns from your HTE scan in.'}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentScans.map((scan, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{scan.intern_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {scan.label === 'time_in' ? 'Timed In' : 'Timed Out'} · {scan.scanned_at}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};