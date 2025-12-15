import { useState, useEffect, useCallback, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import {
    Users, UserPlus, FileCheck, MapPin, Search, MoreVertical,
    Edit, Trash2, Eye, CheckCircle2, XCircle, ShieldAlert,
    ScanFace, Map as MapIcon, Clock, Upload, FileText,
    ListFilter, Loader2, Repeat, Shield, Camera, Video, RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

// NOTE: Assuming these types and service mock/interface definitions exist in your system
import { User, Role, Department, UserSettingSchema, UserDocument } from '@/types/user-management'
import { userService } from '@/services/userService'

/* ---------------------------------------------
    TYPES (Re-defined for clarity)
--------------------------------------------- */
interface UserFormData {
    name: string; email: string; phone: string; password?: string;
    role_id: number; department_id: number; address: string;
    district: string; block: string; gram_panchayat: string; pincode: string;
    settings: { [key: string]: boolean | string | number | null };
}

interface Props {
    initialUsers: any
    roles: Role[]
    departments: Department[]
    userSettingsSchema: UserSettingSchema[]
    dynamicStats: {
        totalUsers: string
        activeToday: string
        pendingApproval: string
        gpsViolations: string
    }
}

// --- Helper component for security badges ---
function FeatureIcon({ active, icon: Icon, tooltip }: any) {
    return (
        <div className={`p-1.5 rounded-md ${active ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800'}`} title={tooltip}>
            <Icon size={14} />
        </div>
    );
}

// --- Helper function to get document status for the table ---
const getDocumentStatus = (user: User) => {
    if (!user.documents || user.documents.length === 0) {
        return { status: 'None', count: 0 };
    }
    const pending = user.documents.filter(d => (d as any).verification_status === 'pending').length;
    const rejected = user.documents.filter(d => (d as any).verification_status === 'rejected').length;

    if (pending > 0) return { status: 'Pending', color: 'orange' };
    if (rejected > 0) return { status: 'Rejected', color: 'red' };
    return { status: 'Approved', color: 'green' };
};


/* ---------------------------------------------
    MAIN COMPONENT
--------------------------------------------- */
export default function UserManagement({
    initialUsers,
    roles,
    departments,
    userSettingsSchema,
    dynamicStats: initialStats
}: Props) {

    const [users, setUsers] = useState<User[]>(initialUsers.data)
    const [loading, setLoading] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const [isUserOpen, setIsUserOpen] = useState(false)
    const [isDocOpen, setIsDocOpen] = useState(false)
    const [isFaceOpen, setIsFaceOpen] = useState(false)

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')

    const [stats, setStats] = useState(initialStats)

    /* ---------------------------------------------
        LOAD USERS + KPI
    --------------------------------------------- */
    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await userService.getInitialData({
                search: search || undefined,
                role_id: roleFilter || undefined
            })

            setUsers(res.users.data)
            setStats(res.dynamicStats)
        } finally {
            setLoading(false)
        }
    }, [search, roleFilter])

    useEffect(() => {
        loadUsers()
    }, [search, roleFilter])

    /* ---------------------------------------------
        ACTION HANDLERS
    --------------------------------------------- */
    const handleToggleStatus = async (user: User) => {
        if (!confirm(user.deleted_at 
            ? `Are you sure you want to activate ${user.name}?` 
            : `Are you sure you want to deactivate ${user.name}?`)) {
            return;
        }

        try {
            if (user.deleted_at) {
                await userService.restoreUser(user.id);
            } else {
                await userService.deleteUser(user.id);
            }
            loadUsers(); // Refresh list
        } catch (error) {
            console.error("Status toggle failed", error);
            alert("Failed to update user status.");
        }
    };

    /* ---------------------------------------------
        KPI CONFIG
    --------------------------------------------- */
    const kpis = [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
        { label: 'Active Today', value: stats.activeToday, icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
        { label: 'Pending Approval', value: stats.pendingApproval, icon: FileCheck, bg: 'bg-orange-50', color: 'text-orange-600' },
        { label: 'GPS Violations', value: stats.gpsViolations, icon: ShieldAlert, bg: 'bg-red-50', color: 'text-red-600' }
    ]

    /* ---------------------------------------------
        RENDER
    --------------------------------------------- */
    return (
        <AppLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'User Management', href: '/admin/users' }
        ]}>
            <Head title="User Management" />

            <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-zinc-950">

                {/* KPI */}
                <div className="grid md:grid-cols-4 gap-4">
                    {kpis.map((k, i) => (
                        <Card key={i} className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm">
                            <CardContent className="p-5 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{k.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                                </div>
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${k.bg} ${k.color}`}>
                                    <k.icon size={20} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* FILTER BAR */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2">
                        <ListFilter size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
                    </div>
                    
                    <Input
                        placeholder="Search name, email, phone"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-64 h-9"
                    />

                    <Select value={roleFilter || 'all'} onValueChange={v => setRoleFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="w-full md:w-40 h-9">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {roles.map(r => (
                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        className="ml-auto bg-orange-600 hover:bg-orange-700 h-9"
                        onClick={() => {
                            setSelectedUser(null) // Clear selected user for 'Add'
                            setIsUserOpen(true) // Open the UserDialog
                        }}
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>

                {/* TABLE */}
                <Card className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-10 flex justify-center">
                            <Loader2 className="animate-spin h-6 w-6 text-orange-600" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">User Details</th>
                                        <th className="px-6 py-3">Role & Location</th>
                                        <th className="px-6 py-3">Security</th>
                                        <th className="px-6 py-3">Docs</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Face</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                    {users.map(u => {
                                        const docStatus = getDocumentStatus(u);
                                        return (
                                            <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-bold text-lg">
                                                            {u.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                                                            <div className="text-xs text-gray-500">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300">{u.role?.name}</div>
                                                    <div className="text-xs text-gray-500">{u.district || 'No District'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <FeatureIcon active={u.settings?.face_verification_enabled as boolean} icon={ScanFace} tooltip="Face Verification" />
                                                        <FeatureIcon active={u.settings?.gps_spoof_check_enabled as boolean} icon={MapIcon} tooltip="GPS Spoof Check" />
                                                        <FeatureIcon active={u.settings?.live_tracking_enabled as boolean} icon={Clock} tooltip="Live Tracking" />
                                                        <FeatureIcon active={u.settings?.allow_outside_geofence as boolean} icon={MapPin} tooltip="Outside Geofence" />

                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`cursor-pointer font-medium ${docStatus.color === 'green' ? 'bg-green-50 text-green-700' : docStatus.color === 'orange' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
                                                        onClick={() => { setSelectedUser(u); setIsDocOpen(true); }}
                                                    >
                                                        {docStatus.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={u.deleted_at ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}>
                                                        {u.deleted_at ? 'Inactive' : 'Active'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                        onClick={() => { setSelectedUser(u); setIsFaceOpen(true) }}
                                                    >
                                                        <Camera className="h-3 w-3 mr-1" /> {u.faceEmbedding ? 'View' : 'Register'}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost"><MoreVertical /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsUserOpen(true) }}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsDocOpen(true) }}>
                                                                <FileCheck className="mr-2 h-4 w-4" /> Documents
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(u)} className={u.deleted_at ? "text-green-600" : "text-red-600"}>
                                                                {u.deleted_at ? (
                                                                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Activate</>
                                                                ) : (
                                                                    <><Trash2 className="mr-2 h-4 w-4" /> Deactivate</>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {/* MODALS */}
                {/* 1. ADD/EDIT USER MODAL */}
                <UserDialog
                    open={isUserOpen}
                    onOpenChange={o => {
                        setIsUserOpen(o)
                        if (!o) setSelectedUser(null)
                    }}
                    user={selectedUser}
                    roles={roles}
                    departments={departments}
                    userSettingsSchema={userSettingsSchema}
                    onSuccess={loadUsers}
                />

                {/* 2. DOCUMENT MODAL */}
                <DocumentDialog
                    open={isDocOpen}
                    user={selectedUser}
                    onOpenChange={o => {
                        setIsDocOpen(o)
                        if (!o) setSelectedUser(null)
                    }}
                    onSuccess={loadUsers}
                />

                {/* 3. FACE MODAL */}
                <FaceEnrollmentDialog
                    open={isFaceOpen}
                    user={selectedUser}
                    onOpenChange={o => {
                        setIsFaceOpen(o)
                        if (!o) setSelectedUser(null)
                    }}
                    onSuccess={loadUsers}
                />

            </div>
        </AppLayout>
    )
}

/* ======================================================
    1. USER CREATE/EDIT MODAL (UserDialog)
====================================================== */
function UserDialog({ open, onOpenChange, user, roles, departments, userSettingsSchema, onSuccess }: any) {
    const defaultFormData: UserFormData = {
        name: '', email: '', phone: '', password: '',
        role_id: 0, department_id: 0, address: '',
        district: '', block: '', gram_panchayat: '', pincode: '',
        settings: {},
    };

    const [formData, setFormData] = useState<UserFormData>(defaultFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '', email: user.email || '', phone: user.phone || '', password: '',
                role_id: user.role_id || 0, department_id: user.department_id || 0, address: user.address || '',
                district: user.district || '', block: user.block || '', gram_panchayat: user.gram_panchayat || '', pincode: user.pincode || '',
                settings: user.settings || {},
            });
        } else {
            setFormData(defaultFormData);
        }
    }, [user, open]);

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({});
        try {
            if (user) {
                await userService.updateUser(user.id, formData);
            } else {
                await userService.createUser(formData);
            }
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error saving user:', error);
            setErrors(error.response?.data?.errors || { general: 'Failed to save changes.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key: string, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            settings: { ...prev.settings, [key]: value }
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle>{user ? 'Edit User Profile' : 'Create New User'}</DialogTitle>
                    <DialogDescription>Enter personal details, assign location, and configure security.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-6">

                        {errors.general && (
                            <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded text-sm">
                                {errors.general}
                            </div>
                        )}

                        {/* Section: Basic Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Rajesh Kumar" />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 99999 99999" />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="user@gov.in" />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email[0]}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="password">Password {user && '(Leave blank to keep unchanged)'}</Label>
                                    <Input id="password" name="password" value={formData.password} onChange={handleInputChange} type="password" placeholder={user ? 'Leave blank to keep current' : 'Enter password'} />
                                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="Enter full address" />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address[0]}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section: Location & Role */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role & Location Assignment</h4>
                            <div className="grid grid-cols-2 gap-4">

                                {/* Role Selection */}
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={formData.role_id ? String(formData.role_id) : undefined}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, role_id: parseInt(val) }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role: Role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.role_id && <p className="text-red-500 text-xs mt-1">{errors.role_id[0]}</p>}
                                </div>

                                {/* Department Selection */}
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select
                                        value={formData.department_id ? String(formData.department_id) : undefined}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, department_id: parseInt(val) }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept: Department) => (
                                                <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.department_id && <p className="text-red-500 text-xs mt-1">{errors.department_id[0]}</p>}
                                </div>

                                {/* Location Fields */}
                                <div className="space-y-2">
                                    <Label htmlFor="district">District</Label>
                                    <Input id="district" name="district" value={formData.district} onChange={handleInputChange} placeholder="Enter District" />
                                    {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="block">Block</Label>
                                    <Input id="block" name="block" value={formData.block} onChange={handleInputChange} placeholder="Enter Block" />
                                    {errors.block && <p className="text-red-500 text-xs mt-1">{errors.block[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gram_panchayat">Gram Panchayat (GP)</Label>
                                    <Input id="gram_panchayat" name="gram_panchayat" value={formData.gram_panchayat} onChange={handleInputChange} placeholder="Enter GP" />
                                    {errors.gram_panchayat && <p className="text-red-500 text-xs mt-1">{errors.gram_panchayat[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="75XXXX" maxLength={6} />
                                    {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode[0]}</p>}
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
                            {errors.settings && <p className="text-red-500 text-xs mt-1">{errors.settings[0]}</p>}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleSubmit}
                        disabled={loading || (!user && !formData.password)}
                    >
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ======================================================
    2. DOCUMENT MODAL (WITH APPROVE/REJECT ACTIONS)
====================================================== */
function DocumentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const [docs, setDocs] = useState<UserDocument[]>([])
    const [preview, setPreview] = useState<UserDocument | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [rejectId, setRejectId] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reload documents when modal opens or user changes
    const loadDocs = useCallback(async () => {
        if (user) {
            const res = await userService.getUserDocuments(user.id);
            setDocs(res.documents);
        }
    }, [user]);

    useEffect(() => {
        if (open) loadDocs();
    }, [open, loadDocs]);

    // Handle File Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        
        try {
            await userService.uploadDocument(user.id, file, 'general');
            loadDocs(); // Refresh list
            onSuccess(); // Update stats
        } catch (error) {
            console.error("Upload failed", error);
        }
    };

    // Handle Approve
    const handleApprove = async (docId: number) => {
        try {
            await userService.approveDocument(docId);
            loadDocs();
            onSuccess();
        } catch (e) {
            console.error(e);
        }
    }

    // Handle Reject
    const handleReject = async () => {
        if (!rejectId || !rejectReason) return;
        try {
            await userService.rejectDocument(rejectId, rejectReason);
            setRejectId(null);
            setRejectReason('');
            loadDocs();
            onSuccess();
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent forceMount className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Documents for {user?.name}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
                        {docs.length > 0 ? (
                            docs.map(d => (
                                <div key={d.id} className="border p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <FileCheck className="h-4 w-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium">{d.document_name}</p>
                                                <Badge variant="outline" className={`mt-1 text-[10px] 
                                                    ${(d as any).verification_status === 'approved' ? 'bg-green-50 text-green-700' : 
                                                      (d as any).verification_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                                                    {(d as any).verification_status.toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreview(d)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {/* Show Approve/Reject only if pending */}
                                            {(d as any).verification_status === 'pending' && (
                                                <>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(d.id)}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setRejectId(d.id)}>
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rejection Input */}
                                    {rejectId === d.id && (
                                        <div className="flex gap-2 mt-2 items-center animate-in fade-in slide-in-from-top-1">
                                            <Input 
                                                placeholder="Reason for rejection..." 
                                                value={rejectReason}
                                                onChange={e => setRejectReason(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700" onClick={handleReject}>Confirm</Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setRejectId(null)}>Cancel</Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No documents uploaded.</p>
                        )}
                    </div>

                    <input
                        id="doc-upload"
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    <Button
                        variant="outline"
                        className="w-full mt-2 border-dashed border-2 hover:bg-gray-50 dark:hover:bg-zinc-900"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="mr-2 h-4 w-4" /> Upload Document
                    </Button>
                </DialogContent>
            </Dialog>

            {/* PREVIEW */}
            <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
                <DialogContent className="max-w-5xl h-[80vh]">
                    <iframe
                        src={`/storage/${preview?.document_path}`}
                        className="w-full h-full rounded border bg-gray-50"
                        title="Document Preview"
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}

/* ======================================================
    3. FACE ENROLLMENT (CAMERA FIXED)
====================================================== */
function FaceEnrollmentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [image, setImage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    const startCamera = async () => {
        stopCamera();
        setImage(null);
        setError('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for metadata to load before playing to avoid "play() failed" errors
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Play error:", e));
                };
            }
        } catch (err) {
            setError("Camera access denied or not available.");
            console.error("Camera error:", err);
        }
    }

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg', 0.9);
                setImage(imageData);
                stopCamera();
            }
        }
    };

    const retakePhoto = () => {
        setImage(null);
        setError('');
        setSuccess('');
        startCamera();
    };

    useEffect(() => {
        if (open) startCamera()
        return stopCamera
    }, [open])

    const handleSubmit = async () => {
        if (!image || !user) return;
        setLoading(true);
        setError('');
        try {
            const action = user.faceEmbedding ? userService.reEnrollFace : userService.enrollFace;
            await action(user.id, image);
            setSuccess("Enrollment successful!");
            onSuccess();
            setTimeout(() => onOpenChange(false), 1000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Enrollment failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent forceMount className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Face Enrollment for {user?.name}</DialogTitle>
                </DialogHeader>

                {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
                {success && <p className="text-green-600 text-sm bg-green-50 p-2 rounded flex items-center gap-2"><CheckCircle2 size={16}/> {success}</p>}

                <div className="relative bg-black rounded overflow-hidden aspect-video flex items-center justify-center">
                    {!image ? (
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                        <img src={image} className="w-full h-full object-cover" alt="Captured Face" />
                    )}
                </div>

                <div className="flex justify-center gap-3 mt-2">
                    {!image && !error && (
                        <Button onClick={capturePhoto} className="bg-orange-600 hover:bg-orange-700">
                            <Camera className="mr-2 h-4 w-4" /> Capture Photo
                        </Button>
                    )}

                    {image && (
                        <>
                            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />} Submit
                            </Button>
                            <Button onClick={retakePhoto} variant="outline" disabled={loading}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Retake
                            </Button>
                        </>
                    )}
                    
                    {error && (
                         <Button onClick={startCamera} variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" /> Retry Camera
                        </Button>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}