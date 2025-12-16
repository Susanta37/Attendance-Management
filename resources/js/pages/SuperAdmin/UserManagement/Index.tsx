import { useState, useEffect, useCallback, useRef } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import axios from 'axios'
import { useTranslation } from '@/hooks/use-translation' // Import Translation Hook

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

import { User, Role, Department, UserSettingSchema, UserDocument } from '@/types/user-management'
import { userService } from '@/services/userService'

/* ---------------------------------------------
   TYPES
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
    districts: Array<{ id: number; name: string }>
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
    districts,
    userSettingsSchema,
    dynamicStats: initialStats
}: Props) {
    const { t } = useTranslation(); // Init Translation
    const [users, setUsers] = useState<User[]>(initialUsers.data)
    const [loading, setLoading] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const [isUserOpen, setIsUserOpen] = useState(false)
    const [isDocOpen, setIsDocOpen] = useState(false)
    const [isFaceOpen, setIsFaceOpen] = useState(false)

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')

    const [stats, setStats] = useState(initialStats)

    /* --- LOAD USERS + KPI --- */
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

    /* --- ACTION HANDLERS --- */
    const handleToggleStatus = async (user: User) => {
        const action = user.deleted_at ? t('activate') : t('deactivate');
        if (!confirm(`${t('confirm_action')} ${action} ${user.name}?`)) {
            return;
        }

        try {
            if (user.deleted_at) {
                await userService.restoreUser(user.id);
            } else {
                await userService.deleteUser(user.id);
            }
            loadUsers(); 
        } catch (error) {
            console.error("Status toggle failed", error);
            alert(t('status_update_failed'));
        }
    };

    /* --- KPI CONFIG --- */
    const kpis = [
        { label: t('total_users'), value: stats.totalUsers, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600' },
        { label: t('active_today'), value: stats.activeToday, icon: CheckCircle2, bg: 'bg-green-50', color: 'text-green-600' },
        { label: t('pending_approval'), value: stats.pendingApproval, icon: FileCheck, bg: 'bg-orange-50', color: 'text-orange-600' },
        { label: t('gps_violations'), value: stats.gpsViolations, icon: ShieldAlert, bg: 'bg-red-50', color: 'text-red-600' }
    ]

    return (
        <AppLayout breadcrumbs={[
            { title: t('dashboard'), href: '/dashboard' },
            { title: t('user_management'), href: '/admin/users' }
        ]}>
            <Head title={t('user_management')} />

            <div className="p-6 space-y-6 bg-gray-50/50 dark:bg-zinc-950">

                {/* KPI Cards */}
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

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-2">
                        <ListFilter size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('filters')}:</span>
                    </div>
                    
                    <Input
                        placeholder={t('search_placeholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full md:w-64 h-9"
                    />

                    <Select value={roleFilter || 'all'} onValueChange={v => setRoleFilter(v === 'all' ? '' : v)}>
                        <SelectTrigger className="w-full md:w-40 h-9">
                            <SelectValue placeholder={t('all_roles')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('all_roles')}</SelectItem>
                            {roles.map(r => (
                                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        className="ml-auto bg-orange-600 hover:bg-orange-700 h-9"
                        onClick={() => {
                            setSelectedUser(null) 
                            setIsUserOpen(true) 
                        }}
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> {t('add_user')}
                    </Button>
                </div>

                {/* Users Table */}
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
                                        <th className="px-6 py-3 text-left">{t('user_details')}</th>
                                        <th className="px-6 py-3">{t('role_location')}</th>
                                        <th className="px-6 py-3">{t('security')}</th>
                                        <th className="px-6 py-3">{t('docs')}</th>
                                        <th className="px-6 py-3">{t('status')}</th>
                                        <th className="px-6 py-3">{t('face')}</th>
                                        <th className="px-6 py-3 text-right">{t('actions')}</th>
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
                                                    <div className="text-xs text-gray-500">{u.district || t('no_district')}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <FeatureIcon active={u.settings?.face_verification_enabled as boolean} icon={ScanFace} tooltip={t('face_verification')} />
                                                        <FeatureIcon active={u.settings?.gps_spoof_check_enabled as boolean} icon={MapIcon} tooltip={t('gps_spoof')} />
                                                        <FeatureIcon active={u.settings?.live_tracking_enabled as boolean} icon={Clock} tooltip={t('live_tracking')} />
                                                        <FeatureIcon active={u.settings?.allow_outside_geofence as boolean} icon={MapPin} tooltip={t('outside_geofence')} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`cursor-pointer font-medium ${docStatus.color === 'green' ? 'bg-green-50 text-green-700' : docStatus.color === 'orange' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
                                                        onClick={() => { setSelectedUser(u); setIsDocOpen(true); }}
                                                    >
                                                        {t(docStatus.status.toLowerCase())}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={u.deleted_at ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'}>
                                                        {u.deleted_at ? t('inactive') : t('active')}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="h-8 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                        onClick={() => { setSelectedUser(u); setIsFaceOpen(true) }}
                                                    >
                                                        <Camera className="h-3 w-3 mr-1" /> {u.faceEmbedding ? t('view') : t('register')}
                                                    </Button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost"><MoreVertical /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsUserOpen(true) }}>
                                                                <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsDocOpen(true) }}>
                                                                <FileCheck className="mr-2 h-4 w-4" /> {t('documents')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(u)} className={u.deleted_at ? "text-green-600" : "text-red-600"}>
                                                                {u.deleted_at ? <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('activate')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('deactivate')}</>}
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

                {/* --- MODALS --- */}
                
                {/* 1. Add/Edit User */}
                <UserDialog
                    open={isUserOpen}
                    onOpenChange={(o: boolean) => { setIsUserOpen(o); if (!o) setSelectedUser(null) }}
                    user={selectedUser}
                    roles={roles}
                    districts={districts}
                    departments={departments}
                    userSettingsSchema={userSettingsSchema}
                    onSuccess={loadUsers}
                />

                {/* 2. Documents */}
                <DocumentDialog
                    open={isDocOpen}
                    user={selectedUser}
                    onOpenChange={(o: boolean) => { setIsDocOpen(o); if (!o) setSelectedUser(null) }}
                    onSuccess={loadUsers}
                />

                {/* 3. Face Enrollment */}
                <FaceEnrollmentDialog
                    open={isFaceOpen}
                    user={selectedUser}
                    onOpenChange={(o: boolean) => { setIsFaceOpen(o); if (!o) setSelectedUser(null) }}
                    onSuccess={loadUsers}
                />

            </div>
        </AppLayout>
    )
}

/* ======================================================
   1. USER CREATE/EDIT MODAL
====================================================== */
function UserDialog({ open, onOpenChange, user, roles, departments, districts, userSettingsSchema, onSuccess }: any) {
    const { t } = useTranslation();
    const defaultFormData: UserFormData = {
        name: '', email: '', phone: '', password: '',
        role_id: 0, department_id: 0, address: '',
        district: '', block: '', gram_panchayat: '', pincode: '',
        settings: {},
    };

    const [formData, setFormData] = useState<UserFormData>(defaultFormData);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});
    
    // Dynamic Options
    const [blockOptions, setBlockOptions] = useState<any[]>([]);
    const [gpOptions, setGpOptions] = useState<any[]>([]);
    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [loadingGps, setLoadingGps] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '', email: user.email || '', phone: user.phone || '', password: '',
                role_id: user.role_id || 0, department_id: user.department_id || 0, address: user.address || '',
                district: user.district || '', block: user.block || '', gram_panchayat: user.gram_panchayat || '', pincode: user.pincode || '',
                settings: user.settings || {},
            });
            // Pre-fill dropdowns if editing
            if (user.district) axios.get(`/api/blocks/${user.district}`).then(res => setBlockOptions(res.data));
            if (user.block) axios.get(`/api/gps/${user.block}`).then(res => setGpOptions(res.data));
        } else {
            setFormData(defaultFormData);
            setBlockOptions([]); setGpOptions([]);
        }
    }, [user, open]);

    const handleDistrictChange = async (districtId: string) => {
        setFormData(prev => ({ ...prev, district: districtId, block: '', gram_panchayat: '' }));
        setBlockOptions([]); setGpOptions([]);
        if(districtId) {
            setLoadingBlocks(true);
            try {
                const res = await axios.get(`/api/blocks/${districtId}`);
                setBlockOptions(res.data);
            } catch (e) { console.error(e); } 
            finally { setLoadingBlocks(false); }
        }
    };

    const handleBlockChange = async (blockId: string) => {
        setFormData(prev => ({ ...prev, block: blockId, gram_panchayat: '' }));
        setGpOptions([]);
        if(blockId) {
            setLoadingGps(true);
            try {
                const res = await axios.get(`/api/gps/${blockId}`);
                setGpOptions(res.data);
            } catch (e) { console.error(e); } 
            finally { setLoadingGps(false); }
        }
    };

    const handleSubmit = async () => {
        setLoading(true); setErrors({});
        try {
            if (user) await userService.updateUser(user.id, formData);
            else await userService.createUser(formData);
            onOpenChange(false); onSuccess();
        } catch (error: any) {
            setErrors(error.response?.data?.errors || { general: t('save_failed') });
        } finally { setLoading(false); }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSettingChange = (key: string, value: boolean) => {
        setFormData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle>{user ? t('edit_user') : t('create_user')}</DialogTitle>
                    <DialogDescription>{t('enter_details')}</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-6">
                        {errors.general && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{errors.general}</div>}

                        {/* Basic Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('personal_info')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>{t('full_name')}</Label><Input name="name" value={formData.name} onChange={handleInputChange} placeholder={t('full_name')} />{errors.name && <p className="text-red-500 text-xs">{errors.name[0]}</p>}</div>
                                <div className="space-y-2"><Label>{t('phone')}</Label><Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder={t('phone')} />{errors.phone && <p className="text-red-500 text-xs">{errors.phone[0]}</p>}</div>
                                <div className="col-span-2 space-y-2"><Label>{t('email')}</Label><Input name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder={t('email')} />{errors.email && <p className="text-red-500 text-xs">{errors.email[0]}</p>}</div>
                                <div className="col-span-2 space-y-2"><Label>{t('password')} {user && `(${t('optional')})`}</Label><Input name="password" value={formData.password} onChange={handleInputChange} type="password" placeholder={t('password')} />{errors.password && <p className="text-red-500 text-xs">{errors.password[0]}</p>}</div>
                                <div className="col-span-2 space-y-2"><Label>{t('address')}</Label><Input name="address" value={formData.address} onChange={handleInputChange} placeholder={t('address')} /></div>
                            </div>
                        </div>

                        {/* Location & Role */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('role_location')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('role')}</Label>
                                    <Select value={String(formData.role_id)} onValueChange={v => setFormData(p => ({...p, role_id: parseInt(v)}))}>
                                        <SelectTrigger><SelectValue placeholder={t('role')} /></SelectTrigger>
                                        <SelectContent>{roles.map((r: Role) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('department')}</Label>
                                    <Select value={String(formData.department_id)} onValueChange={v => setFormData(p => ({...p, department_id: parseInt(v)}))}>
                                        <SelectTrigger><SelectValue placeholder={t('department')} /></SelectTrigger>
                                        <SelectContent>{departments.map((d: Department) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {/* District */}
                                <div className="space-y-2">
                                    <Label>{t('district')}</Label>
                                    <Select value={formData.district} onValueChange={handleDistrictChange}>
                                        <SelectTrigger><SelectValue placeholder={t('district')} /></SelectTrigger>
                                        <SelectContent>{districts.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {/* Block */}
                                <div className="space-y-2">
                                    <Label>{t('block')} {loadingBlocks && <Loader2 className="inline h-3 w-3 animate-spin"/>}</Label>
                                    <Select value={formData.block} onValueChange={handleBlockChange} disabled={!formData.district || loadingBlocks}>
                                        <SelectTrigger><SelectValue placeholder={t('block')} /></SelectTrigger>
                                        <SelectContent>{blockOptions.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {/* GP */}
                                <div className="space-y-2">
                                    <Label>{t('gram_panchayat')} {loadingGps && <Loader2 className="inline h-3 w-3 animate-spin"/>}</Label>
                                    <Select value={formData.gram_panchayat} onValueChange={v => setFormData(p => ({...p, gram_panchayat: v}))} disabled={!formData.block || loadingGps}>
                                        <SelectTrigger><SelectValue placeholder={t('gram_panchayat')} /></SelectTrigger>
                                        <SelectContent>{gpOptions.map((g: any) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>{t('pincode')}</Label><Input name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder={t('pincode')} maxLength={6}/></div>
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('security')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {userSettingsSchema.map((s: UserSettingSchema) => (
                                    <div key={s.key} className="flex items-center justify-between p-3 border rounded-lg">
                                        <Label className="text-xs">{s.label}</Label>
                                        <Switch checked={(formData.settings as any)?.[s.key] ?? s.default} onCheckedChange={c => handleSettingChange(s.key, c)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{t('cancel')}</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : t('save_changes')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ======================================================
   2. DOCUMENT MODAL
====================================================== */
function DocumentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const { t } = useTranslation();
    const [docs, setDocs] = useState<UserDocument[]>([]);
    const [preview, setPreview] = useState<UserDocument | null>(null);
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadDocs = useCallback(async () => {
        if(user) userService.getUserDocuments(user.id).then(r => setDocs(r.documents));
    }, [user]);

    useEffect(() => { if(open) loadDocs(); }, [open, loadDocs]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0] && user) {
            await userService.uploadDocument(user.id, e.target.files[0], 'general');
            loadDocs(); onSuccess();
        }
    };

    const handleApprove = async (id: number) => {
        await userService.approveDocument(id);
        loadDocs(); onSuccess();
    };

    const handleReject = async () => {
        if(rejectId && rejectReason) {
            await userService.rejectDocument(rejectId, rejectReason);
            setRejectId(null); setRejectReason('');
            loadDocs(); onSuccess();
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent forceMount className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{t('documents')} {t('for')} {user?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
                        {docs.length > 0 ? docs.map(d => (
                            <div key={d.id} className="border p-3 rounded-lg bg-gray-50 dark:bg-zinc-900/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="h-4 w-4 text-gray-500"/>
                                        <div>
                                            <p className="text-sm font-medium">{d.document_name}</p>
                                            <Badge variant="outline" className={`mt-1 text-[10px] ${(d as any).verification_status==='approved'?'bg-green-50 text-green-700':(d as any).verification_status==='rejected'?'bg-red-50 text-red-700':'bg-orange-50 text-orange-700'}`}>{t((d as any).verification_status)}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreview(d)}><Eye className="h-4 w-4"/></Button>
                                        {(d as any).verification_status === 'pending' && (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleApprove(d.id)}><CheckCircle2 className="h-4 w-4"/></Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setRejectId(d.id)}><XCircle className="h-4 w-4"/></Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {rejectId === d.id && (
                                    <div className="flex gap-2 mt-2 items-center animate-in fade-in slide-in-from-top-1">
                                        <Input placeholder={t('reject_reason') || "Reason..."} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="h-8 text-xs"/>
                                        <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700" onClick={handleReject}>{t('confirm')}</Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setRejectId(null)}>{t('cancel')}</Button>
                                    </div>
                                )}
                            </div>
                        )) : <p className="text-sm text-gray-500 text-center py-4">{t('no_documents')}</p>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload}/>
                    <Button variant="outline" className="w-full mt-2 border-dashed" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/> {t('upload_document')}</Button>
                </DialogContent>
            </Dialog>
            <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
                <DialogContent className="max-w-5xl h-[80vh]">
                    <iframe src={`/storage/${preview?.document_path}`} className="w-full h-full rounded border bg-gray-50"/>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ======================================================
   3. FACE MODAL
====================================================== */
function FaceEnrollmentDialog({ open, onOpenChange, user, onSuccess }: any) {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const startCamera = async () => {
        stopCamera(); setImage(null); setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if(videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => videoRef.current?.play();
            }
        } catch (e) { setError(t('camera_error')); }
    };

    const capture = () => {
        if(videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                setImage(canvas.toDataURL('image/jpeg', 0.9));
                stopCamera();
            }
        }
    };

    useEffect(() => { if(open) startCamera(); return stopCamera; }, [open]);

    const handleSubmit = async () => {
        if(!image || !user) return;
        setLoading(true); setError('');
        try {
            const action = user.faceEmbedding ? userService.reEnrollFace : userService.enrollFace;
            await action(user.id, image);
            setSuccess(t('enrollment_success')); onSuccess(); setTimeout(() => onOpenChange(false), 1000);
        } catch (e: any) { setError(e.response?.data?.message || t('failed')); } 
        finally { setLoading(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent forceMount className="sm:max-w-md">
                <DialogHeader><DialogTitle>{t('face_enrollment')} {t('for')} {user?.name}</DialogTitle></DialogHeader>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 text-sm">{success}</p>}
                <div className="relative bg-black rounded overflow-hidden aspect-video flex items-center justify-center">
                    {!image ? <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay/> : <img src={image} className="w-full h-full object-cover"/>}
                </div>
                <div className="flex justify-center gap-3 mt-2">
                    {!image ? <Button onClick={capture} className="bg-orange-600"><Camera className="mr-2 h-4 w-4"/> {t('capture_photo')}</Button> : 
                    <><Button onClick={handleSubmit} disabled={loading} className="bg-green-600">{loading ? <Loader2 className="animate-spin"/> : t('submit')}</Button>
                    <Button onClick={() => { setImage(null); startCamera(); }} variant="outline" disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/> {t('retake')}</Button></>}
                    {error && <Button onClick={startCamera} variant="outline">{t('retry')}</Button>}
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>{t('close')}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}