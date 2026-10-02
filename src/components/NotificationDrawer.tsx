import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppNotification } from '../types';
import { useAuth } from '../context/AuthContext';
import { GlassDrawer } from '../design-system/components/GlassDrawer';
import { notificationAudio } from '../utils/notificationSound';
import { pushManager } from '../utils/pushManager';
import { getApiBaseUrl } from '../services/nativeInit';
import {
  IconNotifications,
  IconSparkles,
} from '../design-system/icons/OriginalIcons';
import {
  Heart,
  MessageSquare,
  UserPlus,
  Coins,
  Gift,
  Shield,
  ArrowRight,
  Settings,
  Trash2,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  onNavigate?: (route: string, data?: any) => void;
  onOpenPreferences?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
  onNavigate,
}) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'social' | 'friends' | 'messages' | 'economy' | 'system'>('all');
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [actionNotifId, setActionNotifId] = useState<string | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(notificationAudio.getMuted());

  // Helper for relative time formatting
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffInSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffInSec < 45) return 'Just now';
      if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m ago`;
      if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h ago`;
      if (diffInSec < 172800) return 'Yesterday';
      return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const toggleSound = () => {
    const nextMuted = !isMuted;
    notificationAudio.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      notificationAudio.playChime('general');
    }
  };

  const handleAcceptFriendRequest = async (notif: AppNotification) => {
    if (!token || !notif.senderId) return;
    setActionNotifId(notif.id);
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: notif.senderId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id
              ? { ...n, isRead: true, message: `You accepted ${n.sender?.fullName || 'user'}'s friend request!` }
              : n
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionNotifId(null);
    }
  };

  const handleDeclineFriendRequest = async (notif: AppNotification) => {
    if (!token || !notif.senderId) return;
    setActionNotifId(notif.id);
    try {
      const res = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: notif.senderId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, isRead: true, message: 'Friend request declined' } : n
          )
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionNotifId(null);
    }
  };

  const handleDeleteNotification = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== notifId);
        const unread = next.filter((n) => !n.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
        return next;
      });

      await fetch(`/api/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: AppNotification[] = data.notifications || [];
        setNotifications(list);
        const unread = list.filter((n) => !n.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchNotifications();
    }
  }, [user, token, isOpen]);

  // Real-time Socket.IO listener
  useEffect(() => {
    if (!user) return;

    const socket: Socket = io(getApiBaseUrl(), {
      transports: ['websocket', 'polling'],
    });

    socket.emit('join_user_room', user.id);

    socket.on('new_notification', (newNotif: any) => {
      notificationAudio.playChime(newNotif.type);

      pushManager.showBrowserNotification(`Nixo: ${newNotif.type?.replace(/_/g, ' ') || 'New Alert'}`, {
        body: newNotif.message,
      });

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        const updated = [newNotif, ...prev];
        const unread = updated.filter((n) => !n.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
        return updated;
      });
    });

    socket.on('unread_count_updated', (data: { unreadCount: number }) => {
      if (onUnreadCountChange) onUnreadCountChange(data.unreadCount);
    });

    socket.on('notifications_marked_all_read', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    });

    socket.on('notification_deleted', (data: { id: string }) => {
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== data.id);
        const unread = filtered.filter((n) => !n.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
        return filtered;
      });
    });

    socket.on('live_gift_animation', (giftData: any) => {
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
          const unread = updated.filter((n) => !n.isRead).length;
          if (onUnreadCountChange) onUnreadCountChange(unread);
          return updated;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markAllRead = async () => {
    if (!token) return;
    setIsMarkingRead(true);
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    // Mark as read immediately in UI & API
    if (!notif.isRead && token) {
      fetch(`/api/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      const remainingUnread = notifications.filter((n) => n.id !== notif.id && !n.isRead).length;
      if (onUnreadCountChange) onUnreadCountChange(remainingUnread);
    }

    onClose();

    // Deep navigation
    if (onNavigate) {
      const meta = notif.metadata || {};
      const route = meta.route || notif.referenceType;

      if (['post', 'comment', 'reply', 'like', 'reaction', 'mention', 'share', 'repost'].includes(notif.type) || route === 'post') {
        onNavigate('home', { targetPostId: meta.postId || notif.referenceId });
      } else if (notif.type === 'message' || route === 'messenger') {
        onNavigate('messenger', { conversationId: meta.conversationId || notif.referenceId });
      } else if (notif.type === 'group_activity' || route === 'groups') {
        onNavigate('groups', { groupId: meta.groupId || notif.referenceId });
      } else if (notif.type === 'page_activity' || route === 'pages') {
        onNavigate('pages', { pageId: meta.pageId || notif.referenceId });
      } else if (notif.type === 'event_activity' || route === 'events') {
        onNavigate('events', { eventId: meta.eventId || notif.referenceId });
      } else if (['gift_received', 'gift', 'coin_received', 'coin_purchase', 'withdrawal_update'].includes(notif.type) || route === 'wallet') {
        onNavigate('wallet', { tab: 'transactions' });
      } else if (notif.type === 'friend_request' || route === 'friends') {
        onNavigate('friends');
      } else if (['friend_accepted', 'follow'].includes(notif.type) || route === 'profile') {
        onNavigate('profile', { userId: meta.userId || notif.senderId });
      } else if (notif.type === 'security_alert' || route === 'settings') {
        onNavigate('settings', { tab: 'security' });
      } else {
        onNavigate('notifications');
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'social') return ['like', 'reaction', 'comment', 'reply', 'mention', 'share', 'repost'].includes(n.type);
    if (filter === 'friends') return ['friend_request', 'friend_accepted', 'friend_accept', 'follow'].includes(n.type);
    if (filter === 'messages') return ['message', 'group_activity', 'page_activity', 'event_activity'].includes(n.type);
    if (filter === 'economy') return ['gift_received', 'gift', 'coin_received', 'coin_purchase', 'withdrawal_update'].includes(n.type);
    if (filter === 'system') return ['admin_announcement', 'security_alert', 'system', 'ad_approved'].includes(n.type);
    return true;
  });

  const getNotificationIconBadge = (type: string) => {
    switch (type) {
      case 'like':
      case 'reaction':
        return (
          <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <Heart className="w-3 h-3 fill-white" />
          </div>
        );
      case 'comment':
      case 'reply':
        return (
          <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-3 h-3" />
          </div>
        );
      case 'gift':
      case 'gift_received':
        return (
          <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-xs">
            <Gift className="w-3 h-3" />
          </div>
        );
      case 'coin_received':
      case 'coin_purchase':
      case 'withdrawal_update':
        return (
          <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs font-bold text-[10px]">
            <Coins className="w-3 h-3" />
          </div>
        );
      case 'follow':
      case 'friend_request':
        return (
          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
            <UserPlus className="w-3 h-3" />
          </div>
        );
      case 'friend_accepted':
      case 'friend_accept':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <UserCheck className="w-3 h-3" />
          </div>
        );
      case 'security_alert':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs">
            <Shield className="w-3 h-3" />
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
        );
    }
  };

  const getFilterCount = (filterType: string) => {
    if (filterType === 'all') return notifications.length;
    if (filterType === 'unread') return unreadCount;
    if (filterType === 'social') return notifications.filter((n) => ['like', 'reaction', 'comment', 'reply', 'mention', 'share', 'repost'].includes(n.type)).length;
    if (filterType === 'friends') return notifications.filter((n) => ['friend_request', 'friend_accepted', 'friend_accept', 'follow'].includes(n.type)).length;
    if (filterType === 'messages') return notifications.filter((n) => ['message', 'group_activity', 'page_activity', 'event_activity'].includes(n.type)).length;
    if (filterType === 'economy') return notifications.filter((n) => ['gift_received', 'gift', 'coin_received', 'coin_purchase', 'withdrawal_update'].includes(n.type)).length;
    if (filterType === 'system') return notifications.filter((n) => ['admin_announcement', 'security_alert', 'system', 'ad_approved'].includes(n.type)).length;
    return 0;
  };

  return (
    <>
      <GlassDrawer
        isOpen={isOpen}
        onClose={onClose}
        position="right"
        title="Notifications"
        subtitle="Real-time alerts & interactions"
        width="max-w-lg"
        className="notification-drawer-container"
      >
        <div className="space-y-4">
          {/* Header Controls: Sound, Preferences, Mark All Read */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isMuted
                    ? 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 border-transparent'
                    : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 shadow-xs'
                }`}
                title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-medium hidden sm:inline">{isMuted ? 'Muted' : 'Sound ON'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreferencesOpen(true)}
                className="p-1.5 rounded-xl bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300/70 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Notification Preferences"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Settings</span>
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={isMarkingRead}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs Scroll Area */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar -mx-1 px-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'social', label: 'Social' },
              { id: 'friends', label: 'Connections' },
              { id: 'messages', label: 'Messages' },
              { id: 'economy', label: 'Economy' },
              { id: 'system', label: 'System' },
            ].map((tab) => {
              const count = getFilterCount(tab.id);
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-100/90 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950 font-bold'
                          : tab.id === 'unread'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 dark:bg-white/15 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dedicated Notification Center Banner */}
          <button
            onClick={() => {
              onClose();
              if (onNavigate) onNavigate('notifications');
            }}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent hover:from-cyan-500/20 hover:via-indigo-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center gap-2">
              <IconSparkles size={16} className="text-cyan-500" />
              <span>Open Dedicated Notification Center</span>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Notifications List */}
          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 shadow-inner">
                  <IconNotifications size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {filter === 'unread'
                      ? "You're all caught up! No unread transmissions."
                      : 'No activity in this category right now.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const timeAgo = formatTimeAgo(n.createdAt);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`group relative p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 cursor-pointer ${
                      n.isRead
                        ? 'bg-slate-50/50 dark:bg-[#121829]/40 border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs'
                        : 'bg-cyan-500/15 dark:bg-cyan-950/30 border-cyan-500/40 hover:border-cyan-400 shadow-sm shadow-cyan-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar with type badge overlay */}
                      <div className="relative shrink-0">
                        <img
                          src={
                            n.sender?.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                          }
                          alt={n.sender?.fullName || 'User'}
                          className="w-10 h-10 rounded-full object-cover border border-cyan-400/40 shadow-xs"
                        />
                        <div className="absolute -bottom-1 -right-1">
                          {getNotificationIconBadge(n.type)}
                        </div>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={`text-xs leading-snug break-words ${
                              n.isRead
                                ? 'text-slate-700 dark:text-slate-200 font-medium'
                                : 'text-slate-950 dark:text-white font-bold'
                            }`}
                          >
                            {n.message}
                          </p>
                          {/* Quick delete button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(n.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-all rounded-lg hover:bg-rose-500/10 cursor-pointer shrink-0"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeAgo}
                          </span>
                          {!n.isRead && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 ml-auto bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Friend Request Accept / Decline Action Buttons */}
                    {n.type === 'friend_request' && !n.isRead && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10 pl-13">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptFriendRequest(n);
                          }}
                          disabled={actionNotifId === n.id}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-xs active:scale-95"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeclineFriendRequest(n);
                          }}
                          disabled={actionNotifId === n.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-rose-500/20 text-slate-700 dark:text-slate-300 hover:text-rose-500 font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </GlassDrawer>

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        token={token}
      />
    </>
  );
};
