import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StudentRow {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    hte_name: string;
    total_hours: number;
}

interface PaginatedStudents {
    data: StudentRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
    students: PaginatedStudents;
    studentCount: number;
    scopeName?: string;
    hteOptions: HteOption[];
    filters: Filters;
}

// Radix's Select doesn't allow an item with an empty-string value, so
// "every HTE" gets its own sentinel that we translate back to
// undefined (i.e. no hte_id filter) before it hits the URL.
const ALL_HTES = 'all';

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;

/** 8.5 → "8 hours 30 minutes" — same long-form duration used on the
 * HTE attendance log, so hours read consistently across both views. */
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
    const [search, setSearch] = useState(filters.search);
    const [perPageDraft, setPerPageDraft] = useState(String(filters.per_page));

    // Base params shared by every navigation action — anything that
    // changes what rows match (search/hte_id) resets back to page 1 by
    // simply omitting the page param.
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
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
    };

    const changeHte = (value: string) => {
        visit({
            ...baseParams(),
            hte_id: value === ALL_HTES ? undefined : value,
        });
    };

    const commitPerPage = () => {
        const parsed = parseInt(perPageDraft, 10);
        const clamped = Number.isNaN(parsed)
            ? filters.per_page
            : Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, parsed));

        setPerPageDraft(String(clamped));

        if (clamped === filters.per_page) {
            return;
        }

        visit({ ...baseParams(), per_page: String(clamped) });
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > students.last_page) {
            return;
        }

        visit({ ...baseParams(), page: String(page) });
    };

    return (
        <>
            <Head title="My Students" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        My Students
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {`${studentCount} intern${studentCount === 1 ? '' : 's'} in the ${scopeName ?? 'selected'} program, across every HTE.`}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Assigned Interns
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <form
                            onSubmit={applySearch}
                            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="search"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Search by name
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="search"
                                            value={search}
                                            onChange={(e) =>
                                                setSearch(e.target.value)
                                            }
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="w-full sm:w-52"
                                        />
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            size="sm"
                                        >
                                            Search
                                        </Button>
                                        {filters.search !== '' && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSearch}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label
                                        htmlFor="hte-filter"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Assigned HTE
                                    </Label>
                                    <Select
                                        value={
                                            filters.hte_id
                                                ? String(filters.hte_id)
                                                : ALL_HTES
                                        }
                                        onValueChange={changeHte}
                                    >
                                        <SelectTrigger
                                            id="hte-filter"
                                            className="w-full sm:w-48"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_HTES}>
                                                All HTEs
                                            </SelectItem>
                                            {hteOptions.map((hte) => (
                                                <SelectItem
                                                    key={hte.hte_id}
                                                    value={String(hte.hte_id)}
                                                >
                                                    {hte.hte_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </form>

                        {students.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No interns match{' '}
                                {filters.search !== '' || filters.hte_id
                                    ? 'these filters.'
                                    : 'your program yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Email
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                ID Number
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Contact
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Assigned HTE
                                            </th>
                                            <th className="py-2 font-medium">
                                                Hours Rendered
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.data.map((student) => (
                                            <tr
                                                key={student.intern_user_id}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                    {student.name}
                                                </td>
                                                <td
                                                    className="max-w-[160px] truncate py-2.5 pr-4"
                                                    title={student.email}
                                                >
                                                    {student.email}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.id_number ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.contact_number ??
                                                        '—'}
                                                </td>
                                                <td
                                                    className="max-w-[140px] truncate py-2.5 pr-4"
                                                    title={student.hte_name}
                                                >
                                                    {student.hte_name}
                                                </td>
                                                <td className="py-2.5 whitespace-nowrap">
                                                    {formatLongDuration(
                                                        student.total_hours,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {students.total > 0 && (
                            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span>
                                        Showing {students.from}–{students.to} of{' '}
                                        {students.total} intern
                                        {students.total === 1 ? '' : 's'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Label
                                            htmlFor="per-page"
                                            className="text-xs whitespace-nowrap"
                                        >
                                            Rows per page
                                        </Label>
                                        <Input
                                            id="per-page"
                                            type="number"
                                            inputMode="numeric"
                                            min={MIN_PER_PAGE}
                                            max={MAX_PER_PAGE}
                                            value={perPageDraft}
                                            onChange={(e) =>
                                                setPerPageDraft(e.target.value)
                                            }
                                            onBlur={commitPerPage}
                                            onKeyDown={(
                                                e: KeyboardEvent<HTMLInputElement>,
                                            ) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    commitPerPage();
                                                }
                                            }}
                                            className="h-8 w-[4.5rem]"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={students.current_page <= 1}
                                        onClick={() =>
                                            goToPage(students.current_page - 1)
                                        }
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        Previous
                                    </Button>
                                    <span className="min-w-24 text-center text-sm text-muted-foreground">
                                        Page {students.current_page} of{' '}
                                        {students.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            students.current_page >=
                                            students.last_page
                                        }
                                        onClick={() =>
                                            goToPage(students.current_page + 1)
                                        }
                                    >
                                        Next
                                        <ChevronRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

MyStudents.layout = {
    breadcrumbs: [{ title: 'My Students', href: '/supervisor/interns' }],
};
