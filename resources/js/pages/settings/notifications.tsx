import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface NotificationPreferences {
    document_updates: boolean;
    milestone_alerts: boolean;
    attendance_alerts: boolean;
    ticket_updates: boolean;
}

interface Props {
    preferences: NotificationPreferences;
}

export default function NotificationSettings({ preferences }: Props) {
    const { data, setData, patch, processing, recentlySuccessful } = useForm({
        document_updates: preferences.document_updates ?? true,
        milestone_alerts: preferences.milestone_alerts ?? true,
        attendance_alerts: preferences.attendance_alerts ?? true,
        ticket_updates: preferences.ticket_updates ?? true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch('/settings/notifications', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Notification settings" />

            <h1 className="sr-only">Notification settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Notification Preferences"
                    description="Choose which types of notifications you want to receive across the system."
                />

                <form onSubmit={submit} className="space-y-6">
                    <Card className="space-y-4 p-5">
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="document_updates"
                                checked={data.document_updates}
                                onCheckedChange={(checked) =>
                                    setData('document_updates', Boolean(checked))
                                }
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="document_updates"
                                    className="cursor-pointer text-sm font-medium text-foreground"
                                >
                                    Document Updates & Approvals
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Receive alerts when documents are submitted, approved, or require revision.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="milestone_alerts"
                                checked={data.milestone_alerts}
                                onCheckedChange={(checked) =>
                                    setData('milestone_alerts', Boolean(checked))
                                }
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="milestone_alerts"
                                    className="cursor-pointer text-sm font-medium text-foreground"
                                >
                                    OJT Hours Milestone Alerts
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Get notified when reaching 50%, 80%, and 100% of required training hours.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="attendance_alerts"
                                checked={data.attendance_alerts}
                                onCheckedChange={(checked) =>
                                    setData('attendance_alerts', Boolean(checked))
                                }
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="attendance_alerts"
                                    className="cursor-pointer text-sm font-medium text-foreground"
                                >
                                    Attendance & Missed Time-Out Alerts
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Receive reminders when a Time-In was logged without a corresponding Time-Out.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="ticket_updates"
                                checked={data.ticket_updates}
                                onCheckedChange={(checked) =>
                                    setData('ticket_updates', Boolean(checked))
                                }
                            />
                            <div className="grid gap-1 leading-none">
                                <Label
                                    htmlFor="ticket_updates"
                                    className="cursor-pointer text-sm font-medium text-foreground"
                                >
                                    Resolution Ticket Updates
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Get notified when attendance resolution tickets are submitted, approved, or rejected.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center gap-4">
                        <Button type="submit" disabled={processing}>
                            Save Preferences
                        </Button>

                        {recentlySuccessful && (
                            <p className="text-sm text-muted-foreground">Saved.</p>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}
