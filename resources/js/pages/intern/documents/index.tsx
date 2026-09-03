import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileCheck,
    FileText,
    FileUp,
    Info,
    Loader2,
    RefreshCw,
    Trash2,
    Paperclip,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Paperclip className="size-5" />
                            </span>
                            My Documents
                        </h1>
                    </div>

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

                {/* Categorized Document Checklist */}
                <div className="space-y-6">
                    {categories.map((category) => {
                        const items = checklist.filter(
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
                    })}
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
