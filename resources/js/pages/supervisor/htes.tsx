import { Head, router } from '@inertiajs/react';
import {
    Building2,
    ChevronDown,
    Clock,
    LayoutGrid,
    Mail,
    MapPin,
    Phone,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    User,
    Users,
    X,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

interface HteInternRow {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    total_hours: number;
}

interface HteRow {
    hte_id: number;
    hte_name: string;
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    status: 'active' | 'inactive';
    interns_count: number;
    interns: HteInternRow[];
}

interface PaginatedHtes {
    data: HteRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Filters {
    search: string;
    status: 'active' | 'inactive' | null;
    per_page: number;
}

interface HtesIndexProps {
    htes: PaginatedHtes;
    hteCount: number;
    scopeName?: string;
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

const ALL_STATUSES = 'all';

function formatLongDuration(hours: number): string {
    if (hours <= 0) {
        return '—';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];

    if (wholeHours > 0) {
        parts.push(`${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`);
    }

    if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 minutes';
}

export default function SupervisorHtes({
    htes,
    hteCount,
    scopeName,
    filters,
}: HtesIndexProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search || '');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);
    const [expandedHteIds, setExpandedHteIds] = useState<Set<number>>(
        new Set(),
    );

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    const baseParams = () => ({
        search: search || undefined,
        status: filters.status ?? undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>, replace = true) => {
        router.get('/supervisor/htes', params, {
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
    }, [debouncedSearch]);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({ ...baseParams(), search: search || undefined, page: undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined, page: undefined });
    };

    const changeStatus = (value: string) => {
        visit({
            ...baseParams(),
            status: value === ALL_STATUSES ? undefined : (value as 'active' | 'inactive'),
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) }, false);
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });
    };

    const toggleExpanded = (hteId: number) => {
        setExpandedHteIds((current) => {
            const next = new Set(current);

            if (next.has(hteId)) {
                next.delete(hteId);
            } else {
                next.add(hteId);
            }

            return next;
        });
    };

    return (
        <>
            <Head title="HTEs" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Building2 className="size-5" />
                            </span>
                            Host Training Establishments
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Desktop search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs…"
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

                        {/* Mobile search toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Status filter */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.status ?? ALL_STATUSES}
                                onValueChange={changeStatus}
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={filters.status ?? ALL_STATUSES}
                                onValueChange={changeStatus}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value={ALL_STATUSES}>All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View toggle — desktop only */}
                        <div className="hidden sm:block">
                            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <TabsList>
                                    <TabsTrigger value="table"><TableIcon className="size-4" /></TabsTrigger>
                                    <TabsTrigger value="grid"><LayoutGrid className="size-4" /></TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Mobile inline search */}
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
                                placeholder="Search HTEs…"
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
                        <Button type="submit" size="sm">Search</Button>
                    </form>
                )}

                {/* Content */}
                {htes.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No HTEs{filters.search || filters.status ? ' match this filter.' : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table view */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8 px-4" />
                                                    <TableHead className="px-6 font-semibold">Host Training Establishment</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Address</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Contact</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Status</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Interns</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {htes.data.map((hte) => {
                                                    const isExpanded = expandedHteIds.has(hte.hte_id);

                                                    return (
                                                        <Fragment key={hte.hte_id}>
                                                            <TableRow
                                                                onClick={() => toggleExpanded(hte.hte_id)}
                                                                className="cursor-pointer hover:bg-muted/50"
                                                                aria-expanded={isExpanded}
                                                            >
                                                                <TableCell className="px-4 text-muted-foreground">
                                                                    <ChevronDown
                                                                        className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="px-6 font-medium text-foreground">
                                                                    {hte.hte_name}
                                                                </TableCell>
                                                                <TableCell
                                                                    className="max-w-xs truncate px-6 text-center text-muted-foreground"
                                                                    title={hte.address ?? undefined}
                                                                >
                                                                    {hte.address ?? '—'}
                                                                </TableCell>
                                                                <TableCell className="px-6 text-center">
                                                                    <p className="truncate text-foreground font-medium" title={hte.contact_person ?? undefined}>
                                                                        {hte.contact_person ?? '—'}
                                                                    </p>
                                                                    {hte.contact_number && (
                                                                        <p className="truncate text-xs text-muted-foreground">
                                                                            {hte.contact_number}
                                                                        </p>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="px-6 text-center">
                                                                    <StatusBadge status={hte.status} />
                                                                </TableCell>
                                                                <TableCell className="px-6 text-center font-semibold text-foreground">
                                                                    {hte.interns_count}
                                                                </TableCell>
                                                            </TableRow>
                                                            {isExpanded && (
                                                                <TableRow className="bg-muted/15 hover:bg-muted/15">
                                                                    <TableCell colSpan={6} className="px-6 py-4">
                                                                        {hte.interns.length === 0 ? (
                                                                            <p className="text-sm text-muted-foreground">
                                                                                No interns from your program here yet.
                                                                            </p>
                                                                        ) : (
                                                                            <div className="rounded-lg border bg-card overflow-hidden">
                                                                                <Table>
                                                                                    <TableHeader>
                                                                                        <TableRow>
                                                                                            <TableHead className="px-4 font-semibold">Intern</TableHead>
                                                                                            <TableHead className="px-4 text-center font-semibold">ID Number</TableHead>
                                                                                            <TableHead className="px-4 text-center font-semibold">Contact</TableHead>
                                                                                            <TableHead className="px-4 text-right font-semibold">Hours Rendered</TableHead>
                                                                                        </TableRow>
                                                                                    </TableHeader>
                                                                                    <TableBody>
                                                                                        {hte.interns.map((intern) => (
                                                                                            <TableRow key={intern.intern_user_id}>
                                                                                                <TableCell className="px-4">
                                                                                                    <p className="font-medium text-foreground whitespace-nowrap">{intern.name}</p>
                                                                                                    <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={intern.email}>{intern.email}</p>
                                                                                                </TableCell>
                                                                                                <TableCell className="px-4 text-center whitespace-nowrap text-muted-foreground tabular-nums">
                                                                                                    {intern.id_number ?? '—'}
                                                                                                </TableCell>
                                                                                                <TableCell className="px-4 text-center whitespace-nowrap text-muted-foreground tabular-nums">
                                                                                                    {intern.contact_number ?? '—'}
                                                                                                </TableCell>
                                                                                                <TableCell className="px-4 whitespace-nowrap text-right font-medium text-foreground">
                                                                                                    {formatLongDuration(intern.total_hours)}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {htes.data.map((hte) => {
                                    const isExpanded = expandedHteIds.has(hte.hte_id);

                                    return (
                                        <Card key={hte.hte_id} className="flex flex-col justify-between">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {hte.hte_name}
                                                    </CardTitle>
                                                    <StatusBadge status={hte.status} />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                                                {hte.address && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="size-3.5 shrink-0" />
                                                        <span className="truncate">{hte.address}</span>
                                                    </div>
                                                )}
                                                {hte.contact_person && (
                                                    <div className="flex items-center gap-2">
                                                        <User className="size-3.5 shrink-0" />
                                                        <span className="truncate">{hte.contact_person}</span>
                                                    </div>
                                                )}
                                                {hte.contact_number && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="size-3.5 shrink-0" />
                                                        <span>{hte.contact_number}</span>
                                                    </div>
                                                )}
                                                <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Users className="size-3.5" /> Assigned Interns:
                                                    </span>
                                                    <Badge variant="secondary" className="font-semibold text-xs">
                                                        {hte.interns_count}
                                                    </Badge>
                                                </div>

                                                {hte.interns.length > 0 && (
                                                    <div className="mt-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full text-xs h-7 justify-between"
                                                            onClick={() => toggleExpanded(hte.hte_id)}
                                                        >
                                                            <span>{isExpanded ? 'Hide Interns' : 'View Interns'}</span>
                                                            <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </Button>
                                                        {isExpanded && (
                                                            <div className="mt-2 flex flex-col gap-1.5 rounded-md border p-2 bg-muted/20">
                                                                {hte.interns.map((intern) => (
                                                                    <div key={intern.intern_user_id} className="flex items-center justify-between text-[11px]">
                                                                        <span className="font-medium text-foreground truncate">{intern.name}</span>
                                                                        <span className="text-muted-foreground">{formatLongDuration(intern.total_hours)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {/* Mobile list view */}
                        <div className="sm:hidden flex flex-col gap-3">
                            {htes.data.map((hte) => {
                                const isExpanded = expandedHteIds.has(hte.hte_id);

                                return (
                                    <Card key={hte.hte_id}>
                                        <CardContent className="p-4 flex flex-col gap-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-sm text-foreground">{hte.hte_name}</p>
                                                <StatusBadge status={hte.status} />
                                            </div>
                                            {hte.address && (
                                                <p className="text-xs text-muted-foreground">{hte.address}</p>
                                            )}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                                                <span>{hte.contact_person ?? 'No contact person'}</span>
                                                <Badge variant="secondary" className="text-xs font-semibold">
                                                    {hte.interns_count} intern{hte.interns_count === 1 ? '' : 's'}
                                                </Badge>
                                            </div>

                                            {hte.interns.length > 0 && (
                                                <div className="pt-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-xs h-7 justify-between"
                                                        onClick={() => toggleExpanded(hte.hte_id)}
                                                    >
                                                        <span>{isExpanded ? 'Hide Interns' : 'View Interns'}</span>
                                                        <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </Button>
                                                    {isExpanded && (
                                                        <div className="mt-2 flex flex-col gap-1.5 rounded-md border p-2 bg-muted/20">
                                                            {hte.interns.map((intern) => (
                                                                <div key={intern.intern_user_id} className="flex items-center justify-between text-xs border-b last:border-0 pb-1 last:pb-0">
                                                                    <div>
                                                                        <p className="font-medium text-foreground">{intern.name}</p>
                                                                        <p className="text-[10px] text-muted-foreground font-mono">{intern.id_number ?? 'No ID'}</p>
                                                                    </div>
                                                                    <span className="font-medium text-muted-foreground">{formatLongDuration(intern.total_hours)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        <NumberedPagination
                            meta={htes}
                            itemLabel="HTE"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="htes-table-per-page"
                        />
                    </>
                )}
            </div>
        </>
    );
}

SupervisorHtes.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'HTEs', href: '/supervisor/htes' },
    ],
};
