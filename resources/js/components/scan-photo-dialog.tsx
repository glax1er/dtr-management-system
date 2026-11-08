import { Camera, Calendar, Clock, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export interface ScanPhotoDialogData {
    internName: string;
    idNumber?: string | null;
    label?: 'time_in' | 'time_out' | string;
    scannedAt?: string | null;
    capturedPhotoUrl: string;
    profilePhotoUrl?: string | null;
}

interface ScanPhotoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: ScanPhotoDialogData | null;
}

export function ScanPhotoDialog({
    open,
    onOpenChange,
    data,
}: ScanPhotoDialogProps) {
    if (!data) return null;

    const isTimeIn = data.label === 'time_in';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Camera className="size-4" />
                        </div>
                        <div>
                            <DialogTitle>Scan Verification Photo</DialogTitle>
                            <DialogDescription className="text-xs">
                                Captured at the moment of QR attendance scan
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    {/* Photo display */}
                    <div className="relative mx-auto flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-xl border bg-black/5 dark:bg-black/40">
                        <img
                            src={data.capturedPhotoUrl}
                            alt={`Scan snapshot of ${data.internName}`}
                            className="size-full object-contain"
                        />
                    </div>

                    {/* Metadata card */}
                    <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserIcon className="size-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">
                                    {data.internName}
                                </span>
                            </div>
                            {data.label && (
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                        isTimeIn
                                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            : 'border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                    }`}
                                >
                                    {isTimeIn ? 'Time In' : 'Time Out'}
                                </span>
                            )}
                        </div>

                        {data.idNumber && (
                            <div className="text-xs text-muted-foreground pl-6">
                                ID: <span className="font-mono text-foreground">{data.idNumber}</span>
                            </div>
                        )}

                        {data.scannedAt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                                <Clock className="size-3.5" />
                                <span>{data.scannedAt}</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
