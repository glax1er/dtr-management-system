import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Clock,
    GraduationCap,
    LayoutGrid,
    Phone,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface StudentRow {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    hte_name: string;
    total_hours: number;
}

interface HteOption {
    hte_id: number;
    hte_name: string;
}

interface Filters {
    search: string;
    hte_id: number | null;
    per_page: number;
}

interface MyStudentsProps {
    students: Paginated<StudentRow>;
    studentCount: number;
    scopeName?: string;
    hteOptions: HteOption[];
    filters: Filters;
}

type ViewMode = 'table' | 'grid';

const ALL_HTES = 'all';

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

export default function MyStudents({
    students,
    studentCount,
    scopeName,
    hteOptions,
    filters,
}: MyStudentsProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState(filters.search);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const baseParams = () => ({
        search: filters.search || undefined,
        hte_id: filters.hte_id ? String(filters.hte_id) : undefined,
        per_page: String(filters.per_page),
    });

    const visit = (params: Record<string, string | undefined>) => {
        router.get('/supervisor/interns', params, {
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

    const changeHte = (value: string) => {
        visit({
            ...baseParams(),
            hte_id: value === ALL_HTES ? undefined : value,
            page: undefined,
        });
    };

    const goToPage = (page: number) => {
        visit({ ...baseParams(), page: String(page) });
    };

    const changePerPage = (perPage: number) => {
        visit({ ...baseParams(), per_page: String(perPage), page: undefined });
    };

    return (
        <>
            <Head title="My Students" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <GraduationCap className="size-5" />
                            </span>
                            My Students
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentCount} intern{studentCount === 1 ? '' : 's'} in {scopeName ?? 'your program'}, across every HTE.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Desktop search */}
                        <form onSubmit={applySearch} className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search students…"
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

                        {/* HTE filter dropdown */}
                        <div className="hidden sm:block">
                            <Select
                                value={filters.hte_id ? String(filters.hte_id) : ALL_HTES}
                                onValueChange={changeHte}
                            >
                                <SelectTrigger className="h-9 w-44">
                                    <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="All HTEs" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_HTES}>All HTEs</SelectItem>
                                    {hteOptions.map((hte) => (
                                        <SelectItem key={hte.hte_id} value={String(hte.hte_id)}>
                                            {hte.hte_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:hidden">
                            <Select
                                value={filters.hte_id ? String(filters.hte_id) : ALL_HTES}
                                onValueChange={changeHte}
                            >
                                <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                    <SlidersHorizontal className="size-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value={ALL_HTES}>All HTEs</SelectItem>
                                    {hteOptions.map((hte) => (
                                        <SelectItem key={hte.hte_id} value={String(hte.hte_id)}>
                                            {hte.hte_name}
                                        </SelectItem>
                                    ))}
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
                        onSubmit={(e) => { applySearch(e); setMobileSearchOpen(false); }}
                        className="flex items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search students…"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { clearSearch(); setMobileSearchOpen(false); }}
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
                {students.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No students {filters.search || filters.hte_id ? 'match this filter.' : 'assigned yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table view — desktop */}
                        {view === 'table' && (
                            <div className="hidden sm:block">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="px-6 font-semibold">Student</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">ID Number</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Contact Number</TableHead>
                                                    <TableHead className="px-6 text-center font-semibold">Assigned HTE</TableHead>
                                                    <TableHead className="px-6 text-right font-semibold">Hours Rendered</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {students.data.map((student) => (
                                                    <TableRow key={student.intern_user_id}>
                                                        <TableCell className="px-6">
                                                            <p className="font-medium whitespace-nowrap text-foreground">{student.name}</p>
                                                            <p
                                                                className="max-w-[200px] truncate text-xs text-muted-foreground"
                                                                title={student.email}
                                                            >
                                                                {student.email}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                                                            {student.id_number ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                                                            {student.contact_number ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-center whitespace-nowrap">
                                                            <Badge variant="outline" className="font-normal text-xs">
                                                                {student.hte_name}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-6 text-right font-medium whitespace-nowrap text-foreground">
                                                            {formatLongDuration(student.total_hours)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Grid view — desktop */}
                        {view === 'grid' && (
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {students.data.map((student) => (
                                    <Card key={student.intern_user_id} className="flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {student.name}
                                                    </CardTitle>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={student.email}>
                                                        {student.email}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="shrink-0 text-xs font-mono">
                                                    {student.id_number ?? 'No ID'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-2.5 text-xs text-muted-foreground pt-0">
                                            {student.contact_number && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="size-3.5 shrink-0" />
                                                    <span>{student.contact_number}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Building2 className="size-3.5 shrink-0" />
                                                <span className="truncate font-medium text-foreground">{student.hte_name}</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="size-3.5" /> Rendered:
                                                </span>
                                                <span className="font-semibold text-foreground text-xs">
                                                    {formatLongDuration(student.total_hours)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Mobile list view */}
                        <div className="sm:hidden flex flex-col gap-3">
                            {students.data.map((student) => (
                                <Card key={student.intern_user_id}>
                                    <CardContent className="p-4 flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">{student.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs shrink-0 font-mono">
                                                {student.id_number ?? 'No ID'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                                            <span className="truncate max-w-[160px] font-medium text-foreground">{student.hte_name}</span>
                                            <span className="font-semibold text-foreground">{formatLongDuration(student.total_hours)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <NumberedPagination
                            meta={students}
                            itemLabel="student"
                            onPageChange={goToPage}
                            onPerPageChange={changePerPage}
                            idPrefix="students-per-page"
                        />
                    </>
                )}
            </div>
        </>
    );
}

MyStudents.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Students', href: '/supervisor/interns' },
    ],
};