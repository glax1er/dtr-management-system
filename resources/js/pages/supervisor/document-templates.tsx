import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileCheck,
    FileEdit,
    FilePlus,
    FileStack,
    FileText,
    HelpCircle,
    Info,
    Loader2,
    RefreshCw,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';

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

interface DocumentTemplatesProps {
    checklist: TemplateChecklistItem[];
    program: {
        program_id: number | null;
        program_name: string;
    };
    total_templates: number;
    total_types: number;
}

const MAX_TEMPLATE_SIZE = 15 * 1024 * 1024; // 15MB

export default function DocumentTemplates({
    checklist,
    program,
    total_templates,
    total_types,
}: DocumentTemplatesProps) {
    const [selectedItem, setSelectedItem] =
        useState<TemplateChecklistItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openUploadModal = (item: TemplateChecklistItem) => {
        setSelectedItem(item);
        setInstructions(item.instructions || '');
        setFileToUpload(null);
        setIsUploadModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
            toast.error(
                'Invalid format. Blank templates must be in PDF or Word (.pdf, .docx, .doc) format.',
            );
            e.target.value = '';
            return;
        }

        if (file.size > MAX_TEMPLATE_SIZE) {
            toast.error('The selected template is too large (max 15 MB).');
            e.target.value = '';
            return;
        }

        setFileToUpload(file);
    };

    const handleSubmitTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        if (!selectedItem.has_template && !fileToUpload) {
            toast.error('Please select a template file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('document_type', selectedItem.document_type);
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
                toast.success(
                    `Blank template for "${selectedItem.name}" saved.`,
                );
                setIsUploadModalOpen(false);
                setSelectedItem(null);
                setFileToUpload(null);
            },
            onError: (errors) => {
                const msg =
                    errors.file ||
                    errors.instructions ||
                    'Failed to save template.';
                toast.error(msg);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleDeleteTemplate = (item: TemplateChecklistItem) => {
        if (!item.template_id) return;

        if (
            confirm(
                `Remove the blank template for "${item.name}"? Interns will no longer be able to download this format.`,
            )
        ) {
            router.delete(
                `/supervisor/document-templates/${item.template_id}`,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success('Blank template removed.');
                    },
                    onError: () => {
                        toast.error('Failed to remove template.');
                    },
                },
            );
        }
    };

    const categories = Array.from(
        new Set(checklist.map((item) => item.category)),
    );

    return (
        <>
            <Head title="Document Templates" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 px-3 py-4 sm:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                Document Templates
                            </h1>
                            <Badge
                                variant="secondary"
                                className="text-xs font-semibold"
                            >
                                {program.program_name}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Upload official blank forms and templates. Interns
                            in your program can download these blank files
                            directly to fill and sign.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0 text-primary" />
                        <span>
                            Accepted formats: <strong>.pdf, .docx, .doc</strong>{' '}
                            (max 15 MB)
                        </span>
                    </div>
                </div>

                {/* Overview Banner Card */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">
                                    Program Template Repository Status
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {total_templates} of {total_types}{' '}
                                    requirement types have an active blank
                                    template uploaded.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-foreground tabular-nums">
                                    {Math.round(
                                        (total_templates / total_types) * 100,
                                    )}
                                    %
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Configured
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{
                                    width: `${(total_templates / total_types) * 100}%`,
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Categorized List */}
                <div className="space-y-8">
                    {categories.map((category) => {
                        const items = checklist.filter(
                            (item) => item.category === category,
                        );

                        return (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <FileStack className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {category}
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        ({items.length}{' '}
                                        {items.length === 1 ? 'item' : 'items'})
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {items.map((item, index) => {
                                        return (
                                            <Card
                                                key={
                                                    item.document_type ||
                                                    `doc-${index}`
                                                }
                                                className={`border-border/70 transition-all duration-200 ${
                                                    item.has_template
                                                        ? 'border-emerald-500/30 bg-card'
                                                        : 'bg-card/60'
                                                }`}
                                            >
                                                <CardContent className="p-5">
                                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                        {/* Left Info */}
                                                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                                            <div
                                                                className={`shrink-0 rounded-xl p-2.5 ${
                                                                    item.has_template
                                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-muted text-muted-foreground'
                                                                }`}
                                                            >
                                                                <FileText className="h-6 w-6" />
                                                            </div>

                                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <h3 className="text-base font-semibold text-foreground">
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </h3>
                                                                    {item.required ? (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="text-[10px] font-semibold tracking-wider uppercase"
                                                                        >
                                                                            Required
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] tracking-wider text-muted-foreground uppercase"
                                                                        >
                                                                            Optional
                                                                        </Badge>
                                                                    )}

                                                                    {item.has_template ? (
                                                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                                                            Template
                                                                            Ready
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-muted-foreground"
                                                                        >
                                                                            No
                                                                            Template
                                                                            Uploaded
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                <p className="text-xs text-muted-foreground">
                                                                    {
                                                                        item.description
                                                                    }
                                                                </p>

                                                                {/* Uploaded Template Details */}
                                                                {item.has_template && (
                                                                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/40 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                                                        <span className="flex max-w-xs items-center gap-1.5 truncate font-medium text-foreground sm:max-w-md">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="px-1.5 py-0 text-[10px] font-bold uppercase"
                                                                            >
                                                                                {
                                                                                    item.file_extension
                                                                                }
                                                                            </Badge>
                                                                            <span className="truncate">
                                                                                {
                                                                                    item.original_filename
                                                                                }
                                                                            </span>
                                                                        </span>
                                                                        {item.file_size && (
                                                                            <span>
                                                                                •{' '}
                                                                                {
                                                                                    item.file_size
                                                                                }
                                                                            </span>
                                                                        )}
                                                                        {item.uploaded_at && (
                                                                            <span>
                                                                                •
                                                                                Updated{' '}
                                                                                {
                                                                                    item.uploaded_at
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Special Instructions */}
                                                                {item.instructions && (
                                                                    <div className="mt-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-foreground/90">
                                                                        <span className="font-semibold text-primary">
                                                                            Instructions
                                                                            for
                                                                            Interns:{' '}
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                item.instructions
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right Actions */}
                                                        <div className="flex shrink-0 flex-wrap items-center gap-2 self-end lg:self-center">
                                                            {item.has_template ? (
                                                                <>
                                                                    {/* Download File */}
                                                                    {item.download_url && (
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
                                                                                <Download className="h-3.5 w-3.5" />
                                                                                Download
                                                                                Blank
                                                                            </a>
                                                                        </Button>
                                                                    )}

                                                                    {/* Edit / Replace */}
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="h-8 gap-1.5 text-xs"
                                                                        onClick={() =>
                                                                            openUploadModal(
                                                                                item,
                                                                            )
                                                                        }
                                                                    >
                                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                                        Replace
                                                                        / Edit
                                                                    </Button>

                                                                    {/* Remove */}
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                                        onClick={() =>
                                                                            handleDeleteTemplate(
                                                                                item,
                                                                            )
                                                                        }
                                                                        title="Remove template"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                /* Upload New Template */
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 gap-1.5 text-xs shadow-sm"
                                                                    onClick={() =>
                                                                        openUploadModal(
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    <UploadCloud className="h-3.5 w-3.5" />
                                                                    Upload Blank
                                                                    Format
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upload / Replace Template Dialog */}
            <Dialog
                open={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
            >
                <DialogContent className="max-w-md">
                    <form onSubmit={handleSubmitTemplate} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="text-base font-semibold">
                                {selectedItem?.has_template
                                    ? 'Update Blank Template'
                                    : 'Upload Blank Template'}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {selectedItem?.name} ({program.program_name})
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs font-medium">
                                    Blank Template File{' '}
                                    {selectedItem?.has_template
                                        ? '(Optional if only changing instructions)'
                                        : '<span className="text-destructive">*</span>'}
                                </Label>
                                <div className="mt-1.5">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                        onChange={handleFileChange}
                                        className="block w-full cursor-pointer rounded-md border border-input p-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:opacity-90"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Supports PDF, Word (.docx, .doc) files
                                        up to 15 MB.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-medium">
                                    Guidance / Instructions for Interns
                                    (Optional)
                                </Label>
                                <Textarea
                                    value={instructions}
                                    onChange={(e) =>
                                        setInstructions(e.target.value)
                                    }
                                    placeholder="e.g. Fill out sections 1 and 2, sign in blue ink, and have your guardian sign before scanning to PDF."
                                    rows={3}
                                    className="mt-1 text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsUploadModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    isSubmitting ||
                                    (!selectedItem?.has_template &&
                                        !fileToUpload)
                                }
                                className="gap-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="h-3.5 w-3.5" />
                                        Save Template
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
