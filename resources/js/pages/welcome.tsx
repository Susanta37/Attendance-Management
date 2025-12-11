import { useState, useEffect } from 'react';
import { Link, Head } from '@inertiajs/react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
    MapPin, ShieldCheck, Smartphone, Users, Activity, Layers, 
    ChevronRight, Building2, Lock, Globe, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

// --- Leaflet Icon Fix ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Config ---
const center: [number, number] = [20.2961, 85.8245]; // Bhubaneswar

export default function Welcome({ auth }: { auth: any }) {
    const { t, locale } = useTranslation();
    const [isDark, setIsDark] = useState(false);

    // --- Dynamic Dark Mode Detection for Map ---
    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkTheme(); // Initial check
        
        // Listen for class changes on <html>
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);

    // Switch between Light (Voyager) and Dark (Dark Matter) map tiles
    const tileLayerUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    const geofenceOptions = { 
        color: '#ea580c', 
        fillColor: '#ea580c', 
        fillOpacity: isDark ? 0.15 : 0.08, 
        weight: 2 
    };

    return (
        <>
            <Head title="Odisha Govt Attendance System" />
            
            <div className={`min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans selection:bg-orange-100 selection:text-orange-900 ${locale === 'or' ? 'font-odia' : ''} overflow-x-hidden`}>
                
                {/* --- Background Floating Particles (No Gradient) --- */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[10%] left-[5%] w-32 h-32 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute top-[40%] right-[10%] w-64 h-64 bg-orange-600/5 rounded-full blur-3xl animate-pulse delay-700" />
                    <div className="absolute bottom-[10%] left-[20%] w-48 h-48 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
                </div>

                {/* --- Navbar (Z-Index increased to 1100 to stay above Leaflet) --- */}
                <header className="fixed top-0 w-full z-[1100] bg-white/90 backdrop-blur-xl border-b border-orange-100 dark:bg-zinc-950/90 dark:border-zinc-800 shadow-sm transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                        {/* Logo Area */}
                        <div className="flex items-center gap-3">
                            <img 
                                src="/assets/images/logo.png" 
                                alt="logo" 
                                className="h-10 w-auto" 
                            />
                            <div className="leading-tight">
                                <h1 className="text-xl font-bold tracking-tight">
                                    Attendance<span className="text-orange-600"> Management</span>
                                </h1>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider hidden sm:block">
                                    {t('dept_name')}
                                </p>
                            </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <Link 
                                href={`language/${locale === 'en' ? 'or' : 'en'}`}
                                className="group flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-orange-50 hover:text-orange-700 transition border border-gray-200 hover:border-orange-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-300"
                            >
                                <Globe size={14} className="group-hover:animate-pulse" />
                                {locale === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
                            </Link>

                            {auth?.user ? (
                                <Link href="/dashboard" className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-500 rounded-lg hover:from-orange-700 hover:to-orange-600 transition shadow-md flex items-center gap-2">
                                    <Activity size={16} /> <span className="hidden sm:inline">{t('dashboard')}</span>
                                </Link>
                            ) : (
                                <Link href="/login" className="px-5 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition dark:bg-white dark:text-black flex items-center gap-2 shadow-md">
                                    <Lock size={16} /> <span className="hidden sm:inline">{t('official_login')}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <main className="pt-32 pb-16 relative z-10">
                    {/* --- Hero Section --- */}
                    <div className="max-w-7xl mx-auto px-6 lg:grid lg:grid-cols-2 lg:gap-16 items-center mb-24">
                        
                        {/* Left: Text Content */}
                        <div className="space-y-8 text-center lg:text-left mb-16 lg:mb-0 relative z-20">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                {t('hero_tag')}
                            </div>
                            
                            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
                                {t('hero_title')} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500">
                                    {t('hero_highlight')}
                                </span>
                            </h1>
                            
                            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                {t('hero_desc')}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
                                <Link href="/login" className="inline-flex justify-center items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition shadow-xl shadow-orange-600/20 active:scale-95 duration-150">
                                    {t('btn_portal')} <ChevronRight size={18} />
                                </Link>
                                <button className="inline-flex justify-center items-center gap-2 px-8 py-3.5 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800">
                                    <Smartphone size={18} /> {t('btn_app')}
                                </button>
                            </div>
                        </div>

                        {/* Right: Map Visual */}
                        <div className="relative isolate z-10">
                            <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-1.5 ring-1 ring-orange-100 dark:ring-orange-900/30">
                                <div className="bg-slate-50 dark:bg-zinc-950 rounded-[1.2rem] overflow-hidden border border-slate-100 dark:border-zinc-800 relative h-[450px]">
                                    
                                    {/* Map Header Overlay */}
                                    <div className="absolute top-4 left-4 right-4 z-[500] flex justify-between items-start pointer-events-none">
                                        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-3 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Live System</span>
                                            </div>
                                            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700"></div>
                                            <span className="text-[10px] font-mono text-gray-400">SEC-01</span>
                                        </div>

                                        {/* Live Alerts Panel */}
                                        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-3 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm space-y-2 pointer-events-auto">
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-800">
                                                <AlertTriangle size={10} /> 1 Anomaly
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 dark:bg-green-900/20 dark:border-green-800">
                                                <CheckCircle2 size={10} /> 342 Active
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leaflet Map */}
                                    <MapContainer 
                                        key={isDark ? 'dark' : 'light'} 
                                        center={center} 
                                        zoom={14} 
                                        scrollWheelZoom={false} 
                                        style={{ height: "100%", width: "100%", zIndex: 0 }} 
                                        zoomControl={false}
                                        dragging={false}
                                        doubleClickZoom={false}
                                    >
                                        <TileLayer
                                            attribution=''
                                            url={tileLayerUrl}
                                        />
                                        
                                        <Circle center={center} pathOptions={geofenceOptions} radius={800} />
                                        
                                        <Marker position={center}>
                                            <Popup>{t('map_label')}</Popup>
                                        </Marker>

                                        {/* Fake Moving Units */}
                                        <Circle 
                                            center={[20.30, 85.83]} 
                                            pathOptions={{ color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.6 }} 
                                            radius={80} 
                                        />
                                        <Circle 
                                            center={[20.29, 85.82]} 
                                            pathOptions={{ color: 'transparent', fillColor: '#22c55e', fillOpacity: 0.6 }} 
                                            radius={80} 
                                        />
                                    </MapContainer>
                                    
                                    {/* Bottom Data Overlay */}
                                    <div className="absolute bottom-4 left-4 right-4 z-[500] pointer-events-none">
                                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 py-4 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 relative">
                                                    <Activity size={20} />
                                                    <span className="absolute top-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse"></span>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Avg. Attendance</div>
                                                    <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">98.2% <span className="text-green-500 text-sm font-normal">▲ 2.4%</span></div>
                                                </div>
                                            </div>
                                            <div className="hidden sm:block text-right">
                                                <div className="text-[10px] text-gray-400 font-mono">SYNCED: JUST NOW</div>
                                                <div className="flex gap-1 mt-1 justify-end">
                                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce delay-75"></div>
                                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce delay-150"></div>
                                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-bounce delay-300"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Styles for Leaflet */}
                                    <style>{`
                                        .leaflet-container { background: #f8fafc; }
                                        .dark .leaflet-container { background: #09090b; }
                                        .leaflet-div-icon { background: transparent; border: none; }
                                    `}</style>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Features Grid --- */}
                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="text-center mb-16">
                            <span className="text-orange-600 font-bold tracking-wider text-xs uppercase bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800">
                                {t('features_title')}
                            </span>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 max-w-2xl mx-auto">
                                {t('features_desc')}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                             <FeatureCard icon={<MapPin className="text-orange-600" />} title={t('f1')} desc={t('f1d')} />
                             <FeatureCard icon={<Users className="text-orange-600" />} title={t('f2')} desc={t('f2d')} />
                             <FeatureCard icon={<Activity className="text-orange-600" />} title={t('f3')} desc={t('f3d')} />
                             <FeatureCard icon={<ShieldCheck className="text-orange-600" />} title={t('f4')} desc={t('f4d')} />
                             <FeatureCard icon={<Layers className="text-orange-600" />} title={t('f5')} desc={t('f5d')} />
                             <FeatureCard icon={<Smartphone className="text-orange-600" />} title={t('f6')} desc={t('f6d')} />
                        </div>
                    </div>

                    {/* --- Footer --- */}
                    <footer className="max-w-7xl mx-auto px-6 mt-24 pt-8 pb-12 border-t border-gray-100 dark:border-zinc-800 text-center relative z-10">
                        <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Building2 size={16} className="text-gray-400" />
                            {t('footer')}
                        </p>
                    </footer>
                </main>
            </div>
        </>
    );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="group p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700">
            <div className="h-12 w-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition duration-300 dark:bg-zinc-800 dark:border-zinc-700">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 transition-colors">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed dark:text-gray-400">{desc}</p>
        </div>
    );
}