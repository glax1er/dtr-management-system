import { Head, router } from '@inertiajs/react';
import {
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
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { dashboard } from '@/routes';

interface CampusRecord {
    id: number;
    name: string;
    code: string;
    address: string | null;
    description: string | null;
    is_active: boolean;
    colleges_count: number;
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
    const [archiveTarget, setArchiveTarget] = useState<CampusRecord | null>(null);

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (params: Record<string, string | undefined>, replace = true) => {
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

    const goToPage = (page: number) => visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) => visit({ ...baseParams(), per_page: String(perPage), page: undefined });

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
            }
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
            }
        );
    };

    const openStatusConfirm = (campus: CampusRecord) => {
        setStatusTarget(campus);
        setStatusConfirmOpen(true);
    };

    const submitStatusToggle = () => {
        if (!statusTarget) return;

        router.patch(
            `/admin/campuses/${statusTarget.id}/status`,
            { is_active: !statusTarget.is_active },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusConfirmOpen(false);
                    setStatusTarget(null);
                },
            }
        );
    };

    const openArchive = (campus: CampusRecord) => {
        setArchiveTarget(campus);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (!archiveTarget) return;

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

            <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <MapPin className="size-5" />
                            </span>
                            Campuses
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage university campus branches and their associated colleges.
                        </p>
                    </div>

                    <Button onClick={openAdd} className="w-full sm:w-auto h-9 gap-1.5 shrink-0 justify-center">
                        <Plus className="size-4" />
                        Add Campus
                    </Button>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                            {/* Search Input */}
                            <form onSubmit={applySearch} className="relative flex-1 min-w-[180px] sm:w-60 sm:flex-none">
                                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search campuses..."
                                    className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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
                            <Select
                                value={status || 'all'}
                                onValueChange={handleStatusFilterChange}
                            >
                                <SelectTrigger className="h-9 w-32 shrink-0">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Reset Filters */}
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllFilters}
                                    className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                                >
                                    <X className="size-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center justify-end rounded-md border bg-muted p-0.5 shrink-0 self-end sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setView('table')}
                                className={`rounded p-1.5 transition-colors ${
                                    view === 'table'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                aria-label="Table view"
                            >
                                <TableIcon className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('grid')}
                                className={`rounded p-1.5 transition-colors ${
                                    view === 'grid'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                aria-label="Grid view"
                            >
                                <LayoutGrid className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {campuses.data.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center">
                        <MapPin className="mb-4 size-12 text-muted-foreground/50" />
                        <h3 className="text-lg font-medium text-foreground">No campuses found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {hasActiveFilters
                                ? 'Try adjusting your search query or filters.'
                                : 'Get started by creating your first university campus.'}
                        </p>
                        {hasActiveFilters ? (
                            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
                                Clear Filters
                            </Button>
                        ) : (
                            <Button size="sm" onClick={openAdd} className="mt-4 gap-1.5">
                                <Plus className="size-4" />
                                Add Campus
                            </Button>
                        )}
                    </Card>
                ) : view === 'table' ? (
                    <div className="overflow-hidden rounded-md border bg-card shadow-xs">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[780px]">
                                <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[220px]">Name</TableHead>
                                    <TableHead className="w-[100px]">Code</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead className="w-[120px] text-center">Colleges</TableHead>
                                    <TableHead className="w-[110px] text-center">Status</TableHead>
                                    <TableHead className="w-[130px]">Created</TableHead>
                                    <TableHead className="w-[110px] text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campuses.data.map((campus) => (
                                    <TableRow key={campus.id}>
                                        <TableCell>
                                            <div className="font-semibold text-foreground">
                                                {campus.name}
                                            </div>
                                            {campus.description && (
                                                <div className="line-clamp-1 text-xs text-muted-foreground">
                                                    {campus.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {campus.code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">
                                                {campus.address || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="text-xs">
                                                {campus.colleges_count}{' '}
                                                {campus.colleges_count === 1 ? 'college' : 'colleges'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={campus.is_active ? 'active' : 'inactive'} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {campus.created_at || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEdit(campus)}
                                                        >
                                                            <Pencil className="size-4 text-blue-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Campus</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openStatusConfirm(campus)}
                                                        >
                                                            {campus.is_active ? (
                                                                <PowerOff className="size-4 text-destructive" />
                                                            ) : (
                                                                <Power className="size-4 text-emerald-600" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {campus.is_active ? 'Deactivate' : 'Activate'}
                                                    </TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openArchive(campus)}
                                                        >
                                                            <Trash2 className="size-4 text-destructive" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Archive Campus</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {campuses.data.map((campus) => (
                            <Card key={campus.id} className="flex flex-col justify-between shadow-xs">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2 min-w-0">
                                        <div className="min-w-0 flex-1">
                                            <Badge variant="outline" className="mb-1 font-mono text-xs">
                                                {campus.code}
                                            </Badge>
                                            <CardTitle className="text-base font-semibold leading-tight truncate">
                                                {campus.name}
                                            </CardTitle>
                                        </div>
                                        <StatusBadge status={campus.is_active ? 'active' : 'inactive'} className="shrink-0" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pb-3 text-sm">
                                    {campus.address && (
                                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                            <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                            <span>{campus.address}</span>
                                        </div>
                                    )}
                                    {campus.description && (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                            {campus.description}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 font-medium">
                                            <Building2 className="size-3.5" />
                                            {campus.colleges_count}{' '}
                                            {campus.colleges_count === 1 ? 'College' : 'Colleges'}
                                        </span>
                                        <span>Added {campus.created_at || '—'}</span>
                                    </div>
                                </CardContent>
                                <div className="flex items-center justify-end gap-1 border-t bg-muted/20 px-4 py-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(campus)}
                                            >
                                                <Pencil className="size-4 text-blue-600" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit Campus</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openStatusConfirm(campus)}
                                            >
                                                {campus.is_active ? (
                                                    <PowerOff className="size-4 text-destructive" />
                                                ) : (
                                                    <Power className="size-4 text-emerald-600" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {campus.is_active ? 'Deactivate' : 'Activate'}
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openArchive(campus)}
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Archive Campus</TooltipContent>
                                    </Tooltip>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {campuses.total > 0 && (
                    <NumberedPagination
                        meta={campuses}
                        itemLabel="campus"
                        onPageChange={goToPage}
                        onPerPageChange={changePerPage}
                    />
                )}
            </div>

            {/* Add Campus Modal */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-[480px] p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Add Campus</DialogTitle>
                        <DialogDescription>
                            Create a new university campus branch to organize colleges and students.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitAdd} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="add_name">Campus Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="add_name"
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                placeholder="e.g. Obrero Campus"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="add_code">Campus Code <span className="text-destructive">*</span></Label>
                            <Input
                                id="add_code"
                                value={addCode}
                                onChange={(e) => setAddCode(e.target.value)}
                                placeholder="e.g. OBR"
                                className="uppercase font-mono"
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
                                onChange={(e) => setAddDescription(e.target.value)}
                                placeholder="Brief description or notes about this campus..."
                                rows={3}
                            />
                        </div>
                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddOpen(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto">Save Campus</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Campus Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-[480px] p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>Edit Campus</DialogTitle>
                        <DialogDescription>
                            Update campus name, code, address, or details.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_name">Campus Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="edit_name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="e.g. Obrero Campus"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit_code">Campus Code <span className="text-destructive">*</span></Label>
                            <Input
                                id="edit_code"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                placeholder="e.g. OBR"
                                className="uppercase font-mono"
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
                            <Label htmlFor="edit_description">Description</Label>
                            <Textarea
                                id="edit_description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Brief description or notes about this campus..."
                                rows={3}
                            />
                        </div>
                        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Status Toggle Confirmation */}
            <ConfirmationDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title={statusTarget?.is_active ? 'Deactivate Campus' : 'Activate Campus'}
                description={
                    statusTarget?.is_active
                        ? `Are you sure you want to deactivate "${statusTarget?.name}"? Colleges under this campus may not be selectable for new registrations.`
                        : `Are you sure you want to activate "${statusTarget?.name}"?`
                }
                confirmText={statusTarget?.is_active ? 'Deactivate' : 'Activate'}
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
