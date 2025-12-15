import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import GlobalModal from '@/components/GlobalModal';
import axios from 'axios';

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
delete (L.Icon.Default.prototype as any)._getIconUrl;
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
    const styles: Record<string, string> = {
        'Present': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
        'Late': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
        'Absent': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    };
    return <Badge variant="outline" className={cn(styles[status] || 'bg-gray-100 text-gray-700', "border")}>{status}</Badge>;
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

// Helper component to fix Leaflet map size in modal
function MapResizer() {
    const map = useMap();

    useEffect(() => {
        console.log("MapResizer mounted, map instance:", map);
        console.log("Map container size:", map.getSize());

        // Small delay to allow modal animation to complete
        const timer = setTimeout(() => {
            console.log("Calling invalidateSize...");
            map.invalidateSize();
            console.log("After invalidateSize, map size:", map.getSize());
        }, 100);

        return () => clearTimeout(timer);
    }, [map]);

    return null;
}

// --- Main Page ---

export default function AttendanceIndex({ attendances, statistics, roles, users, filters }: Props) {
    const [date, setDate] = useState<Date | undefined>(filters.date ? new Date(filters.date) : new Date());
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role_id || 'all');
    const [selectedUser, setSelectedUser] = useState(filters.user_id || 'all');

    // Modal State
    const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
    const [allUserAttendances, setAllUserAttendances] = useState<Attendance[]>([]);
    const [selectedAttendanceIndex, setSelectedAttendanceIndex] = useState(0);
    const [liveLocations, setLiveLocations] = useState<EmployeeLocation[]>([]);
    const [showLiveLocation, setShowLiveLocation] = useState(false);
    const [totalDistance, setTotalDistance] = useState(0);

    // Handle filter changes
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

    // Debounced search
    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        const timeoutId = setTimeout(() => {
            handleFilterChange({ search: value });
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    // Clear all filters
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

    // Open modal and fetch all attendance records for the user
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

    // Fetch live location data
    const handleLiveLocationClick = async () => {
        if (!selectedRecord) return;

        setShowLiveLocation(true);
        const params = {
            date: selectedRecord.date,
            attendance_id: currentAttendance?.id
        };
        console.log('Fetching live location with params:', params);
        console.log('Selected Record:', selectedRecord);
        console.log('Current Attendance:', currentAttendance);

        try {
            const response = await axios.get(`/admin/attendance/${selectedRecord.user_id}/live-location`, {
                params: params
            });
            console.log('Live location response:', response.data);
            setLiveLocations(response.data.locations);
            setTotalDistance(response.data.total_distance);
        } catch (error) {
            console.error('Error fetching live location:', error);
            setLiveLocations([]);
        }
    };

    // Get current attendance based on selection
    const currentAttendance =
        allUserAttendances.length > 0
            ? allUserAttendances[selectedAttendanceIndex]
            : selectedRecord;


    // Helper to get full image URL (backend now returns full URLs)
    const getImageUrl = (imagePath: string | null) => {
        return imagePath; // Backend returns full URLs with asset() helper
    };

    // Get display image (check_out if exists, else check_in)
    const getDisplayImage = (attendance: Attendance) => {
        const imagePath = attendance.check_out_image || attendance.check_in_image;
        return getImageUrl(imagePath);
    };

    // Get display coordinates
    const getDisplayCoordinates = (attendance: Attendance) => {
        return {
            lat: attendance.check_out_lat || attendance.check_in_lat,
            lng: attendance.check_out_lng || attendance.check_in_lng
        };
    };

    // Determine status
    const getStatus = (attendance: Attendance) => {
        if (attendance.check_in_time) return 'Present';
        return 'Absent';
    };

    // Helper to parse time - backend returns times as H:i:s format (e.g., "19:07:40")
    // AttendanceIndex.tsx
    // In AttendanceIndex.tsx

    // AttendanceIndex.tsx

    // AttendanceIndex.tsx

    const parseTime = (time: string | null, date: string) => {
        if (!time) return null;

        // Case 1: The 'time' string already contains the date (e.g., from our Backend fix)
        // Example: "2025-12-13 19:07:40"
        if (time.includes('-')) {
            return new Date(time.replace(' ', 'T'));
        }

        // Case 2: We need to combine 'date' + 'time'
        // CLEANUP: The 'date' variable might be "2025-12-13T18:30:00.000000Z"
        // We split by 'T' and take the first part to get just "2025-12-13"
        const cleanDate = date.split('T')[0];

        // Combine them safely
        return new Date(`${cleanDate}T${time}`);
    };


    const formatTime = (time: string | null, date: string) => {
        if (!time) return '--:--';
        const parsedDate = parseTime(time, date);
        if (!parsedDate || isNaN(parsedDate.getTime())) return '--:--';
        return parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Early return safety guard - prevent null reference errors
    if (!currentAttendance && selectedRecord) {
        return (
            <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Attendance', href: '/attendance' }]}>
                <div className="flex items-center justify-center h-screen text-gray-500">
                    Loading attendance details…
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Attendance', href: '/attendance' }]}>
            <Head title="Attendance Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950 font-sans">

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-4">
                    <KpiCard
                        title="Present Today"
                        value={statistics.total_present}
                        icon={<CheckCircle2 className="text-green-600" />}
                        trend={`${Math.round((statistics.total_present / statistics.active_staff) * 100)}% Attendance`}
                        trendUp={true}
                        bg="bg-green-50 dark:bg-green-900/20"
                    />
                    <KpiCard
                        title="Late Arrivals"
                        value="148"
                        icon={<Clock className="text-yellow-600" />}
                        trend="+5% vs Yesterday"
                        trendUp={false}
                        bg="bg-yellow-50 dark:bg-yellow-900/20"
                    />
                    <KpiCard
                        title="Anomalies"
                        value={statistics.anomalies}
                        icon={<AlertTriangle className="text-orange-600" />}
                        trend="Requires Action"
                        trendUp={false}
                        bg="bg-orange-50 dark:bg-orange-900/20"
                    />
                    <KpiCard
                        title="Active Staff"
                        value={statistics.active_staff}
                        icon={<MapPin className="text-blue-600" />}
                        trend="Total Users"
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
                                        placeholder="Search Employee..."
                                        className="pl-9 bg-gray-50 dark:bg-zinc-800 border-none"
                                        value={searchTerm}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                    />
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-[180px] justify-start text-left font-normal bg-white dark:bg-zinc-900">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
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

                                {/* District Filter - Static */}
                                {/* <Select value="all" disabled>
                                    <SelectTrigger className="w-[160px] bg-gray-100 dark:bg-zinc-800">
                                        <SelectValue placeholder="All Districts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Districts</SelectItem>
                                    </SelectContent>
                                </Select> */}

                                {/* Role Filter */}
                                <Select value={selectedRole} onValueChange={(value) => {
                                    setSelectedRole(value);
                                    handleFilterChange({ role_id: value === 'all' ? undefined : value });
                                }}>
                                    <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        {roles.map(role => <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                {/* User Filter */}
                                <Select value={selectedUser} onValueChange={(value) => {
                                    setSelectedUser(value);
                                    handleFilterChange({ user_id: value === 'all' ? undefined : value });
                                }}>
                                    <SelectTrigger className="w-[200px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder="User" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>
                                        {users.map(user => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Clear Filters Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="bg-white dark:bg-zinc-900"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="overflow-x-auto bg-white dark:bg-zinc-900">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Employee</th>
                                    <th className="px-6 py-4 font-medium">Evidence</th>
                                    <th className="px-6 py-4 font-medium">Location Info</th>
                                    <th className="px-6 py-4 font-medium">Check In / Out</th>
                                    <th className="px-6 py-4 font-medium">Verification</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            No attendance records found
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
                                            {/* Employee Details */}
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

                                            {/* Evidence Column */}
                                            <td className="px-6 py-4">
                                                {getDisplayImage(record) ? (
                                                    <div className="h-10 w-10 rounded-md overflow-hidden border border-gray-200 shadow-sm group relative">
                                                        <img src={getDisplayImage(record)!} alt="Evidence" className="h-full w-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center">
                                                            <Camera size={12} className="text-white" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-400">No image</div>
                                                )}
                                            </td>

                                            {/* Location */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                        <MapPin size={12} className="text-blue-500" /> Location
                                                    </div>
                                                    {coords.lat && coords.lng ? (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-400">No coordinates</div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Clock In / Out */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {formatTime(record.check_in_time, record.date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    to {formatTime(record.check_out_time, record.date)}
                                                </div>
                                            </td>

                                            {/* Verification */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                        {record.is_face_matched ? <ScanFace size={14} className="text-green-500" /> : <ScanFace size={14} className="text-red-500" />}
                                                        {record.is_face_matched ? 'Verified' : 'Mismatch'}
                                                    </div>
                                                    {record.is_inside_fence
                                                        ? <span className="text-[10px] text-green-600 flex items-center gap-1"><Navigation size={10} /> Inside Fence</span>
                                                        : <span className="text-[10px] text-red-600 flex items-center gap-1">
                                                            <Navigation size={10} /> Outside ({record.distance_from_fence_m?.toFixed(0)}m)
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
                        title={`Activity Log: ${selectedRecord.user.name}`}
                        description={`${selectedRecord.user.role.name} • ${format(new Date(selectedRecord.date), 'PPP')}`}
                    >
                        {/* LEFT SIDE: Details & Photo */}
                        <div className="w-1/2 bg-gray-50/50 dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">

                            {/* Multiple Attendance Records List */}
                            {allUserAttendances.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Attendance Records ({allUserAttendances.length})
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
                                                            to {att.check_out_time ? formatTime(att.check_out_time, att.date) : 'Active'}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={getStatus(att)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Photo Proof */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Evidence</label>
                                {currentAttendance.check_in_image ? (
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                        <img src={getImageUrl(currentAttendance.check_in_image)!} alt="Check-in" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                            {formatTime(currentAttendance.check_in_time, currentAttendance.date)} • Face: {currentAttendance.is_face_matched ? 'Yes' : 'No'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-video w-full rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                                        No check-in image
                                    </div>
                                )}
                            </div>

                            {/* Check-out Evidence */}
                            {currentAttendance.check_out_image && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-out Evidence</label>
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                        <img src={getImageUrl(currentAttendance.check_out_image)!} alt="Check-out" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                            {formatTime(currentAttendance.check_out_time, currentAttendance.date)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Duration & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12} /> Check In</div>
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                                        {formatTime(currentAttendance.check_in_time, currentAttendance.date)}
                                    </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Timer size={12} /> Check Out</div>
                                    <div className="font-bold text-lg text-blue-600">
                                        {currentAttendance.check_out_time ? formatTime(currentAttendance.check_out_time, currentAttendance.date) : 'Active'}
                                    </div>
                                </div>
                            </div>

                            {/* Verification Stats */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-500" /> Verification
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border rounded-lg dark:border-zinc-800">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <Navigation size={16} className={currentAttendance.is_inside_fence ? "text-green-500" : "text-red-500"} />
                                        Geofence Status
                                    </span>
                                    <div className="text-right">
                                        <Badge variant="secondary" className={currentAttendance.is_inside_fence ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}>
                                            {currentAttendance.is_inside_fence ? 'Inside' : `Outside (${currentAttendance.distance_from_fence_m?.toFixed(0)}m)`}
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
                                {showLiveLocation ? 'Showing Live Location' : 'View Live Location'}
                            </Button>

                            {/* Live Location List */}
                            {showLiveLocation && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Location Pings ({liveLocations.length})
                                    </label>
                                    {liveLocations.length === 0 ? (
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400">
                                            <p className="font-medium">No location data found</p>
                                            <p className="mt-1 text-yellow-600 dark:text-yellow-500">The employee may not have location tracking enabled or no data was recorded for this date.</p>
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
                        <div className="w-1/2 relative bg-gray-100 dark:bg-zinc-900 h-full min-h-[400px]">
                            {(() => {
                                // Safe check for attendance coordinates
                                const hasAttendanceCoords =
                                    !!currentAttendance &&
                                    currentAttendance.check_in_lat !== null &&
                                    currentAttendance.check_in_lng !== null;

                                // Determine map mode safely
                                const mapMode =
                                    showLiveLocation && liveLocations.length > 0
                                        ? 'LIVE'
                                        : hasAttendanceCoords
                                            ? 'ATTENDANCE'
                                            : 'EMPTY';

                                // Show empty state
                                if (mapMode === 'EMPTY') {
                                    if (showLiveLocation) {
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                                <MapPin size={48} className="mb-4 text-gray-300" />
                                                <p className="font-medium">No Location Data Available</p>
                                                <p className="text-sm text-gray-500 mt-2">No tracking data found for this date</p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex items-center justify-center h-full text-gray-400">
                                            No GPS data available
                                        </div>
                                    );
                                }

                                // Calculate center based on mode (safe - only runs when data exists)
                                const center: [number, number] =
                                    mapMode === 'LIVE'
                                        ? [liveLocations[0].lat, liveLocations[0].lng]
                                        : [
                                            currentAttendance!.check_in_lat as number,
                                            currentAttendance!.check_in_lng as number
                                        ];

                                // Single MapContainer with mode-based content
                                return (
                                    <MapContainer
                                        key={mapMode} // Force remount when switching modes
                                        center={center}
                                        zoom={14}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                        <MapResizer />

                                        {/* LIVE LOCATION MODE */}
                                        {mapMode === 'LIVE' && (
                                            <>
                                                {/* Trajectory Line */}
                                                {liveLocations.length > 1 && (
                                                    <Polyline
                                                        positions={liveLocations.map(loc => [loc.lat, loc.lng])}
                                                        pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }}
                                                    />
                                                )}

                                                {/* Markers with different colors */}
                                                {liveLocations.map((loc, index) => {
                                                    // Determine marker color based on position
                                                    const isStart = index === 0;
                                                    const isEnd = index === liveLocations.length - 1;

                                                    // Create marker icon using DivIcon (safer than Icon)
                                                    const markerIcon = new L.DivIcon({
                                                        className: 'custom-marker',
                                                        html: `
                                                            <div style="
                                                                background-color: ${isStart ? '#22c55e' : isEnd ? '#ef4444' : '#3b82f6'};
                                                                width: 24px;
                                                                height: 24px;
                                                                border-radius: 50%;
                                                                border: 3px solid white;
                                                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                                                display: flex;
                                                                align-items: center;
                                                                justify-content: center;
                                                                font-size: 10px;
                                                                font-weight: bold;
                                                                color: white;
                                                            ">
                                                                ${isStart ? '🚀' : isEnd ? '🏁' : index + 1}
                                                            </div>
                                                        `,
                                                        iconSize: [24, 24],
                                                        iconAnchor: [12, 12],
                                                        popupAnchor: [0, -12]
                                                    });

                                                    return (
                                                        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={markerIcon}>
                                                            <Popup>
                                                                <div className="p-2">
                                                                    <b className="text-sm block mb-1">
                                                                        {index === 0 ? '🟢 Start' : index === liveLocations.length - 1 ? '🔴 End' : `📍 Point ${index + 1}`}
                                                                    </b>
                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                        <div>Time: {new Date(loc.recorded_at).toLocaleTimeString()}</div>
                                                                        <div>Lat: {loc.lat.toFixed(6)}</div>
                                                                        <div>Lng: {loc.lng.toFixed(6)}</div>
                                                                        {loc.speed && <div>Speed: {loc.speed} km/h</div>}
                                                                        {loc.accuracy && <div>Accuracy: {loc.accuracy}m</div>}
                                                                        {loc.battery && <div>Battery: {loc.battery}%</div>}
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
                                                {/* Polyline if both check-in and check-out exist */}
                                                {currentAttendance.check_out_lat && currentAttendance.check_out_lng && (
                                                    <Polyline
                                                        positions={[
                                                            [currentAttendance.check_in_lat!, currentAttendance.check_in_lng!],
                                                            [currentAttendance.check_out_lat, currentAttendance.check_out_lng]
                                                        ]}
                                                        pathOptions={{ color: 'green', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                                                    />
                                                )}

                                                {/* Check-in Marker */}
                                                <Marker position={[currentAttendance.check_in_lat!, currentAttendance.check_in_lng!]}>
                                                    <Popup>
                                                        <div className="p-1">
                                                            <b className="text-sm block mb-1">Check In</b>
                                                            <div className="text-[10px] text-gray-400 mt-1">
                                                                {currentAttendance.check_in_lat!.toFixed(4)}, {currentAttendance.check_in_lng!.toFixed(4)}
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>

                                                {/* Check-out Marker */}
                                                {currentAttendance.check_out_lat && currentAttendance.check_out_lng && (
                                                    <Marker position={[currentAttendance.check_out_lat, currentAttendance.check_out_lng]}>
                                                        <Popup>
                                                            <div className="p-1">
                                                                <b className="text-sm block mb-1">Check Out</b>
                                                                <div className="text-[10px] text-gray-400 mt-1">
                                                                    {currentAttendance.check_out_lat.toFixed(4)}, {currentAttendance.check_out_lng.toFixed(4)}
                                                                </div>
                                                            </div>
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
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Distance</h4>
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
