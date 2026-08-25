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
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
}

export function InternDocumentsDialog({
    internUserId,
    internName,
    trigger,
}: InternDocumentsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [intern, setIntern] = useState<InternInfo | null>(null);
    const [checklist, setChecklist] = useState<DocumentItem[]>([]);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

    // Rejecting state
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    // DTR Report date filter state
    const [dtrStartDate, setDtrStartDate] = useState('');
    const [dtrEndDate, setDtrEndDate] = useState('');

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
            setDtrStartDate('');
            setDtrEndDate('');
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
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Approved
                    </Badge>
                );
            case 'pending_review':
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-400">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Pending Review
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/20 dark:text-red-400">
                        <AlertCircle className="mr-1 h-3.5 w-3.5" />
                        Needs Revision
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-muted-foreground">
                        Not Submitted
                    </Badge>
                );
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

                                                return (
                                                    <div
                                                        key={doc.document_type}
                                                        className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all"
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                            <div className="space-y-1 flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-semibold text-sm text-foreground">
                                                                        {doc.name}
                                                                    </span>
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

                                                        {/* Official System DTR Report Generator */}
                                                        {doc.document_type === 'dtr' && (
                                                            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                                            <FileCheck2 className="h-4 w-4 text-primary" />
                                                                            Generate & Download Official DTR Report
                                                                        </span>
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            Filter by date range, or leave blank to download the full DTR report up to the most recent log.
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 gap-1.5 text-xs shrink-0 shadow-sm"
                                                                        onClick={() => {
                                                                            let url = `/supervisor/interns/${internUserId}/dtr-report`;
                                                                            const params = new URLSearchParams();
                                                                            if (dtrStartDate) params.append('start', dtrStartDate);
                                                                            if (dtrEndDate) params.append('end', dtrEndDate);
                                                                            const queryString = params.toString();
                                                                            if (queryString) url += `?${queryString}`;
                                                                            window.open(url, '_blank', 'noopener');
                                                                        }}
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        Download DTR
                                                                    </Button>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/15">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-muted-foreground">From:</span>
                                                                        <input
                                                                            type="date"
                                                                            value={dtrStartDate}
                                                                            onChange={(e) => setDtrStartDate(e.target.value)}
                                                                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-muted-foreground">To:</span>
                                                                        <input
                                                                            type="date"
                                                                            value={dtrEndDate}
                                                                            onChange={(e) => setDtrEndDate(e.target.value)}
                                                                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                                        />
                                                                    </div>
                                                                    {(dtrStartDate || dtrEndDate) && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                                                            onClick={() => {
                                                                                setDtrStartDate('');
                                                                                setDtrEndDate('');
                                                                            }}
                                                                        >
                                                                            Reset (Full DTR)
                                                                        </Button>
                                                                    )}
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
