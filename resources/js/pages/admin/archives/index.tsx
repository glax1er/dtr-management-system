import { Head, router, usePage } from '@inertiajs/react';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

interface ArchivedRecord {
    id: number;
    name: string;
    detail: string;
    deleted_at: string;
}

interface ArchivesIndexProps {
    records: Paginated<ArchivedRecord>;
    currentType: 'htes' | 'supervisors' | 'interns' | 'programs';
}

interface FlashProps {
    success?: string;
    error?: string;
    [key: string]: unknown;
}

const TABS: { label: string; value: 'htes' | 'supervisors' | 'interns' | 'programs'; detailLabel: string }[] = [
    { label: 'HTEs', value: 'htes', detailLabel: 'Address' },
    { label: 'Supervisors', value: 'supervisors', detailLabel: 'Email' },
    { label: 'Interns', value: 'interns', detailLabel: 'ID Number' },
    { label: 'Programs', value: 'programs', detailLabel: 'Required Hours' },
];

export default function ArchivesIndex({ records, currentType }: ArchivesIndexProps) {
    const { props } = usePage<{ flash: FlashProps }>();
    const flash = props.flash;

    const activeTab = TABS.find((t) => t.value === currentType) ?? TABS[0];

    const switchTab = (type: string) => {
        router.get('/admin/archives', { type }, { preserveState: true, preserveScroll: true });
    };

    const goToPage = (page: number) => {
        router.get('/admin/archives', { type: currentType, page: String(page) }, { preserveState: true, preserveScroll: true });
    };

    const restore = (id: number, name: string) => {
        if (confirm(`Restore ${name}? It will reappear in its original list.`)) {
            router.post(`/admin/archives/${currentType}/${id}/restore`, {}, { preserveScroll: true });
        }
    };

    const forceDelete = (id: number, name: string) => {
        if (confirm(`Permanently delete ${name}? This CANNOT be undone — there is no restore after this.`)) {
            router.delete(`/admin/archives/${currentType}/${id}`, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Archives" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Archives</h1>
                    <p className="text-muted-foreground text-sm">
                        Inactive HTEs, inactive Supervisors, and rejected Interns that have been deleted.
                    </p>
                </div>

                {flash?.success && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                        {flash.error}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <Button
                            key={tab.value}
                            variant={currentType === tab.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => switchTab(tab.value)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>{activeTab.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {records.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Nothing archived under {activeTab.label} yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">{activeTab.detailLabel}</th>
                                            <th className="py-2 pr-4 font-medium">Archived On</th>
                                            <th className="py-2 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.data.map((record) => (
                                            <tr key={record.id} className="border-b last:border-0 hover:bg-muted/40">
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{record.name}</td>
                                                <td className="max-w-[220px] truncate py-2.5 pr-4" title={record.detail}>
                                                    {record.detail}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                                                    {record.deleted_at}
                                                </td>
                                                <td className="py-2.5">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => restore(record.id, record.name)}>
                                                            Restore
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => forceDelete(record.id, record.name)}
                                                        >
                                                            Delete Permanently
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationFooter
                            meta={records}
                            itemLabel="record"
                            onPageChange={goToPage}
                            onPerPageChange={() => {}}
                            idPrefix="archives-per-page"
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ArchivesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archives', href: '/admin/archives' },
    ],
};