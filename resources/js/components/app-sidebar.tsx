import { Link, usePage } from '@inertiajs/react';
import { Building, CalendarClock, Paperclip, FileWarning, GraduationCap, LayoutGrid, MonitorSmartphone, Users, PenLine, Archive, BookOpen, FileStack } from 'lucide-react';
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
    { title: 'Programs', href: '/admin/programs', icon: BookOpen },
    { title: 'Kiosk', href: '/admin/kiosk', icon: MonitorSmartphone },
    { title: 'Schedule', href: '/admin/schedule', icon: CalendarClock },
    { title: 'Archives', href: '/admin/archives', icon: Archive },
];

// HTE Supervisors get a dashboard; OJT Supervisors don't (they only
// view/monitor their program's roster) so "My Students" is their landing
// page and there's no Dashboard link to show.
const hteSupervisorNavItems: NavItem[] = [
    { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
    { title: 'My Interns', href: '/supervisor/interns', icon: GraduationCap },
    { title: 'Schedule', href: '/supervisor/schedule', icon: CalendarClock },    
];

const ojtSupervisorNavItems: NavItem[] = [
    { title: 'Program Interns', href: '/supervisor/students', icon: GraduationCap },
    { title: 'Document Templates', href: '/supervisor/document-templates', icon: FileStack },
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
    { title: 'My Documents', href: '/intern/documents', icon: Paperclip },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage<PageProps>().props;

    const isHteSupervisor = auth.user.is_hte_supervisor;
    const isOjtSupervisor = auth.user.is_ojt_supervisor;

    const supervisorNavItems: NavItem[] = [
        ...(isHteSupervisor ? [...hteSupervisorNavItems, resolutionTicketsNavItem, manualAttendanceNavItem] : []),
        ...(isOjtSupervisor ? ojtSupervisorNavItems : []),
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