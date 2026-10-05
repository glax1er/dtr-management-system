import { router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    Eye,
    FileCheck2,
    FileText,
    LayoutGrid,
    List,
    Loader2,
    RotateCcw,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DocumentItem } from '@/pages/intern/documents';

interface InternInfo {
    user_id: number;
    name: string;
    id_number: string | null;
    program: string;
    hte: string;
}

interface InternDocumentsDialogProps {
    internUserId: number;
    internName: string;
    trigger?: React.ReactNode;
    defaultOpen?: boolean;
    highlightDoc?: string | null;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected' | 'missing';

export function InternDocumentsDialog({
    internUserId,
    internName,
    trigger,
    defaultOpen = false,
    highlightDoc = null,
}: InternDocumentsDialogProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isLoading, setIsLoading] = useState(false);
    const [intern, setIntern] = useState<InternInfo | null>(null);
    const [checklist, setChecklist] = useState<DocumentItem[]>([]);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    // Filters and Display
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Rejecting state
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // DTR Report date filter state
    const [dtrStartDate, setDtrStartDate] = useState('');
    const [dtrEndDate, setDtrEndDate] = useState('');

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);

        try {
            const res = await fetch(`/documents/intern/${internUserId}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                throw new Error('Failed to load documents');
            }

            const data = await res.json();
            setIntern(data.intern);
            setChecklist(data.checklist);
        } catch {
            toast.error('Unable to fetch intern documents.');
        } finally {
            setIsLoading(false);
        }
    }, [internUserId]);

    // Support opening automatically if defaultOpen is true or URL deep-link points to this intern
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (defaultOpen) {
            fetchDocuments();
            return;
        }

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const docInternId = params.get('doc_intern');
            if (docInternId && String(internUserId) === docInternId) {
                setIsOpen(true);
                fetchDocuments();
            }
        }
    }, [defaultOpen, internUserId, fetchDocuments]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Determine target highlight doc from props or URL
    const effectiveHighlightDoc = useMemo(() => {
        if (highlightDoc) return highlightDoc;
        if (typeof window === 'undefined') return null;
        const params = new URLSearchParams(window.location.search);
        if (params.get('doc_intern') === String(internUserId)) {
            return params.get('highlight_doc');
        }
        return null;
    }, [highlightDoc, internUserId]);

    // Scroll to highlighted doc when checklist loads
    useEffect(() => {
        if (!isOpen || !effectiveHighlightDoc || checklist.length === 0) {
            return;
        }

        const targetDoc = checklist.find(
            (d) =>
                d.document_type === effectiveHighlightDoc ||
                (d.id !== null && String(d.id) === effectiveHighlightDoc),
        );
        const typeKey = targetDoc ? targetDoc.document_type : effectiveHighlightDoc;

        const el = document.getElementById(`dialog-doc-${typeKey}`);

        if (el) {
            const timer = setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);

            return () => clearTimeout(timer);
        }
    }, [isOpen, effectiveHighlightDoc, checklist]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (open) {
            fetchDocuments();
        } else {
            setRejectingDocId(null);
            setRejectionReason('');
            setDtrStartDate('');
            setDtrEndDate('');
            setSearch('');
            setSelectedCategory('all');
            setSelectedStatus('all');
        }
    };

    const handleApprove = (doc: DocumentItem) => {
        if (!doc.id) {
            return;
        }

        setIsSubmittingAction(true);

        router.post(
            `/documents/${doc.id}/approve`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Approved "${doc.name}".`);
                    fetchDocuments();
                },
                onError: () => {
                    toast.error('Failed to approve document.');
                },
                onFinish: () => {
                    setIsSubmittingAction(false);
                },
            },
        );
    };

    const handleRejectSubmit = (docId: number) => {
        if (!rejectionReason.trim()) {
            toast.error('Please specify why this document needs revision.');

            return;
        }

        setIsSubmittingAction(true);

        router.post(
            `/documents/${docId}/reject`,
            { rejection_reason: rejectionReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Document marked as needs revision.');
                    setRejectingDocId(null);
                    setRejectionReason('');
                    fetchDocuments();
                },
                onError: (errors) => {
                    toast.error(
                        errors.rejection_reason || 'Failed to reject document.',
                    );
                },
                onFinish: () => {
                    setIsSubmittingAction(false);
                },
            },
        );
    };

    const getStatusBadge = (status: DocumentItem['status']) => {
        switch (status) {
            case 'approved':
                return <StatusBadge status="approved" />;
            case 'pending_review':
                return <StatusBadge status="pending_review" />;
            case 'rejected':
                return <StatusBadge status="rejected" label="Needs Revision" />;
            default:
                return <StatusBadge status="not_submitted" />;
        }
    };

    // Calculate Metrics & Summary
    const stats = useMemo(() => {
        const total = checklist.length;
        const approved = checklist.filter((item) => item.status === 'approved').length;
        const pending = checklist.filter((item) => item.status === 'pending_review').length;
        const rejected = checklist.filter((item) => item.status === 'rejected').length;
        const missing = checklist.filter((item) => item.status === 'missing').length;
        const percent = total > 0 ? Math.round((approved / total) * 100) : 0;
        const requiredItems = checklist.filter((item) => item.required);
        const requiredApproved = requiredItems.filter(
            (item) => item.status === 'approved',
        ).length;

        return {
            total,
            approved,
            pending,
            rejected,
            missing,
            percent,
            requiredTotal: requiredItems.length,
            requiredApproved,
        };
    }, [checklist]);

    // Categories
    const categories = useMemo(() => {
        return Array.from(new Set(checklist.map((item) => item.category || 'General')));
    }, [checklist]);

    const categoryCounts = useMemo(() => {
        const map: Record<string, { total: number; approved: number }> = {};
        for (const cat of categories) {
            const items = checklist.filter((i) => (i.category || 'General') === cat);
            map[cat] = {
                total: items.length,
                approved: items.filter((i) => i.status === 'approved').length,
            };
        }
        return map;
    }, [categories, checklist]);

    // Filtered checklist
    const filteredChecklist = useMemo(() => {
        return checklist.filter((item) => {
            const itemCat = item.category || 'General';
            if (selectedCategory !== 'all' && itemCat !== selectedCategory) {
                return false;
            }

            if (selectedStatus !== 'all' && item.status !== selectedStatus) {
                return false;
            }

            if (search.trim()) {
                const q = search.toLowerCase();
                const matchName = item.name?.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q);
                const matchFile = item.original_filename?.toLowerCase().includes(q);
                const matchCategory = itemCat.toLowerCase().includes(q);

                if (!matchName && !matchDesc && !matchFile && !matchCategory) {
                    return false;
                }
            }

            return true;
        });
    }, [checklist, selectedCategory, selectedStatus, search]);

    const activeCategories = useMemo(() => {
        return Array.from(new Set(filteredChecklist.map((item) => item.category || 'General')));
    }, [filteredChecklist]);

    const hasActiveFilters =
        search.trim() !== '' ||
        selectedCategory !== 'all' ||
        selectedStatus !== 'all';

    const resetFilters = () => {
        setSearch('');
        setSelectedCategory('all');
        setSelectedStatus('all');
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs shadow-2xs hover:border-primary/50"
                        >
                            <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                            <span>Documents</span>
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-6xl xl:max-w-7xl flex-col overflow-hidden p-0 shadow-2xl sm:max-h-[88vh]">
                    {/* Header */}
                    <DialogHeader className="border-b border-border bg-card/60 px-4 py-3.5 pr-14 sm:px-6 sm:py-4.5 sm:pr-16">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs sm:size-11">
                                    <FileCheck2 className="size-5 sm:size-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <DialogTitle className="flex flex-wrap items-center gap-1.5 text-base font-bold tracking-tight text-foreground sm:gap-2 sm:text-xl">
                                        <span>Requirements Checklist:</span>
                                        <span className="text-primary truncate">{internName}</span>
                                    </DialogTitle>
                                    <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                        {intern ? (
                                            <>
                                                <span className="font-mono font-medium text-foreground">
                                                    ID: {intern.id_number || '—'}
                                                </span>
                                                <span className="text-border">•</span>
                                                <span>
                                                    Program:{' '}
                                                    <strong className="font-medium text-foreground">
                                                        {intern.program}
                                                    </strong>
                                                </span>
                                                <span className="text-border">•</span>
                                                <span>
                                                    HTE:{' '}
                                                    <strong className="font-medium text-foreground">
                                                        {intern.hte}
                                                    </strong>
                                                </span>
                                            </>
                                        ) : (
                                            'Review, evaluate, and verify uploaded requirement documents.'
                                        )}
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Top Completion Summary Badge */}
                            {!isLoading && checklist.length > 0 && (
                                <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                                    <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/90 px-3.5 py-1.5 shadow-2xs">
                                        <div className="text-right">
                                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Requirements Cleared
                                            </div>
                                            <div className="text-xs font-bold text-foreground">
                                                {stats.approved} / {stats.total}{' '}
                                                <span className="font-normal text-muted-foreground">
                                                    ({stats.percent}%)
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-2xs',
                                                stats.percent === 100
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-primary/10 text-primary',
                                            )}
                                        >
                                            {stats.percent}%
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Quick Metric Bar & Progress Strip */}
                    {!isLoading && checklist.length > 0 && (
                        <div className="border-b border-border/80 bg-muted/25 px-4 py-2.5 sm:px-6">
                            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                                {/* Status Filter Chips */}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStatus('all')}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                                            selectedStatus === 'all'
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'border border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                        )}
                                    >
                                        <span>All</span>
                                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {stats.total}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedStatus(
                                                selectedStatus === 'pending_review'
                                                    ? 'all'
                                                    : 'pending_review',
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                                            selectedStatus === 'pending_review'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : stats.pending > 0
                                                  ? 'border border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
                                                  : 'border border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                        )}
                                    >
                                        <Clock className="size-3.5" />
                                        <span>Pending Review</span>
                                        <span
                                            className={cn(
                                                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                                selectedStatus === 'pending_review'
                                                    ? 'bg-white/20 text-white'
                                                    : stats.pending > 0
                                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                                                      : 'bg-muted/60 text-muted-foreground',
                                            )}
                                        >
                                            {stats.pending}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedStatus(
                                                selectedStatus === 'approved'
                                                    ? 'all'
                                                    : 'approved',
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                                            selectedStatus === 'approved'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'border border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                        )}
                                    >
                                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Approved</span>
                                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {stats.approved}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedStatus(
                                                selectedStatus === 'rejected'
                                                    ? 'all'
                                                    : 'rejected',
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                                            selectedStatus === 'rejected'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'border border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                        )}
                                    >
                                        <AlertCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
                                        <span>Needs Revision</span>
                                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {stats.rejected}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedStatus(
                                                selectedStatus === 'missing'
                                                    ? 'all'
                                                    : 'missing',
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shadow-2xs cursor-pointer',
                                            selectedStatus === 'missing'
                                                ? 'bg-muted-foreground text-background shadow-xs'
                                                : 'border border-border/80 bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
                                        )}
                                    >
                                        <FileText className="size-3.5" />
                                        <span>Not Submitted</span>
                                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {stats.missing}
                                        </span>
                                    </button>
                                </div>

                                {/* Progress Bar strip */}
                                <div className="flex items-center gap-3 min-w-[200px] lg:max-w-xs flex-1">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${stats.percent}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                                        {stats.approved}/{stats.total} Cleared
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toolbar: Category Selector, Search, View Switcher */}
                    {!isLoading && checklist.length > 0 && (
                        <div className="flex flex-col gap-2.5 border-b border-border/60 bg-background px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                        selectedCategory === 'all'
                                            ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    All Categories
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() =>
                                            setSelectedCategory(
                                                selectedCategory === cat ? 'all' : cat,
                                            )
                                        }
                                        className={cn(
                                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                            selectedCategory === cat
                                                ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        <span>{cat}</span>
                                        {categoryCounts[cat] && (
                                            <span className="ml-1.5 opacity-75 font-normal">
                                                ({categoryCounts[cat].approved}/{categoryCounts[cat].total})
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Search and View Mode Switcher */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <div className="relative w-full sm:w-48 lg:w-60">
                                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search documents…"
                                        className="h-8 w-full rounded-md border border-input bg-muted/30 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    )}
                                </div>

                                {/* View Switcher */}
                                <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            'rounded p-1 text-xs transition-colors cursor-pointer',
                                            viewMode === 'grid'
                                                ? 'bg-background text-foreground shadow-2xs font-medium'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                        title="Grid View"
                                    >
                                        <LayoutGrid className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={cn(
                                            'rounded p-1 text-xs transition-colors cursor-pointer',
                                            viewMode === 'list'
                                                ? 'bg-background text-foreground shadow-2xs font-medium'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                        title="List View"
                                    >
                                        <List className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Body */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                <span className="text-sm font-medium">
                                    Loading requirements checklist...
                                </span>
                            </div>
                        ) : checklist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                                <FileText className="size-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-foreground">
                                    No document requirements configured.
                                </p>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    There are currently no active document requirements set up for this intern's program.
                                </p>
                            </div>
                        ) : filteredChecklist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <FileText className="size-9 text-muted-foreground/40" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-foreground">
                                        No requirements match your filters.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Try adjusting your search query, status, or category filter.
                                    </p>
                                </div>
                                {hasActiveFilters && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1.5 text-xs mt-1"
                                        onClick={resetFilters}
                                    >
                                        <RotateCcw className="size-3.5" />
                                        Reset Filters
                                    </Button>
                                )}
                            </div>
                        ) : (
                            activeCategories.map((cat) => {
                                const catItems = filteredChecklist.filter(
                                    (i) => (i.category || 'General') === cat,
                                );

                                return (
                                    <div key={cat} className="space-y-3.5">
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between border-b border-border/70 pb-1.5">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">
                                                    {cat}
                                                </h4>
                                                <Badge
                                                    variant="secondary"
                                                    className="px-1.5 py-0 text-[10px] font-medium"
                                                >
                                                    {catItems.length}{' '}
                                                    {catItems.length === 1 ? 'item' : 'items'}
                                                </Badge>
                                            </div>
                                            {categoryCounts[cat] && (
                                                <span className="text-[11px] text-muted-foreground font-medium">
                                                    {categoryCounts[cat].approved} / {categoryCounts[cat].total} Cleared
                                                </span>
                                            )}
                                        </div>

                                        {/* Items Display: Grid vs List */}
                                        <div
                                            className={cn(
                                                viewMode === 'grid'
                                                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                                                    : 'space-y-3',
                                            )}
                                        >
                                            {catItems.map((doc) => {
                                                const hasUploaded =
                                                    doc.status !== 'missing' && doc.id !== null;
                                                // Bug fix: only true when doc.id is a real number and matches rejectingDocId
                                                const isRejecting =
                                                    hasUploaded &&
                                                    doc.id !== null &&
                                                    rejectingDocId === doc.id;
                                                const isHighlighted =
                                                    effectiveHighlightDoc !== null &&
                                                    (effectiveHighlightDoc === doc.document_type ||
                                                        (doc.id !== null &&
                                                            effectiveHighlightDoc === String(doc.id)));

                                                return (
                                                    <div
                                                        key={doc.document_type}
                                                        id={`dialog-doc-${doc.document_type}`}
                                                        className={cn(
                                                            'flex flex-col justify-between rounded-xl border bg-card p-4 text-card-foreground shadow-2xs transition-all duration-200',
                                                            isHighlighted
                                                                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10'
                                                                : doc.status === 'approved'
                                                                  ? 'border-emerald-500/30 hover:border-emerald-500/50'
                                                                  : doc.status === 'rejected'
                                                                    ? 'border-rose-500/30 hover:border-rose-500/50'
                                                                    : doc.status === 'pending_review'
                                                                      ? 'border-amber-500/40 bg-amber-500/[0.02] hover:border-amber-500/60'
                                                                      : 'border-border/80 hover:border-border',
                                                        )}
                                                    >
                                                        <div>
                                                            {/* Card Header: Badges & Status */}
                                                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                                                                    >
                                                                        {doc.category || 'General'}
                                                                    </Badge>
                                                                    {doc.required ? (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="px-1.5 py-0 text-[10px] font-semibold uppercase"
                                                                        >
                                                                            Required
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="px-1.5 py-0 text-[10px] text-muted-foreground uppercase"
                                                                        >
                                                                            Optional
                                                                        </Badge>
                                                                    )}
                                                                    {isHighlighted && (
                                                                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                            <Sparkles className="size-3" />
                                                                            Focus
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {getStatusBadge(doc.status)}
                                                                </div>
                                                            </div>

                                                            {/* Document Title & Description */}
                                                            <div className="space-y-1">
                                                                <h5 className="text-sm font-bold text-foreground leading-snug sm:text-base">
                                                                    {doc.name}
                                                                </h5>
                                                                {doc.description && (
                                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                                        {doc.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Uploaded File Meta Pill */}
                                                            {hasUploaded ? (
                                                                <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                                                                    <span
                                                                        className="flex max-w-[260px] items-center gap-1.5 font-medium text-foreground sm:max-w-xs"
                                                                        title={doc.original_filename || ''}
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                                        <span className="truncate">
                                                                            {doc.original_filename}
                                                                        </span>
                                                                    </span>
                                                                    {doc.file_size && (
                                                                        <span className="flex items-center gap-1 text-[11px]">
                                                                            <span className="text-border">•</span>
                                                                            {doc.file_size}
                                                                        </span>
                                                                    )}
                                                                    {doc.submitted_at && (
                                                                        <span className="flex items-center gap-1 text-[11px]">
                                                                            <span className="text-border">•</span>
                                                                            <span>Submitted {doc.submitted_at}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2 text-xs text-muted-foreground italic">
                                                                    <Clock className="size-3.5 shrink-0 text-muted-foreground/60" />
                                                                    <span>Awaiting intern submission</span>
                                                                </div>
                                                            )}

                                                            {/* Rejection Alert Box */}
                                                            {doc.status === 'rejected' && doc.rejection_reason && (
                                                                <Alert
                                                                    variant="destructive"
                                                                    className="mt-3 border-destructive/20 bg-destructive/10 py-2.5 text-xs shadow-2xs"
                                                                >
                                                                    <AlertDescription className="flex items-start gap-2 break-words">
                                                                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                                                                        <div className="space-y-0.5">
                                                                            <strong className="font-semibold text-destructive">
                                                                                Feedback for Intern:
                                                                            </strong>
                                                                            <p className="text-destructive/90">
                                                                                {doc.rejection_reason}
                                                                            </p>
                                                                        </div>
                                                                    </AlertDescription>
                                                                </Alert>
                                                            )}
                                                        </div>

                                                        {/* Bottom Section: Actions & Special Forms */}
                                                        <div>
                                                            {/* Rejection Inline Form: Only rendered if doc is uploaded and supervisor is rejecting */}
                                                            {hasUploaded && isRejecting && doc.id !== null && (
                                                                <div className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-left">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                                                                            <AlertCircle className="size-3.5" />
                                                                            Correction Notes / Feedback for Intern:
                                                                        </Label>
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                                                            Required
                                                                        </span>
                                                                    </div>
                                                                    <Textarea
                                                                        value={rejectionReason}
                                                                        onChange={(e) =>
                                                                            setRejectionReason(e.target.value)
                                                                        }
                                                                        placeholder="e.g., Missing supervisor signature on page 2, or blurry photocopy..."
                                                                        rows={2}
                                                                        className="text-xs bg-background"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex justify-end gap-2 pt-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-7.5 text-xs"
                                                                            onClick={() => setRejectingDocId(null)}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            className="h-7.5 gap-1.5 text-xs"
                                                                            disabled={
                                                                                isSubmittingAction ||
                                                                                !rejectionReason.trim()
                                                                            }
                                                                            onClick={() =>
                                                                                handleRejectSubmit(doc.id!)
                                                                            }
                                                                        >
                                                                            {isSubmittingAction ? (
                                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                            ) : (
                                                                                <X className="h-3.5 w-3.5" />
                                                                            )}
                                                                            Submit Rejection
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Official System DTR Report Generator */}
                                                            {doc.document_type === 'dtr' && (
                                                                <div className="mt-3 space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-3.5">
                                                                    <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                                                                        <div className="space-y-0.5">
                                                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                                                <FileCheck2 className="size-4 shrink-0 text-primary" />
                                                                                Generate & Download Official DTR Report
                                                                            </span>
                                                                            <p className="text-[11px] text-muted-foreground">
                                                                                Filter by date range, or leave blank to download the full DTR report up to the most recent log.
                                                                            </p>
                                                                        </div>
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 w-full shrink-0 gap-1.5 text-xs shadow-sm sm:w-auto font-medium"
                                                                            onClick={() => {
                                                                                let url = `/supervisor/interns/${internUserId}/dtr-report`;
                                                                                const params = new URLSearchParams();

                                                                                if (dtrStartDate) {
                                                                                    params.append('start', dtrStartDate);
                                                                                }

                                                                                if (dtrEndDate) {
                                                                                    params.append('end', dtrEndDate);
                                                                                }

                                                                                const queryString = params.toString();

                                                                                if (queryString) {
                                                                                    url += `?${queryString}`;
                                                                                }

                                                                                window.open(url, '_blank', 'noopener');
                                                                            }}
                                                                        >
                                                                            <Download className="size-3.5" />
                                                                            Download Official DTR
                                                                        </Button>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 pt-2">
                                                                        <div className="flex flex-1 items-center gap-1.5 min-w-[130px] sm:flex-initial">
                                                                            <span className="text-[11px] font-medium text-muted-foreground">
                                                                                From:
                                                                            </span>
                                                                            <input
                                                                                type="date"
                                                                                value={dtrStartDate}
                                                                                onChange={(e) =>
                                                                                    setDtrStartDate(e.target.value)
                                                                                }
                                                                                className="h-7.5 w-full sm:w-auto rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-2xs focus:ring-1 focus:ring-primary focus:outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-1 items-center gap-1.5 min-w-[130px] sm:flex-initial">
                                                                            <span className="text-[11px] font-medium text-muted-foreground">
                                                                                To:
                                                                            </span>
                                                                            <input
                                                                                type="date"
                                                                                value={dtrEndDate}
                                                                                onChange={(e) =>
                                                                                    setDtrEndDate(e.target.value)
                                                                                }
                                                                                className="h-7.5 w-full sm:w-auto rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-2xs focus:ring-1 focus:ring-primary focus:outline-none"
                                                                            />
                                                                        </div>
                                                                        {(dtrStartDate || dtrEndDate) && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-7.5 w-full sm:w-auto px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
                                                                                onClick={() => {
                                                                                    setDtrStartDate('');
                                                                                    setDtrEndDate('');
                                                                                }}
                                                                            >
                                                                                <RotateCcw className="size-3 mr-1" />
                                                                                Reset (Full DTR)
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action Buttons Bar */}
                                                            {hasUploaded && (
                                                                <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                                                                    {doc.preview_url && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 gap-1.5 text-xs shadow-2xs"
                                                                            onClick={() => setPreviewDoc(doc)}
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                            Preview
                                                                        </Button>
                                                                    )}

                                                                    {doc.download_url && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 gap-1.5 text-xs shadow-2xs"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={doc.download_url}
                                                                                download
                                                                                title="Download document"
                                                                                className="flex items-center gap-1.5"
                                                                            >
                                                                                <Download className="h-3.5 w-3.5" />
                                                                                <span>Download</span>
                                                                            </a>
                                                                        </Button>
                                                                    )}

                                                                    {doc.status !== 'approved' && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 gap-1.5 bg-emerald-600 text-xs text-white shadow-2xs hover:bg-emerald-700"
                                                                            disabled={isSubmittingAction}
                                                                            onClick={() => handleApprove(doc)}
                                                                        >
                                                                            <Check className="h-3.5 w-3.5" />
                                                                            Approve
                                                                        </Button>
                                                                    )}

                                                                    {doc.status !== 'rejected' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            className="h-8 gap-1.5 text-xs shadow-2xs"
                                                                            disabled={isSubmittingAction}
                                                                            onClick={() => {
                                                                                setRejectingDocId(doc.id);
                                                                                setRejectionReason('');
                                                                            }}
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                            Reject
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Expansive Sub-dialog for PDF Preview */}
            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewDoc(null);
                    }
                }}
            >
                <DialogContent className="z-50 flex h-[92vh] w-[96vw] max-w-6xl xl:max-w-7xl flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:h-[88vh]">
                    <DialogHeader className="flex shrink-0 flex-col gap-2.5 border-b border-border bg-card/60 px-4 py-3.5 pr-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pr-16">
                        <div className="min-w-0 pr-2">
                            <DialogTitle className="text-sm font-semibold truncate sm:text-base text-foreground">
                                {previewDoc?.name}
                            </DialogTitle>
                            <DialogDescription className="max-w-md truncate text-xs text-muted-foreground">
                                {previewDoc?.original_filename || 'PDF Document Preview'}
                            </DialogDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {previewDoc?.download_url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-xs shadow-2xs"
                                    asChild
                                >
                                    <a href={previewDoc.download_url} download>
                                        <Download className="size-3.5" />
                                        <span>Download</span>
                                    </a>
                                </Button>
                            )}
                            {previewDoc?.preview_url && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 gap-1.5 text-xs shadow-2xs"
                                    asChild
                                >
                                    <a
                                        href={previewDoc.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="size-3.5" />
                                        <span>Open in New Tab</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="relative h-full w-full flex-1 bg-muted/20">
                        {previewDoc?.preview_url ? (
                            <iframe
                                src={previewDoc.preview_url}
                                title={previewDoc.name}
                                className="h-full w-full border-0"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Unable to load PDF preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
