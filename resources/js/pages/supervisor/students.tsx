import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

interface StudentRow {
    intern_user_id: number;
    name: string;
    email: string;
    id_number: string | null;
    contact_number: string | null;
    hte_name: string;
    total_hours: number;
}

interface Filters {
    search: string;
}

interface MyStudentsProps {
    students: StudentRow[];
    studentCount: number;
    scopeName?: string;
    filters: Filters;
}

/** 8.5 → "8 hours 30 minutes" — same long-form duration used on the
 * HTE attendance log, so hours read consistently across both views. */
function formatLongDuration(hours: number): string {
    if (hours <= 0) {
        return '—';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];

    if (wholeHours > 0) {
        parts.push(`${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`);
    }

    if (minutes > 0) {
        parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    return parts.length > 0 ? parts.join(' ') : '0 minutes';
}

export default function MyStudents({
    students,
    studentCount,
    scopeName,
    filters,
}: MyStudentsProps) {
    const [search, setSearch] = useState(filters.search);

    const applySearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/supervisor/interns',
            { search: search || undefined },
            { preserveState: true, preserveScroll: true },
        );
    };

    const clearSearch = () => {
        setSearch('');
        router.get(
            '/supervisor/interns',
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="My Students" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        My Students
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {`${studentCount} intern${studentCount === 1 ? '' : 's'} in the ${scopeName ?? 'selected'} program, across every HTE.`}
                    </p>
                </div>

                <Card className="flex-1">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <CardTitle className="text-base">
                            Assigned Interns
                        </CardTitle>
                        <form
                            onSubmit={applySearch}
                            className="flex items-end gap-2"
                        >
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="search"
                                    className="text-xs text-muted-foreground"
                                >
                                    Search by name
                                </Label>
                                <Input
                                    id="search"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="w-52"
                                />
                            </div>
                            <Button type="submit" variant="secondary" size="sm">
                                Search
                            </Button>
                            {filters.search !== '' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearSearch}
                                >
                                    Clear
                                </Button>
                            )}
                        </form>
                    </CardHeader>
                    <CardContent>
                        {students.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No interns match{' '}
                                {filters.search !== ''
                                    ? 'this search.'
                                    : 'your program yet.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="py-2 pr-4 font-medium">
                                                Name
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Email
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                ID Number
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Contact
                                            </th>
                                            <th className="py-2 pr-4 font-medium">
                                                Assigned HTE
                                            </th>
                                            <th className="py-2 font-medium">
                                                Hours Rendered
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((student) => (
                                            <tr
                                                key={student.intern_user_id}
                                                className="border-b last:border-0 hover:bg-muted/40"
                                            >
                                                <td className="py-2.5 pr-4 font-medium whitespace-nowrap">
                                                    {student.name}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.email}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.id_number ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.contact_number ?? '—'}
                                                </td>
                                                <td className="py-2.5 pr-4 whitespace-nowrap">
                                                    {student.hte_name}
                                                </td>
                                                <td className="py-2.5 whitespace-nowrap">
                                                    {formatLongDuration(
                                                        student.total_hours,
                                                    )}
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

MyStudents.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Students', href: '/supervisor/interns' },
    ],
};
