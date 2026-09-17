import { Head, router, usePage } from '@inertiajs/react';
import {
    Building2,
    Check,
    Filter,
    Landmark,
    LayoutGrid,
    MapPin,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Table as TableIcon,
    Trash2,
    UserCheck,
    UserCog,
    UserX,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { dashboard } from '@/routes';
import type { Campus, College, PageProps } from '@/types';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'college_admin' | 'admin';
    college_id: number | null;
    campus_id?: number | null;
    campus: string | null;
    employee_id?: string | null;
    position?: string | null;
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
    campus_id?: number | null;
    status: string | null;
    role: string | null;
    per_page: number;
}

interface AdminManagementProps {
    admins: Paginated<AdminUser>;
    colleges: College[];
    campuses?: Campus[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

export default function AdminManagement({
    admins,
    colleges,
    campuses = [],
    filters,
}: AdminManagementProps) {
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
    const [roleFilter, setRoleFilter] = useState<string>(filters.role || 'all');
    const [statusFilter, setStatusFilter] = useState<string>(
        filters.status || 'all',
    );
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    // Add dialog state
    const [addOpen, setAddOpen] = useState(false);
    const [addRole, setAddRole] = useState<'college_admin' | 'super_admin'>(
        'college_admin',
    );
    const [addName, setAddName] = useState('');
    const [addEmail, setAddEmail] = useState('');
    const [addCollegeId, setAddCollegeId] = useState('');
    const [addCampusId, setAddCampusId] = useState('');
    const [addEmployeeId, setAddEmployeeId] = useState('');
    const [addPosition, setAddPosition] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addPasswordConfirmation, setAddPasswordConfirmation] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Edit dialog state
    const [editOpen, setEditOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editCollegeId, setEditCollegeId] = useState('');
    const [editCampusId, setEditCampusId] = useState('');
    const [editEmployeeId, setEditEmployeeId] = useState('');
    const [editPosition, setEditPosition] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPasswordConfirmation, setEditPasswordConfirmation] =
        useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Status toggle confirmation
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [statusAdmin, setStatusAdmin] = useState<AdminUser | null>(null);

    // Delete confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteAdmin, setDeleteAdmin] = useState<AdminUser | null>(null);

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/admins', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    const baseParams = () => ({
        search: search || undefined,
        college_id: collegeId !== 'all' ? collegeId : undefined,
        campus_id: campusId !== 'all' ? campusId : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

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

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...baseParams(),
            search: search || undefined,
            page: undefined,
        });
    };

    const handleClearSearch = () => {
        setSearch('');
        visit({
            ...baseParams(),
            search: undefined,
            page: undefined,
        });
    };

    const handleRoleChange = (val: string) => {
        setRoleFilter(val);
        visit({
            ...baseParams(),
            role: val !== 'all' ? val : undefined,
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
        setStatusFilter(val);
        visit({
            ...baseParams(),
            status: val !== 'all' ? val : undefined,
            page: undefined,
        });
    };

    const handleResetFilters = () => {
        setSearch('');
        setCollegeId('all');
        setCampusId('all');
        setRoleFilter('all');
        setStatusFilter('all');
        visit({
            per_page: filters.per_page ? String(filters.per_page) : undefined,
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(
        search ||
        collegeId !== 'all' ||
        campusId !== 'all' ||
        roleFilter !== 'all' ||
        statusFilter !== 'all',
    );

    const goToPage = (page: number) =>
        visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    const handleOpenAdd = () => {
        setAddRole('college_admin');
        setAddName('');
        setAddEmail('');
        setAddCollegeId(colleges.length > 0 ? String(colleges[0].id) : '');
        setAddCampusId('');
        setAddEmployeeId('');
        setAddPosition('');
        setAddPassword('');
        setAddPasswordConfirmation('');
        setAddOpen(true);
    };

    const handleAddCollegeChange = (colId: string) => {
        setAddCollegeId(colId);
        const selCollege = colleges.find((c) => String(c.id) === colId);
        if (selCollege?.campus_id) {
            setAddCampusId(String(selCollege.campus_id));
        } else if (selCollege?.campus) {
            const foundCamp = campuses.find(
                (c) =>
                    c.name.toLowerCase() === selCollege.campus?.toLowerCase(),
            );
            if (foundCamp) setAddCampusId(String(foundCamp.id));
        }
    };

    const handleAddSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!addName.trim() || !addEmail.trim()) {
            toast.error('Name and email are required.');
            return;
        }

        if (addRole === 'college_admin' && !addCollegeId) {
            toast.error('Please select an assigned college.');
            return;
        }

        if (!addPassword) {
            toast.error('Password is required.');
            return;
        }

        if (addPassword !== addPasswordConfirmation) {
            toast.error('Passwords do not match.');
            return;
        }

        setAddLoading(true);

        const payload: Record<string, any> = {
            name: addName.trim(),
            email: addEmail.trim().toLowerCase(),
            role: addRole,
            password: addPassword,
            password_confirmation: addPasswordConfirmation,
        };

        if (addRole === 'college_admin') {
            payload.college_id = Number(addCollegeId);
            payload.campus_id = addCampusId ? Number(addCampusId) : null;
            payload.employee_id = addEmployeeId.trim() || null;
            payload.position = addPosition.trim() || null;
        }

        router.post('/admin/admins', payload, {
            preserveScroll: true,
            onSuccess: () => {
                setAddOpen(false);
            },
            onFinish: () => setAddLoading(false),
        });
    };

    const handleOpenEdit = (admin: AdminUser) => {
        setEditingAdmin(admin);
        setEditName(admin.name);
        setEditEmail(admin.email);
        setEditCollegeId(admin.college_id ? String(admin.college_id) : '');
        setEditCampusId(admin.campus_id ? String(admin.campus_id) : '');
        setEditEmployeeId(admin.employee_id || '');
        setEditPosition(admin.position || '');
        setEditPassword('');
        setEditPasswordConfirmation('');
        setEditOpen(true);
    };

    const handleEditCollegeChange = (colId: string) => {
        setEditCollegeId(colId);
        const selCollege = colleges.find((c) => String(c.id) === colId);
        if (selCollege?.campus_id) {
            setEditCampusId(String(selCollege.campus_id));
        } else if (selCollege?.campus) {
            const foundCamp = campuses.find(
                (c) =>
                    c.name.toLowerCase() === selCollege.campus?.toLowerCase(),
            );
            if (foundCamp) setEditCampusId(String(foundCamp.id));
        }
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!editingAdmin || !editName.trim() || !editEmail.trim()) {
            toast.error('Name and email are required.');
            return;
        }

        if (editPassword && editPassword !== editPasswordConfirmation) {
            toast.error('Passwords do not match.');
            return;
        }

        setEditLoading(true);

        const payload: Record<string, any> = {
            name: editName.trim(),
            email: editEmail.trim().toLowerCase(),
        };

        if (editingAdmin.role === 'college_admin') {
            payload.college_id = editCollegeId ? Number(editCollegeId) : null;
            payload.campus_id = editCampusId ? Number(editCampusId) : null;
            payload.employee_id = editEmployeeId.trim() || null;
            payload.position = editPosition.trim() || null;
        }

        if (editPassword) {
            payload.password = editPassword;
            payload.password_confirmation = editPasswordConfirmation;
        }

        router.patch(`/admin/admins/${editingAdmin.id}`, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                setEditingAdmin(null);
            },
            onFinish: () => setEditLoading(false),
        });
    };

    const handleToggleStatusClick = (admin: AdminUser) => {
        if (admin.id === currentUserId) {
            toast.error('You cannot change your own active status.');
            return;
        }
        setStatusAdmin(admin);
        setStatusConfirmOpen(true);
    };

    const handleConfirmStatusToggle = () => {
        if (!statusAdmin) return;

        router.patch(
            `/admin/admins/${statusAdmin.id}/status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setStatusConfirmOpen(false);
                    setStatusAdmin(null);
                },
            },
        );
    };

    const handleDeleteClick = (admin: AdminUser) => {
        if (admin.id === currentUserId) {
            toast.error('You cannot delete your own account.');
            return;
        }
        setDeleteAdmin(admin);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deleteAdmin) return;

        router.delete(`/admin/admins/${deleteAdmin.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteConfirmOpen(false);
                setDeleteAdmin(null);
            },
        });
    };

    return (
        <>
            <Head title="Admin Management" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 sm:gap-6 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <ShieldCheck className="size-5" />
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
                                    Administrators
                                </h1>
                                <Badge
                                    variant="outline"
                                    className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                >
                                    <ShieldCheck className="mr-1 size-3.5" />
                                    Super Admin Control
                                </Badge>
                            </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage Super Administrators and College
                            Administrators across all USeP colleges and
                            campuses.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search admins..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-9 w-44 pr-8 pl-8"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button
                            onClick={handleOpenAdd}
                            className="w-full shrink-0 justify-center gap-2 sm:w-auto"
                        >
                            <Plus className="size-4" />
                            Add Administrator
                        </Button>
                    </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                            {/* Search Input */}
                            <div className="relative min-w-[200px] flex-1 sm:hidden">
                                <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search admins..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 pr-8 pl-9"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>

                            {/* Mobile Filters Toggle */}
                            <Button
                                variant={
                                    mobileFiltersOpen ? 'secondary' : 'outline'
                                }
                                size="sm"
                                onClick={() =>
                                    setMobileFiltersOpen((prev) => !prev)
                                }
                                className="h-9 gap-1.5 sm:hidden"
                            >
                                <Filter className="size-3.5" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="size-2 rounded-full bg-primary" />
                                )}
                            </Button>

                            {/* Desktop Filters */}
                            <div className="hidden sm:flex sm:items-center sm:gap-2">
                                {/* College Filter */}
                                <Select
                                    value={collegeId}
                                    onValueChange={handleCollegeChange}
                                >
                                    <SelectTrigger className="h-9 w-[180px]">
                                        <SelectValue placeholder="All Colleges" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Colleges
                                        </SelectItem>
                                        {colleges.map((college) => (
                                            <SelectItem
                                                key={college.id}
                                                value={String(college.id)}
                                            >
                                                {college.code} — {college.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Campus Filter */}
                                <Select
                                    value={campusId}
                                    onValueChange={handleCampusChange}
                                >
                                    <SelectTrigger className="h-9 w-[150px]">
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
                                    value={statusFilter}
                                    onValueChange={handleStatusChange}
                                >
                                    <SelectTrigger className="h-9 w-[130px]">
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

                                {/* Reset Filters */}
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="mr-1 size-3.5" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Role Filter Tabs & View Toggle */}
                        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                            <Tabs
                                value={roleFilter}
                                onValueChange={handleRoleChange}
                                className="w-full sm:w-auto"
                            >
                                <TabsList className="grid w-full grid-cols-3 sm:w-[320px]">
                                    <TabsTrigger
                                        value="all"
                                        className="text-xs"
                                    >
                                        All
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="super_admin"
                                        className="text-xs"
                                    >
                                        Super Admins
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="college_admin"
                                        className="text-xs"
                                    >
                                        College Admins
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <Tabs
                                value={view}
                                onValueChange={(value) =>
                                    setView(value as ViewMode)
                                }
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
                    </div>

                    {/* Mobile Filters Dropdown */}
                    {mobileFiltersOpen && (
                        <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-3.5 sm:hidden">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Filters
                                </Label>
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="mr-1 size-3" />
                                        Reset All
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Select
                                    value={collegeId}
                                    onValueChange={handleCollegeChange}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="All Colleges" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Colleges
                                        </SelectItem>
                                        {colleges.map((college) => (
                                            <SelectItem
                                                key={college.id}
                                                value={String(college.id)}
                                            >
                                                {college.code} — {college.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={campusId}
                                    onValueChange={handleCampusChange}
                                >
                                    <SelectTrigger className="h-9">
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

                                <Select
                                    value={statusFilter}
                                    onValueChange={handleStatusChange}
                                >
                                    <SelectTrigger className="h-9">
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
                        </div>
                    )}
                </div>

                {/* Content: Table View */}
                {view === 'table' ? (
                    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[920px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[240px]">
                                            Administrator
                                        </TableHead>
                                        <TableHead className="w-[140px]">
                                            Role
                                        </TableHead>
                                        <TableHead className="w-[200px]">
                                            Assigned College
                                        </TableHead>
                                        <TableHead className="w-[130px]">
                                            Campus
                                        </TableHead>
                                        <TableHead className="w-[150px]">
                                            Designation / ID
                                        </TableHead>
                                        <TableHead className="w-[100px] text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="w-[110px]">
                                            Added
                                        </TableHead>
                                        <TableHead className="w-[110px] text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {admins.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={8}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                No administrators found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        admins.data.map((admin) => {
                                            const isCurrent =
                                                admin.id === currentUserId;
                                            const isSuper =
                                                admin.role === 'super_admin';

                                            return (
                                                <TableRow key={admin.id}>
                                                    {/* User Info */}
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-9">
                                                                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                                                    {getInitials(
                                                                        admin.name,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex min-w-0 flex-col">
                                                                <div className="flex items-center gap-1.5 font-medium">
                                                                    <span className="truncate">
                                                                        {
                                                                            admin.name
                                                                        }
                                                                    </span>
                                                                    {isCurrent && (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="shrink-0 px-1 py-0 text-[10px]"
                                                                        >
                                                                            You
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="truncate text-xs text-muted-foreground">
                                                                    {
                                                                        admin.email
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Role */}
                                                    <TableCell>
                                                        {isSuper ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                                            >
                                                                <Shield className="mr-1 size-3" />
                                                                Super Admin
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                                            >
                                                                <Building2 className="mr-1 size-3" />
                                                                College Admin
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* College */}
                                                    <TableCell>
                                                        {isSuper ? (
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                University-Wide
                                                                (All)
                                                            </span>
                                                        ) : admin.college ? (
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
                                                                <div
                                                                    className="line-clamp-1 text-xs text-muted-foreground"
                                                                    title={
                                                                        admin
                                                                            .college
                                                                            .name
                                                                    }
                                                                >
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

                                                    {/* Campus */}
                                                    <TableCell>
                                                        {admin.campus ? (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs font-normal"
                                                            >
                                                                <MapPin className="mr-1 size-3 shrink-0" />
                                                                {admin.campus}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                N/A
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Designation / ID */}
                                                    <TableCell>
                                                        {isSuper ? (
                                                            <span className="text-xs text-muted-foreground">
                                                                —
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <div className="text-xs font-medium text-foreground">
                                                                    {admin.position ||
                                                                        'College Admin'}
                                                                </div>
                                                                {admin.employee_id && (
                                                                    <div className="font-mono text-[11px] text-muted-foreground">
                                                                        ID:{' '}
                                                                        {
                                                                            admin.employee_id
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    {/* Status */}
                                                    <TableCell className="text-center">
                                                        <StatusBadge
                                                            status={
                                                                admin.is_active
                                                                    ? 'active'
                                                                    : 'inactive'
                                                            }
                                                        />
                                                    </TableCell>

                                                    {/* Added Date */}
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {admin.created_at}
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            handleOpenEdit(
                                                                                admin,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="size-4 text-blue-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Edit Admin
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            {!isCurrent && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() =>
                                                                                    handleToggleStatusClick(
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
                                                                                onClick={() =>
                                                                                    handleDeleteClick(
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    /* Content: Grid View */
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {admins.data.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                No administrators found.
                            </div>
                        ) : (
                            admins.data.map((admin) => {
                                const isCurrent = admin.id === currentUserId;
                                const isSuper = admin.role === 'super_admin';

                                return (
                                    <Card
                                        key={admin.id}
                                        className="flex flex-col justify-between"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex min-w-0 items-start justify-between gap-2">
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <Avatar className="size-10 shrink-0">
                                                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                                            {getInitials(
                                                                admin.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <CardTitle className="truncate text-base leading-tight font-semibold">
                                                            {admin.name}
                                                        </CardTitle>
                                                        <span className="block truncate text-xs text-muted-foreground">
                                                            {admin.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                <StatusBadge
                                                    status={
                                                        admin.is_active
                                                            ? 'active'
                                                            : 'inactive'
                                                    }
                                                    className="shrink-0"
                                                />
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-3 pb-3 text-sm">
                                            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">
                                                        Role:
                                                    </span>
                                                    {isSuper ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-purple-200 bg-purple-50 text-purple-700"
                                                        >
                                                            <Shield className="mr-1 size-3" />
                                                            Super Admin
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-blue-200 bg-blue-50 text-blue-700"
                                                        >
                                                            <Building2 className="mr-1 size-3" />
                                                            College Admin
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="shrink-0 text-muted-foreground">
                                                        College:
                                                    </span>
                                                    {isSuper ? (
                                                        <span className="font-medium text-foreground">
                                                            University-Wide
                                                        </span>
                                                    ) : admin.college ? (
                                                        <span className="truncate text-right font-semibold text-foreground">
                                                            {admin.college.code}{' '}
                                                            —{' '}
                                                            {admin.college.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">
                                                            None
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">
                                                        Campus:
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {admin.campus ?? 'N/A'}
                                                    </span>
                                                </div>

                                                {!isSuper && (
                                                    <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                                                        <span className="shrink-0 text-muted-foreground">
                                                            Designation:
                                                        </span>
                                                        <span className="truncate text-right font-medium text-foreground">
                                                            {admin.position ||
                                                                'College Admin'}
                                                            {admin.employee_id &&
                                                                ` (${admin.employee_id})`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>

                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                            <span>
                                                Added {admin.created_at}
                                            </span>
                                            <div className="ml-auto flex shrink-0 items-center gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleOpenEdit(
                                                                    admin,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-4 text-blue-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Edit Admin
                                                    </TooltipContent>
                                                </Tooltip>

                                                {!isCurrent && (
                                                    <>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        handleToggleStatusClick(
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
                                                                    onClick={() =>
                                                                        handleDeleteClick(
                                                                            admin,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4 text-destructive" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Delete Admin
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Pagination */}
                {admins.total > 0 && (
                    <NumberedPagination
                        meta={admins}
                        itemLabel="administrator"
                        onPageChange={goToPage}
                        onPerPageChange={changePerPage}
                    />
                )}
            </div>

            {/* Add Administrator Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto p-4 sm:max-w-[540px] sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="size-5 text-primary" />
                            Add Administrator
                        </DialogTitle>
                        <DialogDescription>
                            Create a new administrator account with system-wide
                            or college-scoped permissions.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* Role Selection */}
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="add_role">
                                    Administrator Role{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={addRole}
                                    onValueChange={(
                                        val: 'college_admin' | 'super_admin',
                                    ) => setAddRole(val)}
                                >
                                    <SelectTrigger id="add_role">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="college_admin">
                                            College Administrator (College
                                            Scoped)
                                        </SelectItem>
                                        <SelectItem value="super_admin">
                                            Super Administrator (System-Wide
                                            Access)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="add-name">
                                    Full Name{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add-name"
                                    placeholder="e.g. Maria Santos"
                                    value={addName}
                                    onChange={(e) => setAddName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="add-email">
                                    Email Address{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add-email"
                                    type="email"
                                    placeholder="e.g. maria.santos@usep.edu.ph"
                                    value={addEmail}
                                    onChange={(e) =>
                                        setAddEmail(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            {addRole === 'college_admin' ? (
                                <>
                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="add-college">
                                            Assigned College{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={addCollegeId}
                                            onValueChange={
                                                handleAddCollegeChange
                                            }
                                            required
                                        >
                                            <SelectTrigger id="add-college">
                                                <SelectValue placeholder="Select a college" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colleges.map((college) => (
                                                    <SelectItem
                                                        key={college.id}
                                                        value={String(
                                                            college.id,
                                                        )}
                                                    >
                                                        {college.code} —{' '}
                                                        {college.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="add-campus">
                                            Campus
                                        </Label>
                                        <Select
                                            value={addCampusId || 'none'}
                                            onValueChange={(val) =>
                                                setAddCampusId(
                                                    val === 'none' ? '' : val,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="add-campus">
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

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="add-emp-id">
                                            Employee ID
                                        </Label>
                                        <Input
                                            id="add-emp-id"
                                            placeholder="e.g. EMP-2024-001"
                                            value={addEmployeeId}
                                            onChange={(e) =>
                                                setAddEmployeeId(e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="add-position">
                                            Designation / Position
                                        </Label>
                                        <Input
                                            id="add-position"
                                            placeholder="e.g. Dean / OJT Coordinator"
                                            value={addPosition}
                                            onChange={(e) =>
                                                setAddPosition(e.target.value)
                                            }
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-md bg-purple-50 p-3 text-xs text-purple-700 sm:col-span-2 dark:bg-purple-950/40 dark:text-purple-300">
                                    <p className="font-semibold">
                                        Full System Privileges
                                    </p>
                                    <p className="mt-0.5">
                                        Super Administrators have unrestricted
                                        access to all colleges, campuses,
                                        programs, intern approvals, and system
                                        settings.
                                    </p>
                                </div>
                            )}

                            <div className="col-span-1 space-y-1.5">
                                <Label htmlFor="add-password">
                                    Password{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={addPassword}
                                    onChange={(e) =>
                                        setAddPassword(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="col-span-1 space-y-1.5">
                                <Label htmlFor="add-confirm-password">
                                    Confirm Password{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add-confirm-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={addPasswordConfirmation}
                                    onChange={(e) =>
                                        setAddPasswordConfirmation(
                                            e.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddOpen(false)}
                                disabled={addLoading}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={addLoading}
                                className="w-full sm:w-auto"
                            >
                                {addLoading ? 'Creating...' : 'Create Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Admin Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto p-4 sm:max-w-[540px] sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="size-5 text-primary" />
                            Edit Administrator
                        </DialogTitle>
                        <DialogDescription>
                            Update administrator details, college assignment,
                            campus, or credentials.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleEditSubmit}
                        className="space-y-4 pt-2"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="edit-name">
                                    Full Name{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor="edit-email">
                                    Email Address{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) =>
                                        setEditEmail(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            {editingAdmin?.role === 'college_admin' && (
                                <>
                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="edit-college">
                                            Assigned College{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={editCollegeId}
                                            onValueChange={
                                                handleEditCollegeChange
                                            }
                                        >
                                            <SelectTrigger id="edit-college">
                                                <SelectValue placeholder="Select a college" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {colleges.map((college) => (
                                                    <SelectItem
                                                        key={college.id}
                                                        value={String(
                                                            college.id,
                                                        )}
                                                    >
                                                        {college.code} —{' '}
                                                        {college.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="edit-campus">
                                            Campus
                                        </Label>
                                        <Select
                                            value={editCampusId || 'none'}
                                            onValueChange={(val) =>
                                                setEditCampusId(
                                                    val === 'none' ? '' : val,
                                                )
                                            }
                                        >
                                            <SelectTrigger id="edit-campus">
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

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="edit-emp-id">
                                            Employee ID
                                        </Label>
                                        <Input
                                            id="edit-emp-id"
                                            placeholder="e.g. EMP-2024-001"
                                            value={editEmployeeId}
                                            onChange={(e) =>
                                                setEditEmployeeId(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="col-span-1 space-y-1.5">
                                        <Label htmlFor="edit-position">
                                            Designation / Position
                                        </Label>
                                        <Input
                                            id="edit-position"
                                            placeholder="e.g. Dean / OJT Coordinator"
                                            value={editPosition}
                                            onChange={(e) =>
                                                setEditPosition(e.target.value)
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            <div className="border-t pt-2 text-xs text-muted-foreground sm:col-span-2">
                                Leave password fields blank unless you wish to
                                change the administrator's password.
                            </div>

                            <div className="col-span-1 space-y-1.5">
                                <Label htmlFor="edit-password">
                                    New Password
                                </Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={editPassword}
                                    onChange={(e) =>
                                        setEditPassword(e.target.value)
                                    }
                                />
                            </div>

                            <div className="col-span-1 space-y-1.5">
                                <Label htmlFor="edit-confirm-password">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="edit-confirm-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={editPasswordConfirmation}
                                    onChange={(e) =>
                                        setEditPasswordConfirmation(
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                                disabled={editLoading}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editLoading}
                                className="w-full sm:w-auto"
                            >
                                {editLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Status Toggle Confirmation Dialog */}
            <ConfirmationDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title={
                    statusAdmin?.is_active
                        ? 'Deactivate Administrator'
                        : 'Activate Administrator'
                }
                description={
                    statusAdmin?.is_active
                        ? `Are you sure you want to deactivate ${statusAdmin?.name}? They will no longer be able to log in.`
                        : `Are you sure you want to activate ${statusAdmin?.name}? They will be able to log in.`
                }
                confirmText={statusAdmin?.is_active ? 'Deactivate' : 'Activate'}
                isDestructive={Boolean(statusAdmin?.is_active)}
                onConfirm={handleConfirmStatusToggle}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Administrator"
                description={`Are you sure you want to permanently delete the administrator account for ${deleteAdmin?.name}? This action cannot be undone.`}
                confirmText="Delete Account"
                isDestructive
                onConfirm={handleConfirmDelete}
            />
        </>
    );
}
