import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

interface SuperAdminGroup {
    /** Index of first item belonging to the super-admin group */
    startIndex: number;
    /** Number of items in the super-admin group */
    endIndex: number;
    /** Label shown above the super-admin group */
    label: string;
}

/**
 * Renders the main sidebar navigation. When `superAdminGroup` is provided,
 * the items in the specified index range are rendered under a separate labelled
 * group (e.g. "Administration"), while the rest appear under "Platform".
 */
export function NavMain({
    items = [],
    superAdminGroup,
}: {
    items: NavItem[];
    superAdminGroup?: SuperAdminGroup;
}) {
    const { isCurrentUrl } = useCurrentUrl();

    if (!superAdminGroup) {
        // Default: single "Platform" group
        return (
            <SidebarGroup className="px-2 py-0">
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarMenu>
                    {items.map((item) => (
                        <NavMenuItem
                            key={item.title}
                            item={item}
                            isActive={isCurrentUrl(item.href)}
                        />
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        );
    }

    const { startIndex, endIndex, label } = superAdminGroup;
    const beforeGroup = items.slice(0, startIndex);
    const inGroup = items.slice(startIndex, startIndex + endIndex);
    const afterGroup = items.slice(startIndex + endIndex);

    return (
        <>
            {/* Items before the super-admin group (e.g. Dashboard) */}
            {beforeGroup.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarMenu>
                        {beforeGroup.map((item) => (
                            <NavMenuItem
                                key={item.title}
                                item={item}
                                isActive={isCurrentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            )}

            {/* Super-admin group with its own label */}
            {inGroup.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>{label}</SidebarGroupLabel>
                    <SidebarMenu>
                        {inGroup.map((item) => (
                            <NavMenuItem
                                key={item.title}
                                item={item}
                                isActive={isCurrentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            )}

            {/* Remaining items (e.g. Interns, Supervisors, HTEs…) */}
            {afterGroup.length > 0 && (
                <SidebarGroup className="px-2 py-0">
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarMenu>
                        {afterGroup.map((item) => (
                            <NavMenuItem
                                key={item.title}
                                item={item}
                                isActive={isCurrentUrl(item.href)}
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            )}
        </>
    );
}

// ─── NavMenuItem ──────────────────────────────────────────────────────────────

function NavMenuItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={{ children: item.title }}
            >
                <Link href={item.href} prefetch>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
