import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

interface Intern {
    user_id: number;
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    status: 'pending' | 'approved' | 'rejected';
    registered_at: string;
}

interface InternsIndexProps {
    interns: Intern[];
    currentStatus: string;
}

const TABS: { label: string; value: string }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];

export default function InternsIndex({ interns, currentStatus }: InternsIndexProps) {
    const switchTab = (status: string) => {
        router.get('/admin/interns', { status }, { preserveState: true, preserveScroll: true });
    };

    const approve = (userId: number) => {
        router.post(`/admin/interns/${userId}/approve`, {}, { preserveScroll: true });
    };

    const reject = (userId: number) => {
        router.post(`/admin/interns/${userId}/reject`, {}, { preserveScroll: true });
    };

    const undo = (userId: number, name: string) => {
        if (confirm(`Revert ${name} back to pending?`)) {
            router.post(`/admin/interns/${userId}/undo`, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Interns" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Interns</h1>
                    <p className="text-muted-foreground text-sm">Manage intern registrations by status.</p>
                </div>

                <div className="flex gap-2">
                    {TABS.map((tab) => (
                        <Button
                            key={tab.value}
                            variant={currentStatus === tab.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => switchTab(tab.value)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="capitalize">{currentStatus} Interns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {interns.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No {currentStatus} interns.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {interns.map((intern) => (
                                    <div
                                        key={intern.user_id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{intern.name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {intern.id_number} · {intern.program_name} · {intern.hte_name}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Registered {intern.registered_at}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            {intern.status === 'pending' && (
                                                <>
                                                    <Button size="sm" onClick={() => approve(intern.user_id)}>
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => reject(intern.user_id)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            )}

                                            {(intern.status === 'approved' || intern.status === 'rejected') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => undo(intern.user_id, intern.name)}
                                                >
                                                    Undo
                                                </Button>
                                            )}
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

InternsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Interns', href: '/admin/interns' },
    ],
};