import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    ArchiveRestore,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Download,
    FileCheck,
    FileEdit,
    FileStack,
    FileText,
    Folder,
    FolderArchive,
    FolderOpen,
    HardDrive,
    HelpCircle,
    Info,
    LayoutGrid,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Table as TableIcon,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ── Types ────────────────────────────────────────────────────────────────────
interface TemplateChecklistItem {
    document_type: string;
    name: string;
    category: string;
    description: string;
    required: boolean;
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
    original_filename: string;
    file_size: string;
    file_extension: string;
    instructions: string | null;
    deleted_at: string;
    deleted_at_human: string;
    uploaded_by_name: string;
}

interface DocumentTemplatesProps {
    checklist: TemplateChecklistItem[];
    folders: FolderMeta[];
    archived: ArchivedTemplate[];
    program: {
        program_id: number | null;
        program_name: string;
    };
    total_templates: number;
    total_types: number;
    total_archived: number;
}

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'configured' | 'missing';

const MAX_TEMPLATE_SIZE = 15 * 1024 * 1024; // 15MB

export default function DocumentTemplates({
    checklist,
    folders = [],
    archived = [],
    program,
    total_templates,
    total_types,
    total_archived = 0,
}: DocumentTemplatesProps) {
    const [view, setView] = useState<ViewMode>('table');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [activeFolder, setActiveFolder] = useState<string>('all'); // 'all' | folder_name | 'trash'
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    // Upload / Edit modal state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TemplateChecklistItem | null>(null);
    const [selectedDocType, setSelectedDocType] = useState<string>('');
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // View instructions modal state
    const [instructionsModalItem, setInstructionsModalItem] = useState<TemplateChecklistItem | null>(null);

    // Confirmation dialogs
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<TemplateChecklistItem | null>(null);

    const [restoreOpen, setRestoreOpen] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<ArchivedTemplate | null>(null);

    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
    const [forceDeleteTarget, setForceDeleteTarget] = useState<ArchivedTemplate | null>(null);

    // Progress percentage
    const progressPercent = total_types > 0 ? Math.round((total_templates / total_types) * 100) : 0;

    // ── Open Upload Modal ───────────────────────────────────────────────────
    const openUploadModal = (item?: TemplateChecklistItem) => {
        if (item) {
            setSelectedItem(item);
            setSelectedDocType(item.document_type);
            setInstructions(item.instructions || '');
        } else {
            const firstWithoutTemplate = checklist.find((c) => !c.has_template) || checklist[0];
            setSelectedItem(firstWithoutTemplate || null);
            setSelectedDocType(firstWithoutTemplate?.document_type || '');
            setInstructions(firstWithoutTemplate?.instructions || '');
        }
        setFileToUpload(null);
        setIsUploadModalOpen(true);
    };

    const handleDocTypeChange = (typeKey: string) => {
        setSelectedDocType(typeKey);
        const item = checklist.find((c) => c.document_type === typeKey) || null;
        setSelectedItem(item);
        if (item) {
            setInstructions(item.instructions || '');
        }
    };

    const handleFile = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
            toast.error('Invalid format. Blank templates must be PDF or Word (.pdf, .docx, .doc).');
            return;
        }

        if (file.size > MAX_TEMPLATE_SIZE) {
            toast.error('The selected template file is too large (max 15 MB).');
            return;
        }

        setFileToUpload(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    // ── Submit Template ──────────────────────────────────────────────────────
    const handleSubmitTemplate = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDocType) {
            toast.error('Please select a document type.');
            return;
        }

        const currentConfig = checklist.find((c) => c.document_type === selectedDocType);
        if (!currentConfig?.has_template && !fileToUpload) {
            toast.error('Please select a template file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('document_type', selectedDocType);
        if (fileToUpload) {
            formData.append('file', fileToUpload);
        }
        if (instructions.trim()) {
            formData.append('instructions', instructions.trim());
        }

        setIsSubmitting(true);

        router.post('/supervisor/document-templates', formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success(`Template for "${currentConfig?.name || 'Document'}" saved successfully.`);
                setIsUploadModalOpen(false);
                setSelectedItem(null);
                setFileToUpload(null);
                setInstructions('');
            },
            onError: (errors) => {
                const msg = errors.file || errors.instructions || errors.document_type || 'Failed to save template.';
                toast.error(msg);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    // ── Archive (Soft Delete) Handlers ───────────────────────────────────────
    const openArchiveDialog = (item: TemplateChecklistItem) => {
        setArchiveTarget(item);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (!archiveTarget?.template_id) return;
        router.delete(`/supervisor/document-templates/${archiveTarget.template_id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setArchiveOpen(false);
                setArchiveTarget(null);
            },
        });
    };

    // ── Restore Handlers ────────────────────────────────────────────────────
    const openRestoreDialog = (item: ArchivedTemplate) => {
        setRestoreTarget(item);
        setRestoreOpen(true);
    };

    const submitRestore = () => {
        if (!restoreTarget) return;
        router.post(`/supervisor/document-templates/${restoreTarget.id}/restore`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setRestoreOpen(false);
                setRestoreTarget(null);
            },
        });
    };

    // ── Force Delete Handlers ────────────────────────────────────────────────
    const openForceDeleteDialog = (item: ArchivedTemplate) => {
        setForceDeleteTarget(item);
        setForceDeleteOpen(true);
    };

    const submitForceDelete = () => {
        if (!forceDeleteTarget) return;
        router.delete(`/supervisor/document-templates/${forceDeleteTarget.id}/force`, {
            preserveScroll: true,
            onSuccess: () => {
                setForceDeleteOpen(false);
                setForceDeleteTarget(null);
            },
        });
    };

    // ── Filtered Items Calculation ──────────────────────────────────────────
    const filteredChecklist = useMemo(() => {
        return checklist.filter((item) => {
            // Folder category filter
            if (activeFolder !== 'all' && activeFolder !== 'trash') {
                if (item.category !== activeFolder) return false;
            }

            // Status filter
            if (statusFilter === 'configured' && !item.has_template) return false;
            if (statusFilter === 'missing' && item.has_template) return false;

            // Search filter
            if (search.trim()) {
                const query = search.toLowerCase();
                const matchName = item.name.toLowerCase().includes(query);
                const matchDesc = item.description.toLowerCase().includes(query);
                const matchCategory = item.category.toLowerCase().includes(query);
                const matchFile = item.original_filename?.toLowerCase().includes(query);
                if (!matchName && !matchDesc && !matchCategory && !matchFile) return false;
            }

            return true;
        });
    }, [checklist, activeFolder, statusFilter, search]);

    const filteredArchived = useMemo(() => {
        if (!search.trim()) return archived;
        const query = search.toLowerCase();
        return archived.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.original_filename.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
        );
    }, [archived, search]);

    // Distinct category names
    const categoryNames = useMemo(() => {
        return folders.length > 0
            ? folders.map((f) => f.name)
            : Array.from(new Set(checklist.map((c) => c.category)));
    }, [folders, checklist]);

    const getFolderColorClass = (catName: string) => {
        const lower = catName.toLowerCase();
        if (lower.includes('pre')) {
            return {
                border: 'hover:border-blue-500/50',
                activeBorder: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
                iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            };
        }
        if (lower.includes('during')) {
            return {
                border: 'hover:border-amber-500/50',
                activeBorder: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
                iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            };
        }
        return {
            border: 'hover:border-emerald-500/50',
            activeBorder: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
    };

    return (
        <>
            <Head title="Document Templates" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* ── Top Header Toolbar ──────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
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
                                placeholder="Search templates…"
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
                                        onValueChange={(val: StatusFilter) => setStatusFilter(val)}
                                    >
                                        <SelectTrigger className="h-9 w-40">
                                            <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="configured">Template Ready</SelectItem>
                                            <SelectItem value="missing">Missing Template</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="sm:hidden">
                                    <Select
                                        value={statusFilter}
                                        onValueChange={(val: StatusFilter) => setStatusFilter(val)}
                                    >
                                        <SelectTrigger className="inline-flex size-9 items-center justify-center p-0 [&>span]:hidden [&>svg:last-child]:hidden">
                                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="configured">Template Ready</SelectItem>
                                            <SelectItem value="missing">Missing Template</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {/* View Mode Switcher (Tabs) */}
                        <div className="hidden sm:block">
                            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
                                <TabsList>
                                    <TabsTrigger value="table"><TableIcon className="size-4" /></TabsTrigger>
                                    <TabsTrigger value="grid"><LayoutGrid className="size-4" /></TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Primary Action Button */}
                        <Button
                            onClick={() => openUploadModal()}
                            size="sm"
                            className="gap-1.5 shadow-sm"
                        >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Upload Template</span>
                            <span className="sm:hidden">Upload</span>
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
                            placeholder="Search document templates..."
                            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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

                {/* ── Repository Status & Coverage Banner ─────────────────────── */}
                <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card via-card to-muted/30">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <HardDrive className="size-4 text-primary shrink-0" />
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Program Blank Template Repository
                                    </h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {total_templates} of {total_types} requirement types configured with official blank templates.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                    <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                                        {progressPercent}%
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Active Coverage
                                    </div>
                                </div>
                                <div className="w-28 sm:w-36 h-2.5 overflow-hidden rounded-full bg-secondary/80 border border-border/50">
                                    <div
                                        className="h-full bg-primary transition-all duration-500 rounded-full"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Google Drive Folders Section ───────────────────────────── */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Folder className="size-4 text-primary" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Drive Folders
                            </h2>
                        </div>

                        {activeFolder !== 'all' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveFolder('all')}
                                className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            >
                                <ArrowLeft className="size-3" />
                                View All Folders
                            </Button>
                        )}
                    </div>

                    {/* Google Drive Folder Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Pre-Deployment, During Deployment, Evaluation Forms */}
                        {folders.map((f) => {
                            const colors = getFolderColorClass(f.name);
                            const isSelected = activeFolder === f.name;

                            return (
                                <button
                                    key={f.name}
                                    type="button"
                                    onClick={() => setActiveFolder(isSelected ? 'all' : f.name)}
                                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                        isSelected
                                            ? colors.activeBorder + ' shadow-sm ring-1 ring-primary/30'
                                            : 'bg-card border-border/70 hover:bg-accent/40 ' + colors.border
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-lg shrink-0 ${colors.iconBg}`}>
                                        {isSelected ? (
                                            <FolderOpen className="size-5" />
                                        ) : (
                                            <Folder className="size-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="font-semibold text-sm truncate text-foreground">
                                            {f.name}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{f.total_items} items</span>
                                            <span>•</span>
                                            <span className={f.templates_count === f.total_items ? 'text-emerald-600 font-medium' : ''}>
                                                {f.templates_count} ready
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Archived / Trash Folder Card */}
                        <button
                            type="button"
                            onClick={() => setActiveFolder(activeFolder === 'trash' ? 'all' : 'trash')}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                activeFolder === 'trash'
                                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 shadow-sm ring-1 ring-orange-500/30'
                                    : 'bg-card border-border/70 hover:bg-accent/40 hover:border-orange-500/50'
                            }`}
                        >
                            <div className="p-2.5 rounded-lg shrink-0 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                <FolderArchive className="size-5" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="font-semibold text-sm truncate text-foreground">
                                    Archived Templates
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {total_archived} {total_archived === 1 ? 'archived file' : 'archived files'}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* ── Breadcrumb & Filter Status Header ───────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => setActiveFolder('all')}
                            className={`hover:text-foreground font-medium transition-colors ${
                                activeFolder === 'all' ? 'text-foreground font-semibold' : ''
                            }`}
                        >
                            My Drive
                        </button>
                        <span>/</span>
                        <span className="font-semibold text-foreground">
                            {activeFolder === 'all'
                                ? 'All Sections'
                                : activeFolder === 'trash'
                                  ? 'Archived Templates (Trash)'
                                  : activeFolder}
                        </span>
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                            {activeFolder === 'trash' ? filteredArchived.length : filteredChecklist.length} items
                        </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Accepted Formats: <span className="font-medium text-foreground">.pdf, .docx, .doc</span> (max 15 MB)
                    </div>
                </div>

                {/* ── Files Display Section ──────────────────────────────────── */}
                {activeFolder === 'trash' ? (
                    /* ── ARCHIVE / TRASH VIEW ── */
                    filteredArchived.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FolderArchive className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium text-sm text-foreground">No archived templates</h3>
                            <p className="text-xs mt-1">
                                Removed templates will be safely kept here and can be restored anytime.
                            </p>
                        </Card>
                    ) : view === 'grid' ? (
                        /* Archived Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredArchived.map((item) => (
                                <Card
                                    key={item.id}
                                    className="border-border/70 bg-card/60 hover:bg-card transition-all duration-200 flex flex-col justify-between"
                                >
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 shrink-0">
                                                    <FileText className="size-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <Badge variant="outline" className="text-[10px] mb-1 text-muted-foreground">
                                                        {item.category}
                                                    </Badge>
                                                    <h3 className="font-semibold text-sm text-foreground leading-tight">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-orange-600 border-orange-200 shrink-0 text-[10px]">
                                                Archived
                                            </Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 space-y-1">
                                            <div className="truncate font-medium text-foreground flex items-center gap-1.5">
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                                    {item.file_extension}
                                                </Badge>
                                                <span className="truncate">{item.original_filename}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span>{item.file_size}</span>
                                                <span>Archived {item.deleted_at_human}</span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-end gap-2 bg-muted/20">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                            onClick={() => openRestoreDialog(item)}
                                        >
                                            <ArchiveRestore className="size-3.5" />
                                            Restore
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => openForceDeleteDialog(item)}
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
                                            <TableHead>Document Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Original File</TableHead>
                                            <TableHead>File Size</TableHead>
                                            <TableHead>Archived Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredArchived.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-semibold text-foreground">
                                                    {item.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {item.original_filename}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.file_size}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.deleted_at}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-emerald-600"
                                                                    onClick={() => openRestoreDialog(item)}
                                                                >
                                                                    <ArchiveRestore className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Restore</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-destructive"
                                                                    onClick={() => openForceDeleteDialog(item)}
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete Permanently</TooltipContent>
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
                ) : (
                    /* ── ACTIVE TEMPLATES VIEW ── */
                    filteredChecklist.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FileStack className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium text-sm text-foreground">No document templates found</h3>
                            <p className="text-xs mt-1">
                                {search
                                    ? 'No templates match your search query.'
                                    : 'No templates configured in this section.'}
                            </p>
                        </Card>
                    ) : view === 'grid' ? (
                        /* Google Drive File Cards Grid */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredChecklist.map((item) => (
                                <Card
                                    key={item.document_type}
                                    className={`transition-all duration-200 border-border/70 flex flex-col justify-between ${
                                        item.has_template
                                            ? 'bg-card hover:border-primary/50 shadow-sm'
                                            : 'bg-card/60 hover:bg-card border-dashed'
                                    }`}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div
                                                    className={`p-2.5 rounded-xl shrink-0 ${
                                                        item.has_template
                                                            ? item.file_extension === 'PDF'
                                                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <FileText className="size-5" />
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground px-1.5 py-0">
                                                            {item.category}
                                                        </Badge>
                                                        {item.required ? (
                                                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0">
                                                                Required
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground px-1.5 py-0">
                                                                Optional
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="font-semibold text-sm text-foreground leading-snug">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {item.has_template ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] shrink-0">
                                                    <CheckCircle2 className="mr-1 size-3" />
                                                    Ready
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground text-[10px] shrink-0 border-dashed">
                                                    No Template
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.description}
                                        </p>

                                        {/* File Metadata Box */}
                                        {item.has_template ? (
                                            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/40 space-y-1 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold uppercase">
                                                        {item.file_extension}
                                                    </Badge>
                                                    <span className="truncate">{item.original_filename}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                    <span>{item.file_size}</span>
                                                    <span>Updated {item.uploaded_at}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-muted/20 p-2.5 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                                                <AlertCircle className="size-4 text-muted-foreground/60 shrink-0" />
                                                <span>No blank format uploaded yet for this requirement.</span>
                                            </div>
                                        )}

                                        {/* Instructions Snippet */}
                                        {item.instructions && (
                                            <button
                                                type="button"
                                                onClick={() => setInstructionsModalItem(item)}
                                                className="w-full text-left bg-primary/5 hover:bg-primary/10 transition-colors text-foreground/90 border border-primary/15 rounded-lg p-2 text-xs flex items-start gap-1.5"
                                            >
                                                <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">
                                                    <strong className="text-primary">Instructions: </strong>
                                                    {item.instructions}
                                                </span>
                                            </button>
                                        )}
                                    </CardContent>

                                    {/* Action Toolbar */}
                                    <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between gap-2 bg-muted/10">
                                        <div className="flex items-center gap-1">
                                            {item.has_template && item.download_url && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 gap-1.5 text-xs"
                                                            asChild
                                                        >
                                                            <a href={item.download_url} download>
                                                                <Download className="size-3.5" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Download blank format</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* Upload / Replace */}
                                            <Button
                                                size="sm"
                                                variant={item.has_template ? 'secondary' : 'default'}
                                                className="h-8 gap-1.5 text-xs"
                                                onClick={() => openUploadModal(item)}
                                            >
                                                {item.has_template ? (
                                                    <>
                                                        <RefreshCw className="size-3.5" />
                                                        Replace / Edit
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud className="size-3.5" />
                                                        Upload Template
                                                    </>
                                                )}
                                            </Button>

                                            {/* Archive Button */}
                                            {item.has_template && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => openArchiveDialog(item)}
                                                        >
                                                            <Archive className="size-3.5 text-orange-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Archive template</TooltipContent>
                                                </Tooltip>
                                            )}
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
                                            <TableHead>Document Requirement</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Requirement</TableHead>
                                            <TableHead>Template Status</TableHead>
                                            <TableHead>Blank File Details</TableHead>
                                            <TableHead>Instructions</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredChecklist.map((item) => (
                                            <TableRow key={item.document_type} className="hover:bg-muted/30">
                                                <TableCell className="font-semibold text-foreground">
                                                    <div className="space-y-0.5">
                                                        <div>{item.name}</div>
                                                        <div className="text-xs text-muted-foreground font-normal line-clamp-1">
                                                            {item.description}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.required ? (
                                                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                                                            Required
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                                                            Optional
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {item.has_template ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs">
                                                            <CheckCircle2 className="mr-1 size-3" />
                                                            Ready
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground text-xs border-dashed">
                                                            Missing
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {item.has_template ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-medium text-foreground flex items-center gap-1.5 truncate max-w-xs">
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold">
                                                                    {item.file_extension}
                                                                </Badge>
                                                                <span className="truncate">{item.original_filename}</span>
                                                            </div>
                                                            <div className="text-muted-foreground text-[11px]">
                                                                {item.file_size} • {item.uploaded_at}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">None</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {item.instructions ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setInstructionsModalItem(item)}
                                                            className="text-primary hover:underline flex items-center gap-1 font-medium"
                                                        >
                                                            <Info className="size-3" />
                                                            View guidance
                                                        </button>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {item.has_template && item.download_url && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        asChild
                                                                    >
                                                                        <a href={item.download_url} download>
                                                                            <Download className="size-4 text-primary" />
                                                                        </a>
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Download Blank Format</TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    onClick={() => openUploadModal(item)}
                                                                >
                                                                    {item.has_template ? (
                                                                        <RefreshCw className="size-4 text-blue-600" />
                                                                    ) : (
                                                                        <UploadCloud className="size-4 text-primary" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {item.has_template ? 'Replace / Edit Template' : 'Upload Template'}
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {item.has_template && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        onClick={() => openArchiveDialog(item)}
                                                                    >
                                                                        <Archive className="size-4 text-orange-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Archive Template</TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )
                )}
            </div>

            {/* ── Upload / Replace Template Dialog ─────────────────────────── */}
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleSubmitTemplate} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold flex items-center gap-2">
                                <UploadCloud className="size-5 text-primary" />
                                {selectedItem?.has_template ? 'Update Blank Template' : 'Upload Blank Template'}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Configure the official blank document template for {program.program_name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5">
                            {/* Document Type Selector */}
                            <div className="space-y-1.5">
                                <Label htmlFor="doc-type-select" className="text-xs font-medium">
                                    Document Requirement Type <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={selectedDocType}
                                    onValueChange={handleDocTypeChange}
                                >
                                    <SelectTrigger id="doc-type-select" className="text-xs">
                                        <SelectValue placeholder="Select requirement type..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        {categoryNames.map((category) => {
                                            const items = checklist.filter((c) => c.category === category);
                                            return (
                                                <div key={category} className="py-1">
                                                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40">
                                                        {category}
                                                    </div>
                                                    {items.map((it) => (
                                                        <SelectItem
                                                            key={it.document_type}
                                                            value={it.document_type}
                                                            className="text-xs pl-4"
                                                        >
                                                            <div className="flex items-center justify-between gap-3 w-full">
                                                                <span>{it.name}</span>
                                                                {it.has_template && (
                                                                    <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">
                                                                        Configured
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {selectedItem && (
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {selectedItem.description}
                                    </p>
                                )}
                            </div>

                            {/* Drag and drop upload zone */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Blank Template File{' '}
                                    {selectedItem?.has_template ? (
                                        <span className="text-muted-foreground font-normal">(Optional if updating guidance only)</span>
                                    ) : (
                                        <span className="text-destructive">*</span>
                                    )}
                                </Label>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(true);
                                    }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                                        isDragOver
                                            ? 'border-primary bg-primary/5'
                                            : fileToUpload
                                              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                                              : 'border-input hover:border-primary/50 hover:bg-muted/30'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                    />

                                    {fileToUpload ? (
                                        <div className="space-y-1 text-xs">
                                            <FileCheck className="size-7 mx-auto text-emerald-600" />
                                            <div className="font-semibold text-foreground truncate max-w-sm mx-auto">
                                                {fileToUpload.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-xs">
                                            <UploadCloud className="size-7 mx-auto text-muted-foreground/80" />
                                            <div className="font-medium text-foreground">
                                                Click to browse or drag & drop template file here
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Supports PDF (.pdf) and Microsoft Word (.docx, .doc) up to 15 MB
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selectedItem?.has_template && !fileToUpload && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 bg-muted/40 p-2 rounded-md border border-border/50">
                                        <FileText className="size-3.5 text-primary shrink-0" />
                                        <span>
                                            Current active file: <strong>{selectedItem.original_filename}</strong> ({selectedItem.file_size})
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Instructions textarea */}
                            <div className="space-y-1.5">
                                <Label htmlFor="instructions-input" className="text-xs font-medium">
                                    Guidance / Instructions for Interns (Optional)
                                </Label>
                                <Textarea
                                    id="instructions-input"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="e.g. Fill out all sections in blue ink, obtain parent/guardian signature, and scan in PDF format before submitting."
                                    rows={3}
                                    className="text-xs resize-none"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Interns will see these instructions when downloading the blank format.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsUploadModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    isSubmitting ||
                                    !selectedDocType ||
                                    (!selectedItem?.has_template && !fileToUpload)
                                }
                                className="gap-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="size-3.5" />
                                        Save Template
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Guidance Instructions Modal ───────────────────────── */}
            <Dialog
                open={!!instructionsModalItem}
                onOpenChange={(open) => !open && setInstructionsModalItem(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold flex items-center gap-2">
                            <Info className="size-5 text-primary" />
                            Intern Guidance & Instructions
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {instructionsModalItem?.name} ({program.program_name})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {instructionsModalItem?.instructions || 'No specific instructions added for this document template.'}
                    </div>

                    <DialogFooter>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInstructionsModalItem(null)}
                        >
                            Close
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                const it = instructionsModalItem;
                                setInstructionsModalItem(null);
                                if (it) openUploadModal(it);
                            }}
                            className="gap-1.5"
                        >
                            <FileEdit className="size-3.5" />
                            Edit Instructions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Confirmation Dialog: Archive ─────────────────────────────── */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive Blank Template"
                description={`Move the blank template for "${archiveTarget?.name}" to the archive? Interns will no longer be able to download this format until it is restored.`}
                confirmText="Archive Template"
                cancelText="Cancel"
                isDestructive={false}
                onConfirm={submitArchive}
            />

            {/* ── Confirmation Dialog: Restore ─────────────────────────────── */}
            <ConfirmationDialog
                open={restoreOpen}
                onOpenChange={setRestoreOpen}
                title="Restore Blank Template"
                description={`Restore the blank template for "${restoreTarget?.name}"? It will become active and available for interns in your program again.`}
                confirmText="Restore Template"
                cancelText="Cancel"
                isDestructive={false}
                onConfirm={submitRestore}
            />

            {/* ── Confirmation Dialog: Force Delete ─────────────────────────── */}
            <ConfirmationDialog
                open={forceDeleteOpen}
                onOpenChange={setForceDeleteOpen}
                title="Permanently Delete Blank Template"
                description={`Are you sure you want to permanently erase the blank template for "${forceDeleteTarget?.name}"? This action cannot be undone and will delete the physical file.`}
                confirmText="Delete Permanently"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={submitForceDelete}
            />
        </>
    );
}
