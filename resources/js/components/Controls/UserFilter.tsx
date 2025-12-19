import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { UserLocation } from '@/types/tracking';
import { useTranslation } from '@/hooks/use-translation';

interface UserFilterProps {
  users: UserLocation[];
  selectedUserId: number | null;
  onSelectUser: (id: number | null) => void;
}

export const UserFilter: React.FC<UserFilterProps> = ({ users, selectedUserId, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('field_staff')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('monitor_desc')}</p>

        {/* Search Input */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={t('search_placeholder_id')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-zinc-800">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{t('active')}</span>
          <div className="text-xl font-bold text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
            {users.filter(u => u.status === 'inside').length} <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{t('anomalies')}</span>
          <div className="text-xl font-bold text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
            {users.filter(u => u.status === 'outside').length} <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2">
            <Search className="w-8 h-8 opacity-50" />
            {t('no_users_found')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            
            {/* Show All Button */}
            <button
              onClick={() => onSelectUser(null)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-200 
                ${selectedUserId === null 
                  ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900 border-l-4 border-transparent'
                }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${selectedUserId === null ? 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'}`}>
                <Users size={16} />
              </div>
              {t('show_all_users')}
            </button>

            {/* Individual Users */}
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 transition-all duration-200 border-l-4 text-left group
                  ${selectedUserId === user.id
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-500'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                  }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm ring-2 ring-white dark:ring-zinc-800 ${
                  user.status === 'inside' 
                    ? 'bg-green-500 dark:bg-green-600' 
                    : user.status === 'outside' 
                      ? 'bg-red-500 dark:bg-red-600' 
                      : 'bg-slate-400 dark:bg-slate-600'
                }`}>
                  {user.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold truncate ${selectedUserId === user.id ? 'text-orange-900 dark:text-orange-100' : 'text-slate-800 dark:text-slate-200'}`}>
                    {user.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <MapPin className={`w-3 h-3 ${user.status === 'inside' ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="truncate">{user.status === 'inside' ? t('in_zone') : t('out_of_zone')}</span>
                    <span className="mx-1 opacity-50">•</span>
                    <span className="whitespace-nowrap opacity-75">{user.lastUpdated}</span>
                  </div>
                </div>

                {/* Status Indicator (Pulse) */}
                {user.status === 'outside' && (
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 animate-pulse shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};