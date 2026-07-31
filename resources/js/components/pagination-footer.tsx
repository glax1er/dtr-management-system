import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

/** Shape returned by Laravel's `paginate()` once Inertia serializes it —
 * `data` plus the meta fields above (extra fields like `links` are
 * ignored here). */
export interface Paginated<T> extends PaginationMeta {
    data: T[];
}

interface PaginationFooterProps {
    meta: PaginationMeta;
    /** Singular noun for the items being counted, e.g. "intern" → "1 intern" / "3 interns". */
    itemLabel: string;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    minPerPage?: number;
    maxPerPage?: number;
    /** Unique id for the "rows per page" input — needed if a page ever renders more than one footer. */
    idPrefix?: string;
}

const DEFAULT_MIN_PER_PAGE = 1;
const DEFAULT_MAX_PER_PAGE = 100;

/** Pagination footer shared by every paginated admin table/list:
 * "Showing X–Y of Z" + rows-per-page input on the left, Previous/Page/Next
 * on the right. Mirrors the pagination UI already used on the supervisor
 * pages (My Interns, My Students) so behavior is consistent app-wide. */
export default function PaginationFooter({
    meta,
    itemLabel,
    onPageChange,
    onPerPageChange,
    minPerPage = DEFAULT_MIN_PER_PAGE,
    maxPerPage = DEFAULT_MAX_PER_PAGE,
    idPrefix = 'per-page',
}: PaginationFooterProps) {
    const [perPageDraft, setPerPageDraft] = useState(String(meta.per_page));

    // Keep the input in sync if per_page changes from outside (e.g. the
    // user navigates back/forward and a different value is restored).
    useEffect(() => {
        setPerPageDraft(String(meta.per_page));
    }, [meta.per_page]);

    if (meta.total === 0) {
        return null;
    }

    const commitPerPage = () => {
        const parsed = parseInt(perPageDraft, 10);
        const clamped = Number.isNaN(parsed)
            ? meta.per_page
            : Math.min(maxPerPage, Math.max(minPerPage, parsed));

        setPerPageDraft(String(clamped));

        if (clamped === meta.per_page) {
            return;
        }

        onPerPageChange(clamped);
    };

    const goToPage = (page: number) => {
        if (page < 1 || page > meta.last_page) {
            return;
        }

        onPageChange(page);
    };

    return (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                    Showing {meta.from}–{meta.to} of {meta.total} {itemLabel}
                    {meta.total === 1 ? '' : 's'}
                </span>
                <div className="flex items-center gap-2">
                    <Label
                        htmlFor={idPrefix}
                        className="text-xs whitespace-nowrap"
                    >
                        Rows per page
                    </Label>
                    <Input
                        id={idPrefix}
                        type="number"
                        inputMode="numeric"
                        min={minPerPage}
                        max={maxPerPage}
                        value={perPageDraft}
                        onChange={(e) => setPerPageDraft(e.target.value)}
                        onBlur={commitPerPage}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commitPerPage();
                            }
                        }}
                        className="h-8 w-18"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => goToPage(meta.current_page - 1)}
                >
                    <ChevronLeft className="size-3.5" />
                    Previous
                </Button>
                <span className="min-w-24 text-center text-sm text-muted-foreground">
                    Page {meta.current_page} of {meta.last_page}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => goToPage(meta.current_page + 1)}
                >
                    Next
                    <ChevronRight className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
