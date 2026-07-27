import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Building, ClipboardCheck, Clock, FileWarning, FolderGit2, GraduationCap, LayoutGrid, MonitorSmartphone, Users, PenLine } from 'lucide-react';
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

const adminNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'Interns', href: '/admin/interns', icon: GraduationCap },
    { title: 'Supervisors', href: '/admin/supervisors', icon: Users },
    { title: 'HTEs', href: '/admin/htes', icon: Building },
    { title: 'Kiosk', href: '/admin/kiosk', icon: MonitorSmartphone },
];

// HTE Supervisors get a dashboard; OJT Supervisors don't (they only
// view/monitor their program's roster) so "My Students" is their landing
// page and there's no Dashboard link to show.
const hteSupervisorNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'My Interns', href: '/supervisor/interns', icon: GraduationCap },
    { title: 'DTR Approvals', href: '/supervisor/approvals', icon: ClipboardCheck },
];

const ojtSupervisorNavItems: NavItem[] = [
    { title: 'My Students', href: '/supervisor/interns', icon: GraduationCap },
    { title: 'HTEs', href: '/supervisor/htes', icon: Building },
];

// Only HTE Supervisors resolve time conflicts — an OJT Supervisor's role
// is viewing/monitoring interns across the whole program, so this link
// (and the page/routes behind it) stays hidden for them.
const resolutionTicketsNavItem: NavItem = {
    title: 'Resolution Tickets',
    href: '/supervisor/resolution-tickets',
    icon: FileWarning,
};

// Same reasoning as resolutionTicketsNavItem — manual attendance entry is
// scoped to the supervisor's own HTE (ManualAttendanceController reads
// supervisorProfile->hte_id directly), which is null for OJT Supervisors.
const manualAttendanceNavItem: NavItem = {
    title: 'Manual Attendance',
    href: '/supervisor/manual-attendance',
    icon: PenLine,
};

const internNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'My DTR', href: '/intern/dtr', icon: Clock },
];

const footerNavItems: NavItem[] = [
    { title: 'Repository', href: 'https://github.com/laravel/react-starter-kit', icon: FolderGit2 },
    { title: 'Documentation', href: 'https://laravel.com/docs/starter-kits#react', icon: BookOpen },
];

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;

    const isOjtSupervisor = auth.user.supervisor_type === 'ojt';

    const supervisorNavItems: NavItem[] = isOjtSupervisor
        ? ojtSupervisorNavItems
        : [
              ...hteSupervisorNavItems,
              resolutionTicketsNavItem,
              manualAttendanceNavItem,
          ];

    const mainNavItems =
        auth.user.role === 'admin' ? adminNavItems : auth.user.role === 'supervisor' ? supervisorNavItems : internNavItems;

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
                <NavMain items={mainNavItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}