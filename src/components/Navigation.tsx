import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Bookmark, LifeBuoy, Plus, ShoppingBag } from 'lucide-react';
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
} from '../design-system/icons/OriginalIcons';
import { GlassCard } from '../design-system/components/GlassCard';

interface NavigationProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenCreatePost?: () => void;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onNavigate,
  onOpenCreatePost,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  onGoBack,
  canGoBack = false,
}) => {
  const { user } = useAuth();
  const { language, t, isBn } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 15) {
        // Near the top, always show bottom navigation
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling DOWN -> HIDE bottom navigation
        setIsVisible(false);
      } else {
        // Scrolling UP -> SHOW bottom navigation
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navItems = [
    { id: 'home', label: t('nav.home', 'Home'), icon: IconHome },
    { id: 'marketplace', label: isBn ? 'মার্কেটপ্লেস' : 'Marketplace', icon: ({ size, glow }: any) => <ShoppingBag className="w-5 h-5 text-amber-500" /> },
    { id: 'friends', label: t('nav.friends', 'Friends'), icon: IconFriends },
    { id: 'explore', label: t('nav.explore', 'Explore'), icon: IconExplore },
    { id: 'videos', label: t('nav.videos', 'Videos'), icon: IconVideos },
    { id: 'reels', label: t('nav.feels', 'FEELS'), icon: IconReels },
    { id: 'saved', label: t('nav.saved', 'Saved Posts'), icon: ({ size, glow }: any) => <Bookmark className="w-5 h-5" /> },
    { id: 'messenger', label: t('nav.messenger', 'Messages'), icon: IconMessages, badge: unreadMessagesCount },
    { id: 'notifications', label: t('nav.notifications', 'Notifications'), icon: IconNotifications, badge: unreadNotificationsCount },
    { id: 'groups', label: t('nav.groups', 'Groups'), icon: IconGroups },
    { id: 'pages', label: t('nav.pages', 'Pages'), icon: IconPages },
    { id: 'events', label: t('nav.events', 'Events'), icon: IconEvents },
    { id: 'support', label: t('nav.support', 'Help & Support'), icon: ({ size, glow }: any) => <LifeBuoy className="w-5 h-5" /> },
    { id: 'profile', label: t('nav.profile', 'Profile'), icon: IconProfile },
    { id: 'settings', label: t('nav.settings', 'Settings'), icon: IconSettings },
    ...(user?.role === 'admin'
      ? [
          {
            id: 'admin',
            label: isBn ? 'অ্যাডমিন CMS' : 'Admin CMS',
            icon: IconAdmin,
            badge: 'ROOT' as any,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Desktop Left Sidebar (Sticky Liquid Glass) */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 space-y-3">
          <GlassCard level={2} variant="frosted" className="p-2 space-y-0.5">
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {isBn ? 'মূল নেভিগেশন' : 'Main Realm'}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer group relative select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-transparent text-cyan-600 dark:text-cyan-400 shadow-sm border border-cyan-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Left Active Glow Bar */}
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

                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500 text-white shadow-md shadow-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </GlassCard>

          {/* Liquid Glass Badge footer */}
          <div className="px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
            <span>Privacy</span>
            <span>·</span>
            <span>Terms</span>
            <span>·</span>
            <span>Nixo Social © 2026</span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Sticky Liquid Glass Floating pill layout with scroll show/hide) */}
      <div className={`lg:hidden fixed left-2.5 right-2.5 sm:left-4 sm:right-4 max-w-md mx-auto z-40 transition-all duration-500 ease-in-out transform pb-safe ${
        isVisible ? 'bottom-1 sm:bottom-2 opacity-100 translate-y-0' : 'bottom-0 opacity-0 translate-y-24 pointer-events-none'
      }`}>
        <nav className="h-15 sm:h-16 liquid-glass-floating !bg-white/45 dark:!bg-slate-950/45 backdrop-blur-md rounded-[24px] sm:rounded-[28px] px-2 flex items-center justify-around select-none shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/40 dark:border-white/10">
          {/* 1. Dedicated Home Button */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`relative min-w-[52px] min-h-[46px] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'home'
                ? 'text-cyan-500 dark:text-cyan-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Home"
            title={language === 'bn' ? 'হোম' : 'Home'}
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300">
              <IconHome size={21} glow={activeTab === 'home'} />
            </div>
            <span className="text-[9px] font-semibold tracking-tight uppercase opacity-85">
              {language === 'bn' ? 'হোম' : 'Home'}
            </span>
            {activeTab === 'home' && (
              <span className="absolute -bottom-0.5 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-pulse" />
            )}
          </button>

          {/* 2. Explore */}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className={`relative min-w-[52px] min-h-[46px] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'explore'
                ? 'text-cyan-500 dark:text-cyan-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Explore"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300">
              <IconExplore size={21} glow={activeTab === 'explore'} />
            </div>
            <span className="text-[9px] font-semibold tracking-tight uppercase opacity-85">
              {language === 'bn' ? 'এক্সপ্লোর' : 'Explore'}
            </span>
            {activeTab === 'explore' && (
              <span className="absolute -bottom-0.5 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-pulse" />
            )}
          </button>

          {/* 3. Center Create Post (+) Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenCreatePost) {
                onOpenCreatePost();
              } else {
                onNavigate('home');
              }
            }}
            className="relative -top-2 flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform group"
            aria-label="Create Post"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-violet-500 p-0.5 shadow-lg shadow-cyan-500/40 border-2 border-white/60 dark:border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-slate-950/20 flex items-center justify-center text-white">
                <Plus size={24} className="stroke-[2.5]" />
              </div>
            </div>
            <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 tracking-tight uppercase mt-0.5">
              {language === 'bn' ? 'পোস্ট' : 'Post'}
            </span>
          </button>

          {/* 4. FEELS (Reels) */}
          <button
            type="button"
            onClick={() => onNavigate('reels')}
            className={`relative min-w-[52px] min-h-[46px] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'reels'
                ? 'text-cyan-500 dark:text-cyan-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="FEELS"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300">
              <IconReels size={21} glow={activeTab === 'reels'} />
            </div>
            <span className="text-[9px] font-semibold tracking-tight uppercase opacity-85">
              {language === 'bn' ? 'ফেইলস' : 'FEELS'}
            </span>
            {activeTab === 'reels' && (
              <span className="absolute -bottom-0.5 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-pulse" />
            )}
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`relative min-w-[52px] min-h-[46px] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'profile'
                ? 'text-cyan-500 dark:text-cyan-400 font-bold scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Profile"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl transition-all duration-300">
              <IconProfile size={21} glow={activeTab === 'profile'} />
            </div>
            <span className="text-[9px] font-semibold tracking-tight uppercase opacity-85">
              {language === 'bn' ? 'প্রোফাইল' : 'Profile'}
            </span>
            {activeTab === 'profile' && (
              <span className="absolute -bottom-0.5 w-6 h-1 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-pulse" />
            )}
          </button>
        </nav>
      </div>
    </>
  );
};
