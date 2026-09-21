import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Archive,
    Building2,
    LayoutGrid,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    User,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';

interface CollegeOption {
    id: number;
    name: string;
    code: string;
}

interface Hte {
    hte_id: number;
    college_id?: number | null;
    college?: CollegeOption | null;
    hte_name: string;
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    status: 'active' | 'inactive';
    id_bg_url: string | null;
    interns_count: number;
    supervisors_count: number;
}

interface Filters {
    search: string;
    status: string;
    college_id?: number | null;
    per_page: number;
}

interface HtesIndexProps {
    htes: Paginated<Hte>;
    colleges?: CollegeOption[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

interface HteActionsProps {
    hte: Hte;
    onEdit: (hte: Hte) => void;
    onToggleStatus: (hte: Hte) => void;
    onArchive: (hteId: number, name: string) => void;
}

function HteActions({
    hte,
    onEdit,
    onToggleStatus,
    onArchive,
}: HteActionsProps) {
    return (
        <div className="flex justify-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(hte)}
                        aria-label={`Edit ${hte.hte_name}`}
                    >
                        <Pencil className="size-4 text-blue-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStatus(hte)}
                        aria-label={
                            hte.status === 'active'
                                ? `Deactivate ${hte.hte_name}`
                                : `Activate ${hte.hte_name}`
                        }
                    >
                        {hte.status === 'active' ? (
                            <PowerOff className="size-4 text-destructive" />
                        ) : (
                            <Power className="size-4 text-emerald-600" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {hte.status === 'active' ? 'Deactivate' : 'Activate'}
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        tabIndex={hte.status === 'active' ? 0 : undefined}
                        className="inline-flex"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={hte.status === 'active'}
                            onClick={() => onArchive(hte.hte_id, hte.hte_name)}
                            aria-label={`Archive ${hte.hte_name}`}
                        >
                            <Archive className="size-4 text-orange-600" />
                        </Button>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    {hte.status === 'active'
                        ? 'Archive inactive HTEs only'
                        : 'Archive to collection'}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export default function HtesIndex({
    htes,
    colleges = [],
    filters,
}: HtesIndexProps) {
    const { auth } = usePage<any>().props;
    const isSuperAdmin =
        auth?.user?.is_super_admin ??
        (auth?.user?.role === 'super_admin' ||
            (auth?.user?.role === 'admin' && !auth?.user?.college_id));

    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [collegeFilter, setCollegeFilter] = useState<number | null>(
        filters.college_id ?? null,
    );
    // Track the filter values search/status/college were last synced from, so
    // browser back/forward navigation (which changes `filters` without
    // this component unmounting) resets the local drafts during render
    // instead of via a post-commit effect.
    const [syncedFilters, setSyncedFilters] = useState(filters);

    if (
        filters.search !== syncedFilters.search ||
        filters.status !== syncedFilters.status ||
        filters.college_id !== syncedFilters.college_id
    ) {
        setSyncedFilters(filters);
        setSearch(filters.search || '');
        setStatus(filters.status || '');
        setCollegeFilter(filters.college_id ?? null);
    }

    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const [addOpen, setAddOpen] = useState(false);
    const [editingHte, setEditingHte] = useState<Hte | null>(null);

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveHteId, setArchiveHteId] = useState<number | null>(null);
    const [archiveHteName, setArchiveHteName] = useState('');

    const [addBgPreview, setAddBgPreview] = useState<string | null>(null);
    const [editBgPreview, setEditBgPreview] = useState<string | null>(null);
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    const addForm = useForm<{
        college_id: string;
        hte_name: string;
        address: string;
        contact_number: string;
        id_bg: File | null;
    }>({
        college_id: '',
        hte_name: '',
        address: '',
        contact_number: '',
        id_bg: null,
    });

    const editForm = useForm<{
        _method: string;
        college_id: string;
        hte_name: string;
        address: string;
        contact_number: string;
        id_bg: File | null;
        remove_id_bg: boolean;
    }>({
        _method: 'patch',
        college_id: '',
        hte_name: '',
        address: '',
        contact_number: '',
        id_bg: null,
        remove_id_bg: false,
    });

    // -- Navigation helpers ------------------------------------------
    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/htes', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        college_id: collegeFilter ? String(collegeFilter) : undefined,
        per_page: String(filters.per_page),
    });

    const applyCollegeFilter = (value: string) => {
        const nextCollege = value === 'all' ? null : Number(value);
        setCollegeFilter(nextCollege);
        visit({
            ...baseParams(),
            college_id: nextCollege ? String(nextCollege) : undefined,
            page: undefined,
        });
    };

    // Automatically trigger search as user types
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        if (debouncedSearch !== (filters.search || '')) {
            visit({
                ...baseParams(),
                search: debouncedSearch || undefined,
                page: undefined,
            });
        }
        // Navigation helpers intentionally remain local to preserve current filters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const applySearch = (event: FormEvent) => {
        event.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({
            status: status || undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const applyStatus = (value: string) => {
        const nextStatus = value === 'all' ? '' : value;
        setStatus(nextStatus);
        visit({
            search: search || undefined,
            status: nextStatus || undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) }, false);
    };

    const changePerPage = (perPage: number) => {
        visit({
            search: search || undefined,
            status: status || undefined,
            per_page: String(perPage),
            page: undefined,
        });
    };

    // -- CRUD helpers ------------------------------------------------
    const openAddDialog = () => {
        addForm.reset();
        addForm.clearErrors();
        setAddBgPreview(null);
        if (addFileInputRef.current) {
            addFileInputRef.current.value = '';
        }
        setAddOpen(true);
    };

    const closeAddDialog = () => {
        setAddOpen(false);
        addForm.reset();
        addForm.clearErrors();
        setAddBgPreview(null);
        if (addFileInputRef.current) {
            addFileInputRef.current.value = '';
        }
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/admin/htes', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                closeAddDialog();
            },
        });
    };

    const openEditDialog = (hte: Hte) => {
        editForm.clearErrors();
        editForm.setData({
            _method: 'patch',
            college_id: hte.college_id ? String(hte.college_id) : '',
            hte_name: hte.hte_name,
            address: hte.address ?? '',
            contact_number: hte.contact_number ?? '',
            id_bg: null,
            remove_id_bg: false,
        });
        setEditBgPreview(null);
        if (editFileInputRef.current) {
            editFileInputRef.current.value = '';
        }
        setEditingHte(hte);
    };

    const closeEditDialog = () => {
        setEditingHte(null);
        editForm.clearErrors();
        setEditBgPreview(null);
        if (editFileInputRef.current) {
            editFileInputRef.current.value = '';
        }
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingHte) {
            return;
        }

        editForm.post(`/admin/htes/${editingHte.hte_id}`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => closeEditDialog(),
        });
    };

    const toggleStatus = (hte: Hte) => {
        router.patch(
            `/admin/htes/${hte.hte_id}/status`,
            { status: hte.status === 'active' ? 'inactive' : 'active' },
            { preserveScroll: true },
        );
    };

    const openArchiveDialog = (hteId: number, name: string) => {
        setArchiveHteId(hteId);
        setArchiveHteName(name);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (archiveHteId !== null) {
            router.delete(`/admin/htes/${archiveHteId}`, {
                preserveScroll: true,
            });
            setArchiveOpen(false);
            setArchiveHteId(null);
            setArchiveHteName('');
        }
    };

    return (
        <>
            <Head title="HTEs" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* -- Header toolbar -------------------------------------- */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Building2 className="size-5" />
                        </span>
                        Host Training Establishments
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop: full search input */}
                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs..."
                                className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile: search icon toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        {/* Status filter — full on sm+, icon-only on mobile */}
                        <div className="hidden sm:block">
                            <Select
                                value={status || 'all'}
                                onValueChange={applyStatus}
                            >
                                <SelectTrigger className="h-9 w-36">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={status || 'all'}
                                onValueChange={applyStatus}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="all">
                                        All Status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* College filter — super admin only */}
                        {isSuperAdmin && colleges.length > 0 && (
                            <div className="hidden sm:block">
                                <Select
                                    value={collegeFilter ? String(collegeFilter) : 'all'}
                                    onValueChange={applyCollegeFilter}
                                >
                                    <SelectTrigger className="h-9 w-40">
                                        <Building2 className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="All Colleges" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Colleges
                                        </SelectItem>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* View toggle — desktop only */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger
                                        value="table"
                                        aria-label="Table view"
                                    >
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="grid"
                                        aria-label="Grid view"
                                    >
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Add HTE — icon+text on desktop, icon-only on mobile */}
                        <Button onClick={openAddDialog}>
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Add HTE</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile inline search bar */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs..."
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
                                    aria-label="Clear search"
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

                {/* -- Content --------------------------------------------- */}
                {htes.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No HTEs
                            {filters.search || filters.status
                                ? ' match this filter.'
                                : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table view — desktop only */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">
                                                        Host Training
                                                        Establishment
                                                    </TableHead>
                                                    {isSuperAdmin && (
                                                        <TableHead className="px-6 text-center">
                                                            College
                                                        </TableHead>
                                                    )}
                                                    <TableHead className="px-6 text-center">
                                                        Address
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Contact
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Interns
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Supervisors
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {htes.data.map((hte) => (
                                                    <TableRow key={hte.hte_id}>
                                                        <TableCell className="px-6 font-medium">
                                                            {hte.hte_name}
                                                        </TableCell>
                                                        {isSuperAdmin && (
                                                            <TableCell className="px-6 text-center">
                                                                {hte.college ? (
                                                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                                                        {hte.college.code}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Global
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                        <TableCell
                                                            className="max-w-xs truncate px-6 text-center text-muted-foreground"
                                                            title={
                                                                hte.address ??
                                                                undefined
                                                            }
                                                        >
                                                            {hte.address ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <p
                                                                className="truncate"
                                                                title={
                                                                    hte.contact_person ??
                                                                    undefined
                                                                }
                                                            >
                                                                {hte.contact_person ??
                                                                    '—'}
                                                            </p>
                                                            {hte.contact_number && (
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {
                                                                        hte.contact_number
                                                                    }
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <StatusBadge
                                                                status={
                                                                    hte.status
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            {hte.interns_count}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            {
                                                                hte.supervisors_count
                                                            }
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <HteActions
                                                                hte={hte}
                                                                onEdit={
                                                                    openEditDialog
                                                                }
                                                                onToggleStatus={
                                                                    toggleStatus
                                                                }
                                                                onArchive={
                                                                    openArchiveDialog
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <NumberedPagination
                                            meta={htes}
                                            itemLabel="HTE"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="htes-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — always on mobile, desktop only when grid tab selected */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {htes.data.map((hte) => (
                                    <Card key={hte.hte_id} className="flex flex-col justify-between h-full rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:shadow-md hover:border-border">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1" title={hte.hte_name}>
                                                        {hte.hte_name}
                                                    </CardTitle>
                                                    {isSuperAdmin && (
                                                        <div className="mt-1">
                                                            {hte.college ? (
                                                                <Badge variant="outline" className="text-[11px] font-medium">
                                                                    {hte.college.code}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-[11px] font-normal">
                                                                    Global
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <StatusBadge
                                                    status={hte.status}
                                                />
                                            </div>
                                        </CardHeader>

                                        <CardContent className="flex-1 space-y-2.5 pb-3 text-sm">
                                            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <MapPin className="size-3.5 text-muted-foreground" />
                                                        Address:
                                                    </span>
                                                    <span
                                                        className="font-medium text-foreground truncate text-right"
                                                        title={hte.address ?? undefined}
                                                    >
                                                        {hte.address ?? '—'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <User className="size-3.5 text-muted-foreground" />
                                                        Contact:
                                                    </span>
                                                    <span
                                                        className="font-medium text-foreground truncate text-right"
                                                        title={hte.contact_person ? `${hte.contact_person}${hte.contact_number ? ` (${hte.contact_number})` : ''}` : undefined}
                                                    >
                                                        {hte.contact_person ?? '—'}
                                                        {hte.contact_number && (
                                                            <span className="text-muted-foreground font-normal ml-1">
                                                                · {hte.contact_number}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                                                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                                                        <Users className="size-3.5 text-muted-foreground" />
                                                        Interns / Supervisors:
                                                    </span>
                                                    <span className="font-semibold text-foreground">
                                                        {hte.interns_count} interns · {hte.supervisors_count} sup.
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>

                                        <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                            <span>{hte.interns_count} {hte.interns_count === 1 ? 'Intern' : 'Interns'}</span>
                                            <HteActions
                                                hte={hte}
                                                onEdit={openEditDialog}
                                                onToggleStatus={toggleStatus}
                                                onArchive={openArchiveDialog}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <div className="mt-4">
                                <NumberedPagination
                                    meta={htes}
                                    itemLabel="HTE"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="htes-grid-per-page"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* -- Edit dialog ----------------------------------------- */}
            <Dialog
                open={editingHte !== null}
                onOpenChange={(open) => !open && closeEditDialog()}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit HTE</DialogTitle>
                        <DialogDescription>
                            Update this HTE's details.
                        </DialogDescription>
                    </DialogHeader>
                    {editingHte && (
                        <form
                            onSubmit={handleEditSubmit}
                            className="flex flex-col gap-4"
                        >
                            {isSuperAdmin && colleges.length > 0 && (
                                <div className="grid gap-1.5">
                                    <Label htmlFor="edit_college_id">
                                        College
                                    </Label>
                                    <Select
                                        value={editForm.data.college_id || 'none'}
                                        onValueChange={(val) =>
                                            editForm.setData(
                                                'college_id',
                                                val === 'none' ? '' : val,
                                            )
                                        }
                                    >
                                        <SelectTrigger id="edit_college_id">
                                            <SelectValue placeholder="Global (No specific college)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Global / No specific college
                                            </SelectItem>
                                            {colleges.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={String(c.id)}
                                                >
                                                    {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={editForm.errors.college_id}
                                    />
                                </div>
                            )}
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_hte_name">Name</Label>
                                <Input
                                    id="edit_hte_name"
                                    value={editForm.data.hte_name}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'hte_name',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={150}
                                    required
                                />
                                <InputError
                                    message={editForm.errors.hte_name}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_address">Address</Label>
                                <Input
                                    id="edit_address"
                                    value={editForm.data.address}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'address',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={255}
                                    required
                                />
                                <InputError message={editForm.errors.address} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="edit_contact_number">
                                    Contact Number
                                </Label>
                                <Input
                                    id="edit_contact_number"
                                    value={editForm.data.contact_number}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'contact_number',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={20}
                                />
                                <InputError
                                    message={editForm.errors.contact_number}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit_id_bg">
                                    Card Background (Optional)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Upload a picture to be used as the background of the cards. Max 5MB (JPG, PNG, WebP).
                                </p>

                                {/* Image Preview */}
                                {(editBgPreview || (editingHte.id_bg_url && !editForm.data.remove_id_bg)) && (
                                    <div className="relative h-32 w-full overflow-hidden rounded-xl border border-border bg-muted/20 shadow-xs">
                                        <img
                                            src={editBgPreview || editingHte.id_bg_url!}
                                            alt="Card Background Preview"
                                            className="size-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                editForm.setData((prev) => ({
                                                    ...prev,
                                                    id_bg: null,
                                                    remove_id_bg: true,
                                                }));
                                                setEditBgPreview(null);
                                                if (editFileInputRef.current) {
                                                    editFileInputRef.current.value = '';
                                                }
                                            }}
                                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white shadow-sm transition hover:bg-black/80"
                                            title="Remove image"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    </div>
                                )}

                                {editingHte.id_bg_url && editForm.data.remove_id_bg && (
                                    <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                        <span>Image will be removed upon saving.</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-amber-900 hover:text-amber-950 dark:text-amber-200"
                                            onClick={() => {
                                                editForm.setData((prev) => ({
                                                    ...prev,
                                                    remove_id_bg: false,
                                                }));
                                            }}
                                        >
                                            Undo
                                        </Button>
                                    </div>
                                )}

                                <Input
                                    ref={editFileInputRef}
                                    id="edit_id_bg"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        if (file) {
                                            editForm.setData((prev) => ({
                                                ...prev,
                                                id_bg: file,
                                                remove_id_bg: false,
                                            }));
                                            setEditBgPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                                <InputError message={editForm.errors.id_bg} />
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={closeEditDialog}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                >
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* -- Add dialog ------------------------------------------ */}
            <Dialog
                open={addOpen}
                onOpenChange={(open) =>
                    open ? openAddDialog() : closeAddDialog()
                }
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add HTE</DialogTitle>
                        <DialogDescription>
                            This HTE will become available for assigning interns
                            and supervisors.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleAddSubmit}
                        className="flex flex-col gap-4"
                    >
                        {isSuperAdmin && colleges.length > 0 && (
                            <div className="grid gap-1.5">
                                <Label htmlFor="add_college_id">College</Label>
                                <Select
                                    value={addForm.data.college_id || 'none'}
                                    onValueChange={(val) =>
                                        addForm.setData(
                                            'college_id',
                                            val === 'none' ? '' : val,
                                        )
                                    }
                                >
                                    <SelectTrigger id="add_college_id">
                                        <SelectValue placeholder="Global (No specific college)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Global / No specific college
                                        </SelectItem>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.name} ({c.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={addForm.errors.college_id}
                                />
                            </div>
                        )}
                        <div className="grid gap-1.5">
                            <Label htmlFor="hte_name">Name</Label>
                            <Input
                                id="hte_name"
                                value={addForm.data.hte_name}
                                onChange={(e) =>
                                    addForm.setData('hte_name', e.target.value)
                                }
                                maxLength={150}
                                required
                            />
                            <InputError message={addForm.errors.hte_name} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={addForm.data.address}
                                onChange={(e) =>
                                    addForm.setData('address', e.target.value)
                                }
                                maxLength={255}
                                required
                            />
                            <InputError message={addForm.errors.address} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="contact_number">
                                Contact Number
                            </Label>
                            <Input
                                id="contact_number"
                                value={addForm.data.contact_number}
                                onChange={(e) =>
                                    addForm.setData(
                                        'contact_number',
                                        e.target.value,
                                    )
                                }
                                maxLength={20}
                            />
                            <InputError
                                message={addForm.errors.contact_number}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="add_id_bg">
                                Card Background (Optional)
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Upload a picture to be used as the background of the cards. Max 5MB (JPG, PNG, WebP).
                            </p>

                            {addBgPreview && (
                                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-border bg-muted/20 shadow-xs">
                                    <img
                                        src={addBgPreview}
                                        alt="Card Background Preview"
                                        className="size-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            addForm.setData('id_bg', null);
                                            setAddBgPreview(null);
                                            if (addFileInputRef.current) {
                                                addFileInputRef.current.value = '';
                                            }
                                        }}
                                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white shadow-sm transition hover:bg-black/80"
                                        title="Remove image"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            )}

                            <Input
                                ref={addFileInputRef}
                                id="add_id_bg"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    addForm.setData('id_bg', file);
                                    if (file) {
                                        setAddBgPreview(URL.createObjectURL(file));
                                    } else {
                                        setAddBgPreview(null);
                                    }
                                }}
                            />
                            <InputError message={addForm.errors.id_bg} />
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={closeAddDialog}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addForm.processing}>
                                Create HTE
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* -- Archive confirmation -------------------------------- */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive HTE"
                description={`Archive "${archiveHteName}"? It will be moved to the archives and can be restored later.`}
                onConfirm={submitArchive}
                confirmText="Archive"
            />
        </>
    );
}

HtesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'HTEs', href: '/admin/htes' },
    ],
};
