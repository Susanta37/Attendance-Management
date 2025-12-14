import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// Icons
import { 
    FileText, Download, Filter, Search, MoreVertical, 
    FileSpreadsheet, Calendar as CalendarIcon, 
    RefreshCw, CheckCircle2, XCircle, Clock, 
    BarChart3, ShieldAlert, History, ChevronLeft, ChevronRight,
    File
} from 'lucide-react';

// UI Components (Assumes standard Shadcn setup)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Utilities
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Charts
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    TooltipProps
} from 'recharts';

// --- Types ---

interface ReportUser {
    name: string;
    avatar: string;
}

interface ReportData {
    id: string;
    name: string;
    type: 'Attendance' | 'Security' | 'Payroll' | 'Device';
    format: 'PDF' | 'Excel' | 'CSV';
    size: string;
    generated_by: ReportUser;
    date: string; // ISO string or formatted string
    status: 'Ready' | 'Processing' | 'Failed';
}

interface LogData {
    id: number;
    action: string;
    user: string;
    ip: string;
    time: string;
    status: 'Success' | 'Warning' | 'Error';
}

// --- Mock Data ---

const chartData = [
    { name: 'Mon', generated: 45, downloads: 30 },
    { name: 'Tue', generated: 52, downloads: 38 },
    { name: 'Wed', generated: 38, downloads: 45 },
    { name: 'Thu', generated: 65, downloads: 50 },
    { name: 'Fri', generated: 48, downloads: 40 },
    { name: 'Sat', generated: 25, downloads: 15 },
    { name: 'Sun', generated: 15, downloads: 8 },
];

const reportsData: ReportData[] = [
    { 
        id: 'RPT-001', 
        name: 'Monthly Attendance Summary - Khurda', 
        type: 'Attendance', 
        format: 'PDF', 
        size: '2.4 MB', 
        generated_by: { name: 'Rajesh Kumar', avatar: 'RK' }, 
        date: '2025-12-13 10:30 AM', 
        status: 'Ready' 
    },
    { 
        id: 'RPT-002', 
        name: 'Geofence Violation Report', 
        type: 'Security', 
        format: 'Excel', 
        size: '856 KB', 
        generated_by: { name: 'System Admin', avatar: 'SA' }, 
        date: '2025-12-12 06:15 PM', 
        status: 'Ready' 
    },
    { 
        id: 'RPT-003', 
        name: 'Payroll Export (Nov 2025)', 
        type: 'Payroll', 
        format: 'CSV', 
        size: '--', 
        generated_by: { name: 'Finance Dept', avatar: 'FD' }, 
        date: '2025-12-13 11:00 AM', 
        status: 'Processing' 
    },
    { 
        id: 'RPT-004', 
        name: 'Device Battery Health Log', 
        type: 'Device', 
        format: 'Excel', 
        size: '--', 
        generated_by: { name: 'System', avatar: 'SY' }, 
        date: '2025-12-13 09:00 AM', 
        status: 'Failed' 
    },
];

const logsData: LogData[] = [
    { id: 1, action: 'User Login', user: 'Priya Das', ip: '192.168.1.45', time: '10 mins ago', status: 'Success' },
    { id: 2, action: 'Geofence Update', user: 'Admin', ip: '10.0.0.12', time: '1 hour ago', status: 'Success' },
    { id: 3, action: 'Failed Login Attempt', user: 'Unknown', ip: '45.22.12.11', time: '2 hours ago', status: 'Warning' },
    { id: 4, action: 'Report Generated', user: 'Rajesh Kumar', ip: '192.168.1.10', time: '3 hours ago', status: 'Success' },
    { id: 5, action: 'API Key Revoked', user: 'System', ip: '127.0.0.1', time: '5 hours ago', status: 'Error' },
];

// --- Sub-Components ---

const FileIcon = ({ format }: { format: string }) => {
    switch (format) {
        case 'PDF':
            return <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-sm"><FileText size={18} /></div>;
        case 'Excel':
            return <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 border border-green-100 flex items-center justify-center shadow-sm"><FileSpreadsheet size={18} /></div>;
        case 'CSV':
            return <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm"><File size={18} /></div>;
        default:
            return <div className="h-9 w-9 rounded-lg bg-gray-50 text-gray-600 border border-gray-100 flex items-center justify-center shadow-sm"><FileText size={18} /></div>;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'Ready': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        'Success': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        'Processing': 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
        'Failed': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        'Error': 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
        'Warning': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    };
    return (
        <Badge variant="outline" className={cn("font-medium px-2.5 py-0.5 border", styles[status] || 'bg-gray-100 text-gray-700')}>
            {status === 'Processing' && <RefreshCw size={10} className="mr-1 animate-spin" />}
            {status}
        </Badge>
    );
};

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-3 border border-gray-100 dark:border-zinc-800 shadow-xl rounded-lg text-xs">
                <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
                <div className="flex flex-col gap-1">
                    <p className="text-blue-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Generated: <span className="font-bold">{payload[0].value}</span>
                    </p>
                    <p className="text-purple-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        Downloaded: <span className="font-bold">{payload[1].value}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// --- Main Page Component ---

export default function ReportsIndex() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Reports & Logs', href: '/reports' }]}>
            <Head title="Reports & Logs" />

            <div className="flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 dark:bg-zinc-950 min-h-screen font-sans">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">System Reports</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage data exports, download history, and system audit logs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm">
                            <History className="mr-2 h-4 w-4 text-gray-500" /> Audit Trail
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white">
                            <FileText className="mr-2 h-4 w-4" /> Generate Report
                        </Button>
                    </div>
                </div>

                {/* KPI & Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* KPI Column */}
                    <div className="space-y-4 lg:col-span-1">
                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Total Generated</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <FileText className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">1,284</div>
                                <p className="text-xs text-green-600 flex items-center mt-1">
                                    <BarChart3 size={12} className="mr-1"/> +12% from last month
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Processing Queue</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">3</div>
                                <p className="text-xs text-gray-500 mt-1">Est. completion: ~2 mins</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Failed Reports</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                                    <ShieldAlert className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
                                <p className="text-xs text-red-500 mt-1 font-medium">Action required</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Column */}
                    <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800 flex flex-col">
                        <CardHeader>
                            <CardTitle>Usage Analytics</CardTitle>
                            <CardDescription>Generated reports vs Downloads (Last 7 Days)</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[250px] pl-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorGenerated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="generated" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorGenerated)" />
                                    <Area type="monotone" dataKey="downloads" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800 flex flex-col">
                    <Tabs defaultValue="generated" className="w-full">
                        
                        {/* Toolbar */}
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col xl:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50">
                            <TabsList className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                                <TabsTrigger value="generated" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                                    <FileText size={14}/> Generated Reports
                                </TabsTrigger>
                                <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                                    <History size={14}/> System Logs
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                                <div className="relative min-w-[200px] lg:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder="Search by name or user..." 
                                        className="pl-9 h-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 border-dashed text-gray-600 bg-white">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "MMM dd") : "Date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>

                                <Select defaultValue="all">
                                    <SelectTrigger className="w-[130px] h-9 border-dashed bg-white text-gray-600">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="ready">Ready</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-blue-600">
                                    <Filter size={16} />
                                </Button>
                            </div>
                        </div>

                        {/* --- TAB 1: Generated Reports --- */}
                        <TabsContent value="generated" className="m-0">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Report Name</th>
                                            <th className="px-6 py-3 font-medium">Generated By</th>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium">Format</th>
                                            <th className="px-6 py-3 font-medium">Status</th>
                                            <th className="px-6 py-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {reportsData.map((report) => (
                                            <tr key={report.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <FileIcon format={report.format} />
                                                        <div>
                                                            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 transition-colors">
                                                                {report.name}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                                {report.size !== '--' && <span className="bg-gray-100 px-1.5 rounded text-[10px]">{report.size}</span>}
                                                                <span>• {report.type}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6 border border-gray-200">
                                                            <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-700">
                                                                {report.generated_by.avatar}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{report.generated_by.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{report.date}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="secondary" className="font-normal bg-gray-100 text-gray-600 hover:bg-gray-200">
                                                        {report.format}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={report.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
                                                                <MoreVertical size={16} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <Download className="mr-2 h-4 w-4" /> Download File
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                                                                Delete Report
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>

                        {/* --- TAB 2: System Logs --- */}
                        <TabsContent value="logs" className="m-0">
                            <div className="overflow-x-auto min-h-[400px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Status</th>
                                            <th className="px-6 py-3 font-medium">Event</th>
                                            <th className="px-6 py-3 font-medium">User</th>
                                            <th className="px-6 py-3 font-medium">IP Address</th>
                                            <th className="px-6 py-3 font-medium">Timestamp</th>
                                            <th className="px-6 py-3 font-medium text-right">Metadata</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {logsData.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition">
                                                <td className="px-6 py-4">
                                                    {log.status === 'Success' && <CheckCircle2 size={18} className="text-emerald-500" />}
                                                    {log.status === 'Warning' && <ShieldAlert size={18} className="text-amber-500" />}
                                                    {log.status === 'Error' && <XCircle size={18} className="text-red-500" />}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-gray-900 dark:text-white block">{log.action}</span>
                                                    <span className="text-xs text-gray-500">ID: LOG-{log.id}</span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-700">{log.user}</td>
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
                                                        {log.ip}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={12} /> {log.time}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs">View JSON</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>
                    </Tabs>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-medium text-gray-900">1</span> to <span className="font-medium text-gray-900">10</span> of <span className="font-medium text-gray-900">1,284</span> entries
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                                <ChevronLeft size={14} />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-gray-50">
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}