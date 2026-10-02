import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  MessageSquare,
  UserPlus,
  UserCheck,
  Coins,
  Gift,
  Shield,
  Radio,
  Share2,
  Repeat,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import { notificationAudio } from '../utils/notificationSound';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { AdMobBanner } from './ads/AdMobBanner';

interface NotificationCenterViewProps {
  notifications: AppNotification[];
  token?: string | null;
  currentUser?: any;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onNavigate: (route: string, data?: any) => void;
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  notifications,
  token,
  currentUser,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNavigate,
  onToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'social' | 'connections' | 'messages' | 'economy' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(notificationAudio.getMuted());
  const [simulationMenuOpen, setSimulationMenuOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    setIsMuted(notificationAudio.getMuted());
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    notificationAudio.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      notificationAudio.playChime('general');
      onToast?.('Liquid Glass acoustic chimes enabled', 'info');
    } else {
      onToast?.('Notification sounds muted', 'info');
    }
  };

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (filter === 'unread' && notif.isRead) return false;
      if (filter === 'social') {
        const socialTypes: NotificationType[] = ['like', 'reaction', 'comment', 'reply', 'mention', 'share', 'repost'];
        if (!socialTypes.includes(notif.type)) return false;
      }
      if (filter === 'connections') {
        const connTypes: NotificationType[] = ['friend_request', 'friend_accepted', 'friend_accept', 'follow'];
        if (!connTypes.includes(notif.type)) return false;
      }
      if (filter === 'messages') {
        const msgTypes: NotificationType[] = ['message', 'group_activity', 'page_activity', 'event_activity'];
        if (!msgTypes.includes(notif.type)) return false;
      }
      if (filter === 'economy') {
        const econTypes: NotificationType[] = ['gift_received', 'gift', 'coin_received', 'coin_purchase', 'withdrawal_update'];
        if (!econTypes.includes(notif.type)) return false;
      }
      if (filter === 'system') {
        const sysTypes: NotificationType[] = ['admin_announcement', 'security_alert', 'system', 'ad_approved'];
        if (!sysTypes.includes(notif.type)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const msgMatch = notif.message.toLowerCase().includes(query);
        const senderMatch = notif.sender?.fullName.toLowerCase().includes(query) || notif.sender?.username.toLowerCase().includes(query);
        const typeMatch = notif.type.toLowerCase().includes(query);
        if (!msgMatch && !senderMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [notifications, filter, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Bulk actions
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0 || !token) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      selectedIds.forEach((id) => onMarkAsRead(id));
      setSelectedIds([]);
      onToast?.(`Marked ${selectedIds.length} notifications as read`, 'success');
      onRefresh();
    } catch (e) {
      onToast?.('Failed to mark selected as read', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !token) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/notifications/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        onDeleteNotification(id);
      }
      setSelectedIds([]);
      onToast?.('Deleted selected notifications', 'info');
      onRefresh();
    } catch (e) {
      onToast?.('Failed to delete notifications', 'error');
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      onMarkAsRead(notif.id);
    }

    const meta = notif.metadata || {};
    const route = meta.route || notif.referenceType;

    // Deep navigation based on notification type and metadata
    if (route === 'post' || notif.type === 'like' || notif.type === 'comment' || notif.type === 'reply' || notif.type === 'mention' || notif.type === 'share' || notif.type === 'repost') {
      onNavigate('home', { targetPostId: meta.postId || notif.referenceId });
    } else if (route === 'messenger' || notif.type === 'message') {
      onNavigate('messenger', { conversationId: meta.conversationId || notif.referenceId });
    } else if (route === 'groups' || notif.type === 'group_activity') {
      onNavigate('groups', { groupId: meta.groupId || notif.referenceId });
    } else if (route === 'pages' || notif.type === 'page_activity') {
      onNavigate('pages', { pageId: meta.pageId || notif.referenceId });
    } else if (route === 'events' || notif.type === 'event_activity') {
      onNavigate('events', { eventId: meta.eventId || notif.referenceId });
    } else if (route === 'wallet' || notif.type === 'gift_received' || notif.type === 'gift' || notif.type === 'coin_received' || notif.type === 'coin_purchase' || notif.type === 'withdrawal_update') {
      onNavigate('wallet', { tab: 'transactions' });
    } else if (route === 'friends' || notif.type === 'friend_request') {
      onNavigate('friends');
    } else if (route === 'profile' || notif.type === 'friend_accepted' || notif.type === 'follow') {
      onNavigate('profile', { userId: meta.userId || notif.senderId });
    } else if (route === 'settings' || notif.type === 'security_alert') {
      onNavigate('settings', { tab: 'security' });
    } else if (notif.type === 'admin_announcement') {
      onToast?.(notif.message, 'info');
    } else {
      onNavigate('home');
    }
  };

  // Simulate any of the 19 notification types in real time
  const handleSimulate = async (type: NotificationType, label: string) => {
    if (!token) return;
    setSimulating(true);
    setSimulationMenuOpen(false);
    try {
      const res = await fetch('/api/notifications/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          message: `Live Pulse: ${label} notification received in real time!`,
          senderId: 'user_marcus',
          referenceId: 'post_seed_1',
          referenceType: 'post',
          metadata: {
            route: ['gift_received', 'coin_received', 'coin_purchase', 'withdrawal_update'].includes(type) ? 'wallet' : 'post',
            postId: 'post_seed_1',
          },
        }),
      });
      if (res.ok) {
        notificationAudio.playChime(type);
        onToast?.(`Triggered real-time "${label}" notification via Socket.IO`, 'success');
        onRefresh();
      }
    } catch (e) {
      onToast?.('Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Get icon and color badge for any of the 19 notification types
  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'friend_request':
        return { icon: UserPlus, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', label: 'Friend Request' };
      case 'friend_accepted':
      case 'friend_accept':
        return { icon: UserCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Connected' };
      case 'follow':
        return { icon: Radio, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'New Follower' };
      case 'like':
      case 'reaction':
        return { icon: Heart, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30', label: 'Reaction' };
      case 'comment':
        return { icon: MessageSquare, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', label: 'Comment' };
      case 'reply':
        return { icon: ArrowRight, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'Reply' };
      case 'mention':
        return { icon: Sparkles, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Mention' };
      case 'share':
        return { icon: Share2, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', label: 'Shared' };
      case 'repost':
        return { icon: Repeat, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30', label: 'Repost' };
      case 'message':
        return { icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'Message' };
      case 'group_activity':
        return { icon: Layers, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30', label: 'Group' };
      case 'page_activity':
        return { icon: Radio, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30', label: 'Page' };
      case 'event_activity':
        return { icon: Calendar, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', label: 'Event' };
      case 'gift_received':
      case 'gift':
        return { icon: Gift, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', label: 'Gift' };
      case 'coin_received':
        return { icon: Coins, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Coins' };
      case 'coin_purchase':
        return { icon: Coins, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Recharge' };
      case 'withdrawal_update':
        return { icon: Check, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Payout' };
      case 'admin_announcement':
        return { icon: Bell, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', label: 'Official' };
      case 'security_alert':
        return { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/30', label: 'Security' };
      default:
        return { icon: Bell, color: 'text-slate-400 bg-white/5 border-white/10', label: 'Alert' };
    }
  };

  const simulationOptions: { type: NotificationType; label: string }[] = [
    { type: 'friend_request', label: 'Friend Request' },
    { type: 'friend_accepted', label: 'Friend Accepted' },
    { type: 'follow', label: 'New Follower' },
    { type: 'like', label: 'Post Like / Reaction' },
    { type: 'comment', label: 'Post Comment' },
    { type: 'reply', label: 'Comment Reply' },
    { type: 'mention', label: 'User Mention' },
    { type: 'share', label: 'Post Share' },
    { type: 'repost', label: 'Post Repost' },
    { type: 'message', label: 'Direct Message' },
    { type: 'group_activity', label: 'Group Activity' },
    { type: 'page_activity', label: 'Page Activity' },
    { type: 'event_activity', label: 'Event Activity' },
    { type: 'gift_received', label: 'Gift Received' },
    { type: 'coin_received', label: 'Coin Received' },
    { type: 'coin_purchase', label: 'Coin Purchase' },
    { type: 'withdrawal_update', label: 'Withdrawal Update' },
    { type: 'admin_announcement', label: 'Admin Announcement' },
    { type: 'security_alert', label: 'Security Alert' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Banner & Control Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl p-6 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner shadow-cyan-500/20">
              <Bell className="w-8 h-8" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-[11px] font-bold text-white shadow-lg shadow-pink-500/40 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-wide">Notification Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Socket.IO Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Unified transmissions, social signals, wallet activities, and security alerts
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Acoustic Sound Toggle */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute notification chime' : 'Mute notification chime'}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                isMuted
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>

            {/* Simulate Notification Menu */}
            <div className="relative">
              <button
                onClick={() => setSimulationMenuOpen(!simulationMenuOpen)}
                disabled={simulating}
                className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Simulate 19 Types</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {simulationMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl bg-slate-900/95 border border-purple-500/30 shadow-2xl backdrop-blur-2xl z-30 p-2 custom-scrollbar animate-scale-in">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-400 border-b border-white/10 mb-1">
                    Trigger Real-Time Pulse
                  </div>
                  {simulationOptions.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => handleSimulate(opt.type, opt.label)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-purple-500/20 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>{opt.label}</span>
                      <Sparkles className="w-3 h-3 text-purple-400 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Preferences Modal Button */}
            <button
              onClick={() => setIsPreferencesOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span>Preferences</span>
            </button>

            {/* Mark All Read */}
            <button
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                unreadCount > 0
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30 text-cyan-300'
                  : 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center overflow-x-auto w-full md:w-auto p-1.5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl custom-scrollbar gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              filter === 'unread'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('social')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'social'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Social
          </button>
          <button
            onClick={() => setFilter('connections')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'connections'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Friends & Follows
          </button>
          <button
            onClick={() => setFilter('messages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'messages'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Messages & Groups
          </button>
          <button
            onClick={() => setFilter('economy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'economy'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Gifts & Economy
          </button>
          <button
            onClick={() => setFilter('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'system'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            System & Security
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 backdrop-blur-xl transition-all"
          />
        </div>
      </div>

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="notifications_banner" variant="compact" className="my-2" />

      {/* Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-xl animate-fade-in">
          <div className="flex items-center space-x-3 text-xs font-medium text-white">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold">
              {selectedIds.length} Selected
            </span>
            <button onClick={handleSelectAll} className="text-cyan-400 hover:underline cursor-pointer">
              {selectedIds.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkMarkRead}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark Read
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-2xl">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Zero Transmissions</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {searchQuery
              ? `No notifications found matching "${searchQuery}".`
              : 'You are completely caught up! No notifications in this category.'}
          </p>
          <button
            onClick={() => handleSimulate('like', 'Post Like')}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
          >
            Simulate Incoming Notification
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const badge = getTypeBadge(notif.type);
            const BadgeIcon = badge.icon;
            const isSelected = selectedIds.includes(notif.id);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-4 flex items-start gap-3.5 ${
                  notif.isRead
                    ? 'bg-slate-900/40 hover:bg-slate-900/70 border-white/5 hover:border-white/15'
                    : 'bg-slate-900/80 hover:bg-slate-900/95 border-cyan-500/30 shadow-lg shadow-cyan-500/5 hover:border-cyan-500/50'
                }`}
              >
                {/* Unread Glow Accent Line */}
                {!notif.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-500" />
                )}

                {/* Checkbox for Multi-Select */}
                <div
                  onClick={(e) => handleToggleSelect(notif.id, e)}
                  className="mt-1 cursor-pointer"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-500 text-black'
                        : 'border-white/20 hover:border-white/40 bg-black/20'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Sender Avatar or Icon */}
                <div className="relative shrink-0">
                  {notif.sender?.avatarUrl ? (
                    <img
                      src={notif.sender.avatarUrl}
                      alt={notif.sender.fullName}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10 ring-2 ring-cyan-500/20"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center">
                      <BadgeIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}

                  {/* Tiny floating badge icon */}
                  <div
                    className={`absolute -bottom-1 -right-1 p-1 rounded-lg border text-[10px] ${badge.color}`}
                  >
                    <BadgeIcon className="w-3 h-3" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-white truncate">
                      {notif.sender?.fullName || 'System Transmission'}
                    </span>
                    {notif.sender?.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {notif.sender.badge}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-auto shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                    {notif.message}
                  </p>

                  {/* Metadata Action Hint / Buttons */}
                  <div className="mt-2.5 flex items-center gap-2">
                    {notif.type === 'friend_request' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToast?.('Friend request accepted!', 'success');
                            onMarkAsRead(notif.id);
                          }}
                          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-all"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(notif.id);
                            onToast?.('Friend request declined', 'info');
                          }}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium rounded-lg transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {['gift_received', 'coin_received', 'coin_purchase', 'withdrawal_update'].includes(notif.type) && (
                      <span className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1">
                        View Wallet Details <ExternalLink className="w-3 h-3" />
                      </span>
                    )}

                    {['like', 'comment', 'reply', 'mention', 'share', 'repost'].includes(notif.type) && (
                      <span className="text-[11px] font-medium text-cyan-400 hover:underline flex items-center gap-1">
                        Open Transmission <ArrowRight className="w-3 h-3" />
                      </span>
                    )}

                    {notif.type === 'message' && (
                      <span className="text-[11px] font-medium text-blue-400 hover:underline flex items-center gap-1">
                        Reply to Message <ArrowRight className="w-3 h-3" />
                      </span>
                    )}

                    {notif.type === 'security_alert' && (
                      <span className="text-[11px] font-semibold text-red-400 hover:underline flex items-center gap-1">
                        Review Security <Shield className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Action Buttons */}
                <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notif.id);
                    }}
                    title={notif.isRead ? 'Already read' : 'Mark as read'}
                    className={`p-1.5 rounded-lg border transition-all ${
                      notif.isRead
                        ? 'text-slate-600 border-transparent hover:text-slate-400'
                        : 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    title="Dismiss notification"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        token={token}
        onToast={onToast}
      />
    </div>
  );
};

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return 'recently';
  }
}
