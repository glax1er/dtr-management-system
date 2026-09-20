import { Head, router } from '@inertiajs/react';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    GraduationCap,
    Landmark,
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
import { dashboard } from '@/routes';

interface ProgramItem {
    program_id?: number;
    program_name: string;
    required_hours: number;
    is_active?: boolean;
}

interface CollegeRecord {
    id: number;
    name: string;
    code: string;
    campus: string | null;
    description: string | null;
    is_active: boolean;
    programs_count: number;
    admins_count: number;
    interns_count: number;
    admin_email: string | null;
    programs: ProgramItem[];
    created_at: string | null;
}

interface Filters {
    search: string;
    status: string;
    campus?: string;
    per_page: number;
}

interface CollegeIndexProps {
    colleges: Paginated<CollegeRecord>;
    filters: Filters;
    campuses?: string[];
}

type ViewMode = 'table' | 'grid';

export default function CollegesIndex({ colleges, filters, campuses = [] }: CollegeIndexProps) {
    const defaultCampuses = ['Mabini', 'Malabog', 'Mintal', 'Obrero', 'Tagum'];
    const campusList = campuses && campuses.length > 0 ? campuses : defaultCampuses;

    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [campus, setCampus] = useState(filters.campus || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    // Accordion / Expanded rows state for viewing programs
    const [expandedColleges, setExpandedColleges] = useState<Set<number>>(new Set());

    const toggleExpand = (collegeId: number) => {
        setExpandedColleges((prev) => {
            const next = new Set(prev);
            if (next.has(collegeId)) {
                next.delete(collegeId);
            } else {
                next.add(collegeId);
            }
            return next;
        });
    };

    // Add College Dialog State
    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addCode, setAddCode] = useState('');
    const [addCampus, setAddCampus] = useState('');
    const [addDescription, setAddDescription] = useState('');

    // Edit College Dialog State
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CollegeRecord | null>(null);
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');
    const [editCampus, setEditCampus] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // Confirmation dialog states
    const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
    const [statusTarget, setStatusTarget] = useState<CollegeRecord | null>(null);

    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<CollegeRecord | null>(null);

    const baseParams = () => ({
        search: search || undefined,
        status: status || undefined,
        campus: campus || undefined,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    });

    const visit = (params: Record<string, string | undefined>, replace = true) => {
        router.get('/admin/colleges', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
        });
    };

    const goToPage = (page: number) => {
        visit({
            ...baseParams(),
            page: page > 1 ? String(page) : undefined,
        });
    };

    const changePerPage = (perPage: number) => {
        visit({
            ...baseParams(),
            per_page: String(perPage),
            page: undefined,
        });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (debouncedSearch !== filters.search) {
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
            status: status || undefined,
            campus: campus || undefined,
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

    const applyStatus = (value: string) => {
        const nextStatus = value === 'all' ? '' : value;
        setStatus(nextStatus);
        visit({
            ...baseParams(),
            status: nextStatus || undefined,
            page: undefined,
        });
    };

    const applyCampus = (value: string) => {
        const nextCampus = value === 'all' ? '' : value;
        setCampus(nextCampus);
        visit({
            ...baseParams(),
            campus: nextCampus || undefined,
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(search || status || campus);

    const clearAllFilters = () => {
        setSearch('');
        setStatus('');
        setCampus('');
        visit({
            per_page: filters.per_page ? String(filters.per_page) : undefined,
            page: undefined,
        });
    };

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();
        if (!addName.trim() || !addCode.trim()) {
            toast.error('College name and code are required.');
            return;
        }

        router.post(
            '/admin/colleges',
            {
                name: addName.trim(),
                code: addCode.trim().toUpperCase(),
                campus: addCampus.trim() || null,
                description: addDescription.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setAddName('');
                    setAddCode('');
                    setAddCampus('');
                    setAddDescription('');
                },
            }
        );
    };

    const openEdit = (college: CollegeRecord) => {
        setEditTarget(college);
        setEditName(college.name);
        setEditCode(college.code);
        setEditCampus(college.campus || '');
        setEditDescription(college.description || '');
        setEditOpen(true);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editTarget || !editName.trim() || !editCode.trim()) {
            toast.error('College name and code are required.');
            return;
        }

        router.patch(
            `/admin/colleges/${editTarget.id}`,
            {
                name: editName.trim(),
                code: editCode.trim().toUpperCase(),
                campus: editCampus.trim() || null,
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

    const openStatusConfirm = (college: CollegeRecord) => {
        setStatusTarget(college);
        setStatusConfirmOpen(true);
    };

    const submitStatusToggle = () => {
        if (!statusTarget) return;

        router.patch(
            `/admin/colleges/${statusTarget.id}/status`,
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

    const openArchive = (college: CollegeRecord) => {
        setArchiveTarget(college);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (!archiveTarget) return;

        router.delete(`/admin/colleges/${archiveTarget.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setArchiveOpen(false);
                setArchiveTarget(null);
            },
        });
    };

    return (
        <>
            <Head title="College Departments" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <Landmark className="size-5" />
                        </span>
                        College Departments
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search colleges..."
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

                        {/* Mobile search toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Status Filter Dropdown */}
                        <Select value={status || 'all'} onValueChange={applyStatus}>
                            <SelectTrigger className="h-9 w-32">
                                <SlidersHorizontal className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Campus Filter Dropdown */}
                        <Select value={campus || 'all'} onValueChange={applyCampus}>
                            <SelectTrigger className="h-9 w-36">
                                <MapPin className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="All Campuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Campuses</SelectItem>
                                {campusList.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
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

                        {/* Add College Button */}
                        <Button onClick={() => setAddOpen(true)} className="gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Add College
                        </Button>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {mobileSearchOpen && (
                    <form onSubmit={applySearch} className="relative sm:hidden">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search colleges..."
                            className="h-9 w-full rounded-md border bg-background pr-8 pl-9 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </form>
                )}

                {/* Content */}
                {colleges.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No colleges {hasActiveFilters ? 'match this filter.' : 'yet.'}
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
                                                    <TableHead className="w-10 text-center" />
                                                    <TableHead className="w-24">Code</TableHead>
                                                    <TableHead className="min-w-[220px]">College Name</TableHead>
                                                    <TableHead className="w-32">Campus</TableHead>
                                                    <TableHead className="w-24 text-center">Interns</TableHead>
                                                    <TableHead className="min-w-[200px]">Admin Email</TableHead>
                                                    <TableHead className="w-28 text-center">Status</TableHead>
                                                    <TableHead className="w-32 text-center">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {colleges.data.map((college) => {
                                                    const isExpanded = expandedColleges.has(college.id);
                                                    return (
                                                        <>
                                                            <TableRow
                                                                key={college.id}
                                                                className="cursor-pointer transition-colors hover:bg-muted/40"
                                                                onClick={() => toggleExpand(college.id)}
                                                            >
                                                                <TableCell className="text-center p-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleExpand(college.id);
                                                                        }}
                                                                        className="inline-flex size-6 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                                                                        aria-label={isExpanded ? 'Collapse programs' : 'Expand programs'}
                                                                    >
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="size-4 transition-transform text-primary" />
                                                                        ) : (
                                                                            <ChevronRight className="size-4 transition-transform" />
                                                                        )}
                                                                    </button>
                                                                </TableCell>

                                                                <TableCell className="font-semibold text-primary">
                                                                    <Badge variant="outline" className="font-mono text-xs font-bold">
                                                                        {college.code}
                                                                    </Badge>
                                                                </TableCell>

                                                                <TableCell>
                                                                    <div className="font-medium text-foreground">{college.name}</div>
                                                                    {college.description && (
                                                                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                                                            {college.description}
                                                                        </div>
                                                                    )}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {college.campus ? (
                                                                        <Badge variant="secondary" className="text-xs">
                                                                            <MapPin className="mr-1 size-3 text-muted-foreground" />
                                                                            {college.campus}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground italic">
                                                                            N/A
                                                                        </span>
                                                                    )}
                                                                </TableCell>

                                                                <TableCell className="text-center font-medium">
                                                                    {college.interns_count}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {college.admin_email ? (
                                                                        <span className="font-mono text-xs text-foreground font-medium">
                                                                            {college.admin_email}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground italic">
                                                                            N/A
                                                                        </span>
                                                                    )}
                                                                </TableCell>

                                                                <TableCell className="text-center">
                                                                    <StatusBadge status={college.is_active ? 'active' : 'inactive'} />
                                                                </TableCell>

                                                                <TableCell
                                                                    className="text-center"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <ProgramActions
                                                                        program={college}
                                                                        onEdit={() => openEdit(college)}
                                                                        onToggleActive={() => openStatusConfirm(college)}
                                                                        onArchive={() => openArchive(college)}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* Dropdown / Expandable Row for Programs */}
                                                            {isExpanded && (
                                                                <TableRow className="bg-muted/25 hover:bg-muted/30">
                                                                    <TableCell colSpan={8} className="px-6 py-4">
                                                                        <div className="rounded-lg border bg-background/80 p-3.5 shadow-2xs">
                                                                            <div className="flex items-center gap-2 border-b pb-2.5 mb-2.5">
                                                                                <BookOpen className="size-4 text-primary" />
                                                                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                                                                    Programs Offered ({college.programs.length})
                                                                                </span>
                                                                            </div>

                                                                            {college.programs.length === 0 ? (
                                                                                <div className="py-3 text-center text-xs text-muted-foreground italic">
                                                                                    No programs configured under this college yet.
                                                                                </div>
                                                                            ) : (
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                                                    {college.programs.map((p) => (
                                                                                        <div
                                                                                            key={p.program_id ?? p.program_name}
                                                                                            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs shadow-2xs"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <GraduationCap className="size-3.5 text-muted-foreground shrink-0" />
                                                                                                <span className="font-medium text-foreground">
                                                                                                    {p.program_name}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                                    {p.required_hours} hrs
                                                                                                </span>
                                                                                                {p.is_active !== undefined && (
                                                                                                    <StatusBadge
                                                                                                        status={p.is_active ? 'active' : 'inactive'}
                                                                                                        className="text-[10px] px-1.5 py-0"
                                                                                                    />
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                        {colleges.total > 0 && (
                                            <NumberedPagination
                                                meta={colleges}
                                                itemLabel="college"
                                                onPageChange={goToPage}
                                                onPerPageChange={changePerPage}
                                                idPrefix="colleges-table-per-page"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid — always on mobile, desktop when grid tab selected */}
                        <div className={view === 'table' ? 'sm:hidden' : ''}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {colleges.data.map((college) => {
                                    const isExpanded = expandedColleges.has(college.id);
                                    return (
                                        <Card key={college.id} className="flex flex-col justify-between shadow-xs">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs font-bold">
                                                        {college.code}
                                                    </Badge>
                                                    <StatusBadge status={college.is_active ? 'active' : 'inactive'} />
                                                </div>
                                                <CardTitle className="mt-2 text-base font-semibold leading-snug">
                                                    {college.name}
                                                </CardTitle>
                                                {college.description && (
                                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                        {college.description}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="size-3.5 shrink-0" />
                                                        <span>Campus: <span className="font-medium text-foreground">{college.campus ?? 'N/A'}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <GraduationCap className="size-3.5 shrink-0" />
                                                        <span>Interns: <span className="font-semibold text-foreground">{college.interns_count}</span></span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Admin: </span>
                                                        {college.admin_email ? (
                                                            <span className="font-mono text-foreground">{college.admin_email}</span>
                                                        ) : (
                                                            <span className="italic">N/A</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="border-t pt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(college.id)}
                                                        className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground font-medium mb-2"
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            <BookOpen className="size-3.5 text-primary" />
                                                            Programs Offered ({college.programs.length})
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronDown className="size-3.5 text-primary" />
                                                        ) : (
                                                            <ChevronRight className="size-3.5" />
                                                        )}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                            {college.programs.length === 0 ? (
                                                                <div className="py-1 text-xs text-muted-foreground italic">
                                                                    No programs configured yet.
                                                                </div>
                                                            ) : (
                                                                college.programs.map((p) => (
                                                                    <div
                                                                        key={p.program_id ?? p.program_name}
                                                                        className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1 text-[11px]"
                                                                    >
                                                                        <span className="font-medium">{p.program_name}</span>
                                                                        <span className="text-muted-foreground">{p.required_hours} hrs</span>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex items-center justify-center border-t pt-3">
                                                    <ProgramActions
                                                        program={college}
                                                        onEdit={() => openEdit(college)}
                                                        onToggleActive={() => openStatusConfirm(college)}
                                                        onArchive={() => openArchive(college)}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                            {colleges.total > 0 && (
                                <NumberedPagination
                                    meta={colleges}
                                    itemLabel="college"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="colleges-grid-per-page"
                                />
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add College Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add College / Department</DialogTitle>
                        <DialogDescription>
                            Enter details to create a new college department.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitAdd} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="add-code">College Code</Label>
                            <Input
                                id="add-code"
                                placeholder="e.g. CIC, CoE, CAS"
                                value={addCode}
                                onChange={(e) => setAddCode(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="add-name">College Name</Label>
                            <Input
                                id="add-name"
                                placeholder="e.g. College of Information and Computing"
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="add-campus">Campus</Label>
                            <Select value={addCampus || 'none'} onValueChange={(val) => setAddCampus(val === 'none' ? '' : val)}>
                                <SelectTrigger id="add-campus">
                                    <SelectValue placeholder="Select campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None / Unassigned</SelectItem>
                                    {campusList.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="add-desc">Description (optional)</Label>
                            <Textarea
                                id="add-desc"
                                placeholder="Brief description of the college..."
                                value={addDescription}
                                onChange={(e) => setAddDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create College</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit College Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit College / Department</DialogTitle>
                        <DialogDescription>
                            Update college details and campus assignment.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-code">College Code</Label>
                            <Input
                                id="edit-code"
                                value={editCode}
                                onChange={(e) => setEditCode(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">College Name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-campus">Campus</Label>
                            <Select value={editCampus || 'none'} onValueChange={(val) => setEditCampus(val === 'none' ? '' : val)}>
                                <SelectTrigger id="edit-campus">
                                    <SelectValue placeholder="Select campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None / Unassigned</SelectItem>
                                    {campusList.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-desc">Description (optional)</Label>
                            <Textarea
                                id="edit-desc"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Toggle Status Confirmation Dialog */}
            <ConfirmationDialog
                open={statusConfirmOpen}
                onOpenChange={setStatusConfirmOpen}
                title={statusTarget?.is_active ? 'Deactivate College' : 'Activate College'}
                description={`Are you sure you want to ${
                    statusTarget?.is_active ? 'deactivate' : 'activate'
                } "${statusTarget?.name}"? ${
                    statusTarget?.is_active
                        ? 'Interns will not be able to select programs under this college during registration.'
                        : 'This college and its programs will become available for intern registration.'
                }`}
                onConfirm={submitStatusToggle}
                confirmText={statusTarget?.is_active ? 'Deactivate' : 'Activate'}
            />

            {/* Archive Confirmation Dialog */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive College"
                description={`Archive "${archiveTarget?.name}"? It will be moved to the archives and can be restored later.`}
                onConfirm={submitArchive}
                confirmText="Archive"
            />
        </>
    );
}

CollegesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Colleges', href: '/admin/colleges' },
    ],
};
