import { Head, router } from '@inertiajs/react';
import {
    Building2,
    GraduationCap,
    LayoutGrid,
    MapPin,
    Plus,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { ProgramActions } from '@/components/program-actions';
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
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';

interface CampusRecord {
    id: number;
    name: string;
    code: string;
    address: string | null;
    description: string | null;
    is_active: boolean;
    colleges_count: number;
    interns_count: number;
    created_at: string | null;
}

interface Filters {
    search: string;
    status: string;
    per_page: number;
}

interface CampusIndexProps {
    campuses: Paginated<CampusRecord>;
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function CampusesIndex({ campuses, filters }: CampusIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    // Modal states
    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addCode, setAddCode] = useState('');
    const [addAddress, setAddAddress] = useState('');
    const [addDescription, setAddDescription] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CampusRecord | null>(null);
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<CampusRecord | null>(null);

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<CampusRecord | null>(
        null,
    );

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/campuses', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

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
    }, [debouncedSearch]);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({
            ...baseParams(),
            search: undefined,
            page: undefined,
        });
    };

    const handleStatusFilterChange = (val: string) => {
        const nextStatus = val === 'all' ? '' : val;
        setStatus(nextStatus);
        visit({
            ...baseParams(),
            status: nextStatus || undefined,
            page: undefined,
        });
    };

    const clearAllFilters = () => {
        setSearch('');
        setStatus('');
        visit({
            per_page: filters.per_page ? String(filters.per_page) : undefined,
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(search || status);

    const goToPage = (page: number) =>
        visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    const openAdd = () => {
        setAddName('');
        setAddCode('');
        setAddAddress('');
        setAddDescription('');
        setAddOpen(true);
    };

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();

        if (!addName.trim() || !addCode.trim()) {
            toast.error('Campus name and code are required.');

            return;
        }

        router.post(
            '/admin/campuses',
            {
                name: addName.trim(),
                code: addCode.trim().toUpperCase(),
                address: addAddress.trim() || null,
                description: addDescription.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setAddName('');
                    setAddCode('');
                    setAddAddress('');
                    setAddDescription('');
                },
            },
        );
    };

    const openEdit = (campus: CampusRecord) => {
        setEditTarget(campus);
        setEditName(campus.name);
        setEditCode(campus.code);
        setEditAddress(campus.address || '');
        setEditDescription(campus.description || '');
        setEditOpen(true);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();

        if (!editTarget || !editName.trim() || !editCode.trim()) {
            toast.error('Campus name and code are required.');

            return;
        }

        router.patch(
            `/admin/campuses/${editTarget.id}`,
            {
                name: editName.trim(),
                code: editCode.trim().toUpperCase(),
                address: editAddress.trim() || null,
                description: editDescription.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditOpen(false);
                    setEditTarget(null);
                },
            },
        );
    };

    const openStatusConfirm = (campus: CampusRecord) => {
        setStatusTarget(campus);
        setStatusConfirmOpen(true);
    };

    const submitStatusToggle = () => {
        if (!statusTarget) {
            return;
        }

        router.patch(
            `/admin/campuses/${statusTarget.id}/status`,
            { is_active: !statusTarget.is_active },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusConfirmOpen(false);
                    setStatusTarget(null);
                },
            },
        );
    };

    const openArchive = (campus: CampusRecord) => {
        setArchiveTarget(campus);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (!archiveTarget) {
            return;
        }

        router.delete(`/admin/campuses/${archiveTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setArchiveOpen(false);
                setArchiveTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="Campuses" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <MapPin className="size-5" />
                        </span>
                        Campuses
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search campuses..."
                                className="h-9 w-44 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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

                        {/* Status Filter */}
                        <div className="hidden sm:block">
                            <Select
                                value={status || 'all'}
                                onValueChange={handleStatusFilterChange}
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
                                onValueChange={handleStatusFilterChange}
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

                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                                Reset
                            </Button>
                        )}

                        {/* Mobile Search Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        {/* View Mode Toggle — desktop only */}
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

                        {/* Add Campus Button */}
                        <Button onClick={openAdd} className="h-9 gap-1.5">
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Add Campus</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile Search Input */}
                {mobileSearchOpen && (
                    <form onSubmit={applySearch} className="relative sm:hidden">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search campuses..."
                            className="h-10 w-full rounded-md border bg-background pr-9 pl-9 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </form>
                )}

                {/* Content */}
                {campuses.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No campuses
                            {hasActiveFilters ? ' match this filter.' : ' yet.'}
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
                                                        Campus
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Code
                                                    </TableHead>
                                                    <TableHead className="px-6">
                                                        Address
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Colleges
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Interns
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Created
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {campuses.data.map((campus) => (
                                                    <TableRow key={campus.id}>
                                                        <TableCell className="px-6 font-medium">
                                                            <div className="font-semibold text-foreground">
                                                                {campus.name}
                                                            </div>
                                                            {campus.description && (
                                                                <div className="line-clamp-1 text-xs text-muted-foreground">
                                                                    {
                                                                        campus.description
                                                                    }
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-xs"
                                                            >
                                                                {campus.code}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-sm text-muted-foreground">
                                                            {campus.address ||
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {
                                                                    campus.colleges_count
                                                                }{' '}
                                                                {campus.colleges_count ===
                                                                1
                                                                    ? 'college'
                                                                    : 'colleges'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center font-medium">
                                                            {
                                                                campus.interns_count
                                                            }
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <StatusBadge
                                                                status={
                                                                    campus.is_active
                                                                        ? 'active'
                                                                        : 'inactive'
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center text-xs text-muted-foreground">
                                                            {campus.created_at ||
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center">
                                                            <ProgramActions
                                                                program={campus}
                                                                onEdit={
                                                                    openEdit
                                                                }
                                                                onToggleActive={
                                                                    openStatusConfirm
                                                                }
                                                                onArchive={
                                                                    openArchive
                                                                }
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {campuses.total > 0 && (
                                            <NumberedPagination
                                                meta={campuses}
                                                itemLabel="campus"
                                                onPageChange={goToPage}
                                                onPerPageChange={changePerPage}
                                                idPrefix="campuses-table-per-page"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid — always on mobile, desktop when grid tab selected */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {campuses.data.map((campus) => (
                                    <Card
                                        key={campus.id}
                                        className="flex flex-col justify-between"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <Badge
                                                        variant="outline"
                                                        className="mb-1 font-mono text-xs"
                                                    >
                                                        {campus.code}
                                                    </Badge>
                                                    <CardTitle className="text-base leading-tight font-semibold">
                                                        {campus.name}
                                                    </CardTitle>
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        campus.is_active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pb-3 text-sm">
                                            {campus.address && (
                                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                                    <span>
                                                        {campus.address}
                                                    </span>
                                                </div>
                                            )}
                                            {campus.description && (
                                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                                    {campus.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-3 font-medium">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="size-3.5" />
                                                        {campus.colleges_count}{' '}
                                                        {campus.colleges_count ===
                                                        1
                                                            ? 'College'
                                                            : 'Colleges'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <GraduationCap className="size-3.5" />
                                                        {campus.interns_count}{' '}
                                                        {campus.interns_count ===
                                                        1
                                                            ? 'Intern'
                                                            : 'Interns'}
                                                    </span>
                                                </div>
                                                <span>
                                                    Added{' '}
                                                    {campus.created_at || '—'}
                                                </span>
                                            </div>
                                        </CardContent>
                                        <div className="flex items-center justify-end border-t bg-muted/20 px-4 py-2">
                                            <ProgramActions
                                                program={campus}
                                                onEdit={openEdit}
                                                onToggleActive={
                                                    openStatusConfirm
                                                }
                                                onArchive={openArchive}
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {campuses.total > 0 && (
                                <NumberedPagination
                                    meta={campuses}
                                    itemLabel="campus"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="campuses-grid-per-page"
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Campus Modal */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Add Campus</DialogTitle>
                        <DialogDescription>
                            Create a new university campus branch to organize
                            colleges and students.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitAdd} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="add_name">
                                Campus Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="add_name"
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                placeholder="e.g. Obrero Campus"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="add_code">
                                Campus Code{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="add_code"
                                value={addCode}
                                onChange={(e) => setAddCode(e.target.value)}
                                placeholder="e.g. OBR"
                                className="font-mono uppercase"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="add_address">Address</Label>
                            <Input
                                id="add_address"
                                value={addAddress}
                                onChange={(e) => setAddAddress(e.target.value)}
                                placeholder="e.g. Iñigo St., Bo. Obrero, Davao City"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="add_description">Description</Label>
                            <Textarea
                                id="add_description"
                                value={addDescription}
                                onChange={(e) =>
                                    setAddDescription(e.target.value)
                                }
                                placeholder="Brief description or notes about this campus..."
                                rows={3}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Save Campus</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Campus Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Edit Campus</DialogTitle>
                        <DialogDescription>
                            Update campus name, code, address, or details.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_name">
                                Campus Name{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="e.g. Obrero Campus"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_code">
                                Campus Code{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit_code"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                placeholder="e.g. OBR"
                                className="font-mono uppercase"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_address">Address</Label>
                            <Input
                                id="edit_address"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                placeholder="e.g. Iñigo St., Bo. Obrero, Davao City"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_description">
                                Description
                            </Label>
                            <Textarea
                                id="edit_description"
                                value={editDescription}
                                onChange={(e) =>
                                    setEditDescription(e.target.value)
                                }
                                placeholder="Brief description or notes about this campus..."
                                rows={3}
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Status Toggle Confirmation */}
            <ConfirmationDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title={
                    statusTarget?.is_active
                        ? 'Deactivate Campus'
                        : 'Activate Campus'
                }
                description={
                    statusTarget?.is_active
                        ? `Are you sure you want to deactivate "${statusTarget?.name}"? Colleges under this campus may not be selectable for new registrations.`
                        : `Are you sure you want to activate "${statusTarget?.name}"?`
                }
                confirmText={
                    statusTarget?.is_active ? 'Deactivate' : 'Activate'
                }
                isDestructive={Boolean(statusTarget?.is_active)}
                onConfirm={submitStatusToggle}
            />

            {/* Archive Confirmation */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive Campus"
                description={`Are you sure you want to archive "${archiveTarget?.name}"? You can restore it later from the Archives section.`}
                confirmText="Archive"
                isDestructive
                onConfirm={submitArchive}
            />
        </>
    );
}
