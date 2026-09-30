import { Head, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    GraduationCap,
    LayoutGrid,
    MapPin,
    Search,
    SlidersHorizontal,
    Sparkles,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { InternActions } from '@/components/intern-actions';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

interface Intern {
    user_id: number;
    name: string;
    email: string;
    id_number: string;
    hte_name: string;
    program_name: string;
    college_code?: string | null;
    campus?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    registered_at: string;
}

interface Filters {
    search: string;
    college_id?: number | null;
    campus_id?: number | null;
    program_id?: number | null;
    hte_id?: number | null;
    per_page: number;
}

interface CollegeOption {
    id: number;
    name: string;
    code: string;
}

interface CampusOption {
    id: number;
    name: string;
    code: string;
}

interface HteOption {
    hte_id: number;
    hte_name: string;
    college_id?: number | null;
}

interface ProgramOption {
    program_id: number;
    program_name: string;
    college_id?: number | null;
}

interface InternsIndexProps {
    interns: Paginated<Intern>;
    currentStatus: string;
    filters: Filters;
    colleges?: CollegeOption[];
    campuses?: CampusOption[];
    htes?: HteOption[];
    programs?: ProgramOption[];
}

type ViewMode = 'table' | 'grid';

const TABS: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
];

export default function InternsIndex({
    interns,
    currentStatus = 'all',
    filters,
    colleges = [],
    campuses = [],
    htes = [],
    programs = [],
}: InternsIndexProps) {
    const { auth } = usePage<any>().props;
    const isSuperAdmin =
        auth?.user?.is_super_admin ??
        (auth?.user?.role === 'super_admin' ||
            (auth?.user?.role === 'admin' && !auth?.user?.college_id));

    const getInitials = useInitials();
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const [popoverOpen, setPopoverOpen] = useState(false);

    const [collegeId, setCollegeId] = useState<string>(
        filters.college_id ? String(filters.college_id) : 'all',
    );
    const [campusId, setCampusId] = useState<string>(
        filters.campus_id ? String(filters.campus_id) : 'all',
    );
    const [programId, setProgramId] = useState<string>(
        filters.program_id ? String(filters.program_id) : 'all',
    );
    const [hteId, setHteId] = useState<string>(
        filters.hte_id ? String(filters.hte_id) : 'all',
    );

    const [draftCollegeId, setDraftCollegeId] = useState<string>(
        filters.college_id ? String(filters.college_id) : 'all',
    );
    const [draftCampusId, setDraftCampusId] = useState<string>(
        filters.campus_id ? String(filters.campus_id) : 'all',
    );
    const [draftProgramId, setDraftProgramId] = useState<string>(
        filters.program_id ? String(filters.program_id) : 'all',
    );
    const [draftHteId, setDraftHteId] = useState<string>(
        filters.hte_id ? String(filters.hte_id) : 'all',
    );

    const [undoOpen, setUndoOpen] = useState(false);
    const [undoTarget, setUndoTarget] = useState<Intern | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Intern | null>(null);

    // Keep filter states in sync if props change
    useEffect(() => {
        const nextCollege = filters.college_id ? String(filters.college_id) : 'all';
        const nextCampus = filters.campus_id ? String(filters.campus_id) : 'all';
        const nextProgram = filters.program_id ? String(filters.program_id) : 'all';
        const nextHte = filters.hte_id ? String(filters.hte_id) : 'all';

        setCollegeId(nextCollege);
        setCampusId(nextCampus);
        setProgramId(nextProgram);
        setHteId(nextHte);
        setDraftCollegeId(nextCollege);
        setDraftCampusId(nextCampus);
        setDraftProgramId(nextProgram);
        setDraftHteId(nextHte);
    }, [filters.college_id, filters.campus_id, filters.program_id, filters.hte_id]);

    // Sync draft states from active states whenever popover opens
    useEffect(() => {
        if (popoverOpen) {
            setDraftCollegeId(collegeId);
            setDraftCampusId(campusId);
            setDraftProgramId(programId);
            setDraftHteId(hteId);
        }
    }, [popoverOpen, collegeId, campusId, programId, hteId]);

    const highlightId =
        typeof window !== 'undefined'
            ? Number(
                  new URLSearchParams(window.location.search).get('highlight'),
              ) || null
            : null;

    useEffect(() => {
        if (!highlightId) {
            return;
        }

        const el =
            document.getElementById(`intern-row-${highlightId}`) ||
            document.getElementById(`intern-card-${highlightId}`);

        if (!el) {
            return;
        }

        const timer = setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);

        return () => clearTimeout(timer);
    }, [highlightId, interns.data]);

    const baseParams = () => ({
        status: currentStatus !== 'all' ? currentStatus : undefined,
        search: search || undefined,
        college_id: collegeId !== 'all' ? collegeId : undefined,
        campus_id: campusId !== 'all' ? campusId : undefined,
        program_id: programId !== 'all' ? programId : undefined,
        hte_id: hteId !== 'all' ? hteId : undefined,
        per_page: String(filters.per_page),
    });

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/admin/interns', params, {
            preserveState: true,
            preserveScroll: true,
            replace,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const switchTab = (status: string) => {
        visit({
            ...baseParams(),
            status: status !== 'all' ? status : undefined,
            page: undefined,
        });
    };

    const handleDraftCollegeChange = (value: string) => {
        setDraftCollegeId(value);
        if (value !== 'all' && draftProgramId !== 'all') {
            const prog = programs.find((p) => String(p.program_id) === draftProgramId);
            if (prog?.college_id && String(prog.college_id) !== value) {
                setDraftProgramId('all');
            }
        }
        if (value !== 'all' && draftHteId !== 'all') {
            const hte = htes.find((h) => String(h.hte_id) === draftHteId);
            if (hte?.college_id && String(hte.college_id) !== value) {
                setDraftHteId('all');
            }
        }
    };

    const handleDraftCampusChange = (value: string) => {
        setDraftCampusId(value);
    };

    const handleDraftProgramChange = (value: string) => {
        setDraftProgramId(value);
    };

    const handleDraftHteChange = (value: string) => {
        setDraftHteId(value);
    };

    const handleApplyFilters = () => {
        setCollegeId(draftCollegeId);
        setCampusId(draftCampusId);
        setProgramId(draftProgramId);
        setHteId(draftHteId);
        setPopoverOpen(false);
        visit({
            status: currentStatus !== 'all' ? currentStatus : undefined,
            search: search || undefined,
            per_page: String(filters.per_page),
            college_id: draftCollegeId !== 'all' ? draftCollegeId : undefined,
            campus_id: draftCampusId !== 'all' ? draftCampusId : undefined,
            program_id: draftProgramId !== 'all' ? draftProgramId : undefined,
            hte_id: draftHteId !== 'all' ? draftHteId : undefined,
            page: undefined,
        });
    };

    const handleResetFilters = () => {
        setDraftCollegeId('all');
        setDraftCampusId('all');
        setDraftProgramId('all');
        setDraftHteId('all');
        setCollegeId('all');
        setCampusId('all');
        setProgramId('all');
        setHteId('all');
        setPopoverOpen(false);
        visit({
            status: currentStatus !== 'all' ? currentStatus : undefined,
            search: search || undefined,
            per_page: String(filters.per_page),
            college_id: undefined,
            campus_id: undefined,
            program_id: undefined,
            hte_id: undefined,
            page: undefined,
        });
    };

    const removeSingleFilter = (key: 'college' | 'campus' | 'program' | 'hte') => {
        const nextCollege = key === 'college' ? 'all' : collegeId;
        const nextCampus = key === 'campus' ? 'all' : campusId;
        const nextProgram = key === 'program' ? 'all' : programId;
        const nextHte = key === 'hte' ? 'all' : hteId;

        if (key === 'college') {
            setCollegeId('all');
            setDraftCollegeId('all');
        }
        if (key === 'campus') {
            setCampusId('all');
            setDraftCampusId('all');
        }
        if (key === 'program') {
            setProgramId('all');
            setDraftProgramId('all');
        }
        if (key === 'hte') {
            setHteId('all');
            setDraftHteId('all');
        }

        visit({
            status: currentStatus !== 'all' ? currentStatus : undefined,
            search: search || undefined,
            per_page: String(filters.per_page),
            college_id: nextCollege !== 'all' ? nextCollege : undefined,
            campus_id: nextCampus !== 'all' ? nextCampus : undefined,
            program_id: nextProgram !== 'all' ? nextProgram : undefined,
            hte_id: nextHte !== 'all' ? nextHte : undefined,
            page: undefined,
        });
    };

    const activeFiltersList = useMemo(() => {
        const list: { key: string; label: string; value: string; onRemove: () => void }[] = [];

        if (collegeId && collegeId !== 'all') {
            const col = colleges.find((c) => String(c.id) === collegeId);
            list.push({
                key: 'college',
                label: 'College',
                value: col?.code || col?.name || collegeId,
                onRemove: () => removeSingleFilter('college'),
            });
        }

        if (campusId && campusId !== 'all') {
            const camp = campuses.find((c) => String(c.id) === campusId);
            list.push({
                key: 'campus',
                label: 'Campus',
                value: camp?.name || campusId,
                onRemove: () => removeSingleFilter('campus'),
            });
        }

        if (programId && programId !== 'all') {
            const prog = programs.find((p) => String(p.program_id) === programId);
            list.push({
                key: 'program',
                label: 'Program',
                value: prog?.program_name || programId,
                onRemove: () => removeSingleFilter('program'),
            });
        }

        if (hteId && hteId !== 'all') {
            const hte = htes.find((h) => String(h.hte_id) === hteId);
            list.push({
                key: 'hte',
                label: 'HTE',
                value: hte?.hte_name || hteId,
                onRemove: () => removeSingleFilter('hte'),
            });
        }

        return list;
    }, [collegeId, campusId, programId, hteId, colleges, campuses, programs, htes]);

    const activeFilterCount = activeFiltersList.length;

    const hasActiveFilters = Boolean(
        search ||
        (collegeId && collegeId !== 'all') ||
        (campusId && campusId !== 'all') ||
        (programId && programId !== 'all') ||
        (hteId && hteId !== 'all') ||
        (currentStatus && currentStatus !== 'all'),
    );

    const canReset =
        draftCollegeId !== 'all' ||
        draftCampusId !== 'all' ||
        draftProgramId !== 'all' ||
        draftHteId !== 'all' ||
        collegeId !== 'all' ||
        campusId !== 'all' ||
        programId !== 'all' ||
        hteId !== 'all';

    const clearAllFilters = () => {
        setSearch('');
        setCollegeId('all');
        setCampusId('all');
        setProgramId('all');
        setHteId('all');
        setDraftCollegeId('all');
        setDraftCampusId('all');
        setDraftProgramId('all');
        setDraftHteId('all');
        visit({
            status: undefined, // defaults to 'all'
            per_page: String(filters.per_page),
            page: undefined,
        });
    };

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
        visit({ ...baseParams(), search: undefined, page: undefined });
    };

    const goToPage = (page: number) =>
        visit({ ...baseParams(), page: String(page) }, false);
    const changePerPage = (perPage: number) =>
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });

    const approve = (intern: Intern) => {
        router.post(
            `/admin/interns/${intern.user_id}/approve`,
            {},
            { preserveScroll: true },
        );
    };

    const reject = (intern: Intern) => {
        router.post(
            `/admin/interns/${intern.user_id}/reject`,
            {},
            { preserveScroll: true },
        );
    };

    const openUndoDialog = (intern: Intern) => {
        setUndoTarget(intern);
        setUndoOpen(true);
    };

    const submitUndo = () => {
        if (!undoTarget) {
            return;
        }

        router.post(
            `/admin/interns/${undoTarget.user_id}/undo`,
            {},
            { preserveScroll: true },
        );
        setUndoOpen(false);
        setUndoTarget(null);
    };

    const openDeleteDialog = (intern: Intern) => {
        setDeleteTarget(intern);
        setDeleteOpen(true);
    };

    const submitDelete = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/admin/interns/${deleteTarget.user_id}`, {
            preserveScroll: true,
        });
        setDeleteOpen(false);
        setDeleteTarget(null);
    };

    // Filter available programs based on selected college in draft
    const filteredPrograms = useMemo(() => {
        if (draftCollegeId === 'all') {
            return programs;
        }

        return programs.filter(
            (p) => !p.college_id || String(p.college_id) === draftCollegeId,
        );
    }, [programs, draftCollegeId]);

    // Filter available HTEs based on selected college in draft
    const filteredHtes = useMemo(() => {
        if (draftCollegeId === 'all') {
            return htes;
        }

        return htes.filter(
            (h) => !h.college_id || String(h.college_id) === draftCollegeId,
        );
    }, [htes, draftCollegeId]);

    return (
        <>
            <Head title="Interns" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex shrink-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <GraduationCap className="size-5" />
                        </span>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
                                Interns
                            </h1>
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setPopoverOpen(true)}
                                    className="group inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/15"
                                    title="Click to view and edit active filters"
                                >
                                    <span className="size-1.5 rounded-full bg-primary" />
                                    <span>
                                        {activeFilterCount} filter
                                        {activeFilterCount > 1 ? 's' : ''} applied
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
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
                                placeholder="Search interns…"
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

                        {/* Status Switch Tabs */}
                        <div className="scrollbar-none max-w-[calc(100%-3rem)] overflow-x-auto sm:max-w-none">
                            <Tabs
                                value={currentStatus}
                                onValueChange={switchTab}
                            >
                                <TabsList className="h-9">
                                    {TABS.map((tab) => (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className="px-2.5 text-xs sm:px-3 sm:text-sm font-medium"
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Consolidated Filters Popover with Tooltip Preview */}
                        <TooltipProvider delayDuration={200}>
                            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                <Tooltip open={popoverOpen ? false : undefined}>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={
                                                    activeFilterCount > 0
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                className={cn(
                                                    'h-9 gap-1.5 transition-colors',
                                                    activeFilterCount > 0 &&
                                                        'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium dark:bg-primary/20',
                                                )}
                                            >
                                                <SlidersHorizontal className="size-3.5" />
                                                <span>Filters</span>
                                                {activeFilterCount > 0 && (
                                                    <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-xs">
                                                        {activeFilterCount}
                                                    </span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        align="end"
                                        className={cn(
                                            activeFilterCount > 0 ? 'w-56 p-2.5' : 'px-3 py-1.5',
                                        )}
                                    >
                                        {activeFilterCount > 0 ? (
                                            <div>
                                                <div className="mb-1.5 flex items-center justify-between border-b border-primary-foreground/20 pb-1 font-semibold">
                                                    <span>Active Filters</span>
                                                    <span className="text-[10px] opacity-80">
                                                        {activeFilterCount} applied
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {activeFiltersList.map((f) => (
                                                        <div
                                                            key={f.key}
                                                            className="flex items-center justify-between gap-2 text-xs"
                                                        >
                                                            <span className="opacity-80">
                                                                {f.label}:
                                                            </span>
                                                            <span className="max-w-[130px] truncate font-medium">
                                                                {f.value}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-2 border-t border-primary-foreground/20 pt-1 text-center text-[10px] opacity-80">
                                                    Click to modify or reset
                                                </div>
                                            </div>
                                        ) : (
                                            <span>Filter by college, campus, program, or HTE</span>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                                <PopoverContent
                                    className="w-80 p-4"
                                    align="end"
                                >
                                    <div className="mb-3 flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">
                                                Filter Interns
                                            </span>
                                            {activeFilterCount > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="h-5 px-1.5 text-[10px] font-medium"
                                                >
                                                    {activeFilterCount} active
                                                </Badge>
                                            )}
                                        </div>
                                        {canReset && (
                                            <button
                                                type="button"
                                                onClick={handleResetFilters}
                                                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3.5">
                                        {/* College Filter (Super Admin) */}
                                        {isSuperAdmin && colleges.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <Building2 className="size-3.5" />
                                                        College
                                                    </span>
                                                    {draftCollegeId !== 'all' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                                                            <span className="size-1.5 rounded-full bg-primary" />
                                                            Active
                                                        </span>
                                                    )}
                                                </Label>
                                                <Select
                                                    value={draftCollegeId}
                                                    onValueChange={handleDraftCollegeChange}
                                                >
                                                    <SelectTrigger className="h-9 w-full text-xs">
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
                                                                {c.code || c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Campus Filter (Super Admin) */}
                                        {isSuperAdmin && campuses.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin className="size-3.5" />
                                                        Campus
                                                    </span>
                                                    {draftCampusId !== 'all' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                                                            <span className="size-1.5 rounded-full bg-primary" />
                                                            Active
                                                        </span>
                                                    )}
                                                </Label>
                                                <Select
                                                    value={draftCampusId}
                                                    onValueChange={handleDraftCampusChange}
                                                >
                                                    <SelectTrigger className="h-9 w-full text-xs">
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
                                            </div>
                                        )}

                                        {/* Program Filter */}
                                        {filteredPrograms.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <BookOpen className="size-3.5" />
                                                        Program
                                                    </span>
                                                    {draftProgramId !== 'all' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                                                            <span className="size-1.5 rounded-full bg-primary" />
                                                            Active
                                                        </span>
                                                    )}
                                                </Label>
                                                <Select
                                                    value={draftProgramId}
                                                    onValueChange={handleDraftProgramChange}
                                                >
                                                    <SelectTrigger className="h-9 w-full text-xs">
                                                        <SelectValue placeholder="All Programs" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            All Programs
                                                        </SelectItem>
                                                        {filteredPrograms.map((prog) => (
                                                            <SelectItem
                                                                key={prog.program_id}
                                                                value={String(
                                                                    prog.program_id,
                                                                )}
                                                            >
                                                                {prog.program_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* HTE Filter */}
                                        {filteredHtes.length > 0 && (
                                            <div className="space-y-1.5">
                                                <Label className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1.5">
                                                        <Building2 className="size-3.5" />
                                                        HTE
                                                    </span>
                                                    {draftHteId !== 'all' && (
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
                                                            <span className="size-1.5 rounded-full bg-primary" />
                                                            Active
                                                        </span>
                                                    )}
                                                </Label>
                                                <Select
                                                    value={draftHteId}
                                                    onValueChange={handleDraftHteChange}
                                                >
                                                    <SelectTrigger className="h-9 w-full text-xs">
                                                        <SelectValue placeholder="All HTEs" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">
                                                            All HTEs
                                                        </SelectItem>
                                                        {filteredHtes.map((h) => (
                                                            <SelectItem
                                                                key={h.hte_id}
                                                                value={String(h.hte_id)}
                                                            >
                                                                {h.hte_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Popover Footer Actions */}
                                    <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleResetFilters}
                                            disabled={!canReset}
                                            className="h-8 flex-1 text-xs"
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleApplyFilters}
                                            className="h-8 flex-1 text-xs"
                                        >
                                            Apply Filters
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </TooltipProvider>

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
                                <TabsList className="h-9">
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
                </div>

                {/* Mobile Search Input */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="relative sm:hidden"
                    >
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, email, ID..."
                            className="h-10 w-full rounded-md border bg-background pr-9 pl-9 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    clearSearch();
                                    setMobileSearchOpen(false);
                                }}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </form>
                )}

                {/* Content */}
                {interns.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            <p>
                                No {currentStatus === 'all' ? '' : `${currentStatus} `}interns
                                {hasActiveFilters
                                    ? ' match your selected filters or search query.'
                                    : ' found.'}
                            </p>
                            {hasActiveFilters && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearAllFilters}
                                        className="h-8 gap-1.5 text-xs"
                                    >
                                        <X className="size-3.5" />
                                        Clear all filters
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">
                                                        Name
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        ID Number
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Program
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        HTE
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Campus
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Status
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Registered
                                                    </TableHead>
                                                    <TableHead className="px-6 text-center">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {interns.data.map((intern) => {
                                                    const isHighlighted =
                                                        highlightId ===
                                                        intern.user_id;

                                                    return (
                                                        <TableRow
                                                            key={intern.user_id}
                                                            id={`intern-row-${intern.user_id}`}
                                                            className={cn(
                                                                'transition-all duration-300',
                                                                isHighlighted &&
                                                                    'bg-primary/10 ring-2 ring-primary/40 dark:bg-primary/20',
                                                            )}
                                                        >
                                                            <TableCell className="px-6">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium whitespace-nowrap">
                                                                        {
                                                                            intern.name
                                                                        }
                                                                    </p>
                                                                    {isHighlighted && (
                                                                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                            <Sparkles className="size-3" />
                                                                            Focus
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p
                                                                    className="max-w-[180px] truncate text-xs text-muted-foreground"
                                                                    title={
                                                                        intern.email
                                                                    }
                                                                >
                                                                    {
                                                                        intern.email
                                                                    }
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center whitespace-nowrap">
                                                                {
                                                                    intern.id_number
                                                                }
                                                            </TableCell>
                                                            <TableCell
                                                                className="max-w-[160px] truncate px-6 text-center"
                                                                title={
                                                                    intern.program_name
                                                                }
                                                            >
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-medium">{intern.program_name}</span>
                                                                    {intern.college_code && (
                                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                                            {intern.college_code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell
                                                                className="max-w-[160px] truncate px-6 text-center"
                                                                title={
                                                                    intern.hte_name
                                                                }
                                                            >
                                                                {
                                                                    intern.hte_name
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center whitespace-nowrap text-xs text-muted-foreground">
                                                                {intern.campus || '—'}
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <StatusBadge
                                                                    status={
                                                                        intern.status
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center whitespace-nowrap text-muted-foreground">
                                                                {
                                                                    intern.registered_at
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-6 text-center">
                                                                <InternActions
                                                                    intern={
                                                                        intern
                                                                    }
                                                                    onApprove={
                                                                        approve
                                                                    }
                                                                    onReject={
                                                                        reject
                                                                    }
                                                                    onUndo={
                                                                        openUndoDialog
                                                                    }
                                                                    onDelete={
                                                                        openDeleteDialog
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
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
                                {interns.data.map((intern) => {
                                    const isHighlighted =
                                        highlightId === intern.user_id;

                                    return (
                                        <Card
                                            key={intern.user_id}
                                            id={`intern-card-${intern.user_id}`}
                                            className={cn(
                                                'flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border hover:shadow-md',
                                                isHighlighted &&
                                                    'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10',
                                            )}
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <Avatar className="size-10 shrink-0">
                                                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                                {getInitials(
                                                                    intern.name,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <CardTitle
                                                                    className="line-clamp-1 text-base leading-tight font-semibold"
                                                                    title={
                                                                        intern.name
                                                                    }
                                                                >
                                                                    {
                                                                        intern.name
                                                                    }
                                                                </CardTitle>
                                                                {isHighlighted && (
                                                                    <Badge className="shrink-0 animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                        <Sparkles className="size-2.5" />
                                                                        Focus
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span
                                                                className="block truncate text-xs text-muted-foreground"
                                                                title={
                                                                    intern.email
                                                                }
                                                            >
                                                                {intern.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <StatusBadge
                                                        status={intern.status}
                                                    />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-1 space-y-2.5 pb-3 text-sm">
                                                <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                                            ID Number:
                                                        </span>
                                                        <span className="font-mono font-medium text-foreground">
                                                            {intern.id_number}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                                            <BookOpen className="size-3.5 text-muted-foreground" />
                                                            Program:
                                                        </span>
                                                        <span
                                                            className="truncate text-right font-medium text-foreground"
                                                            title={
                                                                intern.program_name
                                                            }
                                                        >
                                                            {intern.program_name}
                                                            {intern.college_code && (
                                                                <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                                                                    ({intern.college_code})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                                                        <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                                            <Building2 className="size-3.5 text-muted-foreground" />
                                                            HTE:
                                                        </span>
                                                        <span
                                                            className="truncate text-right font-medium text-foreground"
                                                            title={
                                                                intern.hte_name
                                                            }
                                                        >
                                                            {intern.hte_name}
                                                        </span>
                                                    </div>

                                                    {intern.campus && (
                                                        <div className="flex items-center justify-between gap-2 border-t pt-1.5">
                                                            <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                                                                <MapPin className="size-3.5 text-muted-foreground" />
                                                                Campus:
                                                            </span>
                                                            <span className="truncate text-right font-medium text-foreground">
                                                                {intern.campus}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                            <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                                <span>
                                                    Registered{' '}
                                                    {intern.registered_at}
                                                </span>
                                                <InternActions
                                                    intern={intern}
                                                    onApprove={approve}
                                                    onReject={reject}
                                                    onUndo={openUndoDialog}
                                                    onDelete={openDeleteDialog}
                                                />
                                            </div>
                                        </Card>
                                    );
                                })}
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
