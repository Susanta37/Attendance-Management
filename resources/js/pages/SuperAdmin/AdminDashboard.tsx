import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
    Users, MapPin, AlertTriangle, Clock, CheckCircle2, 
    XCircle, Activity, Search, Filter, ArrowUpRight, 
    MoreHorizontal, ShieldAlert, FileText, LocateFixed 
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polygon, Rectangle } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon issue in Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Interfaces ---
interface DashboardProps {
    stats: {
        total_employees: number;
        present_today: number;
        late_arrivals: number;
        geofence_violations: number;
        pending_docs: number;
    };
    chartData: Array<{ name: string; present: number; absent: number }>;
    recentLogs: Array<{
        id: number;
        user_name: string;
        avatar: string | null;
        department: string;
        status: string;
        time: string;
        is_inside_fence: boolean;
        distance: number;
    }>;
    geofences: Array<{
        id: number;
        name: string;
        coordinates: any; // LatLng array or bounds
        radius: number | null;
        shape_type: string;
    }>;
}

export default function AdminDashboard({ stats, chartData, recentLogs, geofences }: DashboardProps) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const tileLayerUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    // Default center (e.g., Odisha)
    const mapCenter: [number, number] = [20.2961, 85.8245];

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }]}>
            <Head title="Command Center" />

            <div className="flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 dark:bg-zinc-950 min-h-screen">
                
                {/* --- Header Section --- */}
                {/* <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time attendance, geofence status, and system health.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-zinc-900 dark:text-gray-300 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-colors">
                            <Filter size={16} /> Filter
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors">
                            <ArrowUpRight size={16} /> Export Report
                        </button>
                    </div>
                </div> */}

                {/* --- 1. KPI Grid --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard 
                        title="Total Users" 
                        value={stats.total_employees} 
                        icon={Users} 
                        color="text-blue-600" 
                        bg="bg-blue-100/50 dark:bg-blue-900/20" 
                    />
                    <KpiCard 
                        title="Present Now" 
                        value={stats.present_today} 
                        subValue={`${stats.total_employees > 0 ? Math.round((stats.present_today / stats.total_employees) * 100) : 0}% Active`}
                        icon={CheckCircle2} 
                        color="text-green-600" 
                        bg="bg-green-100/50 dark:bg-green-900/20" 
                    />
                    <KpiCard 
                        title="Late Arrivals" 
                        value={stats.late_arrivals} 
                        icon={Clock} 
                        color="text-orange-600" 
                        bg="bg-orange-100/50 dark:bg-orange-900/20" 
                    />
                    <KpiCard 
                        title="Geofence Alerts" 
                        value={stats.geofence_violations} 
                        subValue="Outside Zone"
                        icon={ShieldAlert} 
                        color="text-red-600" 
                        bg="bg-red-100/50 dark:bg-red-900/20" 
                        animate={stats.geofence_violations > 0}
                    />
                    <KpiCard 
                        title="Pending Docs" 
                        value={stats.pending_docs} 
                        icon={FileText} 
                        color="text-purple-600" 
                        bg="bg-purple-100/50 dark:bg-purple-900/20" 
                    />
                </div>

                {/* --- 2. Chart & Map Grid --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Attendance Trend Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Analytics</h3>
                                <p className="text-sm text-gray-500">Weekly workforce distribution</p>
                            </div>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark ? '#888' : '#666', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#888' : '#666', fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: isDark ? '#fff' : '#000' }}
                                    />
                                    <Area type="monotone" dataKey="present" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Live Map Preview */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin size={18} className="text-orange-600" /> Active Zones
                            </h3>
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                        </div>
                        <div className="flex-1 min-h-[320px] relative z-0">
                            <MapContainer 
                                key={isDark ? 'dark-map' : 'light-map'} 
                                center={mapCenter} 
                                zoom={11} 
                                style={{ height: "100%", width: "100%" }} 
                                zoomControl={false}
                            >
                                <TileLayer url={tileLayerUrl} />
                                
                                {geofences.map((geo) => {
                                    // Parse coordinates if they are strings (Laravel sometimes sends JSON as string)
                                    const coords = typeof geo.coordinates === 'string' ? JSON.parse(geo.coordinates) : geo.coordinates;
                                    
                                    return (
                                        <div key={geo.id}>
                                            {geo.shape_type === 'circle' && coords && coords[0] && (
                                                <Circle 
                                                    center={[coords[0].lat, coords[0].lng]}
                                                    radius={geo.radius || 500}
                                                    pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.2 }} 
                                                >
                                                    <Popup>{geo.name}</Popup>
                                                </Circle>
                                            )}
                                            {geo.shape_type === 'polygon' && coords && (
                                                <Polygon
                                                    positions={coords.map((c: any) => [c.lat, c.lng])}
                                                    pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.2 }}
                                                >
                                                    <Popup>{geo.name}</Popup>
                                                </Polygon>
                                            )}
                                        </div>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    </div>
                </div>

                {/* --- 3. Live Logs Table --- */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity size={18} className="text-blue-600" /> Recent Activity Feed
                        </h3>
                        <div className="flex gap-2">
                            <Link href="/admin/attendance" className="text-sm text-orange-600 hover:text-orange-700 font-medium">View All &rarr;</Link>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Department</th>
                                    <th className="px-6 py-3">Time</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Location Check</th>
                                    <th className="px-6 py-3 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {recentLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-xs uppercase">
                                                {log.user_name.substring(0, 2)}
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-white">{log.user_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{log.department}</td>
                                        <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{log.time}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={log.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    !log.is_inside_fence
                                                    ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                                }`}>
                                                    {!log.is_inside_fence ? <XCircle size={10}/> : <CheckCircle2 size={10}/>}
                                                    {log.is_inside_fence ? 'Inside Zone' : 'Outside'}
                                                </span>
                                                {!log.is_inside_fence && (
                                                    <span className="text-xs text-gray-400">({log.distance}m away)</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 hover:text-orange-600 transition-colors">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {recentLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No activity recorded today.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

// --- Component: KPI Card ---
function KpiCard({ title, value, subValue, icon: Icon, color, bg, animate = false }: any) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-2">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg} ${color}`}>
                    <Icon size={20} className={animate ? 'animate-pulse' : ''} />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </h3>
                {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
            </div>
        </div>
    );
}

// --- Component: Status Badge ---
function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        Present: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30",
        Late: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30",
        "Geofence Breach": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30",
        Anomaly: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30",
    };
    
    // Fallback style
    const defaultStyle = "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    
    // Match keys loosely
    const key = Object.keys(styles).find(k => k.toLowerCase() === status.toLowerCase()) || 'default';
    const style = key === 'default' ? defaultStyle : styles[key];

    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${style}`}>
            {status}
        </span>
    );
}