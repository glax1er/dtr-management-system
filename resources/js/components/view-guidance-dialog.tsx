import { Info, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface GuidanceItem {
    name: string;
    instructions: string | null;
}

interface ViewGuidanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: GuidanceItem | null;
    programName: string;
    onEditClick?: () => void;
}

export function ViewGuidanceDialog({
    open,
    onOpenChange,
    item,
    programName,
    onEditClick,
}: ViewGuidanceDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-full p-0 flex flex-col overflow-hidden gap-0 rounded-2xl sm:rounded-xl">
                <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 border-b bg-card shrink-0">
                    <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2.5 text-foreground">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                            <Info className="size-5" />
                        </div>
                        <span>Intern Guidance & Instructions</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground">{item?.name}</span> ({programName})
                    </DialogDescription>
                </DialogHeader>

                <div className="p-5 sm:p-6">
                    <div className="bg-muted/40 p-4 rounded-xl border border-border/60 text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {item?.instructions || 'No specific instructions added for this document requirement.'}
                    </div>
                </div>

                <DialogFooter className="px-5 py-3.5 sm:px-6 sm:py-4 border-t bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto h-9 text-xs sm:text-sm"
                    >
                        Close
                    </Button>
                    {onEditClick && (
                        <Button
                            size="sm"
                            onClick={() => {
                                onOpenChange(false);
                                onEditClick();
                            }}
                            className="w-full sm:w-auto h-9 gap-1.5 text-xs sm:text-sm shadow-sm"
                        >
                            <Pencil className="size-3.5" />
                            Edit Guidance
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
