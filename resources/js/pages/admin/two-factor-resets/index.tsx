import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    LoaderCircle,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { NumberedPagination } from '@/components/numbered-pagination';
import type { Paginated } from '@/components/pagination-footer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { dashboard } from '@/routes';

interface TwoFactorResetRequestItem {
    id: number;
    user_id: number;
    status:
        | 'pending_user_confirmation'
        | 'pending_admin_approval'
        | 'approved'
        | 'rejected'
        | 'cancelled';
    reason: string | null;
    rejection_reason: string | null;
    user_ip: string | null;
    user_confirmed_at: string | null;
    admin_action_at: string | null;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        college_id: number | null;
        college?: {
            id: number;
            name: string;
            code: string;
        } | null;
    };
    admin?: {
        id: number;
        name: string;
        email: string;
    } | null;
    requested_by?: {
        id: number;
        name: string;
        email: string;
    } | null;
}

interface TwoFactorResetsProps {
    requests: Paginated<TwoFactorResetRequestItem>;
    pendingCount: number;
    filters: {
        search?: string;
        status?: string;
        per_page?: number;
    };
}



export default function TwoFactorResetsIndex({
    requests,
    pendingCount,
    filters,
}: TwoFactorResetsProps) {
    const getInitials = useInitials();

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'pending');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    // Dialog state
    const [approveItem, setApproveItem] = useState<TwoFactorResetRequestItem | null>(null);
    const [rejectItem, setRejectItem] = useState<TwoFactorResetRequestItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const highlightId =
        typeof window !== 'undefined'
            ? Number(
                  new URLSearchParams(window.location.search).get('highlight'),
              ) || null
            : null;

    useEffect(() => {
        if (!highlightId) {
            return;
        }

        const el = document.getElementById(`reset-row-${highlightId}`);
        if (!el) {
            return;
        }

        const timer = setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);

        return () => clearTimeout(timer);
    }, [highlightId, requests.data]);

    const applyFilters = (newSearch: string, newStatus: string, page?: number, perPage?: number) => {
        router.get(
            '/admin/two-factor-resets',
            {
                search: newSearch.trim() || undefined,
                status: newStatus !== 'pending' ? newStatus : undefined,
                page: page ?? undefined,
                per_page: perPage ?? filters.per_page ?? undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        applyFilters(search, statusFilter);
    };

    const clearSearch = () => {
        setSearch('');
        applyFilters('', statusFilter);
    };

    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(status);
        applyFilters(search, status);
    };

    const goToPage = (page: number) => applyFilters(search, statusFilter, page);
    const changePerPage = (perPage: number) => applyFilters(search, statusFilter, 1, perPage);

    const handleConfirmApprove = () => {
        if (!approveItem) return;
        setActionLoading(true);

        router.post(
            `/admin/two-factor-resets/${approveItem.id}/approve`,
            {},
            {
                onSuccess: () => {
                    toast.success(`2FA successfully reset for ${approveItem.user.name}`);
                    setApproveItem(null);
                },
                onError: (err) => {
                    toast.error(
                        Object.values(err)[0] || 'Failed to approve 2FA reset request.',
                    );
                },
                onFinish: () => setActionLoading(false),
            },
        );
    };

    const handleConfirmReject = () => {
        if (!rejectItem) return;
        setActionLoading(true);

        router.post(
            `/admin/two-factor-resets/${rejectItem.id}/reject`,
            { rejection_reason: rejectionReason },
            {
                onSuccess: () => {
                    toast.success('2FA reset request was rejected.');
                    setRejectItem(null);
                    setRejectionReason('');
                },
                onError: (err) => {
                    toast.error(
                        Object.values(err)[0] || 'Failed to reject 2FA reset request.',
                    );
                },
                onFinish: () => setActionLoading(false),
            },
        );
    };

    const getStatusBadge = (item: TwoFactorResetRequestItem) => {
        switch (item.status) {
            case 'pending_admin_approval':
                return (
                    <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 font-medium whitespace-nowrap">
                        <CheckCircle2 className="mr-1.5 size-3 text-blue-600" />
                        Pending Approval
                    </Badge>
                );
            case 'pending_user_confirmation':
                return (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium whitespace-nowrap">
                        <Clock className="mr-1.5 size-3 text-amber-600" />
                        Awaiting User Consent
                    </Badge>
                );
            case 'approved':
                return (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium whitespace-nowrap">
                        <ShieldCheck className="mr-1.5 size-3 text-emerald-600" />
                        Approved
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 font-medium whitespace-nowrap">
                        <XCircle className="mr-1.5 size-3 text-red-600" />
                        Rejected
                    </Badge>
                );
            case 'cancelled':
                return (
                    <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 font-medium whitespace-nowrap">
                        Cancelled
                    </Badge>
                );
        }
    };

    return (
        <>
            <Head title="Two-Factor Authentication Resets" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex shrink-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                            <ShieldAlert className="size-5" />
                        </span>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
                                2FA Reset Requests
                            </h1>
                            {pendingCount > 0 && (
                                <Badge className="bg-red-600 text-white font-semibold">
                                    {pendingCount} Pending
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {/* Desktop Search */}
                        <form
                            onSubmit={handleSearchSubmit}
                            className="relative hidden sm:block"
                        >
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                className="h-9 w-48 rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>

                        {/* Mobile Search Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileSearchOpen((o) => !o)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground sm:hidden"
                            aria-label="Toggle search"
                        >
                            {mobileSearchOpen ? (
                                <X className="size-4" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </button>

                        {/* Status Switch Tabs */}
                        <div className="scrollbar-none max-w-[calc(100%-3rem)] overflow-x-auto sm:max-w-none">
                            <Tabs
                                value={statusFilter}
                                onValueChange={handleStatusFilterChange}
                            >
                                <TabsList className="h-9">
                                    {[
                                        { key: 'pending', label: 'Pending Approval' },
                                        { key: 'pending_user_confirmation', label: 'Awaiting User' },
                                        { key: 'approved', label: 'Approved' },
                                        { key: 'rejected', label: 'Rejected' },
                                        { key: 'all', label: 'All Requests' },
                                    ].map((tab) => (
                                        <TabsTrigger
                                            key={tab.key}
                                            value={tab.key}
                                            className="px-2.5 text-xs font-medium sm:px-3 sm:text-sm"
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>

                {/* Mobile inline search */}
                {mobileSearchOpen && (
                    <form
                        onSubmit={(e) => {
                            handleSearchSubmit(e);
                            setMobileSearchOpen(false);
                        }}
                        className="flex w-full items-center gap-2 sm:hidden"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email…"
                                className="h-9 w-full rounded-md border bg-background pr-8 pl-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearSearch();
                                        setMobileSearchOpen(false);
                                    }}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* Table Content */}
                {requests.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No 2FA reset requests found matching the current filter.
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="overflow-hidden p-0">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto scrollbar-none">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6">
                                                User Account
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Status & Consent
                                            </TableHead>
                                            <TableHead className="px-6">
                                                Reason
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Requested
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {requests.data.map((req) => {
                                            const isHighlighted =
                                                highlightId === req.id;

                                            return (
                                                <TableRow
                                                    key={req.id}
                                                    id={`reset-row-${req.id}`}
                                                    className={cn(
                                                        'transition-all duration-300',
                                                        isHighlighted &&
                                                            'bg-primary/10 ring-2 ring-primary/40 dark:bg-primary/20',
                                                    )}
                                                >
                                                    <TableCell className="px-6">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-9 shrink-0">
                                                                <AvatarFallback className="text-xs font-semibold">
                                                                    {getInitials(req.user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium whitespace-nowrap text-sm text-foreground">
                                                                        {req.user.name}
                                                                    </p>
                                                                    {isHighlighted && (
                                                                        <Badge className="animate-pulse gap-1 bg-primary text-[10px] font-semibold text-primary-foreground uppercase">
                                                                            <Sparkles className="size-3" />
                                                                            Focus
                                                                        </Badge>
                                                                    )}
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider"
                                                                >
                                                                    {req.user.role.replace(/_/g, ' ')}
                                                                </Badge>
                                                                {req.user.college && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="px-1.5 py-0 text-[10px] font-semibold text-primary"
                                                                    >
                                                                        {req.user.college.code}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p
                                                                className="max-w-[200px] truncate font-mono text-xs text-muted-foreground"
                                                                title={req.user.email}
                                                            >
                                                                {req.user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 text-center whitespace-nowrap">
                                                    <div className="inline-flex flex-col items-center gap-1">
                                                        {getStatusBadge(req)}
                                                        {req.user_confirmed_at && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Confirmed:{' '}
                                                                <span className="font-medium text-foreground">
                                                                    {new Date(
                                                                        req.user_confirmed_at,
                                                                    ).toLocaleDateString(
                                                                        undefined,
                                                                        {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                        },
                                                                    )}
                                                                </span>
                                                            </p>
                                                        )}
                                                        {req.admin && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Reviewed by:{' '}
                                                                <span className="font-medium text-foreground">
                                                                    {req.admin.name}
                                                                </span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs px-6 text-xs text-muted-foreground">
                                                    {req.reason ? (
                                                        <p
                                                            className="line-clamp-2"
                                                            title={req.reason}
                                                        >
                                                            {req.reason}
                                                        </p>
                                                    ) : (
                                                        <span className="italic text-muted-foreground/60">
                                                            No reason provided
                                                        </span>
                                                    )}
                                                    {req.rejection_reason && (
                                                        <p
                                                            className="mt-1 line-clamp-2 text-[11px] text-destructive"
                                                            title={
                                                                req.rejection_reason
                                                            }
                                                        >
                                                            <span className="font-medium">
                                                                Rejection note:
                                                            </span>{' '}
                                                            {
                                                                req.rejection_reason
                                                            }
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 text-center whitespace-nowrap">
                                                    <p className="text-xs font-medium text-foreground">
                                                        {new Date(
                                                            req.created_at,
                                                        ).toLocaleDateString(
                                                            undefined,
                                                            {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            },
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {new Date(
                                                            req.created_at,
                                                        ).toLocaleTimeString(
                                                            undefined,
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}
                                                    </p>
                                                    {req.user_ip && (
                                                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/75">
                                                            IP: {req.user_ip}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 text-center whitespace-nowrap">
                                                    <div className="flex justify-center gap-1">
                                                        {req.status ===
                                                        'pending_admin_approval' ? (
                                                            <>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
                                                                            onClick={() =>
                                                                                setApproveItem(
                                                                                    req,
                                                                                )
                                                                            }
                                                                            aria-label={`Approve 2FA reset for ${req.user.name}`}
                                                                        >
                                                                            <CheckCircle2 className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Approve
                                                                        Reset
                                                                    </TooltipContent>
                                                                </Tooltip>

                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8 text-destructive hover:bg-destructive/10"
                                                                            onClick={() => {
                                                                                setRejectItem(
                                                                                    req,
                                                                                );
                                                                                setRejectionReason(
                                                                                    '',
                                                                                );
                                                                            }}
                                                                            aria-label={`Reject 2FA reset for ${req.user.name}`}
                                                                        >
                                                                            <XCircle className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Reject
                                                                        Request
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </>
                                                        ) : req.status ===
                                                          'pending_user_confirmation' ? (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                                        onClick={() => {
                                                                            setRejectItem(
                                                                                req,
                                                                            );
                                                                            setRejectionReason(
                                                                                '',
                                                                            );
                                                                        }}
                                                                        aria-label={`Cancel request for ${req.user.name}`}
                                                                    >
                                                                        <X className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Cancel
                                                                    Request
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                —
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <NumberedPagination
                                meta={requests}
                                itemLabel="request"
                                onPageChange={goToPage}
                                onPerPageChange={changePerPage}
                                idPrefix="2fa-resets-table-per-page"
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Approval Confirmation Dialog */}
            <ConfirmationDialog
                open={Boolean(approveItem)}
                onOpenChange={(open) => !open && setApproveItem(null)}
                title="Approve 2FA Reset"
                description={`Are you sure you want to approve the 2FA reset for ${approveItem?.user.name}? This will clear their authenticator app and recovery codes. An automated security alert will immediately be sent to their email.`}
                confirmText="Confirm & Reset 2FA"
                isDestructive={false}
                onConfirm={handleConfirmApprove}
            />

            {/* Rejection Dialog */}
            <Dialog open={Boolean(rejectItem)} onOpenChange={(open) => !open && setRejectItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject 2FA Reset Request</DialogTitle>
                        <DialogDescription className="text-xs">
                            Decline this 2FA reset request for {rejectItem?.user.name}. Their existing authenticator setup will remain protected and active.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Label htmlFor="reject_reason" className="text-xs font-medium">
                            Reason for Rejection (Optional)
                        </Label>
                        <Textarea
                            id="reject_reason"
                            placeholder="e.g., Identity could not be verified, suspicious request origin"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                            className="text-xs"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRejectItem(null)}
                            disabled={actionLoading}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmReject}
                            disabled={actionLoading}
                            className="text-xs"
                        >
                            {actionLoading ? (
                                <>
                                    <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                'Confirm Rejection'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

TwoFactorResetsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: '2FA Resets', href: '/admin/two-factor-resets' },
    ],
};
