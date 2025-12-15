import { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react'; // Import useForm and router
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from '@/hooks/use-translation';
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
    Layers, Map as MapIcon, Save, Trash2, X, ChevronsUpDown, Check
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
}

// --- Mock Hierarchy (Keep this for dropdown logic if it's static) ---
const odishaHierarchy: any = {
    'Khurda': {
        coords: [20.1754, 85.5394],
        blocks: [
            { name: 'Bhubaneswar', coords: [20.2961, 85.8245], gps: ['Nayapalli', 'Jaydev Vihar'] },
            { name: 'Jatni', coords: [20.1636, 85.7071], gps: ['Jatni GP1'] },
        ]
    },
    // ... add other districts as needed
};

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, map]);
    return null;
}

export default function GeofencingIndex({ geofences, departments, employees }: GeofencingProps) {
    const { t } = useTranslation();
    const [isDark, setIsDark] = useState(false);

    // --- Inertia Form ---
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        assign_type: 'department' as GeoType,
        assignee_ids: [] as number[],
        dist: '',
        block: '',
        shape_type: '',
        coordinates: [] as any[],
        radius: null as number | null,
    });

    // Local UI State (separate from form data where logical)
    const [selectedGP, setSelectedGP] = useState('');
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number }>({ center: [20.2961, 85.8245], zoom: 9 });
    const [drawnShapeType, setDrawnShapeType] = useState<string | null>(null);
    
    const featureGroupRef = useRef<any>(null);

    // Theme Detection
    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Handle Location Change (Updates Map & Form Data)
    useEffect(() => {
        if (data.block) {
            const blockData = odishaHierarchy[data.dist]?.blocks.find((b: any) => b.name === data.block);
            if (blockData) setMapView({ center: blockData.coords, zoom: 13 });
        } else if (data.dist) {
            const distData = odishaHierarchy[data.dist];
            if (distData) setMapView({ center: distData.coords, zoom: 10 });
        }
    }, [data.dist, data.block]);

    // Handle Drawing Creation
    const handleCreated = (e: any) => {
        const layer = e.layer;
        const type = e.layerType;
        
        setDrawnShapeType(type);
        setData('shape_type', type);

        // Extract Coordinates based on shape
        if (type === 'circle') {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            setData(prev => ({
                ...prev,
                coordinates: [{ lat: center.lat, lng: center.lng }],
                radius: radius
            }));
        } else if (type === 'polygon' || type === 'rectangle') {
            // Polygon/Rectangle: Array of LatLng objects
            // Rectangle in Leaflet Draw returns latlngs like a polygon
            const latlngs = layer.getLatLngs()[0].map((ll: any) => ({ lat: ll.lat, lng: ll.lng }));
            setData(prev => ({
                ...prev,
                coordinates: latlngs,
                radius: null
            }));
        }

        // Only allow one shape at a time for simplicity (clear others)
        /* Note: To enforce single shape, you might need custom logic to remove 
           previous layers from featureGroupRef. The standard library allows multiple.
           Here we just capture the *last* drawn shape.
        */
    };

    // --- SAVE LOGIC ---
    const handleSave = () => {
        if (!data.name || !drawnShapeType || data.assignee_ids.length === 0) {
            alert("Please fill all fields and draw a zone.");
            return;
        }

        post(route('admin.geofencing.store'), {
            onSuccess: () => {
                reset(); // Clear form
                setDrawnShapeType(null);
                setSelectedGP('');
                if (featureGroupRef.current) {
                    featureGroupRef.current.clearLayers(); // Clear map
                }
                alert("Geofence Saved Successfully!");
            },
            onError: (err) => {
                console.error(err);
                alert("Failed to save. Check inputs.");
            }
        });
    };

    // Handle Delete
    const handleDelete = (id: number) => {
        if(confirm('Are you sure you want to delete this zone?')) {
            router.delete(route('admin.geofencing.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Geofencing', href: '/admin/geofencing' }]}>
            <Head title="Geofencing Configuration" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-950">
                
                {/* --- KPI Cards --- */}
                <div className="grid gap-4 md:grid-cols-4">
                    <KpiCard title="Total Zones" value={geofences.length} icon={<MapIcon className="text-blue-600" />} trend="System Wide" bg="bg-blue-50 dark:bg-blue-900/20" />
                    <KpiCard title="Active Zones" value={geofences.filter(g => g.status === 'active').length} icon={<CheckCircle2 className="text-green-600" />} trend="Operational" bg="bg-green-50 dark:bg-green-900/20" />
                    <KpiCard title="Assigned Depts" value={geofences.filter(g => g.type === 'department').length} icon={<Building2 className="text-purple-600" />} trend="Coverage" bg="bg-purple-50 dark:bg-purple-900/20" />
                    <KpiCard title="Assigned Staff" value={geofences.filter(g => g.type === 'employee').length} icon={<Users className="text-orange-600" />} trend="Personalized" bg="bg-orange-50 dark:bg-orange-900/20" />
                </div>

                {/* --- Main Config Area --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left: Configuration Form */}
                    <Card className="lg:col-span-4 rounded-xl border-orange-100 dark:border-zinc-800 shadow-sm flex flex-col h-full">
                        <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 pb-4">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Layers size={20} className="text-orange-600" />
                                Zone Configuration
                            </CardTitle>
                            <CardDescription>Draw area and assign to staff.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5 flex-1 bg-white dark:bg-zinc-900">
                            
                            <div className="space-y-2">
                                <Label>Zone Name</Label>
                                <Input 
                                    placeholder="e.g. Khurda Block Office A" 
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="border-gray-200 dark:border-zinc-700 focus-visible:ring-orange-500" 
                                />
                                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                            </div>

                            {/* Location Controllers */}
                            <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700 space-y-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <MapPin size={12} /> Target Location (Moves Map)
                                </span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">District</Label>
                                        <Select onValueChange={(val) => { setData('dist', val); setData('block', ''); setSelectedGP(''); }}>
                                            <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(odishaHierarchy).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Block</Label>
                                        <Select onValueChange={(val) => setData('block', val)} disabled={!data.dist}>
                                            <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {data.dist && odishaHierarchy[data.dist]?.blocks.map((b: any) => (
                                                    <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Gram Panchayat</Label>
                                    <Select onValueChange={setSelectedGP} disabled={!data.block}>
                                        <SelectTrigger className="h-8 bg-white dark:bg-zinc-900"><SelectValue placeholder="Select GP" /></SelectTrigger>
                                        <SelectContent>
                                            {data.dist && data.block && 
                                                odishaHierarchy[data.dist]?.blocks.find((b: any) => b.name === data.block)?.gps.map((gp: string) => (
                                                    <SelectItem key={gp} value={gp}>{gp}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Assignment Type Toggle */}
                            <div className="space-y-3">
                                <Label>Assign Scope</Label>
                                <div className="flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant={data.assign_type === 'department' ? 'default' : 'outline'} 
                                        onClick={() => { setData('assign_type', 'department'); setData('assignee_ids', []); }}
                                        className={`flex-1 ${data.assign_type === 'department' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                        size="sm"
                                    >
                                        <Building2 size={14} className="mr-2"/> Departments
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant={data.assign_type === 'employee' ? 'default' : 'outline'} 
                                        onClick={() => { setData('assign_type', 'employee'); setData('assignee_ids', []); }}
                                        className={`flex-1 ${data.assign_type === 'employee' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                                        size="sm"
                                    >
                                        <Users size={14} className="mr-2"/> Employees
                                    </Button>
                                </div>

                                <MultiSelect 
                                    options={data.assign_type === 'department' ? departments : employees}
                                    selected={data.assignee_ids}
                                    onChange={(ids: number[]) => setData('assignee_ids', ids)}
                                    placeholder={data.assign_type === 'department' ? "Search Depts..." : "Search Staff..."}
                                />
                                {errors.assignee_ids && <p className="text-red-500 text-xs">{errors.assignee_ids}</p>}
                            </div>

                            <Button className="w-full bg-zinc-900 dark:bg-white dark:text-black hover:bg-zinc-800 mt-4" onClick={handleSave} disabled={processing}>
                                <Save className="mr-2 h-4 w-4" /> {processing ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Right: Interactive Map */}
                    <Card className="lg:col-span-8 rounded-xl border-orange-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                        <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <div className="flex gap-2 items-center">
                                <Badge variant="outline" className="bg-white dark:bg-zinc-800">
                                    {data.dist ? `${data.dist} ${data.block ? '> ' + data.block : ''} ${selectedGP ? '> ' + selectedGP : ''}` : "Odisha View"}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs text-gray-500 flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${drawnShapeType ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    {drawnShapeType ? "Shape Drawn" : "Draw Mode Ready"}
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

                                {/* Render Existing Geofences (Visual Context) */}
                                {geofences.map(geo => (
                                    <div key={geo.id}>
                                        {geo.shape === 'Circle' && geo.coordinates && (
                                            <Circle 
                                                center={[geo.coordinates[0].lat, geo.coordinates[0].lng]}
                                                radius={geo.radius}
                                                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                                            >
                                                <Popup>{geo.name}</Popup>
                                            </Circle>
                                        )}
                                        {(geo.shape === 'Polygon' || geo.shape === 'Rectangle') && geo.coordinates && (
                                            <Polygon 
                                                positions={geo.coordinates.map((c: any) => [c.lat, c.lng])}
                                                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                                            >
                                                <Popup>{geo.name}</Popup>
                                            </Polygon>
                                        )}
                                    </div>
                                ))}

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
                            </MapContainer>
                        </div>
                    </Card>
                </div>

                {/* --- 3. Saved Geofences Table (Live Update) --- */}
                <Card className="rounded-xl border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <CardHeader className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Saved Configurations</CardTitle>
                            <Input placeholder="Filter list..." className="h-9 w-64 bg-gray-50 dark:bg-zinc-800 border-none" />
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto bg-white dark:bg-zinc-900">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-6 py-3">Zone Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Assigned To</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Shape</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {geofences.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No zones configured yet.</td>
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
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDelete(zone.id)}
                                                    >
                                                        <Trash2 size={14} />
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

// --- Multi-Select Component (Unchanged from your snippet, just ensuring prop types) ---
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

// --- KPI Card (Unchanged) ---
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