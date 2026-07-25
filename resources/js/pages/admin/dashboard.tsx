// resources/js/pages/admin/dashboard.tsx

import { Head, router, usePage } from '@inertiajs/react';
import { Building2, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

interface PendingIntern {
    user_id: number;
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    registered_at: string;
}

interface AdminDashboardProps {
    pendingApprovals: number;
    totalInterns: number;
    totalSupervisors: number;
    activePrograms: number;
    pendingInterns: PendingIntern[];
}

export default function AdminDashboard({
    pendingApprovals,
    totalInterns,
    totalSupervisors,
    activePrograms,
    pendingInterns,
}: AdminDashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const stats = [
        { label: 'Pending Approvals', value: pendingApprovals, icon: ClipboardCheck },
        { label: 'Total Interns', value: totalInterns, icon: GraduationCap },
        { label: 'Total Supervisors', value: totalSupervisors, icon: Users },
        { label: 'Active Programs', value: activePrograms, icon: Building2 },
    ];

    const handleApprove = (userId: number) => {
        router.post(`/admin/interns/${userId}/approve`, {}, { preserveScroll: true });
    };

    const handleReject = (userId: number) => {
        router.post(`/admin/interns/${userId}/reject`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {auth.user.name}</h1>
                    <p className="text-muted-foreground text-sm">Here's what needs your attention today.</p>
                </div>

                <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
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

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base">Pending Intern Approvals</CardTitle>
                        {pendingInterns.length > 0 && (
                            <span className="text-muted-foreground text-xs">
                                {pendingInterns.length} awaiting review
                            </span>
                        )}
                    </CardHeader>
                    <CardContent>
                        {pendingInterns.length === 0 ? (
                            <p className="text-muted-foreground py-2 text-sm">No pending approvals right now.</p>
                        ) : (
                            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                                {pendingInterns.map((intern) => (
                                    <div
                                        key={intern.user_id}
                                        className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{intern.name}</p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {intern.id_number} · {intern.program_name} · {intern.hte_name}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-1.5">
                                            <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => handleApprove(intern.user_id)}>
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => handleReject(intern.user_id)}
                                            >
                                                Reject
                                            </Button>
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

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};