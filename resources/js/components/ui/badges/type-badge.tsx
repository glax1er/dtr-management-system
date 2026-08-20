import { Badge } from '@/components/ui/badge';

type SupervisorType = 'hte' | 'ojt';

const styles: Record<SupervisorType, string> = {
    hte: 'bg-blue-100 text-blue-600 border-blue-300',
    ojt: 'bg-violet-100 text-violet-600 border-violet-300',
};

const labels: Record<SupervisorType, string> = {
    hte: 'HTE',
    ojt: 'OJT',
};

export function TypeBadge({ type }: { type: SupervisorType }) {
    return (
        <Badge className={styles[type]}>
            {labels[type]}
        </Badge>
    );
}
