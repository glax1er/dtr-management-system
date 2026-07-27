import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HteRow {
    hte_id: number;
    hte_name: string;
    address: string | null;
    contact_person: string | null;
    contact_number: string | null;
    status: 'active' | 'inactive';
    interns_count: number;
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
    per_page: number;
}

interface HtesIndexProps {
    htes: PaginatedHtes;
    hteCount: number;
    scopeName?: string;
    filters: Filters;
}

const MIN_PER_PAGE = 1;
const MAX_PER_PAGE = 100;

export default function SupervisorHtes({
    htes,
    hteCount,
    scopeName,
    filters,
}: HtesIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [perPageDraft, setPerPageDraft] = useState(String(filters.per_page));

    // Base params shared by every navigation action — anything that
    // changes what rows match (search) resets back to page 1 by simply
    // omitting the page param.
    const baseParams = () => ({
        search: filters.search || undefined,
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
        visit({ ...baseParams(), search: search || undefined });
    };

    const clearSearch = () => {
        setSearch('');
        visit({ ...baseParams(), search: undefined });
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
        if (page < 1 || page > htes.last_page) {
            return;
        }

        visit({ ...baseParams(), page: String(page) });
    };

    return (
        <>
            <Head title="HTEs" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        HTEs
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {`${hteCount} HTE${hteCount === 1 ? '' : 's'} currently hosting interns from the ${scopeName ?? 'selected'} program.`}
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Host Training Establishments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <form
                            onSubmit={applySearch}
                            className="flex items-end gap-2"
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="search"
                                    className="text-xs text-muted-foreground"
                                >
                                    Search by name
                                </Label>
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="e.g. Acme Corporation"
                                    className="w-52"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">
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
                        </form>

                        {htes.data.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No HTEs match{' '}
                                {filters.search !== ''
                                    ? 'this search.'
                                    : 'your program yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Address
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Contact Person
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Contact Number
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Status
                                            </th>
                                            <th className="py-2 font-medium">
                                                Interns
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {htes.data.map((hte) => (
                                            <tr
                                                key={hte.hte_id}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                    {hte.hte_name}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {hte.address ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {hte.contact_person ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {hte.contact_number ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    <Badge
                                                        variant={
                                                            hte.status ===
                                                            'active'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {hte.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 whitespace-nowrap">
                                                    {hte.interns_count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {htes.total > 0 && (
                            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <span>
                                        Showing {htes.from}–{htes.to} of{' '}
                                        {htes.total} HTE
                                        {htes.total === 1 ? '' : 's'}
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
                                        disabled={htes.current_page <= 1}
                                        onClick={() =>
                                            goToPage(htes.current_page - 1)
                                        }
                                    >
                                        <ChevronLeft className="size-3.5" />
                                        Previous
                                    </Button>
                                    <span className="min-w-24 text-center text-sm text-muted-foreground">
                                        Page {htes.current_page} of{' '}
                                        {htes.last_page}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            htes.current_page >=
                                            htes.last_page
                                        }
                                        onClick={() =>
                                            goToPage(htes.current_page + 1)
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

SupervisorHtes.layout = {
    breadcrumbs: [{ title: 'HTEs', href: '/supervisor/htes' }],
};
