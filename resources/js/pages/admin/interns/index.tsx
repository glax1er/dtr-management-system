import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PaginationFooter from '@/components/pagination-footer';
import type { Paginated } from '@/components/pagination-footer';
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

interface Filters {
    search: string;
    per_page: number;
}

interface InternsIndexProps {
    interns: Paginated<Intern>;
    currentStatus: string;
    filters: Filters;
}

const TABS: { label: string; value: string }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];

export default function InternsIndex({ interns, currentStatus, filters }: InternsIndexProps) {
    const [search, setSearch] = useState(filters.search);

    // Base params shared by every navigation action. Anything that
    // changes what rows match (status, search) resets back to page 1
    // by simply omitting the page param.
    const baseParams = () => ({
        status: currentStatus,
        search: filters.search || undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/interns', params, { preserveState: true, preserveScroll: true });
    };

    const switchTab = (status: string) => {
        visit({ ...baseParams(), status, search: filters.search || undefined });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage) });
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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Interns</h1>
                    <p className="text-muted-foreground text-sm">Manage intern registrations by status.</p>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
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

                    <form onSubmit={applySearch} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="search" className="text-xs text-muted-foreground">
                                Search by name
                            </Label>
                            <Input
                                id="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="e.g. Juan Dela Cruz"
                                className="w-full sm:w-56"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" variant="secondary" size="sm">
                                Search
                            </Button>
                            {filters.search !== '' && (
                                <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
                                    Clear
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="capitalize">{currentStatus} Interns</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {interns.data.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No {currentStatus} interns{filters.search ? ' match your search.' : '.'}
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {interns.data.map((intern) => (
                                    <div
                                        key={intern.user_id}
                                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{intern.name}</p>
                                            <p className="text-muted-foreground truncate text-sm">
                                                {intern.id_number} · {intern.program_name} · {intern.hte_name}
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Registered {intern.registered_at}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 gap-2">
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

                        <PaginationFooter
                            meta={interns}
                            itemLabel="intern"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="interns-per-page"
                        />
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
