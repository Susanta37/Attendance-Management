export interface UserLocation {
  id: number;
  name: string;
  initials: string;
  role: string; // e.g., 'Field Officer'
  lat: number;
  lng: number;
  status: 'inside' | 'outside' | 'inactive';
  lastUpdated: string;
  avatarUrl?: string;
}

export interface Geofence {
  id: number;
  userId: number; // Linked to specific user
  name: string;
  lat: number;
  lng: number;
  radius: number; // meters
  scope: string; // e.g. 'Bhubaneswar Block A'
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  relatedUserId?: number; // Clicking zooms to this user
  isRead: boolean;
  type: 'alert' | 'info';
}
