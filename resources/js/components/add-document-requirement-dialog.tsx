import { router } from '@inertiajs/react';
import {
    FileCheck,
    FilePlus,
    Loader2,
    Plus,
    UploadCloud,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
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

interface AddDocumentRequirementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programName: string;
    availableCategories: string[];
    onSuccess?: () => void;
}

export function AddDocumentRequirementDialog({
    open,
    onOpenChange,
    programName,
    availableCategories,
    onSuccess,
}: AddDocumentRequirementDialogProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState(availableCategories[0] || 'Pre Deployment');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [description, setDescription] = useState('');
    const [required, setRequired] = useState(true);
    const [instructions, setInstructions] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setName('');
        setCategory(availableCategories[0] || 'Pre Deployment');
        setIsCustomCategory(false);
        setCustomCategory('');
        setDescription('');
        setRequired(true);
        setInstructions('');
        setFile(null);
        setIsDragOver(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    const validateFile = (selectedFile: File): boolean => {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
            toast.error('Invalid format. Templates must be PDF or Microsoft Word (.pdf, .docx, .doc).');
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
        const trimmedName = name.trim();
        if (!trimmedName) {
            toast.error('Please enter a document title.');
            return;
        }

        const categoryVal = isCustomCategory ? customCategory.trim() : category.trim();
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

        setIsSubmitting(true);

        router.post(documentTemplates.store.url(), formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success(`Document requirement "${trimmedName}" added successfully.`);
                handleOpenChange(false);
                onSuccess?.();
            },
            onError: (errors) => {
                const msg = (Object.values(errors)[0] as string) || 'Failed to create document requirement.';
                toast.error(msg);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] p-0 flex flex-col overflow-hidden gap-0 rounded-2xl sm:rounded-xl">
                {/* ── Dialog Header ── */}
                <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 border-b bg-card shrink-0">
                    <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2.5 text-foreground">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <FilePlus className="size-5" />
                        </div>
                        <span>Add Document Requirement</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        Add a new clearance document requirement for <span className="font-medium text-foreground">{programName}</span>.
                    </DialogDescription>
                </DialogHeader>

                {/* ── Form Body (Scrollable & Responsive) ── */}
                <form id="add-doc-requirement-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
                    {/* Document Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-doc-name" className="text-xs font-semibold text-foreground">
                            Document Title / Requirement Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="add-doc-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Medical Certificate, Endorsement Letter, NDA"
                            className="h-10 text-xs sm:text-sm"
                            required
                        />
                    </div>

                    {/* Category Selector / Custom Category */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-doc-category" className="text-xs font-semibold text-foreground">
                            Category / Folder <span className="text-destructive">*</span>
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
                            <SelectTrigger id="add-doc-category" className="h-10 text-xs sm:text-sm">
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat} className="text-xs sm:text-sm">
                                        {cat}
                                    </SelectItem>
                                ))}
                                <SelectItem value="__custom__" className="text-xs sm:text-sm font-semibold text-primary">
                                    + Add Custom Category...
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {isCustomCategory && (
                            <div className="pt-1.5">
                                <Input
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    placeholder="Enter new category name (e.g. Post Deployment)..."
                                    className="h-10 text-xs sm:text-sm"
                                    required
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* Requirement Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-doc-desc" className="text-xs font-semibold text-foreground">
                            Requirement Description <span className="text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Textarea
                            id="add-doc-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief summary explaining what this document is for and who issues it..."
                            rows={2}
                            className="text-xs sm:text-sm resize-none"
                        />
                    </div>

                    {/* Mandatory / Required Toggle Card */}
                    <div className="flex items-start gap-3 rounded-xl border border-border/80 p-3.5 bg-muted/20 hover:bg-muted/30 transition-colors">
                        <Checkbox
                            id="add-doc-required"
                            checked={required}
                            onCheckedChange={(checked) => setRequired(!!checked)}
                            className="mt-0.5"
                        />
                        <div className="space-y-0.5 leading-none">
                            <Label htmlFor="add-doc-required" className="text-xs sm:text-sm font-semibold text-foreground cursor-pointer">
                                Mandatory / Required Document
                            </Label>
                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                Interns cannot complete clearance without having an approved upload for this requirement.
                            </p>
                        </div>
                    </div>

                    {/* Intern Guidance & Instructions */}
                    <div className="space-y-1.5">
                        <Label htmlFor="add-doc-instructions" className="text-xs font-semibold text-foreground">
                            Intern Instructions & Guidelines <span className="text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Textarea
                            id="add-doc-instructions"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="e.g. Must be signed with wet blue ink by your supervisor and submitted in PDF format."
                            rows={2}
                            className="text-xs sm:text-sm resize-none"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Interns will see this guidance when preparing and uploading their document.
                        </p>
                    </div>

                    {/* Blank Template File Upload Dropzone */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-foreground">
                                Blank Template File <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            {file && (
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="text-[11px] text-destructive hover:underline inline-flex items-center gap-1"
                                >
                                    <X className="size-3" />
                                    Remove file
                                </button>
                            )}
                        </div>

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
                                }
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 ${
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
                                    if (selectedFile && validateFile(selectedFile)) {
                                        setFile(selectedFile);
                                    }
                                }}
                                className="hidden"
                            />

                            {file ? (
                                <div className="space-y-1.5 text-xs">
                                    <div className="size-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                        <FileCheck className="size-5" />
                                    </div>
                                    <div className="font-semibold text-foreground truncate max-w-xs mx-auto text-xs sm:text-sm">
                                        {file.name}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5 text-xs">
                                    <div className="size-10 mx-auto rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                                        <UploadCloud className="size-5" />
                                    </div>
                                    <div className="font-medium text-foreground text-xs sm:text-sm">
                                        Click to browse or drop template file here
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Supports PDF (.pdf) and Word (.docx, .doc) up to 15 MB
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* ── Dialog Footer (Responsive Buttons) ── */}
                <DialogFooter className="px-5 py-3.5 sm:px-6 sm:py-4 border-t bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto h-9 text-xs sm:text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="add-doc-requirement-form"
                        size="sm"
                        disabled={isSubmitting || !name.trim()}
                        className="w-full sm:w-auto h-9 gap-1.5 text-xs sm:text-sm shadow-sm"
                    >
                        {isSubmitting ? (
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
            </DialogContent>
        </Dialog>
    );
}
