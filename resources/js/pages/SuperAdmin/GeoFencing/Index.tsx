import { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from '@/hooks/use-translation';
import axios from 'axios';
import { 
    MapContainer, TileLayer, FeatureGroup, Circle, Marker, Popup, useMap, Polygon, Rectangle 
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

// Icons
import { 
    MapPin, Users, Building2, CheckCircle2, XCircle, Search, 
    Layers, Map as MapIcon, Save, Trash2, X, ChevronsUpDown, Check, Loader2, LocateFixed
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// --- Types ---
type GeoType = 'department' | 'employee';

// Interface for Props passed from Laravel
interface GeofencingProps {
    geofences: any[];
    departments: { id: number; name: string }[];
    employees: { id: number; name: string }[];
    districts: { id: number; name: string }[];
}

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
}

export default function GeofencingIndex({ geofences, departments, employees, districts }: GeofencingProps) {
    const { t } = useTranslation();
    const [isDark, setIsDark] = useState(false);

    // --- Inertia Form ---
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        assign_type: 'department' as GeoType,
        assignee_ids: [] as number[],
        dist: '', // Will store Name
        block: '', // Will store Name
        gp: '', // Will store Name
        shape_type: '',
        coordinates: [] as any[],
        radius: null as number | null,
    });

    // Local UI State
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number }>({ center: [20.2961, 85.8245], zoom: 9 });
    const [drawnShapeType, setDrawnShapeType] = useState<string | null>(null);
    
    // Dynamic Dropdown Data
    const [blockOptions, setBlockOptions] = useState<any[]>([]);
    const [gpOptions, setGpOptions] = useState<any[]>([]);
    const [loadingBlocks, setLoadingBlocks] = useState(false);
    const [loadingGps, setLoadingGps] = useState(false);

    // Temp state to hold IDs for dropdown values (UI Only)
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedBlockId, setSelectedBlockId] = useState('');
    
    const featureGroupRef = useRef<any>(null);

    // Theme Detection
    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // --- Dynamic Location Handlers (Name Saving Logic) ---

    // 1. Handle District Change
    const handleDistrictChange = async (districtId: string) => {
        setSelectedDistrictId(districtId);
        
        // Find Name
        const distName = districts.find(d => String(d.id) === districtId)?.name || '';
        
        // Save Name to Form
        setData(prev => ({ ...prev, dist: distName, block: '', gp: '' }));
        
        // Reset Child UI State
        setSelectedBlockId('');
        setBlockOptions([]);
        setGpOptions([]);

        if (districtId) {
            setLoadingBlocks(true);
            try {
                const res = await axios.get(`/api/blocks/${districtId}`);
                setBlockOptions(res.data);
            } catch (e) {
                console.error("Error loading blocks", e);
            } finally {
                setLoadingBlocks(false);
            }
        }
    };

    // 2. Handle Block Change
    const handleBlockChange = async (blockId: string) => {
        setSelectedBlockId(blockId);

        // Find Name
        const blockName = blockOptions.find(b => String(b.id) === blockId)?.name || '';

        // Save Name to Form
        setData(prev => ({ ...prev, block: blockName, gp: '' }));
        
        setGpOptions([]);

        if (blockId) {
            setLoadingGps(true);
            try {
                const res = await axios.get(`/api/gps/${blockId}`);
                setGpOptions(res.data);
                setMapView(prev => ({ ...prev, zoom: 11 })); 
            } catch (e) {
                console.error("Error loading GPs", e);
            } finally {
                setLoadingGps(false);
            }
        }
    };

    // 3. Handle GP Change
    const handleGpChange = (gpId: string) => {
        const gpName = gpOptions.find(g => String(g.id) === gpId)?.name || '';
        setData('gp', gpName);
    };

    // Handle Drawing Creation
    const handleCreated = (e: any) => {
        const layer = e.layer;
        const type = e.layerType;
        
        setDrawnShapeType(type);
        setData('shape_type', type.toLowerCase());

        // Remove existing layers
        if (featureGroupRef.current) {
            Object.values(featureGroupRef.current._layers).forEach((l: any) => {
                if (l !== layer) {
                    featureGroupRef.current.removeLayer(l);
                }
            });
        }

        if (type === 'circle') {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            setData(prev => ({
                ...prev,
                coordinates: [{ lat: center.lat, lng: center.lng }],
                radius: radius
            }));
        } else if (type === 'polygon' || type === 'rectangle') {
            const latlngs = layer.getLatLngs()[0].map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
            setData(prev => ({
                ...prev,
                coordinates: latlngs,
                radius: null
            }));
        }
    };

    // View Saved Zone
    const handleViewZone = (zone: any) => {
        const coords = typeof zone.coordinates === 'string' ? JSON.parse(zone.coordinates) : zone.coordinates;
        if (!coords || coords.length === 0) return;
        const centerPoint: [number, number] = [coords[0].lat, coords[0].lng];
        setMapView({ center: centerPoint, zoom: 15 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- SAVE LOGIC ---
    const handleSave = () => {
        if (!data.name) { alert(t('enter_zone_name')); return; }
        if (!data.dist) { alert(t('select_district')); return; }
        if (data.assignee_ids.length === 0) { alert(t('select_assignee')); return; }
        if (!drawnShapeType || data.coordinates.length === 0) { alert(t('draw_geofence')); return; }

        post('/admin/geofences', {
            onSuccess: () => {
                reset(); 
                setDrawnShapeType(null);
                setSelectedDistrictId('');
                setSelectedBlockId('');
                setBlockOptions([]);
                setGpOptions([]);
                
                if (featureGroupRef.current) {
                    featureGroupRef.current.clearLayers();
                }
                alert(t('save_success'));
            },
            onError: (err) => {
                console.error("Save Error:", err);
                const msg = Object.values(err)[0] || t('unknown_error');
                alert(`${t('save_failed')}: ${msg}`);
            }
        });
    };

    const handleDelete = (id: number) => {
        if(confirm(t('confirm_delete'))) {
            router.delete(`/admin/geofences/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: t('dashboard'), href: '/dashboard' }, { title: t('geofencing'), href: '/admin/geofencing' }]}>
            <Head title={t('f1')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950">
                
                {/* --- KPI Cards --- */}
                <div className="grid gap-4 md:grid-cols-4">
                    <KpiCard title={t('total_zones')} value={geofences.length} icon={<MapIcon className="text-blue-600" />} trend={t('system_wide')} bg="bg-blue-50 dark:bg-blue-900/20" />
                    <KpiCard title={t('active_zones')} value={geofences.filter(g => g.status === 'active').length} icon={<CheckCircle2 className="text-green-600" />} trend={t('operational')} bg="bg-green-50 dark:bg-green-900/20" />
                    <KpiCard title={t('assigned_depts')} value={geofences.filter(g => g.type === 'department').length} icon={<Building2 className="text-purple-600" />} trend={t('coverage')} bg="bg-purple-50 dark:bg-purple-900/20" />
                    <KpiCard title={t('assigned_staff')} value={geofences.filter(g => g.type === 'employee').length} icon={<Users className="text-orange-600" />} trend={t('personalized')} bg="bg-orange-50 dark:bg-orange-900/20" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Configuration Form */}
                    <Card className="lg:col-span-4 rounded-xl border-orange-100 dark:border-zinc-800 shadow-sm flex flex-col h-full">
                        <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Layers size={20} className="text-orange-600" />
                                {t('zone_configuration')}
                            </CardTitle>
                            <CardDescription>{t('draw_area')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5 flex-1 bg-white dark:bg-zinc-900">
                            
                            <div className="space-y-2">
                                <Label>{t('zone_name')} <span className="text-red-500">*</span></Label>
                                <Input 
                                    placeholder={t('zone_name_placeholder')} 
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={errors.name ? "border-red-500" : "border-gray-200 dark:border-zinc-700"}
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>

                            {/* Dynamic Location Controllers */}
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700 space-y-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={12} /> {t('target_location')}
                                </span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {/* District */}
                                    <div className="space-y-1">
                                        <Label className="text-xs">{t('district')} <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={handleDistrictChange} value={selectedDistrictId}>
                                            <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                            <SelectContent>
                                                {districts.map((d: any) => (
                                                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.dist && <p className="text-red-500 text-[10px]">{errors.dist}</p>}
                                    </div>

                                    {/* Block */}
                                    <div className="space-y-1">
                                        <Label className="text-xs flex items-center gap-1">
                                            {t('block')} {loadingBlocks && <Loader2 className="h-3 w-3 animate-spin"/>}
                                        </Label>
                                        <Select onValueChange={handleBlockChange} value={selectedBlockId} disabled={!selectedDistrictId}>
                                            <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder={t('select')} /></SelectTrigger>
                                            <SelectContent>
                                                {blockOptions.map((b: any) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Gram Panchayat */}
                                <div className="space-y-1">
                                    <Label className="text-xs flex items-center gap-1">
                                        {t('gram_panchayat')} {loadingGps && <Loader2 className="h-3 w-3 animate-spin"/>}
                                    </Label>
                                    <Select 
                                        // Match Name to ID for display (optional, can also use empty value if new)
                                        value={gpOptions.find((g: any) => g.name === data.gp)?.id?.toString() || ''}
                                        onValueChange={handleGpChange} 
                                        disabled={!selectedBlockId}
                                    >
                                        <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder={t('select_gp')} /></SelectTrigger>
                                        <SelectContent>
                                            {gpOptions.map((g: any) => (
                                                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Assignment Type Toggle */}
                            <div className="space-y-3">
                                <Label>{t('assign_scope')} <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant={data.assign_type === 'department' ? 'default' : 'outline'} 
                                        onClick={() => { setData('assign_type', 'department'); setData('assignee_ids', []); }}
                                        className={`flex-1 ${data.assign_type === 'department' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                        size="sm"
                                    >
                                        <Building2 size={14} className="mr-2"/> {t('departments')}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant={data.assign_type === 'employee' ? 'default' : 'outline'} 
                                        onClick={() => { setData('assign_type', 'employee'); setData('assignee_ids', []); }}
                                        className={`flex-1 ${data.assign_type === 'employee' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                        size="sm"
                                    >
                                        <Users size={14} className="mr-2"/> {t('employees')}
                                    </Button>
                                </div>

                                <MultiSelect 
                                    options={data.assign_type === 'department' ? departments : employees}
                                    selected={data.assignee_ids}
                                    onChange={(ids: number[]) => setData('assignee_ids', ids)}
                                    placeholder={data.assign_type === 'department' ? t('search_depts') : t('search_staff')}
                                />
                                {errors.assignee_ids && <p className="text-red-500 text-xs">{errors.assignee_ids}</p>}
                            </div>

                            <Button className="w-full bg-zinc-900 dark:bg-white dark:text-black hover:bg-zinc-800 mt-4" onClick={handleSave} disabled={processing}>
                                <Save className="mr-2 h-4 w-4" /> {processing ? t('saving') : t('save_configuration')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right: Interactive Map */}
                    <Card className="lg:col-span-8 rounded-xl border-orange-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <div className="flex gap-2 items-center">
                                <Badge variant="outline" className="bg-white dark:bg-zinc-800">
                                    {data.dist ? `${data.dist}` : t('odisha_view')}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs text-gray-500 flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${drawnShapeType ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    {drawnShapeType ? t('shape_drawn') : t('draw_mode_ready')}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 relative z-0">
                            <MapContainer 
                                key={isDark ? 'dark' : 'light'} 
                                center={mapView.center} 
                                zoom={mapView.zoom} 
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TileLayer 
                                    url={isDark 
                                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    } 
                                />
                                <MapController center={mapView.center} zoom={mapView.zoom} />

                                <FeatureGroup ref={featureGroupRef}>
                                    <EditControl
                                        position="topright"
                                        onCreated={handleCreated}
                                        draw={{
                                            rectangle: true,
                                            circle: true,
                                            polygon: true,
                                            circlemarker: false,
                                            marker: false,
                                            polyline: false,
                                        }}
                                    />
                                </FeatureGroup>

                                {/* Render Saved Zones */}
                                {geofences.map(geo => {
                                    const coords = typeof geo.coordinates === 'string' ? JSON.parse(geo.coordinates) : geo.coordinates;
                                    return (
                                        <div key={geo.id}>
                                            {geo.shape === 'Circle' && coords && coords[0] && (
                                                <Circle 
                                                    center={[coords[0].lat, coords[0].lng]}
                                                    radius={geo.radius || 500}
                                                    pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.1 }} 
                                                >
                                                    <Popup>
                                                        <div className="text-xs font-bold">{geo.name}</div>
                                                        <div className="text-[10px] text-gray-500">{geo.assign}</div>
                                                    </Popup>
                                                </Circle>
                                            )}
                                            {(geo.shape === 'Polygon' || geo.shape === 'Rectangle') && coords && (
                                                <Polygon
                                                    positions={coords.map((c: any) => [c.lat, c.lng])}
                                                    pathOptions={{ color: '#ea580c', fillColor: '#ea580c', fillOpacity: 0.1 }}
                                                >
                                                    <Popup>
                                                        <div className="text-xs font-bold">{geo.name}</div>
                                                        <div className="text-[10px] text-gray-500">{geo.assign}</div>
                                                    </Popup>
                                                </Polygon>
                                            )}
                                        </div>
                                    );
                                })}

                            </MapContainer>
                        </div>
                    </Card>
                </div>

                {/* --- 3. Saved Geofences Table --- */}
                <Card className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">{t('saved_configurations')}</CardTitle>
                            <Input placeholder={t('filter_list')} className="h-9 w-64 bg-gray-50 dark:bg-zinc-800 border-none" />
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto bg-white dark:bg-zinc-900">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3">{t('zone_name')}</th>
                                    <th className="px-6 py-3">{t('type')}</th>
                                    <th className="px-6 py-3">{t('assigned_to')}</th>
                                    <th className="px-6 py-3">{t('location')}</th>
                                    <th className="px-6 py-3">{t('shape')}</th>
                                    <th className="px-6 py-3">{t('status')}</th>
                                    <th className="px-6 py-3 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {geofences.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">{t('no_zones')}</td>
                                    </tr>
                                ) : (
                                    geofences.map((zone: any) => (
                                        <tr key={zone.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <MapPin size={16} className="text-orange-500" /> {zone.name}
                                            </td>
                                            <td className="px-6 py-4 capitalize text-gray-600 dark:text-gray-400">{zone.type}</td>
                                            <td className="px-6 py-4 font-medium max-w-xs truncate" title={zone.assign}>
                                                {zone.assign}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{zone.location}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="font-mono text-xs">{zone.shape}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('active')}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => handleViewZone(zone)}
                                                        title={t('view')}
                                                    >
                                                        <LocateFixed size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(zone.id)}
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>
        </AppLayout>
    );
}

// --- Multi-Select Component ---
function MultiSelect({ options, selected, onChange, placeholder }: { options: any[], selected: number[], onChange: (ids: number[]) => void, placeholder: string }) {
    const [open, setOpen] = useState(false);
    const handleSelect = (id: number) => {
        if (selected.includes(id)) onChange(selected.filter((item) => item !== id));
        else onChange([...selected, id]);
    };
    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-auto min-h-[2.5rem] bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700">
                        <span className="truncate text-gray-500 font-normal">{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={placeholder} />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {options.map((option: any) => (
                                    <CommandItem key={option.id} onSelect={() => handleSelect(option.id)}>
                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selected.includes(option.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option.name}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 dark:bg-zinc-800/50 rounded-md border border-gray-100 dark:border-zinc-700 min-h-[3rem]">
                    {selected.map((id) => {
                        const item = options.find((o: any) => o.id === id);
                        return (
                            <Badge key={id} variant="secondary" className="bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100">
                                {item?.name}
                                <button className="ml-1 outline-none" onClick={() => handleSelect(id)}><X className="h-3 w-3 text-gray-500 hover:text-red-500" /></button>
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- KPI Card ---
function KpiCard({ title, value, icon, trend, bg }: any) {
    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</h3>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${bg}`}>{icon}</div>
            </div>
            <div className="mt-4 text-xs font-medium text-green-600 flex items-center gap-1">{trend}</div>
        </div>
    );
}