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
            <DialogContent className="flex w-full max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-xl">
                <DialogHeader className="shrink-0 border-b bg-card px-5 py-4 sm:px-6 sm:py-5">
                    <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground sm:text-lg">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Info className="size-5" />
                        </div>
                        <span>Intern Guidance & Instructions</span>
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            {item?.name}
                        </span>{' '}
                        ({programName})
                    </DialogDescription>
                </DialogHeader>

                <div className="p-5 sm:p-6">
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap text-foreground sm:text-sm">
                        {item?.instructions ||
                            'No specific instructions added for this document requirement.'}
                    </div>
                </div>

                <DialogFooter className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/20 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-9 w-full text-xs sm:w-auto sm:text-sm"
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
                            className="h-9 w-full gap-1.5 text-xs shadow-sm sm:w-auto sm:text-sm"
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
