import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { HoursProgressRing } from '@/components/hours-progress-ring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface InternOption {
    intern_user_id: number;
    intern_name: string;
}

interface StatsResponse {
    internUserId: number;
    internName: string;
    month: string;
    dailyHours: { date: string; hours: number }[];
    onTimeLate: { onTime: number; late: number };
    completeness: { present: number; absent: number };
    cumulative: { completed: number; required: number; percent: number };
}

const ON_TIME_COLOR = '#16a34a';
const LATE_COLOR = '#dc2626';
const PRESENT_COLOR = '#2563eb';
const ABSENT_COLOR = '#9ca3af';

interface InternStatsPanelProps {
    interns: InternOption[];
    month?: string;
}

export function InternStatsPanel({ interns, month }: InternStatsPanelProps) {
    const [index, setIndex] = useState(0);
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const current = interns[index];

    const goPrev = () => setIndex((i) => (i - 1 + interns.length) % interns.length);
    const goNext = () => setIndex((i) => (i + 1) % interns.length);

    useEffect(() => {
        if (!current) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (month) params.set('month', month);

        fetch(`/supervisor/interns/${current.intern_user_id}/stats?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then(async (res) => {
                if (!res.ok) throw new Error('Could not load stats for this intern.');
                return res.json() as Promise<StatsResponse>;
            })
            .then((data) => {
                if (!cancelled) setStats(data);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [current, month]);

    if (interns.length === 0 || !current) {
        return null;
    }

    const onTimeLateData = stats
        ? [
              { name: 'On Time', value: stats.onTimeLate.onTime },
              { name: 'Late', value: stats.onTimeLate.late },
          ]
        : [];

    const completenessData = stats
        ? [
              { name: 'Present', value: stats.completeness.present },
              { name: 'Absent', value: stats.completeness.absent },
          ]
        : [];

    return (
        <Card>
            <CardContent className="grid gap-6 pt-6 lg:grid-cols-[220px_1fr]">
                {/* Top-left: carousel selector */}
                <div className="flex flex-col items-center justify-center gap-3 border-b pb-6 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={goPrev} disabled={interns.length < 2}>
                            <ChevronLeft />
                        </Button>
                        <div className="flex size-16 items-center justify-center rounded-full border-2 bg-muted">
                            <UserRound className="size-8 text-muted-foreground" />
                        </div>
                        <Button variant="outline" size="icon" onClick={goNext} disabled={interns.length < 2}>
                            <ChevronRight />
                        </Button>
                    </div>
                    <p className="text-center text-sm font-medium">{current.intern_name}</p>
                    <p className="text-xs text-muted-foreground">
                        {index + 1} of {interns.length}
                    </p>
                </div>

                {/* Top-right: hours graph */}
                <div>
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-base">Hours Rendered Per Day</CardTitle>
                        <CardDescription>{stats?.month ?? month}</CardDescription>
                    </CardHeader>
                    {loading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
                    {error && <p className="py-8 text-center text-sm text-destructive">{error}</p>}
                    {!loading && !error && stats && (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats.dailyHours}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 10 }} width={28} />
                                <Tooltip formatter={(value) => [`${value} hrs`, 'Hours']} />
                                <Bar dataKey="hours" fill="#111827" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Bottom row: the other 3 metrics, spanning both columns */}
                {!loading && !error && stats && (
                    <div className="grid gap-4 border-t pt-6 sm:grid-cols-3 lg:col-span-2">
                        <div>
                            <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                                On Time vs Late
                            </p>
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie
                                        data={onTimeLateData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={32}
                                        outerRadius={55}
                                        paddingAngle={2}
                                    >
                                        <Cell fill={ON_TIME_COLOR} />
                                        <Cell fill={LATE_COLOR} />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-1 flex flex-wrap justify-center gap-x-3 text-xs text-muted-foreground">
                                <span>On Time ({stats.onTimeLate.onTime})</span>
                                <span>Late ({stats.onTimeLate.late})</span>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                                Present vs Absent
                            </p>
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie
                                        data={completenessData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={32}
                                        outerRadius={55}
                                        paddingAngle={2}
                                    >
                                        <Cell fill={PRESENT_COLOR} />
                                        <Cell fill={ABSENT_COLOR} />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-1 flex flex-wrap justify-center gap-x-3 text-xs text-muted-foreground">
                                <span>Present ({stats.completeness.present})</span>
                                <span>Absent ({stats.completeness.absent})</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                                Cumulative Hours
                            </p>
                            <HoursProgressRing
                                percent={stats.cumulative.percent}
                                totalRendered={stats.cumulative.completed}
                                required={stats.cumulative.required}
                                size={150}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}