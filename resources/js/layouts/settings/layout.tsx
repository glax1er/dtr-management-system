import { Link, usePage } from '@inertiajs/react';
import { Lock, SettingsIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Notifications',
        href: '/settings/notifications',
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const page = usePage<{
        auth?: { user?: { requires_two_factor?: boolean } };
        twoFactorRequired?: boolean;
    }>();

    const isLocked = Boolean(
        page.props.auth?.user?.requires_two_factor || page.props.twoFactorRequired
    );

    return (
        <div className="px-4 py-4">
            <div className="mb-6 sm:mb-8">
                <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-black dark:text-white">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <SettingsIcon className="size-5" />
                    </span>
                    Settings
                </h1>
            </div>

            <div className="flex flex-col lg:flex-row lg:gap-6 xl:gap-8 2xl:gap-12">
                <aside className="w-full shrink-0 lg:w-44 xl:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const isRestricted = isLocked && item.title !== 'Security';

                            if (isRestricted) {
                                return (
                                    <Button
                                        key={`${toUrl(item.href)}-${index}`}
                                        size="sm"
                                        variant="ghost"
                                        disabled
                                        title="Complete Two-Factor Authentication or Passkey setup first"
                                        className="w-full justify-between opacity-50 cursor-not-allowed"
                                    >
                                        <span>{item.title}</span>
                                        <Lock className="size-3.5 text-muted-foreground" />
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn('w-full justify-start', {
                                        'bg-muted': isCurrentOrParentUrl(item.href),
                                    })}
                                >
                                    <Link href={item.href}>
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>


                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
