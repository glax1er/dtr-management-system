import { Link } from '@inertiajs/react';
import { Camera, FileWarning, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ResolutionTicketsNavProps {
    currentTab: 'pending' | 'logs' | 'snapshots';
    totalPending?: number;
    totalResolved?: number;
    totalSnapshots?: number;
}

export function ResolutionTicketsNav({
    currentTab,
    totalPending,
    totalResolved,
    totalSnapshots,
}: ResolutionTicketsNavProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
            <Link
                href="/supervisor/resolution-tickets"
                className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                    currentTab === 'pending'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
            >
                <FileWarning className="size-4 shrink-0" />
                <span>Pending Requests</span>
                {totalPending !== undefined && (
                    <Badge
                        variant={currentTab === 'pending' ? 'secondary' : 'outline'}
                        className="ml-0.5 px-1.5 py-0 text-[11px] font-semibold"
                    >
                        {totalPending}
                    </Badge>
                )}
            </Link>

            <Link
                href="/supervisor/resolution-tickets/logs"
                className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                    currentTab === 'logs'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
            >
                <History className="size-4 shrink-0" />
                <span>Resolution Logs</span>
                {totalResolved !== undefined && (
                    <Badge
                        variant={currentTab === 'logs' ? 'secondary' : 'outline'}
                        className="ml-0.5 px-1.5 py-0 text-[11px] font-semibold"
                    >
                        {totalResolved}
                    </Badge>
                )}
            </Link>

            <Link
                href="/supervisor/resolution-tickets/snapshots"
                className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
                    currentTab === 'snapshots'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
            >
                <Camera className="size-4 shrink-0" />
                <span>Scan Snapshots</span>
                {totalSnapshots !== undefined && (
                    <Badge
                        variant={currentTab === 'snapshots' ? 'secondary' : 'outline'}
                        className="ml-0.5 px-1.5 py-0 text-[11px] font-semibold"
                    >
                        {totalSnapshots}
                    </Badge>
                )}
            </Link>
        </div>
    );
}
