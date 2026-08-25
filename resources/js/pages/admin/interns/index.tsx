import { Head, router } from '@inertiajs/react';
import {
    GraduationCap,
    LayoutGrid,
    Search,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { InternActions } from '@/components/intern-actions';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

type ViewMode = 'table' | 'grid';

const TABS: { label: string; value: string }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];

export default function InternsIndex({ interns, currentStatus, filters }: InternsIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const [undoOpen, setUndoOpen] = useState(false);
    const [undoTarget, setUndoTarget] = useState<Intern | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Intern | null>(null);

    const baseParams = () => ({
        status: currentStatus,
        search: filters.search || undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/interns', params, { preserveState: true, preserveScroll: true });
    };

    const switchTab = (status: string) => {
        setSearch('');
        visit({ status, per_page: String(filters.per_page), page: undefined });
    };

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined, page: undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined, page: undefined });
    };

    const goToPage = (page: number) => visit({ ...baseParams(), page: String(page) });
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    const approve = (intern: Intern) => {
        router.post(`/admin/interns/${intern.user_id}/approve`, {}, { preserveScroll: true });
    };

    const reject = (intern: Intern) => {
        router.post(`/admin/interns/${intern.user_id}/reject`, {}, { preserveScroll: true });
    };

    const openUndoDialog = (intern: Intern) => {
        setUndoTarget(intern);
        setUndoOpen(true);
    };

    const submitUndo = () => {
        if (!undoTarget) return;
        router.post(`/admin/interns/${undoTarget.user_id}/undo`, {}, { preserveScroll: true });
        setUndoOpen(false);
        setUndoTarget(null);
    };

    const openDeleteDialog = (intern: Intern) => {
        setDeleteTarget(intern);
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (!deleteTarget) return;
        router.delete(`/admin/interns/${deleteTarget.user_id}`, { preserveScroll: true });
        setDeleteOpen(false);
        setDeleteTarget(null);
    };

    return (
        <>
            <Head title="Interns" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <GraduationCap className="size-5" />
                        </span>
                        Interns
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search interns…"
                                className="h-9 w-48 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        <div className="overflow-x-auto max-w-[calc(100%-3rem)] sm:max-w-none scrollbar-none">
                            <Tabs value={currentStatus} onValueChange={switchTab}>
                                <TabsList className="w-auto">
                                    {TABS.map((tab) => (
                                        <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm px-2 sm:px-3">
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="hidden sm:block">
                            <div className="inline-flex rounded-md border p-0.5">
                                <Button
                                    variant={view === 'table' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="size-8"
                                    onClick={() => setView('table')}
                                >
                                    <TableIcon className="size-4" />
                                </Button>
                                <Button
                                    variant={view === 'grid' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="size-8"
                                    onClick={() => setView('grid')}
                                >
                                    <LayoutGrid className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => { applySearch(e); setMobileSearchOpen(false); }}
                        className="flex items-center gap-2 sm:hidden w-full"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search interns…"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { clearSearch(); setMobileSearchOpen(false); }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" size="sm">Search</Button>
                    </form>
                )}

                {interns.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No {currentStatus} interns{filters.search ? ' match your search.' : '.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">Name</TableHead>
                                                    <TableHead className="px-6 text-center">ID Number</TableHead>
                                                    <TableHead className="px-6 text-center">Program</TableHead>
                                                    <TableHead className="px-6 text-center">HTE</TableHead>
                                                    <TableHead className="px-6 text-center">Status</TableHead>
                                                    <TableHead className="px-6 text-center">Registered</TableHead>
                                                    <TableHead className="px-6 text-center">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {interns.data.map((intern) => (
                                                    <TableRow key={intern.user_id}>
                                                        <TableCell className="px-6">
                                                            <p className="font-medium whitespace-nowrap">{intern.name}</p>
                                                            <p
                                                                className="max-w-[180px] truncate text-xs text-muted-foreground"
                                                                title={intern.email}
                                                            >
                                                                {intern.email}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            {intern.id_number}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-[160px] truncate px-6 text-center"
                                                            title={intern.program_name}
                                                        >
                                                            {intern.program_name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-[160px] truncate px-6 text-center"
                                                            title={intern.hte_name}
                                                        >
                                                            {intern.hte_name}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <StatusBadge status={intern.status} />
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap text-muted-foreground">
                                                            {intern.registered_at}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <InternActions
                                                                intern={intern}
                                                                onApprove={approve}
                                                                onReject={reject}
                                                                onUndo={openUndoDialog}
                                                                onDelete={openDeleteDialog}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={interns}
                                            itemLabel="intern"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="interns-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {interns.data.map((intern) => (
                                    <Card key={intern.user_id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="truncate text-base">
                                                        {intern.name}
                                                    </CardTitle>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {intern.email}
                                                    </p>
                                                    <div className="mt-2">
                                                        <StatusBadge status={intern.status} />
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <InternActions
                                                        intern={intern}
                                                        onApprove={approve}
                                                        onReject={reject}
                                                        onUndo={openUndoDialog}
                                                        onDelete={openDeleteDialog}
                                                    />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="text-muted-foreground">ID Number</span>
                                                <span>{intern.id_number}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Program</span>
                                                <span className="truncate text-right">{intern.program_name}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">HTE</span>
                                                <span className="truncate text-right">{intern.hte_name}</span>
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <span className="text-muted-foreground">Registered</span>
                                                <span>{intern.registered_at}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="mt-4">
                                <NumberedPagination
                                    meta={interns}
                                    itemLabel="intern"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="interns-grid-per-page"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ConfirmationDialog
                open={undoOpen}
                onOpenChange={setUndoOpen}
                title="Revert to Pending"
                description={`Revert ${undoTarget?.name}'s status back to pending?`}
                onConfirm={submitUndo}
                confirmText="Revert"
            />

            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Move to Archives"
                description={`Move ${deleteTarget?.name}'s record to Archives?`}
                onConfirm={submitDelete}
                confirmText="Archive"
            />
        </>
    );
}

InternsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Interns', href: '/admin/interns' },
    ],
};