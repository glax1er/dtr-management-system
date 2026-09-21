import { Head, router, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Table as TableIcon,
    Trash2,
    UserCog,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useInitials } from '@/hooks/use-initials';
import type { Campus, College, PageProps } from '@/types';

interface CollegeAdminRecord {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    employee_id?: string | null;
    position?: string | null;
    college_id: number | null;
    campus_id?: number | null;
    campus?: string | null;
    college: {
        id: number;
        name: string;
        code: string;
        campus?: string | null;
    } | null;
    is_active: boolean;
    created_at: string;
}

interface Filters {
    search: string;
    college_id: number | null;
    campus_id: number | null;
    status: string | null;
    per_page: number;
}

interface CollegeAdminProps {
    collegeAdmins: Paginated<CollegeAdminRecord>;
    colleges: College[];
    campuses: Campus[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function CollegeAdminManagement({
    collegeAdmins,
    colleges,
    campuses,
    filters,
}: CollegeAdminProps) {
    const { auth } = usePage<PageProps>().props;
    const currentUserId = auth?.user?.id;
    const getInitials = useInitials();

    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [collegeId, setCollegeId] = useState<string>(
        filters.college_id ? String(filters.college_id) : 'all',
    );
    const [campusId, setCampusId] = useState<string>(
        filters.campus_id ? String(filters.campus_id) : 'all',
    );
    const [status, setStatus] = useState<string>(filters.status || 'all');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    // Modal states
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        college_id: '',
        campus_id: '',
        employee_id: '',
        position: '',
        password: '',
        password_confirmation: '',
    });

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CollegeAdminRecord | null>(
        null,
    );
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        college_id: '',
        campus_id: '',
        employee_id: '',
        position: '',
        password: '',
        password_confirmation: '',
    });

    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<CollegeAdminRecord | null>(
        null,
    );

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CollegeAdminRecord | null>(
        null,
    );

    const baseParams = () => ({
        search: search || undefined,
        college_id: collegeId !== 'all' ? collegeId : undefined,
        campus_id: campusId !== 'all' ? campusId : undefined,
        status: status !== 'all' ? status : undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/college-admins', params, {
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

    const handleCollegeChange = (val: string) => {
        setCollegeId(val);
        visit({
            ...baseParams(),
            college_id: val !== 'all' ? val : undefined,
            page: undefined,
        });
    };

    const handleCampusChange = (val: string) => {
        setCampusId(val);
        visit({
            ...baseParams(),
            campus_id: val !== 'all' ? val : undefined,
            page: undefined,
        });
    };

    const handleStatusChange = (val: string) => {
        setStatus(val);
        visit({
            ...baseParams(),
            status: val !== 'all' ? val : undefined,
            page: undefined,
        });
    };

    const clearAllFilters = () => {
        setSearch('');
        setCollegeId('all');
        setCampusId('all');
        setStatus('all');
        visit({
            per_page: filters.per_page ? String(filters.per_page) : undefined,
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(
        search || collegeId !== 'all' || campusId !== 'all' || status !== 'all',
    );

    const goToPage = (page: number) =>
        visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    const openAdd = () => {
        setAddForm({
            name: '',
            email: '',
            college_id: colleges.length > 0 ? String(colleges[0].id) : '',
            campus_id: '',
            employee_id: '',
            position: '',
            password: '',
            password_confirmation: '',
        });
        setAddOpen(true);
    };

    const handleAddCollegeChange = (colId: string) => {
        const selCollege = colleges.find((c) => String(c.id) === colId);
        let matchingCampusId = '';

        if (selCollege?.campus_id) {
            matchingCampusId = String(selCollege.campus_id);
        } else if (selCollege?.campus) {
            const foundCamp = campuses.find(
                (c) =>
                    c.name.toLowerCase() === selCollege.campus?.toLowerCase(),
            );

            if (foundCamp) {
                matchingCampusId = String(foundCamp.id);
            }
        }

        setAddForm((prev) => ({
            ...prev,
            college_id: colId,
            campus_id: matchingCampusId || prev.campus_id,
        }));
    };

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();

        if (!addForm.name.trim() || !addForm.email.trim()) {
            toast.error('Name and email are required.');

            return;
        }

        if (!addForm.college_id) {
            toast.error('Please select an assigned college.');

            return;
        }

        if (!addForm.password) {
            toast.error('Password is required.');

            return;
        }

        if (addForm.password !== addForm.password_confirmation) {
            toast.error('Passwords do not match.');

            return;
        }

        router.post(
            '/admin/college-admins',
            {
                name: addForm.name.trim(),
                email: addForm.email.trim().toLowerCase(),
                college_id: Number(addForm.college_id),
                campus_id: addForm.campus_id ? Number(addForm.campus_id) : null,
                employee_id: addForm.employee_id.trim() || null,
                position: addForm.position.trim() || null,
                password: addForm.password,
                password_confirmation: addForm.password_confirmation,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                },
            },
        );
    };

    const openEdit = (admin: CollegeAdminRecord) => {
        setEditTarget(admin);
        setEditForm({
            name: admin.name,
            email: admin.email,
            college_id: admin.college_id ? String(admin.college_id) : '',
            campus_id: admin.campus_id ? String(admin.campus_id) : '',
            employee_id: admin.employee_id || '',
            position: admin.position || '',
            password: '',
            password_confirmation: '',
        });
        setEditOpen(true);
    };

    const handleEditCollegeChange = (colId: string) => {
        const selCollege = colleges.find((c) => String(c.id) === colId);
        let matchingCampusId = '';

        if (selCollege?.campus_id) {
            matchingCampusId = String(selCollege.campus_id);
        } else if (selCollege?.campus) {
            const foundCamp = campuses.find(
                (c) =>
                    c.name.toLowerCase() === selCollege.campus?.toLowerCase(),
            );

            if (foundCamp) {
                matchingCampusId = String(foundCamp.id);
            }
        }

        setEditForm((prev) => ({
            ...prev,
            college_id: colId,
            campus_id: matchingCampusId || prev.campus_id,
        }));
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();

        if (!editTarget || !editForm.name.trim() || !editForm.email.trim()) {
            toast.error('Name and email are required.');

            return;
        }

        if (!editForm.college_id) {
            toast.error('Please select an assigned college.');

            return;
        }

        if (
            editForm.password &&
            editForm.password !== editForm.password_confirmation
        ) {
            toast.error('Passwords do not match.');

            return;
        }

        router.patch(
            `/admin/college-admins/${editTarget.id}`,
            {
                name: editForm.name.trim(),
                email: editForm.email.trim().toLowerCase(),
                college_id: Number(editForm.college_id),
                campus_id: editForm.campus_id
                    ? Number(editForm.campus_id)
                    : null,
                employee_id: editForm.employee_id.trim() || null,
                position: editForm.position.trim() || null,
                ...(editForm.password
                    ? {
                          password: editForm.password,
                          password_confirmation: editForm.password_confirmation,
                      }
                    : {}),
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

    const openStatusConfirm = (admin: CollegeAdminRecord) => {
        if (admin.id === currentUserId) {
            toast.error('You cannot deactivate your own account.');

            return;
        }

        setStatusTarget(admin);
        setStatusConfirmOpen(true);
    };

    const submitStatusToggle = () => {
        if (!statusTarget) {
            return;
        }

        router.patch(
            `/admin/college-admins/${statusTarget.id}/status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusConfirmOpen(false);
                    setStatusTarget(null);
                },
            },
        );
    };

    const openDelete = (admin: CollegeAdminRecord) => {
        if (admin.id === currentUserId) {
            toast.error('You cannot delete your own account.');

            return;
        }

        setDeleteTarget(admin);
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/admin/college-admins/${deleteTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteOpen(false);
                setDeleteTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="College Administrators" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <UserCog className="size-5" />
                        </span>
                        College Administrators
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
                                placeholder="Search college admins..."
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

                        {/* College Filter */}
                        <Select
                            value={collegeId}
                            onValueChange={handleCollegeChange}
                        >
                            <SelectTrigger className="h-9 w-40">
                                <SelectValue placeholder="All Colleges" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Colleges
                                </SelectItem>
                                {colleges.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.code} - {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Campus Filter */}
                        <Select
                            value={campusId}
                            onValueChange={handleCampusChange}
                        >
                            <SelectTrigger className="h-9 w-36">
                                <SelectValue placeholder="All Campuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Campuses
                                </SelectItem>
                                {campuses.map((camp) => (
                                    <SelectItem
                                        key={camp.id}
                                        value={String(camp.id)}
                                    >
                                        {camp.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select
                            value={status}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="h-9 w-32">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>

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

                        {/* Add College Admin Button */}
                        <Button onClick={openAdd} className="h-9 gap-1.5">
                            <Plus className="size-4" />
                            Add College Admin
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
                            placeholder="Search college admins..."
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
                {collegeAdmins.data.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center">
                        <CardContent className="p-0">
                            <UserCog className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                            <h3 className="text-lg font-medium text-foreground">
                                No college administrators found
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try adjusting your search or filters.'
                                    : 'Create college administrators to manage programs and intern approvals per college department.'}
                            </p>
                            <Button
                                size="sm"
                                variant={
                                    hasActiveFilters ? 'outline' : 'default'
                                }
                                onClick={
                                    hasActiveFilters ? clearAllFilters : openAdd
                                }
                                className="mt-4"
                            >
                                {hasActiveFilters
                                    ? 'Clear Filters'
                                    : 'Add College Admin'}
                            </Button>
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
                                                    <TableHead className="w-[240px]">
                                                        Administrator
                                                    </TableHead>
                                                    <TableHead className="w-[180px]">
                                                        Assigned College
                                                    </TableHead>
                                                    <TableHead className="w-[140px]">
                                                        Campus
                                                    </TableHead>
                                                    <TableHead className="w-[140px]">
                                                        Role / Position
                                                    </TableHead>
                                                    <TableHead className="w-[100px] text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="w-[120px]">
                                                        Added
                                                    </TableHead>
                                                    <TableHead className="w-[110px] text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {collegeAdmins.data.map(
                                                    (admin) => (
                                                        <TableRow
                                                            key={admin.id}
                                                        >
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="size-9">
                                                                        {admin.avatar && (
                                                                            <AvatarImage
                                                                                src={
                                                                                    admin.avatar
                                                                                }
                                                                                alt={
                                                                                    admin.name
                                                                                }
                                                                                className="object-cover"
                                                                            />
                                                                        )}
                                                                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                                            {getInitials(
                                                                                admin.name,
                                                                            )}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0">
                                                                        <div className="font-semibold text-foreground">
                                                                            {
                                                                                admin.name
                                                                            }
                                                                        </div>
                                                                        <div className="truncate text-xs text-muted-foreground">
                                                                            {
                                                                                admin.email
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                {admin.college ? (
                                                                    <div>
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="font-semibold"
                                                                        >
                                                                            {
                                                                                admin
                                                                                    .college
                                                                                    .code
                                                                            }
                                                                        </Badge>
                                                                        <div className="line-clamp-1 text-xs text-muted-foreground">
                                                                            {
                                                                                admin
                                                                                    .college
                                                                                    .name
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">
                                                                        Unassigned
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1 text-sm text-foreground">
                                                                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                                                                    <span>
                                                                        {admin.campus ||
                                                                            '—'}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm font-medium text-foreground">
                                                                    {admin.position ||
                                                                        'College Admin'}
                                                                </div>
                                                                {admin.employee_id && (
                                                                    <div className="font-mono text-xs text-muted-foreground">
                                                                        ID:{' '}
                                                                        {
                                                                            admin.employee_id
                                                                        }
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <StatusBadge
                                                                    status={
                                                                        admin.is_active
                                                                            ? 'active'
                                                                            : 'inactive'
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {
                                                                    admin.created_at
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex justify-center gap-1">
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() =>
                                                                                    openEdit(
                                                                                        admin,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Pencil className="size-4 text-blue-600" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            Edit
                                                                            Admin
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                disabled={
                                                                                    admin.id ===
                                                                                    currentUserId
                                                                                }
                                                                                onClick={() =>
                                                                                    openStatusConfirm(
                                                                                        admin,
                                                                                    )
                                                                                }
                                                                            >
                                                                                {admin.is_active ? (
                                                                                    <PowerOff className="size-4 text-destructive" />
                                                                                ) : (
                                                                                    <Power className="size-4 text-emerald-600" />
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            {admin.is_active
                                                                                ? 'Deactivate'
                                                                                : 'Activate'}
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                disabled={
                                                                                    admin.id ===
                                                                                    currentUserId
                                                                                }
                                                                                onClick={() =>
                                                                                    openDelete(
                                                                                        admin,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash2 className="size-4 text-destructive" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            Delete
                                                                            Admin
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                        {collegeAdmins.total > 0 && (
                                            <NumberedPagination
                                                meta={collegeAdmins}
                                                itemLabel="college administrator"
                                                onPageChange={goToPage}
                                                onPerPageChange={changePerPage}
                                                idPrefix="college-admins-table-per-page"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Mobile card view (always shown on mobile, or when grid view active) */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {collegeAdmins.data.map((admin) => (
                                    <Card
                                        key={admin.id}
                                        className="flex flex-col justify-between"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-10">
                                                        {admin.avatar && (
                                                            <AvatarImage
                                                                src={
                                                                    admin.avatar
                                                                }
                                                                alt={admin.name}
                                                                className="object-cover"
                                                            />
                                                        )}
                                                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                            {getInitials(
                                                                admin.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <CardTitle className="text-base leading-tight font-semibold">
                                                            {admin.name}
                                                        </CardTitle>
                                                        <div className="text-xs text-muted-foreground">
                                                            {admin.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                <StatusBadge
                                                    status={
                                                        admin.is_active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pb-3 text-sm">
                                            <div className="rounded-md border bg-muted/30 p-2 text-xs">
                                                <div className="font-medium text-foreground">
                                                    {admin.college
                                                        ? `${admin.college.code} - ${admin.college.name}`
                                                        : 'Unassigned College'}
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                                                    <MapPin className="size-3 shrink-0" />
                                                    <span>
                                                        {admin.campus ||
                                                            'No Campus'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>
                                                    Position:{' '}
                                                    <strong className="font-medium text-foreground">
                                                        {admin.position ||
                                                            'College Admin'}
                                                    </strong>
                                                </span>
                                                {admin.employee_id && (
                                                    <span>
                                                        ID:{' '}
                                                        <strong className="font-mono text-foreground">
                                                            {admin.employee_id}
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                        <div className="flex items-center justify-end gap-1 border-t bg-muted/20 px-4 py-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            openEdit(admin)
                                                        }
                                                    >
                                                        <Pencil className="size-4 text-blue-600" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Edit Admin
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            admin.id ===
                                                            currentUserId
                                                        }
                                                        onClick={() =>
                                                            openStatusConfirm(
                                                                admin,
                                                            )
                                                        }
                                                    >
                                                        {admin.is_active ? (
                                                            <PowerOff className="size-4 text-destructive" />
                                                        ) : (
                                                            <Power className="size-4 text-emerald-600" />
                                                        )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {admin.is_active
                                                        ? 'Deactivate'
                                                        : 'Activate'}
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            admin.id ===
                                                            currentUserId
                                                        }
                                                        onClick={() =>
                                                            openDelete(admin)
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Delete Admin
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {collegeAdmins.total > 0 && (
                                <NumberedPagination
                                    meta={collegeAdmins}
                                    itemLabel="college administrator"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="college-admins-grid-per-page"
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add College Admin Modal */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add College Administrator</DialogTitle>
                        <DialogDescription>
                            Create a college admin account assigned to a
                            specific college department and campus.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitAdd} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="add_name">
                                    Full Name{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add_name"
                                    value={addForm.name}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Dr. Juan Dela Cruz"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="add_email">
                                    Email Address{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add_email"
                                    type="email"
                                    value={addForm.email}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            email: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. juan.delacruz@usep.edu.ph"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_college">
                                    Assigned College{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={addForm.college_id}
                                    onValueChange={handleAddCollegeChange}
                                >
                                    <SelectTrigger id="add_college">
                                        <SelectValue placeholder="Select college" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} - {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_campus">Campus</Label>
                                <Select
                                    value={addForm.campus_id || 'none'}
                                    onValueChange={(val) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            campus_id:
                                                val === 'none' ? '' : val,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="add_campus">
                                        <SelectValue placeholder="Select campus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Use College Campus
                                        </SelectItem>
                                        {campuses.map((camp) => (
                                            <SelectItem
                                                key={camp.id}
                                                value={String(camp.id)}
                                            >
                                                {camp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_emp_id">Employee ID</Label>
                                <Input
                                    id="add_emp_id"
                                    value={addForm.employee_id}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            employee_id: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. EMP-2024-001"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_position">
                                    Designation / Position
                                </Label>
                                <Input
                                    id="add_position"
                                    value={addForm.position}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            position: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Dean / OJT Coordinator"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_pwd">
                                    Password{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add_pwd"
                                    type="password"
                                    value={addForm.password}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            password: e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="add_pwd_conf">
                                    Confirm Password{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add_pwd_conf"
                                    type="password"
                                    value={addForm.password_confirmation}
                                    onChange={(e) =>
                                        setAddForm((f) => ({
                                            ...f,
                                            password_confirmation:
                                                e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create Account</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit College Admin Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit College Administrator</DialogTitle>
                        <DialogDescription>
                            Update administrator details, assigned college,
                            campus, or credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="edit_name">
                                    Full Name{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit_name"
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Dr. Juan Dela Cruz"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label htmlFor="edit_email">
                                    Email Address{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            email: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. juan.delacruz@usep.edu.ph"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_college">
                                    Assigned College{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={editForm.college_id}
                                    onValueChange={handleEditCollegeChange}
                                >
                                    <SelectTrigger id="edit_college">
                                        <SelectValue placeholder="Select college" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colleges.map((c) => (
                                            <SelectItem
                                                key={c.id}
                                                value={String(c.id)}
                                            >
                                                {c.code} - {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_campus">Campus</Label>
                                <Select
                                    value={editForm.campus_id || 'none'}
                                    onValueChange={(val) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            campus_id:
                                                val === 'none' ? '' : val,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="edit_campus">
                                        <SelectValue placeholder="Select campus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Use College Campus
                                        </SelectItem>
                                        {campuses.map((camp) => (
                                            <SelectItem
                                                key={camp.id}
                                                value={String(camp.id)}
                                            >
                                                {camp.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_emp_id">Employee ID</Label>
                                <Input
                                    id="edit_emp_id"
                                    value={editForm.employee_id}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            employee_id: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. EMP-2024-001"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_position">
                                    Designation / Position
                                </Label>
                                <Input
                                    id="edit_position"
                                    value={editForm.position}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            position: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Dean / OJT Coordinator"
                                />
                            </div>
                            <div className="col-span-2 border-t pt-2 text-xs text-muted-foreground">
                                Leave password fields blank unless you want to
                                change the administrator's password.
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_pwd">New Password</Label>
                                <Input
                                    id="edit_pwd"
                                    type="password"
                                    value={editForm.password}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            password: e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5 sm:col-span-1">
                                <Label htmlFor="edit_pwd_conf">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="edit_pwd_conf"
                                    type="password"
                                    value={editForm.password_confirmation}
                                    onChange={(e) =>
                                        setEditForm((f) => ({
                                            ...f,
                                            password_confirmation:
                                                e.target.value,
                                        }))
                                    }
                                    placeholder="••••••••"
                                />
                            </div>
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
                        ? 'Deactivate Administrator'
                        : 'Activate Administrator'
                }
                description={
                    statusTarget?.is_active
                        ? `Are you sure you want to deactivate "${statusTarget?.name}"? They will no longer be able to log in.`
                        : `Are you sure you want to activate "${statusTarget?.name}"?`
                }
                confirmText={
                    statusTarget?.is_active ? 'Deactivate' : 'Activate'
                }
                isDestructive={Boolean(statusTarget?.is_active)}
                onConfirm={submitStatusToggle}
            />

            {/* Delete Confirmation */}
            <ConfirmationDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete Administrator"
                description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive
                onConfirm={submitDelete}
            />
        </>
    );
}
