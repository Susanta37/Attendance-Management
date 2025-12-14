import { useState, useEffect, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Users, UserPlus, FileCheck, MapPin, Search, Filter,
    MoreVertical, Edit, Trash2, Eye, CheckCircle2, XCircle,
    ShieldAlert, ScanFace, Map as MapIcon, Clock, Upload, FileText,
    ListFilter, Loader2, Repeat, Shield, Camera, Video, RefreshCw
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types and Services
import { User, Role, Department, UserSettingSchema, UserFormData, UserDocument } from '@/types/user-management';
import { userService } from '@/services/userService';

// --- Mock Data: Odisha Hierarchy (kept for location filtering) ---
const odishaHierarchy: any = {
    'Khurda': {
        blocks: ['Bhubaneswar', 'Jatni', 'Begunia', 'Bolagarh'],
        gps: {
            'Bhubaneswar': ['Chandaka', 'Darutheng', 'Mishra', 'Raghunathpur'],
            'Jatni': ['Benapanjari', 'Gangapada', 'Kantita'],
            'Begunia': ['Baulabandha', 'Dingara', 'Pichukuli']
        }
    },
    'Cuttack': {
        blocks: ['Cuttack Sadar', 'Banki', 'Athagarh', 'Baramba'],
        gps: {
            'Cuttack Sadar': ['Bentakar', 'Kalapada', 'Paramahansa'],
            'Banki': ['Anuary', 'Bilapada', 'Kalapathar']
        }
    }
};

// KPI Stats (STATIC as per user requirement)
const kpiStats = [
    { label: 'Total Users', value: '2,405', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Today', value: '1,850', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending Approval', value: '12', icon: FileCheck, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'GPS Violations', value: '5', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
];

interface Props {
    initialUsers?: any;
    roles?: Role[];
    departments?: Department[];
    userSettingsSchema?: UserSettingSchema[];
}

export default function UserManagement({ initialUsers, roles: initialRoles, departments: initialDepartments, userSettingsSchema: initialSchema }: Props) {
    // State management
    const [users, setUsers] = useState<User[]>(initialUsers?.data || []);
    const [roles, setRoles] = useState<Role[]>(initialRoles || []);
    const [departments, setDepartments] = useState<Department[]>(initialDepartments || []);
    const [userSettingsSchema, setUserSettingsSchema] = useState<UserSettingSchema[]>(initialSchema || []);
    const [loading, setLoading] = useState(false);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDocOpen, setIsDocOpen] = useState(false);
    const [isFaceOpen, setIsFaceOpen] = useState(false);

    // Filter States
    // const [filterDist, setFilterDist] = useState('');
    // const [filterBlock, setFilterBlock] = useState('');
    // const [filterGP, setFilterGP] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Load users with filters
    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await userService.getInitialData({
                // district: filterDist || undefined,
                // block: filterBlock || undefined,
                // gram_panchayat: filterGP || undefined,
                role_id: filterRole || undefined,
                search: searchQuery || undefined,
            });

            setUsers(data.users.data);
            if (data.roles) setRoles(data.roles);
            if (data.departments) setDepartments(data.departments);
            if (data.userSettingsSchema) setUserSettingsSchema(data.userSettingsSchema);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }, [filterRole, searchQuery]);

    // Load on mount if no initial data
    useEffect(() => {
        if (!initialUsers) {
            loadUsers();
        }
    }, []);

    // Reload when filters change
    useEffect(() => {
        if (initialUsers) {
            loadUsers();
        }
    }, [filterRole, searchQuery]);

    // Handle user deletion/activation
    const handleToggleUserStatus = async (user: User) => {
        try {
            if (user.deleted_at) {
                await userService.restoreUser(user.id);
            } else {
                await userService.deleteUser(user.id);
            }
            loadUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    // Helper function to calculate full address
    const getFullAddress = (user: User) => {
        const parts = [
            user.address,
            user.district,
            user.block,
            user.gram_panchayat,
            user.pincode
        ].filter(Boolean);
        return parts.join(', ') || 'N/A';
    };

    // Helper function to get document status
    const getDocumentStatus = (user: User) => {
        if (!user.documents || user.documents.length === 0) {
            return { status: 'None', count: 0 };
        }

        const pending = user.documents.filter(d => d.verification_status === 'pending').length;
        const approved = user.documents.filter(d => d.verification_status === 'approved').length;
        const rejected = user.documents.filter(d => d.verification_status === 'rejected').length;

        if (pending > 0) return { status: 'Pending', count: user.documents.length };
        if (rejected > 0) return { status: 'Rejected', count: user.documents.length };
        if (approved > 0) return { status: 'Approved', count: user.documents.length };

        return { status: 'None', count: 0 };
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'User Management', href: '/admin/users' }]}>
            <Head title="User Management" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950">

                {/* --- 1. KPI Stats (STATIC) --- */}
                <div className="grid gap-4 md:grid-cols-4">
                    {kpiStats.map((stat, i) => (
                        <Card key={i} className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</h3>
                                </div>
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* --- 2. Advanced Filters & Actions --- */}
                <div className="flex flex-col xl:flex-row justify-between gap-4 items-end xl:items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">

                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-zinc-700">
                            <ListFilter size={16} className="text-gray-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                        </div>

                        {/* Role Filter */}
                        <Select value={filterRole || 'all'} onValueChange={(val) => setFilterRole(val === 'all' ? '' : val)}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="All Roles" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Location Filters - Commented out for now */}
                        {/* District Filter */}
                        {/* <Select value={filterDist || undefined} onValueChange={(val) => { setFilterDist(val || ''); setFilterBlock(''); setFilterGP(''); }}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="All Districts" /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(odishaHierarchy).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select> */}

                        {/* Block Filter (Dependent) */}
                        {/* <Select value={filterBlock || undefined} onValueChange={(val) => { setFilterBlock(val || ''); setFilterGP(''); }} disabled={!filterDist}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="All Blocks" /></SelectTrigger>
                            <SelectContent>
                                {filterDist && odishaHierarchy[filterDist]?.blocks.map((b: string) => (
                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select> */}

                        {/* GP Filter (Dependent) */}
                        {/* <Select value={filterGP || undefined} onValueChange={(val) => setFilterGP(val || '')} disabled={!filterBlock}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="All GPs" /></SelectTrigger>
                            <SelectContent>
                                {filterDist && filterBlock && odishaHierarchy[filterDist]?.gps[filterBlock]?.map((g: string) => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select> */}

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search name, email or phone..."
                                className="pl-9 h-9 bg-white dark:bg-zinc-950"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Clear Filter Button */}
                        {(filterRole || searchQuery) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFilterRole('');
                                    setSearchQuery('');
                                }}
                                className="h-9"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </div>

                    <Button onClick={() => { setSelectedUser(null); setIsCreateOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 w-full xl:w-auto">
                        <UserPlus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>

                {/* --- 3. Users Table --- */}
                <Card className="flex-1 rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4">User Details</th>
                                        <th className="px-6 py-4">Role & Location</th>
                                        <th className="px-6 py-4">Security</th>
                                        <th className="px-6 py-4">Docs</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Face</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                    {users.map((user) => {
                                        const docStatus = getDocumentStatus(user);
                                        return (
                                            <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300">{user.role?.name || 'N/A'}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin size={10} className="text-orange-500" />
                                                        {user.district && user.block ? `${user.district} > ${user.block}` : 'No Location'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <FeatureIcon active={user.settings?.face_verification_enabled ?? false} icon={ScanFace} tooltip="Face Verification" />
                                                        <FeatureIcon active={user.settings?.gps_spoof_check_enabled ?? false} icon={MapIcon} tooltip="GPS Spoof Check" />
                                                        <FeatureIcon active={user.settings?.multiple_attendance_allowed ?? false} icon={Repeat} tooltip="Multiple Attendance" />
                                                        <FeatureIcon active={user.settings?.allow_outside_geofence ?? false} icon={Shield} tooltip="Allow Outside Geofence" />
                                                        <FeatureIcon active={user.settings?.live_tracking_enabled ?? false} icon={Clock} tooltip="Live Tracking" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setSelectedUser(user); setIsDocOpen(true); }}
                                                        className={`h-6 px-2 text-[10px] uppercase font-bold tracking-wide border ${docStatus.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            docStatus.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                docStatus.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                            }`}
                                                    >
                                                        {docStatus.status}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={user.deleted_at === null ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}>
                                                        {user.deleted_at === null ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.faceEmbedding ? (
                                                        <button
                                                            onClick={() => { setSelectedUser(user); setIsFaceOpen(true); }}
                                                            className="h-10 w-10 rounded-full overflow-hidden border-2 border-orange-500 hover:border-orange-600 transition cursor-pointer"
                                                        >
                                                            <img
                                                                src={`/storage/${user.faceEmbedding.registered_image}`}
                                                                alt="Face"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => { setSelectedUser(user); setIsFaceOpen(true); }}
                                                            className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                        >
                                                            <Camera className="mr-1 h-3 w-3" />
                                                            Register
                                                        </Button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical size={16} /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsCreateOpen(true); }}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDocOpen(true); }}>
                                                                <FileCheck className="mr-2 h-4 w-4" /> Verify Docs
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleUserStatus(user)} className={user.deleted_at ? 'text-green-600' : 'text-red-600'}>
                                                                {user.deleted_at ? (
                                                                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Activate User</>
                                                                ) : (
                                                                    <><Trash2 className="mr-2 h-4 w-4" /> Deactivate User</>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

            </div>

            {/* --- Modals --- */}
            <UserDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                user={selectedUser}
                roles={roles}
                departments={departments}
                userSettingsSchema={userSettingsSchema}
                onSuccess={loadUsers}
            />
            <DocumentDialog
                open={isDocOpen}
                onOpenChange={setIsDocOpen}
                user={selectedUser}
                onSuccess={loadUsers}
            />
            <FaceEnrollmentDialog
                open={isFaceOpen}
                onOpenChange={setIsFaceOpen}
                user={selectedUser}
                onSuccess={loadUsers}
            />

        </AppLayout>
    );
}

// --- Helper Components ---

function FeatureIcon({ active, icon: Icon, tooltip }: any) {
    return (
        <div className={`p-1.5 rounded-md ${active ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800'}`} title={tooltip}>
            <Icon size={14} />
        </div>
    );
}

// --- 4. User Create/Edit Modal (Dynamic) ---
function UserDialog({ open, onOpenChange, user, roles, departments, userSettingsSchema, onSuccess }: any) {
    // Form State
    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        phone: '',
        password: '',
        role_id: 0,
        department_id: 0,
        address: '',
        district: '',
        block: '',
        gram_panchayat: '',
        pincode: '',
        settings: {},
    });
    const [loading, setLoading] = useState(false);

    // Populate form when user changes
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                password: '', // Never prefill password
                role_id: user.role_id || 0,
                department_id: user.department_id || 0,
                address: user.address || '',
                district: user.district || '',
                block: user.block || '',
                gram_panchayat: user.gram_panchayat || '',
                pincode: user.pincode || '',
                settings: user.settings || {},
            });
        } else {
            // Reset for new user
            setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                role_id: 0,
                department_id: 0,
                address: '',
                district: '',
                block: '',
                gram_panchayat: '',
                pincode: '',
                settings: {},
            });
        }
    }, [user, open]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (user) {
                await userService.updateUser(user.id, formData);
            } else {
                await userService.createUser(formData);
            }
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error('Error saving user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key: string, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: value,
            }
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 bg-white dark:bg-zinc-950">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle>{user ? 'Edit User Profile' : 'Create New User'}</DialogTitle>
                    <DialogDescription>Enter personal details, assign location, and configure security.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-6">

                        {/* Section: Basic Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Rajesh Kumar" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 99999 99999" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Email Address</Label>
                                    <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" placeholder="user@gov.in" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Password {user && '(Leave blank to keep unchanged)'}</Label>
                                    <Input value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} type="password" placeholder={user ? 'Leave blank to keep current' : 'Enter password'} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Address</Label>
                                    <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Enter full address" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Location & Role */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role & Location Assignment</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={formData.role_id.toString()} onValueChange={(val) => setFormData({ ...formData, role_id: parseInt(val) })}>
                                        <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role: Role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select value={formData.department_id.toString()} onValueChange={(val) => setFormData({ ...formData, department_id: parseInt(val) })}>
                                        <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept: Department) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>District</Label>
                                    <Input value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} placeholder="Enter District" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Block</Label>
                                    <Input value={formData.block} onChange={(e) => setFormData({ ...formData, block: e.target.value })} placeholder="Enter Block" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gram Panchayat (GP)</Label>
                                    <Input value={formData.gram_panchayat} onChange={(e) => setFormData({ ...formData, gram_panchayat: e.target.value })} placeholder="Enter GP" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pincode</Label>
                                    <Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="75XXXX" maxLength={6} />
                                </div>
                            </div>
                        </div>

                        {/* Section: Security - Dynamic Settings */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Security & Permissions</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {userSettingsSchema.map((setting: UserSettingSchema) => (
                                    <div key={setting.key} className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="text-xs">{setting.label}</Label>
                                        <Switch
                                            checked={(formData.settings as any)?.[setting.key] ?? setting.default}
                                            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit} disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- 5. Document Approval Modal (Dynamic) ---
function DocumentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);

    useEffect(() => {
        if (user && open) {
            loadDocuments();
        }
    }, [user, open]);

    const loadDocuments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await userService.getUserDocuments(user.id);
            setDocuments(data.documents);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (docId: number) => {
        try {
            await userService.approveDocument(docId);
            loadDocuments();
            onSuccess();
        } catch (error) {
            console.error('Error approving document:', error);
        }
    };

    const handleReject = async (docId: number) => {
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        try {
            await userService.rejectDocument(docId, rejectionReason);
            setRejectionReason('');
            setRejectingDocId(null);
            loadDocuments();
            onSuccess();
        } catch (error) {
            console.error('Error rejecting document:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            await userService.uploadDocument(user.id, file, 'general');
            loadDocuments();
            onSuccess();
        } catch (error) {
            console.error('Error uploading document:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950">
                <DialogHeader>
                    <DialogTitle>Document Verification</DialogTitle>
                    <DialogDescription>Review documents uploaded by {user?.name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                        </div>
                    ) : documents.length > 0 ? (
                        documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-zinc-900">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center"><FileText size={20} /></div>
                                    <div>
                                        <p className="text-sm font-medium">{doc.document_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.verification_status} - {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" title="View" onClick={() => window.open(`/storage/${doc.document_path}`, '_blank')}>
                                        <Eye size={16} />
                                    </Button>
                                    {doc.verification_status === 'pending' && (
                                        <>
                                            <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => handleApprove(doc.id)}>
                                                <CheckCircle2 size={16} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setRejectingDocId(doc.id)}>
                                                <XCircle size={16} />
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {rejectingDocId === doc.id && (
                                    <div className="col-span-2 mt-2">
                                        <Input
                                            placeholder="Rejection reason..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <Button size="sm" variant="outline" onClick={() => setRejectingDocId(null)}>Cancel</Button>
                                            <Button size="sm" className="bg-red-600" onClick={() => handleReject(doc.id)}>Submit Rejection</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">No documents uploaded yet</p>
                    )}

                    <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer transition">
                        <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} />
                        <label htmlFor="doc-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload new document</p>
                        </label>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- 6. Face Enrollment Modal ---
function FaceEnrollmentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const hasExistingFace = user?.faceEmbedding;

    // Start camera
    const startCamera = async () => {
        try {
            setError('');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play(); // 🔥 THIS WAS MISSING
            }

            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera. Please allow camera permission.');
        }
    };


    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    // Capture photo
    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg');
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    // Retake photo
    const retakePhoto = () => {
        setCapturedImage(null);
        setError('');
        setSuccess('');
        startCamera();
    };

    // Submit enrollment
    const handleSubmit = async () => {
        if (!capturedImage || !user) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const endpoint = hasExistingFace
                ? userService.reEnrollFace(user.id, capturedImage)
                : userService.enrollFace(user.id, capturedImage);

            const result = await endpoint;

            if (result.success) {
                setSuccess(hasExistingFace ? 'Face re-enrolled successfully!' : 'Face enrolled successfully!');
                setTimeout(() => {
                    onSuccess();
                    onOpenChange(false);
                    resetState();
                }, 1500);
            } else {
                setError(result.message || 'Enrollment failed. No face detected.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Enrollment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Reset state
    const resetState = () => {
        setCapturedImage(null);
        setError('');
        setSuccess('');
        stopCamera();
    };

    // Cleanup on unmount or close
    useEffect(() => {
        if (!open) {
            resetState();
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-950">
                <DialogHeader>
                    <DialogTitle>
                        {hasExistingFace ? 'Re-enroll Face' : 'Face Enrollment'}
                    </DialogTitle>
                    <DialogDescription>
                        {hasExistingFace
                            ? `Update face recognition for ${user?.name || 'user'}`
                            : `Register face recognition for ${user?.name || 'user'}`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Camera Preview or Captured Image */}
                    <div className="relative bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                        {!cameraActive && !capturedImage && (
                            <div className="text-center p-8">
                                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">Camera not started</p>
                                <Button onClick={startCamera} className="mt-4 bg-orange-600 hover:bg-orange-700">
                                    <Video className="mr-2 h-4 w-4" />
                                    Start Camera
                                </Button>
                            </div>
                        )}

                        {cameraActive && !capturedImage && (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        )}

                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-center">
                        {cameraActive && !capturedImage && (
                            <>
                                <Button
                                    onClick={capturePhoto}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Camera className="mr-2 h-4 w-4" />
                                    Capture Photo
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={stopCamera}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}

                        {capturedImage && (
                            <>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                    ) : (
                                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit</>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={retakePhoto}
                                    disabled={loading}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Retake
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                        </div>
                    )}

                    {/* Existing Face Info */}
                    {hasExistingFace && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                <ScanFace className="h-4 w-4" />
                                This user already has a registered face. Proceeding will replace the existing enrollment.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
