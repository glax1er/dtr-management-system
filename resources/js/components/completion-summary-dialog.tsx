import {
    AlertCircle,
    Award,
    Building2,
    Calendar,
    Clock,
    Download,
    Eye,
    FileCheck2,
    FileText,
    GraduationCap,
    Loader2,
    Printer,
    ShieldCheck,
    UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InternInfo {
    user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    sex: string | null;
    photo_url: string | null;
    registered_at: string | null;
    approved_at: string | null;
    program_name: string;
    hte_name: string;
    hte_address: string | null;
    hte_contact_person: string | null;
    hte_contact_number: string | null;
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
    description: string;
    required: boolean;
    status: 'approved' | 'pending_review' | 'rejected' | 'missing';
    id: number | null;
    original_filename: string | null;
    file_size: string | null;
    rejection_reason: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    reviewer_name: string | null;
    preview_url: string | null;
    download_url: string | null;
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
    supervisor_name: string;
    supervisor_role: string;
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
    defaultOpen?: boolean;
}

export function CompletionSummaryDialog({
    internUserId,
    internName,
    isCompleted = false,
    trigger,
    defaultOpen = false,
}: CompletionSummaryDialogProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState<CompletionSummaryData | null>(null);
    const [dtrStartDate, setDtrStartDate] = useState('');
    const [dtrEndDate, setDtrEndDate] = useState('');

    const fetchSummary = useCallback(async () => {
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
    }, [internUserId]);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (defaultOpen) {
            // The dialog can be mounted already-open from a deep link, so the
            // fetch is intentionally triggered here instead of a click handler.
            fetchSummary();
        }
    }, [defaultOpen, fetchSummary]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);

        if (open) {
            fetchSummary();
        } else {
            setDtrStartDate('');
            setDtrEndDate('');
        }
    };

    const handlePrint = () => {
        window.print();
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
                return <StatusBadge status="not_uploaded" />;
        }
    };

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

            <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:p-6 print:max-w-none print:border-none print:p-0 print:shadow-none">
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #completion-summary-print-area, #completion-summary-print-area * {
                            visibility: visible;
                        }
                        #completion-summary-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 24px;
                            background: white !important;
                            color: black !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                {isLoading || !summary ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                            Loading completion summary for {internName}...
                        </p>
                    </div>
                ) : (
                    <div
                        id="completion-summary-print-area"
                        className="flex flex-col gap-5"
                    >
                        {/* Header */}
                        <DialogHeader className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`flex size-10 items-center justify-center rounded-xl shadow-sm ${
                                            summary.completion.is_completed
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-primary text-primary-foreground'
                                        }`}
                                    >
                                        <GraduationCap className="size-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold tracking-tight">
                                            Summary of Completion
                                        </DialogTitle>
                                        <DialogDescription className="text-xs">
                                            Internship Clearance &amp;
                                            Verification Record
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="no-print hidden items-center gap-2 sm:flex">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrint}
                                        className="h-8 gap-1 text-xs"
                                    >
                                        <Printer className="size-3.5" />
                                        Print / Save PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() => {
                                            let url = `/supervisor/interns/${summary.intern.user_id}/dtr-report`;
                                            const params =
                                                new URLSearchParams();

                                            if (dtrStartDate) {
params.append(
                                                    'start',
                                                    dtrStartDate,
                                                );
}

                                            if (dtrEndDate) {
params.append(
                                                    'end',
                                                    dtrEndDate,
                                                );
}

                                            const queryString =
                                                params.toString();

                                            if (queryString) {
url += `?${queryString}`;
}

                                            window.open(
                                                url,
                                                '_blank',
                                                'noopener',
                                            );
                                        }}
                                    >
                                        <Download className="size-3.5" />
                                        DTR Report
                                    </Button>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Completion Banner */}
                        {summary.completion.is_completed ? (
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 dark:bg-emerald-500/15">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                                All Internship Requirements
                                                Completed
                                            </h2>
                                            <Badge className="bg-emerald-600 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-600">
                                                Verified Complete
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                                            {summary.intern.name} has rendered
                                            the required{' '}
                                            {summary.hours.required_hours} hours
                                            and fulfilled all mandatory document
                                            clearance requirements under the{' '}
                                            {summary.intern.program_name}{' '}
                                            program.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 dark:bg-amber-500/15">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                                Requirements In Progress
                                            </h2>
                                            <Badge
                                                variant="outline"
                                                className="border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-700"
                                            >
                                                {summary.hours.hours_completed
                                                    ? 'Hours Met • Docs Pending'
                                                    : `${Math.round(summary.hours.progress_percent)}% Rendered`}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                                            {!summary.hours.hours_completed &&
                                            !summary.documents.docs_completed
                                                ? `Currently rendered ${summary.hours.total_hours} / ${summary.hours.required_hours} hours (${summary.documents.approved_required}/${summary.documents.total_required} required documents approved).`
                                                : summary.hours.hours_completed
                                                  ? `Target hours achieved (${summary.hours.total_hours} hrs). Awaiting approval of remaining required documents (${summary.documents.approved_required}/${summary.documents.total_required}).`
                                                  : `All mandatory clearance documents approved. Awaiting completion of remaining hours (${summary.hours.total_hours} / ${summary.hours.required_hours} hrs rendered).`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Key Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Card className="shadow-none">
                                <CardContent className="space-y-1 p-3.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Hours Rendered</span>
                                        <Clock className="size-3.5 text-primary" />
                                    </div>
                                    <p className="text-lg font-bold">
                                        {summary.hours.total_hours}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            / {summary.hours.required_hours} hrs
                                        </span>
                                    </p>
                                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full ${summary.hours.hours_completed ? 'bg-emerald-500' : 'bg-primary'}`}
                                            style={{
                                                width: `${Math.min(100, summary.hours.progress_percent)}%`,
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardContent className="space-y-1 p-3.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Days Rendered</span>
                                        <Calendar className="size-3.5 text-primary" />
                                    </div>
                                    <p className="text-lg font-bold">
                                        {summary.hours.total_days_attended}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            Days
                                        </span>
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {summary.hours.first_attendance_date ??
                                            'No logs'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardContent className="space-y-1 p-3.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Clearance Docs</span>
                                        <FileCheck2 className="size-3.5 text-primary" />
                                    </div>
                                    <p className="text-lg font-bold">
                                        {summary.documents.approved_required}{' '}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            / {summary.documents.total_required}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {summary.documents.docs_completed
                                            ? 'All Mandatory Approved'
                                            : 'Clearance Incomplete'}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardContent className="space-y-1 p-3.5">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>Placement</span>
                                        <Building2 className="size-3.5 text-primary" />
                                    </div>
                                    <p
                                        className="truncate text-sm font-semibold"
                                        title={summary.intern.hte_name}
                                    >
                                        {summary.intern.hte_name}
                                    </p>
                                    <p
                                        className="truncate text-[11px] text-muted-foreground"
                                        title={
                                            summary.intern.hte_contact_person ??
                                            'Assigned'
                                        }
                                    >
                                        {summary.intern.hte_contact_person ??
                                            'HTE Supervisor'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Tabs / Breakdown */}
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="no-print grid w-full grid-cols-3">
                                <TabsTrigger value="overview">
                                    Overview &amp; Clearance
                                </TabsTrigger>
                                <TabsTrigger value="documents">
                                    Document Checklist
                                </TabsTrigger>
                                <TabsTrigger value="attendance">
                                    Attendance &amp; Hours
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Overview & Clearance Details */}
                            <TabsContent
                                value="overview"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-3 rounded-lg border p-4">
                                    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Intern &amp; Program Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Full Name:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                ID Number:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.id_number ??
                                                    '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Program / Course:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.program_name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Email Address:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.email}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Contact Number:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern
                                                    .contact_number ?? '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Approval Date:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.approved_at ??
                                                    '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-lg border p-4">
                                    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Host Training Establishment (HTE)
                                        Placement
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Company Name:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.hte_name}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:border-b-0">
                                            <span className="text-muted-foreground">
                                                Supervisor / Contact:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern
                                                    .hte_contact_person ?? '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b pb-1 sm:col-span-2 sm:border-b-0">
                                            <span className="shrink-0 text-muted-foreground">
                                                Company Address:
                                            </span>
                                            <span className="text-right font-medium">
                                                {summary.intern.hte_address ??
                                                    '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Endorsement & Verification Block */}
                                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="size-4 text-primary" />
                                        <h3 className="text-xs font-semibold tracking-wider text-foreground uppercase">
                                            OJT Supervisor Clearance Endorsement
                                        </h3>
                                    </div>

                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        This certifies that the record of
                                        attendance and document requirements of{' '}
                                        <strong className="text-foreground">
                                            {summary.intern.name}
                                        </strong>{' '}
                                        ({summary.intern.id_number ?? 'N/A'})
                                        under the{' '}
                                        <strong className="text-foreground">
                                            {summary.intern.program_name}
                                        </strong>{' '}
                                        have been reviewed and verified by the
                                        OJT Department.
                                    </p>

                                    <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <div className="border-b border-foreground/30 pb-1 text-sm font-medium">
                                                {
                                                    summary.completion
                                                        .supervisor_name
                                                }
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {
                                                    summary.completion
                                                        .supervisor_role
                                                }
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="border-b border-foreground/30 pb-1 text-sm font-medium">
                                                {summary.completion
                                                    .completion_date ??
                                                    summary.completion
                                                        .generated_at}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Verification Date
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Tab 2: Document Checklist */}
                            <TabsContent
                                value="documents"
                                className="mt-4 space-y-3"
                            >
                                <div className="overflow-hidden rounded-lg border">
                                    <table className="w-full text-xs">
                                        <thead className="border-b bg-muted/50">
                                            <tr className="text-left font-medium text-muted-foreground">
                                                <th className="px-3 py-2.5">
                                                    Requirement
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Category
                                                </th>
                                                <th className="px-3 py-2.5 text-center">
                                                    Status
                                                </th>
                                                <th className="px-3 py-2.5">
                                                    Submitted / Reviewed
                                                </th>
                                                <th className="no-print px-3 py-2.5 text-right">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {summary.documents.checklist.map(
                                                (doc) => (
                                                    <tr
                                                        key={doc.document_type}
                                                        className="hover:bg-muted/30"
                                                    >
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-medium text-foreground">
                                                                {doc.name}
                                                                {doc.required && (
                                                                    <span className="ml-1 font-bold text-rose-500">
                                                                        *
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                                                {
                                                                    doc.description
                                                                }
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                                                            {doc.category}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                            {getDocStatusBadge(
                                                                doc.status,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-[11px] whitespace-nowrap text-muted-foreground">
                                                            {doc.reviewed_at ? (
                                                                <span>
                                                                    Reviewed{' '}
                                                                    {
                                                                        doc.reviewed_at
                                                                    }
                                                                </span>
                                                            ) : doc.submitted_at ? (
                                                                <span>
                                                                    Submitted{' '}
                                                                    {
                                                                        doc.submitted_at
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span>—</span>
                                                            )}
                                                        </td>
                                                        <td className="no-print px-3 py-2.5 text-right whitespace-nowrap">
                                                            {doc.preview_url && (
                                                                <div className="flex justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        asChild
                                                                    >
                                                                        <a
                                                                            href={
                                                                                doc.preview_url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            title="Preview Document"
                                                                        >
                                                                            <Eye className="size-3.5 text-blue-600" />
                                                                        </a>
                                                                    </Button>
                                                                    {doc.download_url && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            asChild
                                                                        >
                                                                            <a
                                                                                href={
                                                                                    doc.download_url
                                                                                }
                                                                                download
                                                                                title="Download Document"
                                                                            >
                                                                                <Download className="size-3.5 text-foreground" />
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    <span className="font-bold text-rose-500">
                                        *
                                    </span>{' '}
                                    Mandatory pre-internship documents required
                                    for final completion sign-off.
                                </p>
                            </TabsContent>

                            {/* Tab 3: Attendance & Hours Breakdown */}
                            <TabsContent
                                value="attendance"
                                className="mt-4 space-y-4"
                            >
                                <div className="space-y-3 rounded-lg border p-4">
                                    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Attendance &amp; Hours Log Summary
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                Total Required Hours
                                            </p>
                                            <p className="text-base font-semibold">
                                                {summary.hours.required_hours}{' '}
                                                Hours
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                Total Rendered Hours
                                            </p>
                                            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                                {summary.hours.total_hours}{' '}
                                                Hours
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                First Active Attendance
                                            </p>
                                            <p className="text-sm font-medium">
                                                {summary.hours
                                                    .first_attendance_date ??
                                                    'No logs recorded'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                Last Attendance / Completed Date
                                            </p>
                                            <p className="text-sm font-medium">
                                                {summary.hours
                                                    .last_attendance_date ??
                                                    'No logs recorded'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
                                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                        <div className="space-y-0.5">
                                            <h4 className="text-xs font-semibold">
                                                Official Daily Time Record (DTR)
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Download complete formatted PDF
                                                report. By default, includes
                                                full logs up to the most recent
                                                log.
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 gap-1 text-xs"
                                            onClick={() => {
                                                let url = `/supervisor/interns/${summary.intern.user_id}/dtr-report`;
                                                const params =
                                                    new URLSearchParams();

                                                if (dtrStartDate) {
params.append(
                                                        'start',
                                                        dtrStartDate,
                                                    );
}

                                                if (dtrEndDate) {
params.append(
                                                        'end',
                                                        dtrEndDate,
                                                    );
}

                                                const queryString =
                                                    params.toString();

                                                if (queryString) {
url += `?${queryString}`;
}

                                                window.open(
                                                    url,
                                                    '_blank',
                                                    'noopener',
                                                );
                                            }}
                                        >
                                            <Download className="size-3.5" />
                                            Download PDF
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-muted-foreground">
                                                From:
                                            </span>
                                            <input
                                                type="date"
                                                value={dtrStartDate}
                                                onChange={(e) =>
                                                    setDtrStartDate(
                                                        e.target.value,
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
                                                value={dtrEndDate}
                                                onChange={(e) =>
                                                    setDtrEndDate(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
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
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="no-print border-t pt-3 sm:justify-between">
                            <p className="self-center text-[11px] text-muted-foreground">
                                Record generated on{' '}
                                {summary.completion.generated_at}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handlePrint}
                                    className="gap-1"
                                >
                                    <Printer className="size-3.5" />
                                    Print Summary
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
