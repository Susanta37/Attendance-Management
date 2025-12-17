import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserLocation, Geofence } from '@/types/tracking';

// --- Custom Icon Logic to match your Image style ---
const createCustomIcon = (user: UserLocation, isSelected: boolean) => {
  // Status Colors: Green (Inside), Red (Outside), Gray (Inactive)
  const statusColor = user.status === 'inside' ? '#22c55e' : user.status === 'outside' ? '#ef4444' : '#94a3b8';

  // Selection Halo (Orange from reference image)
  const borderClass = isSelected ? 'border-orange-500 border-4' : 'border-white border-2';

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div class="relative transition-all duration-300 transform ${isSelected ? 'scale-110' : 'scale-100'}">
        <div class="w-10 h-10 rounded-full bg-white shadow-lg overflow-hidden ${borderClass} flex items-center justify-center">
          ${user.avatarUrl
            ? `<img src="${user.avatarUrl}" class="w-full h-full object-cover" />`
            : `<span class="text-xs font-bold text-slate-700">${user.initials}</span>`
          }
        </div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm" style="background-color: ${statusColor};"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Tip of pin logic
    popupAnchor: [0, -40],
  });
};

// --- Map Controller for Programmatic Zooming ---
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
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="w-full h-full z-0 bg-slate-100"
      zoomControl={false} // We will add custom controls if needed, or use default
    >
      <MapController center={mapCenter} zoom={mapZoom} />

      {/* Light Mode (Carto Voyager) - Matches the clean "Government" look */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* Geofence Circles */}
      {geofences.map((geo) => {
        // Find owner to determine color
        const owner = users.find(u => u.id === geo.userId);
        const isActive = selectedUserId === null || selectedUserId === geo.userId;

        // Color Logic: Green if inside, Red if outside (as requested), Orange default
        const strokeColor = owner?.status === 'inside' ? '#22c55e' : '#ef4444';

        if (!isActive) return null;

        return (
          <Circle
            key={`geo-${geo.id}`}
            center={[geo.lat, geo.lng]}
            radius={geo.radius}
            pathOptions={{
              color: strokeColor,
              fillColor: strokeColor,
              fillOpacity: 0.1,
              weight: 2,
              dashArray: owner?.status === 'outside' ? '5, 5' : undefined // Dashed line for anomalies
            }}
          >
            <Popup className="rounded-lg shadow-xl">
              <div className="p-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Geofence</span>
                <h3 className="font-bold text-slate-800">{geo.name}</h3>
                <p className="text-xs text-slate-600 mt-1">Scope: {geo.scope}</p>
                <p className="text-xs text-slate-400">Radius: {geo.radius}m</p>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* User Markers */}
      {users.map((user) => {
        const isSelected = selectedUserId === user.id;
        // If a user is selected, fade out others slightly (optional UX)
        const opacity = selectedUserId && !isSelected ? 0.6 : 1;

        return (
          <Marker
            key={user.id}
            position={[user.lat, user.lng]}
            icon={createCustomIcon(user, isSelected)}
            opacity={opacity}
            eventHandlers={{
              click: () => onUserClick(user.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -45]} opacity={1} className="custom-tooltip">
              <div className="text-center">
                <p className="font-bold text-slate-800">{user.name}</p>
                <p className={`text-xs font-semibold ${user.status === 'inside' ? 'text-green-600' : 'text-red-500'}`}>
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
