import { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react'; // Added usePage for Inertia props
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from '@/hooks/use-translation'; // Import Translation Hook

// Icons
import { 
    FileText, Download, Filter, Search, MoreVertical, 
    FileSpreadsheet, Calendar as CalendarIcon, 
    RefreshCw, CheckCircle2, XCircle, Clock, 
    BarChart3, ShieldAlert, History, ChevronLeft, ChevronRight,
    File
} from 'lucide-react';

// UI Components
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

import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Charts
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';

// --- Types ---
interface ReportUser { name: string; avatar: string; }
interface ReportData {
    id: string; name: string; type: string; format: string;
    size: string; generated_by: ReportUser; date: string; status: string;
}
interface LogData {
    id: number; action: string; user: string; ip: string; time: string; status: string;
}
interface Props {
    reports: ReportData[];
    logs: LogData[];
    chartData: any[];
    stats: { total_generated: number; processing: number; failed: number };
}

// --- Sub-Components ---

const FileIcon = ({ format }: { format: string }) => {
    switch (format) {
        case 'PDF': return <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-sm"><FileText size={18} /></div>;
        case 'Excel': return <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 border border-green-100 flex items-center justify-center shadow-sm"><FileSpreadsheet size={18} /></div>;
        case 'CSV': return <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm"><File size={18} /></div>;
        default: return <div className="h-9 w-9 rounded-lg bg-gray-50 text-gray-600 border border-gray-100 flex items-center justify-center shadow-sm"><FileText size={18} /></div>;
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    const styles: Record<string, string> = {
        'Ready': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Success': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Processing': 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
        'Failed': 'bg-red-50 text-red-700 border-red-200',
        'Error': 'bg-red-50 text-red-700 border-red-200',
        'Warning': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
        <Badge variant="outline" className={cn("font-medium px-2.5 py-0.5 border", styles[status] || 'bg-gray-100 text-gray-700')}>
            {status === 'Processing' && <RefreshCw size={10} className="mr-1 animate-spin" />}
            {t(status.toLowerCase())}
        </Badge>
    );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-3 border border-gray-100 dark:border-zinc-800 shadow-xl rounded-lg text-xs">
                <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
                <div className="flex flex-col gap-1">
                    <p className="text-blue-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span> Generated: <span className="font-bold">{payload[0].value}</span>
                    </p>
                    <p className="text-purple-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span> Downloaded: <span className="font-bold">{payload[1].value}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// --- Main Page ---

export default function ReportsIndex({ reports, logs, chartData, stats }: Props) {
    const { t } = useTranslation();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState("");
    
const handleDownload = (reportId: string) => {
    // Direct browser navigation triggers the download without unloading the Inertia app context
    window.location.href = `/admin/reports/${reportId}/download`;
};

    return (
        <AppLayout breadcrumbs={[{ title: t('dashboard'), href: '/dashboard' }, { title: t('reports_logs'), href: '/reports' }]}>
            <Head title={t('reports_logs')} />

            <div className="flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 dark:bg-zinc-950 min-h-screen font-sans">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('system_reports')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('reports_desc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm">
                            <History className="mr-2 h-4 w-4 text-gray-500" /> {t('audit_trail')}
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 text-white">
                            <FileText className="mr-2 h-4 w-4" /> {t('generate_report')}
                        </Button>
                    </div>
                </div>

                {/* KPI & Chart Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* KPI Column */}
                    <div className="space-y-4 lg:col-span-1">
                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">{t('total_generated')}</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="h-4 w-4" /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_generated}</div>
                                <p className="text-xs text-green-600 flex items-center mt-1"><BarChart3 size={12} className="mr-1"/> +12% {t('from_last_month')}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">{t('processing_queue')}</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><RefreshCw className="h-4 w-4 animate-spin" /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processing}</div>
                                <p className="text-xs text-gray-500 mt-1">{t('est_completion')}: ~2 mins</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">{t('failed_reports')}</CardTitle>
                                <div className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><ShieldAlert className="h-4 w-4" /></div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</div>
                                <p className="text-xs text-red-500 mt-1 font-medium">{t('action_required')}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Column */}
                    <Card className="lg:col-span-2 bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800 flex flex-col">
                        <CardHeader>
                            <CardTitle>{t('usage_analytics')}</CardTitle>
                            <CardDescription>{t('usage_desc')}</CardDescription>
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
                                    <FileText size={14}/> {t('generated_reports')}
                                </TabsTrigger>
                                <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                                    <History size={14}/> {t('system_logs')}
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                                <div className="relative min-w-[200px] lg:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input 
                                        placeholder={t('search_placeholder')} 
                                        className="pl-9 h-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 border-dashed text-gray-600 bg-white">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "MMM dd") : t('date')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>

                                <Select defaultValue="all">
                                    <SelectTrigger className="w-[130px] h-9 border-dashed bg-white text-gray-600">
                                        <SelectValue placeholder={t('status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all_status')}</SelectItem>
                                        <SelectItem value="ready">{t('ready')}</SelectItem>
                                        <SelectItem value="failed">{t('failed')}</SelectItem>
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
                                            <th className="px-6 py-3 font-medium">{t('report_name')}</th>
                                            <th className="px-6 py-3 font-medium">{t('generated_by')}</th>
                                            <th className="px-6 py-3 font-medium">{t('date')}</th>
                                            <th className="px-6 py-3 font-medium">{t('format')}</th>
                                            <th className="px-6 py-3 font-medium">{t('status')}</th>
                                            <th className="px-6 py-3 font-medium text-right">{t('action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {reports.map((report) => (
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
                                                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                           <DropdownMenuItem 
                                                                className="cursor-pointer" 
                                                                onClick={() => handleDownload(report.id)}
                                                            >
                                                                <Download className="mr-2 h-4 w-4" /> {t('download_file')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer">
                                                                <RefreshCw className="mr-2 h-4 w-4" /> {t('regenerate')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                                                                {t('delete_report')}
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
                                            <th className="px-6 py-3 font-medium">{t('status')}</th>
                                            <th className="px-6 py-3 font-medium">{t('event')}</th>
                                            <th className="px-6 py-3 font-medium">{t('user')}</th>
                                            <th className="px-6 py-3 font-medium">{t('ip_address')}</th>
                                            <th className="px-6 py-3 font-medium">{t('timestamp')}</th>
                                            <th className="px-6 py-3 font-medium text-right">{t('metadata')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {logs.map((log) => (
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
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs">{t('view_json')}</Button>
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
                            {t('showing')} <span className="font-medium text-gray-900">1</span> {t('to')} <span className="font-medium text-gray-900">{Math.min(10, stats.total_generated)}</span> {t('of')} <span className="font-medium text-gray-900">{stats.total_generated}</span> {t('entries')}
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