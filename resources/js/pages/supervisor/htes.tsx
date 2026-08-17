import { Head, router } from '@inertiajs/react';
import { Building2, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

// Radix's Select doesn't allow an item with an empty-string value, so
// "every status" gets its own sentinel that we translate back to
// undefined (i.e. no status filter) before it hits the URL.
const ALL_STATUSES = 'all';

/** 8.5 → "8 hours 30 minutes" — same long-form duration used on the
 * My Students roster, so hours read consistently across both views. */
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
    const [search, setSearch] = useState(filters.search);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    // Which HTE rows are currently expanded to show their intern list —
    // more than one can be open at once.
    const [expandedHteIds, setExpandedHteIds] = useState<Set<number>>(
        new Set(),
    );

    // Base params shared by every navigation action — anything that
    // changes what rows match (search/status) resets back to page 1 by
    // simply omitting the page param.
    const baseParams = () => ({
        search: filters.search || undefined,
        status: filters.status ?? undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/htes', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

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
            status: value === ALL_STATUSES ? undefined : value,
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
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
                {/* ── Header toolbar ──────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Building2 className="size-5" />
                            </span>
                            Host Training Establishments
                        </h1>
                        <p className="mt-1 ml-13 text-sm text-muted-foreground">
                            {`${hteCount} HTE${hteCount === 1 ? '' : 's'} currently hosting interns from the ${scopeName ?? 'selected'} program.`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Desktop: full search input */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search HTEs…"
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

                        {/* Mobile: search icon toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? <X className="size-4" /> : <Search className="size-4" />}
                        </button>

                        {/* Status filter — full on sm+, icon-only on mobile */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.status ?? ALL_STATUSES}
                                onValueChange={changeStatus}
                            >
                                <SelectTrigger className="h-9 w-36">
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
                    </div>
                </div>

                {/* Mobile inline search bar */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            applySearch(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex items-center gap-2 sm:hidden"
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

                {/* ── Content ─────────────────────────────────────────────────── */}
                {htes.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No HTEs{filters.search || filters.status ? ' match this filter.' : ' yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8 px-4" />
                                        <TableHead className="px-6">
                                            Host Training Establishment
                                        </TableHead>
                                        <TableHead className="px-6 text-center">Address</TableHead>
                                        <TableHead className="px-6 text-center">Contact</TableHead>
                                        <TableHead className="px-6 text-center">Status</TableHead>
                                        <TableHead className="px-6 text-center">Interns</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {htes.data.map((hte) => {
                                        const isExpanded = expandedHteIds.has(hte.hte_id);

                                        return (
                                            <Fragment key={hte.hte_id}>
                                                <TableRow
                                                    onClick={() => toggleExpanded(hte.hte_id)}
                                                    className="cursor-pointer"
                                                    aria-expanded={isExpanded}
                                                >
                                                    <TableCell className="px-4 text-muted-foreground">
                                                        <ChevronDown
                                                            className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="px-6 font-medium">
                                                        {hte.hte_name}
                                                    </TableCell>
                                                    <TableCell
                                                        className="max-w-xs truncate px-6 text-center text-muted-foreground"
                                                        title={hte.address ?? undefined}
                                                    >
                                                        {hte.address ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="px-6 text-center">
                                                        <p className="truncate" title={hte.contact_person ?? undefined}>
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
                                                    <TableCell className="px-6 text-center">
                                                        {hte.interns_count}
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                        <TableCell colSpan={6} className="px-6 py-3">
                                                            {hte.interns.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">
                                                                    No interns from your program here yet.
                                                                </p>
                                                            ) : (
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Name</TableHead>
                                                                            <TableHead>Email</TableHead>
                                                                            <TableHead>ID Number</TableHead>
                                                                            <TableHead>Contact</TableHead>
                                                                            <TableHead>Hours Rendered</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {hte.interns.map((intern) => (
                                                                            <TableRow key={intern.intern_user_id}>
                                                                                <TableCell className="font-medium whitespace-nowrap">
                                                                                    {intern.name}
                                                                                </TableCell>
                                                                                <TableCell className="whitespace-nowrap">
                                                                                    {intern.email}
                                                                                </TableCell>
                                                                                <TableCell className="whitespace-nowrap">
                                                                                    {intern.id_number ?? '—'}
                                                                                </TableCell>
                                                                                <TableCell className="whitespace-nowrap">
                                                                                    {intern.contact_number ?? '—'}
                                                                                </TableCell>
                                                                                <TableCell className="whitespace-nowrap">
                                                                                    {formatLongDuration(intern.total_hours)}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
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
                )}
            </div>
        </>
    );
}

SupervisorHtes.layout = {
    breadcrumbs: [{ title: 'HTEs', href: '/supervisor/htes' }],
};
