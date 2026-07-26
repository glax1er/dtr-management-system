import { Head, router } from '@inertiajs/react';
import { Building2, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

interface RecentRegistration {
    user_id: number;
    name: string;
    hte_name: string;
    program_name: string;
    status: 'pending' | 'approved' | 'rejected';
    registered_at: string;
}

interface AdminDashboardProps {
    pendingApprovals: number;
    totalInterns: number;
    totalSupervisors: number;
    activeHtes: number;
    recentRegistrations: RecentRegistration[];
}

export default function AdminDashboard({
    pendingApprovals,
    totalInterns,
    totalSupervisors,
    activeHtes,
    recentRegistrations,
}: AdminDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const stats = [
        {
            label: 'Pending Approvals',
            value: pendingApprovals,
            icon: ClipboardCheck,
            onClick: () => router.visit('/admin/interns?status=pending'),
        },
        { label: 'Total Interns', value: totalInterns, icon: GraduationCap },
        { label: 'Total Supervisors', value: totalSupervisors, icon: Users },
        { label: 'Active HTEs', value: activeHtes, icon: Building2 },
    ];

    const statusVariant = (status: string) =>
        status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary';

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {auth.user.name}</h1>
                    <p className="text-muted-foreground text-sm">Here's what's happening across the system.</p>
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map(({ label, value, icon: Icon, onClick }) => (
                        <Card
                            key={label}
                            className={onClick ? 'cursor-pointer transition-colors hover:bg-muted/50' : undefined}
                            onClick={onClick}
                        >
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
                        <CardTitle>Recent Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentRegistrations.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No registrations yet.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentRegistrations.map((intern) => (
                                    <div
                                        key={intern.user_id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{intern.name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {intern.program_name} · {intern.hte_name}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Registered {intern.registered_at}
                                            </p>
                                        </div>
                                        <Badge variant={statusVariant(intern.status)} className="capitalize">
                                            {intern.status}
                                        </Badge>
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

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};