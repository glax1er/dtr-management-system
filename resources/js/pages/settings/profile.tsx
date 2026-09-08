import { Head, router, usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import {
    Camera,
    Download,
    Loader2,
    Printer,
    RectangleHorizontal,
    RectangleVertical,
    User as UserIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import { IdCard } from '@/components/id-card';
import type { IdCardData, IdCardOrientation } from '@/components/id-card';
import { printIdCard } from '@/lib/print-id-card';
import { cn } from '@/lib/utils';
import type { Auth } from '@/types';

export interface ProfileDetails {
    role: string;
    id_number: string | null;
    program: string | null;
    hte: string | null;
    hte_supervisor: string | null;
    ojt_supervisor: string | null;
}

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
    idCard,
    profileDetails,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    idCard: IdCardData;
    profileDetails?: ProfileDetails;
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;
    const [orientation, setOrientation] =
        useState<IdCardOrientation>('landscape');
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => {
        if (!user) return;
        printIdCard({
            name: user.name,
            email: user.email,
            avatarUrl: user.avatar ?? null,
            role: user.role,
            data: idCard,
            orientation,
            defaultSide: 'both',
        });
    };

    const handleDownload = async () => {
        const cardEl = document.getElementById('printable-id-cards-container');
        if (!cardEl || !user) return;

        try {
            setIsDownloading(true);
            const dataUrl = await toPng(cardEl, {
                pixelRatio: 3,
                cacheBust: true,
                filter: (node) => {
                    if (
                        node instanceof HTMLElement &&
                        node.classList.contains('no-export')
                    ) {
                        return false;
                    }
                    return true;
                },
            });

            const link = document.createElement('a');
            const cleanName = (user.name || 'user').toLowerCase().replace(/\s+/g, '-');
            link.download = `${cleanName}-id-card-${orientation}.png`;
            link.href = dataUrl;
            link.click();
            toast.success('ID card downloaded successfully.');
        } catch (err) {
            console.error('Failed to download ID card:', err);
            toast.error('Failed to download ID card.');
        } finally {
            setIsDownloading(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        router.post('/settings/profile-photo', formData, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] ?? 'Could not upload photo.',
                ),
        });
    };

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
                {/* Profile Form (Left on desktop, Top on mobile) */}
                <div className="w-full max-w-xl shrink-0 space-y-6">
                    <Heading
                        variant="small"
                        title="Profile"
                        description="View your account profile and assignment details"
                    />

                    <div className="flex flex-col items-center justify-center gap-3 text-center py-2">
                        <div className="group relative shrink-0">
                            <div className="flex size-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-sm sm:size-40">
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="size-16 text-muted-foreground sm:size-20" />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 sm:size-10"
                                title="Change profile photo"
                            >
                                <Camera className="size-4 sm:size-5" />
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handlePhotoSelect}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Click the camera icon to update your profile photo.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                defaultValue={auth.user.name}
                                disabled
                                readOnly
                                placeholder="Full name"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                defaultValue={auth.user.email}
                                disabled
                                readOnly
                                autoComplete="username"
                                placeholder="Email address"
                            />
                        </div>

                                {auth.user.role === 'intern' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="id_number">ID Number</Label>
                                            <Input
                                                id="id_number"
                                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50 font-mono"
                                                defaultValue={profileDetails?.id_number ?? '—'}
                                                disabled
                                                readOnly
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="program">Program</Label>
                                            <Input
                                                id="program"
                                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                defaultValue={profileDetails?.program ?? '—'}
                                                disabled
                                                readOnly
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="hte">Host Training Establishment (HTE)</Label>
                                            <Input
                                                id="hte"
                                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                defaultValue={profileDetails?.hte ?? '—'}
                                                disabled
                                                readOnly
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="hte_supervisor">HTE Supervisor</Label>
                                                <Input
                                                    id="hte_supervisor"
                                                    className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                    defaultValue={profileDetails?.hte_supervisor ?? 'None assigned'}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="ojt_supervisor">OJT Supervisor</Label>
                                                <Input
                                                    id="ojt_supervisor"
                                                    className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                    defaultValue={profileDetails?.ojt_supervisor ?? 'None assigned'}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            Internship assignment details are managed by your administrator and OJT coordinator and cannot be edited directly.
                                        </p>
                                    </>
                                )}

                                {auth.user.role === 'supervisor' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="role">Supervisor Role</Label>
                                            <Input
                                                id="role"
                                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                defaultValue={profileDetails?.role ?? 'Supervisor'}
                                                disabled
                                                readOnly
                                            />
                                        </div>

                                        {profileDetails?.hte && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="hte">Assigned HTE</Label>
                                                <Input
                                                    id="hte"
                                                    className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                    defaultValue={profileDetails.hte}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        )}

                                        {profileDetails?.program && (
                                            <div className="grid gap-2">
                                                <Label htmlFor="program">Assigned Program</Label>
                                                <Input
                                                    id="program"
                                                    className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                    defaultValue={profileDetails.program}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        )}

                                        <p className="text-xs text-muted-foreground">
                                            Supervisor assignments are managed by the administrator and cannot be edited directly.
                                        </p>
                                    </>
                                )}

                                {auth.user.role === 'admin' && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="role">Role</Label>
                                            <Input
                                                id="role"
                                                className="mt-1 block w-full cursor-not-allowed opacity-70 bg-muted/50"
                                                defaultValue="System Administrator"
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </>
                                )}

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to re-send the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has been
                                                    sent to your email address.
                                                </div>
                                            )}
                                        </div>
                                    )}
                    </div>
                </div>

                {/* ID Card (Right on desktop, Below on mobile) */}
                <div className="w-full shrink-0 space-y-4 lg:w-auto">
                    <Heading
                        variant="small"
                        title="ID Card"
                        description="Printable identification badge — Front and Back views with attendance QR pass"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-md border p-0.5">
                            <Button
                                type="button"
                                variant={
                                    orientation === 'landscape'
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                size="icon"
                                className="size-8"
                                onClick={() => setOrientation('landscape')}
                                title="Landscape"
                            >
                                <RectangleHorizontal className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                variant={
                                    orientation === 'portrait'
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                size="icon"
                                className="size-8"
                                onClick={() => setOrientation('portrait')}
                                title="Portrait"
                            >
                                <RectangleVertical className="size-4" />
                            </Button>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="size-9 p-0 sm:h-9 sm:w-auto sm:px-4"
                            title="Download ID Card"
                            aria-label="Download ID Card"
                        >
                            {isDownloading ? (
                                <Loader2 className="size-4 animate-spin sm:mr-1.5" />
                            ) : (
                                <Download className="size-4 sm:mr-1.5" />
                            )}
                            <span className="hidden sm:inline">
                                Download ID Card
                            </span>
                        </Button>

                        <Button
                            type="button"
                            onClick={handlePrint}
                            className="size-9 p-0 sm:h-9 sm:w-auto sm:px-4"
                            title="Print ID Card"
                            aria-label="Print ID Card"
                        >
                            <Printer className="size-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">
                                Print ID Card
                            </span>
                        </Button>
                    </div>

                    {/* Display both Front and Back - stacked vertically */}
                    <div
                        id="printable-id-cards-container"
                        className="flex flex-col items-center gap-5 py-2 sm:items-start"
                    >
                        {/* Front Card */}
                        <div
                            className={cn(
                                'space-y-1.5',
                                orientation === 'landscape'
                                    ? 'w-full max-w-[420px]'
                                    : 'w-[270px]',
                            )}
                        >
                            <div className="no-export flex items-center justify-between px-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Front Face
                                </span>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Visual ID
                                </span>
                            </div>
                            <IdCard
                                name={user.name}
                                email={user.email}
                                avatarUrl={user.avatar ?? null}
                                role={user.role}
                                data={idCard}
                                orientation={orientation}
                                side="front"
                                id="printable-id-card-front"
                            />
                        </div>

                        {/* Back Card */}
                        <div
                            className={cn(
                                'space-y-1.5',
                                orientation === 'landscape'
                                    ? 'w-full max-w-[420px]'
                                    : 'w-[270px]',
                            )}
                        >
                            <div className="no-export flex items-center justify-between px-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Back Face
                                </span>
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                    Attendance QR
                                </span>
                            </div>
                            <IdCard
                                name={user.name}
                                email={user.email}
                                avatarUrl={user.avatar ?? null}
                                role={user.role}
                                data={idCard}
                                orientation={orientation}
                                side="back"
                                id="printable-id-card-back"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
