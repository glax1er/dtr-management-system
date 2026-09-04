import { useState } from 'react';
import type { PaginationMeta } from '@/components/pagination-footer';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

interface NumberedPaginationProps {
    meta: PaginationMeta;
    /** Plural-aware noun for the footer's "Showing X-Y of Z ___" text,
     * e.g. "program" -> "1 program" / "3 programs". */
    itemLabel: string;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    /** Unique id for the "rows per page" input — needed if a page ever
     * renders more than one of these footers. */
    idPrefix?: string;
    className?: string;
}

/** Pagination footer with numbered page links (and ellipsis for long
 * ranges) plus a rows-per-page input — a more visually detailed
 * alternative to PaginationFooter's simple Previous/Page X of Y/Next
 * layout. Originally built inline for the admin Programs page; extracted
 * here since nothing about it is Programs-specific. */
export function NumberedPagination({
    meta,
    itemLabel,
    onPageChange,
    onPerPageChange,
    idPrefix = 'per-page',
    className,
}: NumberedPaginationProps) {
    const {
        current_page: currentPage,
        last_page: lastPage,
        from,
        to,
        total,
        per_page: perPage,
    } = meta;

    const [perPageInput, setPerPageInput] = useState(String(perPage));
    // Track the per_page value perPageInput was last synced from, so a
    // change coming from outside (pagination, filters, etc.) can reset
    // the draft during render instead of via a post-commit effect.
    const [syncedPerPage, setSyncedPerPage] = useState(perPage);

    if (perPage !== syncedPerPage) {
        setSyncedPerPage(perPage);
        setPerPageInput(String(perPage));
    }

    const submitPerPage = () => {
        const nextPerPage = Number(perPageInput);

        if (!Number.isInteger(nextPerPage) || nextPerPage < 1) {
            setPerPageInput(String(perPage));

            return;
        }

        onPerPageChange(nextPerPage);
    };

    if (total === 0) {
        return null;
    }

    const pages: (number | 'ellipsis')[] = [];

    if (lastPage <= 7) {
        for (let page = 1; page <= lastPage; page += 1) {
            pages.push(page);
        }
    } else {
        pages.push(1);

        if (currentPage > 3) {
            pages.push('ellipsis');
        }

        for (
            let page = Math.max(2, currentPage - 1);
            page <= Math.min(lastPage - 1, currentPage + 1);
            page += 1
        ) {
            pages.push(page);
        }

        if (currentPage < lastPage - 2) {
            pages.push('ellipsis');
        }

        pages.push(lastPage);
    }

    return (
        <div
            className={cn(
                'grid w-full gap-3 border-t px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:px-6',
                className,
            )}
        >
            {/* Left */}
            <div className="order-2 flex justify-center sm:order-1 sm:justify-start">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitPerPage();
                    }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                    <label htmlFor={idPrefix} className="text-xs">
                        Rows
                    </label>

                    <Input
                        id={idPrefix}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={perPageInput}
                        onChange={(event) =>
                            setPerPageInput(event.target.value)
                        }
                        onBlur={submitPerPage}
                        className="h-7 w-16 px-2 text-xs"
                        aria-label="Rows per page"
                    />
                </form>
            </div>

            {/* Center */}
            <Pagination className="order-1 w-full sm:order-2 sm:w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            aria-disabled={currentPage <= 1}
                            tabIndex={currentPage <= 1 ? -1 : undefined}
                            className={
                                currentPage <= 1
                                    ? 'pointer-events-none opacity-40'
                                    : 'cursor-pointer'
                            }
                            onClick={(event) => {
                                event.preventDefault();

                                if (currentPage > 1) {
                                    onPageChange(currentPage - 1);
                                }
                            }}
                        />
                    </PaginationItem>

                    {pages.map((page, index) => {
                        if (page === 'ellipsis') {
                            return (
                                <PaginationItem
                                    key={`ellipsis-${index}`}
                                    className="hidden sm:list-item"
                                >
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        }

                        const hideOnMobile =
                            page !== 1 &&
                            page !== currentPage &&
                            page !== lastPage;

                        return (
                            <PaginationItem
                                key={page}
                                className={
                                    hideOnMobile ? 'hidden sm:list-item' : ''
                                }
                            >
                                <PaginationLink
                                    href="#"
                                    isActive={page === currentPage}
                                    className="cursor-pointer"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        onPageChange(page);
                                    }}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            aria-disabled={currentPage >= lastPage}
                            tabIndex={currentPage >= lastPage ? -1 : undefined}
                            className={
                                currentPage >= lastPage
                                    ? 'pointer-events-none opacity-40'
                                    : 'cursor-pointer'
                            }
                            onClick={(event) => {
                                event.preventDefault();

                                if (currentPage < lastPage) {
                                    onPageChange(currentPage + 1);
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            {/* Right */}
            <p className="order-3 justify-self-center text-center text-sm text-muted-foreground sm:justify-self-end sm:text-right">
                Showing {from}–{to} of {total} {itemLabel}
                {total === 1 ? '' : 's'}
            </p>
        </div>
    );
}
