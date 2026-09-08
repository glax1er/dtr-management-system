import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    ArchiveRestore,
    ArrowLeft,
    Download,
    FileStack,
    FileText,
    Folder,
    FolderArchive,
    FolderOpen,
    Info,
    LayoutGrid,
    Pencil,
    Plus,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AddDocumentRequirementDialog } from '@/components/add-document-requirement-dialog';
import { EditDocumentRequirementDialog } from '@/components/edit-document-requirement-dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badges/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ViewGuidanceDialog } from '@/components/view-guidance-dialog';
import documentTemplates from '@/routes/supervisor/document-templates';

// ── Types ────────────────────────────────────────────────────────────────────
interface TemplateChecklistItem {
    document_type: string;
    name: string;
    category: string;
    description: string;
    required: boolean;
    is_custom: boolean;
    template_id: number | null;
    has_template: boolean;
    original_filename: string | null;
    file_size: string | null;
    file_extension: string | null;
    instructions: string | null;
    uploaded_at: string | null;
    download_url: string | null;
}

interface FolderMeta {
    name: string;
    total_items: number;
    templates_count: number;
    required_count: number;
}

interface ArchivedTemplate {
    id: number;
    document_type: string;
    name: string;
    category: string;
    description: string;
    required: boolean;
    is_custom: boolean;
    has_template: boolean;
    original_filename: string | null;
    file_size: string | null;
    file_extension: string | null;
    instructions: string | null;
    deleted_at: string;
    deleted_at_human: string;
    uploaded_by_name: string;
}

interface DocumentTemplatesProps {
    checklist: TemplateChecklistItem[];
    folders: FolderMeta[];
    archived: ArchivedTemplate[];
    categories?: string[];
    program: {
        program_id: number | null;
        program_name: string;
    };
    total_templates?: number;
    total_types?: number;
    total_archived?: number;
}

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'configured' | 'missing' | 'required' | 'optional';

type ConfirmAction =
    | { type: 'archive'; target: TemplateChecklistItem }
    | { type: 'restore'; target: ArchivedTemplate }
    | { type: 'force_delete'; target: ArchivedTemplate };

const DEFAULT_CATEGORIES = [
    'Pre Deployment',
    'During Deployment',
    'Evaluation Forms',
];

export default function DocumentTemplates({
    checklist,
    folders = [],
    archived = [],
    categories = [],
    program,
    total_archived = 0,
}: DocumentTemplatesProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [activeFolder, setActiveFolder] = useState<string>('all'); // 'all' | folder_name | 'trash'
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    // ── All Available Categories List ────────────────────────────────────────
    const availableCategories = useMemo(() => {
        const set = new Set<string>([...DEFAULT_CATEGORIES, ...categories]);
        checklist.forEach((item) => {
            if (item.category) {
                set.add(item.category);
            }
        });

        return Array.from(set);
    }, [categories, checklist]);

    // ── Dialog States ────────────────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<TemplateChecklistItem | null>(
        null,
    );
    const [instructionsModalItem, setInstructionsModalItem] =
        useState<TemplateChecklistItem | null>(null);

    // ── Unified Confirmation Dialog State ─────────────────────────────────────
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
        null,
    );

    // ── Open Edit Modal ──────────────────────────────────────────────────────
    const openEditModal = (item: TemplateChecklistItem) => {
        setEditItem(item);
        setIsEditModalOpen(true);
    };

    // ── Unified Confirm Execution Handler ────────────────────────────────────
    const handleConfirm = () => {
        if (!confirmAction) {
            return;
        }

        if (confirmAction.type === 'archive') {
            const { target } = confirmAction;
            router.delete(documentTemplates.destroy.url(target.document_type), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Document "${target.name}" moved to archive.`,
                    );
                    setConfirmAction(null);
                },
                onError: () => {
                    toast.error('Failed to archive document.');
                },
            });
        } else if (confirmAction.type === 'restore') {
            const { target } = confirmAction;
            router.post(
                documentTemplates.restore.url(target.id),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(
                            `Document "${target.name}" restored successfully.`,
                        );
                        setConfirmAction(null);
                    },
                    onError: () => {
                        toast.error('Failed to restore document.');
                    },
                },
            );
        } else if (confirmAction.type === 'force_delete') {
            const { target } = confirmAction;
            router.delete(documentTemplates.forceDelete.url(target.id), {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Document "${target.name}" permanently deleted.`,
                    );
                    setConfirmAction(null);
                },
                onError: () => {
                    toast.error('Failed to delete document.');
                },
            });
        }
    };

    // ── Confirmation Modal Configuration ─────────────────────────────────────
    const confirmConfig = useMemo(() => {
        if (!confirmAction) {
            return null;
        }

        switch (confirmAction.type) {
            case 'archive':
                return {
                    title: 'Archive Document Requirement',
                    description: `Move "${confirmAction.target.name}" to the archive? Interns will no longer see this requirement in their checklist until it is restored.`,
                    confirmText: 'Archive Document',
                    isDestructive: false,
                };
            case 'restore':
                return {
                    title: 'Restore Document Requirement',
                    description: `Restore "${confirmAction.target.name}"? It will become active and available for interns in your program again.`,
                    confirmText: 'Restore Document',
                    isDestructive: false,
                };
            case 'force_delete':
                return {
                    title: 'Permanently Delete Document Requirement',
                    description: `Are you sure you want to permanently erase "${confirmAction.target.name}"? This action cannot be undone and will delete any associated template files.`,
                    confirmText: 'Delete Permanently',
                    isDestructive: true,
                };
        }
    }, [confirmAction]);

    // ── Filtered Items Calculation ──────────────────────────────────────────
    const filteredChecklist = useMemo(() => {
        return checklist.filter((item) => {
            // Folder category filter
            if (activeFolder !== 'all' && activeFolder !== 'trash') {
                if (item.category !== activeFolder) {
                    return false;
                }
            }

            // Status filter
            if (statusFilter === 'configured' && !item.has_template) {
                return false;
            }

            if (statusFilter === 'missing' && item.has_template) {
                return false;
            }

            if (statusFilter === 'required' && !item.required) {
                return false;
            }

            if (statusFilter === 'optional' && item.required) {
                return false;
            }

            // Search filter
            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = item.name.toLowerCase().includes(query);
                const matchDesc = item.description
                    ?.toLowerCase()
                    .includes(query);
                const matchCategory = item.category
                    ?.toLowerCase()
                    .includes(query);
                const matchFile = item.original_filename
                    ?.toLowerCase()
                    .includes(query);

                if (!matchName && !matchDesc && !matchCategory && !matchFile) {
                    return false;
                }
            }

            return true;
        });
    }, [checklist, activeFolder, statusFilter, search]);

    const filteredArchived = useMemo(() => {
        if (!search.trim()) {
            return archived;
        }

        const query = search.toLowerCase();

        return archived.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                (item.original_filename &&
                    item.original_filename.toLowerCase().includes(query)) ||
                item.category?.toLowerCase().includes(query) ||
                (item.description &&
                    item.description.toLowerCase().includes(query)),
        );
    }, [archived, search]);

    const getFolderColorClass = (catName: string) => {
        const lower = catName.toLowerCase();

        if (lower.includes('pre')) {
            return {
                border: 'hover:border-blue-500/50',
                activeBorder:
                    'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
                iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            };
        }

        if (lower.includes('during')) {
            return {
                border: 'hover:border-amber-500/50',
                activeBorder:
                    'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
                iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            };
        }

        if (lower.includes('eval')) {
            return {
                border: 'hover:border-emerald-500/50',
                activeBorder:
                    'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
                iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            };
        }

        return {
            border: 'hover:border-purple-500/50',
            activeBorder:
                'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
            iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        };
    };

    return (
        <>
            <Head title="Document Templates" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* ── Top Header Toolbar ──────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <FileStack className="size-5" />
                            </span>
                            Document Templates
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

                        {/* Status Filter */}
                        {activeFolder !== 'trash' && (
                            <>
                                <div className="hidden sm:block">
                                    <Select
                                        value={statusFilter}
                                        onValueChange={(val: StatusFilter) =>
                                            setStatusFilter(val)
                                        }
                                    >
                                        <SelectTrigger className="h-9 w-44">
                                            <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                            <SelectValue placeholder="All Documents" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                All Documents
                                            </SelectItem>
                                            <SelectItem value="configured">
                                                Template Attached
                                            </SelectItem>
                                            <SelectItem value="missing">
                                                No Template
                                            </SelectItem>
                                            <SelectItem value="required">
                                                Required Only
                                            </SelectItem>
                                            <SelectItem value="optional">
                                                Optional Only
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:hidden">
                                    <Select
                                        value={statusFilter}
                                        onValueChange={(val: StatusFilter) =>
                                            setStatusFilter(val)
                                        }
                                    >
                                        <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="all">
                                                All Documents
                                            </SelectItem>
                                            <SelectItem value="configured">
                                                Template Attached
                                            </SelectItem>
                                            <SelectItem value="missing">
                                                No Template
                                            </SelectItem>
                                            <SelectItem value="required">
                                                Required Only
                                            </SelectItem>
                                            <SelectItem value="optional">
                                                Optional Only
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {/* View Mode Switcher (Tabs) */}
                        <div className="hidden sm:block">
                            <Tabs
                                value={view}
                                onValueChange={(v) => setView(v as ViewMode)}
                            >
                                <TabsList>
                                    <TabsTrigger value="table">
                                        <TableIcon className="size-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="grid">
                                        <LayoutGrid className="size-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Primary Action Button: Add Document */}
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            size="sm"
                            className="gap-1.5 shadow-sm"
                        >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">
                                Add Document
                            </span>
                            <span className="sm:hidden">Add</span>
                        </Button>
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
                            placeholder="Search document requirements..."
                            className="h-9 w-full rounded-md border border-input bg-background pr-8 pl-8 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
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

                {/* ── Drive Folders Section ───────────────────────────────────── */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Folder className="size-4 text-primary" />
                            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Categories & Folders
                            </h2>
                        </div>

                        {activeFolder !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveFolder('all')}
                                className="h-7 gap-1 text-xs text-primary hover:text-primary"
                            >
                                <ArrowLeft className="size-3" />
                                View All Categories
                            </Button>
                        )}
                    </div>

                    {/* Category Folder Cards Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {folders.map((f) => {
                            const colors = getFolderColorClass(f.name);
                            const isSelected = activeFolder === f.name;

                            return (
                                <button
                                    key={f.name}
                                    type="button"
                                    onClick={() =>
                                        setActiveFolder(
                                            isSelected ? 'all' : f.name,
                                        )
                                    }
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                                        isSelected
                                            ? colors.activeBorder +
                                              ' shadow-sm ring-1 ring-primary/30'
                                            : 'border-border/70 bg-card hover:bg-accent/40 ' +
                                              colors.border
                                    }`}
                                >
                                    <div
                                        className={`shrink-0 rounded-lg p-2.5 ${colors.iconBg}`}
                                    >
                                        {isSelected ? (
                                            <FolderOpen className="size-5" />
                                        ) : (
                                            <Folder className="size-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="truncate text-sm font-semibold text-foreground">
                                            {f.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {f.total_items}{' '}
                                                {f.total_items === 1
                                                    ? 'doc'
                                                    : 'docs'}
                                            </span>
                                            <span>•</span>
                                            <span
                                                className={
                                                    f.templates_count ===
                                                    f.total_items
                                                        ? 'font-medium text-emerald-600'
                                                        : ''
                                                }
                                            >
                                                {f.templates_count} format
                                                {f.templates_count === 1
                                                    ? ''
                                                    : 's'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Archived / Trash Folder Card */}
                        <button
                            type="button"
                            onClick={() =>
                                setActiveFolder(
                                    activeFolder === 'trash' ? 'all' : 'trash',
                                )
                            }
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                                activeFolder === 'trash'
                                    ? 'border-orange-500 bg-orange-50/50 text-orange-700 shadow-sm ring-1 ring-orange-500/30 dark:bg-orange-950/20 dark:text-orange-300'
                                    : 'border-border/70 bg-card hover:border-orange-500/50 hover:bg-accent/40'
                            }`}
                        >
                            <div className="shrink-0 rounded-lg bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400">
                                <FolderArchive className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="truncate text-sm font-semibold text-foreground">
                                    Archived Documents
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {total_archived}{' '}
                                    {total_archived === 1
                                        ? 'archived item'
                                        : 'archived items'}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* ── Breadcrumb & Filter Status Header ───────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pt-2 pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setActiveFolder('all')}
                            className={`font-medium transition-colors hover:text-foreground ${
                                activeFolder === 'all'
                                    ? 'font-semibold text-foreground'
                                    : ''
                            }`}
                        >
                            All Documents
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-foreground">
                            {activeFolder === 'all'
                                ? 'All Categories'
                                : activeFolder === 'trash'
                                  ? 'Archived Documents (Trash)'
                                  : activeFolder}
                        </span>
                        <Badge
                            variant="outline"
                            className="ml-1.5 px-1.5 py-0 text-[10px]"
                        >
                            {activeFolder === 'trash'
                                ? filteredArchived.length
                                : filteredChecklist.length}{' '}
                            items
                        </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Templates format:{' '}
                        <span className="font-medium text-foreground">
                            .pdf, .docx, .doc
                        </span>{' '}
                        (max 15 MB)
                    </div>
                </div>

                {/* ── Files Display Section ──────────────────────────────────── */}
                {activeFolder === 'trash' ? (
                    /* ── ARCHIVE / TRASH VIEW ── */
                    filteredArchived.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FolderArchive className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                            <h3 className="text-sm font-medium text-foreground">
                                No archived documents
                            </h3>
                            <p className="mt-1 text-xs">
                                Archived document requirements will appear here
                                and can be restored anytime.
                            </p>
                        </Card>
                    ) : view === 'grid' ? (
                        /* Archived Grid */
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredArchived.map((item) => (
                                <Card
                                    key={item.id}
                                    className="flex flex-col justify-between border-border/70 bg-card/60 transition-all duration-200 hover:bg-card"
                                >
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <div className="shrink-0 rounded-lg bg-orange-500/10 p-2 text-orange-600">
                                                    <FileText className="size-5" />
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] text-muted-foreground"
                                                        >
                                                            {item.category}
                                                        </Badge>
                                                        <StatusBadge
                                                            status={
                                                                item.required
                                                                    ? 'required'
                                                                    : 'optional'
                                                            }
                                                            className="px-1.5 py-0 text-[9px]"
                                                        />
                                                        {item.is_custom && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-purple-500/10 text-[9px] tracking-wider text-purple-700 uppercase dark:text-purple-300"
                                                            >
                                                                Custom
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm leading-tight font-semibold text-foreground">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <StatusBadge
                                                status="archived"
                                                className="shrink-0 text-[10px]"
                                            />
                                        </div>

                                        {item.description && (
                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="space-y-1 rounded-lg border border-border/40 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                                            {item.original_filename ? (
                                                <div className="flex items-center gap-1.5 truncate font-medium text-foreground">
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1 py-0 text-[9px] font-bold uppercase"
                                                    >
                                                        {item.file_extension ||
                                                            'FILE'}
                                                    </Badge>
                                                    <span className="truncate">
                                                        {item.original_filename}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-muted-foreground italic">
                                                    No template file attached
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between pt-0.5 text-[11px]">
                                                <span>
                                                    {item.file_size ||
                                                        'No file'}
                                                </span>
                                                <span>
                                                    Archived{' '}
                                                    {item.deleted_at_human}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <div className="flex items-center justify-end gap-2 border-t border-border/50 bg-muted/20 px-4 py-2.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1.5 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
                                            onClick={() =>
                                                setConfirmAction({
                                                    type: 'restore',
                                                    target: item,
                                                })
                                            }
                                        >
                                            <ArchiveRestore className="size-3.5" />
                                            Restore
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                setConfirmAction({
                                                    type: 'force_delete',
                                                    target: item,
                                                })
                                            }
                                        >
                                            <Trash2 className="size-3.5" />
                                            Delete Permanently
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        /* Archived Table */
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="px-6">
                                                Document Name
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Category
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Type
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Status
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Template File
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Archived Date
                                            </TableHead>
                                            <TableHead className="px-6 text-center">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredArchived.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-muted/30"
                                            >
                                                <TableCell className="px-6 font-medium text-foreground">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold">
                                                                {item.name}
                                                            </span>
                                                            {item.is_custom && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-purple-500/10 text-[9px] text-purple-700 uppercase dark:text-purple-300"
                                                                >
                                                                    Custom
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <div className="line-clamp-1 text-xs font-normal text-muted-foreground">
                                                                {
                                                                    item.description
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {item.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <StatusBadge
                                                        status={
                                                            item.required
                                                                ? 'required'
                                                                : 'optional'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <StatusBadge status="archived" />
                                                </TableCell>
                                                <TableCell className="px-6 text-center font-mono text-xs text-muted-foreground">
                                                    {item.original_filename || (
                                                        <span className="italic">
                                                            None
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 text-center text-xs whitespace-nowrap text-muted-foreground">
                                                    {item.deleted_at}
                                                </TableCell>
                                                <TableCell className="px-6 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-emerald-600 hover:text-emerald-700"
                                                                    onClick={() =>
                                                                        setConfirmAction(
                                                                            {
                                                                                type: 'restore',
                                                                                target: item,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <ArchiveRestore className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Restore Document
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-destructive hover:text-destructive"
                                                                    onClick={() =>
                                                                        setConfirmAction(
                                                                            {
                                                                                type: 'force_delete',
                                                                                target: item,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Delete
                                                                Permanently
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )
                ) : /* ── ACTIVE DOCUMENTS VIEW ── */
                filteredChecklist.length === 0 ? (
                    <Card className="border-dashed p-10 text-center text-muted-foreground">
                        <FileStack className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                        <h3 className="text-sm font-medium text-foreground">
                            No document requirements found
                        </h3>
                        <p className="mt-1 text-xs">
                            {search
                                ? 'No document requirements match your search query.'
                                : 'No documents configured in this section.'}
                        </p>
                        <div className="mt-4">
                            <Button
                                onClick={() => setIsAddModalOpen(true)}
                                size="sm"
                                className="gap-1.5"
                            >
                                <Plus className="size-4" />
                                Add Document
                            </Button>
                        </div>
                    </Card>
                ) : view === 'grid' ? (
                    /* Document Requirements Grid */
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredChecklist.map((item) => (
                            <Card
                                key={item.document_type}
                                className={`flex flex-col justify-between border-border/70 transition-all duration-200 ${
                                    item.has_template
                                        ? 'bg-card shadow-sm hover:border-primary/50'
                                        : 'border-dashed bg-card/60 hover:bg-card'
                                }`}
                            >
                                <CardContent className="space-y-3 p-4">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-start gap-2.5">
                                            <div
                                                className={`shrink-0 rounded-xl p-2.5 ${
                                                    item.has_template
                                                        ? item.file_extension ===
                                                          'PDF'
                                                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <FileText className="size-5" />
                                            </div>
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1.5 py-0 text-[9px] tracking-wider text-muted-foreground uppercase"
                                                    >
                                                        {item.category}
                                                    </Badge>
                                                    <StatusBadge
                                                        status={
                                                            item.required
                                                                ? 'required'
                                                                : 'optional'
                                                        }
                                                        className="px-1.5 py-0 text-[9px]"
                                                    />
                                                    {item.is_custom && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-purple-500/10 px-1.5 py-0 text-[9px] tracking-wider text-purple-700 uppercase dark:text-purple-300"
                                                        >
                                                            Custom
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="text-sm leading-snug font-semibold text-foreground">
                                                    {item.name}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <StatusBadge
                                            status={
                                                item.has_template
                                                    ? 'ready'
                                                    : 'no_template'
                                            }
                                            className="shrink-0 text-[10px]"
                                        />
                                    </div>

                                    {/* Description */}
                                    {item.description ? (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground/60 italic">
                                            No description provided.
                                        </p>
                                    )}

                                    {/* File Metadata Box */}
                                    {item.has_template ? (
                                        <div className="space-y-1 rounded-lg border border-border/40 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5 truncate font-medium text-foreground">
                                                <Badge
                                                    variant="outline"
                                                    className="px-1 py-0 text-[9px] font-bold uppercase"
                                                >
                                                    {item.file_extension}
                                                </Badge>
                                                <span className="truncate">
                                                    {item.original_filename}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>{item.file_size}</span>
                                                <span>
                                                    Updated {item.uploaded_at}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                                            <AlertCircle className="size-4 shrink-0 text-muted-foreground/60" />
                                            <span>
                                                No blank format attached.
                                                Interns will upload their own
                                                copy.
                                            </span>
                                        </div>
                                    )}

                                    {/* Instructions Snippet */}
                                    {item.instructions && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setInstructionsModalItem(item)
                                            }
                                            className="flex w-full cursor-pointer items-start gap-1.5 rounded-lg border border-primary/15 bg-primary/5 p-2 text-left text-xs text-foreground/90 transition-colors hover:bg-primary/10"
                                        >
                                            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                                            <span className="line-clamp-2">
                                                <strong className="text-primary">
                                                    Instructions:{' '}
                                                </strong>
                                                {item.instructions}
                                            </span>
                                        </button>
                                    )}
                                </CardContent>

                                {/* Action Toolbar */}
                                <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/10 px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                        {item.has_template &&
                                            item.download_url && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1.5 text-xs"
                                                            asChild
                                                        >
                                                            <a
                                                                href={
                                                                    item.download_url
                                                                }
                                                                download
                                                            >
                                                                <Download className="size-3.5" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Download blank format
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Edit Document Requirement */}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-8 gap-1.5 text-xs"
                                            onClick={() => openEditModal(item)}
                                        >
                                            <Pencil className="size-3.5" />
                                            Edit Document
                                        </Button>

                                        {/* Archive Button */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="size-8 p-0 text-muted-foreground hover:text-orange-600"
                                                    onClick={() =>
                                                        setConfirmAction({
                                                            type: 'archive',
                                                            target: item,
                                                        })
                                                    }
                                                >
                                                    <Archive className="size-3.5 text-orange-600" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Archive document requirement
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* Uniform Admin Table View */
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="px-6">
                                            Document Requirement
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Category
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Requirement
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Format Status
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Blank File
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Guidance
                                        </TableHead>
                                        <TableHead className="px-6 text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredChecklist.map((item) => (
                                        <TableRow
                                            key={item.document_type}
                                            className="hover:bg-muted/30"
                                        >
                                            <TableCell className="px-6 font-medium text-foreground">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold">
                                                            {item.name}
                                                        </span>
                                                        {item.is_custom && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="bg-purple-500/10 text-[9px] tracking-wider text-purple-700 uppercase dark:text-purple-300"
                                                            >
                                                                Custom
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="line-clamp-1 text-xs font-normal text-muted-foreground">
                                                        {item.description ||
                                                            'No description provided.'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {item.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <StatusBadge
                                                    status={
                                                        item.required
                                                            ? 'required'
                                                            : 'optional'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <StatusBadge
                                                    status={
                                                        item.has_template
                                                            ? 'ready'
                                                            : 'no_template'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="px-6 text-center text-xs">
                                                {item.has_template ? (
                                                    <div className="mx-auto max-w-[180px] space-y-0.5">
                                                        <div className="flex items-center justify-center gap-1.5 truncate font-medium text-foreground">
                                                            <Badge
                                                                variant="outline"
                                                                className="px-1 py-0 text-[9px] font-bold uppercase"
                                                            >
                                                                {
                                                                    item.file_extension
                                                                }
                                                            </Badge>
                                                            <span
                                                                className="truncate"
                                                                title={
                                                                    item.original_filename ||
                                                                    ''
                                                                }
                                                            >
                                                                {
                                                                    item.original_filename
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {item.file_size} •{' '}
                                                            {item.uploaded_at}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground italic">
                                                        None attached
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 text-center text-xs">
                                                {item.instructions ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setInstructionsModalItem(
                                                                item,
                                                            )
                                                        }
                                                        className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
                                                    >
                                                        <Info className="size-3" />
                                                        View guidance
                                                    </button>
                                                ) : (
                                                    <span className="text-muted-foreground italic">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {item.has_template &&
                                                        item.download_url && (
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8 text-primary hover:text-primary"
                                                                        asChild
                                                                    >
                                                                        <a
                                                                            href={
                                                                                item.download_url
                                                                            }
                                                                            download
                                                                        >
                                                                            <Download className="size-4" />
                                                                        </a>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Download
                                                                    Blank Format
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-blue-600 hover:text-blue-700"
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        item,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Edit Document
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-orange-600 hover:text-orange-700"
                                                                onClick={() =>
                                                                    setConfirmAction(
                                                                        {
                                                                            type: 'archive',
                                                                            target: item,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Archive className="size-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Archive Document
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── Add Document Requirement Dialog Component ─────────────────── */}
            <AddDocumentRequirementDialog
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                programName={program.program_name}
                availableCategories={availableCategories}
            />

            {/* ── Edit Document Requirement Dialog Component ────────────────── */}
            <EditDocumentRequirementDialog
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                item={editItem}
                availableCategories={availableCategories}
            />

            {/* ── View Guidance Instructions Modal Component ─────────────────── */}
            <ViewGuidanceDialog
                open={!!instructionsModalItem}
                onOpenChange={(open) => !open && setInstructionsModalItem(null)}
                item={instructionsModalItem}
                programName={program.program_name}
                onEditClick={() => {
                    if (instructionsModalItem) {
                        openEditModal(instructionsModalItem);
                    }
                }}
            />

            {/* ── Unified Confirmation Dialog ───────────────────────────────── */}
            <ConfirmationDialog
                open={!!confirmAction}
                onOpenChange={(open) => !open && setConfirmAction(null)}
                title={confirmConfig?.title ?? ''}
                description={confirmConfig?.description ?? ''}
                confirmText={confirmConfig?.confirmText ?? 'Confirm'}
                cancelText="Cancel"
                isDestructive={confirmConfig?.isDestructive ?? false}
                onConfirm={handleConfirm}
            />
        </>
    );
}
