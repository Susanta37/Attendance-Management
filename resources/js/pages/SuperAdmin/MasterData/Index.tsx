import { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from '@/hooks/use-translation';
import { 
    Users, Building2, Settings2, Plus, 
    Search, Edit2, Trash2, Smartphone, 
    MapPin, Clock, ScanFace, ChevronRight, Save,
    LockIcon, Loader2, Shield
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
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
interface UserProp {
    id: number; name: string; email: string; role: string; department: string;
    settings?: {
        face_verification_enabled: boolean; gps_spoof_check_enabled: boolean;
        live_tracking_enabled: boolean; shift_start: string; shift_end: string;
        allow_outside_geofence: boolean; multiple_attendance_allowed: boolean;
    };
}
interface DepartmentProp { id: number; name: string; type: string; parent: string | null; users_count: number; }
interface RoleProp { id: number; name: string; permissions_count: number; }

interface Props {
    users: UserProp[];
    departments: DepartmentProp[];
    roles: RoleProp[];
}

// --- Gradient Button Class ---
const gradientBtnClass = "bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white shadow-md border-0";

// --- MODALS ---

// 1. User Settings Modal
function UserConfigModal({ user, isOpen, onClose }: { user: any, isOpen: boolean, onClose: () => void }) {
    const { t } = useTranslation();
    if (!user || !user.settings) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-950 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{t('user_config')}: {user.name}</DialogTitle>
                    <DialogDescription>{t('manage_security_shifts')}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2 text-blue-600"><LockIcon size={16} /> {t('security_protocols')}</h4>
                        <div className="flex items-center justify-between border dark:border-zinc-800 p-3 rounded-lg">
                            <div className="space-y-0.5"><Label className="dark:text-gray-200">{t('face_verification')}</Label><p className="text-xs text-gray-500">{t('require_selfie')}</p></div>
                            <Switch checked={user.settings.face_verification_enabled} />
                        </div>
                        <div className="flex items-center justify-between border dark:border-zinc-800 p-3 rounded-lg">
                            <div className="space-y-0.5"><Label className="dark:text-gray-200">{t('gps_spoof_check')}</Label><p className="text-xs text-gray-500">{t('detect_mock_location')}</p></div>
                            <Switch checked={user.settings.gps_spoof_check_enabled} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2 text-orange-600"><Settings2 size={16} /> {t('operations')}</h4>
                        <div className="flex items-center justify-between border dark:border-zinc-800 p-3 rounded-lg">
                            <div className="space-y-0.5"><Label className="dark:text-gray-200">{t('live_tracking')}</Label><p className="text-xs text-gray-500">{t('track_movement')}</p></div>
                            <Switch checked={user.settings.live_tracking_enabled} />
                        </div>
                         <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-2">
                                <Label className="text-xs dark:text-gray-300">{t('shift_start')}</Label>
                                <Input type="time" defaultValue={user.settings.shift_start} className="dark:bg-zinc-900 dark:border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs dark:text-gray-300">{t('shift_end')}</Label>
                                <Input type="time" defaultValue={user.settings.shift_end} className="dark:bg-zinc-900 dark:border-zinc-700" />
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="dark:bg-zinc-900 dark:text-white">{t('cancel')}</Button>
                    <Button className={gradientBtnClass}><Save className="mr-2 h-4 w-4" /> {t('save_config')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// 2. Add Department Modal
function AddDepartmentModal({ isOpen, onClose, existingDepartments }: { isOpen: boolean, onClose: () => void, existingDepartments: DepartmentProp[] }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '', type: 'Block', parent_id: '',
    });
    const [parentOptions, setParentOptions] = useState<DepartmentProp[]>([]);

    useEffect(() => {
        if(data.type === 'District') setParentOptions(existingDepartments.filter(d => d.type === 'State'));
        else if(data.type === 'Block') setParentOptions(existingDepartments.filter(d => d.type === 'District'));
        else if(data.type === 'GP') setParentOptions(existingDepartments.filter(d => d.type === 'Block'));
        else setParentOptions([]);
    }, [data.type, existingDepartments]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/departments', { onSuccess: () => { reset(); onClose(); } });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{t('add_new_department')}</DialogTitle>
                    <DialogDescription>{t('create_dept_desc')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('department_name')}</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Finance Dept" className="dark:bg-zinc-900 dark:border-zinc-700"/>
                        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('department_type')}</Label>
                        <Select onValueChange={val => setData('type', val)} defaultValue={data.type}>
                            <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-700"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['State','District','Block','GP'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {data.type !== 'State' && (
                        <div className="space-y-2">
                            <Label className="dark:text-gray-200">{t('parent_department')}</Label>
                            <Select onValueChange={val => setData('parent_id', val)}>
                                <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-700"><SelectValue placeholder={t('select_parent')} /></SelectTrigger>
                                <SelectContent>
                                    {parentOptions.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="dark:bg-zinc-900 dark:text-white">{t('cancel')}</Button>
                        <Button type="submit" disabled={processing} className={gradientBtnClass}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{t('create')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// 3. Add User Modal
function AddUserModal({ isOpen, onClose, departments, roles }: { isOpen: boolean, onClose: () => void, departments: DepartmentProp[], roles: RoleProp[] }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '', email: '', password: '', role_id: '', department_id: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/users-create', { onSuccess: () => { reset(); onClose(); } });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{t('add_new_user')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('full_name')}</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-700"/>
                        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('email')}</Label>
                        <Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-700"/>
                        {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('password')}</Label>
                        <Input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="dark:bg-zinc-900 dark:border-zinc-700"/>
                        {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="dark:text-gray-200">{t('role')}</Label>
                            <Select onValueChange={val => setData('role_id', val)}>
                                <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-700"><SelectValue placeholder={t('select_role')} /></SelectTrigger>
                                <SelectContent>{roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}</SelectContent>
                            </Select>
                            {errors.role_id && <p className="text-red-500 text-xs">{errors.role_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-gray-200">{t('department')}</Label>
                            <Select onValueChange={val => setData('department_id', val)}>
                                <SelectTrigger className="dark:bg-zinc-900 dark:border-zinc-700"><SelectValue placeholder={t('select_dept')} /></SelectTrigger>
                                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                            </Select>
                            {errors.department_id && <p className="text-red-500 text-xs">{errors.department_id}</p>}
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="dark:bg-zinc-900 dark:text-white">{t('cancel')}</Button>
                        <Button type="submit" disabled={processing} className={gradientBtnClass}>{t('create')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// 4. Add Role Modal
function AddRoleModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, reset, errors } = useForm({ name: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/roles', { onSuccess: () => { reset(); onClose(); } });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 dark:border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-white">{t('create_new_role')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="dark:text-gray-200">{t('role_name')}</Label>
                        <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Area Manager" className="dark:bg-zinc-900 dark:border-zinc-700"/>
                        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="dark:bg-zinc-900 dark:text-white">{t('cancel')}</Button>
                        <Button type="submit" disabled={processing} className={gradientBtnClass}>{t('create')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Page Component ---
export default function MasterDataIndex({ users, departments, roles }: Props) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("users");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    
    // Modal States
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    const [search, setSearch] = useState('');

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase()));
    const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <AppLayout breadcrumbs={[{ title: t('dashboard'), href: '/dashboard' }, { title: t('master_data'), href: '/master-data' }]}>
            <Head title={t('master_data_management')} />

            <div className="flex flex-col gap-6 p-6 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('master_data')}</h1>
                        <p className="text-sm text-gray-500">{t('master_data_subtitle')}</p>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'departments' && (
                            <Button className={gradientBtnClass} onClick={() => setIsDeptModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> {t('add_department')}
                            </Button>
                        )}
                        {activeTab === 'users' && (
                            <Button className={gradientBtnClass} onClick={() => setIsUserModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> {t('add_user')}
                            </Button>
                        )}
                        {activeTab === 'roles' && (
                            <Button className={gradientBtnClass} onClick={() => setIsRoleModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> {t('add_role')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="users" className="w-full space-y-6" onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-1">
                            <TabsTrigger value="users" className="gap-2"><Users size={14}/> {t('users_settings')}</TabsTrigger>
                            <TabsTrigger value="departments" className="gap-2"><Building2 size={14}/> {t('departments')}</TabsTrigger>
                            <TabsTrigger value="roles" className="gap-2"><LockIcon size={14}/> {t('roles_permissions')}</TabsTrigger>
                        </TabsList>
                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input placeholder={t('search_placeholder')} className="pl-9 bg-white dark:bg-zinc-900" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    {/* Tab 1: Users */}
                    <TabsContent value="users" className="space-y-4">
                        <Card className="dark:border-zinc-800 dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle className="dark:text-white">{t('user_directory')}</CardTitle>
                                <CardDescription className="dark:text-gray-400">{t('user_directory_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b dark:border-zinc-800">
                                            <tr>
                                                <th className="px-6 py-3">{t('employee')}</th>
                                                <th className="px-6 py-3">{t('role_dept')}</th>
                                                <th className="px-6 py-3">{t('security_features')}</th>
                                                <th className="px-6 py-3">{t('shift')}</th>
                                                <th className="px-6 py-3 text-right">{t('action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {filteredUsers.length === 0 ? (
                                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">{t('no_data')}</td></tr>
                                            ) : filteredUsers.map((user) => (
                                                <tr key={user.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline" className="w-fit dark:text-gray-300 dark:border-gray-700">{user.role}</Badge>
                                                            <span className="text-xs text-gray-500">{user.department}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {user.settings?.face_verification_enabled && <div title={t('face_verification')} className="p-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"><ScanFace size={14}/></div>}
                                                            {user.settings?.gps_spoof_check_enabled && <div title={t('gps_spoof_check')} className="p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"><MapPin size={14}/></div>}
                                                            {user.settings?.live_tracking_enabled && <div title={t('live_tracking')} className="p-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded"><Smartphone size={14}/></div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs dark:text-gray-300">
                                                        {user.settings?.shift_start} - {user.settings?.shift_end}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => setSelectedUser(user)}>
                                                            <Settings2 size={16} className="mr-2"/> {t('configure')}
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
                        <Card className="dark:border-zinc-800 dark:bg-zinc-900">
                            <CardHeader>
                                <CardTitle className="dark:text-white">{t('dept_hierarchy')}</CardTitle>
                                <CardDescription className="dark:text-gray-400">{t('dept_hierarchy_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b dark:border-zinc-800">
                                            <tr>
                                                <th className="px-6 py-3">{t('department_name')}</th>
                                                <th className="px-6 py-3">{t('type')}</th>
                                                <th className="px-6 py-3">{t('parent_dept')}</th>
                                                <th className="px-6 py-3 text-right">{t('employees')}</th>
                                                <th className="px-6 py-3 text-right">{t('action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                            {filteredDepts.map((dept) => (
                                                <tr key={dept.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900 transition">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 size={16} className="text-gray-400" />
                                                            <span className="font-medium text-gray-900 dark:text-white">{dept.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className="font-normal dark:bg-zinc-800 dark:text-gray-300">{dept.type}</Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {dept.parent ? <div className="flex items-center gap-1"><span className="text-xs">↳</span> {dept.parent}</div> : <span className="text-xs text-gray-400 italic">Root</span>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs dark:text-gray-300">{dept.users_count}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-gray-400"><Edit2 size={14}/></Button>
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

                    {/* --- TAB 3: ROLES --- */}
                    <TabsContent value="roles" className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card className="md:col-span-1 dark:border-zinc-800 dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">{t('defined_roles')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center justify-between p-3 border dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition">
                                            <div>
                                                <div className="font-medium dark:text-white">{role.name}</div>
                                                <div className="text-xs text-gray-500">{role.permissions_count} {t('permissions')}</div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400"/>
                                        </div>
                                    ))}
                                    <Button variant="outline" className="w-full mt-4 border-dashed dark:bg-zinc-900 dark:text-white dark:border-zinc-700" onClick={() => setIsRoleModalOpen(true)}>
                                        <Plus size={16} className="mr-2"/> {t('create_new_role')}
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="md:col-span-2 dark:border-zinc-800 dark:bg-zinc-900">
                                <CardHeader>
                                    <CardTitle className="dark:text-white">{t('permissions_for')}: District Collector</CardTitle>
                                    <CardDescription className="dark:text-gray-400">{t('config_access_rights')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                                        Select a role to view permissions (Mock UI)
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>

            {/* Render All Modals */}
            <UserConfigModal user={selectedUser} isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} />
            <AddDepartmentModal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} existingDepartments={departments} />
            <AddUserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} departments={departments} roles={roles} />
            <AddRoleModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} />
        </AppLayout>
    );
}