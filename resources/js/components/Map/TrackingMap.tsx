import React, { useEffect } from 'react';
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
  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      className="w-full h-full z-0 bg-slate-100"
      zoomControl={false}
    >
      <MapController center={mapCenter} zoom={mapZoom} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
             // Ensure lat/lng are numbers
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

        // 5. Render RECTANGLE (FIXED LOGIC)
        if (geo.shape_type === 'rectangle' && Array.isArray(geo.coordinates) && geo.coordinates.length > 0) {
             // Calculate bounds dynamically from ALL points to allow 2-point or 4-point definitions
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

// Helper component
const GeofencePopup = ({ geo }: { geo: Geofence }) => (
    <Popup className="rounded-lg shadow-xl">
        <div className="p-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Geofence</span>
            <h3 className="font-bold text-slate-800">{geo.name}</h3>
            <p className="text-xs text-slate-600 mt-1">Scope: {geo.scope}</p>
            <p className="text-xs text-slate-400 capitalize">Type: {geo.shape_type}</p>
        </div>
    </Popup>
);
