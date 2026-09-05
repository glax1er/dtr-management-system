import { useState } from 'react';
import {
    ArrowRight,
    Award,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileCheck2,
    FileText,
    GraduationCap,
    Loader2,
    PlayCircle,
    Timer,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface InternInfo {
    user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    program_name: string;
    hte_name: string;
    hte_contact_person: string | null;
    photo_url?: string | null;
    hte_address?: string | null;
    hte_contact_number?: string | null;
    registered_at?: string | null;
    approved_at?: string | null;
}

interface HoursInfo {
    required_hours: number;
    total_hours: number;
    progress_percent: number;
    hours_completed: boolean;
    total_days_attended: number;
    first_attendance_date: string | null;
    last_attendance_date: string | null;
}

interface DocumentChecklistItem {
    document_type: string;
    name: string;
    category: string;
    description?: string | null;
    required: boolean;
    status: 'approved' | 'pending_review' | 'rejected' | 'missing';
    id?: number | null;
    original_filename?: string | null;
    file_size?: string | null;
    rejection_reason?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    reviewer_name?: string | null;
    preview_url?: string | null;
    download_url?: string | null;
}

interface DocumentsInfo {
    total_required: number;
    approved_required: number;
    docs_completed: boolean;
    checklist: DocumentChecklistItem[];
}

interface CompletionInfo {
    is_completed: boolean;
    status: 'completed' | 'hours_met_documents_pending' | 'documents_met_hours_pending' | 'in_progress';
    completion_date: string | null;
    generated_at: string;
    supervisor_name?: string;
}

interface CompletionSummaryData {
    intern: InternInfo;
    hours: HoursInfo;
    documents: DocumentsInfo;
    completion: CompletionInfo;
}

interface CompletionSummaryDialogProps {
    internUserId: number;
    internName: string;
    isCompleted?: boolean;
    trigger?: React.ReactNode;
}

export function CompletionSummaryDialog({
    internUserId,
    internName,
    isCompleted = false,
    trigger,
}: CompletionSummaryDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<CompletionSummaryData | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/supervisor/interns/${internUserId}/completion-summary`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) throw new Error('Failed to load completion summary');
            const data = await res.json();
            setSummary(data);
        } catch {
            toast.error('Unable to load completion summary.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            fetchSummary();
        }
    };

    const getDocStatusBadge = (status: DocumentChecklistItem['status']) => {
        switch (status) {
            case 'approved':
                return <StatusBadge status="approved" />;
            case 'pending_review':
                return <StatusBadge status="pending_review" />;
            case 'rejected':
                return <StatusBadge status="rejected" label="Needs Revision" />;
            default:
                return <StatusBadge status="not_uploaded" label="Not Uploaded" />;
        }
    };

    const remainingHours = summary
        ? Math.max(0, summary.hours.required_hours - summary.hours.total_hours)
        : 0;

    const velocity = summary && summary.hours.total_days_attended > 0
        ? summary.hours.total_hours / summary.hours.total_days_attended
        : 0;

    const estDaysRemaining = velocity > 0 && remainingHours > 0
        ? Math.ceil(remainingHours / velocity)
        : null;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : isCompleted ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                    >
                        <Award className="mr-1.5 size-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden md:inline">Summary of Completion</span>
                        <span className="md:hidden">Summary</span>
                    </Button>
                ) : (
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <FileText className="mr-1.5 size-4" />
                        <span className="hidden md:inline">Summary</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
                {isLoading || !summary ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading summary for {internName}...</p>
                    </div>
                ) : (
                    <>
                        {/* Header with safety margin from the close button */}
                        <DialogHeader className="px-6 py-4 border-b border-border bg-card/40 pr-14 sm:pr-16 text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div
                                        className={`flex size-11 items-center justify-center rounded-xl shadow-xs shrink-0 ${
                                            summary.completion.is_completed
                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                : 'bg-primary/10 text-primary border border-primary/20'
                                        }`}
                                    >
                                        <GraduationCap className="size-5.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground leading-snug">
                                            Intern Summary: {summary.intern.name}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs mt-1 text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-normal">
                                            <span>
                                                ID: <span className="text-foreground font-medium">{summary.intern.id_number ?? '—'}</span>
                                            </span>
                                            <span className="text-border">•</span>
                                            <span>
                                                Program: <span className="text-foreground font-medium">{summary.intern.program_name}</span>
                                            </span>
                                            <span className="text-border">•</span>
                                            <span>
                                                HTE: <span className="text-foreground font-medium">{summary.intern.hte_name}</span>
                                            </span>
                                            {summary.intern.hte_contact_person && (
                                                <>
                                                    <span className="text-border">•</span>
                                                    <span>
                                                        Supv: <span className="text-foreground font-medium">{summary.intern.hte_contact_person}</span>
                                                    </span>
                                                </>
                                            )}
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="self-start sm:self-center shrink-0">
                                    {summary.completion.is_completed ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs px-3 py-1 gap-1.5 shadow-2xs font-semibold">
                                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                            Completed
                                        </Badge>
                                    ) : summary.hours.hours_completed ? (
                                        <Badge
                                            variant="outline"
                                            className="text-xs px-3 py-1 font-semibold gap-1.5 shadow-2xs border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20"
                                        >
                                            <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                                            Hours Met • Docs Pending
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-xs px-3 py-1 font-semibold gap-1.5 shadow-2xs border-border/80 bg-muted/80 text-foreground dark:bg-muted dark:text-foreground hover:bg-muted"
                                        >
                                            <Clock className="size-3.5 text-muted-foreground dark:text-muted-foreground" />
                                            {Math.round(summary.hours.progress_percent)}% Rendered
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Top KPI Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="shadow-none border border-border/70 bg-card/60 rounded-xl">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="size-3.5 text-primary" />
                                                <span>Total Hours Rendered</span>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={`text-[11px] font-semibold px-2 py-0.5 shrink-0 ${
                                                    summary.hours.hours_completed
                                                        ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300'
                                                        : ''
                                                }`}
                                            >
                                                {Math.round(summary.hours.progress_percent)}%
                                            </Badge>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                                {summary.hours.total_hours}
                                            </span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                / {summary.hours.required_hours} hrs
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    summary.hours.hours_completed ? 'bg-emerald-500' : 'bg-primary'
                                                }`}
                                                style={{ width: `${Math.min(100, summary.hours.progress_percent)}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none border border-border/70 bg-card/60 rounded-xl">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Timer className="size-3.5 text-amber-500" />
                                                <span>Remaining Hours</span>
                                            </div>
                                            <Calendar className="size-3.5 text-muted-foreground/70" />
                                        </div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            {summary.hours.hours_completed ? (
                                                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                                    Target Met
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-2xl font-bold tracking-tight text-foreground">
                                                        {remainingHours.toFixed(1)}
                                                    </span>
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        hrs left
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <CalendarDays className="size-3 text-muted-foreground/70" />
                                            <span>{summary.hours.total_days_attended} total days logged</span>
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none border border-border/70 bg-card/60 rounded-xl">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <FileCheck2 className="size-3.5 text-blue-500" />
                                                <span>Mandatory Documents</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`text-[11px] font-semibold px-2 py-0.5 shrink-0 ${
                                                    summary.documents.docs_completed
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-border text-muted-foreground'
                                                }`}
                                            >
                                                {summary.documents.approved_required}/{summary.documents.total_required}
                                            </Badge>
                                        </div>
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                                {summary.documents.approved_required}
                                            </span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                / {summary.documents.total_required} approved
                                            </span>
                                        </div>
                                        <p className={`text-xs ${summary.documents.docs_completed ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'} flex items-center gap-1.5`}>
                                            {summary.documents.docs_completed ? (
                                                <>
                                                    <CheckCircle2 className="size-3" />
                                                    <span>All required documents cleared</span>
                                                </>
                                            ) : (
                                                <span>
                                                    {Math.max(0, summary.documents.total_required - summary.documents.approved_required)} document(s) pending approval
                                                </span>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Core 2-Column Responsive Breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                                {/* Left Column: Attendance & Timeline Summary */}
                                <Card className="lg:col-span-5 shadow-none border border-border/70 bg-card/60 rounded-xl flex flex-col">
                                    <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Clock className="size-4 text-primary" />
                                            Attendance &amp; Timeline
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs font-normal">
                                            {summary.hours.total_days_attended} Days Logged
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            {/* Visual Attendance Journey (Start to Latest Log) */}
                                            <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5 space-y-2.5">
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Internship Period
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <PlayCircle className="size-3.5 text-primary shrink-0" />
                                                            <span>Start Date</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-foreground truncate">
                                                            {summary.hours.first_attendance_date ?? 'No logs yet'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center px-2 shrink-0">
                                                        <ArrowRight className="size-4 text-muted-foreground/60" />
                                                    </div>

                                                    <div className="space-y-0.5 min-w-0 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                                            <span>{summary.hours.hours_completed ? 'Completion Date' : 'Latest Date'}</span>
                                                            {summary.hours.hours_completed ? (
                                                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                                            ) : (
                                                                <Clock className="size-3.5 text-amber-600 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-semibold text-foreground truncate">
                                                            {summary.hours.last_attendance_date ?? 'No logs yet'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mini Stat Tiles for Attendance Metrics */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-1">
                                                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                                                        <span>Days Rendered</span>
                                                        <CalendarDays className="size-3.5 text-primary" />
                                                    </div>
                                                    <p className="text-base font-bold text-foreground">
                                                        {summary.hours.total_days_attended}{' '}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            Days
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="rounded-lg border border-border/70 bg-background/80 p-3 space-y-1">
                                                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                                                        <span>Avg. Hours / Day</span>
                                                        <TrendingUp className="size-3.5 text-primary" />
                                                    </div>
                                                    <p className="text-base font-bold text-foreground">
                                                        {velocity.toFixed(1)}{' '}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            hrs/day
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status / Requirement Row with Velocity Estimate */}
                                        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs mt-2">
                                            <span className="text-muted-foreground font-medium">Hours Requirement</span>
                                            {summary.hours.hours_completed ? (
                                                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 text-[11px] font-semibold self-start sm:self-auto">
                                                    <CheckCircle2 className="size-3" /> Target Hours Met
                                                </Badge>
                                            ) : (
                                                <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                                                    <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/10 text-[11px] font-semibold">
                                                        {remainingHours.toFixed(1)} hrs remaining
                                                    </Badge>
                                                    {estDaysRemaining && (
                                                        <span className="text-[11px] text-muted-foreground">
                                                            (~{estDaysRemaining} days at current pace)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Right Column: Clearance Checklist */}
                                <Card className="lg:col-span-7 shadow-none border border-border/70 bg-card/60 rounded-xl flex flex-col">
                                    <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <FileCheck2 className="size-4 text-primary" />
                                            Document Clearance Checklist
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs font-normal">
                                            {summary.documents.approved_required} / {summary.documents.total_required} Approved
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 flex flex-col justify-between">
                                        {summary.documents.checklist.length === 0 ? (
                                            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 flex-1">
                                                <FileText className="size-8 text-muted-foreground/40" />
                                                <p>No document requirements configured for this program.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/60 text-xs max-h-[320px] overflow-y-auto">
                                                {summary.documents.checklist.map((doc) => (
                                                    <div
                                                        key={doc.document_type}
                                                        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors gap-3"
                                                    >
                                                        <div className="space-y-0.5 pr-2 min-w-0 flex-1">
                                                            <div className="font-medium text-foreground flex items-center gap-1.5 truncate">
                                                                <span className="truncate">{doc.name}</span>
                                                                {doc.required && (
                                                                    <span className="text-rose-500 font-bold text-xs shrink-0" title="Mandatory Requirement">
                                                                        *
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {doc.category && (
                                                                <p className="text-[11px] text-muted-foreground truncate">
                                                                    {doc.category}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {doc.preview_url && (
                                                                <a
                                                                    href={doc.preview_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                                                    title="Preview Document"
                                                                >
                                                                    <ExternalLink className="size-3.5" />
                                                                </a>
                                                            )}
                                                            {getDocStatusBadge(doc.status)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="p-3 bg-muted/10 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
                                            <span className="text-rose-500 font-bold">*</span>
                                            <span>Mandatory documents required for internship clearance.</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Clean Footer */}
                        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="text-[11px] text-muted-foreground">
                                Generated on {summary.completion.generated_at}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
