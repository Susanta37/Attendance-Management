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
    BookOpen, 
    Folder, 
    LayoutGrid, 
    MapPin, 
    Users, 
    Building2, 
    ShieldCheck, 
    FileText,
    Clock,
    Calendar,
    Settings
} from 'lucide-react';
import AppLogo from './app-logo';
import { SharedData } from '@/types'; // Ensure you have this type defined

// --- 1. Define Menu Configurations ---

// A. Super Admin (Collector / District Admin)
const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Geofencing',
        href: '/admin/geofences',
        icon: MapPin,
    },
    {
        title: 'Attendances',
        href: '/admin/attendance',
        icon: Clock,
    },
    {
        title: 'Reports & Logs',
        href: '/admin/reports',
        icon: FileText,
    },
    {
        title: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
    },
    {
        title: 'Master Data',
        href: '/admin/masterdata', // Group header or placeholder
        icon: Building2,
        items: [
            { title: 'Departments', href: '/admin/masterdata' },
            { title: 'Designations', href: '/admin/designations' },
        ]
    },
];

// B. Manager (Block/Dept Manager)
const managerNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'My Team',
        href: '/manager/team',
        icon: Users,
    },
    {
        title: 'Attendance Approvals',
        href: '/manager/approvals',
        icon: ShieldCheck,
    },
    {
        title: 'Shift Roster',
        href: '/manager/shifts',
        icon: Calendar,
    },
];

// C. Employee (Default)
const employeeNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'My Attendance',
        href: '/attendance/history',
        icon: Clock,
    },
    {
        title: 'Leave Requests',
        href: '/leave/request',
        icon: FileText,
    },
    {
        title: 'Profile Settings',
        href: '/profile',
        icon: Settings,
    },
];

// Common Footer Items (Docs/Repo)
const footerNavItems: NavItem[] = [
    // {
    //     title: 'Support Docs',
    //     href: '#',
    //     icon: BookOpen,
    // },
];

export function AppSidebar() {
    // 2. Get User Role from Inertia Shared Props
    const { auth } = usePage<SharedData>().props;
    const userRole = auth.user?.role?.slug || 'employee'; 

    // 3. Select Menu based on Role
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
                {/* Dynamic Menu Items */}
                <NavMain items={getNavItems()} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}