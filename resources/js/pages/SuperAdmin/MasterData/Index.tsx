import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// Icons
import { 
    Users, Building2, Settings2, Plus, 
    Search, Edit2, Trash2, Check, X, Smartphone, 
    MapPin, Clock, ScanFace, ChevronRight, Save,
    LockIcon
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- Mock Data (Based on your Models) ---

const departments = [
    { id: 1, name: 'Odisha State HQ', parent: null, type: 'State', users_count: 5 },
    { id: 2, name: 'Khurda District', parent: 'Odisha State HQ', type: 'District', users_count: 12 },
    { id: 3, name: 'Bhubaneswar Block', parent: 'Khurda District', type: 'Block', users_count: 24 },
    { id: 4, name: 'Chandaka GP', parent: 'Bhubaneswar Block', type: 'GP', users_count: 8 },
];

const roles = [
    { id: 1, name: 'Super Admin', slug: 'super-admin', permissions: ['all'] },
    { id: 2, name: 'District Collector', slug: 'district-collector', permissions: ['view_reports', 'manage_users'] },
    { id: 3, name: 'BDO', slug: 'bdo', permissions: ['view_block_reports'] },
    { id: 4, name: 'Field Employee', slug: 'employee', permissions: ['check_in'] },
];

const users = [
    { 
        id: 1, 
        name: 'Rajesh Kumar', 
        role: 'BDO', 
        department: 'Bhubaneswar Block', 
        email: 'rajesh@gov.in',
        settings: {
            face_verification_enabled: true,
            gps_spoof_check_enabled: true,
            live_tracking_enabled: true,
            multiple_attendance_allowed: false,
            allow_outside_geofence: false,
            shift_start: '09:00',
            shift_end: '17:00'
        }
    },
    { 
        id: 2, 
        name: 'Priya Das', 
        role: 'Field Employee', 
        department: 'Chandaka GP', 
        email: 'priya@gov.in',
        settings: {
            face_verification_enabled: true,
            gps_spoof_check_enabled: true,
            live_tracking_enabled: false,
            multiple_attendance_allowed: true, // Maybe for multiple site visits
            allow_outside_geofence: true,
            shift_start: '08:00',
            shift_end: '16:00'
        }
    },
];

// --- Sub-Components ---

// 1. User Settings Modal (The complex part connecting User & UserSettings)
function UserConfigModal({ user, isOpen, onClose }: { user: any, isOpen: boolean, onClose: () => void }) {
    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>User Configuration: {user.name}</DialogTitle>
                    <DialogDescription>
                        Manage security protocols, shift timings, and device restrictions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Security Settings */}
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2 text-blue-600">
                            <LockIcon size={16} /> Security Protocols
                        </h4>
                        
                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Face Verification</Label>
                                <p className="text-xs text-gray-500">Require selfie on check-in</p>
                            </div>
                            <Switch checked={user.settings.face_verification_enabled} />
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>GPS Spoof Check</Label>
                                <p className="text-xs text-gray-500">Detect mock location apps</p>
                            </div>
                            <Switch checked={user.settings.gps_spoof_check_enabled} />
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Live Tracking</Label>
                                <p className="text-xs text-gray-500">Track movement during shift</p>
                            </div>
                            <Switch checked={user.settings.live_tracking_enabled} />
                        </div>
                    </div>

                    {/* Operational Settings */}
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2 text-orange-600">
                            <Settings2 size={16} /> Operations
                        </h4>

                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Geofence Bypass</Label>
                                <p className="text-xs text-gray-500">Allow check-in outside zone</p>
                            </div>
                            <Switch checked={user.settings.allow_outside_geofence} />
                        </div>

                        <div className="flex items-center justify-between border p-3 rounded-lg">
                            <div className="space-y-0.5">
                                <Label>Multi-Attendance</Label>
                                <p className="text-xs text-gray-500">Check-in multiple times/day</p>
                            </div>
                            <Switch checked={user.settings.multiple_attendance_allowed} />
                        </div>

                        {/* Shift Timing */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs">Shift Start</Label>
                                <div className="relative">
                                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input type="time" defaultValue={user.settings.shift_start} className="pl-8" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Shift End</Label>
                                <div className="relative">
                                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input type="time" defaultValue={user.settings.shift_end} className="pl-8" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Component ---

export default function MasterDataIndex() {
    const [activeTab, setActiveTab] = useState("users");
    const [selectedUser, setSelectedUser] = useState<any>(null);

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Master Data', href: '/master-data' }]}>
            <Head title="Master Data Management" />

            <div className="flex flex-col gap-6 p-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
                
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Master Data</h1>
                        <p className="text-sm text-gray-500">Manage organizational structure, access controls, and user policies.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New {activeTab === 'users' ? 'User' : activeTab === 'departments' ? 'Department' : 'Role'}
                        </Button>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="users" className="w-full space-y-6" onValueChange={setActiveTab}>
                    
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-1">
                            <TabsTrigger value="users" className="gap-2"><Users size={14}/> Users & Settings</TabsTrigger>
                            <TabsTrigger value="departments" className="gap-2"><Building2 size={14}/> Departments</TabsTrigger>
                            <TabsTrigger value="roles" className="gap-2"><LockIcon size={14}/> Roles & Permissions</TabsTrigger>
                        </TabsList>

                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder="Search..." className="pl-9 bg-white dark:bg-zinc-900" />
                        </div>
                    </div>

                    {/* --- TAB 1: USERS & SETTINGS --- */}
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Directory</CardTitle>
                                <CardDescription>Manage user accounts and specific device/attendance settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900 border-b">
                                            <tr>
                                                <th className="px-6 py-3">Employee</th>
                                                <th className="px-6 py-3">Role & Dept</th>
                                                <th className="px-6 py-3">Security Features</th>
                                                <th className="px-6 py-3">Shift</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {users.map((user) => (
                                                <tr key={user.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50/50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit">{user.role}</Badge>
                                                            <span className="text-xs text-gray-500">{user.department}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {user.settings.face_verification_enabled && 
                                                                <div title="Face ID On" className="p-1 bg-green-100 text-green-700 rounded"><ScanFace size={14}/></div>
                                                            }
                                                            {user.settings.gps_spoof_check_enabled && 
                                                                <div title="Anti-Spoof On" className="p-1 bg-blue-100 text-blue-700 rounded"><MapPin size={14}/></div>
                                                            }
                                                            {user.settings.live_tracking_enabled && 
                                                                <div title="Live Tracking On" className="p-1 bg-purple-100 text-purple-700 rounded"><Smartphone size={14}/></div>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs">
                                                        {user.settings.shift_start} - {user.settings.shift_end}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => setSelectedUser(user)}
                                                        >
                                                            <Settings2 size={16} className="mr-2"/> Configure
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB 2: DEPARTMENTS --- */}
                    <TabsContent value="departments" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Department Hierarchy</CardTitle>
                                <CardDescription>Structure of State, Districts, Blocks, and Gram Panchayats.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-6 py-3">Department Name</th>
                                                <th className="px-6 py-3">Type</th>
                                                <th className="px-6 py-3">Parent Dept</th>
                                                <th className="px-6 py-3 text-right">Employees</th>
                                                <th className="px-6 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {departments.map((dept) => (
                                                <tr key={dept.id} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 size={16} className="text-gray-400" />
                                                            <span className="font-medium text-gray-900">{dept.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className="font-normal">{dept.type}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {dept.parent ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs">↳</span> {dept.parent}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Root</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs">{dept.users_count}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 size={14}/></Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 size={14}/></Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* --- TAB 3: ROLES & PERMISSIONS --- */}
                    <TabsContent value="roles" className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Role List */}
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Defined Roles</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition">
                                            <div>
                                                <div className="font-medium">{role.name}</div>
                                                <div className="text-xs text-gray-500">{role.permissions.length} Permissions</div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400"/>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full mt-4 border-dashed">
                                        <Plus size={16} className="mr-2"/> Create New Role
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Permission Matrix (Mocked for UI) */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Permissions: District Collector</CardTitle>
                                    <CardDescription>Configure access rights for this role.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><MapPin size={14}/> Geofencing</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="p1" defaultChecked />
                                                    <Label htmlFor="p1">Create Geofences</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="p2" defaultChecked />
                                                    <Label htmlFor="p2">Assign Geofences</Label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border-t pt-4">
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users size={14}/> User Management</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="p3" defaultChecked />
                                                    <Label htmlFor="p3">Create Users</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="p4" defaultChecked />
                                                    <Label htmlFor="p4">Edit Master Data</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="p5" />
                                                    <Label htmlFor="p5">Delete Users</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <Button><Save size={16} className="mr-2"/> Save Permissions</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>

            {/* User Config Modal */}
            <UserConfigModal 
                user={selectedUser} 
                isOpen={!!selectedUser} 
                onClose={() => setSelectedUser(null)} 
            />

        </AppLayout>
    );
}