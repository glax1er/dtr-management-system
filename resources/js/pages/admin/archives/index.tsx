import { Head, router } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    LayoutGrid,
    Search,
    Table as TableIcon,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dashboard } from '@/routes';

// ── Types ────────────────────────────────────────────────────────────────────
interface ArchivedRecord {
    id: number;
    name: string;
    detail: string;
    deleted_at: string;
}

interface Filters {
    search?: string;
    per_page?: number;
}

interface ArchivesIndexProps {
    records: Paginated<ArchivedRecord>;
    currentType: 'htes' | 'supervisors' | 'interns' | 'programs';
    filters?: Filters;
    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

type ViewMode = 'table' | 'grid';

const TABS: { label: string; value: 'htes' | 'supervisors' | 'interns' | 'programs'; detailLabel: string }[] = [
    { label: 'Interns', value: 'interns', detailLabel: 'ID Number' },
    { label: 'Supervisors', value: 'supervisors', detailLabel: 'Email' },
    { label: 'HTEs', value: 'htes', detailLabel: 'Address' },
    { label: 'Programs', value: 'programs', detailLabel: 'Required Hours' },
];

export default function ArchivesIndex({ records, currentType, filters }: ArchivesIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters?.search ?? '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    // Confirmation dialog state
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<ArchivedRecord | null>(null);

    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
    const [forceDeleteTarget, setForceDeleteTarget] = useState<ArchivedRecord | null>(null);

    const activeTab = TABS.find((t) => t.value === currentType) ?? TABS[0];

    // ── Navigation & Query Handling ──────────────────────────────────────────
    const baseParams = () => ({
        type: currentType,
        search: search || undefined,
        per_page: filters?.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/admin/archives', params, { preserveState: true, preserveScroll: true });
    };

    const switchTab = (type: string) => {
        setSearch('');
        visit({ type, per_page: filters?.per_page ? String(filters.per_page) : undefined, page: undefined });
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

    // ── Action Handlers ──────────────────────────────────────────────────────
    const openRestoreDialog = (record: ArchivedRecord) => {
        setRestoreTarget(record);
        setRestoreOpen(true);
    };

    const submitRestore = () => {
        if (!restoreTarget) return;
        router.post(
            `/admin/archives/${currentType}/${restoreTarget.id}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRestoreOpen(false);
                    setRestoreTarget(null);
                },
            }
        );
    };

    const openForceDeleteDialog = (record: ArchivedRecord) => {
        setForceDeleteTarget(record);
        setForceDeleteOpen(true);
    };

    const submitForceDelete = () => {
        if (!forceDeleteTarget) return;
        router.delete(`/admin/archives/${currentType}/${forceDeleteTarget.id}`, {
            preserveScroll: true,
            // Inertia's onSuccess fires for ANY completed visit (including a
            // back()->with('error', ...) redirect when the delete was blocked
            // by a foreign key constraint) — it does NOT mean the record was
            // actually deleted. Check the fresh flash props before treating
            // this as resolved, otherwise the dialog closes and the row looks
            // "handled" even though it's still sitting in the database.
            onSuccess: (page) => {
                const flash = (page.props as { flash?: { error?: string | null } }).flash;
                if (flash?.error) return;

                setForceDeleteOpen(false);
                setForceDeleteTarget(null);
            },
        });
    };

    // ── Action Component ─────────────────────────────────────────────────────
    const ArchiveActions = ({ record }: { record: ArchivedRecord }) => (
        <div className="flex justify-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openRestoreDialog(record)}>
                        <ArchiveRestore className="size-4 text-emerald-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openForceDeleteDialog(record)}>
                        <Trash2 className="size-4 text-destructive" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Permanently</TooltipContent>
            </Tooltip>
        </div>
    );

    return (
        <>
            <Head title="Archives" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Archive className="size-5" />
                        </span>
                        Archives
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Desktop Search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${activeTab.label.toLowerCase()}…`}
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

                        {/* Mobile Search Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Tabs Filter */}
                        <div className="overflow-x-auto max-w-[calc(100%-3rem)] sm:max-w-none scrollbar-none">
                            <Tabs value={currentType} onValueChange={switchTab}>
                                <TabsList className="w-auto">
                                    {TABS.map((tab) => (
                                        <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm px-2 sm:px-3">
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* View Switcher — Desktop Only */}
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

                {/* Mobile Inline Search */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-2 sm:hidden w-full"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${activeTab.label.toLowerCase()}…`}
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSearch();
                                        setMobileSearchOpen(false);
                                    }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" size="sm">
                            Search
                        </Button>
                    </form>
                )}

                {/* Main Content Area */}
                {records.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            Nothing archived under {activeTab.label}
                            {search ? ' matches your search.' : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table View — Desktop Only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">Name</TableHead>
                                                    <TableHead className="px-6 text-center">{activeTab.detailLabel}</TableHead>
                                                    <TableHead className="px-6 text-center">Archived On</TableHead>
                                                    <TableHead className="px-6 text-center">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {records.data.map((record) => (
                                                    <TableRow key={record.id}>
                                                        <TableCell className="px-6 font-medium whitespace-nowrap">
                                                            {record.name}
                                                        </TableCell>
                                                        <TableCell
                                                            className="max-w-[240px] truncate px-6 text-center text-muted-foreground"
                                                            title={record.detail}
                                                        >
                                                            {record.detail}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap text-muted-foreground">
                                                            {record.deleted_at}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <ArchiveActions record={record} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={records}
                                            itemLabel="archived item"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="archives-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid View — Mobile Default & Desktop Grid View */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {records.data.map((record) => (
                                    <Card key={record.id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="truncate text-base">{record.name}</CardTitle>
                                                    <p
                                                        className="mt-0.5 truncate text-xs text-muted-foreground"
                                                        title={record.detail}
                                                    >
                                                        {record.detail}
                                                    </p>
                                                </div>
                                                <div className="shrink-0">
                                                    <ArchiveActions record={record} />
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="shrink-0 text-muted-foreground">Archived On</span>
                                                <span className="text-right text-muted-foreground">{record.deleted_at}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div className="mt-4">
                                <NumberedPagination
                                    meta={records}
                                    itemLabel="archived item"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="archives-grid-per-page"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog
                open={restoreOpen}
                onOpenChange={setRestoreOpen}
                title="Restore Record"
                description={`Restore "${restoreTarget?.name}"? It will reappear in its original active list.`}
                onConfirm={submitRestore}
                confirmText="Restore"
            />

            <ConfirmationDialog
    open={forceDeleteOpen}
    onOpenChange={setForceDeleteOpen}
    title="Delete Permanently"
    description={`Permanently delete "${forceDeleteTarget?.name}"? This action CANNOT be undone.`}
    onConfirm={submitForceDelete}
    confirmText="Delete Permanently"
/>
        </>
    );
}

ArchivesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archives', href: '/admin/archives' },
    ],
};