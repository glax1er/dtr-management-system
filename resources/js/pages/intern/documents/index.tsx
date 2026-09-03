import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Eye,
    FileCheck,
    FileText,
    FileUp,
    Folder,
    FolderOpen,
    Info,
    LayoutGrid,
    Loader2,
    RefreshCw,
    Search,
    Sparkles,
    Table as TableIcon,
    Trash2,
    X,
    Paperclip,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
export interface DocumentItem {
    document_type: string;
    name: string;
    category: string;
    description: string;
    required: boolean;
    status: 'missing' | 'pending_review' | 'approved' | 'rejected';
    id: number | null;
    original_filename: string | null;
    file_size: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    submitted_at_date: string | null;
    reviewed_at: string | null;
    preview_url: string | null;
    download_url: string | null;
    // Template
    has_template?: boolean;
    template_id?: number | null;
    template_filename?: string | null;
    template_size?: string | null;
    template_extension?: string | null;
    template_instructions?: string | null;
    template_download_url?: string | null;
}

export interface DocumentStats {
    total_required: number;
    approved_required: number;
    total_submitted: number;
    total_approved: number;
    progress_percentage: number;
    is_all_required_approved: boolean;
}

export interface InternProfileSummary {
    name: string;
    id_number: string | null;
    hte_name: string;
    program_name: string;
}

interface InternDocumentsProps {
    checklist: DocumentItem[];
    stats: DocumentStats;
    profile: InternProfileSummary;
}

type ViewMode = 'table' | 'grid';

interface FolderMeta {
    name: string;
    total_items: number;
    submitted_count: number;
    approved_count: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const getFolderColorClass = (catName: string) => {
    const lower = catName.toLowerCase();

    if (lower.includes('pre')) {
        return {
            border: 'hover:border-blue-500/50',
            activeBorder:
                'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
            iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        };
    }

    if (lower.includes('during')) {
        return {
            border: 'hover:border-amber-500/50',
            activeBorder:
                'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
    }

    if (lower.includes('eval')) {
        return {
            border: 'hover:border-emerald-500/50',
            activeBorder:
                'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
    }

    return {
        border: 'hover:border-purple-500/50',
        activeBorder:
            'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    };
};

export default function InternDocuments({
    checklist,
    stats,
}: InternDocumentsProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState('');
    const [activeFolder, setActiveFolder] = useState<string>('all');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const highlightType =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('highlight') ||
              null
            : null;

    // Auto-switch to folder containing the highlighted document
    useEffect(() => {
        if (!highlightType) {
return;
}

        const targetDoc = checklist.find(
            (d) =>
                d.document_type === highlightType ||
                String(d.id) === highlightType,
        );

        if (
            targetDoc &&
            activeFolder !== 'all' &&
            activeFolder !== targetDoc.category
        ) {
            setActiveFolder(targetDoc.category);
        }
    }, [highlightType, checklist]);

    // Scroll to highlighted document card or row
    useEffect(() => {
        if (!highlightType) {
return;
}

        const targetDoc = checklist.find(
            (d) =>
                d.document_type === highlightType ||
                String(d.id) === highlightType,
        );
        const typeKey = targetDoc ? targetDoc.document_type : highlightType;

        const el =
            document.getElementById(`doc-row-${typeKey}`) ||
            document.getElementById(`doc-card-${typeKey}`);

        if (!el) {
return;
}

        const timer = setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);

        return () => clearTimeout(timer);
    }, [highlightType, activeFolder, view, checklist]);

    // ── Build folder metadata from checklist ─────────────────────────────────
    const folders = useMemo<FolderMeta[]>(() => {
        const map = new Map<string, FolderMeta>();
        checklist.forEach((item) => {
            if (!map.has(item.category)) {
                map.set(item.category, {
                    name: item.category,
                    total_items: 0,
                    submitted_count: 0,
                    approved_count: 0,
                });
            }

            const f = map.get(item.category)!;
            f.total_items += 1;

            if (item.status !== 'missing') {
f.submitted_count += 1;
}

            if (item.status === 'approved') {
f.approved_count += 1;
}
        });

        return Array.from(map.values());
    }, [checklist]);

    // ── Filtered Items ───────────────────────────────────────────────────────
    const filteredChecklist = useMemo(() => {
        return checklist.filter((item) => {
            if (activeFolder !== 'all' && item.category !== activeFolder) {
return false;
}

            if (search.trim()) {
                const q = search.toLowerCase();

                if (
                    !item.name.toLowerCase().includes(q) &&
                    !item.description?.toLowerCase().includes(q) &&
                    !item.category?.toLowerCase().includes(q)
                ) {
return false;
}
            }

            return true;
        });
    }, [checklist, activeFolder, search]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleFileSelect = (
        typeKey: string,
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];

        if (!file) {
return;
}

        if (
            file.type !== 'application/pdf' &&
            !file.name.toLowerCase().endsWith('.pdf')
        ) {
            toast.error('Only PDF documents (.pdf) are allowed.');
            e.target.value = '';

            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error('Selected file is too large (max 10 MB).');
            e.target.value = '';

            return;
        }

        const formData = new FormData();
        formData.append('document_type', typeKey);
        formData.append('file', file);

        setUploadingType(typeKey);

        router.post('/intern/documents', formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success('Document uploaded.');
            },
            onError: (errors) => {
                const errorMsg =
                    errors.file || errors.document_type || 'Upload failed.';
                toast.error(errorMsg);
            },
            onFinish: () => {
                setUploadingType(null);

                if (fileInputRefs.current[typeKey]) {
                    fileInputRefs.current[typeKey]!.value = '';
                }
            },
        });
    };

    const handleDownloadTemplate = (doc: DocumentItem) => {
        if (doc.has_template && doc.template_download_url) {
            window.location.href = doc.template_download_url;
        } else {
            toast.warning(`No blank format available yet for "${doc.name}".`, {
                description:
                    'Please ask your OJT Supervisor for the official format.',
            });
        }
    };

    const handleDelete = (doc: DocumentItem) => {
        if (!doc.id) {
return;
}

        if (confirm(`Remove your upload for "${doc.name}"?`)) {
            router.delete(`/intern/documents/${doc.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Document removed.');
                },
                onError: () => {
                    toast.error('Failed to remove document.');
                },
            });
        }
    };

    return (
        <>
            <Head title="My Documents" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* ── Top Header Toolbar ──────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Paperclip className="size-5" />
                            </span>
                            My Documents
                        </h1>
                    </div>

                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative hidden sm:block">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search documents…"
                                className="h-9 w-48 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none lg:w-64"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Mobile Search Toggle */}
                        <Button
                            variant="outline"
                            size="icon"
                            className="sm:hidden"
                            onClick={() => setMobileSearchOpen((prev) => !prev)}
                            aria-label="Toggle search"
                        >
                            <Search className="size-4" />
                        </Button>

                        {/* View Mode Switcher */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger value="table">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Progress Indicator */}
                        <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 py-1.5">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-foreground">
                                    {stats.approved_required} of{' '}
                                    {stats.total_required} Approved
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {stats.progress_percentage}% completed
                                </p>
                            </div>
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${stats.progress_percentage}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {mobileSearchOpen && (
                    <div className="relative block sm:hidden">
                        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search documents..."
                            className="h-9 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                            autoFocus
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* ── Drive Folders Section ───────────────────────────────────── */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Folder className="size-4 text-primary" />
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Categories &amp; Folders
                            </h2>
                        </div>

                        {activeFolder !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveFolder('all')}
                                className="h-7 gap-1 text-xs text-primary hover:text-primary"
                            >
                                <ArrowLeft className="size-3" />
                                View All Categories
                            </Button>
                        )}
                    </div>

                    {/* Category Folder Cards Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {folders.map((f) => {
                            const colors = getFolderColorClass(f.name);
                            const isSelected = activeFolder === f.name;

                            return (
                                <button
                                    key={f.name}
                                    type="button"
                                    onClick={() =>
                                        setActiveFolder(
                                            isSelected ? 'all' : f.name,
                                        )
                                    }
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                                        isSelected
                                            ? colors.activeBorder +
                                              ' shadow-sm ring-1 ring-primary/30'
                                            : 'border-border/70 bg-card hover:bg-accent/40 ' +
                                              colors.border
                                    }`}
                                >
                                    <div
                                        className={`shrink-0 rounded-lg p-2.5 ${colors.iconBg}`}
                                    >
                                        {isSelected ? (
                                            <FolderOpen className="size-5" />
                                        ) : (
                                            <Folder className="size-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="truncate text-sm font-semibold text-foreground">
                                            {f.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {f.total_items}{' '}
                                                {f.total_items === 1
                                                    ? 'doc'
                                                    : 'docs'}
                                            </span>
                                            <span>•</span>
                                            <span
                                                className={
                                                    f.approved_count ===
                                                        f.total_items &&
                                                    f.total_items > 0
                                                        ? 'font-medium text-emerald-600'
                                                        : ''
                                                }
                                            >
                                                {f.approved_count} approved
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Breadcrumb & Filter Status Header ───────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pt-2 pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setActiveFolder('all')}
                            className={`font-medium transition-colors hover:text-foreground ${
                                activeFolder === 'all'
                                    ? 'font-semibold text-foreground'
                                    : ''
                            }`}
                        >
                            All Documents
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-foreground">
                            {activeFolder === 'all'
                                ? 'All Categories'
                                : activeFolder}
                        </span>
                        <Badge
                            variant="outline"
                            className="ml-1.5 px-1.5 py-0 text-[10px]"
                        >
                            {filteredChecklist.length} items
                        </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Upload format:{' '}
                        <span className="font-medium text-foreground">
                            .pdf
                        </span>{' '}
                        (max 10 MB)
                    </div>
                </div>

                {/* ── Documents Display Section ──────────────────────────────── */}
                {filteredChecklist.length === 0 ? (
                    <Card className="border-dashed p-10 text-center text-muted-foreground">
                        <FileCheck className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                        <h3 className="text-sm font-medium text-foreground">
                            No documents found
                        </h3>
                        <p className="mt-1 text-xs">
                            {search
                                ? 'No documents match your search query.'
                                : 'No documents configured in this section.'}
                        </p>
                    </Card>
                ) : view === 'grid' ? (
                    /* ── Grid View ── */
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredChecklist.map((doc) => {
                            const isUploading =
                                uploadingType === doc.document_type;
                            const hasUploaded = doc.status !== 'missing';
                            const isHighlighted =
                                highlightType === doc.document_type ||
                                (doc.id !== null &&
                                    highlightType === String(doc.id));

                            return (
                                <Card
                                    key={doc.document_type}
                                    id={`doc-card-${doc.document_type}`}
                                    className={cn(
                                        'flex flex-col justify-between border-border/70 transition-all duration-300',
                                        isHighlighted
                                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10'
                                            : doc.status === 'approved'
                                              ? 'border-emerald-500/30 bg-card shadow-sm hover:border-emerald-500/50'
                                              : doc.status === 'rejected'
                                                ? 'border-destructive/30 bg-card hover:border-destructive/50'
                                                : hasUploaded
                                                  ? 'bg-card shadow-sm hover:border-primary/50'
                                                  : 'border-dashed bg-card/60 hover:bg-card',
                                    )}
                                >
                                    <CardContent className="space-y-3 p-4">
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <div
                                                    className={`shrink-0 rounded-xl p-2.5 ${
                                                        doc.status ===
                                                        'approved'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : doc.status ===
                                                                'rejected'
                                                              ? 'bg-destructive/10 text-destructive'
                                                              : hasUploaded
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <FileText className="size-5" />
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="px-1.5 py-0 text-[9px] tracking-wider text-muted-foreground uppercase"
                                                        >
                                                            {doc.category}
                                                        </Badge>
                                                        <StatusBadge
                                                            status={
                                                                doc.required
                                                                    ? 'required'
                                                                    : 'optional'
                                                            }
                                                            className="px-1.5 py-0 text-[9px]"
                                                        />
                                                        {isHighlighted && (
                                                            <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                <Sparkles className="size-3" />
                                                                Focus
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm leading-snug font-semibold text-foreground">
                                                        {doc.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Submission Status Badge */}
                                            {doc.status === 'approved' && (
                                                <StatusBadge
                                                    status="approved"
                                                    className="shrink-0 text-[10px]"
                                                />
                                            )}
                                            {doc.status ===
                                                'pending_review' && (
                                                <StatusBadge
                                                    status="pending_review"
                                                    label="Under Review"
                                                    className="shrink-0 text-[10px]"
                                                />
                                            )}
                                            {doc.status === 'rejected' && (
                                                <StatusBadge
                                                    status="rejected"
                                                    label="Needs Revision"
                                                    className="shrink-0 text-[10px]"
                                                />
                                            )}
                                            {doc.status === 'missing' && (
                                                <StatusBadge
                                                    status="not_submitted"
                                                    className="shrink-0 text-[10px]"
                                                />
                                            )}
                                        </div>

                                        {/* Description */}
                                        {doc.description && (
                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {doc.description}
                                            </p>
                                        )}

                                        {/* Submission Details or Upload Prompt */}
                                        {hasUploaded ? (
                                            <div className="space-y-1 rounded-lg border border-border/40 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5 truncate font-medium text-foreground">
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1 py-0 text-[9px] font-bold uppercase"
                                                    >
                                                        PDF
                                                    </Badge>
                                                    <span className="truncate">
                                                        {doc.original_filename}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span>
                                                        {doc.file_size ||
                                                            'No size'}
                                                    </span>
                                                    <span>
                                                        {doc.submitted_at || ''}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                                                <FileUp className="size-4 shrink-0 text-muted-foreground/60" />
                                                <span>
                                                    No document uploaded yet.
                                                </span>
                                            </div>
                                        )}

                                        {/* Template Instructions */}
                                        {doc.template_instructions && (
                                            <div className="flex w-full items-start gap-1.5 rounded-lg border border-primary/15 bg-primary/5 p-2 text-left text-xs">
                                                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                                                <span className="line-clamp-2">
                                                    <strong className="text-primary">
                                                        Note:{' '}
                                                    </strong>
                                                    {doc.template_instructions}
                                                </span>
                                            </div>
                                        )}

                                        {/* Rejection Note */}
                                        {doc.status === 'rejected' &&
                                            doc.rejection_reason && (
                                                <Alert
                                                    variant="destructive"
                                                    className="border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs"
                                                >
                                                    <AlertDescription className="text-xs">
                                                        <strong>
                                                            Revision needed:
                                                        </strong>{' '}
                                                        {doc.rejection_reason}
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                    </CardContent>

                                    {/* Action Toolbar */}
                                    <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/10 px-4 py-2.5">
                                        {/* Left: Download Blank Form + Preview */}
                                        <div className="flex items-center gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 gap-1.5 text-xs"
                                                        onClick={() =>
                                                            handleDownloadTemplate(
                                                                doc,
                                                            )
                                                        }
                                                    >
                                                        <Download className="size-3.5" />
                                                        Blank Form
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {doc.has_template
                                                        ? `Download ${doc.template_filename}`
                                                        : 'No template uploaded yet'}
                                                </TooltipContent>
                                            </Tooltip>

                                            {doc.preview_url && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1 text-xs"
                                                            onClick={() =>
                                                                setPreviewDoc(
                                                                    doc,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="size-3.5" />
                                                            View
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Preview uploaded
                                                        document
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>

                                        {/* Right: Upload / Replace / Remove */}
                                        <div className="flex items-center gap-1">
                                            {/* Hidden File Input */}
                                            <input
                                                type="file"
                                                ref={(el) => {
                                                    fileInputRefs.current[
                                                        doc.document_type
                                                    ] = el;
                                                }}
                                                accept=".pdf,application/pdf"
                                                className="hidden"
                                                onChange={(e) =>
                                                    handleFileSelect(
                                                        doc.document_type,
                                                        e,
                                                    )
                                                }
                                            />

                                            {hasUploaded ? (
                                                <>
                                                    {doc.download_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                                            asChild
                                                        >
                                                            <a
                                                                href={
                                                                    doc.download_url
                                                                }
                                                                download
                                                                title="Download your uploaded file"
                                                            >
                                                                <Download className="size-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}

                                                    {doc.status !==
                                                        'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            disabled={
                                                                isUploading
                                                            }
                                                            className="h-8 gap-1 text-xs"
                                                            onClick={() =>
                                                                fileInputRefs.current[
                                                                    doc
                                                                        .document_type
                                                                ]?.click()
                                                            }
                                                        >
                                                            {isUploading ? (
                                                                <Loader2 className="size-3.5 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="size-3.5" />
                                                            )}
                                                            Replace
                                                        </Button>
                                                    )}

                                                    {doc.status !==
                                                        'approved' && (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            doc,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Remove upload
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={isUploading}
                                                    className="h-8 gap-1.5 text-xs shadow-none"
                                                    onClick={() =>
                                                        fileInputRefs.current[
                                                            doc.document_type
                                                        ]?.click()
                                                    }
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <FileUp className="size-3.5" />
                                                    )}
                                                    {isUploading
                                                        ? 'Uploading...'
                                                        : 'Upload PDF'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Table View ── */
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="px-6">
                                            Document
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Category
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Requirement
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Status
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Uploaded File
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Blank Form
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredChecklist.map((doc) => {
                                        const isUploading =
                                            uploadingType === doc.document_type;
                                        const hasUploaded =
                                            doc.status !== 'missing';
                                        const isHighlighted =
                                            highlightType ===
                                                doc.document_type ||
                                            (doc.id !== null &&
                                                highlightType ===
                                                    String(doc.id));

                                        return (
                                            <TableRow
                                                key={doc.document_type}
                                                id={`doc-row-${doc.document_type}`}
                                                className={cn(
                                                    'transition-all duration-300 hover:bg-muted/30',
                                                    isHighlighted
                                                        ? 'bg-primary/10 ring-2 ring-primary/40 dark:bg-primary/20'
                                                        : doc.status ===
                                                            'approved'
                                                          ? 'border-l-2 border-l-emerald-500'
                                                          : doc.status ===
                                                              'rejected'
                                                            ? 'border-l-2 border-l-destructive'
                                                            : '',
                                                )}
                                            >
                                                {/* Document Name */}
                                                <TableCell className="px-6 font-medium text-foreground">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-semibold">
                                                                {doc.name}
                                                            </div>
                                                            {isHighlighted && (
                                                                <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                    <Sparkles className="size-3" />
                                                                    Focus
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="line-clamp-1 text-xs font-normal text-muted-foreground">
                                                            {doc.description ||
                                                                'No description provided.'}
                                                        </div>
                                                        {doc.status ===
                                                            'rejected' &&
                                                            doc.rejection_reason && (
                                                                <div className="line-clamp-1 text-xs font-normal text-destructive">
                                                                    <strong>
                                                                        Revision:
                                                                    </strong>{' '}
                                                                    {
                                                                        doc.rejection_reason
                                                                    }
                                                                </div>
                                                            )}
                                                        {doc.template_instructions && (
                                                            <div className="text-[11px] text-muted-foreground italic">
                                                                Note:{' '}
                                                                {
                                                                    doc.template_instructions
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="px-6 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {doc.category}
                                                    </Badge>
                                                </TableCell>

                                                {/* Requirement */}
                                                <TableCell className="px-6 text-center">
                                                    <StatusBadge
                                                        status={
                                                            doc.required
                                                                ? 'required'
                                                                : 'optional'
                                                        }
                                                    />
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell className="px-6 text-center">
                                                    {doc.status ===
                                                        'approved' && (
                                                        <StatusBadge status="approved" />
                                                    )}
                                                    {doc.status ===
                                                        'pending_review' && (
                                                        <StatusBadge
                                                            status="pending_review"
                                                            label="Under Review"
                                                        />
                                                    )}
                                                    {doc.status ===
                                                        'rejected' && (
                                                        <StatusBadge
                                                            status="rejected"
                                                            label="Needs Revision"
                                                        />
                                                    )}
                                                    {doc.status ===
                                                        'missing' && (
                                                        <StatusBadge status="not_submitted" />
                                                    )}
                                                </TableCell>

                                                {/* Uploaded File */}
                                                <TableCell className="px-6 text-center text-xs">
                                                    {hasUploaded ? (
                                                        <div className="mx-auto max-w-[180px] space-y-0.5">
                                                            <div className="flex items-center justify-center gap-1.5 truncate font-medium text-foreground">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="px-1 py-0 text-[9px] font-bold uppercase"
                                                                >
                                                                    PDF
                                                                </Badge>
                                                                <span
                                                                    className="truncate"
                                                                    title={
                                                                        doc.original_filename ||
                                                                        ''
                                                                    }
                                                                >
                                                                    {
                                                                        doc.original_filename
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {doc.file_size}{' '}
                                                                •{' '}
                                                                {
                                                                    doc.submitted_at
                                                                }
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">
                                                            None uploaded
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Blank Form */}
                                                <TableCell className="px-6 text-center text-xs">
                                                    {doc.has_template ? (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-primary hover:text-primary"
                                                                    onClick={() =>
                                                                        handleDownloadTemplate(
                                                                            doc,
                                                                        )
                                                                    }
                                                                >
                                                                    <Download className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Download Blank
                                                                Form
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="px-6 text-center">
                                                    {/* Hidden File Input */}
                                                    <input
                                                        type="file"
                                                        ref={(el) => {
                                                            fileInputRefs.current[
                                                                doc.document_type
                                                            ] = el;
                                                        }}
                                                        accept=".pdf,application/pdf"
                                                        className="hidden"
                                                        onChange={(e) =>
                                                            handleFileSelect(
                                                                doc.document_type,
                                                                e,
                                                            )
                                                        }
                                                    />

                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Preview */}
                                                        {doc.preview_url && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8 text-foreground hover:text-primary"
                                                                        onClick={() =>
                                                                            setPreviewDoc(
                                                                                doc,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Preview
                                                                    Document
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {/* Download submitted file */}
                                                        {doc.download_url &&
                                                            hasUploaded && (
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 text-foreground hover:text-primary"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    doc.download_url
                                                                                }
                                                                                download
                                                                            >
                                                                                <Download className="size-4" />
                                                                            </a>
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Download
                                                                        Your
                                                                        File
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}

                                                        {/* Upload / Replace */}
                                                        {doc.status !==
                                                            'approved' && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        disabled={
                                                                            isUploading
                                                                        }
                                                                        className="size-8 text-blue-600 hover:text-blue-700"
                                                                        onClick={() =>
                                                                            fileInputRefs.current[
                                                                                doc
                                                                                    .document_type
                                                                            ]?.click()
                                                                        }
                                                                    >
                                                                        {isUploading ? (
                                                                            <Loader2 className="size-4 animate-spin" />
                                                                        ) : hasUploaded ? (
                                                                            <RefreshCw className="size-4" />
                                                                        ) : (
                                                                            <FileUp className="size-4" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {hasUploaded
                                                                        ? 'Replace File'
                                                                        : 'Upload PDF'}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {/* Remove */}
                                                        {hasUploaded &&
                                                            doc.status !==
                                                                'approved' && (
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 text-destructive hover:text-destructive"
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    doc,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Remove
                                                                        Upload
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── PDF Preview Dialog ────────────────────────────────────────── */}
            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => {
                    if (!open) {
setPreviewDoc(null);
}
                }}
            >
                <DialogContent className="flex h-[85vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border px-5 py-3">
                        <div>
                            <DialogTitle className="text-sm font-semibold">
                                {previewDoc?.name}
                            </DialogTitle>
                            <DialogDescription className="max-w-md truncate text-xs text-muted-foreground">
                                {previewDoc?.original_filename}
                            </DialogDescription>
                        </div>
                        <div className="mr-6 flex items-center gap-2">
                            {previewDoc?.download_url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 text-xs"
                                    asChild
                                >
                                    <a href={previewDoc.download_url} download>
                                        <Download className="h-3.5 w-3.5" />
                                        Download
                                    </a>
                                </Button>
                            )}
                            {previewDoc?.preview_url && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 gap-1 text-xs"
                                    asChild
                                >
                                    <a
                                        href={previewDoc.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open Tab
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
                                Unable to load preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
