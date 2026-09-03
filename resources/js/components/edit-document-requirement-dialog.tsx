import { router } from '@inertiajs/react';
import {
    FileCheck,
    FileText,
    Loader2,
    Pencil,
    UploadCloud,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import documentTemplates from '@/routes/supervisor/document-templates';

const MAX_TEMPLATE_SIZE = 15 * 1024 * 1024; // 15MB

export interface EditableTemplateItem {
    document_type: string;
    name: string;
    category: string;
    description: string;
    required: boolean;
    has_template: boolean;
    original_filename: string | null;
    file_size: string | null;
    instructions: string | null;
}

interface EditDocumentRequirementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: EditableTemplateItem | null;
    availableCategories: string[];
    onSuccess?: () => void;
}

export function EditDocumentRequirementDialog({
    open,
    onOpenChange,
    item,
    availableCategories,
    onSuccess,
}: EditDocumentRequirementDialogProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Pre Deployment');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [description, setDescription] = useState('');
    const [required, setRequired] = useState(true);
    const [instructions, setInstructions] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [removeTemplate, setRemoveTemplate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Populates the form from `item` whenever the dialog opens for a new
    // item. Kept as an effect (not moved into handleOpenChange) because
    // the open=true transition happens via the parent setting `open`
    // directly, not through this component's onOpenChange — there's no
    // handler in this component to move the logic into.
    useEffect(() => {
        if (item && open) {
            setName(item.name);

            if (availableCategories.includes(item.category)) {
                setCategory(item.category);
                setIsCustomCategory(false);
                setCustomCategory('');
            } else {
                setCategory('__custom__');
                setIsCustomCategory(true);
                setCustomCategory(item.category);
            }

            setDescription(item.description || '');
            setRequired(item.required);
            setInstructions(item.instructions || '');
            setFile(null);
            setRemoveTemplate(false);
            setIsDragOver(false);
        }
    }, [item, open, availableCategories]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setFile(null);
            setRemoveTemplate(false);
        }

        onOpenChange(newOpen);
    };

    const validateFile = (selectedFile: File): boolean => {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();

        if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
            toast.error(
                'Invalid format. Templates must be PDF or Microsoft Word (.pdf, .docx, .doc).',
            );

            return false;
        }

        if (selectedFile.size > MAX_TEMPLATE_SIZE) {
            toast.error('The selected template file is too large (max 15 MB).');

            return false;
        }

        return true;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!item) {
return;
}

        const trimmedName = name.trim();

        if (!trimmedName) {
            toast.error('Please enter a document title.');

            return;
        }

        const categoryVal = isCustomCategory
            ? customCategory.trim()
            : category.trim();

        if (!categoryVal) {
            toast.error('Please specify a category for this document.');

            return;
        }

        const formData = new FormData();
        formData.append('name', trimmedName);
        formData.append('category', categoryVal);

        if (description.trim()) {
            formData.append('description', description.trim());
        }

        formData.append('required', required ? '1' : '0');

        if (instructions.trim()) {
            formData.append('instructions', instructions.trim());
        }

        if (file) {
            formData.append('file', file);
        }

        if (removeTemplate) {
            formData.append('remove_template', '1');
        }

        setIsSubmitting(true);

        router.post(
            documentTemplates.update.url(item.document_type),
            formData,
            {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    toast.success(
                        `Document requirement "${trimmedName}" updated.`,
                    );
                    handleOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    const msg =
                        (Object.values(errors)[0] as string) ||
                        'Failed to update document requirement.';
                    toast.error(msg);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[85vh] sm:rounded-xl">
                {/* ── Dialog Header ── */}
                <DialogHeader className="shrink-0 border-b bg-card px-5 py-4 sm:px-6 sm:py-5">
                    <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground sm:text-lg">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Pencil className="size-5" />
                        </div>
                        <span>Edit Document Requirement</span>
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs text-muted-foreground">
                        Update details, instructions, or template file for{' '}
                        <span className="font-medium text-foreground">
                            {item?.name}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>

                {/* ── Form Body (Scrollable & Responsive) ── */}
                <form
                    id="edit-doc-requirement-form"
                    onSubmit={handleSubmit}
                    className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
                >
                    {/* Document Title */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="edit-doc-name"
                            className="text-xs font-semibold text-foreground"
                        >
                            Document Title / Requirement Name{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="edit-doc-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Parent's Consent"
                            className="h-10 text-xs sm:text-sm"
                            required
                        />
                    </div>

                    {/* Category Selector / Custom Category */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="edit-doc-category"
                            className="text-xs font-semibold text-foreground"
                        >
                            Category / Folder{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={isCustomCategory ? '__custom__' : category}
                            onValueChange={(val) => {
                                if (val === '__custom__') {
                                    setIsCustomCategory(true);
                                } else {
                                    setIsCustomCategory(false);
                                    setCategory(val);
                                }
                            }}
                        >
                            <SelectTrigger
                                id="edit-doc-category"
                                className="h-10 text-xs sm:text-sm"
                            >
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map((cat) => (
                                    <SelectItem
                                        key={cat}
                                        value={cat}
                                        className="text-xs sm:text-sm"
                                    >
                                        {cat}
                                    </SelectItem>
                                ))}
                                <SelectItem
                                    value="__custom__"
                                    className="text-xs font-semibold text-primary sm:text-sm"
                                >
                                    + Add Custom Category...
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {isCustomCategory && (
                            <div className="pt-1.5">
                                <Input
                                    value={customCategory}
                                    onChange={(e) =>
                                        setCustomCategory(e.target.value)
                                    }
                                    placeholder="Enter category name..."
                                    className="h-10 text-xs sm:text-sm"
                                    required
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="edit-doc-desc"
                            className="text-xs font-semibold text-foreground"
                        >
                            Requirement Description{' '}
                            <span className="font-normal text-muted-foreground">
                                (Optional)
                            </span>
                        </Label>
                        <Textarea
                            id="edit-doc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief summary explaining what this document is for..."
                            rows={2}
                            className="resize-none text-xs sm:text-sm"
                        />
                    </div>

                    {/* Mandatory / Required Toggle Card */}
                    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30">
                        <Checkbox
                            id="edit-doc-required"
                            checked={required}
                            onCheckedChange={(checked) =>
                                setRequired(!!checked)
                            }
                            className="mt-0.5"
                        />
                        <div className="space-y-0.5 leading-none">
                            <Label
                                htmlFor="edit-doc-required"
                                className="cursor-pointer text-xs font-semibold text-foreground sm:text-sm"
                            >
                                Mandatory / Required Document
                            </Label>
                            <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                Interns cannot complete clearance without having
                                an approved upload for this requirement.
                            </p>
                        </div>
                    </div>

                    {/* Intern Guidance & Instructions */}
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="edit-doc-instructions"
                            className="text-xs font-semibold text-foreground"
                        >
                            Intern Instructions & Guidelines{' '}
                            <span className="font-normal text-muted-foreground">
                                (Optional)
                            </span>
                        </Label>
                        <Textarea
                            id="edit-doc-instructions"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="e.g. Sign in blue ink, obtain parent/guardian signature..."
                            rows={2}
                            className="resize-none text-xs sm:text-sm"
                        />
                    </div>

                    {/* Template File Section */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                            Blank Template File{' '}
                            <span className="font-normal text-muted-foreground">
                                (Optional)
                            </span>
                        </Label>

                        {/* Existing File Notice Card */}
                        {item?.has_template && !removeTemplate && !file && (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs">
                                <div className="flex min-w-0 items-center gap-2">
                                    <FileText className="size-4 shrink-0 text-primary" />
                                    <div className="truncate">
                                        <span className="font-semibold text-foreground">
                                            {item.original_filename}
                                        </span>{' '}
                                        <span className="text-muted-foreground">
                                            ({item.file_size})
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRemoveTemplate(true)}
                                    className="h-7 shrink-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    Remove Template
                                </Button>
                            </div>
                        )}

                        {removeTemplate && !file && (
                            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                                <span>
                                    Template file will be removed upon saving.
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRemoveTemplate(false)}
                                    className="h-6 text-xs font-semibold hover:underline"
                                >
                                    Undo
                                </Button>
                            </div>
                        )}

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                const droppedFile = e.dataTransfer.files?.[0];

                                if (droppedFile && validateFile(droppedFile)) {
                                    setFile(droppedFile);
                                    setRemoveTemplate(false);
                                }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 sm:p-5 ${
                                isDragOver
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : file
                                      ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/15'
                                      : 'border-input hover:border-primary/50 hover:bg-muted/30'
                            }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];

                                    if (
                                        selectedFile &&
                                        validateFile(selectedFile)
                                    ) {
                                        setFile(selectedFile);
                                        setRemoveTemplate(false);
                                    }
                                }}
                                className="hidden"
                            />

                            {file ? (
                                <div className="space-y-1.5 text-xs">
                                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                        <FileCheck className="size-5" />
                                    </div>
                                    <div className="mx-auto max-w-xs truncate text-xs font-semibold text-foreground sm:text-sm">
                                        New file: {file.name}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {(file.size / (1024 * 1024)).toFixed(2)}{' '}
                                        MB • Click or drop to replace
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 text-xs">
                                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <UploadCloud className="size-5" />
                                    </div>
                                    <div className="text-xs font-medium text-foreground sm:text-sm">
                                        {item?.has_template && !removeTemplate
                                            ? 'Click or drop file here to replace blank template'
                                            : 'Click or drop file here to attach blank template'}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Supports PDF (.pdf) and Word (.docx,
                                        .doc) up to 15 MB
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* ── Dialog Footer (Responsive Buttons) ── */}
                <DialogFooter className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/20 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                        className="h-9 w-full text-xs sm:w-auto sm:text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="edit-doc-requirement-form"
                        size="sm"
                        disabled={isSubmitting || !name.trim()}
                        className="h-9 w-full gap-1.5 text-xs shadow-sm sm:w-auto sm:text-sm"
                    >
                        {isSubmitting ? (
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
            </DialogContent>
        </Dialog>
    );
}
