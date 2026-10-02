import React from 'react';
import { IconNotifications, IconCoin, IconSearch } from '../icons/OriginalIcons';
import { useTheme } from '../ThemeContext';
import { NixLogo } from '../../components/NixLogo';

interface MobileTopBarProps {
  onNavigate: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  coinsBalance?: number;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onNavigate,
  onOpenNotifications,
  onOpenSearch,
  unreadCount = 0,
  coinsBalance = 0,
}) => {
  const { theme } = useTheme();

  return (
    <div className="lg:hidden sticky top-0 z-30 min-h-16 pt-3 pb-2 w-full bg-white dark:bg-[#070b16] backdrop-blur-xl border-b border-slate-200/90 dark:border-white/10 px-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
      {/* Brand logo & title */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2.5 text-left cursor-pointer group"
        aria-label="NIX Home"
      >
        <NixLogo size={32} floating={false} showBorder={true} />
        <span className="font-black text-lg tracking-tight bg-gradient-to-r from-slate-900 via-cyan-600 to-pink-600 dark:from-white dark:via-cyan-300 dark:to-pink-400 bg-clip-text text-transparent">
          NIX
        </span>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Search"
        >
          <IconSearch size={18} />
        </button>

        <button
          onClick={() => onNavigate('wallet')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold"
          title="Wallet"
        >
          <IconCoin size={15} />
          <span className="font-mono">{coinsBalance > 9999 ? '9.9k+' : coinsBalance}</span>
        </button>

        <button
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Notifications"
        >
          <IconNotifications size={19} />
          {unreadCount > 0 && (
            <span className="absolute 1 top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </div>
    </div>
  );
};
