import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import GlobalModal from '@/components/GlobalModal';
import axios from 'axios';
import { useTranslation } from '@/hooks/use-translation'; // Import Translation Hook

import {
    Calendar, CheckCircle2, Clock, MapPin, Search,
    AlertTriangle, MoreVertical,
    ShieldCheck, ScanFace, Navigation, Timer, Camera, X
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Map Components
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Types
interface User {
    id: number;
    name: string;
    email: string;
    role: {
        id: number;
        name: string;
        slug: string;
    };
}

interface Attendance {
    id: number;
    user_id: number;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_image: string | null;
    check_out_image: string | null;
    check_in_lat: number | null;
    check_in_lng: number | null;
    check_out_lat: number | null;
    check_out_lng: number | null;
    is_face_matched: boolean;
    is_inside_fence: boolean;
    is_anomaly: boolean;
    distance_from_fence_m: number | null;
    user: User;
}

interface EmployeeLocation {
    id: number;
    lat: number;
    lng: number;
    recorded_at: string;
    speed?: number;
    accuracy?: number;
    battery?: number;
}

interface Props {
    attendances: Attendance[];
    statistics: {
        total_present: number;
        anomalies: number;
        active_staff: number;
        late_arrivals: number | null;
    };
    roles: Array<{ id: number; name: string; slug: string }>;
    users: Array<{ id: number; name: string; email: string }>;
    filters: {
        search?: string;
        role_id?: string;
        user_id?: string;
        date?: string;
    };
}

// --- Sub Components ---

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    const styles: Record<string, string> = {
        'Present': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
        'Late': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
        'Absent': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    };
    // Translate the status key (ensure keys exist in JSON: present, late, absent)
    const translatedStatus = t(status.toLowerCase()) || status;
    return <Badge variant="outline" className={cn(styles[status] || 'bg-gray-100 text-gray-700', "border")}>{translatedStatus}</Badge>;
}

function KpiCard({ title, value, icon, trend, trendUp, bg }: any) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</h3>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg}`}>{icon}</div>
            </div>
            <div className={`mt-4 text-xs font-medium flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend}
            </div>
        </div>
    );
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

// --- Main Page ---

export default function AttendanceIndex({ attendances, statistics, roles, users, filters }: Props) {
    const { t } = useTranslation();
    const [date, setDate] = useState<Date | undefined>(filters.date ? new Date(filters.date) : new Date());
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role_id || 'all');
    const [selectedUser, setSelectedUser] = useState(filters.user_id || 'all');
    
    const [isDark, setIsDark] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
    const [allUserAttendances, setAllUserAttendances] = useState<Attendance[]>([]);
    const [selectedAttendanceIndex, setSelectedAttendanceIndex] = useState(0);
    const [liveLocations, setLiveLocations] = useState<EmployeeLocation[]>([]);
    const [showLiveLocation, setShowLiveLocation] = useState(false);
    const [totalDistance, setTotalDistance] = useState(0);

    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const handleFilterChange = (newFilters: Partial<typeof filters>) => {
        router.get('/admin/attendance', {
            ...filters,
            ...newFilters,
            date: date ? format(date, 'yyyy-MM-dd') : undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        const timeoutId = setTimeout(() => {
            handleFilterChange({ search: value });
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedRole('all');
        setSelectedUser('all');
        setDate(new Date());
        router.get('/admin/attendance', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRowClick = async (record: Attendance) => {
        setSelectedRecord(record);
        setShowLiveLocation(false);
        setLiveLocations([]);

        try {
            const response = await axios.get(`/admin/attendance/${record.user_id}/records`, {
                params: { date: record.date }
            });
            setAllUserAttendances(response.data);
            setSelectedAttendanceIndex(0);
        } catch (error) {
            console.error('Error fetching user attendances:', error);
            setAllUserAttendances([record]);
        }
    };

    const handleLiveLocationClick = async () => {
        if (!selectedRecord) return;
        setShowLiveLocation(true);
        const params = {
            date: selectedRecord.date,
            attendance_id: currentAttendance?.id
        };
        try {
            const response = await axios.get(`/admin/attendance/${selectedRecord.user_id}/live-location`, {
                params: params
            });
            setLiveLocations(response.data.locations);
            setTotalDistance(response.data.total_distance);
        } catch (error) {
            console.error('Error fetching live location:', error);
            setLiveLocations([]);
        }
    };

    const currentAttendance =
        allUserAttendances.length > 0
            ? allUserAttendances[selectedAttendanceIndex]
            : selectedRecord;

    const getImageUrl = (imagePath: string | null) => imagePath;

    const getDisplayImage = (attendance: Attendance) => {
        const imagePath = attendance.check_out_image || attendance.check_in_image;
        return getImageUrl(imagePath);
    };

    const getDisplayCoordinates = (attendance: Attendance) => {
        return {
            lat: attendance.check_out_lat || attendance.check_in_lat,
            lng: attendance.check_out_lng || attendance.check_in_lng
        };
    };

    const getStatus = (attendance: Attendance) => {
        if (attendance.check_in_time) return 'Present';
        return 'Absent';
    };

    const parseTime = (time: string | null, date: string) => {
        if (!time) return null;
        if (time.includes('-')) return new Date(time.replace(' ', 'T'));
        const cleanDate = date.split('T')[0];
        return new Date(`${cleanDate}T${time}`);
    };

    const formatTime = (time: string | null, date: string) => {
        if (!time) return '--:--';
        const parsedDate = parseTime(time, date);
        if (!parsedDate || isNaN(parsedDate.getTime())) return '--:--';
        return parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const tileLayerUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    if (!currentAttendance && selectedRecord) {
        return (
            <AppLayout breadcrumbs={[{ title: t('dashboard'), href: '/dashboard' }, { title: t('attendance'), href: '/attendance' }]}>
                <div className="flex items-center justify-center h-screen text-gray-500">
                    {t('loading_attendance')}
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={[{ title: t('dashboard'), href: '/dashboard' }, { title: t('attendance'), href: '/attendance' }]}>
            <Head title={t('attendance_monitoring')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950 font-sans">

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-4">
                    <KpiCard
                        title={t('present_today')}
                        value={statistics.total_present}
                        icon={<CheckCircle2 className="text-green-600" />}
                        trend={`${Math.round((statistics.total_present / statistics.active_staff) * 100)}% ${t('attendance')}`}
                        trendUp={true}
                        bg="bg-green-50 dark:bg-green-900/20"
                    />
                    <KpiCard
                        title={t('late_arrivals')}
                        value={statistics.late_arrivals || 0}
                        icon={<Clock className="text-yellow-600" />}
                        trend={t('vs_yesterday')}
                        trendUp={false}
                        bg="bg-yellow-50 dark:bg-yellow-900/20"
                    />
                    <KpiCard
                        title={t('anomalies')}
                        value={statistics.anomalies}
                        icon={<AlertTriangle className="text-orange-600" />}
                        trend={t('requires_action')}
                        trendUp={false}
                        bg="bg-orange-50 dark:bg-orange-900/20"
                    />
                    <KpiCard
                        title={t('active_staff')}
                        value={statistics.active_staff}
                        icon={<MapPin className="text-blue-600" />}
                        trend={t('total_users')}
                        trendUp={true}
                        bg="bg-blue-50 dark:bg-blue-900/20"
                    />
                </div>

                {/* Data Table */}
                <Card className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex-1">
                    <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 py-4 px-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Search Filters */}
                            <div className="flex flex-1 items-center gap-3 flex-wrap">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        placeholder={t('search_employee')}
                                        className="pl-9 bg-gray-50 dark:bg-zinc-800 border-none"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                    />
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-[180px] justify-start text-left font-normal bg-white dark:bg-zinc-900">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>{t('pick_date')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                            mode="single"
                                            selected={date}
                                            onSelect={(newDate) => {
                                                setDate(newDate);
                                                handleFilterChange({ date: newDate ? format(newDate, 'yyyy-MM-dd') : undefined });
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Select value={selectedRole} onValueChange={(value) => {
                                    setSelectedRole(value);
                                    handleFilterChange({ role_id: value === 'all' ? undefined : value });
                                }}>
                                    <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder={t('role')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('all_roles')}</SelectItem>
                                        {roles.map(role => <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="bg-white dark:bg-zinc-900"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    {t('clear')}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="overflow-x-auto bg-white dark:bg-zinc-900">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium">{t('employee')}</th>
                                    <th className="px-6 py-4 font-medium">{t('evidence')}</th>
                                    <th className="px-6 py-4 font-medium">{t('location_info')}</th>
                                    <th className="px-6 py-4 font-medium">{t('check_in_out')}</th>
                                    <th className="px-6 py-4 font-medium">{t('verification')}</th>
                                    <th className="px-6 py-4 font-medium">{t('status')}</th>
                                    <th className="px-6 py-4 font-medium text-right">{t('action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            {t('no_records')}
                                        </td>
                                    </tr>
                                ) : attendances.map((record) => {
                                    const coords = getDisplayCoordinates(record);
                                    return (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                                            onClick={() => handleRowClick(record)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-gray-200">
                                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${record.user.name}&background=random`} />
                                                        <AvatarFallback>{record.user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">{record.user.name}</div>
                                                        <div className="text-xs text-gray-500">{record.user.role.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getDisplayImage(record) ? (
                                                    <div className="h-10 w-10 rounded-md overflow-hidden border border-gray-200 shadow-sm group relative">
                                                        <img src={getDisplayImage(record)!} alt="Evidence" className="h-full w-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center">
                                                            <Camera size={12} className="text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-400">{t('no_image')}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                        <MapPin size={12} className="text-blue-500" /> {t('location')}
                                                    </div>
                                                    {coords.lat && coords.lng ? (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-400">{t('no_coords')}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {formatTime(record.check_in_time, record.date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {t('to')} {record.check_out_time ? formatTime(record.check_out_time, record.date) : t('active')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                        {record.is_face_matched ? <ScanFace size={14} className="text-green-500" /> : <ScanFace size={14} className="text-red-500" />}
                                                        {record.is_face_matched ? t('verified') : t('mismatch')}
                                                    </div>
                                                    {record.is_inside_fence
                                                        ? <span className="text-[10px] text-green-600 flex items-center gap-1"><Navigation size={10} /> {t('inside_fence')}</span>
                                                        : <span className="text-[10px] text-red-600 flex items-center gap-1">
                                                            <Navigation size={10} /> {t('outside')} ({record.distance_from_fence_m?.toFixed(0)}m)
                                                        </span>
                                                    }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><StatusBadge status={getStatus(record)} /></td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* --- VERIFICATION MODAL --- */}
                {selectedRecord && currentAttendance && (
                    <GlobalModal
                        isOpen={!!selectedRecord}
                        onClose={() => {
                            setSelectedRecord(null);
                            setAllUserAttendances([]);
                            setLiveLocations([]);
                            setShowLiveLocation(false);
                        }}
                        title={`${t('activity_log')}: ${selectedRecord.user.name}`}
                        description={`${selectedRecord.user.role.name} • ${format(new Date(selectedRecord.date), 'PPP')}`}
                    >
                        {/* LEFT SIDE: Details & Photo */}
                        <div className="w-full lg:w-1/2 bg-gray-50/50 dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto h-full">

                            {/* Multiple Attendance Records List */}
                            {allUserAttendances.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t('attendance_records')} ({allUserAttendances.length})
                                    </label>
                                    <div className="space-y-2">
                                        {allUserAttendances.map((att, index) => (
                                            <div
                                                key={att.id}
                                                onClick={() => {
                                                    setSelectedAttendanceIndex(index);
                                                    setShowLiveLocation(false);
                                                }}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition",
                                                    selectedAttendanceIndex === index
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                                        : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                                                )}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {formatTime(att.check_in_time, att.date)}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {t('to')} {att.check_out_time ? formatTime(att.check_out_time, att.date) : t('active')}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={getStatus(att)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Images Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Check-in Evidence */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('check_in')}</label>
                                    {currentAttendance.check_in_image ? (
                                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-sm relative group bg-black">
                                            <img src={getImageUrl(currentAttendance.check_in_image)!} alt="Check-in" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                                {formatTime(currentAttendance.check_in_time, currentAttendance.date)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video w-full rounded-lg border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-400 bg-white dark:bg-zinc-900">
                                            {t('no_checkin_image')}
                                        </div>
                                    )}
                                </div>

                                {/* Check-out Evidence */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('check_out')}</label>
                                    {currentAttendance.check_out_image ? (
                                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-sm relative group bg-black">
                                            <img src={getImageUrl(currentAttendance.check_out_image)!} alt="Check-out" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                                {formatTime(currentAttendance.check_out_time, currentAttendance.date)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video w-full rounded-lg border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-400 bg-white dark:bg-zinc-900">
                                            {currentAttendance.check_out_time ? t('no_checkout_image') : t('active_session')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Duration & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12} /> {t('check_in')}</div>
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        {formatTime(currentAttendance.check_in_time, currentAttendance.date)}
                                    </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Timer size={12} /> {t('check_out')}</div>
                                    <div className="font-bold text-lg text-blue-600">
                                        {currentAttendance.check_out_time ? formatTime(currentAttendance.check_out_time, currentAttendance.date) : t('active')}
                                    </div>
                                </div>
                            </div>

                            {/* Verification Stats */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-500" /> {t('verification')}
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border rounded-lg dark:border-zinc-800">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <Navigation size={16} className={currentAttendance.is_inside_fence ? "text-green-500" : "text-red-500"} />
                                        {t('geofence_status')}
                                    </span>
                                    <div className="text-right">
                                        <Badge variant="secondary" className={currentAttendance.is_inside_fence ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}>
                                            {currentAttendance.is_inside_fence ? t('inside') : `${t('outside')} (${currentAttendance.distance_from_fence_m?.toFixed(0)}m)`}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Live Location Button */}
                            <Button
                                variant="default"
                                className="w-full"
                                onClick={handleLiveLocationClick}
                            >
                                <MapPin className="mr-2 h-4 w-4" />
                                {showLiveLocation ? t('showing_live_location') : t('view_live_location')}
                            </Button>

                            {/* Live Location List */}
                            {showLiveLocation && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {t('location_pings')} ({liveLocations.length})
                                    </label>
                                    {liveLocations.length === 0 ? (
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400">
                                            <p className="font-medium">{t('no_location_data')}</p>
                                            <p className="mt-1 text-yellow-600 dark:text-yellow-500">{t('no_tracking_data_msg')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 max-h-60 overflow-y-auto">
                                            {liveLocations.map((loc, index) => (
                                                <div
                                                    key={loc.id}
                                                    className="p-2 bg-white dark:bg-zinc-900 rounded border text-xs hover:bg-gray-50 dark:hover:bg-zinc-800"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium">{new Date(loc.recorded_at).toLocaleTimeString()}</div>
                                                            <div className="text-gray-500">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {index === 0 && <span className="text-green-600 font-bold">●</span>}
                                                            {index === liveLocations.length - 1 && index !== 0 && <span className="text-red-600 font-bold">●</span>}
                                                            {index !== 0 && index !== liveLocations.length - 1 && <span className="text-blue-600 font-bold">●</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDE: Interactive Map */}
                        <div className="w-full lg:w-1/2 relative bg-gray-100 dark:bg-zinc-900 h-[400px] lg:h-full">
                            {(() => {
                                const hasAttendanceCoords =
                                    !!currentAttendance &&
                                    currentAttendance.check_in_lat !== null &&
                                    currentAttendance.check_in_lng !== null;

                                const mapMode =
                                    showLiveLocation && liveLocations.length > 0
                                        ? 'LIVE'
                                        : hasAttendanceCoords
                                            ? 'ATTENDANCE'
                                            : 'EMPTY';

                                if (mapMode === 'EMPTY') {
                                    if (showLiveLocation) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                                <MapPin size={48} className="mb-4 text-gray-300" />
                                                <p className="font-medium">{t('no_location_data')}</p>
                                                <p className="text-sm text-gray-500 mt-2">{t('no_tracking_data_found')}</p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            {t('no_gps_data')}
                                        </div>
                                    );
                                }

                                const center: [number, number] =
                                    mapMode === 'LIVE'
                                        ? [liveLocations[0].lat, liveLocations[0].lng]
                                        : [
                                            currentAttendance!.check_in_lat as number,
                                            currentAttendance!.check_in_lng as number
                                        ];

                                return (
                                    <MapContainer
                                        key={mapMode + (isDark ? 'dark' : 'light')}
                                        center={center}
                                        zoom={10}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url={tileLayerUrl} />
                                        <MapResizer />

                                        {/* LIVE LOCATION MODE */}
                                        {mapMode === 'LIVE' && (
                                            <>
                                                {liveLocations.length > 1 && (
                                                    <Polyline
                                                        positions={liveLocations.map(loc => [loc.lat, loc.lng])}
                                                        pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }}
                                                    />
                                                )}
                                                {liveLocations.map((loc, index) => {
                                                    const isStart = index === 0;
                                                    const isEnd = index === liveLocations.length - 1;
                                                    const markerIcon = new L.DivIcon({
                                                        className: 'custom-marker',
                                                        html: `<div style="background-color: ${isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white;">${isStart ? '🚀' : isEnd ? '🏁' : index + 1}</div>`,
                                                        iconSize: [24, 24],
                                                        iconAnchor: [12, 12],
                                                        popupAnchor: [0, -12]
                                                    });
                                                    return (
                                                        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={markerIcon}>
                                                            <Popup>
                                                                <div className="p-2">
                                                                    <b className="text-sm block mb-1">
                                                                        {index === 0 ? t('start_point') : index === liveLocations.length - 1 ? t('end_point') : `${t('point')} ${index + 1}`}
                                                                    </b>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        <div>Time: {new Date(loc.recorded_at).toLocaleTimeString()}</div>
                                                                    </div>
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {/* ATTENDANCE MODE */}
                                        {mapMode === 'ATTENDANCE' && (
                                            <>
                                                {currentAttendance.check_out_lat && currentAttendance.check_out_lng && (
                                                    <Polyline
                                                        positions={[
                                                            [currentAttendance.check_in_lat!, currentAttendance.check_in_lng!],
                                                            [currentAttendance.check_out_lat, currentAttendance.check_out_lng]
                                                        ]}
                                                        pathOptions={{ color: 'green', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                                                    />
                                                )}
                                                <Marker position={[currentAttendance.check_in_lat!, currentAttendance.check_in_lng!]}>
                                                    <Popup>
                                                        <div className="p-1"><b className="text-sm block mb-1">{t('check_in')}</b></div>
                                                    </Popup>
                                                </Marker>
                                                {currentAttendance.check_out_lat && currentAttendance.check_out_lng && (
                                                    <Marker position={[currentAttendance.check_out_lat, currentAttendance.check_out_lng]}>
                                                        <Popup>
                                                            <div className="p-1"><b className="text-sm block mb-1">{t('check_out')}</b></div>
                                                        </Popup>
                                                    </Marker>
                                                )}
                                            </>
                                        )}
                                    </MapContainer>
                                );
                            })()}

                            {/* Floating Map Info */}
                            {showLiveLocation && totalDistance > 0 && (
                                <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-zinc-950/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-zinc-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{t('total_distance')}</h4>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{totalDistance} km</div>
                                </div>
                            )}
                        </div>
                    </GlobalModal>
                )}
            </div>
        </AppLayout>
    );
}