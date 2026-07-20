import { Head, Link, router } from '@inertiajs/react';
import { ArchiveRestore, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

interface ArchivedSupervisor {
    archive_id: number;
    user_id: number;
    name: string;
    email: string;
    hte_name: string;
    archived_at: string;
}

interface ArchivesProps {
    supervisors: ArchivedSupervisor[];
}

export default function SupervisorsArchives({ supervisors }: ArchivesProps) {
    const handleRestore = (userId: number) => {
        if (confirm('Restore this supervisor to active status?')) {
            router.patch(`/admin/supervisors/${userId}/restore`, {}, { preserveScroll: true });
        }
    };

    const handleDelete = (userId: number) => {
        if (confirm('WARNING: This will permanently delete the supervisor and their account. This cannot be undone. Continue?')) {
            router.delete(`/admin/supervisors/${userId}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Supervisor Archives" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link href="/admin/supervisors">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Back
                                </Button>
                            </Link>
                        </div>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Archives</h1>
                        <p className="text-muted-foreground text-sm">
                            Inactive supervisors that have been archived. Restore to reactivate or delete permanently.
                        </p>
                    </div>
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Archived Supervisors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {supervisors.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No archived supervisors.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {supervisors.map((supervisor) => (
                                    <div
                                        key={supervisor.archive_id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">{supervisor.name}</p>
                                            <p className="text-muted-foreground text-sm">
                                                {supervisor.email} · {supervisor.hte_name}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Archived on {supervisor.archived_at}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRestore(supervisor.user_id)}
                                            >
                                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                                Restore
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(supervisor.user_id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
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

SupervisorsArchives.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Supervisors', href: '/admin/supervisors' },
        { title: 'Archives', href: '/admin/supervisors/archives' },
    ],
};