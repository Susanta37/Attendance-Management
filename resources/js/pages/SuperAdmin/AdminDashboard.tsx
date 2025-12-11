import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { 
    Users, 
    MapPin, 
    AlertTriangle, 
    Clock, 
    CheckCircle2, 
    XCircle,
    Building2,
    Activity,
    Search,
    Filter
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- Fix Leaflet Icons ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Dummy Data ---
const employees = [
    { id: 1, name: "Rajesh Kumar", role: "Block Admin", dept: "Khurda Block A", status: "Present", time: "09:02 AM", loc: "Inside Geofence" },
    { id: 2, name: "Priya Das", role: "Field Officer", dept: "Cuttack Sadar", status: "Late", time: "10:15 AM", loc: "Inside Geofence" },
    { id: 3, name: "Amit Nayak", role: "Surveyor", dept: "Puri Town", status: "Geofence Breach", time: "09:30 AM", loc: "OUTSIDE Zone" },
    { id: 4, name: "Suman Singh", role: "Clerk", dept: "Bhubaneswar HQ", status: "Absent", time: "-", loc: "-" },
    { id: 5, name: "Manoj Behera", role: "Block Admin", dept: "Jajpur Road", status: "Present", time: "08:55 AM", loc: "Inside Geofence" },
];

const stats = [
    { label: "Total Employees", value: "1,240", icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Present Today", value: "1,105", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Geofence Alerts", value: "12", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", animate: true },
    { label: "On Leave", value: "45", icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
];

const mapCenter: [number, number] = [20.2961, 85.8245]; 

export default function Dashboard() {
    // --- 1. Theme Detection Logic ---
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check initial theme
        const checkTheme = () => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            setIsDark(isDarkMode);
        };

        checkTheme();

        // Listen for changes to the 'class' attribute on the HTML tag
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    // --- 2. Dynamic Tile Layer ---
    const tileLayerUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"  // Dark Matter
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"; // Voyager (Light)

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }]}>
            <Head title="Super Admin Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300">
                {/* KPI Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, index) => (
                        <div key={index} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:border-orange-200 dark:hover:border-zinc-700 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <h3 className={`text-2xl font-bold mt-1 ${stat.animate ? 'animate-pulse text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                    {stat.value}
                                </h3>
                            </div>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Live Map & Stats Section */}
                <div className="grid gap-6 lg:grid-cols-3 h-[500px]">
                    
                    {/* Map Container */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin size={18} className="text-orange-600" /> Live Geofence Tracking
                            </h3>
                            <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                                Real-time Feed
                            </span>
                        </div>
                        
                        <div className="flex-1 relative z-0 bg-gray-100 dark:bg-zinc-950">
                            {/* Key Prop ensures map re-renders cleanly when theme changes */}
                            <MapContainer 
                                key={isDark ? 'dark' : 'light'} 
                                center={mapCenter} 
                                zoom={13} 
                                style={{ height: "100%", width: "100%" }} 
                                zoomControl={false}
                            >
                                <TileLayer 
                                    url={tileLayerUrl} 
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                />
                                
                                <Circle 
                                    center={mapCenter} 
                                    pathOptions={{ 
                                        color: '#ea580c', 
                                        fillColor: '#ea580c', 
                                        fillOpacity: isDark ? 0.2 : 0.1 // More visible in dark mode
                                    }} 
                                    radius={1500} 
                                />
                                
                                <Marker position={mapCenter}>
                                    <Popup>
                                        <div className="text-xs font-bold text-gray-900">Bhubaneswar HQ</div>
                                        <div className="text-xs text-green-600">98 Active Users</div>
                                    </Popup>
                                </Marker>

                                {/* Employee Dots */}
                                <Circle center={[20.30, 85.83]} pathOptions={{ color: 'transparent', fillColor: '#22c55e', fillOpacity: 0.9 }} radius={80} />
                                <Circle center={[20.29, 85.81]} pathOptions={{ color: 'transparent', fillColor: '#ef4444', fillOpacity: 0.9 }} radius={80} />
                            </MapContainer>
                        </div>
                    </div>

                    {/* District Stats List */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm p-4 flex flex-col">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 size={18} className="text-gray-500" /> District Performance
                        </h3>
                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {['Khurda', 'Cuttack', 'Puri', 'Ganjam', 'Balasore', 'Sambalpur', 'Rourkela'].map((dist, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-gray-200">
                                            {dist[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{dist}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">98% Attendance</div>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-16 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.random() * 20 + 80}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden mt-23">
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity size={18} className="text-blue-600" /> Recent Attendance Logs
                        </h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search employee..." 
                                    className="pl-9 h-9 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-orange-500 w-full sm:w-64 dark:text-white dark:placeholder-gray-500"
                                />
                            </div>
                            <button className="h-9 px-3 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300">
                                <Filter size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto ">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Department</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Time</th>
                                    <th className="px-6 py-3">Geofence Status</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            <div>{emp.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">{emp.role}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{emp.dept}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={emp.status} />
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-400">{emp.time}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                emp.loc.includes('OUTSIDE') 
                                                ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
                                                : 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                            }`}>
                                                {emp.loc.includes('OUTSIDE') ? <XCircle size={10}/> : <CheckCircle2 size={10}/>}
                                                {emp.loc}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 font-medium text-xs">View Log</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

// Helper Component for Status Badges
function StatusBadge({ status }: { status: string }) {
    const styles = {
        Present: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30",
        Absent: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
        Late: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30",
        "Geofence Breach": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 animate-pulse",
    };
    
    const style = styles[status as keyof typeof styles] || styles.Absent;

    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${style}`}>
            {status}
        </span>
    );
}