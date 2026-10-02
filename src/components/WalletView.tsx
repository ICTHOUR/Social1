import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Clock,
  Sparkles,
  Receipt,
  XCircle,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { WalletInfo, WithdrawalRequestItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { CoinPurchaseModal } from './CoinPurchaseModal';
import { WithdrawalModal } from './WithdrawalModal';
import { RewardedAdModal } from './ads/RewardedAdModal';

export const WalletView: React.FC = () => {
  const { user, token, claimDailyBonus, refreshUser } = useAuth();

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequestItem[]>([]);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showRewardedModal, setShowRewardedModal] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTxTab, setActiveTxTab] = useState<'all' | 'recharge' | 'gift' | 'reward' | 'withdrawal'>('all');
  const [cancellingReqId, setCancellingReqId] = useState<string | null>(null);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
      }
    } catch (e) {
      console.error('Failed to load wallet', e);
    }
  };

  const fetchMyWithdrawals = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/withdrawals/my-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyWithdrawals(data.requests || []);
      }
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchMyWithdrawals();
  }, [token]);

  const handleClaimBonus = async () => {
    setIsClaiming(true);
    try {
      const claimed = await claimDailyBonus();
      setClaimMessage(`Successfully claimed +${claimed} Daily Bonus Coins!`);
      fetchWallet();
      refreshUser();
      setTimeout(() => setClaimMessage(null), 4000);
    } catch (err: any) {
      setClaimMessage(err.message || 'Already claimed today!');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCancelWithdrawal = async (reqId: string) => {
    if (!token) return;
    setCancellingReqId(reqId);
    try {
      const res = await fetch(`/api/withdrawals/${reqId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchWallet();
        fetchMyWithdrawals();
        refreshUser();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingReqId(null);
    }
  };

  if (!user) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center max-w-md mx-auto my-8 border border-white/10">
        <p className="text-slate-300 text-xs">Please sign in to access your Nixo Financial Wallet.</p>
      </div>
    );
  }

  // Filter transactions based on tab
  const filteredTransactions = (walletInfo?.recentTransactions || []).filter((tx) => {
    if (activeTxTab === 'all') return true;
    if (activeTxTab === 'recharge') return tx.type === 'recharge';
    if (activeTxTab === 'gift') return tx.type === 'gift';
    if (activeTxTab === 'reward') return tx.type === 'reward' || tx.type === 'daily_bonus';
    if (activeTxTab === 'withdrawal') return tx.type === 'withdrawal';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto my-4 pb-12">
      {/* Modals */}
      <CoinPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={() => {
          fetchWallet();
          fetchMyWithdrawals();
        }}
      />

      <WithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        userAvailableCoins={walletInfo?.availableBalance ?? user.coinsBalance ?? 0}
        onSuccess={() => {
          fetchWallet();
          fetchMyWithdrawals();
        }}
      />

      {/* Header Title & Daily Bonus Notice */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-500" /> Financial Treasury & Wallet
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time balance, Bangladesh mobile banking payouts, and coin purchases
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClaimBonus}
            disabled={isClaiming}
            className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isClaiming ? 'Claiming...' : 'Claim Daily Bonus (+50)'}
          </button>

          <button
            onClick={() => {
              fetchWallet();
              fetchMyWithdrawals();
            }}
            className="p-2 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {claimMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-amber-500" />
          <span>{claimMessage}</span>
        </div>
      )}

      {/* Coin Types & Rules Transparency Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-amber-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Nixo কয়েন পলিসি ও ক্যাটাগরি নিয়মাবলী (Coin System Rules)</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
            অফিসিয়াল পলিসি
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-2xl bg-black/20 border border-amber-500/20 space-y-1">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              💳 ১. কেনা কয়েন (Purchased)
            </span>
            <p className="text-[11px] text-slate-300">
              শুধুমাত্র স্টোর থেকে কেনা কয়েন দিয়ে পোস্ট ও কমেন্টে গিফট পাঠানো যাবে।
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/20 border border-purple-500/20 space-y-1">
            <span className="font-bold text-purple-400 flex items-center gap-1">
              🎁 ২. রিসিভড গিফট কয়েন (Gifted)
            </span>
            <p className="text-[11px] text-slate-300">
              পোস্ট বা কমেন্টে রিসিভ করা কয়েন উইথড্র করা যাবে, তবে অন্যকে রি-গিফট করা যাবে না।
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/20 border border-emerald-500/20 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              🪙 ৩. ফ্রি অর্জিত কয়েন (Earned)
            </span>
            <p className="text-[11px] text-slate-300">
              ডেইলি বোনাস ও রিওয়ার্ড কয়েন গিফট করা যাবে না, তবে একসাথে উইথড্র করা যাবে।
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Purchased Balance (Giftable) */}
        <div className="liquid-glass-2 rounded-3xl p-5 border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-white/70 dark:to-slate-900/80 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" /> কেনা কয়েন
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold">
              🎁 গিফটযোগ্য
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(walletInfo?.purchasedBalance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
            স্টোর থেকে ক্রয়কৃত
          </div>
        </div>

        {/* 2. Received Gift Balance (Withdrawable) */}
        <div className="liquid-glass-2 rounded-3xl p-5 border border-purple-500/30 bg-gradient-to-br from-purple-600/15 to-white/70 dark:to-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-purple-500" /> প্রাপ্ত গিফট
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold">
              💵 উইথড্রযোগ্য
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(walletInfo?.receivedGiftBalance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-300 font-medium mt-1">কমেন্ট ও পোস্টে প্রাপ্ত</div>
        </div>

        {/* 3. Earned Balance (Withdrawable) */}
        <div className="liquid-glass-2 rounded-3xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 to-white/70 dark:to-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> ফ্রি অর্জিত
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
              💵 উইথড্রযোগ্য
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(walletInfo?.earnedBalance || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">ডেইলি বোনাস ও রিওয়ার্ড</div>
        </div>

        {/* 4. Total Withdrawable Balance */}
        <div className="liquid-glass-2 rounded-3xl p-5 border border-cyan-500/30 bg-gradient-to-br from-cyan-600/15 to-white/70 dark:to-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-500" /> মোট উইথড্র
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold">
              ক্যাশআউট
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(walletInfo?.withdrawableBalance || (walletInfo?.earnedBalance || 0) + (walletInfo?.receivedGiftBalance || 0)).toLocaleString()}
          </div>
          <div className="text-[11px] text-cyan-600 dark:text-cyan-300 font-medium mt-1">গিফট + আর্ন করা কয়েন</div>
        </div>

        {/* 5. Withdrawn Paid Out */}
        <div className="liquid-glass-2 rounded-3xl p-5 border border-blue-500/30 bg-gradient-to-br from-blue-600/15 to-white/70 dark:to-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" /> ক্যাশআউটকৃত
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold">
              পেইড আউট
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            ৳{(walletInfo?.withdrawnAmountBdt || 0).toFixed(0)}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-300 font-medium mt-1">
            {(walletInfo?.withdrawnAmountCoins || 0).toLocaleString()} coins
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-amber-300 transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Purchase Coins
        </button>

        <button
          onClick={() => setShowRewardedModal(true)}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 font-black text-sm hover:bg-amber-500/30 transition shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400" /> Watch Ad (+25 Coins Free)
        </button>

        <button
          onClick={() => setShowWithdrawModal(true)}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm hover:from-purple-500 hover:to-indigo-500 transition shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" /> Cashout / Withdrawal
        </button>
      </div>

      <RewardedAdModal
        isOpen={showRewardedModal}
        onClose={() => setShowRewardedModal(false)}
        onRewardClaimed={() => {
          fetchWallet();
        }}
      />

      {/* Active Withdrawal Requests Tracker */}
      {myWithdrawals.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Active & Recent Withdrawal Requests
            </h3>
            <span className="text-xs text-slate-400">{myWithdrawals.length} request(s)</span>
          </div>

          <div className="space-y-3">
            {myWithdrawals.map((req) => {
              const canCancel = req.status === 'pending';

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{req.requestCode}</span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          req.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : req.status === 'cancelled'
                            ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase font-mono">
                        {req.payoutMethodType}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-white text-sm">
                        ৳{req.netPayoutBdt.toFixed(2)} BDT
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5">
                        ({req.coinsAmount.toLocaleString()} coins)
                      </span>
                    </div>
                  </div>

                  {/* Status Progress Flow Bar */}
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-semibold pt-1">
                    {['pending', 'reviewing', 'approved', 'processing', 'paid'].map((stage, idx) => {
                      const stages = ['pending', 'reviewing', 'approved', 'processing', 'paid'];
                      const currentIdx = stages.indexOf(req.status);
                      const isReached = currentIdx >= idx;
                      const isCurrent = req.status === stage;

                      if (req.status === 'rejected' || req.status === 'cancelled') {
                        return null;
                      }

                      return (
                        <div
                          key={stage}
                          className={`py-1 rounded-lg uppercase tracking-wider ${
                            isCurrent
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold'
                              : isReached
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {stage}
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes / Reason */}
                  {req.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Rejection Reason: {req.rejectionReason} (Coins have been refunded to balance)</span>
                    </div>
                  )}

                  {req.gatewayPayoutRef && (
                    <div className="text-xs text-emerald-400 font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Disbursement Trx ID: {req.gatewayPayoutRef}</span>
                    </div>
                  )}

                  {canCancel && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleCancelWithdrawal(req.id)}
                        disabled={cancellingReqId === req.id}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs transition font-semibold"
                      >
                        {cancellingReqId === req.id ? 'Cancelling...' : 'Cancel Request & Refund Coins'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" /> Immutable Transaction Ledger
          </h3>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'recharge', label: 'Purchases' },
              { id: 'gift', label: 'Gifts' },
              { id: 'reward', label: 'Rewards' },
              { id: 'withdrawal', label: 'Withdrawals' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTxTab(tab.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  activeTxTab === tab.id
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions found in this category.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isPositive =
                tx.type === 'recharge' ||
                tx.type === 'reward' ||
                tx.type === 'daily_bonus' ||
                (tx.type === 'gift' && tx.receiverId === user.id);

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isPositive
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white">
                        {tx.note || (isPositive ? 'Coins Received' : 'Coins Spent')}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="capitalize">{tx.type?.replace('_', ' ') || 'General'}</span>
                        <span>•</span>
                        <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {tx.amount.toLocaleString()} Coins
                    </div>
                    {tx.balanceAfter !== undefined && (
                      <div className="text-[10px] text-slate-400">
                        Bal: {tx.balanceAfter.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
