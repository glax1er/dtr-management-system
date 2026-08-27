import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileCheck,
    FileText,
    FileUp,
    Folder,
    FolderOpen,
    Info,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    Paperclip,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export default function InternDocuments({
    checklist,
    stats,
    profile,
}: InternDocumentsProps) {
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [search, setSearch] = useState('');
    const [activeFolder, setActiveFolder] = useState<string>('all'); // 'all' | category name
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const getFolderColorClass = (catName: string) => {
        const lower = catName.toLowerCase();
        if (lower.includes('pre')) {
            return {
                border: 'hover:border-blue-500/50',
                activeBorder: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
                iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            };
        }
        if (lower.includes('during')) {
            return {
                border: 'hover:border-amber-500/50',
                activeBorder: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
                iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            };
        }
        if (lower.includes('eval')) {
            return {
                border: 'hover:border-emerald-500/50',
                activeBorder: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
                iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            };
        }
        return {
            border: 'hover:border-purple-500/50',
            activeBorder: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        };
    };

    const handleFileSelect = (
        typeKey: string,
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Strict PDF validation
        if (
            file.type !== 'application/pdf' &&
            !file.name.toLowerCase().endsWith('.pdf')
        ) {
            toast.error('Only PDF documents (.pdf) are allowed.');
            e.target.value = '';
            return;
        }

        // File size check
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
                description: 'Please ask your OJT Supervisor for the official format.',
            });
        }
    };

    const handleDelete = (doc: DocumentItem) => {
        if (!doc.id) return;

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

    // Group items by category
    const categories = Array.from(
        new Set(checklist.map((item) => item.category)),
    );

    // ── Folder Cards Meta (mirrors supervisor Document Templates layout) ────
    const folders = useMemo(() => {
        return categories.map((catName) => {
            const items = checklist.filter((item) => item.category === catName);
            const submittedCount = items.filter((item) => item.status !== 'missing').length;
            return {
                name: catName,
                total_items: items.length,
                submitted_count: submittedCount,
            };
        });
    }, [categories, checklist]);

    // ── Filtered Checklist (folder + search) ─────────────────────────────────
    const filteredChecklist = useMemo(() => {
        return checklist.filter((item) => {
            if (activeFolder !== 'all' && item.category !== activeFolder) return false;

            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = item.name.toLowerCase().includes(query);
                const matchDesc = item.description?.toLowerCase().includes(query);
                const matchCategory = item.category?.toLowerCase().includes(query);
                const matchFile = item.original_filename?.toLowerCase().includes(query);
                if (!matchName && !matchDesc && !matchCategory && !matchFile) return false;
            }

            return true;
        });
    }, [checklist, activeFolder, search]);

    const filteredCategories = Array.from(
        new Set(filteredChecklist.map((item) => item.category)),
    );

    const getStatusBadge = (status: DocumentItem['status']) => {
        switch (status) {
            case 'approved':
                return <StatusBadge status="approved" />;
            case 'pending_review':
                return <StatusBadge status="pending_review" label="Under Review" />;
            case 'rejected':
                return <StatusBadge status="rejected" label="Needs Revision" />;
            default:
                return <StatusBadge status="not_submitted" />;
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

                        {/* Progress indicator */}
                        <div className="flex items-center gap-3 bg-card border border-border/70 rounded-lg px-3.5 py-2 shrink-0">
                            <div className="text-right">
                                <p className="text-xs font-semibold text-foreground">
                                    {stats.approved_required} of {stats.total_required} Approved
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {stats.progress_percentage}% completed
                                </p>
                            </div>
                            <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${stats.progress_percentage}%` }}
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
                            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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

                {/* ── Categories / Folders Section ────────────────────────────── */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Folder className="size-4 text-primary" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Categories & Folders
                            </h2>
                        </div>

                        {activeFolder !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveFolder('all')}
                                className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            >
                                <ArrowLeft className="size-3" />
                                View All Categories
                            </Button>
                        )}
                    </div>

                    {/* Category Folder Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {folders.map((f) => {
                            const colors = getFolderColorClass(f.name);
                            const isSelected = activeFolder === f.name;

                            return (
                                <button
                                    key={f.name}
                                    type="button"
                                    onClick={() => setActiveFolder(isSelected ? 'all' : f.name)}
                                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                        isSelected
                                            ? colors.activeBorder + ' shadow-sm ring-1 ring-primary/30'
                                            : 'bg-card border-border/70 hover:bg-accent/40 ' + colors.border
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-lg shrink-0 ${colors.iconBg}`}>
                                        {isSelected ? (
                                            <FolderOpen className="size-5" />
                                        ) : (
                                            <Folder className="size-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="font-semibold text-sm truncate text-foreground">
                                            {f.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{f.total_items} {f.total_items === 1 ? 'doc' : 'docs'}</span>
                                            <span>•</span>
                                            <span className={f.submitted_count === f.total_items ? 'text-emerald-600 font-medium' : ''}>
                                                {f.submitted_count} submitted
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Breadcrumb & Filter Status Header ───────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setActiveFolder('all')}
                            className={`hover:text-foreground font-medium transition-colors ${
                                activeFolder === 'all' ? 'text-foreground font-semibold' : ''
                            }`}
                        >
                            All Documents
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-foreground">
                            {activeFolder === 'all' ? 'All Categories' : activeFolder}
                        </span>
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                            {filteredChecklist.length} items
                        </Badge>
                    </div>
                </div>

                {/* Categorized Document Checklist */}
                <div className="space-y-6">
                    {filteredChecklist.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FileText className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium text-sm text-foreground">No documents found</h3>
                            <p className="text-xs mt-1">
                                Try a different search term or clear the category filter.
                            </p>
                        </Card>
                    ) : (
                    filteredCategories.map((category) => {
                        const items = filteredChecklist.filter(
                            (item) => item.category === category,
                        );

                        return (
                            <div key={category} className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                        {category}
                                    </h2>
                                </div>

                                <div className="space-y-2.5">
                                    {items.map((doc) => {
                                        const isUploading =
                                            uploadingType === doc.document_type;
                                        const hasUploaded =
                                            doc.status !== 'missing';

                                        return (
                                            <div
                                                key={doc.document_type}
                                                className={`rounded-lg border p-4 transition-all ${
                                                    doc.status === 'approved'
                                                        ? 'bg-card border-emerald-500/30'
                                                        : doc.status === 'rejected'
                                                          ? 'bg-card border-destructive/40'
                                                          : 'bg-card border-border/70'
                                                }`}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    {/* Left Info */}
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold text-sm text-foreground">
                                                                {doc.name}
                                                            </span>
                                                            {doc.required ? (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-[10px] uppercase font-semibold h-4 px-1.5"
                                                                >
                                                                    Required
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] uppercase text-muted-foreground h-4 px-1.5"
                                                                >
                                                                    Optional
                                                                </Badge>
                                                            )}
                                                            {getStatusBadge(doc.status)}
                                                        </div>

                                                        <p className="text-xs text-muted-foreground">
                                                            {doc.description}
                                                        </p>

                                                        {/* Submission details */}
                                                        {hasUploaded && (
                                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                                                                <FileText className="h-3 w-3 text-primary shrink-0" />
                                                                <span className="font-medium text-foreground truncate max-w-xs">
                                                                    {doc.original_filename}
                                                                </span>
                                                                {doc.file_size && <span>• {doc.file_size}</span>}
                                                                {doc.submitted_at && <span>• {doc.submitted_at}</span>}
                                                            </p>
                                                        )}

                                                        {/* Coordinator note */}
                                                        {doc.template_instructions && (
                                                            <p className="text-[11px] text-muted-foreground italic pt-0.5">
                                                                Note: {doc.template_instructions}
                                                            </p>
                                                        )}

                                                        {/* Rejection Note */}
                                                        {doc.status === 'rejected' && doc.rejection_reason && (
                                                            <Alert
                                                                variant="destructive"
                                                                className="mt-2 py-1.5 px-2.5 text-xs bg-destructive/10 border-destructive/20"
                                                            >
                                                                <AlertDescription className="text-xs">
                                                                    <strong>Revision needed:</strong> {doc.rejection_reason}
                                                                </AlertDescription>
                                                            </Alert>
                                                        )}
                                                    </div>

                                                    {/* Right Actions */}
                                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                        {/* Hidden File Input */}
                                                        <input
                                                            type="file"
                                                            ref={(el) => {
                                                                fileInputRefs.current[doc.document_type] = el;
                                                            }}
                                                            accept=".pdf,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) =>
                                                                handleFileSelect(doc.document_type, e)
                                                            }
                                                        />

                                                        {/* Always Visible Download Blank Form Button */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleDownloadTemplate(doc)}
                                                            title={doc.has_template ? `Download ${doc.template_filename}` : 'No template uploaded yet'}
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                            Blank Form
                                                        </Button>

                                                        {hasUploaded ? (
                                                            <>
                                                                {/* Preview */}
                                                                {doc.preview_url && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 gap-1 text-xs"
                                                                        onClick={() => setPreviewDoc(doc)}
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                        View
                                                                    </Button>
                                                                )}

                                                                {/* Download submitted */}
                                                                {doc.download_url && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 gap-1 text-xs"
                                                                        asChild
                                                                    >
                                                                        <a href={doc.download_url} download>
                                                                            <Download className="h-3.5 w-3.5" />
                                                                            File
                                                                        </a>
                                                                    </Button>
                                                                )}

                                                                {/* Replace upload */}
                                                                {doc.status !== 'approved' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        disabled={isUploading}
                                                                        className="h-8 gap-1 text-xs"
                                                                        onClick={() =>
                                                                            fileInputRefs.current[doc.document_type]?.click()
                                                                        }
                                                                    >
                                                                        {isUploading ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : (
                                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                                        )}
                                                                        Replace
                                                                    </Button>
                                                                )}

                                                                {/* Remove */}
                                                                {doc.status !== 'approved' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => handleDelete(doc)}
                                                                        title="Remove upload"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            /* Upload PDF */
                                                            <Button
                                                                size="sm"
                                                                disabled={isUploading}
                                                                className="h-8 gap-1.5 text-xs shadow-none"
                                                                onClick={() =>
                                                                    fileInputRefs.current[doc.document_type]?.click()
                                                                }
                                                            >
                                                                {isUploading ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <FileUp className="h-3.5 w-3.5" />
                                                                )}
                                                                {isUploading ? 'Uploading...' : 'Upload PDF'}
                                                            </Button>
                                                        )}
                                                    </div>
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
            </div>

            {/* Minimal PDF Viewer Dialog */}
            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => {
                    if (!open) setPreviewDoc(null);
                }}
            >
                <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
                    <DialogHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between shrink-0">
                        <div>
                            <DialogTitle className="text-sm font-semibold">
                                {previewDoc?.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground truncate max-w-md">
                                {previewDoc?.original_filename}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 mr-6">
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

                    <div className="flex-1 bg-muted/20 w-full h-full relative">
                        {previewDoc?.preview_url ? (
                            <iframe
                                src={previewDoc.preview_url}
                                title={previewDoc.name}
                                className="w-full h-full border-0"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Unable to load preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
