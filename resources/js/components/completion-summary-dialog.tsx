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
import { useState } from 'react';
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
    status:
        | 'completed'
        | 'hours_met_documents_pending'
        | 'documents_met_hours_pending'
        | 'in_progress';
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
            const res = await fetch(
                `/supervisor/interns/${internUserId}/completion-summary`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!res.ok) {
                throw new Error('Failed to load completion summary');
            }

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
                return (
                    <StatusBadge status="not_uploaded" label="Not Uploaded" />
                );
        }
    };

    const remainingHours = summary
        ? Math.max(0, summary.hours.required_hours - summary.hours.total_hours)
        : 0;

    const velocity =
        summary && summary.hours.total_days_attended > 0
            ? summary.hours.total_hours / summary.hours.total_days_attended
            : 0;

    const estDaysRemaining =
        velocity > 0 && remainingHours > 0
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
                        <span className="hidden md:inline">
                            Summary of Completion
                        </span>
                        <span className="md:hidden">Summary</span>
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <FileText className="mr-1.5 size-4" />
                        <span className="hidden md:inline">Summary</span>
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="flex max-h-[90vh] w-[96vw] flex-col overflow-hidden p-0 shadow-2xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl">
                {isLoading || !summary ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Loading summary for {internName}...
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header with safety margin from the close button */}
                        <DialogHeader className="border-b border-border bg-card/40 px-6 py-4 pr-14 text-left sm:pr-16">
                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center gap-3.5">
                                    <div
                                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                                            summary.completion.is_completed
                                                ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                : 'border border-primary/20 bg-primary/10 text-primary'
                                        }`}
                                    >
                                        <GraduationCap className="size-5.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <DialogTitle className="text-base leading-snug font-bold tracking-tight text-foreground sm:text-xl">
                                            Intern Summary:{' '}
                                            {summary.intern.name}
                                        </DialogTitle>
                                        <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-normal text-muted-foreground">
                                            <span>
                                                ID:{' '}
                                                <span className="font-medium text-foreground">
                                                    {summary.intern.id_number ??
                                                        '—'}
                                                </span>
                                            </span>
                                            <span className="text-border">
                                                •
                                            </span>
                                            <span>
                                                Program:{' '}
                                                <span className="font-medium text-foreground">
                                                    {
                                                        summary.intern
                                                            .program_name
                                                    }
                                                </span>
                                            </span>
                                            <span className="text-border">
                                                •
                                            </span>
                                            <span>
                                                HTE:{' '}
                                                <span className="font-medium text-foreground">
                                                    {summary.intern.hte_name}
                                                </span>
                                            </span>
                                            {summary.intern
                                                .hte_contact_person && (
                                                <>
                                                    <span className="text-border">
                                                        •
                                                    </span>
                                                    <span>
                                                        Supv:{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                summary.intern
                                                                    .hte_contact_person
                                                            }
                                                        </span>
                                                    </span>
                                                </>
                                            )}
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="shrink-0 self-start sm:self-center">
                                    {summary.completion.is_completed ? (
                                        <Badge className="gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-500/20 dark:text-emerald-300">
                                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                            Completed
                                        </Badge>
                                    ) : summary.hours.hours_completed ? (
                                        <Badge
                                            variant="outline"
                                            className="gap-1.5 border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 shadow-2xs dark:bg-amber-500/20 dark:text-amber-300"
                                        >
                                            <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                                            Hours Met • Docs Pending
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="gap-1.5 border-border/80 bg-muted/80 px-3 py-1 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted dark:bg-muted dark:text-foreground"
                                        >
                                            <Clock className="size-3.5 text-muted-foreground dark:text-muted-foreground" />
                                            {Math.round(
                                                summary.hours.progress_percent,
                                            )}
                                            % Rendered
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Scrollable Content */}
                        <div className="flex-1 space-y-6 overflow-y-auto p-6">
                            {/* Top KPI Metric Cards */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none">
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="size-3.5 text-primary" />
                                                <span>
                                                    Total Hours Rendered
                                                </span>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold ${
                                                    summary.hours
                                                        .hours_completed
                                                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                        : ''
                                                }`}
                                            >
                                                {Math.round(
                                                    summary.hours
                                                        .progress_percent,
                                                )}
                                                %
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                                {summary.hours.total_hours}
                                            </span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                / {summary.hours.required_hours}{' '}
                                                hrs
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    summary.hours
                                                        .hours_completed
                                                        ? 'bg-emerald-500'
                                                        : 'bg-primary'
                                                }`}
                                                style={{
                                                    width: `${Math.min(100, summary.hours.progress_percent)}%`,
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none">
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Timer className="size-3.5 text-amber-500" />
                                                <span>Remaining Hours</span>
                                            </div>
                                            <Calendar className="size-3.5 text-muted-foreground/70" />
                                        </div>
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                            {summary.hours.hours_completed ? (
                                                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                                    Target Met
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-2xl font-bold tracking-tight text-foreground">
                                                        {remainingHours.toFixed(
                                                            1,
                                                        )}
                                                    </span>
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        hrs left
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <CalendarDays className="size-3 text-muted-foreground/70" />
                                            <span>
                                                {
                                                    summary.hours
                                                        .total_days_attended
                                                }{' '}
                                                total days logged
                                            </span>
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none">
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <FileCheck2 className="size-3.5 text-blue-500" />
                                                <span>Mandatory Documents</span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold ${
                                                    summary.documents
                                                        .docs_completed
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                        : 'border-border text-muted-foreground'
                                                }`}
                                            >
                                                {
                                                    summary.documents
                                                        .approved_required
                                                }
                                                /
                                                {
                                                    summary.documents
                                                        .total_required
                                                }
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-baseline gap-1.5">
                                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                                {
                                                    summary.documents
                                                        .approved_required
                                                }
                                            </span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                /{' '}
                                                {
                                                    summary.documents
                                                        .total_required
                                                }{' '}
                                                approved
                                            </span>
                                        </div>
                                        <p
                                            className={`text-xs ${summary.documents.docs_completed ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'} flex items-center gap-1.5`}
                                        >
                                            {summary.documents
                                                .docs_completed ? (
                                                <>
                                                    <CheckCircle2 className="size-3" />
                                                    <span>
                                                        All required documents
                                                        cleared
                                                    </span>
                                                </>
                                            ) : (
                                                <span>
                                                    {Math.max(
                                                        0,
                                                        summary.documents
                                                            .total_required -
                                                            summary.documents
                                                                .approved_required,
                                                    )}{' '}
                                                    document(s) pending approval
                                                </span>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Core 2-Column Responsive Breakdown */}
                            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
                                {/* Left Column: Attendance & Timeline Summary */}
                                <Card className="flex flex-col rounded-xl border border-border/70 bg-card/60 shadow-none lg:col-span-5">
                                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                            <Clock className="size-4 text-primary" />
                                            Attendance &amp; Timeline
                                        </CardTitle>
                                        <Badge
                                            variant="outline"
                                            className="text-xs font-normal"
                                        >
                                            {summary.hours.total_days_attended}{' '}
                                            Days Logged
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-4">
                                        <div className="space-y-4">
                                            {/* Visual Attendance Journey (Start to Latest Log) */}
                                            <div className="space-y-2.5 rounded-lg border border-border/70 bg-muted/30 p-3.5">
                                                <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Internship Period
                                                </div>
                                                <div className="flex items-center justify-between gap-2 pt-1">
                                                    <div className="min-w-0 space-y-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <PlayCircle className="size-3.5 shrink-0 text-primary" />
                                                            <span>
                                                                Start Date
                                                            </span>
                                                        </div>
                                                        <p className="truncate text-xs font-semibold text-foreground">
                                                            {summary.hours
                                                                .first_attendance_date ??
                                                                'No logs yet'}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 items-center px-2">
                                                        <ArrowRight className="size-4 text-muted-foreground/60" />
                                                    </div>

                                                    <div className="min-w-0 space-y-0.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                                                            <span>
                                                                {summary.hours
                                                                    .hours_completed
                                                                    ? 'Completion Date'
                                                                    : 'Latest Date'}
                                                            </span>
                                                            {summary.hours
                                                                .hours_completed ? (
                                                                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                                                            ) : (
                                                                <Clock className="size-3.5 shrink-0 text-amber-600" />
                                                            )}
                                                        </div>
                                                        <p className="truncate text-xs font-semibold text-foreground">
                                                            {summary.hours
                                                                .last_attendance_date ??
                                                                'No logs yet'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mini Stat Tiles for Attendance Metrics */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1 rounded-lg border border-border/70 bg-background/80 p-3">
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>
                                                            Days Rendered
                                                        </span>
                                                        <CalendarDays className="size-3.5 text-primary" />
                                                    </div>
                                                    <p className="text-base font-bold text-foreground">
                                                        {
                                                            summary.hours
                                                                .total_days_attended
                                                        }{' '}
                                                        <span className="text-xs font-normal text-muted-foreground">
                                                            Days
                                                        </span>
                                                    </p>
                                                </div>

                                                <div className="space-y-1 rounded-lg border border-border/70 bg-background/80 p-3">
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>
                                                            Avg. Hours / Day
                                                        </span>
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
                                        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                                            <span className="font-medium text-muted-foreground">
                                                Hours Requirement
                                            </span>
                                            {summary.hours.hours_completed ? (
                                                <Badge className="gap-1 self-start bg-emerald-600 text-[11px] font-semibold text-white hover:bg-emerald-600 sm:self-auto">
                                                    <CheckCircle2 className="size-3" />{' '}
                                                    Target Hours Met
                                                </Badge>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-500/40 bg-amber-500/10 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                                                    >
                                                        {remainingHours.toFixed(
                                                            1,
                                                        )}{' '}
                                                        hrs remaining
                                                    </Badge>
                                                    {estDaysRemaining && (
                                                        <span className="text-[11px] text-muted-foreground">
                                                            (~{estDaysRemaining}{' '}
                                                            days at current
                                                            pace)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Right Column: Clearance Checklist */}
                                <Card className="flex flex-col rounded-xl border border-border/70 bg-card/60 shadow-none lg:col-span-7">
                                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-3">
                                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                            <FileCheck2 className="size-4 text-primary" />
                                            Document Clearance Checklist
                                        </CardTitle>
                                        <Badge
                                            variant="outline"
                                            className="text-xs font-normal"
                                        >
                                            {
                                                summary.documents
                                                    .approved_required
                                            }{' '}
                                            / {summary.documents.total_required}{' '}
                                            Approved
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="flex flex-1 flex-col justify-between p-0">
                                        {summary.documents.checklist.length ===
                                        0 ? (
                                            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-xs text-muted-foreground">
                                                <FileText className="size-8 text-muted-foreground/40" />
                                                <p>
                                                    No document requirements
                                                    configured for this program.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[320px] divide-y divide-border/60 overflow-y-auto text-xs">
                                                {summary.documents.checklist.map(
                                                    (doc) => (
                                                        <div
                                                            key={
                                                                doc.document_type
                                                            }
                                                            className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                                                        >
                                                            <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                                                                <div className="flex items-center gap-1.5 truncate font-medium text-foreground">
                                                                    <span className="truncate">
                                                                        {
                                                                            doc.name
                                                                        }
                                                                    </span>
                                                                    {doc.required && (
                                                                        <span
                                                                            className="shrink-0 text-xs font-bold text-rose-500"
                                                                            title="Mandatory Requirement"
                                                                        >
                                                                            *
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {doc.category && (
                                                                    <p className="truncate text-[11px] text-muted-foreground">
                                                                        {
                                                                            doc.category
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-2">
                                                                {doc.preview_url && (
                                                                    <a
                                                                        href={
                                                                            doc.preview_url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                        title="Preview Document"
                                                                    >
                                                                        <ExternalLink className="size-3.5" />
                                                                    </a>
                                                                )}
                                                                {getDocStatusBadge(
                                                                    doc.status,
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 border-t bg-muted/10 p-3 text-[11px] text-muted-foreground">
                                            <span className="font-bold text-rose-500">
                                                *
                                            </span>
                                            <span>
                                                Mandatory documents required for
                                                internship clearance.
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Clean Footer */}
                        <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-[11px] text-muted-foreground">
                                Generated on {summary.completion.generated_at}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
