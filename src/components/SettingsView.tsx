import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { useTheme } from '../design-system/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import {
  IconSettings,
  IconSun,
  IconMoon,
  IconShieldAlert,
  IconCheck,
} from '../design-system/icons/OriginalIcons';
import {
  Bell,
  Volume2,
  VolumeX,
  Globe,
  Smartphone,
  Moon,
  Send,
  Sparkles,
  Users,
  Heart,
  MessageSquare,
  Coins,
  Shield,
  Mic,
  Radio,
  User as UserIcon,
  Lock,
  ChevronRight,
  ArrowLeft,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Eye,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';
import { notificationAudio } from '../utils/notificationSound';
import { pushManager } from '../utils/pushManager';
import { NotificationPreferences } from '../types';

interface SettingsViewProps {
  onOpenVoiceSearch?: () => void;
}

type SettingsTab =
  | 'profile'
  | 'appearance'
  | 'privacy'
  | 'security'
  | 'admob'
  | 'notifications'
  | 'sessions'
  | 'blocked'
  | 'danger';

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenVoiceSearch }) => {
  const { user, token, refreshUser, logout } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [mobileView, setMobileView] = useState<'menu' | 'detail'>('menu');

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(false);

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Privacy Settings state
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [friendRequestPrivacy, setFriendRequestPrivacy] = useState('everyone');
  const [followPrivacy, setFollowPrivacy] = useState('everyone');
  const [messagePrivacy, setMessagePrivacy] = useState('friends');
  const [commentPrivacy, setCommentPrivacy] = useState('everyone');

  // Notification Preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
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
  const [isSavingNotifPrefs, setIsSavingNotifPrefs] = useState(false);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/privacy', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.privacy) {
          setProfileVisibility(data.privacy.profileVisibility || 'public');
          setFriendRequestPrivacy(data.privacy.allowFriendRequests || 'everyone');
          setFollowPrivacy(data.privacy.allowFollows || 'everyone');
          setMessagePrivacy(data.privacy.directMessagePrivacy || 'friends');
          setCommentPrivacy(data.privacy.allowCommenting || 'everyone');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotificationPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setNotifPrefs(data.preferences);
        }
      }
    } catch (e) {}
  };

  const fetchSessions = async () => {
    if (!token) return;
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchBlockedUsers = async () => {
    if (!token) return;
    setIsLoadingBlocked(true);
    try {
      const res = await fetch('/api/users/relationships/blocked', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data.blocked || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingBlocked(false);
    }
  };

  const handleUnblockUser = async (targetId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (res.ok) {
        addToast(isBn ? 'ইউজার সফলভাবে আনব্লক হয়েছে' : 'User unblocked successfully', 'success');
        setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
      } else {
        addToast('Failed to unblock user', 'error');
      }
    } catch (e) {
      addToast('Network error unblocking user', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !token ||
      !window.confirm(
        isBn
          ? 'আপনি কি নিশ্চিত যে আপনি স্থায়ীভাবে অ্যাকাউন্ট মুছে ফেলতে চান? সমস্ত ডেটা মুছে যাবে।'
          : 'Are you sure you want to permanently delete your account? All data will be removed.'
      )
    )
      return;

    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(isBn ? 'অ্যাকাউন্ট মুছে ফেলা হয়েছে। সাইন আউট করা হচ্ছে...' : 'Account deletion initiated. Signing out...', 'info');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      addToast('Failed to delete account', 'error');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchNotificationPreferences();
    fetchSessions();
    fetchBlockedUsers();
  }, [token]);

  const handleSaveNotificationPreferences = async () => {
    if (!token) return;
    setIsSavingNotifPrefs(true);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notifPrefs),
      });
      if (res.ok) {
        notificationAudio.setMuted(!notifPrefs.soundEnabled);
        addToast(isBn ? 'নোটিফিকেশন পছন্দসমূহ সেভ হয়েছে' : 'Notification preferences saved successfully', 'success');
      } else {
        addToast('Failed to save notification preferences', 'error');
      }
    } catch (e) {
      addToast('Network error saving preferences', 'error');
    } finally {
      setIsSavingNotifPrefs(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!token) return;
    try {
      const res = await pushManager.sendTestPush(token, 'gift_received');
      if (res.success) {
        notificationAudio.playChime('gift_received');
        addToast('Real-time test notification pulse dispatched!', 'success');
      }
    } catch (e) {
      addToast('Failed to dispatch test notification', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, bio, location, websiteUrl }),
      });
      if (res.ok) {
        refreshUser();
        addToast(isBn ? 'প্রোফাইল সফলভাবে আপডেট হয়েছে!' : 'Profile updated successfully!', 'success');
      } else {
        addToast('Failed to update profile', 'error');
      }
    } catch (e) {
      addToast('Network error while saving', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profileVisibility,
          friendRequestPrivacy,
          followPrivacy,
          messagePrivacy,
          commentPrivacy,
        }),
      });
      if (res.ok) {
        addToast(isBn ? 'প্রাইভেসি রুলস আপডেট সম্পন্ন হয়েছে' : 'Privacy rules synced across realm', 'success');
      }
    } catch (e) {
      addToast('Error saving privacy settings', 'error');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirmPassword) {
      addToast(isBn ? 'উভয় পাসওয়ার্ড মিলছে না' : 'Passwords do not match', 'error');
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        addToast(isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে' : 'Password updated successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to change password', 'error');
      }
    } catch (e) {
      addToast('Error changing password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogoutOtherSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(isBn ? 'অন্যান্য সমস্ত ডিভাইস থেকে সাইন আউট করা হয়েছে' : 'Signed out of all other devices', 'success');
        fetchSessions();
      }
    } catch (e) {
      addToast('Error revoking sessions', 'error');
    }
  };

  const navMenuItems = [
    {
      id: 'profile' as SettingsTab,
      labelBn: 'প্রোফাইল তথ্য ও বায়ো',
      labelEn: 'Profile & Identity',
      descBn: 'নাম, বায়ো, অবস্থান ও সোশ্যাল লিংক সম্পাদনা',
      descEn: 'Full name, bio, location, and social links',
      icon: UserIcon,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'appearance' as SettingsTab,
      labelBn: 'থিম ও ডিসপ্লে ভাষা',
      labelEn: 'Theme & Language',
      descBn: 'ডার্ক/লাইট মোড এবং বাংলা/ইংরেজি ভাষা পরিবর্তন',
      descEn: 'Dark/Light mode and Bangla/English language',
      icon: Globe,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'security' as SettingsTab,
      labelBn: 'নিরাপত্তা ও পাসওয়ার্ড',
      labelEn: 'Security & Password',
      descBn: 'অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন ও সুরক্ষা স্তর',
      descEn: 'Update account password and security layer',
      icon: Lock,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'privacy' as SettingsTab,
      labelBn: 'প্রাইভেসি ও অডিয়েন্স',
      labelEn: 'Privacy & Audience',
      descBn: 'ফ্রেন্ড রিকোয়েস্ট, মেসেজ ও কমেন্ট পারমিশন',
      descEn: 'Control friend requests, DMs, and post comments',
      icon: ShieldCheck,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'notifications' as SettingsTab,
      labelBn: 'নোটিফিকেশন ও সাউন্ড',
      labelEn: 'Notifications & Chimes',
      descBn: 'পুশ অ্যালার্ট, ইন-অ্যাপ চিমস ও ডিএনডি সময়সূচি',
      descEn: 'Push alerts, audio chimes, and Do Not Disturb',
      icon: Bell,
      color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    },
    {
      id: 'sessions' as SettingsTab,
      labelBn: 'ডিভাইস ও লগইন সেশন',
      labelEn: 'Active Login Sessions',
      descBn: 'আপনার অ্যাকাউন্টে লগইন থাকা ডিভাইসসমূহ ও সাইন আউট',
      descEn: 'Manage active devices and remote sign out',
      icon: Smartphone,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'blocked' as SettingsTab,
      labelBn: 'ব্লক করা অ্যাকাউন্ট',
      labelEn: 'Blocked Accounts',
      descBn: 'ব্লক করা ব্যবহারকারীদের তালিকা ও আনব্লক ব্যবস্থা',
      descEn: 'View blocked user profiles and unblock them',
      icon: Users,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
    {
      id: 'danger' as SettingsTab,
      labelBn: 'অ্যাকাউন্ট ডিলিট জোন',
      labelEn: 'Danger Zone',
      descBn: 'অ্যাকাউন্ট স্থায়ীভাবে ডিলিট ও ডেটা মুছে ফেলা',
      descEn: 'Permanently delete your account and profile data',
      icon: Trash2,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
  ];

  const handleSelectTab = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    setMobileView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      {/* Top Header Card */}
      <GlassCard variant="surface" className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <IconSettings size={20} className="text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              {isBn ? 'সেটিংস ও প্রাইভেসি নিয়ন্ত্রণ' : 'Account Settings & Privacy'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'প্রোফাইল, থিম, নিরাপত্তা এবং নোটিফিকেশন কাস্টমাইজ করুন'
                : 'Configure your identity, theme aesthetics, security, and preferences'}
            </p>
          </div>
        </div>

        {/* User quick pill on desktop */}
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
            alt=""
            className="w-7 h-7 rounded-full object-cover border border-cyan-400/40"
          />
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{user?.fullName}</p>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">@{user?.username}</p>
          </div>
        </div>
      </GlassCard>

      {/* TWO-COLUMN PROFESSIONAL DESKTOP LAYOUT / DRILL-DOWN MOBILE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT SETTINGS NAVIGATION SIDEBAR */}
        <div className={`lg:col-span-4 space-y-2 ${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
          <div className="p-2 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-lg space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {isBn ? 'সেটিংস মেনু তালিকা' : 'Settings Categories'}
            </div>

            {navMenuItems.filter(item => item.id !== 'admob').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-[1.01]'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isActive ? 'bg-white/20 text-white border-white/30' : item.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {isBn ? item.labelBn : item.labelEn}
                      </p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {isBn ? item.descBn : item.descEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <ChevronRight size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT ACTIVE MODULE CONTENT CONTAINER (LOADED IMMEDIATELY AT TOP) */}
        <div className={`lg:col-span-8 space-y-4 ${mobileView === 'menu' ? 'hidden lg:block' : 'block'}`}>
          
          {/* Mobile Back Button Header */}
          <div className="lg:hidden flex items-center justify-between p-2.5 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30">
            <button
              type="button"
              onClick={() => setMobileView('menu')}
              className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>{isBn ? '← সেটিংস মেনুতে ফিরে যান' : '← Back to Settings Menu'}</span>
            </button>
            <span className="text-xs font-black text-slate-800 dark:text-white">
              {isBn
                ? navMenuItems.find((i) => i.id === activeTab)?.labelBn
                : navMenuItems.find((i) => i.id === activeTab)?.labelEn}
            </span>
          </div>

          {/* ================= 1. PROFILE SETTINGS ================= */}
          {activeTab === 'profile' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'প্রোফাইল তথ্য ও কাস্টমাইজেশন' : 'Profile Information & Bio'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isBn ? 'আপনার প্রোফাইলে প্রদর্শিত মূল তথ্যগুলো আপডেট করুন' : 'Update your personal identity details visible across the network'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'পূর্ণ নাম (Full Name)' : 'Full Name'}
                  </label>
                  <GlassInput
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'বায়ো / পরিচয় (Bio)' : 'Bio / Short Description'}
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder={isBn ? 'আপনার সম্পর্কে সংক্ষেপে লিখুন...' : 'Digital artist and liquid UI enthusiast...'}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'অবস্থান (Location)' : 'Location'}
                    </label>
                    <GlassInput
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Dhaka, Bangladesh"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'ওয়েবসাইট / লিংক (Website URL)' : 'Website / Portfolio'}
                    </label>
                    <GlassInput
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    disabled={isSavingProfile}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600"
                  >
                    {isSavingProfile ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পরিবর্তন সেভ করুন' : 'Save Changes')}
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          )}

          {/* ================= 2. APPEARANCE & LANGUAGE ================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Theme Card */}
              <GlassCard variant="surface" className="p-5 sm:p-7 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/10">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'থিম ও ইন্টারফেস ভাষা' : 'Theme & Interface Language'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isBn ? 'আপনার পছন্দের ভিজ্যুয়াল থিম এবং ডিসপ্লে ভাষা নির্ধারণ করুন' : 'Choose your visual aesthetic mode and localized system language'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Theme Switcher */}
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>{isBn ? 'ভিজ্যুয়াল থিম মোড' : 'Aesthetic Theme'}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'light') toggleTheme();
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                            : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <IconSun size={15} />
                        <span>{isBn ? 'লাইট মোড' : 'Light Mode'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'dark') toggleTheme();
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                            : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <IconMoon size={15} />
                        <span>{isBn ? 'ডার্ক মোড' : 'Dark Mode'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Language Switcher */}
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Globe size={14} className="text-cyan-500" />
                      <span>{isBn ? 'সিস্টেমের ভাষা' : 'System Language'}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (language !== 'en') toggleLanguage();
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          language === 'en'
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20 font-black'
                            : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🇬🇧 English</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (language !== 'bn') toggleLanguage();
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          language === 'bn'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
                            : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🇧🇩 বাংলা</span>
                      </button>
                    </div>
                  </div>
                </div>

                {onOpenVoiceSearch && (
                  <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {isBn ? 'ভয়েস সার্চ ও অডিও সহকারী' : 'AI Voice Search Engine'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {isBn ? 'বাংলা ও ইংরেজি উভয় ভাষায় সরাসরি ভয়েস সার্চ সাপোর্ট' : 'Bangla & English real-time vocal discovery'}
                      </p>
                    </div>
                    <GlassButton variant="primary" onClick={onOpenVoiceSearch} leftIcon={<Mic size={14} />}>
                      {isBn ? 'ভয়েস সার্চ' : 'Voice Search'}
                    </GlassButton>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* ================= 3. SECURITY & PASSWORD ================= */}
          {activeTab === 'security' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/10">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'নিরাপত্তা ও পাসওয়ার্ড পরিবর্তন' : 'Security & Password Update'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn ? 'আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে শক্তিশালী পাসওয়ার্ড ব্যবহার করুন' : 'Ensure strong bcrypt-hashed credentials to protect your social assets'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'বর্তমান পাসওয়ার্ড (Current Password)' : 'Current Password'}
                  </label>
                  <GlassInput
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'নতুন পাসওয়ার্ড (New Password)' : 'New Password'}
                    </label>
                    <GlassInput
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      {isBn ? 'পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)' : 'Confirm New Password'}
                    </label>
                    <GlassInput
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    disabled={isSavingPassword}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600"
                  >
                    {isSavingPassword ? (isBn ? 'পরিবর্তন হচ্ছে...' : 'Updating...') : (isBn ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password')}
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          )}

          {/* ================= 4. PRIVACY RULES ================= */}
          {activeTab === 'privacy' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/10">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'প্রাইভেসি ও অডিয়েন্স রুলস' : 'Privacy Rules & Visibility'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn ? 'কে আপনার সাথে যোগাযোগ করতে পারবে এবং আপনার পোস্ট দেখতে পারবে তা নির্ধারণ করুন' : 'Control profile exposure, follower requests, and comment access'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Profile Visibility */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isBn ? 'প্রোফাইল ভিজিবিলিটি' : 'Profile Visibility'}
                    </label>
                    <select
                      value={profileVisibility}
                      onChange={(e) => setProfileVisibility(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="public">{isBn ? 'পাবলিক (সবার জন্য উন্মুক্ত)' : 'Public (Everyone)'}</option>
                      <option value="friends">{isBn ? 'শুধুমাত্র বন্ধুরা' : 'Friends Only'}</option>
                      <option value="private">{isBn ? 'প্রাইভেট (শুধুমাত্র ফলোয়ার)' : 'Private (Followers Only)'}</option>
                    </select>
                  </div>

                  {/* Friend Requests */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isBn ? 'ফ্রেন্ড রিকোয়েস্ট পাঠাতে পারবে' : 'Who Can Send Friend Requests'}
                    </label>
                    <select
                      value={friendRequestPrivacy}
                      onChange={(e) => setFriendRequestPrivacy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="everyone">{isBn ? 'যে কেউ' : 'Everyone'}</option>
                      <option value="friends_of_friends">{isBn ? 'বন্ধুদের বন্ধুরা' : 'Friends of Friends'}</option>
                      <option value="nobody">{isBn ? 'কেউ না' : 'Nobody'}</option>
                    </select>
                  </div>

                  {/* Direct Messages */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isBn ? 'ডিরেক্ট মেসেজ পাঠাতে পারবে' : 'Who Can Message You'}
                    </label>
                    <select
                      value={messagePrivacy}
                      onChange={(e) => setMessagePrivacy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="everyone">{isBn ? 'যে কেউ' : 'Everyone'}</option>
                      <option value="friends">{isBn ? 'শুধুমাত্র বন্ধুরা' : 'Friends Only'}</option>
                      <option value="nobody">{isBn ? 'কেউ না' : 'Nobody'}</option>
                    </select>
                  </div>

                  {/* Comments */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isBn ? 'পোস্টে কমেন্ট করার পারমিশন' : 'Who Can Comment on Posts'}
                    </label>
                    <select
                      value={commentPrivacy}
                      onChange={(e) => setCommentPrivacy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="everyone">{isBn ? 'যে কেউ' : 'Everyone'}</option>
                      <option value="friends">{isBn ? 'শুধুমাত্র বন্ধুরা' : 'Friends Only'}</option>
                      <option value="followers">{isBn ? 'ফলোয়ারগণ' : 'Followers Only'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <GlassButton
                    variant="primary"
                    onClick={handleSavePrivacy}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600"
                  >
                    {isBn ? 'প্রাইভেসি রুলস সেভ করুন' : 'Save Privacy Rules'}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ================= 6. NOTIFICATIONS & SOUND ================= */}
          {activeTab === 'notifications' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-500">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'নোটিফিকেশন চ্যানেল ও অ্যালার্ট' : 'Notification Channels & Chimes'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isBn ? 'পুশ অ্যালার্ট, ইন-অ্যাপ নোটিফিকেশন ও সাউন্ড সাউন্ড কাস্টমাইজ করুন' : 'Manage push alerts, real-time chimes, and Do Not Disturb hours'}
                    </p>
                  </div>
                </div>

                <GlassButton variant="secondary" onClick={handleSendTestPush} leftIcon={<Send size={14} />}>
                  {isBn ? 'টেস্ট সাউন্ড' : 'Test Sound'}
                </GlassButton>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{isBn ? 'ইন-অ্যাপ অ্যালার্ট' : 'In-App Notifications'}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.inAppEnabled}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, inAppEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{isBn ? 'অ্যাকোস্টিক চিমস সাউন্ড' : 'Acoustic Chimes Sound'}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.soundEnabled}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, soundEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{isBn ? 'ব্রাউজার পুশ নোটিফিকেশন' : 'Browser Push Notifications'}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.browserPushEnabled}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, browserPushEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{isBn ? 'ইমেইল ডাইজেস্ট অ্যালার্ট' : 'Email Notifications'}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs.emailEnabled}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, emailEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <GlassButton
                    variant="primary"
                    disabled={isSavingNotifPrefs}
                    onClick={handleSaveNotificationPreferences}
                    className="bg-gradient-to-r from-pink-500 to-rose-600"
                  >
                    {isSavingNotifPrefs ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পছন্দসমূহ সেভ করুন' : 'Save Notification Preferences')}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ================= 7. SESSIONS ================= */}
          {activeTab === 'sessions' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {isBn ? 'লগইন থাকা ডিভাইস ও সেশন' : 'Active Login Sessions'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isBn ? 'আপনার অ্যাকাউন্টে যুক্ত থাকা সক্রিয় ডিভাইসসমূহ' : 'Review all active hardware sessions authorized on your account'}
                    </p>
                  </div>
                </div>

                <GlassButton variant="secondary" onClick={handleLogoutOtherSessions} leftIcon={<LogOut size={14} />}>
                  {isBn ? 'অন্যান্য ডিভাইস লগআউট' : 'Sign Out Other Devices'}
                </GlassButton>
              </div>

              <div className="space-y-2">
                {isLoadingSessions ? (
                  <p className="text-xs text-slate-400 py-4 text-center">{isBn ? 'সেশন লোড হচ্ছে...' : 'Loading active sessions...'}</p>
                ) : sessions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-center text-xs text-slate-400">
                    {isBn ? 'বর্তমান ডিভাইস ছাড়া অন্য কোনো সেশন সক্রিয় নেই' : 'Only current device is actively authorized'}
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div key={s.id} className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor size={18} className="text-indigo-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{s.userAgent || 'Web Browser'}</p>
                          <p className="text-[10px] text-slate-400">IP: {s.ipAddress} • {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        {isBn ? 'সক্রিয়' : 'Active'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          )}

          {/* ================= 8. BLOCKED USERS ================= */}
          {activeTab === 'blocked' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5 pb-3 border-b border-black/5 dark:border-white/10">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-500">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {isBn ? 'ব্লক করা অ্যাকাউন্টের তালিকা' : 'Blocked Accounts Directory'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn ? 'যাদের আপনি ব্লক করেছেন তাদের তালিকা এবং প্রয়োজন হলে আনব্লক করুন' : 'Users you have restricted from contacting or viewing your transmissions'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {isLoadingBlocked ? (
                  <p className="text-xs text-slate-400 py-4 text-center">{isBn ? 'তালিকা লোড হচ্ছে...' : 'Loading blocked users...'}</p>
                ) : blockedUsers.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 text-center text-xs text-slate-400">
                    {isBn ? 'আপনি কোনো অ্যাকাউন্ট ব্লক করেননি' : 'No users are currently blocked'}
                  </div>
                ) : (
                  blockedUsers.map((b) => (
                    <div key={b.id} className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={b.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{b.fullName}</p>
                          <p className="text-[10px] text-slate-400">@{b.username}</p>
                        </div>
                      </div>
                      <GlassButton variant="secondary" size="sm" onClick={() => handleUnblockUser(b.id)}>
                        {isBn ? 'আনব্লক করুন' : 'Unblock'}
                      </GlassButton>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          )}

          {/* ================= 9. DANGER ZONE ================= */}
          {activeTab === 'danger' && (
            <GlassCard variant="surface" className="p-5 sm:p-7 space-y-5 border-rose-500/30 dark:border-rose-500/30 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5 pb-3 border-b border-rose-500/20">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    {isBn ? 'ডেঞ্জার জোন - অ্যাকাউন্ট মুছে ফেলা' : 'Danger Zone - Irreversible Actions'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isBn ? 'স্থায়ীভাবে আপনার অ্যাকাউন্ট মুছে ফেলার জন্য অনুরোধ করুন' : 'Permanently wipe your account, posts, wallet balance, and private messages'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {isBn ? 'স্থায়ীভাবে অ্যাকাউন্ট ডিলিট করুন' : 'Permanently Delete Account'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isBn ? 'একবার ডিলিট করলে এই ডেটা পুনরায় পুনরুদ্ধার করা সম্ভব নয়।' : 'Once deleted, all social connections and coins will be purged.'}
                  </p>
                </div>
                <GlassButton variant="danger" onClick={handleDeleteAccount} leftIcon={<Trash2 size={14} />}>
                  {isBn ? 'অ্যাকাউন্ট ডিলিট করুন' : 'Delete Account'}
                </GlassButton>
              </div>
            </GlassCard>
          )}
        </div>

      </div>
    </div>
  );
};
