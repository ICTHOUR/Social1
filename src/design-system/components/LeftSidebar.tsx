import React from 'react';
import {
  IconHome,
  IconFriends,
  IconExplore,
  IconVideos,
  IconReels,
  IconMessages,
  IconNotifications,
  IconGroups,
  IconPages,
  IconEvents,
  IconProfile,
  IconSettings,
  IconAdmin,
  IconCoin,
} from '../icons/OriginalIcons';
import { GlassCard } from './GlassCard';

interface LeftSidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
  isAdmin?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onNavigate,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0,
  isAdmin = false,
}) => {
  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: IconHome },
    { id: 'friends', label: 'Friends', icon: IconFriends },
    { id: 'explore', label: 'Explore', icon: IconExplore },
    { id: 'videos', label: 'Videos', icon: IconVideos },
    { id: 'reels', label: 'FEELS', icon: IconReels },
    { id: 'dashboardPro', label: 'Dashboard Pro', icon: IconCoin, badge: 'PRO' },
    { id: 'messenger', label: 'Messages', icon: IconMessages, badge: unreadMessagesCount },
    { id: 'notifications', label: 'Notifications', icon: IconNotifications, badge: unreadNotificationsCount },
    { id: 'groups', label: 'Groups', icon: IconGroups },
    { id: 'pages', label: 'Pages', icon: IconPages },
    { id: 'events', label: 'Events', icon: IconEvents },
    { id: 'profile', label: 'Profile', icon: IconProfile },
    { id: 'settings', label: 'Settings', icon: IconSettings },
  ];

  if (isAdmin) {
    NAV_ITEMS.push({ id: 'admin', label: 'Admin Console', icon: IconAdmin });
  }

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 space-y-3">
        <GlassCard variant="surface" className="p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-transparent text-cyan-600 dark:text-cyan-400 shadow-sm border border-cyan-500/20 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && (
                  <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-cyan-500 shadow-[0_0_8px_#06B6D4]" />
                )}

                <div className="flex items-center gap-3">
                  <span
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon size={19} glow={isActive} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge !== 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                      item.badge === 'PRO'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </GlassCard>

        {/* Quiet Brand Legal / Links */}
        <div className="px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Terms</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Cookies</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">Nixo Social © 2026</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
