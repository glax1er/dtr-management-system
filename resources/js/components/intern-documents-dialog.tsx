import { router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    Check,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileCheck2,
    FileText,
    FileX2,
    Loader2,
    RotateCcw,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

    // Rejecting state - store the specific numeric ID of the doc being rejected
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
                return <StatusBadge status="approved" />;
            case 'pending_review':
                return <StatusBadge status="pending_review" />;
            case 'rejected':
                return <StatusBadge status="rejected" label="Needs Revision" />;
            default:
                return <StatusBadge status="not_submitted" label="Not Uploaded" />;
        }
    };

    const categories = Array.from(
        new Set(checklist.map((item) => item.category)),
    );

    // Summary calculations
    const totalRequired = checklist.filter((i) => i.required).length;
    const approvedRequired = checklist.filter((i) => i.required && i.status === 'approved').length;
    const pendingReviewCount = checklist.filter((i) => i.status === 'pending_review').length;
    const needsRevisionCount = checklist.filter((i) => i.status === 'rejected').length;
    const missingCount = checklist.filter((i) => i.status === 'missing' || !i.id).length;
    const clearancePercent = totalRequired > 0 ? Math.round((approvedRequired / totalRequired) * 100) : 100;
    const isAllRequiredApproved = totalRequired > 0 && approvedRequired >= totalRequired;

    // Render single document item card
    const renderDocCard = (doc: DocumentItem) => {
        const hasUploaded = Boolean(doc.id && doc.status !== 'missing');
        const isRejecting = Boolean(doc.id && rejectingDocId === doc.id);

        return (
            <div
                key={doc.document_type}
                className="rounded-xl border border-border/70 bg-card/60 p-4 text-card-foreground shadow-2xs transition-all hover:border-primary/30 space-y-3"
            >
                {/* 1. Header: Icon + Title & Badges */}
                <div className="flex items-start gap-3">
                    <div className={`flex size-8.5 items-center justify-center rounded-lg border shrink-0 mt-0.5 ${
                        doc.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : doc.status === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : doc.status === 'rejected'
                            ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : 'bg-muted/60 text-muted-foreground border-border/60'
                    }`}>
                        {doc.status === 'approved' ? (
                            <CheckCircle2 className="size-4.5" />
                        ) : doc.status === 'pending_review' ? (
                            <Clock className="size-4.5" />
                        ) : doc.status === 'rejected' ? (
                            <AlertCircle className="size-4.5" />
                        ) : (
                            <FileText className="size-4.5" />
                        )}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base text-foreground leading-tight">
                                {doc.name}
                            </span>
                            {doc.required ? (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold uppercase px-1.5 py-0 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10"
                                >
                                    Required
                                </Badge>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] font-normal px-1.5 py-0 text-muted-foreground border-border/60 bg-muted/30"
                                >
                                    Optional
                                </Badge>
                            )}
                            {getStatusBadge(doc.status)}
                        </div>

                        {doc.description && (
                            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                                {doc.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* 2. File Attachment Tile (Uploaded) or Clean Placeholder (Not Uploaded) */}
                {hasUploaded ? (
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
                            <span className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-full sm:max-w-md">
                                <FileText className="size-3.5 text-primary shrink-0" />
                                <span className="truncate">{doc.original_filename}</span>
                            </span>
                            {doc.file_size && (
                                <span>• {doc.file_size}</span>
                            )}
                            {doc.submitted_at && (
                                <span>• Submitted {doc.submitted_at}</span>
                            )}
                        </div>
                        {doc.status === 'approved' && (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="size-3" /> Approved
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <FileX2 className="size-3.5 opacity-60 shrink-0" />
                            <span>Not uploaded yet</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/60">
                            {doc.required ? 'Pending intern submission' : 'Optional requirement'}
                        </span>
                    </div>
                )}

                {/* 3. Action Toolbar (Only for uploaded documents) */}
                {hasUploaded && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/50">
                        {/* Left: Preview & Download */}
                        <div className="flex items-center gap-1.5">
                            {doc.preview_url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7.5 text-xs gap-1.5 font-medium hover:bg-muted"
                                    onClick={() => setPreviewDoc(doc)}
                                >
                                    <Eye className="size-3.5 text-muted-foreground" />
                                    Preview
                                </Button>
                            )}

                            {doc.download_url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7.5 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium"
                                    title="Download file"
                                    asChild
                                >
                                    <a href={doc.download_url} download>
                                        <Download className="size-3.5" />
                                    </a>
                                </Button>
                            )}
                        </div>

                        {/* Right: Approve & Reject */}
                        <div className="flex items-center gap-1.5">
                            {doc.status !== 'approved' && (
                                <Button
                                    size="sm"
                                    className="h-7.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                                    disabled={isSubmittingAction}
                                    onClick={() => handleApprove(doc)}
                                >
                                    <Check className="size-3.5" />
                                    Approve
                                </Button>
                            )}

                            {doc.status !== 'rejected' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7.5 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 font-medium"
                                    disabled={isSubmittingAction}
                                    onClick={() => {
                                        if (doc.id) {
                                            setRejectingDocId(doc.id);
                                            setRejectionReason('');
                                        }
                                    }}
                                >
                                    <X className="size-3.5" />
                                    Reject
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. Revision Feedback Box (if rejected) */}
                {doc.status === 'rejected' && doc.rejection_reason && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>Revision Note:</span>
                        </div>
                        <p className="text-foreground/90 pl-5 leading-relaxed">
                            {doc.rejection_reason}
                        </p>
                    </div>
                )}

                {/* 5. Rejection Form Accordion Box (Only for the actively rejected doc) */}
                {hasUploaded && isRejecting && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <AlertCircle className="size-3.5 text-destructive" />
                            Reason for Rejection:
                        </Label>
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Missing signature on page 2, blurry scan..."
                            rows={2}
                            className="text-xs bg-background focus-visible:ring-destructive/30"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7.5 text-xs font-medium"
                                onClick={() => {
                                    setRejectingDocId(null);
                                    setRejectionReason('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-7.5 text-xs gap-1.5 font-medium shadow-xs"
                                disabled={isSubmittingAction || !rejectionReason.trim()}
                                onClick={() => handleRejectSubmit(doc.id!)}
                            >
                                {isSubmittingAction ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <X className="size-3.5" />
                                )}
                                Submit Rejection
                            </Button>
                        </div>
                    </div>
                )}

                {/* 6. Official System DTR Report Generator */}
                {doc.document_type === 'dtr' && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <FileCheck2 className="size-4 text-primary" />
                                Generate Official DTR Report
                            </span>
                            <Button
                                size="sm"
                                className="h-7.5 gap-1.5 text-xs font-medium shrink-0 shadow-xs"
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
                                <Download className="size-3.5" />
                                Download DTR (PDF)
                            </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/15">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground">From:</span>
                                <input
                                    type="date"
                                    value={dtrStartDate}
                                    onChange={(e) => setDtrStartDate(e.target.value)}
                                    className="h-6.5 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground">To:</span>
                                <input
                                    type="date"
                                    value={dtrEndDate}
                                    onChange={(e) => setDtrEndDate(e.target.value)}
                                    className="h-6.5 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            {(dtrStartDate || dtrEndDate) && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6.5 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                    onClick={() => {
                                        setDtrStartDate('');
                                        setDtrEndDate('');
                                    }}
                                >
                                    <RotateCcw className="size-3" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs font-medium"
                        >
                            <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                            Documents
                        </Button>
                    )}
                </DialogTrigger>

                <DialogContent className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
                    {/* Header */}
                    <DialogHeader className="px-6 py-4 border-b border-border bg-card/40 pr-12 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
                                <FileCheck2 className="size-4.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-tight">
                                    Requirements: {internName}
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5 text-muted-foreground truncate">
                                    {intern ? `${intern.id_number || '—'} • ${intern.program} • ${intern.hte}` : 'Document Verification'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                                <Loader2 className="size-8 animate-spin text-primary" />
                                <p className="text-sm font-medium">Loading requirements...</p>
                            </div>
                        ) : checklist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 text-center">
                                <FileX2 className="size-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-foreground">No document requirements configured.</p>
                                <p className="text-xs">There are no requirement forms assigned to this program.</p>
                            </div>
                        ) : (
                            <>
                                {/* Top Clearance Overview Strip (Compact) */}
                                <Card className="shadow-none border border-border/70 bg-card/60 rounded-xl">
                                    <CardContent className="p-4 space-y-2.5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">Clearance Progress</span>
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[11px] font-semibold px-2 py-0.5 ${
                                                        isAllRequiredApproved
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                            : ''
                                                    }`}
                                                >
                                                    {clearancePercent}%
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <CheckCircle2 className="size-3.5" />
                                                    <span>{approvedRequired}/{totalRequired} Approved</span>
                                                </span>
                                                {pendingReviewCount > 0 && (
                                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                                        <Clock className="size-3.5" />
                                                        <span>{pendingReviewCount} Pending</span>
                                                    </span>
                                                )}
                                                {needsRevisionCount > 0 && (
                                                    <span className="flex items-center gap-1 text-destructive font-medium">
                                                        <AlertCircle className="size-3.5" />
                                                        <span>{needsRevisionCount} Needs Revision</span>
                                                    </span>
                                                )}
                                                {missingCount > 0 && (
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        <span className="size-2 rounded-full bg-slate-400" />
                                                        <span>{missingCount} Not Uploaded</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    isAllRequiredApproved ? 'bg-emerald-500' : 'bg-primary'
                                                }`}
                                                style={{ width: `${Math.min(100, clearancePercent)}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Tabs Categorized by Stage/Category */}
                                <Tabs defaultValue={categories[0] || 'all'} className="w-full space-y-3">
                                    <div className="overflow-x-auto pb-1">
                                        <TabsList className="h-9 p-1 bg-muted/60 w-full sm:w-auto inline-flex justify-start">
                                            <TabsTrigger value="all" className="text-xs px-3 h-7 gap-1.5">
                                                All
                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 text-center font-normal">
                                                    {checklist.length}
                                                </Badge>
                                            </TabsTrigger>
                                            {categories.map((cat) => {
                                                const catItems = checklist.filter((i) => i.category === cat);
                                                const catApproved = catItems.filter((i) => i.status === 'approved').length;
                                                const catPending = catItems.filter((i) => i.status === 'pending_review').length;

                                                return (
                                                    <TabsTrigger key={cat} value={cat} className="text-xs px-3 h-7 gap-1.5 whitespace-nowrap">
                                                        <span>{cat}</span>
                                                        <Badge
                                                            variant={catApproved === catItems.length && catItems.length > 0 ? "secondary" : "outline"}
                                                            className={`text-[10px] px-1 py-0 h-4 font-normal ${
                                                                catPending > 0
                                                                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {catApproved}/{catItems.length}
                                                        </Badge>
                                                    </TabsTrigger>
                                                );
                                            })}
                                        </TabsList>
                                    </div>

                                    {/* All Tab View */}
                                    <TabsContent value="all" className="space-y-3 mt-0">
                                        {checklist.map(renderDocCard)}
                                    </TabsContent>

                                    {/* Individual Category Tabs */}
                                    {categories.map((cat) => {
                                        const catItems = checklist.filter((i) => i.category === cat);
                                        return (
                                            <TabsContent key={cat} value={cat} className="space-y-3 mt-0">
                                                {catItems.map(renderDocCard)}
                                            </TabsContent>
                                        );
                                    })}
                                </Tabs>
                            </>
                        )}
                    </div>

                    {/* Clean Dialog Footer */}
                    <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span className="text-rose-500 font-bold">*</span>
                            <span>Mandatory documents must be approved for clearance.</span>
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sub-dialog for PDF Preview */}
            <Dialog
                open={previewDoc !== null}
                onOpenChange={(open) => {
                    if (!open) setPreviewDoc(null);
                }}
            >
                <DialogContent className="w-[96vw] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl h-[88vh] p-0 flex flex-col gap-0 overflow-hidden z-50 rounded-xl shadow-2xl">
                    <DialogHeader className="px-6 py-3.5 border-b border-border bg-card/40 flex flex-row items-center justify-between shrink-0 pr-12 text-left">
                        <div className="min-w-0 pr-4">
                            <DialogTitle className="text-base font-semibold text-foreground leading-snug">
                                {previewDoc?.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground truncate max-w-md">
                                {previewDoc?.original_filename}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {previewDoc?.download_url && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7.5 gap-1.5 text-xs font-medium"
                                    asChild
                                >
                                    <a href={previewDoc.download_url} download>
                                        <Download className="size-3.5" />
                                        Download
                                    </a>
                                </Button>
                            )}
                            {previewDoc?.preview_url && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7.5 gap-1.5 text-xs font-medium"
                                    asChild
                                >
                                    <a
                                        href={previewDoc.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ArrowUpRight className="size-3.5" />
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
                                Unable to load PDF preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
