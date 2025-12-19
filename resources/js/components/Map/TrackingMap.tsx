import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Rectangle, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserLocation, Geofence } from '@/types/tracking';

// --- Custom Icon Logic ---
const createPinIcon = (user: UserLocation, isSelected: boolean) => {
  const statusClass =
    user.status === 'inside'
      ? 'pin-inside'
      : user.status === 'outside'
      ? 'pin-outside'
      : 'pin-inactive';

  return L.divIcon({
    className: '', // Leave empty, using internal html classes
    html: `
      <div class="user-pin ${statusClass} ${isSelected ? 'pin-selected' : ''}">
        <div class="user-pin-content">
          ${
            user.avatarUrl
              ? `<img src="${user.avatarUrl}" style="width:100%;height:100%;object-fit:cover;" />`
              : `<span>${user.initials}</span>`
          }
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],   // tip of pin touches ground
    popupAnchor: [0, -42],
  });
};

// --- Map Controller ---
const MapController = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
};

interface TrackingMapProps {
  users: UserLocation[];
  geofences: Geofence[];
  selectedUserId: number | null;
  mapCenter: [number, number];
  mapZoom: number;
  onUserClick: (id: number) => void;
}

export const TrackingMap: React.FC<TrackingMapProps> = ({
  users, geofences, selectedUserId, mapCenter, mapZoom, onUserClick
}) => {
  
  // Theme Detection State
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkTheme(); // Initial check
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Dynamic Tile Layer URL based on theme
  const tileLayerUrl = isDark 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="w-full h-full z-0 bg-slate-100 dark:bg-zinc-900" // Adaptive BG
      zoomControl={false}
    >
      <MapController center={mapCenter} zoom={mapZoom} />

      {/* Adaptive Tiles */}
      <TileLayer
        key={isDark ? 'dark' : 'light'} // Force re-render on theme change
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileLayerUrl}
      />

      {/* RENDER GEOFENCES */}
      {geofences.map((geo) => {
        // 1. Determine Color
        const owner = users.find(u => u.id === geo.userId);
        const isActive = selectedUserId === null || selectedUserId === geo.userId;
        const strokeColor = owner?.status === 'inside' ? '#22c55e' : '#ef4444'; // Green or Red

        if (!isActive) return null;

        // 2. Style Options
        const pathOptions = {
            color: strokeColor,
            fillColor: strokeColor,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: owner?.status === 'outside' ? '5, 5' : undefined
        };

        // 3. Render CIRCLE
        if (geo.shape_type === 'circle') {
             const lat = Number(geo.lat);
             const lng = Number(geo.lng);

             if (isNaN(lat) || isNaN(lng)) return null;

             return (
                <Circle
                    key={`geo-${geo.id}`}
                    center={[lat, lng]}
                    radius={Number(geo.radius)}
                    pathOptions={pathOptions}
                >
                    <GeofencePopup geo={geo} />
                </Circle>
             );
        }

        // 4. Render POLYGON
        if (geo.shape_type === 'polygon' && Array.isArray(geo.coordinates) && geo.coordinates.length > 0) {
             const positions = geo.coordinates.map((c: any) => [Number(c.lat), Number(c.lng)] as [number, number]);

             return (
                <Polygon
                    key={`geo-${geo.id}`}
                    positions={positions}
                    pathOptions={pathOptions}
                >
                    <GeofencePopup geo={geo} />
                </Polygon>
             );
        }

        // 5. Render RECTANGLE
        if (geo.shape_type === 'rectangle' && Array.isArray(geo.coordinates) && geo.coordinates.length > 0) {
             const lats = geo.coordinates.map((c: any) => Number(c.lat));
             const lngs = geo.coordinates.map((c: any) => Number(c.lng));

             const minLat = Math.min(...lats);
             const maxLat = Math.max(...lats);
             const minLng = Math.min(...lngs);
             const maxLng = Math.max(...lngs);

             const bounds: [[number, number], [number, number]] = [
                 [minLat, minLng],
                 [maxLat, maxLng]
             ];

             return (
                <Rectangle
                    key={`geo-${geo.id}`}
                    bounds={bounds}
                    pathOptions={pathOptions}
                >
                    <GeofencePopup geo={geo} />
                </Rectangle>
             );
        }

        return null;
      })}

      {/* RENDER USER MARKERS */}
      {users.map((user) => {
        const isSelected = selectedUserId === user.id;
        const opacity = selectedUserId && !isSelected ? 0.6 : 1;

        return (
          <Marker
            key={user.id}
            position={[Number(user.lat), Number(user.lng)]} // Explicit Number cast
            icon={createPinIcon(user, isSelected)}
            opacity={opacity}
            eventHandlers={{
              click: () => onUserClick(user.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -45]} opacity={1} className="custom-tooltip border-none bg-transparent shadow-none">
              <div className="text-center bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-lg border border-slate-100 dark:border-zinc-700">
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{user.name}</p>
                <p className={`text-[10px] font-semibold tracking-wider mt-0.5 ${user.status === 'inside' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {user.status.toUpperCase()}
                </p>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

// Helper component for styled popups
const GeofencePopup = ({ geo }: { geo: Geofence }) => (
    <Popup className="rounded-lg shadow-xl dark:shadow-none">
        <div className="p-1 min-w-[150px]">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Geofence</span>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{geo.name}</h3>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-700">
                <span className="text-xs text-slate-600 dark:text-slate-400">Scope: <span className="font-medium text-slate-900 dark:text-slate-200">{geo.scope}</span></span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize mt-1">Type: {geo.shape_type}</p>
        </div>
    </Popup>
);