import { Link, usePage } from '@inertiajs/react';
import {
    Archive,
    BookOpen,
    Building,
    CalendarClock,
    FileStack,
    FileWarning,
    GraduationCap,
    Landmark,
    LayoutGrid,
    MapPin,
    MonitorSmartphone,
    Paperclip,
    PenLine,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem, PageProps } from '@/types';

// ─── Nav item definitions ─────────────────────────────────────────────────────

const adminNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Interns', href: '/admin/interns', icon: GraduationCap },
    { title: 'Supervisors', href: '/admin/supervisors', icon: Users },
    { title: 'HTEs', href: '/admin/htes', icon: Building },
    { title: 'Programs', href: '/admin/programs', icon: BookOpen },
    { title: 'Kiosk', href: '/admin/kiosk', icon: MonitorSmartphone },
    { title: 'Schedule', href: '/admin/schedule', icon: CalendarClock },
    { title: 'Archives', href: '/admin/archives', icon: Archive },
];

const superAdminNavItems: NavItem[] = [
    { title: 'Admins', href: '/admin/admins', icon: ShieldCheck },
    { title: 'Colleges', href: '/admin/colleges', icon: Landmark },
    { title: 'Campuses', href: '/admin/campuses', icon: MapPin },
];

// HTE Supervisors get a full dashboard; OJT Supervisors only monitor their
// program's roster, so "My Interns" is their landing page with no Dashboard link.
const hteSupervisorNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'My Interns', href: '/supervisor/interns', icon: GraduationCap },
    { title: 'Schedule', href: '/supervisor/schedule', icon: CalendarClock },
];

const ojtSupervisorNavItems: NavItem[] = [
    { title: 'My Interns', href: '/supervisor/interns', icon: GraduationCap },
    {
        title: 'Document Templates',
        href: '/supervisor/document-templates',
        icon: FileStack,
    },
    { title: 'HTEs', href: '/supervisor/htes', icon: Building },
];

// Only HTE Supervisors can resolve time conflicts and enter manual attendance —
// these are scoped to a supervisor's own HTE (null for OJT Supervisors).
const resolutionTicketsNavItem: NavItem = {
    title: 'Resolution Tickets',
    href: '/supervisor/resolution-tickets',
    icon: FileWarning,
};

const manualAttendanceNavItem: NavItem = {
    title: 'Manual Attendance',
    href: '/supervisor/manual-attendance',
    icon: PenLine,
};

const internNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Work Schedule', href: '/intern/schedule', icon: CalendarClock },
    { title: 'My Documents', href: '/intern/documents', icon: Paperclip },
];

const footerNavItems: NavItem[] = [];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;

    const isOjtSupervisor = auth.user.supervisor_type === 'ojt';
    const isSuperAdmin =
        auth.user.role === 'super_admin' || Boolean(auth.user.is_super_admin);
    const isCollegeAdmin =
        auth.user.role === 'college_admin' || Boolean(auth.user.is_college_admin);
    const isAdmin = isSuperAdmin || isCollegeAdmin || auth.user.role === 'admin';

    const supervisorNavItems: NavItem[] = isOjtSupervisor
        ? ojtSupervisorNavItems
        : [
              ...hteSupervisorNavItems,
              resolutionTicketsNavItem,
              manualAttendanceNavItem,
          ];

    // Super admins see their institutional items after Dashboard, before the
    // rest of the admin items. This keeps the nav grouped logically.
    const currentAdminNavItems: NavItem[] = isSuperAdmin
        ? [adminNavItems[0], ...superAdminNavItems, ...adminNavItems.slice(1)]
        : adminNavItems;

    const mainNavItems = isAdmin
        ? currentAdminNavItems
        : auth.user.role === 'supervisor'
          ? supervisorNavItems
          : internNavItems;

    // For super admins, pass group labels so NavMain can render a visual separator
    const superAdminGroupLabel =
        isSuperAdmin ? { startIndex: 1, endIndex: superAdminNavItems.length, label: 'Administration' } : undefined;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={mainNavItems}
                    superAdminGroup={superAdminGroupLabel}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
