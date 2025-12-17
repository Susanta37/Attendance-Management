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
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    MapPin,
    Users,
    Building2,
    ShieldCheck,
    FileText,
    Clock,
    Calendar,
    Settings,
    Activity
} from 'lucide-react';
import AppLogo from './app-logo';
import { SharedData } from '@/types';
import { useTranslation } from '@/hooks/use-translation'; // Ensure this hook exists

export function AppSidebar() {
    const { t } = useTranslation(); // Use your translation hook
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user?.role?.slug || 'employee';

    // --- Define Menus INSIDE component to access 't' ---

    // A. Super Admin (Collector / District Admin)
    const adminNavItems: NavItem[] = [
        {
            title: t('dashboard'), // "Dashboard" / "ଡ୍ୟାସବୋର୍ଡ"
            href: '/admin/dashboard',
            icon: LayoutGrid,
        },
        {
            title: t('user_management') || 'User Management', // Add key to JSON if missing
            href: '/admin/users',
            icon: Users,
        },
        {
            title: t('f1'), // "Smart Geofencing" / "ସ୍ମାର୍ଟ ଜିଓଫେନ୍ସିଂ"
            href: '/admin/geofences',
            icon: MapPin,
        },
        {
            title: t('attendance_management'), // "Attendances"
            href: '/admin/attendance',
            icon: Clock,
        },
        {
            title: t('f5'), // "Dynamic Reports"
            href: '/admin/reports',
            icon: FileText,
        },
        {
            title: t('master_data'), // Add translation key 'master_data'
            href: '/admin/masterdata',
            icon: Building2,
            items: [
                { title: t('departments'), href: '/admin/masterdata' }, // Add keys
                { title: t('designations'), href: '/admin/designations' },
            ]
        }, {
            title: t('live_tracking'), // "Dynamic Reports"
            href: '/admin/lt',
            icon: FileText,
        },
    ];

    // B. Manager (Block/Dept Manager)
    const managerNavItems: NavItem[] = [
        {
            title: t('dashboard'),
            href: '/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'My Team', // Add key 'my_team'
            href: '/manager/team',
            icon: Users,
        },
        {
            title: 'Attendance Approvals', // Add key 'approvals'
            href: '/manager/approvals',
            icon: ShieldCheck,
        },
        {
            title: 'Shift Roster', // Add key 'shift_roster'
            href: '/manager/shifts',
            icon: Calendar,
        },
    ];

    // C. Employee (Default)
    const employeeNavItems: NavItem[] = [
        {
            title: t('dashboard'),
            href: '/dashboard',
            icon: LayoutGrid,
        },
        {
            title: 'My Attendance', // Add key 'my_attendance'
            href: '/attendance/history',
            icon: Clock,
        },
        {
            title: 'Leave Requests', // Add key 'leave_requests'
            href: '/leave/request',
            icon: FileText,
        },
        {
            title: 'Profile Settings', // Add key 'profile_settings'
            href: '/profile',
            icon: Settings,
        },
    ];

    const footerNavItems: NavItem[] = [];

    // Select Menu based on Role
    const getNavItems = () => {
        if (['collector', 'district_admin'].includes(userRole)) {
            return adminNavItems;
        }
        if (['block_admin', 'department_manager'].includes(userRole)) {
            return managerNavItems;
        }
        return employeeNavItems;
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={getNavItems()} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
