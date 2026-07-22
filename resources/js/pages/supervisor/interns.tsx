import { Head } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

interface InternRow {
    user_id: number;
    name: string;
    id_number: string;
    program_name: string | null;
    status: 'pending' | 'approved' | 'rejected';
    total_hours: number;
}

interface MyInternsProps {
    interns: InternRow[];
}

export default function MyInterns({ interns }: MyInternsProps) {
    return (
        <>
            <Head title="My Interns" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        My Interns
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Interns currently assigned to your HTE.
                    </p>
                </div>

                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>{interns.length} intern{interns.length === 1 ? '' : 's'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {interns.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                                <GraduationCap className="size-8 text-muted-foreground/60" />
                                No interns are currently assigned to your HTE.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">Name</th>
                                            <th className="py-2 pr-4 font-medium">ID Number</th>
                                            <th className="py-2 pr-4 font-medium">Program</th>
                                            <th className="py-2 pr-4 font-medium">Status</th>
                                            <th className="py-2 font-medium">Total Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interns.map((intern) => (
                                            <tr key={intern.user_id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{intern.name}</td>
                                                <td className="py-2 pr-4">{intern.id_number}</td>
                                                <td className="py-2 pr-4">
                                                    {intern.program_name ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <Badge
                                                        variant={
                                                            intern.status === 'approved'
                                                                ? 'default'
                                                                : intern.status === 'pending'
                                                                  ? 'outline'
                                                                  : 'secondary'
                                                        }
                                                    >
                                                        {intern.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 tabular-nums">
                                                    {intern.total_hours.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

MyInterns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Interns', href: '/supervisor/interns' },
    ],
};