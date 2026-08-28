import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface NotificationOption {
    key: string;
    label: string;
    description: string;
    default: boolean;
}

interface Props {
    preferences: Record<string, boolean>;
    options: NotificationOption[];
    role?: string;
}

export default function NotificationSettings({ preferences, options = [], role }: Props) {
    const initialData: Record<string, boolean> = {};
    (options || []).forEach((opt) => {
        initialData[opt.key] = preferences?.[opt.key] ?? opt.default ?? true;
    });

    const { data, setData, patch, processing, recentlySuccessful } = useForm<Record<string, boolean>>(initialData);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch('/settings/notifications', {
            preserveScroll: true,
        });
    };

    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

    return (
        <>
            <Head title="Notification settings" />

            <h1 className="sr-only">Notification settings</h1>

            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        variant="small"
                        title="Notification Preferences"
                        description="Choose which types of notifications you want to receive across the system."
                    />
                    {roleLabel && (
                        <span className="shrink-0 inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground border">
                            {roleLabel} Settings
                        </span>
                    )}
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card className="space-y-5 p-5">
                        {options && options.length > 0 ? (
                            options.map((option) => (
                                <div key={option.key} className="flex items-start space-x-3">
                                    <Checkbox
                                        id={option.key}
                                        checked={data[option.key] ?? true}
                                        onCheckedChange={(checked) =>
                                            setData(option.key, Boolean(checked))
                                        }
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <Label
                                            htmlFor={option.key}
                                            className="cursor-pointer text-sm font-medium text-foreground"
                                        >
                                            {option.label}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {option.description}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No notification preferences available for your role.</p>
                        )}
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
