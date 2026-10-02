import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Globe,
  Mail,
  Moon,
  Shield,
  Heart,
  MessageSquare,
  Users,
  Gift,
  Coins,
  DollarSign,
  Share2,
  Repeat,
  Radio,
  Check,
  RefreshCw,
  Send,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { NotificationPreferences, PushSubscriptionInfo } from '../types';
import { notificationAudio } from '../utils/notificationSound';
import { pushManager } from '../utils/pushManager';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  onToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  token,
  onToast,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inAppEnabled: true,
    browserPushEnabled: true,
    mobilePushEnabled: true,
    emailEnabled: true,
    soundEnabled: true,
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '07:00',
    prefFriendRequest: true,
    prefFriendAccepted: true,
    prefFollow: true,
    prefLike: true,
    prefComment: true,
    prefReply: true,
    prefMention: true,
    prefShare: true,
    prefRepost: true,
    prefMessage: true,
    prefGroupActivity: true,
    prefPageActivity: true,
    prefEventActivity: true,
    prefGiftReceived: true,
    prefCoinReceived: true,
    prefCoinPurchase: true,
    prefWithdrawalUpdate: true,
    prefAdminAnnouncement: true,
    prefSecurityAlert: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [pushSubscriptions, setPushSubscriptions] = useState<PushSubscriptionInfo[]>([]);
  const [testingPush, setTestingPush] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'devices'>('general');

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
      checkBrowserPermission();
      fetchPushSubscriptions();
    }
  }, [isOpen]);

  const checkBrowserPermission = () => {
    if (pushManager.isSupported()) {
      setBrowserPermission(pushManager.getPermissionStatus());
    }
  };

  const fetchPreferences = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          notificationAudio.setMuted(!data.preferences.soundEnabled);
        }
      }
    } catch (e) {
      console.error('Failed to fetch preferences', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPushSubscriptions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/push/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPushSubscriptions(data.subscriptions || []);
      }
    } catch (e) {}
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (key === 'soundEnabled') {
        notificationAudio.setMuted(!updated.soundEnabled);
        if (updated.soundEnabled) {
          notificationAudio.playChime('general');
        }
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });
      if (res.ok) {
        onToast?.('Notification preferences saved successfully', 'success');
        onClose();
      } else {
        onToast?.('Failed to save preferences', 'error');
      }
    } catch (e) {
      onToast?.('Error saving preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableBrowserPush = async () => {
    if (!token) return;
    const res = await pushManager.registerWebPush(token);
    checkBrowserPermission();
    if (res.success) {
      onToast?.('Browser push notifications enabled & registered', 'success');
      fetchPushSubscriptions();
      setPreferences((prev) => ({ ...prev, browserPushEnabled: true }));
    } else {
      onToast?.(res.error || 'Failed to grant push permission', 'error');
    }
  };

  const handleSendTestPush = async () => {
    if (!token) return;
    setTestingPush(true);
    try {
      const res = await pushManager.sendTestPush(token, 'gift_received');
      if (res.success) {
        notificationAudio.playChime('gift_received');
        onToast?.('Test push notification dispatched via real-time stream', 'success');
      } else {
        onToast?.(res.message || 'Test push dispatch failed', 'error');
      }
    } catch (e) {
      onToast?.('Failed to send test push', 'error');
    } finally {
      setTestingPush(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/35 dark:bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                Notification Preferences
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30">
                  Real-Time & Push
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage delivery channels, quiet hours, and alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 px-6 bg-slate-50 dark:bg-slate-950/40">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" /> Channels & Quiet Hours
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> 19 Notification Types
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Push Devices ({pushSubscriptions.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading your notification settings...</p>
            </div>
          ) : activeTab === 'general' ? (
            <div className="space-y-6">
              {/* Delivery Channels */}
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                  Master Delivery Channels
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* In-App Alerts */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">In-App Badges & Alerts</div>
                        <div className="text-xs text-slate-400">Bell indicator & instant toasts</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.inAppEnabled}
                        onChange={() => handleToggle('inAppEnabled')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {/* Browser Push */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Browser Push</div>
                        <div className="text-xs text-slate-400">
                          {browserPermission === 'granted' ? 'Active & Permitted' : 'Permission needed'}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.browserPushEnabled}
                        onChange={() => handleToggle('browserPushEnabled')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {/* Mobile Push */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Mobile Push (APNS/FCM)</div>
                        <div className="text-xs text-slate-400">iOS & Android devices</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.mobilePushEnabled}
                        onChange={() => handleToggle('mobilePushEnabled')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  {/* Sound Effects */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        {preferences.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Liquid Glass Chimes</div>
                        <div className="text-xs text-slate-400">Acoustic crystal feedback</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => notificationAudio.playChime('like')}
                        title="Test Sound"
                        className="px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300"
                      >
                        Play
                      </button>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.soundEnabled}
                          onChange={() => handleToggle('soundEnabled')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Browser Permission Callout */}
                {browserPermission !== 'granted' && (
                  <div className="mt-4 p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">Enable Browser Push Notifications</div>
                        <div className="text-xs text-slate-300">
                          Receive notifications on your desktop even when this tab is closed.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleEnableBrowserPush}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Allow Push
                    </button>
                  </div>
                )}
              </div>

              {/* Quiet Hours / Do Not Disturb */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Quiet Hours (Do Not Disturb)</div>
                      <div className="text-xs text-slate-400">Mute sound and push notifications during sleep</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.dndEnabled}
                      onChange={() => handleToggle('dndEnabled')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {preferences.dndEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={preferences.dndStart}
                        onChange={(e) => setPreferences({ ...preferences, dndStart: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={preferences.dndEnd}
                        onChange={(e) => setPreferences({ ...preferences, dndEnd: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'categories' ? (
            /* 19 Notification Types organized neatly */
            <div className="space-y-6">
              {/* Social & Connections */}
              <div>
                <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Connections & Friend Requests
                </h3>
                <div className="space-y-2">
                  <CategoryToggleRow
                    title="Friend Requests"
                    desc="When someone sends you a friend connection invitation"
                    checked={preferences.prefFriendRequest}
                    onChange={() => handleToggle('prefFriendRequest')}
                  />
                  <CategoryToggleRow
                    title="Friend Accepted"
                    desc="When someone accepts your friend connection request"
                    checked={preferences.prefFriendAccepted}
                    onChange={() => handleToggle('prefFriendAccepted')}
                  />
                  <CategoryToggleRow
                    title="New Followers"
                    desc="When a user starts following your transmissions"
                    checked={preferences.prefFollow}
                    onChange={() => handleToggle('prefFollow')}
                  />
                </div>
              </div>

              {/* Feed Reactions & Interactions */}
              <div>
                <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Heart className="w-4 h-4" /> Social Engagement & Reactions
                </h3>
                <div className="space-y-2">
                  <CategoryToggleRow
                    title="Likes & Reactions"
                    desc="Reactions (❤️, 🔥, 💎) on your posts and creations"
                    checked={preferences.prefLike}
                    onChange={() => handleToggle('prefLike')}
                  />
                  <CategoryToggleRow
                    title="Comments"
                    desc="New comments posted on your transmissions"
                    checked={preferences.prefComment}
                    onChange={() => handleToggle('prefComment')}
                  />
                  <CategoryToggleRow
                    title="Replies"
                    desc="Direct replies to your comments or discussions"
                    checked={preferences.prefReply}
                    onChange={() => handleToggle('prefReply')}
                  />
                  <CategoryToggleRow
                    title="Mentions & Tags"
                    desc="When someone tags @your_username in posts or comments"
                    checked={preferences.prefMention}
                    onChange={() => handleToggle('prefMention')}
                  />
                  <CategoryToggleRow
                    title="Shares"
                    desc="When someone shares your posts with their audience"
                    checked={preferences.prefShare}
                    onChange={() => handleToggle('prefShare')}
                  />
                  <CategoryToggleRow
                    title="Reposts"
                    desc="When users repost your transmission to their network"
                    checked={preferences.prefRepost}
                    onChange={() => handleToggle('prefRepost')}
                  />
                </div>
              </div>

              {/* Messaging & Activity */}
              <div>
                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Messaging & Group Activity
                </h3>
                <div className="space-y-2">
                  <CategoryToggleRow
                    title="Direct & Group Messages"
                    desc="Real-time chat messages and voice transmissions"
                    checked={preferences.prefMessage}
                    onChange={() => handleToggle('prefMessage')}
                  />
                  <CategoryToggleRow
                    title="Group Activity"
                    desc="Updates and discussions in groups you belong to"
                    checked={preferences.prefGroupActivity}
                    onChange={() => handleToggle('prefGroupActivity')}
                  />
                  <CategoryToggleRow
                    title="Page Activity"
                    desc="New announcements from followed pages and creators"
                    checked={preferences.prefPageActivity}
                    onChange={() => handleToggle('prefPageActivity')}
                  />
                  <CategoryToggleRow
                    title="Event Activity"
                    desc="Reminders, keynotes, and schedule updates for RSVP'd events"
                    checked={preferences.prefEventActivity}
                    onChange={() => handleToggle('prefEventActivity')}
                  />
                </div>
              </div>

              {/* Economy & Wallet */}
              <div>
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Economy & Wallet
                </h3>
                <div className="space-y-2">
                  <CategoryToggleRow
                    title="Gifts Received"
                    desc="When creators or friends send you 3D liquid gifts"
                    checked={preferences.prefGiftReceived}
                    onChange={() => handleToggle('prefGiftReceived')}
                  />
                  <CategoryToggleRow
                    title="Coins Received"
                    desc="Tips and token transfers credited to your wallet"
                    checked={preferences.prefCoinReceived}
                    onChange={() => handleToggle('prefCoinReceived')}
                  />
                  <CategoryToggleRow
                    title="Coin Purchases"
                    desc="Receipts and confirmations for coin package recharges"
                    checked={preferences.prefCoinPurchase}
                    onChange={() => handleToggle('prefCoinPurchase')}
                  />
                  <CategoryToggleRow
                    title="Withdrawal Updates"
                    desc="Status alerts for bank, PayPal, and crypto withdrawals"
                    checked={preferences.prefWithdrawalUpdate}
                    onChange={() => handleToggle('prefWithdrawalUpdate')}
                  />
                </div>
              </div>

              {/* System & Security */}
              <div>
                <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> System & Security
                </h3>
                <div className="space-y-2">
                  <CategoryToggleRow
                    title="Admin Announcements"
                    desc="Platform-wide feature launches, upgrades, and scheduled maintenance"
                    checked={preferences.prefAdminAnnouncement}
                    onChange={() => handleToggle('prefAdminAnnouncement')}
                  />
                  <CategoryToggleRow
                    title="Security Alerts"
                    desc="New device logins, password resets, and session alerts"
                    checked={preferences.prefSecurityAlert}
                    onChange={() => handleToggle('prefSecurityAlert')}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Devices & Push Architecture */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Registered Push Devices</h3>
                  <p className="text-xs text-slate-400">Devices configured to receive instant push alerts</p>
                </div>
                <button
                  onClick={handleSendTestPush}
                  disabled={testingPush}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${testingPush ? 'animate-pulse' : ''}`} />
                  {testingPush ? 'Dispatching...' : 'Send Test Push'}
                </button>
              </div>

              {pushSubscriptions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10">
                  <Smartphone className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-300 font-medium">No registered push devices yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Enable browser push above or connect your iOS/Android Nixo client to receive background push notifications.
                  </p>
                  <button
                    onClick={handleEnableBrowserPush}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-xs transition-all"
                  >
                    Register This Browser
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pushSubscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                          {sub.platform === 'web' ? <Globe className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            {sub.deviceName || `${sub.platform.toUpperCase()} Client`}
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Platform: <span className="text-cyan-300 uppercase">{sub.platform}</span> • Registered{' '}
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSendTestPush}
            disabled={testingPush}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            Test Delivery
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryToggleRowProps {
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}

const CategoryToggleRow: React.FC<CategoryToggleRowProps> = ({ title, desc, checked, onChange }) => (
  <div className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between transition-all">
    <div>
      <div className="text-xs font-medium text-white">{title}</div>
      <div className="text-[11px] text-slate-400">{desc}</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
    </label>
  </div>
);
