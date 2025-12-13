import { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
    Users, UserPlus, FileCheck, MapPin, Search, Filter, 
    MoreVertical, Edit, Trash2, Eye, CheckCircle2, XCircle, 
    ShieldAlert, ScanFace, Map as MapIcon, Clock, Upload, FileText,
    ListFilter
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

// --- Mock Data: Odisha Hierarchy ---
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

const kpiStats = [
    { label: 'Total Users', value: '2,405', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active Today', value: '1,850', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending Approval', value: '12', icon: FileCheck, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'GPS Violations', value: '5', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
];

const mockUsers = [
    { 
        id: 1, name: 'Rajesh Kumar', email: 'rajesh.k@gov.in', role: 'Block Admin', 
        location: { dist: 'Khurda', block: 'Bhubaneswar', gp: 'Chandaka', pin: '751024' },
        status: 'Active', settings: { face: true, gps: true, live: true },
        docs: { status: 'Approved', count: 3 }
    },
    { 
        id: 2, name: 'Priya Das', email: 'priya.d@gov.in', role: 'Field Officer', 
        location: { dist: 'Cuttack', block: 'Banki', gp: 'Anuary', pin: '754008' },
        status: 'Active', settings: { face: true, gps: false, live: true },
        docs: { status: 'Pending', count: 1 }
    },
    { 
        id: 3, name: 'Amit Nayak', email: 'amit.n@gov.in', role: 'Clerk', 
        location: { dist: 'Khurda', block: 'Jatni', gp: 'Gangapada', pin: '752050' },
        status: 'Inactive', settings: { face: false, gps: false, live: false },
        docs: { status: 'Rejected', count: 2 }
    },
];

export default function UserManagement() {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDocOpen, setIsDocOpen] = useState(false);

    // Filter States
    const [filterDist, setFilterDist] = useState('');
    const [filterBlock, setFilterBlock] = useState('');
    const [filterGP, setFilterGP] = useState('');

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'User Management', href: '/admin/users' }]}>
            <Head title="User Management" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950">
                
                {/* --- 1. KPI Stats --- */}
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

                        {/* District Filter */}
                        <Select onValueChange={(val) => { setFilterDist(val); setFilterBlock(''); setFilterGP(''); }}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="District" /></SelectTrigger>
                            <SelectContent>
                                {Object.keys(odishaHierarchy).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Block Filter (Dependent) */}
                        <Select onValueChange={(val) => { setFilterBlock(val); setFilterGP(''); }} disabled={!filterDist}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="Block" /></SelectTrigger>
                            <SelectContent>
                                {filterDist && odishaHierarchy[filterDist]?.blocks.map((b: string) => (
                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* GP Filter (Dependent) */}
                        <Select onValueChange={setFilterGP} disabled={!filterBlock}>
                            <SelectTrigger className="w-full md:w-[140px] h-9 bg-white dark:bg-zinc-950"><SelectValue placeholder="GP" /></SelectTrigger>
                            <SelectContent>
                                {filterDist && filterBlock && odishaHierarchy[filterDist]?.gps[filterBlock]?.map((g: string) => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input placeholder="Search name, email or phone..." className="pl-9 h-9 bg-white dark:bg-zinc-950" />
                        </div>
                    </div>

                    <Button onClick={() => { setSelectedUser(null); setIsCreateOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 w-full xl:w-auto">
                        <UserPlus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                </div>

                {/* --- 3. Users Table --- */}
                <Card className="flex-1 rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4">User Details</th>
                                    <th className="px-6 py-4">Role & Location</th>
                                    <th className="px-6 py-4">Security</th>
                                    <th className="px-6 py-4">Docs</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                {mockUsers.map((user) => (
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
                                            <div className="font-medium text-gray-700 dark:text-gray-300">{user.role}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} className="text-orange-500" /> 
                                                {`${user.location.dist} > ${user.location.block}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <FeatureIcon active={user.settings.face} icon={ScanFace} tooltip="Face ID" />
                                                <FeatureIcon active={user.settings.gps} icon={MapIcon} tooltip="GPS Check" />
                                                <FeatureIcon active={user.settings.live} icon={Clock} tooltip="Live Track" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => { setSelectedUser(user); setIsDocOpen(true); }}
                                                className={`h-6 px-2 text-[10px] uppercase font-bold tracking-wide border ${
                                                    user.docs.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    user.docs.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}
                                            >
                                                {user.docs.status}
                                            </Button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}>
                                                {user.status}
                                            </Badge>
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
                                                    <DropdownMenuItem className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>

            {/* --- Modals --- */}
            <UserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} user={selectedUser} />
            <DocumentDialog open={isDocOpen} onOpenChange={setIsDocOpen} user={selectedUser} />

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

// --- 4. User Create/Edit Modal (Updated with Location Fields) ---
function UserDialog({ open, onOpenChange, user }: any) {
    // Form State for Cascading Dropdowns inside Modal
    const [dist, setDist] = useState(user?.location?.dist || '');
    const [block, setBlock] = useState(user?.location?.block || '');
    const [gp, setGp] = useState(user?.location?.gp || '');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 bg-white dark:bg-zinc-950">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle>{user ? 'Edit User Profile' : 'Create New User'}</DialogTitle>
                    <DialogDescription>Enter personal details, assign location, and configure security.</DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        
                        {/* Section: Basic Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input defaultValue={user?.name} placeholder="e.g. Rajesh Kumar" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input defaultValue={user?.phone} placeholder="+91 99999 99999" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Email Address</Label>
                                    <Input defaultValue={user?.email} type="email" placeholder="user@gov.in" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Location & Role (Updated) */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role & Location Assignment</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select defaultValue={user ? 'block_admin' : ''}>
                                        <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="collector">District Collector</SelectItem>
                                            <SelectItem value="block_admin">Block Admin</SelectItem>
                                            <SelectItem value="employee">Field Employee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Select defaultValue="health">
                                        <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="health">Health Dept</SelectItem>
                                            <SelectItem value="edu">Education</SelectItem>
                                            <SelectItem value="rd">Rural Dev</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cascading Location Dropdowns */}
                                <div className="space-y-2">
                                    <Label>District</Label>
                                    <Select onValueChange={(val) => { setDist(val); setBlock(''); setGp(''); }} defaultValue={dist}>
                                        <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(odishaHierarchy).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Block</Label>
                                    <Select onValueChange={(val) => { setBlock(val); setGp(''); }} disabled={!dist} defaultValue={block}>
                                        <SelectTrigger><SelectValue placeholder="Select Block" /></SelectTrigger>
                                        <SelectContent>
                                            {dist && odishaHierarchy[dist]?.blocks.map((b: string) => (
                                                <SelectItem key={b} value={b}>{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Gram Panchayat (GP)</Label>
                                    <Select onValueChange={setGp} disabled={!block} defaultValue={gp}>
                                        <SelectTrigger><SelectValue placeholder="Select GP" /></SelectTrigger>
                                        <SelectContent>
                                            {dist && block && odishaHierarchy[dist]?.gps[block]?.map((g: string) => (
                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Pincode</Label>
                                    <Input defaultValue={user?.location?.pin} placeholder="75XXXX" type="number" maxLength={6} />
                                </div>
                            </div>
                        </div>

                        {/* Section: Security */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Security & Permissions</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label className="text-xs">Face Verification</Label>
                                    <Switch defaultChecked={user?.settings?.face ?? true} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label className="text-xs">GPS Spoof Check</Label>
                                    <Switch defaultChecked={user?.settings?.gps ?? true} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label className="text-xs">Live Tracking</Label>
                                    <Switch defaultChecked={user?.settings?.live ?? false} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label className="text-xs">Allow Outside Geo</Label>
                                    <Switch defaultChecked={false} />
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- 5. Document Approval Modal (Unchanged from previous logic, just kept for completeness) ---
function DocumentDialog({ open, onOpenChange, user }: any) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950">
                <DialogHeader>
                    <DialogTitle>Document Verification</DialogTitle>
                    <DialogDescription>Review documents uploaded by {user?.name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-zinc-900">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded flex items-center justify-center"><FileText size={20} /></div>
                            <div><p className="text-sm font-medium">Aadhaar Card.pdf</p><p className="text-xs text-muted-foreground">Uploaded 2 days ago</p></div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" title="View"><Eye size={16} /></Button>
                            <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-50"><CheckCircle2 size={16} /></Button>
                            <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-50"><XCircle size={16} /></Button>
                        </div>
                    </div>
                    <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer transition">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload new document</p>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
}