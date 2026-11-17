import { Head, router } from '@inertiajs/react';
import {
    Camera,
    HardDrive,
    Info,
    LayoutGrid,
    Search,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { ResolutionTicketsNav } from '@/components/resolution-tickets-nav';
import {
    ScanPhotoDialog
    
} from '@/components/scan-photo-dialog';
import type {ScanPhotoDialogData} from '@/components/scan-photo-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/use-debounce';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';

export type ScanSnapshotRow = {
    id: number;
    intern_user_id: number;
    intern_name: string;
    intern_id_number?: string | null;
    intern_profile_photo_url?: string | null;
    label: 'time_in' | 'time_out';
    captured_photo_url: string;
    captured_photo_path: string;
    kiosk_name: string;
    storage_disk: string;
    storage_location: string;
    date: string;
    scanned_at: string;
    scanned_at_full: string;
};

type ViewMode = 'grid' | 'table';
type LabelFilter = 'all' | 'time_in' | 'time_out';

interface Filters {
    search: string;
    date: string | null;
    label: LabelFilter;
    per_page: number;
}

interface ScanSnapshotsProps {
    snapshots: Paginated<ScanSnapshotRow>;
    totalSnapshots: number;
    totalPending?: number;
    totalResolved?: number;
    filters?: Filters;
}

const buildParams = (
    search: string,
    date: string | null,
    label: LabelFilter,
    perPage: number,
): Record<string, string | undefined> => ({
    search: search || undefined,
    date: date || undefined,
    label: label && label !== 'all' ? label : undefined,
    per_page: String(perPage),
});

export default function ScanSnapshots({
    snapshots,
    totalSnapshots = snapshots.total,
    totalPending = 0,
    totalResolved = 0,
    filters = { search: '', date: null, label: 'all', per_page: 20 },
}: ScanSnapshotsProps) {
    const getInitials = useInitials();
    const [search, setSearch] = useState<string>(() => filters.search || '');
    const [date, setDate] = useState<string>(() => filters.date || '');
    const [view, setView] = useState<ViewMode>('table');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [photoModalData, setPhotoModalData] =
        useState<ScanPhotoDialogData | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const isFirstRender = useRef(true);

    const visit = (
        params: Record<string, string | undefined>,
        replace = true,
    ) => {
        router.get('/supervisor/resolution-tickets/snapshots', params, {
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
                ...buildParams(
                    debouncedSearch,
                    date || null,
                    filters.label,
                    filters.per_page,
                ),
                page: undefined,
            });
        }
    }, [debouncedSearch, date, filters.label, filters.per_page, filters.search]);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        visit({
            ...buildParams(
                search,
                date || null,
                filters.label,
                filters.per_page,
            ),
            page: undefined,
        });
    };

    const clearSearch = () => {
        setSearch('');
        visit({
            ...buildParams(
                '',
                date || null,
                filters.label,
                filters.per_page,
            ),
            page: undefined,
        });
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        visit({
            ...buildParams(
                search,
                newDate || null,
                filters.label,
                filters.per_page,
            ),
            page: undefined,
        });
    };

    const clearDate = () => {
        setDate('');
        visit({
            ...buildParams(
                search,
                null,
                filters.label,
                filters.per_page,
            ),
            page: undefined,
        });
    };

    const changeLabel = (value: LabelFilter) => {
        visit({
            ...buildParams(
                search,
                date || null,
                value,
                filters.per_page,
            ),
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit(
            {
                ...buildParams(
                    search,
                    date || null,
                    filters.label,
                    filters.per_page,
                ),
                page: String(page),
            },
            false,
        );
    };

    const changePerPage = (perPage: number) => {
        visit({
            ...buildParams(
                search,
                date || null,
                filters.label,
                perPage,
            ),
            page: undefined,
        });
    };

    const hasActiveFilters = Boolean(
        filters.search ||
            filters.date ||
            (filters.label && filters.label !== 'all'),
    );

    const clearAllFilters = () => {
        setSearch('');
        setDate('');
        visit({ per_page: String(filters.per_page) });
    };

    return (
        <>
            <Head title="Scan Snapshots" />

            <div className="flex h-full min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
                {/* Header banner */}
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="flex min-w-0 items-center gap-3 text-xl font-semibold tracking-tight text-black sm:text-2xl dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Camera className="size-5" />
                            </span>
                            <span className="min-w-0">Scan Snapshots Storage</span>
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Browse and verify all photo snapshots captured during Time In and Time Out scanning.
                        </p>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        <Badge
                            variant="secondary"
                            className="shrink-0 px-3 py-1 text-xs font-semibold"
                        >
                            {totalSnapshots} Snapshots Stored
                        </Badge>

                        <form
                            onSubmit={applySearch}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search intern name or ID…"
                                className="h-9 w-60 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
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

                        <div className="relative flex items-center">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="h-9 w-[9.5rem] rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {date && (
                                <button
                                    type="button"
                                    onClick={clearDate}
                                    className="ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                                    title="Clear date"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        <Select
                            value={filters.label || 'all'}
                            onValueChange={(v) => changeLabel(v as LabelFilter)}
                        >
                            <SelectTrigger className="h-9 w-36 sm:w-40">
                                <SelectValue placeholder="All Scans" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Scans</SelectItem>
                                <SelectItem value="time_in">Time In Only</SelectItem>
                                <SelectItem value="time_out">Time Out Only</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger value="table" title="Table View">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid" title="Gallery Grid View">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <ResolutionTicketsNav
                    currentTab="snapshots"
                    totalPending={totalPending}
                    totalResolved={totalResolved}
                    totalSnapshots={totalSnapshots}
                />

                {/* Storage Architecture Info Banner */}
                <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2 sm:items-center">
                        <HardDrive className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" />
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            <strong className="text-foreground">Snapshot Storage Location: </strong>
                            <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground sm:break-normal">
                                storage/app/public/attendance-snapshots/
                            </code>
                            {' '}(Linked to attendance logs via <code className="font-mono text-[11px]">captured_photo_path</code>)
                        </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] sm:items-center">
                        <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground sm:mt-0" />
                        <span className="min-w-0">Captured automatically by kiosk camera upon QR scan</span>
                    </div>
                </div>

                {/* Mobile Inline Search */}
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
                                placeholder="Search snapshots…"
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

                {/* Active Filters Pill List */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">
                            Active:
                        </span>
                        {filters.search && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Search: {filters.search}
                            </Badge>
                        )}
                        {filters.date && (
                            <Badge variant="secondary" className="text-xs font-normal">
                                Date: {filters.date}
                            </Badge>
                        )}
                        {filters.label && filters.label !== 'all' && (
                            <Badge variant="secondary" className="text-xs font-normal capitalize">
                                Scan: {filters.label === 'time_in' ? 'Time In' : 'Time Out'}
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear all
                        </Button>
                    </div>
                )}

                {/* Content */}
                {snapshots.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-sm text-muted-foreground">
                            <Camera className="mx-auto mb-3 size-10 opacity-30" />
                            <p className="font-medium text-foreground">No scan snapshots found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try adjusting your search criteria or date filter.'
                                    : 'Snapshots captured by the kiosk webcam during intern attendance scans will be stored and listed here.'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Gallery Grid View */}
                        {view === 'grid' && (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                    {snapshots.data.map((snap) => {
                                        const isTimeIn = snap.label === 'time_in';

                                        return (
                                            <Card
                                                key={snap.id}
                                                className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border hover:shadow-md"
                                            >
                                                {/* Snapshot Photo Preview Container */}
                                                <div
                                                    onClick={() =>
                                                        setPhotoModalData({
                                                            internName: snap.intern_name,
                                                            idNumber: snap.intern_id_number,
                                                            label: snap.label,
                                                            scannedAt: snap.scanned_at_full,
                                                            capturedPhotoUrl: snap.captured_photo_url,
                                                            profilePhotoUrl: snap.intern_profile_photo_url,
                                                        })
                                                    }
                                                    className="relative aspect-4/3 w-full cursor-pointer overflow-hidden bg-black/5 dark:bg-black/30"
                                                >
                                                    <img
                                                        src={snap.captured_photo_url}
                                                        alt={`Snapshot of ${snap.intern_name}`}
                                                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    />

                                                    {/* Badge Overlay */}
                                                    <div className="absolute top-2.5 left-2.5">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md shadow-xs ${
                                                                isTimeIn
                                                                    ? 'border border-emerald-500/40 bg-emerald-500/90 text-white'
                                                                    : 'border border-sky-500/40 bg-sky-500/90 text-white'
                                                            }`}
                                                        >
                                                            {isTimeIn ? 'Time In' : 'Time Out'}
                                                        </span>
                                                    </div>

                                                    {/* Hover Overlay with Camera Icon */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-xs">
                                                            <Camera className="size-3.5" />
                                                            <span>Inspect Photo</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Content & Metadata */}
                                                <CardContent className="space-y-2 p-3.5 text-xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="size-7 shrink-0">
                                                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                                                {getInitials(snap.intern_name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-semibold text-foreground">
                                                                {snap.intern_name}
                                                            </p>
                                                            {snap.intern_id_number && (
                                                                <p className="text-[11px] text-muted-foreground font-mono">
                                                                    ID: {snap.intern_id_number}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1 rounded-md bg-muted/40 p-2 text-[11px]">
                                                        <div className="flex min-w-0 items-center justify-between gap-2 text-muted-foreground">
                                                            <span>Scan Time:</span>
                                                            <span className="min-w-0 truncate text-right font-medium text-foreground" title={snap.scanned_at_full}>{snap.scanned_at_full}</span>
                                                        </div>
                                                        <div className="flex min-w-0 items-center justify-between gap-2 text-muted-foreground">
                                                            <span>Scanner:</span>
                                                            <span className="min-w-0 truncate text-right font-medium text-foreground" title={snap.kiosk_name}>{snap.kiosk_name}</span>
                                                        </div>
                                                        <div className="truncate border-t border-border/40 pt-1 text-[10px] text-muted-foreground font-mono" title={snap.captured_photo_path}>
                                                            {snap.captured_photo_path}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <NumberedPagination
                                    meta={snapshots}
                                    itemLabel="snapshot"
                                    onPageChange={goToPage}
                                    onPerPageChange={changePerPage}
                                    idPrefix="scan-snapshots-grid-per-page"
                                />
                            </div>
                        )}

                        {/* Table View */}
                        {view === 'table' && (
                            <div className="min-w-0">
                                <Card className="overflow-hidden p-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="px-6 font-semibold">Snapshot</TableHead>
                                                    <TableHead className="px-6 font-semibold">Intern</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Scan Type</TableHead>
                                                    <TableHead className="px-6 font-semibold">Timestamp</TableHead>
                                                    <TableHead className="px-6 font-semibold">Scanner Device</TableHead>
                                                    <TableHead className="px-6 font-semibold">Storage Path</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {snapshots.data.map((snap) => (
                                                    <TableRow key={snap.id} className="transition-colors hover:bg-muted/40">
                                                        <TableCell className="px-6">
                                                            <div
                                                                onClick={() =>
                                                                    setPhotoModalData({
                                                                        internName: snap.intern_name,
                                                                        idNumber: snap.intern_id_number,
                                                                        label: snap.label,
                                                                        scannedAt: snap.scanned_at_full,
                                                                        capturedPhotoUrl: snap.captured_photo_url,
                                                                        profilePhotoUrl: snap.intern_profile_photo_url,
                                                                    })
                                                                }
                                                                className="group relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-muted hover:border-primary"
                                                                title="Click to inspect"
                                                            >
                                                                <img
                                                                    src={snap.captured_photo_url}
                                                                    alt="Scan snapshot"
                                                                    className="size-full object-cover transition-transform group-hover:scale-105"
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                                                    <Camera className="size-3.5 text-white" />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 font-medium whitespace-nowrap text-foreground">
                                                            <div>
                                                                <p className="font-medium text-foreground">{snap.intern_name}</p>
                                                                {snap.intern_id_number && (
                                                                    <p className="text-xs text-muted-foreground font-mono">{snap.intern_id_number}</p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                                    snap.label === 'time_in'
                                                                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                        : 'border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                                                }`}
                                                            >
                                                                {snap.label === 'time_in' ? 'Time In' : 'Time Out'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="px-6 whitespace-nowrap text-xs text-muted-foreground">
                                                            <div>{snap.scanned_at_full}</div>
                                                            <div className="text-[11px] text-muted-foreground/80">{snap.scanned_at}</div>
                                                        </TableCell>
                                                        <TableCell className="px-6 whitespace-nowrap text-xs text-foreground">
                                                            {snap.kiosk_name}
                                                        </TableCell>
                                                        <TableCell className="px-6 max-w-xs truncate text-xs text-muted-foreground font-mono" title={snap.captured_photo_path}>
                                                            {snap.captured_photo_path}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            setPhotoModalData({
                                                                                internName: snap.intern_name,
                                                                                idNumber: snap.intern_id_number,
                                                                                label: snap.label,
                                                                                scannedAt: snap.scanned_at_full,
                                                                                capturedPhotoUrl: snap.captured_photo_url,
                                                                                profilePhotoUrl: snap.intern_profile_photo_url,
                                                                            })
                                                                        }
                                                                        aria-label="View scan snapshot"
                                                                    >
                                                                        <Camera className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    View snapshot
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        <NumberedPagination
                                            meta={snapshots}
                                            itemLabel="snapshot"
                                            onPageChange={goToPage}
                                            onPerPageChange={changePerPage}
                                            idPrefix="scan-snapshots-table-per-page"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Snapshot Photo Modal */}
            <ScanPhotoDialog
                open={Boolean(photoModalData)}
                onOpenChange={(open) => !open && setPhotoModalData(null)}
                data={photoModalData}
            />
        </>
    );
}

ScanSnapshots.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resolution Tickets', href: '/supervisor/resolution-tickets' },
        { title: 'Scan Snapshots', href: '/supervisor/resolution-tickets/snapshots' },
    ],
};
