import { Badge } from '@/components/ui/badge';

type AttendanceStatus =
    | 'on_time'
    | 'late'
    | 'unscheduled'
    | 'missing_time_in'
    | 'no_record'
    | 'open' // "No time-out yet"
    | 'complete'
    | 'pending_review';

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
    const styles: Record<AttendanceStatus, string> = {
        on_time: 'bg-emerald-100 text-emerald-500 border-emerald-300',
        late: 'bg-red-100 text-red-500 border-red-300',
        unscheduled: 'bg-blue-100 text-blue-500 border-blue-300',
        missing_time_in: 'bg-amber-100 text-amber-600 border-amber-300',
        no_record: 'bg-muted text-muted-foreground border-border',
        open: 'bg-muted text-muted-foreground border-border',
        complete: 'bg-green-100 text-green-500 border-green-300',
        pending_review: 'bg-amber-200 text-amber-600 border-amber-400',
    };

    const labels: Record<AttendanceStatus, string> = {
        on_time: 'On Time',
        late: 'Late',
        unscheduled: 'Unscheduled',
        missing_time_in: 'Missing Time In',
        no_record: 'No Record',
        open: 'No Time-Out Yet',
        complete: 'Complete',
        pending_review: 'Pending Review',
    };

    return <Badge className={styles[status]}>{labels[status]}</Badge>;
}