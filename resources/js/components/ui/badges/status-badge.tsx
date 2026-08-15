import { Badge } from '@/components/ui/badge';

type Status = 'active' | 'inactive' | 'approved';

export function StatusBadge({ status }: { status: Status }) {
    const styles = {
        active: 'bg-emerald-100 text-emerald-500 border-emerald-300',
        inactive: 'bg-red-100 text-red-500 border-red-300',
        approved: 'bg-emerald-100 text-emerald-500 border-emerald-300',
    };

    const labels = {
        active: 'Active',
        inactive: 'Inactive',
        approved: 'Approved',
    };

    return (
        <Badge className={styles[status]}>
            {labels[status]}
        </Badge>
    );
}