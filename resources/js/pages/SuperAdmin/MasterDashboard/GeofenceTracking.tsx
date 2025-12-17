import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Bell, LayoutGrid, Maximize2, Minus, Plus } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { TrackingMap } from '@/components/Map/TrackingMap';
import { UserFilter } from '@/components/Controls/UserFilter';
import { UserLocation, Geofence, Notification } from '@/types/tracking';

interface PageProps {
    users: UserLocation[];
    geofences: Geofence[];
    notifications: Notification[];
}

export default function GeofenceTracking({
    users: serverUsers,
    geofences: serverGeofences,
    notifications: serverNotifications
}: PageProps) {

    // State - Initialize with Server Data
    const [users, setUsers] = useState<UserLocation[]>(serverUsers);
    const [geofences, setGeofences] = useState<Geofence[]>(serverGeofences);
    const [notifications, setNotifications] = useState<Notification[]>(serverNotifications);

    // ✅ UPDATED: Default Center set to Kendrapada, Odisha
    const DEFAULT_CENTER: [number, number] = [20.5035, 86.4199];

    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // Derived state
    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        setUsers(serverUsers);
        setGeofences(serverGeofences);
        setNotifications(serverNotifications);
    }, [serverUsers, serverGeofences, serverNotifications]);

    const handleUserSelect = (id: number | null) => {
        setSelectedUserId(id);
        if (id === null) {
            setMapCenter(DEFAULT_CENTER);
            setMapZoom(12);
        } else {
            const user = users.find(u => u.id === id);
            if (user) {
                setMapCenter([user.lat, user.lng]);
                setMapZoom(16);
            }
        }
    };

    const handleNotificationAction = (notif: Notification) => {
        if (notif.relatedUserId) {
            handleUserSelect(notif.relatedUserId);
            setIsNotifOpen(false);
        }
    };

    return (
        <AppLayout title="Live Geofencing">
            <Head title="Live Tracking" />

            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 relative">

                {/* LEFT PANEL */}
                <div className="w-80 h-full flex-shrink-0 z-20">
                    <UserFilter
                        users={users}
                        selectedUserId={selectedUserId}
                        onSelectUser={handleUserSelect}
                    />
                </div>

                {/* RIGHT PANEL */}
                <div className="flex-1 relative h-full">

                    {/* Top Overlay Bar */}
                    <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm border border-slate-200 pointer-events-auto">
                            <h1 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-orange-500" />
                                Live Tracking Dashboard
                                <span className="text-slate-300">|</span>
                                {/* ✅ UPDATED: Label changed to Kendrapada Region */}
                                <span className="text-slate-500 font-normal">Kendrapada Region</span>
                            </h1>
                        </div>

                        {/* Notification Bell */}
                        <div className="pointer-events-auto relative">
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="bg-white p-2.5 rounded-full shadow-md border border-slate-200 hover:bg-slate-50 transition-colors relative"
                            >
                                <Bell className="w-5 h-5 text-slate-600" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {isNotifOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-700">Notifications</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400">No new alerts</div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${!notif.isRead ? 'bg-orange-50/30' : ''}`} onClick={() => handleNotificationAction(notif)}>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="text-sm font-semibold text-slate-800">{notif.title}</h4>
                                                        <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                                                    {notif.relatedUserId && (
                                                        <button className="mt-2 text-xs text-orange-600 font-medium hover:underline flex items-center gap-1">
                                                            <Maximize2 className="w-3 h-3" /> View on Map
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <TrackingMap
                        users={users}
                        geofences={geofences}
                        selectedUserId={selectedUserId}
                        mapCenter={mapCenter}
                        mapZoom={mapZoom}
                        onUserClick={handleUserSelect}
                    />

                    {/* Zoom Controls */}
                    <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
                        <button className="bg-white p-2 rounded shadow border border-slate-200 hover:bg-slate-50 text-slate-600" onClick={() => setMapZoom(z => z + 1)}>
                            <Plus className="w-5 h-5" />
                        </button>
                        <button className="bg-white p-2 rounded shadow border border-slate-200 hover:bg-slate-50 text-slate-600" onClick={() => setMapZoom(z => z - 1)}>
                            <Minus className="w-5 h-5" />
                        </button>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}
