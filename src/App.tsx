import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationHistoryContext';
import { LanguageProvider } from './context/LanguageContext';
import { TypographyProvider } from './context/TypographyContext';
import { ThemeProvider } from './design-system/ThemeContext';
import { ToastProvider, useToast } from './design-system/ToastContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { GestureBackOverlay } from './components/navigation/GestureBackOverlay';
import { RightSidebar } from './components/RightSidebar';
import { SocialFeed } from './components/SocialFeed';
import { CreatePostModal } from './components/CreatePostModal';
import { CameraStoryModal } from './components/CameraStoryModal';
import { GiftModal } from './components/GiftModal';
import { CoinPurchaseModal } from './components/CoinPurchaseModal';
import { GiftCelebrationOverlay, LiveGiftEvent } from './components/GiftCelebrationOverlay';
import { AuthModal } from './components/AuthModal';
import { VoiceSearchModal } from './components/voice/VoiceSearchModal';
import { LiquidBackground } from './design-system/components/LiquidBackground';
import { AppNotification } from './types';
import { Sparkles } from 'lucide-react';
import { notificationAudio } from './utils/notificationSound';
import { pushManager } from './utils/pushManager';
import { getApiBaseUrl } from './services/nativeInit';
import { getSocket } from './services/socket';

// Lazy load heavy page views for elite frontend bundle optimization and code-splitting
const ReelsViewer = lazy(() => import('./components/ReelsViewer').then(m => ({ default: m.ReelsViewer })));
const MessengerView = lazy(() => import('./components/MessengerView').then(m => ({ default: m.MessengerView })));
const WalletView = lazy(() => import('./components/WalletView').then(m => ({ default: m.WalletView })));
const CommunitiesView = lazy(() => import('./components/CommunitiesView').then(m => ({ default: m.CommunitiesView })));
const ExploreView = lazy(() => import('./components/ExploreView').then(m => ({ default: m.ExploreView })));
const UserProfileView = lazy(() => import('./components/UserProfileView').then(m => ({ default: m.UserProfileView })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const FriendsView = lazy(() => import('./components/FriendsView').then(m => ({ default: m.FriendsView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const PagesEventsView = lazy(() => import('./components/PagesEventsView').then(m => ({ default: m.PagesEventsView })));
const VideosView = lazy(() => import('./components/VideosView').then(m => ({ default: m.VideosView })));
const NotificationCenterView = lazy(() => import('./components/NotificationCenterView').then(m => ({ default: m.NotificationCenterView })));
const HelpSupportView = lazy(() => import('./components/HelpSupportView').then(m => ({ default: m.HelpSupportView })));
const DashboardPro = lazy(() => import('./components/DashboardPro').then(m => ({ default: m.DashboardPro })));
const MarketplaceView = lazy(() => import('./components/marketplace/MarketplaceView').then(m => ({ default: m.MarketplaceView })));

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      <span className="text-[11px] font-bold text-slate-400">Loading premium view...</span>
    </div>
  }>
    {children}
  </Suspense>
);

const MainLayout: React.FC = () => {
  const { user, token, refreshUser, isLoading } = useAuth();
  const [adminViewMode, setAdminViewModeState] = useState<'admin' | 'user'>(() => {
    return (localStorage.getItem('nixo_admin_view_mode') as 'admin' | 'user') || 'admin';
  });

  const setAdminViewMode = (mode: 'admin' | 'user') => {
    setAdminViewModeState(mode);
    localStorage.setItem('nixo_admin_view_mode', mode);
  };
  const { addToast } = useToast();
  const {
    activeTab,
    selectedProfileUserId,
    targetChatPartnerId,
    canGoBack,
    navigateTo,
    navigateToProfile,
    navigateToChat,
    goBack,
    registerModal,
    getSavedScrollPosition,
  } = useNavigation();

  // Instantaneous Scroll Restoration without animated slide from top
  const prevTabRef = useRef(activeTab);
  useLayoutEffect(() => {
    if (activeTab === 'home' && prevTabRef.current !== 'home') {
      const savedY = getSavedScrollPosition('home');
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
      
      const applyScroll = () => {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      };

      applyScroll();
      requestAnimationFrame(() => {
        applyScroll();
        requestAnimationFrame(() => {
          applyScroll();
          setTimeout(applyScroll, 30);
          setTimeout(applyScroll, 80);
          setTimeout(applyScroll, 160);
        });
      });
    }
    prevTabRef.current = activeTab;
  }, [activeTab, getSavedScrollPosition]);

  const [searchQuery, setSearchQuery] = useState('');

  // Real-time notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Modals
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCoinPurchaseOpen, setIsCoinPurchaseOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [giftModalState, setGiftModalState] = useState<{
    isOpen: boolean;
    postId?: string;
    commentId?: string;
    receiverId?: string;
    receiverName?: string;
  }>({ isOpen: false });
  const [liveGiftCelebration, setLiveGiftCelebration] = useState<LiveGiftEvent | null>(null);

  // Global Body Scroll Lock when any modal or popup is open
  const isAnyModalOpen =
    isCreatePostOpen ||
    isCreateStoryOpen ||
    isAuthOpen ||
    isCoinPurchaseOpen ||
    isVoiceSearchOpen ||
    giftModalState.isOpen ||
    Boolean(liveGiftCelebration);

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Register active modals with the back navigation stack
  useEffect(() => {
    if (isCreatePostOpen) {
      return registerModal('createPost', () => setIsCreatePostOpen(false));
    }
  }, [isCreatePostOpen, registerModal]);

  useEffect(() => {
    if (isVoiceSearchOpen) {
      return registerModal('voiceSearch', () => setIsVoiceSearchOpen(false));
    }
  }, [isVoiceSearchOpen, registerModal]);

  useEffect(() => {
    if (isCreateStoryOpen) {
      return registerModal('createStory', () => setIsCreateStoryOpen(false));
    }
  }, [isCreateStoryOpen, registerModal]);

  useEffect(() => {
    if (isCoinPurchaseOpen) {
      return registerModal('coinPurchase', () => setIsCoinPurchaseOpen(false));
    }
  }, [isCoinPurchaseOpen, registerModal]);

  useEffect(() => {
    if (giftModalState.isOpen) {
      return registerModal('giftModal', () => setGiftModalState({ isOpen: false }));
    }
  }, [giftModalState.isOpen, registerModal]);

  useEffect(() => {
    if (isAuthOpen) {
      return registerModal('authModal', () => setIsAuthOpen(false));
    }
  }, [isAuthOpen, registerModal]);

  useEffect(() => {
    if (liveGiftCelebration) {
      return registerModal('liveGift', () => setLiveGiftCelebration(null));
    }
  }, [liveGiftCelebration, registerModal]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: AppNotification[] = data.notifications || [];
        setNotifications(list);
        setUnreadNotificationsCount(list.filter((n) => !n.isRead).length);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  }, [token]);

  // Fetch unread messages
  const fetchUnreadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const count = (data.conversations || []).reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(count);
      }
    } catch (e) {
      console.error('Failed to fetch unread messages:', e);
    }
  }, [token]);

  useEffect(() => {
    const loadSystemBranding = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings?.general) {
            const { siteName, favicon } = data.settings.general;
            if (siteName) {
              document.title = `${siteName} — Next Gen Liquid Glass`;
            }
            if (favicon) {
              let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
              if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
              }
              link.href = favicon;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load dynamic site branding:', err);
      }
    };
    loadSystemBranding();
  }, []);

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      fetchUnreadMessages();
      if (user.role === 'admin' && adminViewMode === 'admin' && activeTab !== 'admin') {
        navigateTo('admin', { replace: true });
      }
    }
  }, [user, token, fetchNotifications, fetchUnreadMessages, activeTab, navigateTo]);

  // Socket.IO Real-time Connection for notifications & presence
  useEffect(() => {
    if (!user) return;

    const socket = getSocket(token, user.id);

    socket.emit('join_user_room', user.id);

    // Real-time notification received
    socket.on('new_notification', (newNotif: AppNotification) => {
      notificationAudio.playChime(newNotif.type);
      pushManager.showBrowserNotification(`Nixo: ${newNotif.type?.replace(/_/g, ' ') || 'New Alert'}`, {
        body: newNotif.message,
      });

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        const updated = [newNotif, ...prev];
        setUnreadNotificationsCount(updated.filter((n) => !n.isRead).length);
        return updated;
      });

      addToast(newNotif.message, 'info');
    });

    // Unread count synchronization event
    socket.on('unread_count_updated', (data: { unreadCount: number }) => {
      setUnreadNotificationsCount(data.unreadCount);
    });

    // Bulk marked as read event
    socket.on('notifications_marked_all_read', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
    });

    // Notification deleted event
    socket.on('notification_deleted', (data: { id: string }) => {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== data.id);
        setUnreadNotificationsCount(updated.filter((n) => !n.isRead).length);
        return updated;
      });
    });

    // Live 3D gift animation notification
    socket.on('live_gift_animation', (giftData: any) => {
      // Trigger spatial celebration overlay
      setLiveGiftCelebration(giftData);

      if (giftData.receiverId === user.id) {
        notificationAudio.playChime('gift_received');
        const giftNotif: AppNotification = {
          id: 'gift_notif_' + Date.now(),
          userId: user.id,
          type: 'gift_received',
          message: `${giftData.senderName} sent you a ${giftData.giftName} gift!`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => {
          const updated = [giftNotif, ...prev];
          setUnreadNotificationsCount(updated.filter((n) => !n.isRead).length);
          return updated;
        });
        addToast(`${giftData.senderName} sent you a ${giftData.giftName} gift!`, 'success');
      }
    });

    // Real-time coin balance updates
    socket.on('balance_updated', (data: { coinsBalance: number }) => {
      refreshUser();
    });

    return () => {
      socket.off('new_notification');
      socket.off('unread_count_updated');
      socket.off('notifications_marked_all_read');
      socket.off('notification_deleted');
      socket.off('live_gift_animation');
      socket.off('balance_updated');
    };
  }, [user, addToast]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
      addToast('All transmissions marked as read', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        setUnreadNotificationsCount(updated.filter((n) => !n.isRead).length);
        return updated;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigateToProfile = (profileId?: string) => {
    navigateToProfile(profileId || null);
  };

  const handleNavigateToChat = (partnerId?: string) => {
    navigateToChat(partnerId || null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    navigateTo('explore');
  };

  const handleOpenGiftModal = (postId: string, receiverId: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setGiftModalState({ isOpen: true, postId, receiverId });
  };

  const handleOpenCreatePost = () => {
    if (!user) setIsAuthOpen(true);
    else setIsCreatePostOpen(true);
  };

  const handleOpenCreateStory = () => {
    if (!user) setIsAuthOpen(true);
    else setIsCreateStoryOpen(true);
  };

  // When authenticating / verifying initial session token
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative font-sans">
        <LiquidBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-pink-500 p-[1.5px] animate-pulse">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-400 animate-pulse">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // When visiting home page and unauthenticated: ONLY show Login / Sign Up Page
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 relative font-sans overflow-x-hidden">
        <LiquidBackground />
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          isStandalone={true}
        />
      </div>
    );
  }

  if (user?.role === 'admin' && adminViewMode === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-1 sm:p-3 relative font-sans">
        <LiquidBackground />
        <AdminDashboard
          onSwitchToUserView={() => {
            setAdminViewMode('user');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-250 font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-clip">
      {/* Hardware-accelerated dynamic liquid plasma background */}
      <LiquidBackground />

      <div className="relative z-10">
        {/* Admin Preview Mode Banner */}
        {user?.role === 'admin' && adminViewMode === 'user' && (
          <div className="sticky top-0 z-50 px-4 py-2 bg-gradient-to-r from-purple-950/95 via-slate-950/95 to-cyan-950/95 backdrop-blur-md border-b border-cyan-500/40 text-xs flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
              <span className="font-extrabold text-white">👑 আপনি অ্যাডমিন হিসেবে ইউজার সাইট দেখছেন (Admin Preview)</span>
              <span className="text-slate-400 hidden sm:inline">— সাধারণ ব্যবহারকারী ইন্টারফেস পরিদর্শন</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminViewMode('admin')}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs cursor-pointer shadow-md shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>← অ্যাডমিন CMS-এ ফিরুন (Admin Dashboard)</span>
            </button>
          </div>
        )}

        {/* Sticky Liquid Glass Desktop/Tablet Header */}
        <Header
          activeTab={activeTab}
          onNavigate={navigateTo}
          onGoBack={goBack}
          canGoBack={canGoBack}
          onSearch={handleSearch}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenRecharge={() => navigateTo('wallet')}
          onOpenCreatePost={handleOpenCreatePost}
          onOpenCreateStory={handleOpenCreateStory}
          onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          onUnreadCountChange={setUnreadNotificationsCount}
        />

        {/* Global Edge-Swipe Back Navigation Gesture Handler & Liquid Indicator */}
        <GestureBackOverlay onGoBack={goBack} canGoBack={canGoBack} />

        {/* Main 3-Column Desktop Grid Container / Responsive Layout */}
        <div className="max-w-7xl mx-auto flex gap-5 px-2 sm:px-4 pt-4 sm:pt-6">
          {/* Left Sidebar Navigation & Mobile Bottom Navigation */}
          <Navigation
            activeTab={activeTab}
            onNavigate={navigateTo}
            onGoBack={goBack}
            canGoBack={canGoBack}
            onOpenCreatePost={handleOpenCreatePost}
            unreadNotificationsCount={unreadNotificationsCount}
            unreadMessagesCount={unreadMessagesCount}
          />

          {/* Center Main Viewport */}
          <main className={`flex-1 min-w-0 ${activeTab === 'messenger' ? 'pb-2 sm:pb-3' : 'pb-24 lg:pb-8'}`}>
            {/* Persistent News Feed Container with Exact Scroll State Preservation */}
            <div className={`max-w-2xl mx-auto ${activeTab === 'home' ? 'block' : 'hidden'}`}>
              <SocialFeed
                onOpenCreatePost={handleOpenCreatePost}
                onOpenCreateStory={handleOpenCreateStory}
                onOpenGiftModal={handleOpenGiftModal}
                onNavigateToProfile={handleNavigateToProfile}
              />
            </div>

            <SuspenseWrapper>
              {activeTab === 'notifications' && (
                <NotificationCenterView
                  notifications={notifications}
                  token={token}
                  currentUser={user}
                  onRefresh={fetchNotifications}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onDeleteNotification={handleDeleteNotification}
                  onNavigate={(route, data) => {
                    if (route === 'profile') {
                      navigateToProfile(data?.userId || null);
                    } else {
                      navigateTo(route);
                    }
                  }}
                  onToast={addToast}
                />
              )}

              {activeTab === 'friends' && (
                <FriendsView
                  onNavigateToProfile={handleNavigateToProfile}
                  onNavigateToChat={handleNavigateToChat}
                />
              )}
              {activeTab === 'explore' && (
                <ExploreView
                  searchQuery={searchQuery}
                  onNavigateToProfile={handleNavigateToProfile}
                />
              )}
              {activeTab === 'videos' && <VideosView onOpenGiftModal={handleOpenGiftModal} onOpenProfile={handleNavigateToProfile} />}
              {activeTab === 'reels' && <ReelsViewer onOpenGiftModal={handleOpenGiftModal} onOpenProfile={handleNavigateToProfile} />}
              {activeTab === 'messenger' && (
                <MessengerView
                  initialPartnerId={targetChatPartnerId || undefined}
                  onGoBack={goBack}
                />
              )}
              {activeTab === 'groups' && <CommunitiesView />}
              {activeTab === 'pages' && <PagesEventsView initialType="pages" />}
              {activeTab === 'events' && <PagesEventsView initialType="events" />}
              {activeTab === 'profile' && (
                <UserProfileView
                  userId={selectedProfileUserId || undefined}
                  onOpenGiftModal={handleOpenGiftModal}
                  onNavigateToProfile={handleNavigateToProfile}
                  onNavigateToChat={handleNavigateToChat}
                  onNavigateToFeels={() => navigateTo('reels')}
                  onNavigateToTab={(tab) => navigateTo(tab)}
                  onGoBack={goBack}
                />
              )}
              {activeTab === 'saved' && (
                <div className="max-w-2xl mx-auto">
                  <div className="mb-4 p-4 glass-card rounded-2xl flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-slate-900 dark:text-white">Saved Posts & Bookmarks</h1>
                      <p className="text-xs text-slate-400">Posts and transmissions you saved for later</p>
                    </div>
                  </div>
                  <SocialFeed
                    isSavedOnly={true}
                    onOpenCreatePost={handleOpenCreatePost}
                    onOpenCreateStory={handleOpenCreateStory}
                    onOpenGiftModal={handleOpenGiftModal}
                    onNavigateToProfile={handleNavigateToProfile}
                  />
                </div>
              )}
              {activeTab === 'marketplace' && (
                <MarketplaceView
                  onOpenRecharge={() => navigateTo('wallet')}
                  onNavigateToChat={handleNavigateToChat}
                  onNavigateToProfile={handleNavigateToProfile}
                />
              )}
              {activeTab === 'support' && <HelpSupportView />}
              {activeTab === 'settings' && <SettingsView onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)} />}
              {activeTab === 'wallet' && <WalletView />}
              {activeTab === 'dashboardPro' && (
                <div className="max-w-4xl mx-auto my-2">
                  <DashboardPro onOpenGiftModal={handleOpenGiftModal} />
                </div>
              )}
              {activeTab === 'admin' && (
                <AdminDashboard onSwitchToUserView={() => setAdminViewMode('user')} />
              )}
            </SuspenseWrapper>
          </main>

          {/* Right Sidebar */}
          <RightSidebar
            onOpenRecharge={() => navigateTo('wallet')}
            onNavigate={(tab) => {
              if (tab === 'profile') navigateToProfile(null);
              else navigateTo(tab);
            }}
            onNavigateToProfile={handleNavigateToProfile}
          />
        </div>

        {/* Modals */}
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={() => {}}
        />

        <CameraStoryModal
          isOpen={isCreateStoryOpen}
          onClose={() => setIsCreateStoryOpen(false)}
          onStoryCreated={() => {}}
        />

        <GiftModal
          isOpen={giftModalState.isOpen}
          postId={giftModalState.postId}
          commentId={giftModalState.commentId}
          receiverId={giftModalState.receiverId}
          receiverName={giftModalState.receiverName}
          onClose={() => setGiftModalState({ isOpen: false })}
          onGiftSent={() => {
            addToast('3D Gift sent successfully!', 'success');
          }}
          onOpenRecharge={() => setIsCoinPurchaseOpen(true)}
        />

        <CoinPurchaseModal
          isOpen={isCoinPurchaseOpen}
          onClose={() => setIsCoinPurchaseOpen(false)}
          onSuccess={() => {
            refreshUser();
            addToast('Coins recharged successfully! You can now send your gift.', 'success');
            setIsCoinPurchaseOpen(false);
          }}
        />

        <GiftCelebrationOverlay
          event={liveGiftCelebration}
          onDismiss={() => setLiveGiftCelebration(null)}
        />

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />

        <VoiceSearchModal
          isOpen={isVoiceSearchOpen}
          onClose={() => setIsVoiceSearchOpen(false)}
          onNavigate={(tab) => {
            if (tab === 'profile') navigateToProfile(null);
            else navigateTo(tab);
          }}
          onSearch={handleSearch}
          onOpenCreatePost={handleOpenCreatePost}
          onOpenCreateStory={handleOpenCreateStory}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <TypographyProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <NavigationProvider>
                <MainLayout />
              </NavigationProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </TypographyProvider>
    </LanguageProvider>
  );
}
