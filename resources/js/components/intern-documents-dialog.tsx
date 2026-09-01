import { router } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Loader2,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

    // Auto-fetch if defaultOpen
    useEffect(() => {
        if (defaultOpen) {
            fetchDocuments();
        }
    }, [defaultOpen]);

    // Scroll to highlighted doc when checklist loads
    useEffect(() => {
        if (!isOpen || !highlightDoc || checklist.length === 0) return;

        const targetDoc = checklist.find(
            (d) => d.document_type === highlightDoc || String(d.id) === highlightDoc
        );
        const typeKey = targetDoc ? targetDoc.document_type : highlightDoc;

        const el = document.getElementById(`dialog-doc-${typeKey}`);
        if (el) {
            const timer = setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [isOpen, highlightDoc, checklist]);

    // Rejecting state
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/documents/intern/${internUserId}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) throw new Error('Failed to load documents');
            const data = await res.json();
            setIntern(data.intern);
            setChecklist(data.checklist);
        } catch {
            toast.error('Unable to fetch intern documents.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            fetchDocuments();
        } else {
            setRejectingDocId(null);
            setRejectionReason('');
        }
    };

    const handleApprove = (doc: DocumentItem) => {
        if (!doc.id) return;
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
                    toast.error(errors.rejection_reason || 'Failed to reject document.');
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

    const categories = Array.from(
        new Set(checklist.map((item) => item.category)),
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs"
                        >
                            <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                            Documents
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                                    <FileCheck2 className="h-5 w-5 text-primary" />
                                    Requirements Checklist: {internName}
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-1">
                                    {intern ? (
                                        <span>
                                            ID: {intern.id_number || '—'} • Program: {intern.program} • HTE: {intern.hte}
                                        </span>
                                    ) : (
                                        'Review and verify uploaded PDF requirement forms.'
                                    )}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-sm">Loading documents...</span>
                            </div>
                        ) : checklist.length === 0 ? (
                            <p className="text-center py-8 text-sm text-muted-foreground">
                                No document requirements configured.
                            </p>
                        ) : (
                            categories.map((cat) => {
                                const catItems = checklist.filter(
                                    (i) => i.category === cat,
                                );
                                return (
                                    <div key={cat} className="space-y-3">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                                            {cat}
                                        </h4>

                                        <div className="space-y-3">
                                            {catItems.map((doc) => {
                                                const hasUploaded =
                                                    doc.status !== 'missing';
                                                const isRejecting =
                                                    rejectingDocId === doc.id;
                                                const isHighlighted =
                                                    highlightDoc === doc.document_type ||
                                                    (doc.id !== null && highlightDoc === String(doc.id));

                                                return (
                                                    <div
                                                        key={doc.document_type}
                                                        id={`dialog-doc-${doc.document_type}`}
                                                        className={cn(
                                                            "rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300",
                                                            isHighlighted && "ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10 shadow-md"
                                                        )}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                            <div className="space-y-1 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-semibold text-sm text-foreground">
                                                                        {doc.name}
                                                                    </span>
                                                                    {isHighlighted && (
                                                                        <Badge className="bg-primary text-primary-foreground font-semibold text-[10px] uppercase gap-1 animate-pulse">
                                                                            <Sparkles className="size-3" />
                                                                            Focus
                                                                        </Badge>
                                                                    )}
                                                                    {doc.required && (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="text-[10px] uppercase font-semibold"
                                                                        >
                                                                            Required
                                                                        </Badge>
                                                                    )}
                                                                    {getStatusBadge(
                                                                        doc.status,
                                                                    )}
                                                                </div>

                                                                <p className="text-xs text-muted-foreground">
                                                                    {doc.description}
                                                                </p>

                                                                {hasUploaded && (
                                                                    <div className="mt-2 text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                        <span className="font-medium text-foreground flex items-center gap-1">
                                                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                                                            {doc.original_filename}
                                                                        </span>
                                                                        {doc.file_size && (
                                                                            <span>• {doc.file_size}</span>
                                                                        )}
                                                                        {doc.submitted_at && (
                                                                            <span>• Submitted {doc.submitted_at}</span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {doc.status === 'rejected' && doc.rejection_reason && (
                                                                    <Alert
                                                                        variant="destructive"
                                                                        className="mt-2 text-xs py-2 bg-destructive/10"
                                                                    >
                                                                        <AlertDescription>
                                                                            <strong>Feedback:</strong> {doc.rejection_reason}
                                                                        </AlertDescription>
                                                                    </Alert>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            {hasUploaded && (
                                                                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-start">
                                                                    {doc.preview_url && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs gap-1"
                                                                            onClick={() =>
                                                                                setPreviewDoc(
                                                                                    doc,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                            Preview
                                                                        </Button>
                                                                    )}

                                                                    {doc.download_url && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs gap-1"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    doc.download_url
                                                                                }
                                                                                download
                                                                            >
                                                                                <Download className="h-3.5 w-3.5" />
                                                                            </a>
                                                                        </Button>
                                                                    )}

                                                                    {doc.status !== 'approved' && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                            disabled={
                                                                                isSubmittingAction
                                                                            }
                                                                            onClick={() =>
                                                                                handleApprove(
                                                                                    doc,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Check className="h-3.5 w-3.5" />
                                                                            Approve
                                                                        </Button>
                                                                    )}

                                                                    {doc.status !== 'rejected' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            className="h-7 text-xs gap-1"
                                                                            disabled={
                                                                                isSubmittingAction
                                                                            }
                                                                            onClick={() => {
                                                                                setRejectingDocId(
                                                                                    doc.id,
                                                                                );
                                                                                setRejectionReason(
                                                                                    '',
                                                                                );
                                                                            }}
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                            Reject
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Rejection Form Box */}
                                                        {isRejecting && (
                                                            <div className="mt-3 border-t border-border pt-3 space-y-2">
                                                                <Label className="text-xs font-medium">
                                                                    Reason / Correction Notes for the Intern:
                                                                </Label>
                                                                <Textarea
                                                                    value={rejectionReason}
                                                                    onChange={(e) =>
                                                                        setRejectionReason(
                                                                            e.target
                                                                        .value,
                                                                        )
                                                                    }
                                                                    placeholder="e.g., Missing signature on page 2, or blurry photocopy..."
                                                                    rows={2}
                                                                    className="text-xs"
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 text-xs"
                                                                        onClick={() =>
                                                                            setRejectingDocId(
                                                                                null,
                                                                            )
                                                                        }
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-7 text-xs gap-1"
                                                                        disabled={
                                                                            isSubmittingAction ||
                                                                            !rejectionReason.trim()
                                                                        }
                                                                        onClick={() =>
                                                                            handleRejectSubmit(
                                                                                doc.id!,
                                                                            )
                                                                        }
                                                                    >
                                                                        {isSubmittingAction ? (
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        ) : null}
                                                                        Submit Rejection
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
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

            {/* Sub-dialog for PDF Preview */}
            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => {
                    if (!open) setPreviewDoc(null);
                }}
            >
                <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0 overflow-hidden z-50">
                    <DialogHeader className="px-5 py-3 border-b border-border flex flex-row items-center justify-between shrink-0">
                        <div>
                            <DialogTitle className="text-base font-semibold">
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
                                    className="h-8 gap-1.5 text-xs"
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
                                    className="h-8 gap-1.5 text-xs"
                                    asChild
                                >
                                    <a
                                        href={previewDoc.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open in New Tab
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
                                Unable to load PDF preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
