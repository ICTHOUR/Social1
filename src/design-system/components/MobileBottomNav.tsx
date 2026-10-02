import React from 'react';
import { IconHome, IconExplore, IconReels, IconMessages, IconProfile } from '../icons/OriginalIcons';

interface MobileBottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  unreadMessagesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onNavigate,
  unreadMessagesCount = 0,
}) => {
  const TABS = [
    { id: 'home', label: 'Home', icon: IconHome },
    { id: 'explore', label: 'Explore', icon: IconExplore },
    { id: 'reels', label: 'FEELS', icon: IconReels },
    { id: 'messenger', label: 'Messages', icon: IconMessages, badge: unreadMessagesCount },
    { id: 'profile', label: 'Profile', icon: IconProfile },
  ];

  return (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-auto">
      <nav className="h-16 bg-white/75 dark:bg-[#070b16]/75 backdrop-blur-lg rounded-[24px] px-3 flex items-center justify-around select-none shadow-xl border border-white/20 dark:border-white/10">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative min-w-[56px] min-h-[46px] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-cyan-500 dark:text-cyan-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              aria-label={tab.label}
            >
              <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300">
                <Icon size={21} glow={isActive} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center shadow-lg shadow-rose-500/35 border border-white/20">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-semibold tracking-tight uppercase opacity-85">{tab.label}</span>

              {isActive && (
                <span className="absolute -bottom-0.5 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
