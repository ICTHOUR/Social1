import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { NotificationDrawer } from './NotificationDrawer';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../design-system/ThemeContext';
import {
  IconSearch,
  IconNotifications,
  IconCoin,
  IconSun,
  IconMoon,
  IconProfile,
  IconAdmin,
  IconHome,
  IconFriends,
  IconExplore,
  IconVideos,
  IconReels,
  IconMessages,
  IconGroups,
  IconPages,
  IconEvents,
  IconSettings,
} from '../design-system/icons/OriginalIcons';
import {
  Menu,
  ArrowLeft,
  X,
  Zap,
  Bookmark,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Shield,
  Sparkles,
  Search,
  Globe,
  Mic,
  ShoppingBag,
} from 'lucide-react';
import { GlassButton } from '../design-system/components/GlassButton';
import { NixLogo } from './NixLogo';

interface HeaderProps {
  onNavigate: (tab: string) => void;
  activeTab: string;
  onSearch?: (query: string) => void;
  onOpenAuth: () => void;
  onOpenRecharge?: () => void;
  onOpenCreatePost?: () => void;
  onOpenCreateStory?: () => void;
  onOpenVoiceSearch?: () => void;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  onUnreadCountChange?: (count: number) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  activeTab,
  onSearch,
  onOpenAuth,
  onOpenRecharge,
  onOpenCreatePost,
  onOpenCreateStory,
  onOpenVoiceSearch,
  unreadNotificationsCount,
  unreadMessagesCount = 0,
  onUnreadCountChange,
  onGoBack,
  canGoBack = false,
}) => {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Menu Drawer State (Triggered by menu icon to the left of the logo)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Search Modal State (Triggered by search icon button)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Header Dropdowns & Drawers
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(unreadNotificationsCount ?? 0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Close profile menu when clicking outside or when scrolling
  useEffect(() => {
    const handleOutsideClickOrScroll = (event: Event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    const handleScroll = () => {
      setShowProfileMenu(false);
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleOutsideClickOrScroll, true);
      document.addEventListener('touchstart', handleOutsideClickOrScroll, true);
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClickOrScroll, true);
      document.removeEventListener('touchstart', handleOutsideClickOrScroll, true);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    if (unreadNotificationsCount !== undefined) {
      setUnreadCount(unreadNotificationsCount);
    }
  }, [unreadNotificationsCount]);

  // Focus input automatically when search modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      // Fetch recent searches
      fetch('/api/search/recent', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : { recent: [] }))
        .then((data) => setRecentSearches(data.recent || []))
        .catch(() => {});

      // Fetch trending search keywords
      fetch('/api/search/trending-queries')
        .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : { trending: [] }))
        .then((data) => setTrendingQueries(data.trending || []))
        .catch(() => {});
    }
  }, [isSearchModalOpen, token]);

  // Debounced autocomplete as user types
  useEffect(() => {
    if (!searchQuery.trim() || !isSearchModalOpen) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setAutocompleteSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchModalOpen]);

  // Handle escape key to close modals/drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchModalOpen(false);
        setIsMenuOpen(false);
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectQuery = (q: string) => {
    setSearchQuery(q);
    setIsSearchModalOpen(false);
    if (onSearch) {
      onSearch(q);
    } else {
      onNavigate('explore');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchModalOpen(false);
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        onNavigate('explore');
      }
    }
  };

  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch(`/api/search/recent/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllRecent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch('/api/search/recent', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentSearches([]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: AppNotification[] = data.notifications || [];
        setUnreadCount(list.filter((n) => !n.isRead).length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, token]);

  // Navigation Items for the Left Menu Drawer
  const menuNavSections = [
    {
      title: language === 'bn' ? 'মূল নেভিগেশন' : 'Main Realm',
      items: [
        { id: 'home', label: t('nav.home', 'Home'), icon: IconHome },
        { id: 'marketplace', label: language === 'bn' ? 'মার্কেটপ্লেস' : 'Marketplace', icon: ({ size }: any) => <ShoppingBag className="w-5 h-5 text-amber-500" /> },
        { id: 'explore', label: t('nav.explore', 'Explore'), icon: IconExplore },
        { id: 'reels', label: t('nav.feels', 'FEELS'), icon: IconReels },
        { id: 'videos', label: t('nav.videos', 'Videos'), icon: IconVideos },
        { id: 'friends', label: t('nav.friends', 'Friends'), icon: IconFriends },
        { id: 'messenger', label: t('nav.messenger', 'Messages'), icon: IconMessages },
        { id: 'notifications', label: t('nav.notifications', 'Notifications'), icon: IconNotifications, badge: unreadCount },
      ],
    },
    {
      title: language === 'bn' ? 'ক্রিয়েটর ও ট্রেজারি' : 'Creator & Treasury',
      items: [
        { id: 'dashboardPro', label: t('nav.dashboardPro', 'Dashboard Pro'), icon: IconCoin, isPro: true, badge: 'PRO' },
        { id: 'wallet', label: t('nav.wallet', 'Wallet & Coins'), icon: IconCoin },
      ],
    },
    {
      title: language === 'bn' ? 'সোশ্যাল স্পেস' : 'Social Spaces',
      items: [
        { id: 'groups', label: t('nav.groups', 'Groups / Communities'), icon: IconGroups },
        { id: 'pages', label: t('nav.pages', 'Pages'), icon: IconPages },
        { id: 'events', label: t('nav.events', 'Events'), icon: IconEvents },
        { id: 'saved', label: t('nav.saved', 'Saved Posts'), icon: ({ size }: any) => <Bookmark className="w-5 h-5" /> },
      ],
    },
    {
      title: language === 'bn' ? 'সেটিংস ও সাপোর্ট' : 'Preferences & Support',
      items: [
        { id: 'profile', label: t('nav.profile', 'My Profile'), icon: IconProfile },
        { id: 'settings', label: t('nav.settings', 'Settings'), icon: IconSettings },
        { id: 'support', label: t('nav.support', 'Help & Support'), icon: ({ size }: any) => <LifeBuoy className="w-5 h-5" /> },
        ...(user?.role === 'admin' ? [{ id: 'admin', label: t('nav.admin', 'Admin Console'), icon: IconAdmin }] : []),
      ],
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#080d1a] border-b border-slate-200/90 dark:border-slate-800/80 border-t-0 border-x-0 px-4 pt-8 pb-3.5 sm:pt-10 sm:pb-4 min-h-[88px] sm:min-h-[96px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* ZONE 1: MENU ICON & BRAND LOGO */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Menu Icon Button (Placed strictly to the left of the logo) */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center bg-slate-100 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-800 hover:text-cyan-600 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/10 dark:text-white transition-all cursor-pointer group active:scale-95 shadow-xs"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-slate-800 group-hover:text-cyan-600 dark:text-white group-hover:scale-110 transition-transform" />
            </button>

            {/* Circular Floating App Logo with Border */}
            <div
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
              title="NIX Social Home"
            >
              {/* Circular Cropped Floating Logo with Sleek Gradient Rim */}
              <div className="relative group-hover:scale-105 transition-transform duration-300">
                <NixLogo size={34} floating={false} showBorder={true} />
              </div>

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-slate-900 via-cyan-600 to-pink-600 dark:from-white dark:via-cyan-300 dark:to-pink-400 bg-clip-text text-transparent leading-none">
                    NIXO
                  </h1>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-black border border-amber-500/30">
                    $
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-0.5">
                  Nixo Social
                </p>
              </div>
            </div>
          </div>

          {/* ZONE 2: RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center bg-slate-100/90 hover:bg-cyan-50 border border-slate-200/90 hover:border-cyan-300 text-slate-800 hover:text-cyan-600 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white transition-all cursor-pointer relative active:scale-95 shadow-xs group"
              aria-label="Search"
              title="Search people, tags, discussions..."
            >
              <IconSearch size={16} className="text-slate-800 group-hover:text-cyan-600 dark:text-white transition-colors" />
            </button>

            {/* Messages / Chat Button in Header */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => onNavigate('messenger')}
                  className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs active:scale-95 group ${
                    activeTab === 'messenger'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-100/90 hover:bg-cyan-50 border-slate-200/90 hover:border-cyan-300 text-slate-800 hover:text-cyan-600 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white'
                  }`}
                  title={language === 'bn' ? 'মেসেজসমূহ' : 'Messages'}
                  aria-label="Open messages"
                >
                  <IconMessages
                    size={18}
                    glow={activeTab === 'messenger'}
                    className={activeTab === 'messenger' ? 'text-white' : 'text-slate-800 group-hover:text-cyan-600 dark:text-white transition-colors'}
                  />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse shadow-md border-2 border-white dark:border-slate-900">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              </div>
            ) : null}

            {user ? (
              <>
                {/* Persistent Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotifDrawerOpen((prev) => !prev)}
                    className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center border transition-all cursor-pointer relative shadow-xs active:scale-95 group ${
                      isNotifDrawerOpen
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-100/90 hover:bg-cyan-50 border-slate-200/90 hover:border-cyan-300 text-slate-800 hover:text-cyan-600 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/15 dark:text-white'
                    }`}
                    title="Notifications"
                    aria-label="Open notifications"
                    aria-expanded={isNotifDrawerOpen}
                  >
                    <IconNotifications
                      size={18}
                      glow={isNotifDrawerOpen}
                      className={isNotifDrawerOpen ? 'text-white' : 'text-slate-800 group-hover:text-cyan-600 dark:text-white transition-colors'}
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-pulse shadow-md border-2 border-white dark:border-slate-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <NotificationDrawer
                    isOpen={isNotifDrawerOpen}
                    onClose={() => setIsNotifDrawerOpen(false)}
                    onUnreadCountChange={(c) => {
                      setUnreadCount(c);
                      if (onUnreadCountChange) onUnreadCountChange(c);
                    }}
                    onNavigate={onNavigate}
                  />
                </div>

                {/* User Avatar Menu */}
                <div className="relative">
                  <button
                    ref={profileButtonRef}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-0.5 rounded-full border-2 border-cyan-500/50 hover:border-cyan-400 ring-2 ring-cyan-500/10 hover:ring-cyan-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
                    aria-label="User profile menu"
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </button>

                  {showProfileMenu && (
                    <div
                      ref={profileMenuRef}
                      className="absolute right-0 mt-2 w-64 rounded-3xl bg-white dark:bg-[#121829] backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 p-2.5 shadow-2xl z-50 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="p-2.5 border-b border-black/5 dark:border-white/10 mb-1.5">
                        <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{user.fullName}</p>
                        <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                        {user.badge && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                            {user.badge}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate('admin');
                              setShowProfileMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer text-left font-black border border-cyan-500/30 shadow-xs mb-1"
                          >
                            <div className="flex items-center gap-2.5">
                              <Shield size={16} className="text-cyan-500" />
                              <span>{language === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'Admin CMS Dashboard'}</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black">
                              ROOT
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onNavigate(`profile`);
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-cyan-50/80 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer text-left font-medium"
                        >
                          <IconProfile size={16} className="text-cyan-600 dark:text-cyan-400" />
                          <span>{t('nav.profile', 'Profile Page')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('dashboardPro');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-purple-500/10 hover:from-amber-500/25 hover:to-purple-500/20 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer text-left font-bold border border-amber-500/20 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <Zap size={16} className="text-amber-500 fill-amber-500/20" />
                            <span>{t('nav.dashboardPro', 'Dashboard Pro')}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black">
                            PRO
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('settings');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-left font-medium"
                        >
                          <IconSettings size={16} className="text-slate-600 dark:text-slate-400" />
                          <span>{t('nav.settings', 'Settings')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('marketplace');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50/80 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer text-left font-medium"
                        >
                          <ShoppingBag className="w-4 h-4 text-amber-500" />
                          <span>{language === 'bn' ? 'মার্কেটপ্লেস' : 'Marketplace'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onNavigate('wallet');
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer text-left font-medium"
                        >
                          <IconCoin size={16} className="text-amber-500" />
                          <span>{t('profile.wallet', 'Wallet & Coins')}</span>
                        </button>

                        {/* Dedicated Theme Switcher inside Profile Menu */}
                        <div className="p-2 border-t border-slate-200/80 dark:border-white/10 my-1 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {theme === 'dark' ? (
                              <IconSun size={15} className="text-amber-400" />
                            ) : (
                              <IconMoon size={15} className="text-cyan-600" />
                            )}
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              {language === 'bn' ? 'থিম মোড' : 'Theme Mode'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTheme();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/15 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                          >
                            <span>{theme === 'dark' ? (language === 'bn' ? '☀️ লাইট মোড' : '☀️ Light') : (language === 'bn' ? '🌙 ডার্ক মোড' : '🌙 Dark')}</span>
                          </button>
                        </div>

                        {/* Dedicated Language Switcher inside Profile Menu */}
                        <div className="p-2 border-b border-slate-200/80 dark:border-white/10 mb-1 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe size={15} className="text-cyan-600 dark:text-cyan-400" />
                            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                              {language === 'en' ? 'Language' : 'ভাষা'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLanguage();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                            title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
                          >
                            <span>{language === 'en' ? 'বাংলা (BN)' : 'English (EN)'}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setShowProfileMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer font-bold text-left"
                        >
                          <LogOut size={15} />
                          <span>{t('profile.signOut', 'Sign Out')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <GlassButton variant="primary" size="sm" onClick={onOpenAuth}>
                Sign In
              </GlassButton>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 1. SLIDE-OUT NAVIGATION MENU DRAWER                      */}
      {/* Triggered by the Menu Icon to the left of the logo       */}
      {/* ======================================================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/30 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#080d1a] backdrop-blur-2xl border-r border-slate-200 dark:border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <NixLogo size={34} floating={false} showBorder={true} />
                <div>
                  <h2 className="font-black text-sm text-slate-900 dark:text-white">NIX Social</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Navigation Menu</p>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card in Drawer */}
            {user ? (
              <div
                onClick={() => {
                  onNavigate('profile');
                  setIsMenuOpen(false);
                }}
                className="p-3 mx-3 my-2.5 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 flex items-center gap-3 cursor-pointer hover:border-cyan-500/30 transition-all group"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {user.fullName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-[10px] font-black text-amber-500">
                      {user.coinsBalance?.toLocaleString() || 0} Coins
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold uppercase">
                      PRO
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors shrink-0" />
              </div>
            ) : (
              <div className="p-4 mx-3 my-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center space-y-2">
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Join the Nixo Realm</p>
                <GlassButton
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAuth();
                  }}
                >
                  Sign In / Register
                </GlassButton>
              </div>
            )}

            {/* Scrollable Navigation Sections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-none">
              {menuNavSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {section.title}
                  </div>
                  {section.items.map((item: any) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none text-left ${
                          item.isPro
                            ? isActive
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-bold'
                              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
                            : isActive
                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              item.isPro
                                ? 'text-amber-500'
                                : isActive
                                ? 'text-cyan-500 dark:text-cyan-400'
                                : 'text-slate-400'
                            }
                          >
                            <Icon size={18} />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge !== 0 && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                              item.badge === 'PRO'
                                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm shadow-amber-500/30'
                                : 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drawer Footer with Theme / Language toggles & Sign Out */}
            <div className="p-3 border-t border-black/5 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2 bg-black/5 dark:bg-white/5 p-2 rounded-2xl">
                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white dark:bg-white/10 text-slate-800 dark:text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  {theme === 'dark' ? (
                    <>
                      <IconSun size={14} className="text-amber-400" />
                      <span>{language === 'bn' ? 'লাইট মোড' : 'Light Mode'}</span>
                    </>
                  ) : (
                    <>
                      <IconMoon size={14} className="text-cyan-600" />
                      <span>{language === 'bn' ? 'ডার্ক মোড' : 'Dark Mode'}</span>
                    </>
                  )}
                </button>

                {/* Language Toggle */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Globe size={14} />
                  <span>{language === 'en' ? 'বাংলা (BN)' : 'English (EN)'}</span>
                </button>
              </div>

              {user && (
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === 'bn' ? 'লগআউট করুন' : 'Log Out of NIXO'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FLOATING SEARCH MODAL                                 */}
      {/* Triggered by the search icon button                      */}
      {/* ======================================================== */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 dark:bg-black/60 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 px-4 animate-fadeIn">
          {/* Backdrop dismiss */}
          <div className="fixed inset-0" onClick={() => setIsSearchModalOpen(false)} />

          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#0c1322] backdrop-blur-2xl border border-slate-200/90 dark:border-white/15 p-4 shadow-2xl space-y-3 z-10 animate-in zoom-in-95 duration-200">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <div className="absolute left-4 pointer-events-none text-slate-400">
                <IconSearch size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people, tags, discussions, Feels..."
                className="w-full h-12 pl-12 pr-20 bg-black/5 dark:bg-white/5 focus:bg-white dark:focus:bg-[#080d1a] border border-black/10 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {onOpenVoiceSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      onOpenVoiceSearch();
                    }}
                    className="p-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 cursor-pointer transition-colors"
                    title="Speak Voice Command or Query"
                  >
                    <Mic size={15} />
                  </button>
                )}
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-200 text-xs p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSearchModalOpen(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </form>

            {/* Suggestions Populated List */}
            {autocompleteSuggestions.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 px-2 tracking-wider">
                  Suggestions
                </p>
                {autocompleteSuggestions.slice(0, 5).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuery(item.text || item.username || item)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-500 flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
                  >
                    <IconSearch size={14} className="text-slate-400" />
                    <span>{item.text || item.fullName || item.username || item}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {autocompleteSuggestions.length === 0 && recentSearches.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between px-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span>Recent Searches</span>
                  <button
                    onClick={handleClearAllRecent}
                    className="text-cyan-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                {recentSearches.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectQuery(rec.query)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <IconSearch size={13} className="text-slate-400" />
                      {rec.query}
                    </span>
                    <button
                      onClick={(e) => handleDeleteRecent(e, rec.id)}
                      className="text-slate-400 hover:text-rose-400 text-xs p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Trending Queries */}
            {autocompleteSuggestions.length === 0 && trendingQueries.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/10">
                <p className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400 px-2 tracking-wider">
                  Trending Topics
                </p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {trendingQueries.slice(0, 6).map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectQuery(query)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      #{query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard Hint */}
            <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 px-2">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Enter</kbd> to search</span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
