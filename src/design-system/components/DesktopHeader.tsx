import React, { useState } from 'react';
import { useTheme } from '../ThemeContext';
import {
  IconSearch,
  IconNotifications,
  IconCoin,
  IconPlus,
  IconSun,
  IconMoon,
  IconCameraStory,
} from '../icons/OriginalIcons';
import { GlassButton } from './GlassButton';
import { NixLogo } from '../../components/NixLogo';

interface DesktopHeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onSearch: (query: string) => void;
  onOpenNotifications: () => void;
  onOpenCreatePost: () => void;
  onOpenCreateStory: () => void;
  onOpenAuth: () => void;
  unreadNotificationsCount?: number;
  user?: any;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  onNavigate,
  onSearch,
  onOpenNotifications,
  onOpenCreatePost,
  onOpenCreateStory,
  onOpenAuth,
  unreadNotificationsCount = 0,
  user,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchInput, setSearchInput] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#080d19] border-b border-slate-200/90 dark:border-white/10 transition-colors duration-200 pt-7 pb-3.5 sm:pt-9 sm:pb-4 min-h-[88px] sm:min-h-[96px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
        {/* ZONE 1: BRAND WORDMARK */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 group cursor-pointer focus-visible:outline-none"
            aria-label="NIX Home"
          >
            {/* Circular Floating Nix Logo */}
            <div className="group-hover:scale-105 transition-transform duration-300">
              <NixLogo size={34} floating={false} showBorder={true} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-slate-900 via-cyan-600 to-pink-600 dark:from-white dark:via-cyan-300 dark:to-pink-400 bg-clip-text text-transparent leading-none">
                NIX
              </span>
              <span className="text-[9px] tracking-widest uppercase font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                Nixo Social
              </span>
            </div>
          </button>
        </div>

        {/* ZONE 2: SEARCH INPUT */}
        <div className="hidden sm:flex flex-1 max-w-md mx-2">
          <form onSubmit={handleSubmitSearch} className="w-full relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search people, creators, tags & realms..."
              className="w-full bg-slate-100/80 dark:bg-[#111728]/70 border border-black/5 dark:border-white/10 text-slate-800 dark:text-slate-100 text-xs rounded-full pl-10 pr-10 py-2.5 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-md placeholder-slate-400"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IconSearch size={16} />
            </div>
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer text-xs"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* ZONE 3: ACTIONS & CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Coin Wallet Pill */}
          <button
            onClick={() => onNavigate('wallet')}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer group"
            title="Nixo Coin Wallet"
          >
            <IconCoin size={18} className="text-amber-500 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold font-mono tabular-nums">
              {user ? (user.coinsBalance || 0).toLocaleString() : '100'}
            </span>
          </button>

          {/* Persistent Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Open notifications"
          >
            <IconNotifications size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle light/dark theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <IconSun size={18} className="text-amber-400" /> : <IconMoon size={18} className="text-indigo-600" />}
          </button>

          {/* Create Button Dropdown */}
          <div className="relative">
            <GlassButton
              variant="primary"
              size="sm"
              leftIcon={<IconPlus size={16} />}
              onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
              className="hidden sm:inline-flex"
            >
              Create
            </GlassButton>

            {isCreateMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 dark:bg-[#121829]/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-2xl p-2 z-50 text-xs text-slate-700 dark:text-slate-200 space-y-1"
                onClick={() => setIsCreateMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    if (!user) onOpenAuth();
                    else onOpenCreatePost();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left font-medium cursor-pointer"
                >
                  <IconPlus size={16} className="text-cyan-500" />
                  <span>Create Post</span>
                </button>
                <button
                  onClick={() => {
                    if (!user) onOpenAuth();
                    else onOpenCreateStory();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left font-medium cursor-pointer"
                >
                  <IconCameraStory size={16} className="text-violet-500" />
                  <span>Share 24h Story</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar or Sign In */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="User profile menu"
              >
                <img
                  src={
                    user.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
                  }
                  alt={user.fullName || user.username}
                  className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400/50 shadow-sm"
                />
              </button>

              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-[#121829]/95 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-2xl p-2 z-50 text-xs text-slate-700 dark:text-slate-200"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/10 mb-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{user.fullName || user.username}</div>
                    <div className="text-[11px] text-slate-400 truncate">@{user.username}</div>
                  </div>
                  <button
                    onClick={() => onNavigate('profile')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={() => onNavigate('wallet')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Wallet & Rewards
                  </button>
                  <button
                    onClick={() => onNavigate('settings')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Settings & Privacy
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => onNavigate('admin')}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-500 font-medium hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      Admin Moderation Console
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <GlassButton variant="primary" size="sm" onClick={onOpenAuth}>
              Sign In
            </GlassButton>
          )}
        </div>
      </div>
    </header>
  );
};
