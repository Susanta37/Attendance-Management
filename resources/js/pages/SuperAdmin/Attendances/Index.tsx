import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout'; 
import GlobalModal from '@/components/GlobalModal'; 

import { 
    Calendar, CheckCircle2, Clock, MapPin, Search, 
    AlertTriangle, Download, MoreVertical, Battery, 
    ShieldCheck, ScanFace, Navigation, Timer, Camera
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
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Mock Data with Trajectory & Photos ---
const districts = [
    { id: 'all', name: 'All Districts' },
    { id: 'khurda', name: 'Khurda' },
    { id: 'cuttack', name: 'Cuttack' },
];

const attendanceData = [
    { 
        id: 1, 
        user: { name: 'Rajesh Kumar', designation: 'BDO', avatar: 'RK', dist: 'Khurda', block: 'Bhubaneswar', gp: 'Chandaka' },
        date: '2025-12-13',
        checkIn: '09:15 AM',
        checkOut: '06:30 PM',
        duration: '9h 15m',
        status: 'Present',
        location_name: 'Block Office, Chandaka',
        checkInPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
        battery: 85,
        device_id: 'SAMSUNG-S23-001',
        geofence: 'Inside',
        face_match: true,
        is_anomaly: false,
        distance_fence: 12,
        // Trajectory data for lines on map
        timeline: [
            { lat: 20.3588, lng: 85.7725, time: '09:15 AM', type: 'Check In' },
            { lat: 20.3592, lng: 85.7730, time: '01:00 PM', type: 'Ping' },
            { lat: 20.3605, lng: 85.7745, time: '06:30 PM', type: 'Check Out' }
        ]
    },
    { 
        id: 2, 
        user: { name: 'Priya Das', designation: 'Junior Engineer', avatar: 'PD', dist: 'Cuttack', block: 'Banki', gp: 'Subarnapur' },
        date: '2025-12-13',
        checkIn: '09:45 AM',
        checkOut: '--:--',
        duration: 'Active Now',
        status: 'Late',
        location_name: 'Site Inspection, Banki',
        checkInPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
        battery: 42,
        device_id: 'XIAOMI-12-PRO',
        geofence: 'Outside',
        face_match: true,
        is_anomaly: false,
        distance_fence: 450,
        timeline: [
            { lat: 20.3700, lng: 85.5300, time: '09:45 AM', type: 'Check In' },
            { lat: 20.3710, lng: 85.5320, time: '11:00 AM', type: 'Current' }
        ]
    },
];

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

// --- Main Page ---

export default function AttendanceIndex() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDist, setSelectedDist] = useState('all');
    
    // Modal State
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    // Filter Logic
    const filteredData = attendanceData.filter(item => {
        const matchesSearch = item.user.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDist = selectedDist === 'all' || item.user.dist.toLowerCase() === selectedDist;
        return matchesSearch && matchesDist;
    });

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Attendance', href: '/attendance' }]}>
            <Head title="Attendance Monitoring" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950 font-sans">
                
                {/* Header Section */}
              
                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-4">
                    <KpiCard title="Present Today" value="2,142" icon={<CheckCircle2 className="text-green-600" />} trend="89% Attendance" trendUp={true} bg="bg-green-50 dark:bg-green-900/20" />
                    <KpiCard title="Late Arrivals" value="148" icon={<Clock className="text-yellow-600" />} trend="+5% vs Yesterday" trendUp={false} bg="bg-yellow-50 dark:bg-yellow-900/20" />
                    <KpiCard title="Anomalies" value="12" icon={<AlertTriangle className="text-orange-600" />} trend="Requires Action" trendUp={false} bg="bg-orange-50 dark:bg-orange-900/20" />
                    <KpiCard title="Active Staff" value="1,890" icon={<MapPin className="text-blue-600" />} trend="In the field" trendUp={true} bg="bg-blue-50 dark:bg-blue-900/20" />
                </div>

                {/* Data Table */}
                <Card className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex-1">
                    <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 py-4 px-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Search Filters */}
                            <div className="flex flex-1 items-center gap-3">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input 
                                        placeholder="Search Employee..." 
                                        className="pl-9 bg-gray-50 dark:bg-zinc-800 border-none" 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
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
                                        <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <Select value={selectedDist} onValueChange={setSelectedDist}>
                                    <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder="District" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedDist} onValueChange={setSelectedDist}>
                                    <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder="Blocks" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedDist} onValueChange={setSelectedDist}>
                                    <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900">
                                        <SelectValue placeholder="Gps" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
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
                                    <th className="px-6 py-4 font-medium">Clock In / Out</th>
                                    <th className="px-6 py-4 font-medium">Verification</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {filteredData.map((record) => (
                                    <tr 
                                        key={record.id} 
                                        className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                                        onClick={() => setSelectedRecord(record)}
                                    >
                                        {/* Employee Details */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-gray-200">
                                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${record.user.name}&background=random`} />
                                                    <AvatarFallback>{record.user.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white">{record.user.name}</div>
                                                    <div className="text-xs text-gray-500">{record.user.designation}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* NEW COLUMN: Check In Photo */}
                                        <td className="px-6 py-4">
                                            <div className="h-10 w-10 rounded-md overflow-hidden border border-gray-200 shadow-sm group relative">
                                                <img src={record.checkInPhoto} alt="Check In" className="h-full w-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center">
                                                    <Camera size={12} className="text-white"/>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Location */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                    <MapPin size={12} className="text-blue-500"/> {record.location_name}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    {record.timeline?.[0]?.lat.toFixed(4)}, {record.timeline?.[0]?.lng.toFixed(4)}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Clock In / Out */}
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{record.checkIn}</div>
                                            <div className="text-xs text-gray-500">to {record.checkOut}</div>
                                        </td>

                                        {/* Verification */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                                                    {record.face_match ? <ScanFace size={14} className="text-green-500"/> : <ScanFace size={14} className="text-red-500"/>}
                                                    {record.face_match ? 'Verified' : 'Mismatch'}
                                                </div>
                                                {record.geofence === 'Inside' 
                                                    ? <span className="text-[10px] text-green-600 flex items-center gap-1"><Navigation size={10}/> Inside Fence</span>
                                                    : <span className="text-[10px] text-red-600 flex items-center gap-1"><Navigation size={10}/> Outside ({record.distance_fence}m)</span>
                                                }
                                            </div>
                                        </td>

                                        <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                                        
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                                <MoreVertical size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* --- GLOBAL MODAL --- */}
                {selectedRecord && (
                    <GlobalModal 
                        isOpen={!!selectedRecord} 
                        onClose={() => setSelectedRecord(null)}
                        title={`Activity Log: ${selectedRecord.user.name}`}
                        description={`${selectedRecord.user.designation} • ${selectedRecord.date}`}
                    >
                        {/* LEFT SIDE: Details & Photo */}
                        <div className="w-full lg:w-[400px] bg-gray-50/50 dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto">
                            
                            {/* Photo Proof */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Evidence</label>
                                <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                    <img src={selectedRecord.checkInPhoto} alt="Proof" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">
                                        {selectedRecord.checkIn} • Face Match: {selectedRecord.face_match ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            </div>

                            {/* Duration & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock size={12}/> Check In</div>
                                    <div className="font-bold text-lg text-gray-900 dark:text-white">{selectedRecord.checkIn}</div>
                                </div>
                                <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Timer size={12}/> Duration</div>
                                    <div className="font-bold text-lg text-blue-600">{selectedRecord.duration}</div>
                                </div>
                            </div>

                            {/* Verification Stats */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-blue-500"/> Verification
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border rounded-lg dark:border-zinc-800">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <Navigation size={16} className={selectedRecord.geofence === 'Inside' ? "text-green-500" : "text-red-500"}/>
                                        Geofence Status
                                    </span>
                                    <div className="text-right">
                                        <Badge variant="secondary" className={selectedRecord.geofence === 'Inside' ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"}>
                                            {selectedRecord.geofence}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border rounded-lg dark:border-zinc-800">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <Battery size={16} className={selectedRecord.battery < 20 ? "text-red-500" : "text-green-500"}/>
                                        Device Battery
                                    </span>
                                    <span className="font-mono text-sm">{selectedRecord.battery}%</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE: Interactive Map */}
                        <div className="flex-1 relative bg-gray-100 dark:bg-zinc-900 h-full min-h-[400px]">
                            {selectedRecord.timeline && selectedRecord.timeline.length > 0 ? (
                                <MapContainer 
                                    center={[selectedRecord.timeline[0].lat, selectedRecord.timeline[0].lng]} 
                                    zoom={14} 
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    />
                                    
                                    {/* Trajectory Line */}
                                    <Polyline 
                                        positions={selectedRecord.timeline.map((t: any) => [t.lat, t.lng])}
                                        pathOptions={{ color: 'blue', weight: 4, dashArray: '10, 10', opacity: 0.6 }}
                                    />

                                    {/* Markers for Check-In, Ping, Check-Out */}
                                    {selectedRecord.timeline.map((point: any, index: number) => (
                                        <Marker 
                                            key={index} 
                                            position={[point.lat, point.lng]}
                                        >
                                            <Popup>
                                                <div className="p-1">
                                                    <b className="text-sm block mb-1">{point.type}</b>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={10}/> {point.time}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-1">
                                                        {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    No GPS data available
                                </div>
                            )}

                            {/* Floating Map Info */}
                            <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-zinc-950/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-zinc-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Total Distance</h4>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">1.2 km</div>
                            </div>
                        </div>
                    </GlobalModal>
                )}
            </div>
        </AppLayout>
    );
}