import { Head, router, usePage } from '@inertiajs/react';
import { Building2, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
import { dashboard } from '@/routes';
import type { PageProps } from '@/types';

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
    recentRegistrations: Paginated<RecentRegistration>;
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

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/dashboard', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const goToPage = (page: number) => {
        visit({ page: String(page), per_page: String(recentRegistrations.per_page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ per_page: String(perPage) });
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Welcome back, {auth.user.name}</h1>
                    <p className="text-muted-foreground text-sm">Here's what's happening across the system.</p>
                </div>

                <div className="grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map(({ label, value, icon: Icon, onClick }) => (
                        <Card
                            key={label}
                            className={onClick ? 'cursor-pointer transition-colors hover:bg-muted/50' : undefined}
                            onClick={onClick}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                <Icon className="text-muted-foreground size-4 shrink-0" />
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
                    <CardContent className="flex flex-col gap-4">
                        {recentRegistrations.data.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No registrations yet.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentRegistrations.data.map((intern) => (
                                    <div
                                        key={intern.user_id}
                                        className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{intern.name}</p>
                                            <p className="text-muted-foreground truncate text-sm">
                                                {intern.program_name} · {intern.hte_name}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Registered {intern.registered_at}
                                            </p>
                                        </div>
                                        <Badge variant={statusVariant(intern.status)} className="w-fit capitalize">
                                            {intern.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        <PaginationFooter
                            meta={recentRegistrations}
                            itemLabel="registration"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="dashboard-per-page"
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
