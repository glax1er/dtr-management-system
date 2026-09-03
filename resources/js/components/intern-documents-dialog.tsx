import { router } from '@inertiajs/react';
import {
    Check,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Loader2,
    Sparkles,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

    const fetchDocuments = useCallback(async () => {
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
    }, [internUserId]);

    // Auto-fetch if defaultOpen
    useEffect(() => {
        if (defaultOpen) {
            fetchDocuments();
        }
    }, [defaultOpen, fetchDocuments]);

    // Scroll to highlighted doc when checklist loads
    useEffect(() => {
        if (!isOpen || !highlightDoc || checklist.length === 0) return;

        const targetDoc = checklist.find(
            (d) =>
                d.document_type === highlightDoc ||
                String(d.id) === highlightDoc,
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

    // DTR Report date filter state
    const [dtrStartDate, setDtrStartDate] = useState('');
    const [dtrEndDate, setDtrEndDate] = useState('');

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

                <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col overflow-hidden p-0">
                    <DialogHeader className="border-b border-border px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                                    <FileCheck2 className="h-5 w-5 text-primary" />
                                    Requirements Checklist: {internName}
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-xs">
                                    {intern ? (
                                        <span>
                                            ID: {intern.id_number || '—'} •
                                            Program: {intern.program} • HTE:{' '}
                                            {intern.hte}
                                        </span>
                                    ) : (
                                        'Review and verify uploaded PDF requirement forms.'
                                    )}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 space-y-6 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <span className="text-sm">
                                    Loading documents...
                                </span>
                            </div>
                        ) : checklist.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No document requirements configured.
                            </p>
                        ) : (
                            categories.map((cat) => {
                                const catItems = checklist.filter(
                                    (i) => i.category === cat,
                                );
                                return (
                                    <div key={cat} className="space-y-3">
                                        <h4 className="border-b border-border/60 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {cat}
                                        </h4>

                                        <div className="space-y-3">
                                            {catItems.map((doc) => {
                                                const hasUploaded =
                                                    doc.status !== 'missing';
                                                const isRejecting =
                                                    rejectingDocId === doc.id;
                                                const isHighlighted =
                                                    highlightDoc ===
                                                        doc.document_type ||
                                                    (doc.id !== null &&
                                                        highlightDoc ===
                                                            String(doc.id));

                                                return (
                                                    <div
                                                        key={doc.document_type}
                                                        id={`dialog-doc-${doc.document_type}`}
                                                        className={cn(
                                                            'rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300',
                                                            isHighlighted &&
                                                                'border-primary bg-primary/5 shadow-md ring-2 ring-primary dark:bg-primary/10',
                                                        )}
                                                    >
                                                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                            <div className="flex-1 space-y-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="text-sm font-semibold text-foreground">
                                                                        {
                                                                            doc.name
                                                                        }
                                                                    </span>
                                                                    {isHighlighted && (
                                                                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                            <Sparkles className="size-3" />
                                                                            Focus
                                                                        </Badge>
                                                                    )}
                                                                    {doc.required && (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="text-[10px] font-semibold uppercase"
                                                                        >
                                                                            Required
                                                                        </Badge>
                                                                    )}
                                                                    {getStatusBadge(
                                                                        doc.status,
                                                                    )}
                                                                </div>

                                                                <p className="text-xs text-muted-foreground">
                                                                    {
                                                                        doc.description
                                                                    }
                                                                </p>

                                                                {hasUploaded && (
                                                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                        <span className="flex items-center gap-1 font-medium text-foreground">
                                                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                                                            {
                                                                                doc.original_filename
                                                                            }
                                                                        </span>
                                                                        {doc.file_size && (
                                                                            <span>
                                                                                •{' '}
                                                                                {
                                                                                    doc.file_size
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        {doc.submitted_at && (
                                                                            <span>
                                                                                •
                                                                                Submitted{' '}
                                                                                {
                                                                                    doc.submitted_at
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {doc.status ===
                                                                    'rejected' &&
                                                                    doc.rejection_reason && (
                                                                        <Alert
                                                                            variant="destructive"
                                                                            className="mt-2 bg-destructive/10 py-2 text-xs"
                                                                        >
                                                                            <AlertDescription>
                                                                                <strong>
                                                                                    Feedback:
                                                                                </strong>{' '}
                                                                                {
                                                                                    doc.rejection_reason
                                                                                }
                                                                            </AlertDescription>
                                                                        </Alert>
                                                                    )}
                                                            </div>

                                                            {/* Actions */}
                                                            {hasUploaded && (
                                                                <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-start">
                                                                    {doc.preview_url && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 gap-1 text-xs"
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
                                                                            className="h-7 gap-1 text-xs"
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

                                                                    {doc.status !==
                                                                        'approved' && (
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-7 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
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

                                                                    {doc.status !==
                                                                        'rejected' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            className="h-7 gap-1 text-xs"
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
                                                            <div className="mt-3 space-y-2 border-t border-border pt-3">
                                                                <Label className="text-xs font-medium">
                                                                    Reason /
                                                                    Correction
                                                                    Notes for
                                                                    the Intern:
                                                                </Label>
                                                                <Textarea
                                                                    value={
                                                                        rejectionReason
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setRejectionReason(
                                                                            e
                                                                                .target
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
                                                                        className="h-7 gap-1 text-xs"
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
                                                                        Submit
                                                                        Rejection
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Official System DTR Report Generator */}
                                                        {doc.document_type ===
                                                            'dtr' && (
                                                            <div className="mt-3 space-y-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                                                                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                                                    <div className="space-y-0.5">
                                                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                                            <FileCheck2 className="h-4 w-4 text-primary" />
                                                                            Generate
                                                                            &
                                                                            Download
                                                                            Official
                                                                            DTR
                                                                            Report
                                                                        </span>
                                                                        <p className="text-[11px] text-muted-foreground">
                                                                            Filter
                                                                            by
                                                                            date
                                                                            range,
                                                                            or
                                                                            leave
                                                                            blank
                                                                            to
                                                                            download
                                                                            the
                                                                            full
                                                                            DTR
                                                                            report
                                                                            up
                                                                            to
                                                                            the
                                                                            most
                                                                            recent
                                                                            log.
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 shrink-0 gap-1.5 text-xs shadow-sm"
                                                                        onClick={() => {
                                                                            let url = `/supervisor/interns/${internUserId}/dtr-report`;
                                                                            const params =
                                                                                new URLSearchParams();
                                                                            if (
                                                                                dtrStartDate
                                                                            )
                                                                                params.append(
                                                                                    'start',
                                                                                    dtrStartDate,
                                                                                );
                                                                            if (
                                                                                dtrEndDate
                                                                            )
                                                                                params.append(
                                                                                    'end',
                                                                                    dtrEndDate,
                                                                                );
                                                                            const queryString =
                                                                                params.toString();
                                                                            if (
                                                                                queryString
                                                                            )
                                                                                url += `?${queryString}`;
                                                                            window.open(
                                                                                url,
                                                                                '_blank',
                                                                                'noopener',
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        Download
                                                                        DTR
                                                                    </Button>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 pt-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-muted-foreground">
                                                                            From:
                                                                        </span>
                                                                        <input
                                                                            type="date"
                                                                            value={
                                                                                dtrStartDate
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setDtrStartDate(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-muted-foreground">
                                                                            To:
                                                                        </span>
                                                                        <input
                                                                            type="date"
                                                                            value={
                                                                                dtrEndDate
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setDtrEndDate(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                                                        />
                                                                    </div>
                                                                    {(dtrStartDate ||
                                                                        dtrEndDate) && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                                                            onClick={() => {
                                                                                setDtrStartDate(
                                                                                    '',
                                                                                );
                                                                                setDtrEndDate(
                                                                                    '',
                                                                                );
                                                                            }}
                                                                        >
                                                                            Reset
                                                                            (Full
                                                                            DTR)
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
                <DialogContent className="z-50 flex h-[85vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border px-5 py-3">
                        <div>
                            <DialogTitle className="text-base font-semibold">
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
