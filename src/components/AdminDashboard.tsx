import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  Activity,
  Coins,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Key,
  CreditCard,
  Gift,
  Radio,
  Flame,
  Clock,
  Sparkles,
  BarChart3,
  Search,
  ChevronRight,
  LogOut,
  Globe,
  Lock,
  Layers,
  Sliders,
  DollarSign,
  MessageSquare,
  TrendingUp,
  Bell,
  LifeBuoy,
  Type,
  Handshake,
  ArrowLeft,
  Menu,
  X,
  Database,
  Cpu,
  RefreshCw,
  Smartphone,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AdminStats, User, ContentReport, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';

// Admin Sub-Modules
import { AdminCmsUserControl } from './admin/AdminCmsUserControl';
import { AdminCmsContentControl } from './admin/AdminCmsContentControl';
import { AdminCmsCredentialsControl } from './admin/AdminCmsCredentialsControl';
import { AdminEconomyRules } from './admin/AdminEconomyRules';
import { AdminGiftCatalog } from './admin/AdminGiftCatalog';
import { AdminGiftTransactions } from './admin/AdminGiftTransactions';
import { AdminFinancialDashboard } from './admin/AdminFinancialDashboard';
import { AdminTrendsModeration } from './admin/AdminTrendsModeration';
import { AdminAdManager } from './admin/AdminAdManager';
import { AdMobConfigPanel } from './ads/AdMobConfigPanel';
import { AdminModerationQueue } from './admin/AdminModerationQueue';
import { AdminPayStationControl } from './admin/AdminPayStationControl';
import { AdminSmsControl } from './admin/AdminSmsControl';
import { AdminNotificationCenter } from './admin/AdminNotificationCenter';
import { AdminSupportCenter } from './admin/AdminSupportCenter';
import { AdminGlobalSettings } from './admin/AdminGlobalSettings';
import { AdminSponsorManager } from './admin/AdminSponsorManager';
import { AdminTypographyManager } from './admin/AdminTypographyManager';

export interface AdminDashboardProps {
  onSwitchToUserView?: () => void;
}

export type CmsModule =
  | 'overview'
  | 'users'
  | 'content'
  | 'notifications'
  | 'support'
  | 'sponsors'
  | 'typography'
  | 'financial'
  | 'paystation'
  | 'sms'
  | 'economy'
  | 'gifts'
  | 'admob'
  | 'ads'
  | 'moderation'
  | 'trends'
  | 'credentials'
  | 'settings'
  | 'audit';

interface NavGroup {
  groupNameBn: string;
  groupNameEn: string;
  items: {
    id: CmsModule;
    labelBn: string;
    labelEn: string;
    descBn: string;
    descEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSwitchToUserView }) => {
  const { user, token, logout } = useAuth();
  const [activeCmsModule, setActiveCmsModule] = useState<CmsModule>('overview');
  const [mobileView, setMobileView] = useState<'menu' | 'module'>('module');
  const [searchFilter, setSearchFilter] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Executive Overview Chart State
  const [overviewPeriod, setOverviewPeriod] = useState<'today' | '7d' | '30d' | 'year'>('7d');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [overviewTab, setOverviewTab] = useState<'growth' | 'finance' | 'gateways'>('growth');

  // Confirmation Modal State (for save, update, back, logout actions)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchStats = async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats((await res.json()).stats);
        setLastSyncedAt(new Date());
        setSecondsAgo(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLogs((await res.json()).logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time live polling & Socket.IO real-time event listener
  useEffect(() => {
    fetchStats();
    fetchLogs();

    // Auto-sync polling every 4 seconds for ultra fast real-time synchronization
    const pollInterval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 4000);

    // Seconds ticker for UI timestamp
    const tickInterval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    // Socket.io real-time live events listener
    const socket = getSocket(token, user?.id);
    if (socket) {
      const handleRealtimePush = () => {
        fetchStats();
        fetchLogs();
      };

      const handleAuditLogAdded = (newLog: AuditLog) => {
        if (newLog) {
          setLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)].slice(0, 50));
          setLastSyncedAt(new Date());
          setSecondsAgo(0);
        }
      };

      socket.on('admin_metrics_updated', handleRealtimePush);
      socket.on('audit_log_added', handleAuditLogAdded);
      socket.on('new_post', handleRealtimePush);
      socket.on('new_report', handleRealtimePush);
      socket.on('new_user', handleRealtimePush);
      socket.on('balance_updated', handleRealtimePush);
      socket.on('new_notification', handleRealtimePush);

      return () => {
        clearInterval(pollInterval);
        clearInterval(tickInterval);
        socket.off('admin_metrics_updated', handleRealtimePush);
        socket.off('audit_log_added', handleAuditLogAdded);
        socket.off('new_post', handleRealtimePush);
        socket.off('new_report', handleRealtimePush);
        socket.off('new_user', handleRealtimePush);
        socket.off('balance_updated', handleRealtimePush);
        socket.off('new_notification', handleRealtimePush);
      };
    }

    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [token, user?.id]);

  // Global listener for confirmation requests from any sub-module
  useEffect(() => {
    const handleSubmoduleConfirm = (e: any) => {
      const { title, message, confirmLabel, cancelLabel, isDangerous, onConfirm } = e.detail || {};
      if (onConfirm) {
        setConfirmModal({
          isOpen: true,
          title: title || 'নিশ্চিতকরণ (Confirmation)',
          message: message || 'আপনি কি নিশ্চিত যে এই পরিবর্তনগুলো সংরক্ষণ করতে চান?',
          confirmLabel: confirmLabel || 'হ্যাঁ, নিশ্চিত করুন',
          cancelLabel: cancelLabel || 'বাতিল',
          isDangerous: !!isDangerous,
          onConfirm: () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            onConfirm();
          },
        });
      }
    };

    window.addEventListener('admin-request-confirmation', handleSubmoduleConfirm);
    return () => window.removeEventListener('admin-request-confirmation', handleSubmoduleConfirm);
  }, []);

  const handleLogoutClick = () => {
    setConfirmModal({
      isOpen: true,
      title: 'লগআউট নিশ্চিতকরণ (Confirm Logout)',
      message: 'আপনি কি নিশ্চিত যে আপনি অ্যাডমিন ড্যাশবোর্ড থেকে লগআউট করতে চান? আপনার সক্রিয় অ্যাডমিন সেশন সমাপ্ত হবে।',
      confirmLabel: 'লগআউট করুন (Log Out)',
      cancelLabel: 'বাতিল (Cancel)',
      isDangerous: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        logout();
      },
    });
  };

  const handleSwitchToUserViewClick = () => {
    if (!onSwitchToUserView) return;
    setConfirmModal({
      isOpen: true,
      title: 'ইউজার সাইটে যাবেন? (Switch to User Site)',
      message: 'আপনি কি নিশ্চিত যে আপনি অ্যাডমিন ড্যাশবোর্ড থেকে ইউজার সাইট দেখতে চান? যেকোনো সময় উপরের ব্যানার থেকে অ্যাডমিন CMS-এ ফিরে আসতে পারবেন।',
      confirmLabel: 'হ্যাঁ, ইউজার সাইটে যান',
      cancelLabel: 'ড্যাশবোর্ডে থাকুন',
      isDangerous: false,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        onSwitchToUserView();
      },
    });
  };

  const handleBackToMenuClick = (withConfirmation = false) => {
    if (withConfirmation) {
      setConfirmModal({
        isOpen: true,
        title: 'মেনু তালিকায় ফিরে যাবেন? (Return to Menu)',
        message: 'আপনি কি নিশ্চিত যে আপনি অ্যাডমিন মেনু তালিকায় ফিরে যেতে চান? কোনো পরিবর্তন থাকলে তা সেভ করেছেন কিনা নিশ্চিত হোন।',
        confirmLabel: 'হ্যাঁ, মেনুতে যান',
        cancelLabel: 'এখানে থাকুন',
        isDangerous: false,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setMobileView('menu');
        },
      });
    } else {
      setMobileView('menu');
    }
  };

  const navGroups: NavGroup[] = [
    {
      groupNameBn: 'ড্যাশবোর্ড ও বিশ্লেষণ',
      groupNameEn: 'Overview & Intelligence',
      items: [
        {
          id: 'overview',
          labelBn: 'এক্সিকিউটিভ ওভারভিউ',
          labelEn: 'Executive Overview',
          descBn: 'সার্বিক সিস্টেম মেট্রিক্স ও লাইভ পরিসংখ্যান',
          descEn: 'High-level real-time platform metrics',
          icon: BarChart3,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        },
        {
          id: 'audit',
          labelBn: 'সিস্টেম অডিট লগ',
          labelEn: 'System Audit Trail',
          descBn: 'অপরিবর্তনীয় সিকিউরিটি অ্যাকশন ও ট্রেস হিস্ট্রি',
          descEn: 'Immutable root logs and access events',
          icon: Clock,
        },
      ],
    },
    {
      groupNameBn: 'ইউজার ও সম্প্রদায়',
      groupNameEn: 'Users & Community',
      items: [
        {
          id: 'users',
          labelBn: 'ইউজার অ্যাকাউন্টস CMS',
          labelEn: 'User Accounts CMS',
          descBn: 'প্রোফাইল সম্পাদন, ভেরিফাইড ব্যাজ ও সাসপেনশন',
          descEn: 'Edit profiles, blue badges & suspensions',
          icon: Users,
          badge: 'Control',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        },
        {
          id: 'sponsors',
          labelBn: 'স্পন্সর ও পার্টনার্স CRUD',
          labelEn: 'Sponsor Partners CRUD',
          descBn: 'ব্র্যান্ড পার্টনারশিপ ও স্পনসরড প্রোফাইল',
          descEn: 'Commercial brand deals & VIP slots',
          icon: Handshake,
          badge: 'New',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        },
        {
          id: 'typography',
          labelBn: 'টাইপোগ্রাফি ও বাংলা ফন্ট',
          labelEn: 'Typography & Fonts',
          descBn: 'বাংলা ও ইংরেজি ফন্ট স্টাইল এবং গ্লোবাল সাইজিং',
          descEn: 'Bangla/English font engine & sizes',
          icon: Type,
          badge: 'Dynamic',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
      ],
    },
    {
      groupNameBn: 'কন্টেন্ট ও মডারেশন',
      groupNameEn: 'Content & Moderation',
      items: [
        {
          id: 'content',
          labelBn: 'পোস্ট ও কমেন্টস CMS',
          labelEn: 'Content & Feed CMS',
          descBn: 'ফিড পোস্ট, মিডিয়া, কমেন্ট ও রিঅ্যাকশন নিয়ন্ত্রণ',
          descEn: 'Moderate posts, media, comments & reels',
          icon: FileText,
          badge: 'Live Feed',
        },
        {
          id: 'moderation',
          labelBn: 'মডারেশন কিউ ও রিপোর্টস',
          labelEn: 'Moderation Queue',
          descBn: 'ব্যবহারকারীদের জমা দেওয়া রিপোর্ট পর্যালোচনা ও অ্যাকশন',
          descEn: 'Review user flags, reports & content triage',
          icon: Shield,
          badge: stats?.pendingReportsCount ? `${stats.pendingReportsCount} New` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
        },
        {
          id: 'trends',
          labelBn: 'ট্রেন্ডস ও ডিসকভারি অ্যালগরিদম',
          labelEn: 'Trends & Discovery',
          descBn: 'হ্যাশট্যাগ ট্রেন্ডস, ব্লকিং ও ফিচার্ড টপিকস',
          descEn: 'Hashtag discovery algorithms & blacklist',
          icon: Flame,
        },
      ],
    },
    {
      groupNameBn: 'আর্থিক ব্যবস্থাপনা ও গেটওয়ে',
      groupNameEn: 'Finance & Payment Engines',
      items: [
        {
          id: 'financial',
          labelBn: 'ট্রেজারি ও উইথড্রল পেআউট',
          labelEn: 'Treasury & Withdrawals',
          descBn: 'টাকা / USD ক্যাশআউট রিকোয়েস্ট ও ব্যালেন্স অনুমোদন',
          descEn: 'BDT/USD withdrawal payouts & escrow',
          icon: DollarSign,
          badge: 'BDT/USD',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        },
        {
          id: 'paystation',
          labelBn: 'PayStation গেটওয়ে ইঞ্জিন',
          labelEn: 'PayStation Gateway',
          descBn: 'bKash, Nagad, Rocket, Upay পেমেন্ট প্রসেসিং',
          descEn: 'Automated MFS payment verification',
          icon: CreditCard,
          badge: 'PayStation',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        },
        {
          id: 'sms',
          labelBn: 'Bulk SMS BD গেটওয়ে',
          labelEn: 'Bulk SMS BD Engine',
          descBn: 'ওটিপি (OTP), ক্যাম্পেইন ও এসএমএস ব্যালেন্স রিচার্জ',
          descEn: 'SMS OTP dispatch, templates & balances',
          icon: MessageSquare,
          badge: 'BulkSMSBD',
          badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30',
        },
        {
          id: 'economy',
          labelBn: 'কয়েন অর্থনীতি ও প্রাইসিং রুলস',
          labelEn: 'Coin Economy Rules',
          descBn: 'প্রতি পোস্ট, রিঅ্যাক্ট কয়েন রেট ও উপহার মূল্য',
          descEn: 'Earning rules, daily bonus & conversions',
          icon: Coins,
        },
        {
          id: 'gifts',
          labelBn: 'থ্রিডি গিফট ক্যাটালগ ও লেজার',
          labelEn: '3D Gifts Catalog',
          descBn: 'ভার্চুয়াল গিফট আইটেমস, মূল্য ও লেনদেন হিসাব',
          descEn: 'Custom 3D gifts, pricing & transfer ledger',
          icon: Gift,
        },
      ],
    },
    {
      groupNameBn: 'বিজ্ঞাপন ও কমিউনিকেশন',
      groupNameEn: 'Monetization & Engagement',
      items: [
        {
          id: 'admob',
          labelBn: 'Google AdMob ক্রেডেনশিয়াল ও ইউনিট',
          labelEn: 'Google AdMob Full Hub',
          descBn: 'অ্যান্ড্রয়েড ও আইওএস App ID, Banner, Interstitial, Rewarded ইউনিট সেটিংস',
          descEn: 'Configure Android & iOS App IDs, Ad Units & Test Suite',
          icon: Smartphone,
          badge: 'AdMob',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        },
        {
          id: 'ads',
          labelBn: 'অ্যাড ইঞ্জিন ও স্পন্সর ক্যাম্পেইন',
          labelEn: 'Ad Engine & Campaigns',
          descBn: 'স্পনসরড ক্যাম্পেইন, স্লট ফ্রিকোয়েন্সি ও CPM ট্র্যাকিং',
          descEn: 'Sponsor banners, slot frequencies & CPM tracking',
          icon: Radio,
          badge: 'Campaigns',
        },
        {
          id: 'notifications',
          labelBn: 'অ্যাডমিন নোটিফিকেশন সেন্টার',
          labelEn: 'Notification Broadcasts',
          descBn: 'সকল বা নির্দিষ্ট ইউজারদের পুশ ও ইন-অ্যাপ বার্তা প্রেরণ',
          descEn: 'Targeted in-app and browser broadcasts',
          icon: Bell,
          badge: 'Broadcast',
        },
        {
          id: 'support',
          labelBn: 'সাপোর্ট সেন্টার ও লাইভ হেল্পডেস্ক',
          labelEn: 'Help & Live Support',
          descBn: 'ইউজারদের টিকিট সমাধান ও লাইভ হেল্পডেস্ক',
          descEn: 'Helpdesk tickets, FAQs & user support',
          icon: LifeBuoy,
        },
      ],
    },
    {
      groupNameBn: 'সিস্টেম ও কনফিগারেশন',
      groupNameEn: 'System & Configuration',
      items: [
        {
          id: 'credentials',
          labelBn: 'গেটওয়ে API কি ও সিক্রেট',
          labelEn: 'Gateway API Credentials',
          descBn: 'মার্চেন্ট কি, Stripe, PayPal, SMS ও মেইল সেটিংস',
          descEn: 'Merchant keys, webhooks & API credentials',
          icon: Key,
          badge: 'Keys',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        },
        {
          id: 'settings',
          labelBn: 'গ্লোবাল সিস্টেম সেটিংস',
          labelEn: 'Global System Settings',
          descBn: 'সাইটের নাম, লোগো, রক্ষণাবেক্ষণ মোড ও সার্বিক নিয়মাবলী',
          descEn: 'Branding, maintenance mode & site limits',
          icon: Sliders,
          badge: 'Central',
        },
      ],
    },
  ];

  const handleSelectModule = (modId: CmsModule) => {
    setActiveCmsModule(modId);
    setMobileView('module');
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Find active item info
  const allItems = navGroups.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.id === activeCmsModule) || allItems[0];

  // Filtered groups for search
  const filteredGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          !searchFilter.trim() ||
          i.labelBn.toLowerCase().includes(searchFilter.toLowerCase()) ||
          i.labelEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
          i.descBn.toLowerCase().includes(searchFilter.toLowerCase()) ||
          i.descEn.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (i.badge && i.badge.toLowerCase().includes(searchFilter.toLowerCase()))
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 rounded-3xl border border-cyan-500/20 overflow-hidden shadow-2xl flex flex-col my-1">
      
      {/* TOP CMS COMMAND BAR (RESPONSIVE NAVBAR) */}
      <header className="px-3 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/25 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-display font-extrabold text-xs sm:text-base text-white tracking-wide truncate">
                Nixo Social CMS
              </h1>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] sm:text-[10px] font-bold border border-cyan-500/30 shrink-0">
                Admin
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
              Executive Administration & Content Hub
            </p>
          </div>
        </div>

        {/* Action buttons & Real-time Live Sync */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Real-time Live indicator */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="hidden sm:inline">Live Sync:</span>
            <span className="font-mono text-[9px] sm:text-[10px]">{secondsAgo === 0 ? 'now' : `${secondsAgo}s`}</span>
          </div>

          {/* Manual Force Sync Button */}
          <button
            type="button"
            onClick={fetchStats}
            disabled={isSyncing}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
            title="Force refresh live metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
          </button>

          {/* Switch to User Public App View (with Confirmation) */}
          {onSwitchToUserView && (
            <button
              type="button"
              onClick={handleSwitchToUserViewClick}
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Switch to User Social Feed"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">User Site</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button (Prominent & Clear with Active Badge) */}
          <button
            type="button"
            onClick={() => setMobileView(mobileView === 'menu' ? 'module' : 'menu')}
            className={`lg:hidden px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
              mobileView === 'menu'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
            aria-label="Toggle all admin modules menu"
          >
            {mobileView === 'menu' ? <X size={15} /> : <Menu size={15} />}
            <span>{mobileView === 'menu' ? 'মেনু বন্ধ' : `মেনু (${activeItem.labelEn})`}</span>
          </button>

          {/* ALWAYS VISIBLE LOGOUT BUTTON (with confirmation prompt) */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[11px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="Logout from Admin Dashboard"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>লগআউট</span>
          </button>
        </div>
      </header>

      {/* TWO-COLUMN LAYOUT: SIDEBAR ON LEFT, CONTENT AREA ON RIGHT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* ================= LEFT SIDEBAR (STICKY NAVIGATION) ================= */}
        <aside
          className={`w-full lg:w-80 bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 flex flex-col shrink-0 overflow-y-auto ${
            mobileView === 'module' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Filter for Admin Modules */}
          <div className="p-3 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search modules (e.g. SMS, PayStation, Ads)..."
                className="w-full bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Categorized Navigation Groups */}
          <div className="flex-1 p-3 space-y-4 overflow-y-auto">
            {filteredGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>{group.groupNameEn}</span>
                  <span className="text-[9px] font-mono font-normal text-slate-600">({group.items.length})</span>
                </div>

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeCmsModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectModule(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md shadow-cyan-500/20 scale-[1.01]'
                          : 'hover:bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-slate-950 text-cyan-300' : 'bg-slate-950/60 text-slate-400 border border-white/5'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs truncate ${isActive ? 'text-slate-950 font-black' : 'font-bold text-slate-200'}`}>
                            {item.labelEn}
                          </p>
                          <p className={`text-[10px] truncate ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                            {item.labelBn}
                          </p>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ml-1.5 ${
                            isActive
                              ? 'bg-slate-950 text-cyan-300'
                              : item.badgeColor || 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
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

          {/* Sidebar User & Status Footer */}
          <div className="p-3.5 border-t border-white/10 bg-slate-950/80 space-y-3 shrink-0">
            {/* User Profile Card */}
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-white truncate">{user?.fullName || user?.username || 'Super Admin'}</p>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold block">@{user?.username || 'admin'} · Root</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogoutClick}
                title="লগআউট করুন"
                className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all cursor-pointer shrink-0"
              >
                <LogOut size={14} />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
              <span className="font-mono text-[10px] text-slate-500">DB: SQLite ACID</span>
            </div>
          </div>
        </aside>

        {/* ================= RIGHT MAIN VIEWPORT (ACTIVE MODULE RENDERS AT TOP) ================= */}
        <main
          ref={mainRef}
          className={`flex-1 p-3 sm:p-6 bg-slate-950 overflow-y-auto space-y-5 ${
            mobileView === 'menu' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Mobile Back Button to Menu Header (with Confirmation) */}
          <div className="lg:hidden flex items-center justify-between p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
            <button
              type="button"
              onClick={() => handleBackToMenuClick(true)}
              className="flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>← All Modules (অ্যাডমিন মেনু)</span>
            </button>
            <span className="text-xs font-black text-white">{activeItem.labelEn}</span>
          </div>

          {/* Desktop Breadcrumbs & Module Header */}
          <div className="hidden lg:flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>Admin CMS</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-cyan-400 font-bold">{activeItem.labelEn}</span>
              </div>
              <h2 className="text-xl font-display font-extrabold text-white mt-1 flex items-center gap-2">
                <span>{activeItem.labelEn}</span>
                <span className="text-xs font-normal text-slate-400">({activeItem.labelBn})</span>
              </h2>
            </div>

            {activeItem.badge && (
              <span className={`px-3 py-1 rounded-full text-xs font-black ${activeItem.badgeColor || 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
                {activeItem.badge}
              </span>
            )}
          </div>

          {/* ================= MODULE 1: EXECUTIVE OVERVIEW ================= */}
          {activeCmsModule === 'overview' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              
              {/* Top Executive Control Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-white/10 shadow-xl">
                <div>
                  <h3 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    <span>এক্সিকিউটিভ অ্যানালিটিক্স ও প্ল্যাটফর্ম ওভারভিউ</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    রিয়েল-টাইম প্ল্যাটফর্ম বৃদ্ধি, PayStation গেটওয়ে লেনদেন, BulkSMS BD ডেসপ্যাচ এবং অডিট ট্রেইল
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Period Switcher */}
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                    {(['today', '7d', '30d', 'year'] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setOverviewPeriod(period)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          overviewPeriod === period
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {period === 'today' ? 'আজ' : period === '7d' ? '৭ দিন' : period === '30d' ? '৩০ দিন' : '১ বছর'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      fetchStats();
                      fetchLogs();
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-95"
                    title="রিলোড অ্যানালিটিক্স"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Informational Executive KPI Stat Cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>Total Users</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">+14.2%</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-white mt-1.5">{stats.totalUsers.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-cyan-300 font-semibold">
                      <Users className="w-3 h-3 text-cyan-400" />
                      <span>সক্রিয় অ্যাকাউন্টস</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>PayStation Vol</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">99.9% Up</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-emerald-300 mt-1.5">৳388.5K</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-300 font-semibold">
                      <CreditCard className="w-3 h-3 text-emerald-400" />
                      <span>bKash/Nagad/MFS</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>BulkSMS BD</span>
                      <span className="text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-full border border-blue-500/20">98.8% DLR</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-blue-300 mt-1.5">14,280</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-blue-300 font-semibold">
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                      <span>OTP & নোটিফিকেশন</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>Total Posts</span>
                      <span className="text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">+19.5%</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-purple-300 mt-1.5">{stats.totalPosts.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-purple-300 font-semibold">
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>ফিড ট্রান্সমিশন</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>Coin Supply</span>
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">Active</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-amber-300 mt-1.5">{stats.totalCoinsCirculating.toLocaleString()}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-300 font-semibold">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>সার্কুলেটিং কয়েন</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-rose-500/25 bg-gradient-to-b from-rose-950/30 to-slate-900/80 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between text-[10px] uppercase font-extrabold text-slate-400">
                      <span>Abuse Flags</span>
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">Pending</span>
                    </div>
                    <p className="font-display font-extrabold text-2xl text-rose-300 mt-1.5">{stats.pendingReportsCount}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-300 font-semibold">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>মডারেশন কিউ</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Visual Graphs & Charts Suite */}
              <div className="p-5 sm:p-6 rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl space-y-6">
                
                {/* Graph Tab Switcher */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOverviewTab('growth')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        overviewTab === 'growth'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>গ্রোথ ও অ্যাক্টিভিটি ট্রেন্ড (Growth Chart)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverviewTab('finance')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        overviewTab === 'finance'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>PayStation রেভিনিউ ভলিউম (Revenue Flow)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOverviewTab('gateways')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        overviewTab === 'gateways'
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      <span>গেটওয়ে স্বাস্থ্য ও ডায়াগনস্টিকস (Gateways Health)</span>
                    </button>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>রিয়েল-টাইম লাইভ সিঙ্ক অ্যাক্টিভ</span>
                    </span>
                    <span className="text-[10px] text-slate-400">প্রতি ৪ সেকেন্ডে ডাটা স্বয়ংক্রিয় রিফ্রেশ</span>
                  </div>
                </div>

                {/* GRAPH 1: USER GROWTH & ENGAGEMENT AREA CHART */}
                {overviewTab === 'growth' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                          <span>নতুন ইউজার রেজিস্ট্রেশন (Signups)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                          <span className="w-3 h-3 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
                          <span>দৈনিক সক্রিয় ব্যবহারকারী (DAU Engagements)</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        সর্বোচ্চ পিক: <strong className="text-cyan-300">১,৪২০ অ্যাক্টিভ/দিন</strong>
                      </span>
                    </div>

                    {/* SVG Interactive Area & Curve Graph */}
                    <div className="relative w-full h-64 bg-slate-950/80 rounded-2xl border border-white/10 p-4 overflow-hidden">
                      <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="cyanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="purpleAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Background Grid Lines */}
                        <line x1="0" y1="40" x2="700" y2="40" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="90" x2="700" y2="90" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="140" x2="700" y2="140" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="190" x2="700" y2="190" stroke="#475569" strokeWidth="1" />

                        {/* Series 2: Purple Area (DAU) */}
                        <path
                          d="M 20,180 Q 110,130 200,110 T 380,85 T 520,60 T 680,45 L 680,190 L 20,190 Z"
                          fill="url(#purpleAreaGradient)"
                        />
                        <path
                          d="M 20,180 Q 110,130 200,110 T 380,85 T 520,60 T 680,45"
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Series 1: Cyan Area (Signups) */}
                        <path
                          d="M 20,170 Q 120,150 210,125 T 390,95 T 530,50 T 680,25 L 680,190 L 20,190 Z"
                          fill="url(#cyanAreaGradient)"
                        />
                        <path
                          d="M 20,170 Q 120,150 210,125 T 390,95 T 530,50 T 680,25"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Data Points with Hover Interaction */}
                        {[
                          { x: 20, y: 170, label: 'সোম (Mon)', val1: '১২০ Signups', val2: '৪২০ Active' },
                          { x: 120, y: 150, label: 'মঙ্গল (Tue)', val1: '১৮০ Signups', val2: '৫৮০ Active' },
                          { x: 210, y: 125, label: 'বুধ (Wed)', val1: '৩৪০ Signups', val2: '৭৯০ Active' },
                          { x: 300, y: 110, label: 'বৃহঃ (Thu)', val1: '৫১০ Signups', val2: '৯৫০ Active' },
                          { x: 390, y: 95, label: 'শুক্র (Fri)', val1: '৭৮০ Signups', val2: '১,১২০ Active' },
                          { x: 530, y: 50, label: 'শনি (Sat)', val1: '১,১৫০ Signups', val2: '১,৩৪০ Active' },
                          { x: 680, y: 25, label: 'রবি (Sun)', val1: '১,৪২০ Signups', val2: '১,৫৮০ Active' },
                        ].map((pt, i) => (
                          <g
                            key={i}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredPointIndex(i)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          >
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredPointIndex === i ? 6 : 4}
                              className="fill-cyan-400 stroke-slate-950 stroke-2 transition-all"
                            />
                            {/* X-axis Day Labels */}
                            <text
                              x={pt.x}
                              y={208}
                              textAnchor="middle"
                              className="text-[9px] fill-slate-400 font-bold"
                            >
                              {pt.label.split(' ')[0]}
                            </text>
                          </g>
                        ))}
                      </svg>

                      {/* Floating Tooltip Indicator */}
                      {hoveredPointIndex !== null && (
                        <div className="absolute top-3 right-4 p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-[11px] shadow-xl space-y-1">
                          <p className="font-extrabold text-cyan-300">নির্বাচিত দিনের পরিসংখ্যান</p>
                          <p className="text-slate-300">নতুন অ্যাকাউন্ট: <strong className="text-white">+৩৬৫</strong></p>
                          <p className="text-purple-300">এনগেজমেন্ট: <strong>১,২৪০ সেশনস</strong></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* GRAPH 2: PAYSTATION REVENUE & FINANCIAL MFS VOLUME BAR CHART */}
                {overviewTab === 'finance' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-3 h-3 rounded-full bg-emerald-400" />
                          <span>PayStation গেটওয়ে ডিপোজিট (৳ BDT)</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <span className="w-3 h-3 rounded-full bg-amber-400" />
                          <span>কয়েন পারচেজ ভলিউম</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        মোট ডিপোজিট: ৳৩,৮৮,৫০০ BDT (সফলতা ৯৯.৮%)
                      </span>
                    </div>

                    {/* SVG Multi-Bar Chart */}
                    <div className="w-full h-64 bg-slate-950/80 rounded-2xl border border-white/10 p-4">
                      <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="40" x2="700" y2="40" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="100" x2="700" y2="100" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="160" x2="700" y2="160" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
                        <line x1="0" y1="190" x2="700" y2="190" stroke="#475569" strokeWidth="1" />

                        {[
                          { day: 'সোম', bdtH: 90, coinH: 70, bdt: '৳২৮,০০০', coins: '৩৫,০০০' },
                          { day: 'মঙ্গল', bdtH: 120, coinH: 95, bdt: '৳৪২,০০০', coins: '৫২,৫০০' },
                          { day: 'বুধ', bdtH: 80, coinH: 60, bdt: '৳২৬,৫০০', coins: '৩৩,১২৫' },
                          { day: 'বৃহঃ', bdtH: 140, coinH: 110, bdt: '৳৫৬,০০০', coins: '৭০,০০০' },
                          { day: 'শুক্র', bdtH: 160, coinH: 130, bdt: '৳৭২,৫০০', coins: '৯০,৬২৫' },
                          { day: 'শনি', bdtH: 175, coinH: 145, bdt: '৳৮৮,০০০', coins: '১,১০,০০০' },
                          { day: 'রবি', bdtH: 150, coinH: 125, bdt: '৳৭৫,৫০০', coins: '৯৪,৩৭৫' },
                        ].map((b, i) => {
                          const x = 50 + i * 90;
                          return (
                            <g key={i} className="group cursor-pointer">
                              {/* PayStation BDT Bar */}
                              <rect
                                x={x}
                                y={190 - b.bdtH}
                                width="28"
                                height={b.bdtH}
                                rx="6"
                                className="fill-emerald-500 hover:fill-emerald-400 transition-all shadow-md shadow-emerald-500/20"
                              />
                              {/* Coins Bar */}
                              <rect
                                x={x + 32}
                                y={190 - b.coinH}
                                width="28"
                                height={b.coinH}
                                rx="6"
                                className="fill-amber-500 hover:fill-amber-400 transition-all shadow-md shadow-amber-500/20"
                              />
                              {/* Day Label */}
                              <text x={x + 30} y={208} textAnchor="middle" className="text-[10px] fill-slate-400 font-bold">
                                {b.day}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* MFS Payment Gateway Breakdown Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                      <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30">
                        <span className="text-[10px] font-bold text-pink-400 block uppercase">bKash (বিকাশ)</span>
                        <p className="text-sm font-extrabold text-white mt-0.5">৳২৪৮,৫০০</p>
                        <span className="text-[10px] text-pink-300">৬৪% শেয়ার (মার্কেট লিডার)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                        <span className="text-[10px] font-bold text-orange-400 block uppercase">Nagad (নগদ)</span>
                        <p className="text-sm font-extrabold text-white mt-0.5">৳৯৩,২০০</p>
                        <span className="text-[10px] text-orange-300">২৪% শেয়ার (দ্রুততম পেমেন্ট)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                        <span className="text-[10px] font-bold text-purple-400 block uppercase">Rocket (রকেট)</span>
                        <p className="text-sm font-extrabold text-white mt-0.5">৳৩১,১০০</p>
                        <span className="text-[10px] text-purple-300">৮% শেয়ার (ব্যাংকিং ওয়ালেট)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                        <span className="text-[10px] font-bold text-blue-400 block uppercase">Cards & Other</span>
                        <p className="text-sm font-extrabold text-white mt-0.5">৳১৫,৭০০</p>
                        <span className="text-[10px] text-blue-300">৪% শেয়ার (ভিসা / মাস্টারকার্ড)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* GRAPH 3: GATEWAYS HEALTH & DIAGNOSTICS */}
                {overviewTab === 'gateways' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PayStation Engine Card */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm">PayStation Payment Engine</h4>
                            <p className="text-[11px] text-slate-400">অটোমেটেড ইনস্ট্যান্ট পেমেন্ট রিকনসিলিয়েশন</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          লাইভ সচল (Active)
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">এপিআই লেটেন্সি (API Response):</span>
                          <span className="font-mono font-bold text-emerald-300">১৮ ms (আল্ট্রা ফাস্ট)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">লেনদেন সফলতা অনুপাত:</span>
                          <span className="font-mono font-bold text-white">৯৯.৮২% সাকসেস রেট</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">অটো-ভেরিফিকেশন ওয়েবহুক:</span>
                          <span className="font-mono font-bold text-cyan-300">সংযুক্ত ও সক্রিয়</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">গেঁটওয়ে ফি সেটিংস:</span>
                          <span className="font-mono font-bold text-slate-300">১.৮% স্ট্যান্ডার্ড চার্জ</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectModule('paystation')}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>PayStation কনফিগারেশন প্যানেলে যান</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* BulkSMS BD Engine Card */}
                    <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm">Bulk SMS BD Engine</h4>
                            <p className="text-[11px] text-slate-400">ওটিপি কোড ও ট্রানজেকশনাল ডেসপ্যাচ</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          কানেক্টেড (Online)
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">গড় ডেলিভারি সময় (Speed):</span>
                          <span className="font-mono font-bold text-blue-300">১.৪ সেকেন্ড (ইন্সট্যান্ট)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">ডেলিভারি রিপোর্ট অনুপাত (DLR):</span>
                          <span className="font-mono font-bold text-white">৯৮.৮% সফল ডেলিভারি</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-400">সেন্ডার আইডি মাস্কিং:</span>
                          <span className="font-mono font-bold text-cyan-300">অনুমোদিত ব্র্যান্ড মাস্ক</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">রেট লিমিট সুরক্ষা:</span>
                          <span className="font-mono font-bold text-slate-300">৬০ এসএমএস / মিনিট</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectModule('sms')}
                        className="w-full py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs border border-blue-500/40 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Bulk SMS BD কন্ট্রোল সেন্টারে যান</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Launch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                  onClick={() => handleSelectModule('paystation')}
                  className="p-5 rounded-3xl border border-emerald-500/30 hover:border-emerald-400 cursor-pointer transition-all hover:scale-[1.01] space-y-3 bg-gradient-to-b from-emerald-950/40 to-slate-900 shadow-xl"
                >
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 w-fit">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-white text-base">PayStation গেটওয়ে</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      বিকাশ, নগদ, রকেট মার্চেন্ট ক্রেডেনশিয়াল ও অটোমেটেড পেমেন্ট রিকনসিলিয়েশন কনফিগারেশন।
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span>কনফিগারেশন খুলুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

                <div
                  onClick={() => handleSelectModule('sms')}
                  className="p-5 rounded-3xl border border-blue-500/30 hover:border-blue-400 cursor-pointer transition-all hover:scale-[1.01] space-y-3 bg-gradient-to-b from-blue-950/40 to-slate-900 shadow-xl"
                >
                  <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-300 w-fit">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-white text-base">Bulk SMS BD ইঞ্জিন</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      এসএমএস ওটিপি টেমপ্লেট, অ্যাকাউন্ট ব্যালেন্স রিচার্জ ও ক্যাম্পেইন ব্রডকাস্ট নিয়ন্ত্রণ।
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                    <span>এসএমএস হাব খুলুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

                <div
                  onClick={() => handleSelectModule('users')}
                  className="p-5 rounded-3xl border border-cyan-500/30 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.01] space-y-3 bg-gradient-to-b from-cyan-950/40 to-slate-900 shadow-xl"
                >
                  <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 w-fit">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-white text-base">ইউজার অ্যাকাউন্টস CMS</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      ইউজার প্রোফাইল সম্পাদনা, ব্লু ভেরিফায়েড ব্যাজ, কয়েন ব্যালেন্স এডজাস্ট ও সাসপেনশন।
                    </p>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                    <span>ইউজার পরিচালনা</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>

                <div
                  onClick={() => handleSelectModule('financial')}
                  className="p-5 rounded-3xl border border-amber-500/30 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.01] space-y-3 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-xl"
                >
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 w-fit">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-white text-base">ট্রেজারি ও উইথড্রল</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      পেন্ডিং ক্যাশআউট অনুরোধ অনুমোদন, BDT/USD পেআউট লেনদেন এবং রাজস্ব হিসাব খাতা।
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <span>ট্রেজারি দেখুন</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Recent Audit Trail Stream */}
              <div className="p-5 rounded-3xl border border-white/10 bg-slate-900/60 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-display font-extrabold text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>রিয়েল-টাইম ইমিউটেবল অডিট ট্রেইল (Security & Audit Stream)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    সর্বশেষ ১০টি রেকর্ড প্রদর্শিত
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {logs.slice(0, 10).map((l) => (
                    <div key={l.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 text-xs flex items-center justify-between hover:border-cyan-500/20 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300">{l.action}</span>
                          {l.userId && (
                            <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md font-mono">
                              {l.userId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300">{l.details || 'System operation executed'}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {new Date(l.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= ALL OTHER MODULES (LOADED DIRECTLY AT TOP) ================= */}
          {activeCmsModule === 'users' && <AdminCmsUserControl />}
          {activeCmsModule === 'sponsors' && <AdminSponsorManager />}
          {activeCmsModule === 'typography' && <AdminTypographyManager />}
          {activeCmsModule === 'content' && <AdminCmsContentControl />}
          {activeCmsModule === 'notifications' && <AdminNotificationCenter />}
          {activeCmsModule === 'support' && <AdminSupportCenter />}
          {activeCmsModule === 'paystation' && <AdminPayStationControl />}
          {activeCmsModule === 'sms' && <AdminSmsControl />}
          {activeCmsModule === 'financial' && <AdminFinancialDashboard />}
          {activeCmsModule === 'economy' && <AdminEconomyRules />}
          {activeCmsModule === 'gifts' && <AdminGiftCatalog />}
          {activeCmsModule === 'admob' && <AdMobConfigPanel />}
          {activeCmsModule === 'ads' && <AdminAdManager />}
          {activeCmsModule === 'moderation' && <AdminModerationQueue />}
          {activeCmsModule === 'trends' && <AdminTrendsModeration />}
          {activeCmsModule === 'credentials' && <AdminCmsCredentialsControl />}
          {activeCmsModule === 'settings' && <AdminGlobalSettings />}

          {activeCmsModule === 'audit' && (
            <div className="p-5 rounded-3xl border border-white/10 bg-slate-900/60 space-y-3 animate-in fade-in-50 duration-200">
              <h3 className="font-display font-extrabold text-white text-sm">System Immutable Security Audit Logs</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="p-3 rounded-2xl bg-slate-950 border border-white/5 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-cyan-300">{l.action}</span>
                      <p className="text-[11px] text-slate-300 mt-0.5">{l.details}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">IP: {l.ipAddress || '127.0.0.1'}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Quick Floating Menu Trigger (Always reachable from anywhere on long module pages) */}
        <div className="lg:hidden fixed bottom-5 right-4 z-40">
          <button
            type="button"
            onClick={() => setMobileView(mobileView === 'menu' ? 'module' : 'menu')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-2xl shadow-cyan-500/40 border border-cyan-300 active:scale-95 transition-all cursor-pointer"
            aria-label="Admin Menu Modules"
          >
            {mobileView === 'menu' ? <X size={16} /> : <Menu size={16} />}
            <span>{mobileView === 'menu' ? 'মেনু বন্ধ' : 'সব মেনু (18 Modules)'}</span>
          </button>
        </div>

      </div>

      {/* ======================================================== */}
      {/* GLOBAL CONFIRMATION MODAL (SAVE, UPDATE, BACK, LOGOUT)  */}
      {/* ======================================================== */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in-50 duration-200"
          onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-500/20 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.isDangerous
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {confirmModal.isDangerous ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-black text-base sm:text-lg text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                {confirmModal.cancelLabel || 'বাতিল (Cancel)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  onConfirm();
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  confirmModal.isDangerous
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/25'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{confirmModal.confirmLabel || 'হ্যাঁ, নিশ্চিত করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
