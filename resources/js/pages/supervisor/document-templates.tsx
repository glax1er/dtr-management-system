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
    FilePlus,
    FileStack,
    FileText,
    Folder,
    FolderArchive,
    FolderOpen,
    HardDrive,
    Info,
    LayoutGrid,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Sparkles,
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
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
    total_templates: number;
    total_types: number;
    total_archived: number;
}

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'configured' | 'missing' | 'required' | 'optional';

const MAX_TEMPLATE_SIZE = 15 * 1024 * 1024; // 15MB

const DEFAULT_CATEGORIES = ['Pre Deployment', 'During Deployment', 'Evaluation Forms'];

export default function DocumentTemplates({
    checklist,
    folders = [],
    archived = [],
    categories = [],
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

    // ── All Available Categories List ────────────────────────────────────────
    const availableCategories = useMemo(() => {
        const set = new Set<string>([...DEFAULT_CATEGORIES, ...categories]);
        checklist.forEach((item) => {
            if (item.category) set.add(item.category);
        });
        return Array.from(set);
    }, [categories, checklist]);

    // ── Add Document Modal State ─────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addName, setAddName] = useState('');
    const [addCategory, setAddCategory] = useState('Pre Deployment');
    const [isAddCustomCategory, setIsAddCustomCategory] = useState(false);
    const [addCustomCategory, setAddCustomCategory] = useState('');
    const [addDescription, setAddDescription] = useState('');
    const [addRequired, setAddRequired] = useState(true);
    const [addInstructions, setAddInstructions] = useState('');
    const [addFile, setAddFile] = useState<File | null>(null);
    const [isAddSubmitting, setIsAddSubmitting] = useState(false);
    const [isAddDragOver, setIsAddDragOver] = useState(false);
    const addFileInputRef = useRef<HTMLInputElement>(null);

    // ── Edit Document Modal State ────────────────────────────────────────────
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<TemplateChecklistItem | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('Pre Deployment');
    const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
    const [editCustomCategory, setEditCustomCategory] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editRequired, setEditRequired] = useState(true);
    const [editInstructions, setEditInstructions] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [removeTemplate, setRemoveTemplate] = useState(false);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [isEditDragOver, setIsEditDragOver] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // ── View Guidance Modal State ────────────────────────────────────────────
    const [instructionsModalItem, setInstructionsModalItem] = useState<TemplateChecklistItem | null>(null);

    // ── Confirmation Dialogs State ───────────────────────────────────────────
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<TemplateChecklistItem | null>(null);

    const [restoreOpen, setRestoreOpen] = useState(false);
    const [restoreTarget, setRestoreTarget] = useState<ArchivedTemplate | null>(null);

    const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
    const [forceDeleteTarget, setForceDeleteTarget] = useState<ArchivedTemplate | null>(null);

    // Progress percentage
    const progressPercent = total_types > 0 ? Math.round((total_templates / total_types) * 100) : 0;

    // ── Open Add Modal ───────────────────────────────────────────────────────
    const openAddModal = () => {
        setAddName('');
        setAddCategory(availableCategories[0] || 'Pre Deployment');
        setIsAddCustomCategory(false);
        setAddCustomCategory('');
        setAddDescription('');
        setAddRequired(true);
        setAddInstructions('');
        setAddFile(null);
        setIsAddModalOpen(true);
    };

    // ── Open Edit Modal ──────────────────────────────────────────────────────
    const openEditModal = (item: TemplateChecklistItem) => {
        setEditItem(item);
        setEditName(item.name);
        if (availableCategories.includes(item.category)) {
            setEditCategory(item.category);
            setIsEditCustomCategory(false);
            setEditCustomCategory('');
        } else {
            setEditCategory('__custom__');
            setIsEditCustomCategory(true);
            setEditCustomCategory(item.category);
        }
        setEditDescription(item.description || '');
        setEditRequired(item.required);
        setEditInstructions(item.instructions || '');
        setEditFile(null);
        setRemoveTemplate(false);
        setIsEditModalOpen(true);
    };

    const validateFile = (file: File): boolean => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
            toast.error('Invalid format. Templates must be PDF or Microsoft Word (.pdf, .docx, .doc).');
            return false;
        }

        if (file.size > MAX_TEMPLATE_SIZE) {
            toast.error('The selected template file is too large (max 15 MB).');
            return false;
        }

        return true;
    };

    // ── Handle Add Submit ────────────────────────────────────────────────────
    const handleAddSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmedName = addName.trim();
        if (!trimmedName) {
            toast.error('Please enter a document title.');
            return;
        }

        const categoryVal = isAddCustomCategory ? addCustomCategory.trim() : addCategory.trim();
        if (!categoryVal) {
            toast.error('Please specify a category for this document.');
            return;
        }

        const formData = new FormData();
        formData.append('name', trimmedName);
        formData.append('category', categoryVal);
        if (addDescription.trim()) {
            formData.append('description', addDescription.trim());
        }
        formData.append('required', addRequired ? '1' : '0');
        if (addInstructions.trim()) {
            formData.append('instructions', addInstructions.trim());
        }
        if (addFile) {
            formData.append('file', addFile);
        }

        setIsAddSubmitting(true);

        router.post('/supervisor/document-templates', formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success(`Document requirement "${trimmedName}" added successfully.`);
                setIsAddModalOpen(false);
                setAddFile(null);
            },
            onError: (errors) => {
                const msg = Object.values(errors)[0] as string || 'Failed to create document requirement.';
                toast.error(msg);
            },
            onFinish: () => {
                setIsAddSubmitting(false);
            },
        });
    };

    // ── Handle Edit Submit ───────────────────────────────────────────────────
    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editItem) return;

        const trimmedName = editName.trim();
        if (!trimmedName) {
            toast.error('Please enter a document title.');
            return;
        }

        const categoryVal = isEditCustomCategory ? editCustomCategory.trim() : editCategory.trim();
        if (!categoryVal) {
            toast.error('Please specify a category for this document.');
            return;
        }

        const formData = new FormData();
        formData.append('name', trimmedName);
        formData.append('category', categoryVal);
        if (editDescription.trim()) {
            formData.append('description', editDescription.trim());
        }
        formData.append('required', editRequired ? '1' : '0');
        if (editInstructions.trim()) {
            formData.append('instructions', editInstructions.trim());
        }
        if (editFile) {
            formData.append('file', editFile);
        }
        if (removeTemplate) {
            formData.append('remove_template', '1');
        }

        setIsEditSubmitting(true);

        router.post(`/supervisor/document-templates/${editItem.document_type}/update`, formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success(`Document requirement "${trimmedName}" updated.`);
                setIsEditModalOpen(false);
                setEditItem(null);
                setEditFile(null);
                setRemoveTemplate(false);
            },
            onError: (errors) => {
                const msg = Object.values(errors)[0] as string || 'Failed to update document requirement.';
                toast.error(msg);
            },
            onFinish: () => {
                setIsEditSubmitting(false);
            },
        });
    };

    // ── Archive (Soft Delete) Handlers ───────────────────────────────────────
    const openArchiveDialog = (item: TemplateChecklistItem) => {
        setArchiveTarget(item);
        setArchiveOpen(true);
    };

    const submitArchive = () => {
        if (!archiveTarget) return;
        router.delete(`/supervisor/document-templates/${archiveTarget.document_type}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Document "${archiveTarget.name}" moved to archive.`);
                setArchiveOpen(false);
                setArchiveTarget(null);
            },
            onError: () => {
                toast.error('Failed to archive document.');
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
                toast.success(`Document "${restoreTarget.name}" restored successfully.`);
                setRestoreOpen(false);
                setRestoreTarget(null);
            },
            onError: () => {
                toast.error('Failed to restore document.');
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
                toast.success(`Document "${forceDeleteTarget.name}" permanently deleted.`);
                setForceDeleteOpen(false);
                setForceDeleteTarget(null);
            },
            onError: () => {
                toast.error('Failed to delete document.');
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
            if (statusFilter === 'required' && !item.required) return false;
            if (statusFilter === 'optional' && item.required) return false;

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
                (item.original_filename && item.original_filename.toLowerCase().includes(query)) ||
                item.category.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query))
        );
    }, [archived, search]);

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
        if (lower.includes('eval')) {
            return {
                border: 'hover:border-emerald-500/50',
                activeBorder: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
                iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            };
        }
        return {
            border: 'hover:border-purple-500/50',
            activeBorder: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
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
                                        onValueChange={(val: StatusFilter) => setStatusFilter(val)}
                                    >
                                        <SelectTrigger className="h-9 w-44">
                                            <SlidersHorizontal className="mr-1 size-3.5 shrink-0 text-muted-foreground" />
                                            <SelectValue placeholder="All Documents" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Documents</SelectItem>
                                            <SelectItem value="configured">Template Attached</SelectItem>
                                            <SelectItem value="missing">No Template</SelectItem>
                                            <SelectItem value="required">Required Only</SelectItem>
                                            <SelectItem value="optional">Optional Only</SelectItem>
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
                                            <SelectItem value="all">All Documents</SelectItem>
                                            <SelectItem value="configured">Template Attached</SelectItem>
                                            <SelectItem value="missing">No Template</SelectItem>
                                            <SelectItem value="required">Required Only</SelectItem>
                                            <SelectItem value="optional">Optional Only</SelectItem>
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

                        {/* Primary Action Button: Add Document */}
                        <Button
                            onClick={openAddModal}
                            size="sm"
                            className="gap-1.5 shadow-sm"
                        >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Add Document</span>
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

                {/* ── Drive Folders Section ───────────────────────────────────── */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Folder className="size-4 text-primary" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Categories & Folders
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
                                View All Categories
                            </Button>
                        )}
                    </div>

                    {/* Category Folder Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                                            <span>{f.total_items} {f.total_items === 1 ? 'doc' : 'docs'}</span>
                                            <span>•</span>
                                            <span className={f.templates_count === f.total_items ? 'text-emerald-600 font-medium' : ''}>
                                                {f.templates_count} format{f.templates_count === 1 ? '' : 's'}
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
                                    Archived Documents
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {total_archived} {total_archived === 1 ? 'archived item' : 'archived items'}
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
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1.5 py-0">
                            {activeFolder === 'trash' ? filteredArchived.length : filteredChecklist.length} items
                        </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Templates format: <span className="font-medium text-foreground">.pdf, .docx, .doc</span> (max 15 MB)
                    </div>
                </div>

                {/* ── Files Display Section ──────────────────────────────────── */}
                {activeFolder === 'trash' ? (
                    /* ── ARCHIVE / TRASH VIEW ── */
                    filteredArchived.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FolderArchive className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium text-sm text-foreground">No archived documents</h3>
                            <p className="text-xs mt-1">
                                Archived document requirements will appear here and can be restored anytime.
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
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            {item.category}
                                                        </Badge>
                                                        {item.is_custom && (
                                                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                                Custom
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h3 className="font-semibold text-sm text-foreground leading-tight">
                                                        {item.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-orange-600 border-orange-200 shrink-0 text-[10px]">
                                                Archived
                                            </Badge>
                                        </div>

                                        {item.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40 space-y-1">
                                            {item.original_filename ? (
                                                <div className="truncate font-medium text-foreground flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                                        {item.file_extension || 'FILE'}
                                                    </Badge>
                                                    <span className="truncate">{item.original_filename}</span>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] italic text-muted-foreground">
                                                    No template file attached
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                                                <span>{item.file_size || 'No file'}</span>
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
                                            <TableHead>Type</TableHead>
                                            <TableHead>Template File</TableHead>
                                            <TableHead>Archived Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredArchived.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-semibold text-foreground">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{item.name}</span>
                                                            {item.is_custom && (
                                                                <Badge variant="secondary" className="text-[9px] uppercase bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                                    Custom
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <div className="text-xs text-muted-foreground line-clamp-1 font-normal">
                                                                {item.description}
                                                            </div>
                                                        )}
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
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {item.original_filename || <span className="italic">None</span>}
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
                                                            <TooltipContent>Restore Document</TooltipContent>
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
                    /* ── ACTIVE DOCUMENTS VIEW ── */
                    filteredChecklist.length === 0 ? (
                        <Card className="border-dashed p-10 text-center text-muted-foreground">
                            <FileStack className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                            <h3 className="font-medium text-sm text-foreground">No document requirements found</h3>
                            <p className="text-xs mt-1">
                                {search
                                    ? 'No document requirements match your search query.'
                                    : 'No documents configured in this section.'}
                            </p>
                            <div className="mt-4">
                                <Button onClick={openAddModal} size="sm" className="gap-1.5">
                                    <Plus className="size-4" />
                                    Add Document
                                </Button>
                            </div>
                        </Card>
                    ) : view === 'grid' ? (
                        /* Document Requirements Grid */
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
                                                        {item.is_custom && (
                                                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0">
                                                                Custom
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
                                        {item.description ? (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {item.description}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground/60 italic">
                                                No description provided.
                                            </p>
                                        )}

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
                                                <span>No blank format attached. Interns will upload their own copy.</span>
                                            </div>
                                        )}

                                        {/* Instructions Snippet */}
                                        {item.instructions && (
                                            <button
                                                type="button"
                                                onClick={() => setInstructionsModalItem(item)}
                                                className="w-full text-left bg-primary/5 hover:bg-primary/10 transition-colors text-foreground/90 border border-primary/15 rounded-lg p-2 text-xs flex items-start gap-1.5 cursor-pointer"
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
                                                        onClick={() => openArchiveDialog(item)}
                                                    >
                                                        <Archive className="size-3.5 text-orange-600" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Archive document requirement</TooltipContent>
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
                                            <TableHead>Document Requirement</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Requirement</TableHead>
                                            <TableHead>Format Status</TableHead>
                                            <TableHead>Blank File</TableHead>
                                            <TableHead>Guidance</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredChecklist.map((item) => (
                                            <TableRow key={item.document_type} className="hover:bg-muted/30">
                                                <TableCell className="font-semibold text-foreground">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{item.name}</span>
                                                            {item.is_custom && (
                                                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                                                    Custom
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-normal line-clamp-1">
                                                            {item.description || 'No description provided.'}
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
                                                            No Template
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
                                                        <span className="text-muted-foreground italic">None attached</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {item.instructions ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setInstructionsModalItem(item)}
                                                            className="text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
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
                                                                    className="size-8 text-blue-600 hover:text-blue-700"
                                                                    onClick={() => openEditModal(item)}
                                                                >
                                                                    <Pencil className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Document</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-orange-600 hover:text-orange-700"
                                                                    onClick={() => openArchiveDialog(item)}
                                                                >
                                                                    <Archive className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Archive Document</TooltipContent>
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
                )}
            </div>

            {/* ── Add Document Requirement Dialog ─────────────────────────── */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold flex items-center gap-2">
                                <FilePlus className="size-5 text-primary" />
                                Add Document Requirement
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Add a new clearance document requirement for {program.program_name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5">
                            {/* Document Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="add-name" className="text-xs font-medium">
                                    Document Title / Requirement Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="add-name"
                                    value={addName}
                                    onChange={(e) => setAddName(e.target.value)}
                                    placeholder="e.g. Health Certificate, Company NDA, Clearance Form"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            {/* Category Selector / Custom Category */}
                            <div className="space-y-1.5">
                                <Label htmlFor="add-category" className="text-xs font-medium">
                                    Category / Folder <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={isAddCustomCategory ? '__custom__' : addCategory}
                                    onValueChange={(val) => {
                                        if (val === '__custom__') {
                                            setIsAddCustomCategory(true);
                                        } else {
                                            setIsAddCustomCategory(false);
                                            setAddCategory(val);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="add-category" className="text-xs">
                                        <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat} className="text-xs">
                                                {cat}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="__custom__" className="text-xs font-semibold text-primary">
                                            + Add Custom Category...
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {isAddCustomCategory && (
                                    <Input
                                        value={addCustomCategory}
                                        onChange={(e) => setAddCustomCategory(e.target.value)}
                                        placeholder="Enter new category name (e.g. Post Deployment)..."
                                        className="text-xs mt-1.5"
                                        required
                                        autoFocus
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="add-description" className="text-xs font-medium">
                                    Requirement Description (Optional)
                                </Label>
                                <Textarea
                                    id="add-description"
                                    value={addDescription}
                                    onChange={(e) => setAddDescription(e.target.value)}
                                    placeholder="Brief summary explaining what this document is for and who issues it..."
                                    rows={2}
                                    className="text-xs resize-none"
                                />
                            </div>

                            {/* Required Checkbox */}
                            <div className="flex items-start gap-2.5 rounded-lg border border-border/70 p-3 bg-muted/20">
                                <Checkbox
                                    id="add-required"
                                    checked={addRequired}
                                    onCheckedChange={(checked) => setAddRequired(!!checked)}
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5 leading-none">
                                    <Label htmlFor="add-required" className="text-xs font-medium cursor-pointer">
                                        Mandatory / Required Document
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Interns cannot complete clearance without having an approved upload for this requirement.
                                    </p>
                                </div>
                            </div>

                            {/* Guidance & Instructions for Interns */}
                            <div className="space-y-1.5">
                                <Label htmlFor="add-instructions" className="text-xs font-medium">
                                    Intern Instructions (Optional)
                                </Label>
                                <Textarea
                                    id="add-instructions"
                                    value={addInstructions}
                                    onChange={(e) => setAddInstructions(e.target.value)}
                                    placeholder="e.g. Sign in blue ink, obtain parent/guardian signature, and scan in PDF format before uploading."
                                    rows={2}
                                    className="text-xs resize-none"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Interns will see this instructions when preparing and submitting this document.
                                </p>
                            </div>

                            {/* Optional Blank Template File Upload */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Blank Template File <span className="text-muted-foreground font-normal">(Optional)</span>
                                </Label>

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsAddDragOver(true);
                                    }}
                                    onDragLeave={() => setIsAddDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsAddDragOver(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && validateFile(file)) setAddFile(file);
                                    }}
                                    onClick={() => addFileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                                        isAddDragOver
                                            ? 'border-primary bg-primary/5'
                                            : addFile
                                              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                                              : 'border-input hover:border-primary/50 hover:bg-muted/30'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={addFileInputRef}
                                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && validateFile(file)) setAddFile(file);
                                        }}
                                        className="hidden"
                                    />

                                    {addFile ? (
                                        <div className="space-y-1 text-xs">
                                            <FileCheck className="size-7 mx-auto text-emerald-600" />
                                            <div className="font-semibold text-foreground truncate max-w-sm mx-auto">
                                                {addFile.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {(addFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-xs">
                                            <UploadCloud className="size-7 mx-auto text-muted-foreground/80" />
                                            <div className="font-medium text-foreground">
                                                Click to browse or drop optional template file here
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Supports PDF (.pdf) and Word (.docx, .doc) up to 15 MB
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAddModalOpen(false)}
                                disabled={isAddSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isAddSubmitting || !addName.trim()}
                                className="gap-1.5"
                            >
                                {isAddSubmitting ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="size-3.5" />
                                        Create Document
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Edit Document Requirement Dialog ────────────────────────── */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold flex items-center gap-2">
                                <Pencil className="size-5 text-primary" />
                                Edit Document Requirement
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Update details, instructions, or template file for {editItem?.name}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3.5">
                            {/* Document Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-name" className="text-xs font-medium">
                                    Document Title / Requirement Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="e.g. Parent's Consent"
                                    className="text-xs"
                                    required
                                />
                            </div>

                            {/* Category Selector / Custom Category */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-category" className="text-xs font-medium">
                                    Category / Folder <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={isEditCustomCategory ? '__custom__' : editCategory}
                                    onValueChange={(val) => {
                                        if (val === '__custom__') {
                                            setIsEditCustomCategory(true);
                                        } else {
                                            setIsEditCustomCategory(false);
                                            setEditCategory(val);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="edit-category" className="text-xs">
                                        <SelectValue placeholder="Select category..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat} className="text-xs">
                                                {cat}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="__custom__" className="text-xs font-semibold text-primary">
                                            + Add Custom Category...
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {isEditCustomCategory && (
                                    <Input
                                        value={editCustomCategory}
                                        onChange={(e) => setEditCustomCategory(e.target.value)}
                                        placeholder="Enter category name..."
                                        className="text-xs mt-1.5"
                                        required
                                        autoFocus
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-description" className="text-xs font-medium">
                                    Requirement Description (Optional)
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Brief summary explaining what this document is for..."
                                    rows={2}
                                    className="text-xs resize-none"
                                />
                            </div>

                            {/* Required Checkbox */}
                            <div className="flex items-start gap-2.5 rounded-lg border border-border/70 p-3 bg-muted/20">
                                <Checkbox
                                    id="edit-required"
                                    checked={editRequired}
                                    onCheckedChange={(checked) => setEditRequired(!!checked)}
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5 leading-none">
                                    <Label htmlFor="edit-required" className="text-xs font-medium cursor-pointer">
                                        Mandatory / Required Document
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Interns cannot complete clearance without having an approved upload for this requirement.
                                    </p>
                                </div>
                            </div>

                            {/* Guidance & Instructions */}
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-instructions" className="text-xs font-medium">
                                    Intern Guidance & Instructions (Optional)
                                </Label>
                                <Textarea
                                    id="edit-instructions"
                                    value={editInstructions}
                                    onChange={(e) => setEditInstructions(e.target.value)}
                                    placeholder="e.g. Sign in blue ink, obtain parent/guardian signature..."
                                    rows={2}
                                    className="text-xs resize-none"
                                />
                            </div>

                            {/* Template File Section */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Blank Template File <span className="text-muted-foreground font-normal">(Optional)</span>
                                </Label>

                                {editItem?.has_template && !removeTemplate && !editFile && (
                                    <div className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="size-4 text-primary shrink-0" />
                                            <div className="truncate">
                                                <span className="font-semibold text-foreground">{editItem.original_filename}</span>{' '}
                                                <span className="text-muted-foreground">({editItem.file_size})</span>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRemoveTemplate(true)}
                                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        >
                                            Remove Template
                                        </Button>
                                    </div>
                                )}

                                {removeTemplate && !editFile && (
                                    <div className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 p-2.5 rounded-lg border border-amber-500/20 flex items-center justify-between">
                                        <span>Template file will be removed upon saving.</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setRemoveTemplate(false)}
                                            className="h-6 text-xs"
                                        >
                                            Undo
                                        </Button>
                                    </div>
                                )}

                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsEditDragOver(true);
                                    }}
                                    onDragLeave={() => setIsEditDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsEditDragOver(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && validateFile(file)) {
                                            setEditFile(file);
                                            setRemoveTemplate(false);
                                        }
                                    }}
                                    onClick={() => editFileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                                        isEditDragOver
                                            ? 'border-primary bg-primary/5'
                                            : editFile
                                              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                                              : 'border-input hover:border-primary/50 hover:bg-muted/30'
                                    }`}
                                >
                                    <input
                                        type="file"
                                        ref={editFileInputRef}
                                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file && validateFile(file)) {
                                                setEditFile(file);
                                                setRemoveTemplate(false);
                                            }
                                        }}
                                        className="hidden"
                                    />

                                    {editFile ? (
                                        <div className="space-y-1 text-xs">
                                            <FileCheck className="size-7 mx-auto text-emerald-600" />
                                            <div className="font-semibold text-foreground truncate max-w-sm mx-auto">
                                                New file: {editFile.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {(editFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-xs">
                                            <UploadCloud className="size-7 mx-auto text-muted-foreground/80" />
                                            <div className="font-medium text-foreground">
                                                {editItem?.has_template && !removeTemplate
                                                    ? 'Click or drop file here to replace blank template'
                                                    : 'Click or drop file here to attach blank template'}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Supports PDF (.pdf) and Word (.docx, .doc) up to 15 MB
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isEditSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isEditSubmitting || !editName.trim()}
                                className="gap-1.5"
                            >
                                {isEditSubmitting ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Pencil className="size-3.5" />
                                        Save Changes
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
                        {instructionsModalItem?.instructions || 'No specific instructions added for this document requirement.'}
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
                                if (it) openEditModal(it);
                            }}
                            className="gap-1.5"
                        >
                            <Pencil className="size-3.5" />
                            Edit Guidance
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Confirmation Dialog: Archive ─────────────────────────────── */}
            <ConfirmationDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title="Archive Document Requirement"
                description={`Move "${archiveTarget?.name}" to the archive? Interns will no longer see this requirement in their checklist until it is restored.`}
                confirmText="Archive Document"
                cancelText="Cancel"
                isDestructive={false}
                onConfirm={submitArchive}
            />

            {/* ── Confirmation Dialog: Restore ─────────────────────────────── */}
            <ConfirmationDialog
                open={restoreOpen}
                onOpenChange={setRestoreOpen}
                title="Restore Document Requirement"
                description={`Restore "${restoreTarget?.name}"? It will become active and available for interns in your program again.`}
                confirmText="Restore Document"
                cancelText="Cancel"
                isDestructive={false}
                onConfirm={submitRestore}
            />

            {/* ── Confirmation Dialog: Force Delete ─────────────────────────── */}
            <ConfirmationDialog
                open={forceDeleteOpen}
                onOpenChange={setForceDeleteOpen}
                title="Permanently Delete Document Requirement"
                description={`Are you sure you want to permanently erase "${forceDeleteTarget?.name}"? This action cannot be undone and will delete any associated template files.`}
                confirmText="Delete Permanently"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={submitForceDelete}
            />
        </>
    );
}
