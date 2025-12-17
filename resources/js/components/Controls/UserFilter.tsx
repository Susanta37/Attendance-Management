import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { UserLocation } from '@/types/tracking';

interface UserFilterProps {
  users: UserLocation[];
  selectedUserId: number | null;
  onSelectUser: (id: number | null) => void;
}

export const UserFilter: React.FC<UserFilterProps> = ({ users, selectedUserId, onSelectUser }) => {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">Field Staff</h2>
        <p className="text-xs text-slate-500 mt-1">Monitor live locations and geofence adherence.</p>

        {/* Search Input */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name or ID..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border-b border-slate-100">
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Active</span>
          <div className="text-xl font-bold text-green-600 flex items-center gap-1">
            {users.filter(u => u.status === 'inside').length} <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Anomalies</span>
          <div className="text-xl font-bold text-red-500 flex items-center gap-1">
            {users.filter(u => u.status === 'outside').length} <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No users found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            <button
              onClick={() => onSelectUser(null)}
              className={`w-full text-left px-5 py-3 text-sm font-medium hover:bg-slate-50 transition-colors ${selectedUserId === null ? 'text-orange-600 bg-orange-50' : 'text-slate-600'}`}
            >
              Show All Users
            </button>

            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 transition-all hover:bg-slate-50 border-l-4 ${
                  selectedUserId === user.id
                    ? 'bg-orange-50 border-orange-500'
                    : 'border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm ${
                    user.status === 'inside' ? 'bg-green-500' : user.status === 'outside' ? 'bg-red-500' : 'bg-slate-400'
                }`}>
                  {user.initials}
                </div>

                {/* Info */}
                <div className="text-left flex-1">
                  <h3 className="text-sm font-semibold text-slate-800">{user.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span>{user.status === 'inside' ? 'In Zone' : 'Out of Zone'}</span>
                    <span className="mx-1">•</span>
                    <span>{user.lastUpdated}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                {user.status === 'outside' && (
                  <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
