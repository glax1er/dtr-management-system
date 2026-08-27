import { Archive, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface InternActionsTarget {
    user_id: number;
    name: string;
    status: 'pending' | 'approved' | 'rejected';
}

interface InternActionsProps<T extends InternActionsTarget> {
    intern: T;
    onApprove: (intern: T) => void;
    onReject: (intern: T) => void;
    onUndo: (intern: T) => void;
    onDelete: (intern: T) => void;
}

export function InternActions<T extends InternActionsTarget>({
    intern,
    onApprove,
    onReject,
    onUndo,
    onDelete,
}: InternActionsProps<T>) {
    return (
        <div className="flex justify-center gap-1">
            {intern.status === 'pending' && (
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onApprove(intern)}
                            >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onReject(intern)}
                            >
                                <XCircle className="size-4 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject</TooltipContent>
                    </Tooltip>
                </>
            )}

            {(intern.status === 'approved' || intern.status === 'rejected') && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onUndo(intern)}
                        >
                            <RotateCcw className="size-4 text-blue-600" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Revert to Pending</TooltipContent>
                </Tooltip>
            )}

            {intern.status === 'rejected' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(intern)}
                        >
                            <Archive className="size-4 text-orange-600" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move to Archives</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
