import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  PlusCircle,
  BarChart3,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  Users,
  Eye,
  Heart,
  Share2,
  ShieldCheck,
  Award,
  Wallet,
  Zap,
  Receipt,
  Calendar,
  X,
  ChevronRight,
  Activity,
  Bookmark,
  Filter,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { useAuth } from '../context/AuthContext';
import { CoinPurchaseModal } from './CoinPurchaseModal';
import { WithdrawalModal } from './WithdrawalModal';
import { GiftModal } from './GiftModal';
import { RewardedAdModal } from './ads/RewardedAdModal';
import {
  WalletInfo,
  WithdrawalRequestItem,
  CoinTransaction,
  PaymentTransactionRecord,
  GiftActivityItem,
} from '../types';

interface DashboardProProps {
  onOpenGiftModal?: (postId: string, receiverId: string) => void;
  defaultTab?: 'coins' | 'insights' | 'monetization';
}

export const DashboardPro: React.FC<DashboardProProps> = ({
  onOpenGiftModal,
  defaultTab = 'coins',
}) => {
  const { user, token, refreshUser, claimDailyBonus } = useAuth();

  // Top level views: Coin Management Hub, Engagement Insights, Monetization & Standing
  const [activeMainTab, setActiveMainTab] = useState<'coins' | 'insights' | 'monetization'>(defaultTab);

  // Coin Management sub-views
  const [coinSubTab, setCoinSubTab] = useState<'balance' | 'purchases' | 'withdrawals' | 'gifts'>('balance');

  // Engagement Insights timeframe
  const [insightsPeriod, setInsightsPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [insightsHoveredIndex, setInsightsHoveredIndex] = useState<number | null>(null);

  // Modals state
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransactionRecord | null>(null);

  // Peer-to-peer Transfer state
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Payout calculation in Monetization
  const [calcCoins, setCalcCoins] = useState<number>(500);

  // Financial & Activity data state
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PaymentTransactionRecord[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequestItem[]>([]);
  const [giftActivities, setGiftActivities] = useState<GiftActivityItem[]>([]);
  const [giftFilter, setGiftFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [activeTxTab, setActiveTxTab] = useState<'all' | 'recharge' | 'gift' | 'reward' | 'withdrawal'>('all');
  const [cancellingWithdrawalId, setCancellingWithdrawalId] = useState<string | null>(null);

  // Creator Insights state from API
  const [insightsData, setInsightsData] = useState<any>(null);

  // 1. Fetch Wallet & Balances
  const fetchWalletData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
      }
    } catch (e) {
      console.error('Failed to load wallet info:', e);
    }
  };

  // 2. Fetch Payment/Purchase History
  const fetchPurchaseHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/payments/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPurchaseHistory(data.payments || []);
      }
    } catch (e) {
      console.error('Failed to load payment history:', e);
    }
  };

  // 3. Fetch Withdrawal Requests
  const fetchWithdrawals = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/withdrawals/my-requests', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMyWithdrawals(data.requests || []);
      }
    } catch (e) {
      console.error('Failed to load withdrawals:', e);
    }
  };

  // 4. Fetch Gift Activity Log
  const fetchGiftActivity = async (filter: 'all' | 'sent' | 'received') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/gifts/my-activity?type=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGiftActivities(data.gifts || []);
      }
    } catch (e) {
      console.error('Failed to load gift activity:', e);
    }
  };

  // 5. Fetch Creator Engagement Insights
  const fetchEngagementInsights = async (period: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/creator/engagement-insights?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInsightsData(data.stats || null);
      }
    } catch (e) {
      console.error('Failed to load creator insights:', e);
    }
  };

  // Refresh all data
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchWalletData(),
      fetchPurchaseHistory(),
      fetchWithdrawals(),
      fetchGiftActivity(giftFilter),
      fetchEngagementInsights(insightsPeriod),
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    handleRefreshAll();
  }, [token]);

  useEffect(() => {
    fetchGiftActivity(giftFilter);
  }, [giftFilter, token]);

  useEffect(() => {
    fetchEngagementInsights(insightsPeriod);
  }, [insightsPeriod, token]);

  // Daily Bonus handler
  const handleClaimBonus = async () => {
    setIsClaimingBonus(true);
    try {
      const claimed = await claimDailyBonus();
      setBonusMessage(`Claimed +${claimed} Daily Bonus Coins!`);
      await fetchWalletData();
      await refreshUser();
      setTimeout(() => setBonusMessage(null), 4000);
    } catch (err: any) {
      setBonusMessage(err.message || 'Already claimed today!');
      setTimeout(() => setBonusMessage(null), 3000);
    } finally {
      setIsClaimingBonus(false);
    }
  };

  // Cancel Pending Withdrawal
  const handleCancelWithdrawal = async (id: string) => {
    if (!token) return;
    setCancellingWithdrawalId(id);
    try {
      const res = await fetch(`/api/withdrawals/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await Promise.all([fetchWithdrawals(), fetchWalletData(), refreshUser()]);
      }
    } catch (err) {
      console.error('Failed to cancel withdrawal:', err);
    } finally {
      setCancellingWithdrawalId(null);
    }
  };

  // Direct P2P Coin Transfer
  const handleDirectTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setTransferLoading(true);
    setTransferError(null);
    setTransferSuccess(null);

    const amountNum = parseInt(transferAmount, 10);
    if (!transferTarget.trim()) {
      setTransferError('Please enter a recipient username or ID.');
      setTransferLoading(false);
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Please enter a valid positive number of coins.');
      setTransferLoading(false);
      return;
    }
    if (amountNum > availableCoins) {
      setTransferError(`Insufficient balance. You currently have ${availableCoins.toLocaleString()} coins.`);
      setTransferLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientUsernameOrId: transferTarget.trim(),
          amount: amountNum,
          note: transferNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer coins');
      }

      setTransferSuccess(data.message || `Successfully sent ${amountNum.toLocaleString()} coins to @${data.recipient?.username}!`);
      setTransferTarget('');
      setTransferAmount('');
      setTransferNote('');
      await handleRefreshAll();
      await refreshUser();
      setTimeout(() => {
        setTransferSuccess(null);
        setShowTransferModal(false);
      }, 2200);
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed. Please verify the username and try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  // Balances
  const availableCoins = walletInfo?.availableBalance ?? user?.coinsBalance ?? 0;
  const pendingCoins = walletInfo?.pendingBalance ?? 0;
  const earnedCoins = walletInfo?.earnedBalance ?? walletInfo?.totalEarned ?? 0;
  const giftedCoins = walletInfo?.giftedBalance ?? walletInfo?.totalSpent ?? 0;
  const withdrawnBdt = walletInfo?.withdrawnAmountBdt ?? 0;
  const equivalentBdt = walletInfo?.equivalentBdt ?? availableCoins * 0.05;

  // Filtered ledger transactions
  const transactions: CoinTransaction[] =
    (walletInfo as any)?.recentTransactions || (walletInfo as any)?.transactions || [];
  const filteredTransactions = transactions.filter((tx: CoinTransaction) => {
    if (activeTxTab === 'all') return true;
    if (activeTxTab === 'reward') return tx.type === 'reward' || tx.type === 'daily_bonus';
    return tx.type === activeTxTab;
  });

  // Dynamic Insight Series based on period
  const getInsightsChartData = () => {
    if (insightsPeriod === '7d') {
      return [
        { label: 'Mon', reach: 3200, impressions: 5400, likes: 420, comments: 85, shares: 38, saves: 45, newFans: 28 },
        { label: 'Tue', reach: 4100, impressions: 6800, likes: 580, comments: 110, shares: 54, saves: 62, newFans: 36 },
        { label: 'Wed', reach: 3800, impressions: 6100, likes: 490, comments: 92, shares: 44, saves: 51, newFans: 31 },
        { label: 'Thu', reach: 5600, impressions: 9200, likes: 820, comments: 175, shares: 86, saves: 98, newFans: 64 },
        { label: 'Fri', reach: 7400, impressions: 12100, likes: 1140, comments: 240, shares: 125, saves: 142, newFans: 92 },
        { label: 'Sat', reach: 8900, impressions: 14800, likes: 1390, comments: 310, shares: 168, saves: 195, newFans: 118 },
        { label: 'Sun', reach: 6800, impressions: 11000, likes: 980, comments: 205, shares: 98, saves: 115, newFans: 75 },
      ];
    }
    if (insightsPeriod === '30d') {
      return [
        { label: 'W1', reach: 18400, impressions: 31000, likes: 2900, comments: 580, shares: 290, saves: 340, newFans: 210 },
        { label: 'W2', reach: 24200, impressions: 42000, likes: 3850, comments: 740, shares: 410, saves: 480, newFans: 295 },
        { label: 'W3', reach: 31500, impressions: 56000, likes: 5100, comments: 980, shares: 590, saves: 650, newFans: 410 },
        { label: 'W4', reach: 42800, impressions: 74000, likes: 6900, comments: 1420, shares: 820, saves: 910, newFans: 580 },
      ];
    }
    if (insightsPeriod === '90d') {
      return [
        { label: 'Month 1', reach: 72000, impressions: 128000, likes: 11200, comments: 2200, shares: 1300, saves: 1500, newFans: 920 },
        { label: 'Month 2', reach: 98000, impressions: 175000, likes: 16400, comments: 3100, shares: 1900, saves: 2100, newFans: 1340 },
        { label: 'Month 3', reach: 145000, impressions: 260000, likes: 24800, comments: 4900, shares: 3100, saves: 3400, newFans: 2150 },
      ];
    }
    return [
      { label: 'Q1', reach: 180000, impressions: 320000, likes: 29000, comments: 5900, shares: 3800, saves: 4200, newFans: 2400 },
      { label: 'Q2', reach: 240000, impressions: 440000, likes: 39000, comments: 8100, shares: 5100, saves: 5900, newFans: 3600 },
      { label: 'Q3', reach: 330000, impressions: 610000, likes: 54000, comments: 11500, shares: 7400, saves: 8300, newFans: 5100 },
      { label: 'Q4', reach: 460000, impressions: 850000, likes: 78000, comments: 16800, shares: 10900, saves: 12100, newFans: 7400 },
    ];
  };

  const chartData = getInsightsChartData();
  const maxReach = Math.max(...chartData.map((d) => d.reach));
  const totalReachSum = chartData.reduce((acc, d) => acc + d.reach, 0);
  const totalInteractionsSum = chartData.reduce(
    (acc, d) => acc + d.likes + d.comments + d.shares + d.saves,
    0
  );
  const totalNewFansSum = chartData.reduce((acc, d) => acc + d.newFans, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Pro Navigation Header */}
      <GlassCard level={2} variant="frosted" specularEdge={true} className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/25">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-500 fill-amber-500/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
                  Dashboard Pro
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm">
                  Creator Suite
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized coin treasury, payout infrastructure, and high-fidelity engagement insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <GlassButton
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              Refresh
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
              onClick={() => setShowPurchaseModal(true)}
            >
              Top Up Coins
            </GlassButton>
          </div>
        </div>

        {bonusMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
            <span>{bonusMessage}</span>
          </div>
        )}
      </GlassCard>

      {/* 2. Main Navigation Tabs - 100% Mobile Responsive Grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 shadow-sm w-full max-w-full">
        {[
          { id: 'coins', label: 'Coins Hub', fullLabel: 'Coin Management Hub', icon: Coins, color: 'text-amber-500' },
          { id: 'insights', label: 'Insights', fullLabel: 'Engagement Insights', icon: BarChart3, color: 'text-cyan-500' },
          { id: 'monetization', label: 'Monetization', fullLabel: 'Monetization & Standing', icon: Award, color: 'text-purple-500' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id as any)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${tab.color}`} />
              <span className="truncate">
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: COIN MANAGEMENT HUB                           */}
      {/* ======================================================== */}
      {activeMainTab === 'coins' && (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
          {/* Sub Navigation Bar for Coin Views - 100% Mobile Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 border-b border-black/5 dark:border-white/10 pb-3 w-full max-w-full">
            {[
              { id: 'balance', label: 'Balances', fullLabel: 'Coin Balances', icon: Wallet },
              { id: 'purchases', label: `Purchases (${purchaseHistory.length})`, fullLabel: `Purchase History (${purchaseHistory.length})`, icon: Receipt },
              { id: 'withdrawals', label: `Withdrawals (${myWithdrawals.length})`, fullLabel: `Withdrawal Status (${myWithdrawals.length})`, icon: ArrowUpRight },
              { id: 'gifts', label: `Gifts (${giftActivities.length})`, fullLabel: `Gift Activity (${giftActivities.length})`, icon: Gift },
            ].map((sub) => {
              const SubIcon = sub.icon;
              const isCurrent = coinSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setCoinSubTab(sub.id as any)}
                  className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer truncate ${
                    isCurrent
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/35 font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white liquid-glass-surface'
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">{sub.label}</span>
                    <span className="hidden sm:inline">{sub.fullLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* SUB-VIEW 1: COIN BALANCES & OPERATIONS */}
          {coinSubTab === 'balance' && (
            <div className="space-y-6 animate-fadeIn w-full max-w-full">
              {/* Content Creation Coin Rewards Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-amber-500/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Automatic Post Coin Earnings
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                    Active & Instant
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every post you create awards you coins instantly! You can gift these coins to creators or cash them out via bKash, Nagad, and Rocket.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl liquid-glass-surface border border-cyan-500/20 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center text-sm shrink-0">📝</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">Text Post</div>
                      <div className="text-[11px] text-cyan-500 font-mono font-bold">+5 Coins</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl liquid-glass-surface border border-emerald-500/20 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0">📷</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">Photo Post</div>
                      <div className="text-[11px] text-emerald-500 font-mono font-bold">+10 Coins</div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl liquid-glass-surface border border-purple-500/20 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm shrink-0">🎬</span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">Video Post</div>
                      <div className="text-[11px] text-purple-500 font-mono font-bold">+15 Coins</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 Real-Time Balances Cards - Responsive Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3.5 w-full">
                {/* 1. Available */}
                <GlassCard level={2} variant="glow" className="p-3 sm:p-4 border-amber-500/30 relative overflow-hidden min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <Coins className="w-4 h-4 text-amber-500 shrink-0" /> Available
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold shrink-0">
                      Live
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
                    {availableCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 truncate">
                    ≈ ৳{equivalentBdt.toFixed(2)} BDT
                  </div>
                </GlassCard>

                {/* 2. Pending */}
                <GlassCard level={2} variant="frosted" className="p-3 sm:p-4 border-purple-500/30 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <Clock className="w-4 h-4 text-purple-500 shrink-0" /> Pending
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-extrabold shrink-0">
                      Review
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
                    {pendingCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
                    Payout reserved
                  </div>
                </GlassCard>

                {/* 3. Earned */}
                <GlassCard level={2} variant="frosted" className="p-3 sm:p-4 border-emerald-500/30 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" /> Earned
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold shrink-0">
                      Revenue
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
                    {earnedCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                    Creator gifts & posts
                  </div>
                </GlassCard>

                {/* 4. Gifted */}
                <GlassCard level={2} variant="frosted" className="p-3 sm:p-4 border-pink-500/30 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <Gift className="w-4 h-4 text-pink-500 shrink-0" /> Gifted
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-700 dark:text-pink-300 font-extrabold shrink-0">
                      Sent
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
                    {giftedCoins.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-pink-600 dark:text-pink-400 font-medium mt-1 truncate">
                    Transfers & gifts
                  </div>
                </GlassCard>

                {/* 5. Withdrawn */}
                <GlassCard level={2} variant="frosted" className="col-span-2 sm:col-span-1 p-3 sm:p-4 border-blue-500/30 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" /> Cashed Out
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-extrabold shrink-0">
                      bKash
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight truncate">
                    ৳{withdrawnBdt.toFixed(0)}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 truncate">
                    bKash / Nagad / Rocket
                  </div>
                </GlassCard>
              </div>

              {/* Operations Control Bar - 6 Quick Actions Grid */}
              <GlassCard level={2} variant="surface" className="p-4 sm:p-5 w-full max-w-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Quick Coin Actions & Tools
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Direct P2P & Mobile Banking
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(true)}
                    className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0" />
                    <span>Purchase Coins</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                    className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                  >
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    <span>Cashout / Payout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                  >
                    <ArrowDownLeft className="w-4 h-4 shrink-0" />
                    <span>Transfer to User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGiftModal && user) {
                        onOpenGiftModal('', user.id);
                      } else {
                        setShowGiftModal(true);
                      }
                    }}
                    className="py-3 px-2 sm:px-3 rounded-2xl liquid-glass-surface hover:bg-pink-500/20 text-slate-800 dark:text-slate-200 border border-pink-500/30 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                  >
                    <Gift className="w-4 h-4 text-pink-500 shrink-0" />
                    <span>Send 3D Gift</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRewardedModal(true)}
                    className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Watch Ad (+25)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClaimBonus}
                    disabled={isClaimingBonus}
                    className="py-3 px-2 sm:px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-98 text-center disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{isClaimingBonus ? 'Claiming...' : 'Daily Bonus (+50)'}</span>
                  </button>
                </div>

                {/* Daily Bonus Streak Notice */}
                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Cashout conversion rate: <strong className="text-amber-500 font-mono">20 Coins = ৳1.00 BDT</strong> (Minimum payout: 500 Coins)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    Withdraw via bKash/Nagad/Rocket →
                  </button>
                </div>
              </GlassCard>

              {/* Transactions Ledger Snapshot */}
              <GlassCard level={2} variant="frosted" className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/10">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" /> Real-time Activity Ledger
                  </h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'recharge', label: 'Top-ups' },
                      { id: 'gift', label: 'Gifts' },
                      { id: 'reward', label: 'Rewards' },
                      { id: 'withdrawal', label: 'Cashouts' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTxTab(tab.id as any)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                          activeTxTab === tab.id
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-bold'
                            : 'liquid-glass-surface text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No transactions recorded in this ledger slice.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.slice(0, 8).map((tx: CoinTransaction) => {
                      const isPositive =
                        tx.type === 'recharge' ||
                        tx.type === 'reward' ||
                        tx.type === 'daily_bonus' ||
                        (tx.type === 'gift' && tx.receiverId === user?.id);

                      return (
                        <div
                          key={tx.id}
                          className="p-3 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                                isPositive
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : 'bg-rose-500/20 text-rose-500'
                              }`}
                            >
                              {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {tx.note || (isPositive ? 'Coins Received' : 'Coins Disbursed')}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(tx.createdAt).toLocaleDateString()} · {tx.type?.replace('_', ' ') || 'General'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`font-mono font-black text-xs ${
                                isPositive ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isPositive ? '+' : '-'}
                              {tx.amount.toLocaleString()} Coins
                            </div>
                            {tx.balanceAfter !== undefined && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Bal: {tx.balanceAfter.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* SUB-VIEW 2: DETAILED PURCHASE HISTORY */}
          {coinSubTab === 'purchases' && (
            <div className="space-y-4 animate-fadeIn">
              <GlassCard level={2} variant="frosted" className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-500" /> Coin Recharge & Purchase History
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Audit log of packages purchased via PayStation, bKash, Nagad, Rocket, and Bank Cards
                    </p>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    Buy More Coins
                  </GlassButton>
                </div>

                {purchaseHistory.length === 0 ? (
                  <div className="p-10 rounded-2xl liquid-glass-surface text-center space-y-2">
                    <Coins className="w-8 h-8 text-amber-500/50 mx-auto" />
                    <p className="text-xs text-slate-400">No purchase records found.</p>
                    <button
                      onClick={() => setShowPurchaseModal(true)}
                      className="text-xs text-amber-500 font-bold hover:underline"
                    >
                      Top up your wallet today
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {purchaseHistory.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-amber-500/30"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                {p.totalCoins?.toLocaleString() || p.coinsAmount?.toLocaleString()} Coins
                              </span>
                              {p.bonusCoins > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                                  +{p.bonusCoins} Bonus
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  p.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    : p.status === 'failed'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              TX: <span className="font-mono">{p.transactionId}</span> · Gateway:{' '}
                              <span className="uppercase font-semibold">{p.gatewayId}</span> ·{' '}
                              {new Date(p.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-black/5 dark:border-white/10">
                          <div className="text-left md:text-right">
                            <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                              ৳{p.amountBdt?.toFixed(2)} BDT
                            </span>
                            <p className="text-[10px] text-slate-400">{p.currency || 'BDT'}</p>
                          </div>
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="px-3 py-1.5 rounded-xl liquid-glass-surface hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* SUB-VIEW 3: DETAILED WITHDRAWAL STATUS */}
          {coinSubTab === 'withdrawals' && (
            <div className="space-y-4 animate-fadeIn">
              <GlassCard level={2} variant="frosted" className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-purple-500" /> Cashout & Withdrawal Pipeline
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time status of your payouts to bKash, Nagad, and Bangladeshi bank accounts
                    </p>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    leftIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    onClick={() => setShowWithdrawModal(true)}
                  >
                    Request New Payout
                  </GlassButton>
                </div>

                {myWithdrawals.length === 0 ? (
                  <div className="p-10 rounded-2xl liquid-glass-surface text-center space-y-2">
                    <ArrowUpRight className="w-8 h-8 text-purple-500/50 mx-auto" />
                    <p className="text-xs text-slate-400">No withdrawal requests placed yet.</p>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      className="text-xs text-purple-500 font-bold hover:underline"
                    >
                      Convert earned coins to BDT cash
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWithdrawals.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {req.requestCode}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                req.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : req.status === 'cancelled'
                                  ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {req.status}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                              {req.payoutMethodType}
                            </span>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                              ৳{req.netPayoutBdt?.toFixed(2)} BDT
                            </span>
                            <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                              ({req.coinsAmount?.toLocaleString()} coins)
                            </span>
                          </div>
                        </div>

                        {/* Status Pipeline Progress Indicator */}
                        <div className="pt-1">
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-center text-slate-400">
                            <div
                              className={`p-1.5 rounded-lg ${
                                req.status !== 'cancelled' && req.status !== 'rejected'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
                                  : 'bg-black/5 dark:bg-white/5'
                              }`}
                            >
                              1. Submitted
                            </div>
                            <div
                              className={`p-1.5 rounded-lg ${
                                req.status === 'reviewing' ||
                                req.status === 'approved' ||
                                req.status === 'processing' ||
                                req.status === 'paid'
                                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold'
                                  : 'bg-black/5 dark:bg-white/5'
                              }`}
                            >
                              2. Verification
                            </div>
                            <div
                              className={`p-1.5 rounded-lg ${
                                req.status === 'processing' || req.status === 'paid'
                                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold'
                                  : 'bg-black/5 dark:bg-white/5'
                              }`}
                            >
                              3. Processing
                            </div>
                            <div
                              className={`p-1.5 rounded-lg ${
                                req.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'bg-black/5 dark:bg-white/5'
                              }`}
                            >
                              4. Paid Out
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-black/5 dark:border-white/10 pt-2">
                          <div>
                            Requested on: {new Date(req.createdAt).toLocaleString()} · Fee:{' '}
                            ৳{req.feeBdt?.toFixed(2) || '0.00'}
                          </div>

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleCancelWithdrawal(req.id)}
                              disabled={cancellingWithdrawalId === req.id}
                              className="text-rose-500 hover:text-rose-600 font-bold text-xs cursor-pointer self-start sm:self-auto"
                            >
                              {cancellingWithdrawalId === req.id ? 'Cancelling...' : 'Cancel Request'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* SUB-VIEW 4: DETAILED GIFT ACTIVITY LOG */}
          {coinSubTab === 'gifts' && (
            <div className="space-y-4 animate-fadeIn">
              <GlassCard level={2} variant="frosted" className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-500" /> 3D Virtual Gift Activity Log
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Audit trail of sent appreciation gifts and creator tips received
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5">
                    {[
                      { id: 'all', label: 'All Activity' },
                      { id: 'sent', label: 'Gifts Sent' },
                      { id: 'received', label: 'Gifts Received' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setGiftFilter(f.id as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          giftFilter === f.id
                            ? 'bg-pink-500 text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {giftActivities.length === 0 ? (
                  <div className="p-10 rounded-2xl liquid-glass-surface text-center space-y-2">
                    <Gift className="w-8 h-8 text-pink-500/50 mx-auto" />
                    <p className="text-xs text-slate-400">No gift activity recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {giftActivities.map((g) => {
                      const isOutgoing = g.direction === 'sent';
                      return (
                        <div
                          key={g.id}
                          className="p-3.5 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                              {g.giftImage3d ? (
                                <img src={g.giftImage3d} className="w-7 h-7 object-contain" alt="" />
                              ) : (
                                <Gift className="w-5 h-5 text-pink-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {g.giftName}
                                </span>
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    isOutgoing
                                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {isOutgoing ? 'Sent to' : 'Received from'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {isOutgoing ? g.receiverName : g.senderName} ·{' '}
                                {new Date(g.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`font-mono font-black text-xs ${
                                isOutgoing ? 'text-rose-500' : 'text-emerald-500'
                              }`}
                            >
                              {isOutgoing ? '-' : '+'}
                              {g.coinAmount?.toLocaleString()} Coins
                            </span>
                            {g.postId && (
                              <p className="text-[10px] text-cyan-500 font-medium">Attached to Post</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: HIGH-FIDELITY ENGAGEMENT INSIGHTS PANEL       */}
      {/* ======================================================== */}
      {activeMainTab === 'insights' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Timeframe Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-500" /> Audience Engagement & Velocity Insights
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-dimensional reach curves, post interaction trends, and follower acquisition velocity
              </p>
            </div>

            <div className="flex gap-1.5 p-1 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10">
              {[
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: '90d', label: '90 Days' },
                { id: '1y', label: '1 Year' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setInsightsPeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    insightsPeriod === p.id
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Core Insight KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* 1. Profile Reach */}
            <GlassCard level={2} variant="frosted" className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-cyan-500 text-xs font-bold flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Profile Reach
                </span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  +18.4%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalReachSum.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {(totalReachSum * 1.6).toFixed(0)} Total impressions
              </p>
            </GlassCard>

            {/* 2. Total Interactions */}
            <GlassCard level={2} variant="frosted" className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-pink-500 text-xs font-bold flex items-center gap-1.5">
                  <Heart className="w-4 h-4" /> Interactions
                </span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  +12.6%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalInteractionsSum.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Likes, shares & comments</p>
            </GlassCard>

            {/* 3. Follower Growth */}
            <GlassCard level={2} variant="frosted" className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-purple-500 text-xs font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Growth Velocity
                </span>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  +24.1%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                +{totalNewFansSum.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Net new fans acquired</p>
            </GlassCard>

            {/* 4. Engagement Rate */}
            <GlassCard level={2} variant="frosted" className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-500 text-xs font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Engagement Rate
                </span>
                <span className="text-[10px] text-cyan-500 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                  Top 5%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {insightsPeriod === '7d' ? '7.2%' : insightsPeriod === '30d' ? '6.4%' : '5.9%'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Per impression interaction</p>
            </GlassCard>
          </div>

          {/* VISUALIZATION 1: INTERACTIVE PROFILE REACH & IMPRESSIONS AREA CHART */}
          <GlassCard level={2} variant="frosted" className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-500" /> Profile Reach & Viewer Discovery Curve
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Unique accounts reached across standard feeds, explore discovery, and Feels
                </p>
              </div>

              {insightsHoveredIndex !== null && (
                <div className="text-right font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold animate-fadeIn">
                  {chartData[insightsHoveredIndex].label}: {chartData[insightsHoveredIndex].reach.toLocaleString()}{' '}
                  Reached ({chartData[insightsHoveredIndex].impressions.toLocaleString()} Imp)
                </div>
              )}
            </div>

            {/* High-Fidelity SVG Area Graph */}
            <div className="h-56 w-full pt-4 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="liquidCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Grid Lines */}
                <line x1="0" y1="30" x2="700" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="700" y2="80" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
                <line x1="0" y1="130" x2="700" y2="130" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />

                {/* SVG Curve Path Generator */}
                {(() => {
                  const points = chartData.map((d, i) => {
                    const x = (i / (chartData.length - 1)) * 680 + 10;
                    const y = 160 - (d.reach / (maxReach * 1.15)) * 140;
                    return { x, y };
                  });

                  // Build smooth path
                  const dPath = points.reduce((acc, p, idx) => {
                    if (idx === 0) return `M ${p.x} ${p.y}`;
                    const prev = points[idx - 1];
                    const cx = (prev.x + p.x) / 2;
                    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
                  }, '');

                  const areaPath = `${dPath} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#liquidCyanGrad)" />
                      <path d={dPath} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r={insightsHoveredIndex === idx ? 6 : 4}
                          className="cursor-pointer transition-all fill-white dark:fill-slate-900 stroke-cyan-500"
                          strokeWidth="2.5"
                          onMouseEnter={() => setInsightsHoveredIndex(idx)}
                          onMouseLeave={() => setInsightsHoveredIndex(null)}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* X-Axis Labels */}
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-2">
                {chartData.map((d, idx) => (
                  <span
                    key={d.label}
                    onMouseEnter={() => setInsightsHoveredIndex(idx)}
                    onMouseLeave={() => setInsightsHoveredIndex(null)}
                    className={`cursor-pointer transition-colors ${
                      insightsHoveredIndex === idx ? 'text-cyan-500 font-bold' : ''
                    }`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Discovery Channel Breakdown Bar */}
            <div className="pt-3 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Audience Discovery Channels:</span>
              <div className="flex items-center gap-4 flex-wrap text-[11px]">
                <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  Home Feed (54%)
                </span>
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Explore & Feels (32%)
                </span>
                <span className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  Direct Profile & Search (14%)
                </span>
              </div>
            </div>
          </GlassCard>

          {/* VISUALIZATION 2: POST INTERACTION TRENDS & AUDIENCE HEATMAP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* A. Post Interaction Trends Component */}
            <GlassCard level={2} variant="frosted" className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-pink-500" /> Post Interaction Velocity
                </h4>
                <span className="text-[10px] text-slate-400">Likes, Comments & Reposts</span>
              </div>

              <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2">
                {chartData.map((d) => {
                  const maxVal = Math.max(...chartData.map((x) => x.likes + x.comments + x.shares));
                  const total = d.likes + d.comments + d.shares;
                  const barHeight = Math.max(15, (total / maxVal) * 100);

                  return (
                    <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                      <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {total}
                      </span>
                      <div className="w-full max-w-[34px] bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden h-36 flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-pink-500 via-purple-500 to-cyan-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-black/5 dark:border-white/10">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" /> Likes / Reactions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Comments
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Shares & Reposts
                </span>
              </div>
            </GlassCard>

            {/* B. Peak Engagement Activity Heatmap */}
            <GlassCard level={2} variant="frosted" className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Peak Audience Active Hours
                </h4>
                <span className="text-[10px] text-amber-500 font-semibold">Optimal Publishing Window</span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Audience activity density mapped across days and time slots to maximize viral reach.
              </p>

              {/* Heatmap Grid */}
              <div className="space-y-1.5">
                {[
                  { time: 'Morning (06:00 - 12:00)', intensities: [20, 35, 45, 60, 50, 40, 30] },
                  { time: 'Afternoon (12:00 - 17:00)', intensities: [40, 55, 65, 75, 70, 60, 50] },
                  { time: 'Prime Evening (17:00 - 22:00)', intensities: [85, 90, 95, 100, 95, 90, 85] },
                  { time: 'Night (22:00 - 02:00)', intensities: [50, 60, 70, 80, 85, 75, 60] },
                ].map((slot) => (
                  <div key={slot.time} className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-medium">{slot.time}</span>
                    <div className="grid grid-cols-7 gap-1">
                      {slot.intensities.map((val, idx) => (
                        <div
                          key={idx}
                          title={`Activity Level: ${val}%`}
                          className={`h-5 rounded-md transition-all cursor-pointer hover:scale-105 ${
                            val >= 90
                              ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                              : val >= 70
                              ? 'bg-amber-500/70'
                              : val >= 50
                              ? 'bg-amber-500/40'
                              : val >= 30
                              ? 'bg-amber-500/20'
                              : 'bg-black/5 dark:bg-white/5'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-bold text-slate-400 pt-1">
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>S</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* VISUALIZATION 3: TOP PERFORMING CONTENT LEADERBOARD */}
          <GlassCard level={2} variant="surface" className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-500" /> High-Performing Creator Assets
            </h4>
            <div className="space-y-2.5">
              {[
                { title: 'Designing Spatial Glass Interfaces for Mobile Apps', type: 'Feels Clip', reach: '48,200', likes: '4,100', comments: '340', gifts: '1,200 Coins' },
                { title: 'Future of Decentralized Social Ecosystems in Asia', type: 'Spatial Post', reach: '32,400', likes: '2,850', comments: '190', gifts: '850 Coins' },
                { title: 'Behind the Scenes: High-Speed Web Audio Processing', type: 'Feels Clip', reach: '24,100', likes: '1,980', comments: '145', gifts: '500 Coins' },
              ].map((item, idx) => (
                <div
                  key={item.title}
                  className="p-3 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black font-mono text-cyan-500">#{idx + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.type} · {item.reach} Impressions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-pink-500 font-semibold">{item.likes} Likes</span>
                    <span className="text-purple-500 font-semibold">{item.comments} Comm</span>
                    <span className="text-amber-500 font-bold">{item.gifts}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: MONETIZATION & STANDING                       */}
      {/* ======================================================== */}
      {activeMainTab === 'monetization' && (
        <div className="space-y-4 animate-fadeIn w-full max-w-full overflow-hidden">
          {/* Main Standing Card */}
          <GlassCard level={2} variant="frosted" className="p-4 sm:p-6 space-y-4 w-full max-w-full">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-300 text-slate-950 shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  Creator Monetization & Platform Standing
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Instant mobile payouts (bKash / Nagad / Rocket), post rewards, and tip revenue share
                </p>
              </div>
            </div>

            {/* 3 Status Cards - 100% Mobile Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 w-full">
              <div className="p-3 sm:p-3.5 rounded-2xl liquid-glass-surface border border-emerald-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Standing</span>
                <p className="text-xs sm:text-sm font-black text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Good Standing
                </p>
                <p className="text-[10px] text-slate-400">0 active copyright or community strikes</p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl liquid-glass-surface border border-purple-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Payout Channels</span>
                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  bKash / Nagad / Rocket
                </p>
                <p className="text-[10px] text-slate-400">Direct mobile banking disbursement enabled</p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl liquid-glass-surface border border-amber-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Minimum Threshold</span>
                <p className="text-xs sm:text-sm font-black text-amber-500 font-mono">
                  Min 500 Coins (৳25 BDT)
                </p>
                <p className="text-[10px] text-slate-400">Rate: 20 Coins = ৳1.00 BDT</p>
              </div>
            </div>

            {/* Real-time Payout Calculator */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/25 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-purple-500" />
                  Live Payout Calculator (Coins to ৳BDT)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Available: <strong className="text-amber-500 font-mono">{availableCoins.toLocaleString()} Coins</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Enter Coins to Cashout
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={500}
                      step={50}
                      value={calcCoins}
                      onChange={(e) => setCalcCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full pl-3 pr-16 py-2 rounded-xl liquid-glass-surface border border-black/10 dark:border-white/15 text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Coins
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCalcCoins(amt)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                          calcCoins === amt
                            ? 'bg-purple-500 text-white'
                            : 'liquid-glass-surface text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                    {availableCoins >= 500 && (
                      <button
                        type="button"
                        onClick={() => setCalcCoins(availableCoins)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold liquid-glass-surface text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        Max All
                      </button>
                    )}
                  </div>
                </div>

                {/* Live conversion readout */}
                <div className="p-3.5 rounded-xl liquid-glass-surface border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Cashout:</span>
                    <span className="text-lg font-black text-emerald-500 font-mono">
                      ৳{(calcCoins * 0.05).toFixed(2)} BDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-black/5 dark:border-white/10">
                    <span>Disbursement Speed:</span>
                    <span className="font-bold text-slate-200">5-15 mins (bKash/Nagad)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Platform Payout Fee:</span>
                    <span className="font-bold text-emerald-400">৳0.00 (0% Free)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Monetization Earning Rates Table */}
            <div className="p-4 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 space-y-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Post Monetization & Activity Reward Matrix
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">📝 Text Post</div>
                    <div className="text-[10px] text-slate-400">Auto awarded on publish</div>
                  </div>
                  <span className="font-black font-mono text-cyan-500 text-sm">+5 Coins</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">📷 Photo Post</div>
                    <div className="text-[10px] text-slate-400">Image upload rewarded</div>
                  </div>
                  <span className="font-black font-mono text-emerald-500 text-sm">+10 Coins</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">🎬 Video Post</div>
                    <div className="text-[10px] text-slate-400">High-fidelity feels clip</div>
                  </div>
                  <span className="font-black font-mono text-purple-500 text-sm">+15 Coins</span>
                </div>
              </div>
            </div>

            {/* Eligibility Checklist */}
            <div className="p-4 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Monetization Eligibility Checklist
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Account Verified & In Good Standing</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>bKash / Nagad / Rocket Payout Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Authentic Content Creator Guidelines Passed</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Threshold Met: {availableCoins >= 500 ? 'Eligible for Payout' : 'Reach 500 Coins'}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw via bKash / Nagad / Rocket</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="w-full sm:flex-none py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Transfer Coins to Friend</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ======================================================== */}
      {/* PEER-TO-PEER COIN TRANSFER MODAL                         */}
      {/* ======================================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl glass-card border border-cyan-500/30 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowTransferModal(false);
                setTransferError(null);
                setTransferSuccess(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Transfer / Gift Coins
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Send coins directly to any friend or creator instantly
                </p>
              </div>
            </div>

            {/* Current Balance Banner */}
            <div className="p-3 rounded-2xl liquid-glass-surface border border-amber-500/25 flex items-center justify-between text-xs">
              <span className="text-slate-400">Your Live Balance:</span>
              <span className="font-mono font-black text-amber-500">
                {availableCoins.toLocaleString()} Coins (≈ ৳{equivalentBdt.toFixed(2)} BDT)
              </span>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{transferSuccess}</span>
              </div>
            )}

            <form onSubmit={handleDirectTransfer} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Recipient Username or User ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="@username or user ID"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-surface border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Coins Amount
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                    {[50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTransferAmount(String(amt))}
                        className="px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={availableCoins}
                  placeholder="e.g. 100"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-surface border border-black/10 dark:border-white/15 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Message / Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Thanks for the awesome post!"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl liquid-glass-surface border border-black/10 dark:border-white/15 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Calculated after balance */}
              {transferAmount && parseInt(transferAmount, 10) > 0 && (
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Balance after transfer:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {Math.max(0, availableCoins - parseInt(transferAmount, 10)).toLocaleString()} Coins
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 rounded-xl liquid-glass-surface hover:bg-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading || !transferTarget.trim() || !transferAmount}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {transferLoading ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <ArrowDownLeft size={14} />
                      <span>Send Coins</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL RECEIPT MODAL                                    */}
      {/* ======================================================== */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <GlassCard level={3} variant="modal" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-2">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Official Transaction Receipt
              </h3>
              <p className="text-xs text-slate-400 font-mono">ID: {selectedReceipt.transactionId}</p>
            </div>

            <div className="p-4 rounded-2xl liquid-glass-surface space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {selectedReceipt.gatewayId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Coins Credited:</span>
                <span className="font-black text-amber-500 font-mono">
                  {selectedReceipt.totalCoins?.toLocaleString() || selectedReceipt.coinsAmount?.toLocaleString()} Coins
                </span>
              </div>
              {selectedReceipt.bonusCoins > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bonus Allocation:</span>
                  <span className="text-emerald-500 font-bold">+{selectedReceipt.bonusCoins} Coins</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-black text-slate-900 dark:text-white font-mono">
                  ৳{selectedReceipt.amountBdt?.toFixed(2)} BDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Status:</span>
                <span className="font-bold text-emerald-500 uppercase">{selectedReceipt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2">
              <GlassButton variant="primary" size="md" className="w-full" onClick={() => setSelectedReceipt(null)}>
                Done / Close
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Embedded Modals */}
      <CoinPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          handleRefreshAll();
          refreshUser();
        }}
      />

      <WithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        userAvailableCoins={availableCoins}
        onSuccess={() => {
          handleRefreshAll();
          refreshUser();
        }}
      />

      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        receiverId={user?.id}
        receiverName={user?.fullName}
        onGiftSent={() => {
          handleRefreshAll();
          refreshUser();
        }}
        onOpenRecharge={() => {
          setShowGiftModal(false);
          setShowPurchaseModal(true);
        }}
      />

      <RewardedAdModal
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        onRewardClaimed={() => {
          handleRefreshAll();
          refreshUser();
        }}
      />
    </div>
  );
};
