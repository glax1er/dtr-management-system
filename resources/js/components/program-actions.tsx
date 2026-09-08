import { Archive, Pencil, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ProgramActionsTarget {
    program_id: number;
    program_name: string;
    is_active: boolean;
}

interface ProgramActionsProps<T extends ProgramActionsTarget> {
    program: T;
    onEdit: (program: T) => void;
    onToggleActive: (program: T) => void;
    onArchive: (program: T) => void;
}

export function ProgramActions<T extends ProgramActionsTarget>({
    program,
    onEdit,
    onToggleActive,
    onArchive,
}: ProgramActionsProps<T>) {
    return (
        <div className="flex justify-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(program)}
                    >
                        <Pencil className="size-4 text-blue-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleActive(program)}
                    >
                        {program.is_active ? (
                            <PowerOff className="size-4 text-destructive" />
                        ) : (
                            <Power className="size-4 text-emerald-600" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {program.is_active ? 'Deactivate' : 'Activate'}
                </TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={program.is_active}
                        onClick={() => onArchive(program)}
                    >
                        <Archive className="size-4 text-orange-600" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {program.is_active
                        ? 'Archive inactive programs only'
                        : 'Archive'}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
