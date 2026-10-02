import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Sliders,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Receipt,
  RotateCcw,
  UserCheck,
  Eye,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { CoinPackage, WithdrawalRequestItem, WithdrawalSettingsConfig, PaymentTransactionRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdminFinancialDashboard: React.FC = () => {
  const { token } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'withdrawals' | 'packages' | 'settings' | 'payments' | 'stats'>('withdrawals');

  // Stats
  const [stats, setStats] = useState<any | null>(null);

  // Withdrawals Queue
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequestItem | null>(null);
  const [userHistoryModal, setUserHistoryModal] = useState<any | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [payoutRef, setPayoutRef] = useState<string>('');

  // Settings
  const [settings, setSettings] = useState<WithdrawalSettingsConfig | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  // Coin Packages
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<CoinPackage | null>(null);
  const [pkgFormData, setPkgFormData] = useState({
    name: '',
    coinAmount: 1000,
    bonusCoins: 100,
    priceBdt: 115,
    priceUsd: 9.99,
    badgeText: '',
    perUserLimit: 0,
    dailyLimit: 0,
    isActive: true,
  });

  // Payments & Reconciliation
  const [payments, setPayments] = useState<PaymentTransactionRecord[]>([]);
  const [paymentGatewayFilter, setPaymentGatewayFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    if (activeSubTab === 'withdrawals') fetchWithdrawals();
    if (activeSubTab === 'settings') fetchSettings();
    if (activeSubTab === 'packages') fetchPackages();
    if (activeSubTab === 'payments') fetchPayments();
  }, [activeSubTab, token]);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/financial-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWithdrawals = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      let url = `/api/admin/withdrawals?status=${statusFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/withdrawal-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPackages = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/coin-packages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayments = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      let url = `/api/admin/payments?gateway=${paymentGatewayFilter}&status=${paymentStatusFilter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Review / Approve
  const handleReviewWithdrawal = async (reqId: string, newStatus: 'reviewing' | 'approved' | 'processing') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/withdrawals/${reqId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, note: actionNote }),
      });
      if (res.ok) {
        setActionNote('');
        fetchWithdrawals();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Reject
  const handleRejectWithdrawal = async (reqId: string) => {
    if (!token || !rejectionReason.trim()) {
      alert('Rejection reason is required for financial audit trail.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/withdrawals/${reqId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (res.ok) {
        setRejectionReason('');
        setSelectedReq(null);
        fetchWithdrawals();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Mark Paid
  const handleMarkPaid = async (reqId: string) => {
    if (!token || !payoutRef.trim()) {
      alert('Gateway payout reference / Transaction ID is required.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/withdrawals/${reqId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gatewayPayoutRef: payoutRef, note: actionNote }),
      });
      if (res.ok) {
        setPayoutRef('');
        setActionNote('');
        setSelectedReq(null);
        fetchWithdrawals();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Action: View User Financial History
  const handleViewUserHistory = async (reqId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/withdrawals/${reqId}/user-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserHistoryModal(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !token) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/withdrawal-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsSavedMessage('Withdrawal settings & conversion rates updated successfully!');
        setTimeout(() => setSettingsSavedMessage(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Save / Update Coin Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = editingPkg ? `/api/admin/coin-packages/${editingPkg.id}` : '/api/admin/coin-packages';
      const method = editingPkg ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pkgFormData),
      });
      if (res.ok) {
        setShowPkgModal(false);
        setEditingPkg(null);
        fetchPackages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reconcile Payment
  const handleReconcilePayment = async (txId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/payments/${txId}/reconcile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Transaction verified and reconciled with gateway API.');
        fetchPayments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Refund Payment
  const handleRefundPayment = async (txId: string) => {
    const reason = prompt('Enter authorized reason for this refund:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/admin/payments/${txId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert('Refund processed and recorded.');
        fetchPayments();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Financial Liquidity Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Gross Revenue (BDT)
            </span>
            <div className="text-xl font-black text-amber-400 mt-1">৳{stats.revenueBdt?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">{stats.completedPurchasesCount} purchases</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Total Disbursed (BDT)
            </span>
            <div className="text-xl font-black text-blue-400 mt-1">৳{stats.paidOutBdt?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">{stats.completedPayoutsCount} payouts</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Pending Payout Liability
            </span>
            <div className="text-xl font-black text-purple-400 mt-1">৳{stats.pendingLiabilityBdt?.toLocaleString()}</div>
            <span className="text-[10px] text-purple-300/80">({stats.pendingLiabilityCoins?.toLocaleString()} coins)</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Platform Gross Profit
            </span>
            <div className="text-xl font-black text-emerald-400 mt-1">৳{stats.platformNetProfitBdt?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">Margin + fees</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Coins In Circulation
            </span>
            <div className="text-xl font-black text-white mt-1">{stats.totalCoinsCirculating?.toLocaleString()}</div>
            <span className="text-[10px] text-amber-400">Platform liability</span>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'withdrawals', label: 'Withdrawal Requests Queue', icon: ArrowUpRight },
          { id: 'settings', label: 'Rate & Payout Policy', icon: Sliders },
          { id: 'packages', label: 'Coin Bundles & Packages', icon: Coins },
          { id: 'payments', label: 'Payment Gateway Logs & Reconciliation', icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: WITHDRAWAL REQUESTS QUEUE */}
      {activeSubTab === 'withdrawals' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, user, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchWithdrawals()}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={fetchWithdrawals}
                className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Code / Date</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Amount (BDT / Coins)</th>
                  <th className="p-3.5">Payout Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No withdrawal requests matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white">{r.requestCode}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white">{r.userName || 'Member'}</div>
                        <div className="text-[10px] text-slate-400">{r.userEmail}</div>
                        {r.userPhone && <div className="text-[10px] text-slate-500 font-mono">{r.userPhone}</div>}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-emerald-400 font-mono">
                          ৳{r.netPayoutBdt.toFixed(2)} BDT
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {r.coinsAmount.toLocaleString()} coins (Fee: ৳{r.feeBdt.toFixed(2)})
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="uppercase font-bold text-slate-200">{r.payoutMethodType}</div>
                        <div className="text-[10px] text-slate-400 font-mono max-w-xs truncate">
                          {r.payoutAccountDetails}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            r.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : r.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : r.status === 'cancelled'
                              ? 'bg-slate-500/20 text-slate-400'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewUserHistory(r.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                            title="View User Risk & History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {r.status !== 'paid' && r.status !== 'rejected' && r.status !== 'cancelled' && (
                            <button
                              onClick={() => setSelectedReq(r)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-semibold"
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RATE & PAYOUT POLICY (DYNAMIC 1000 COINS = X BDT) */}
      {activeSubTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl bg-white/5 p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" /> Withdrawal Policy & Exchange Rate
              </h3>
              <p className="text-xs text-slate-400">Configure global conversion rate and anti-abuse limits</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isWithdrawalEnabled}
                onChange={(e) => setSettings({ ...settings, isWithdrawalEnabled: e.target.checked })}
                className="rounded accent-amber-500"
              />
              <span>Withdrawals Active</span>
            </label>
          </div>

          {settingsSavedMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{settingsSavedMessage}</span>
            </div>
          )}

          {/* DYNAMIC CONVERSION RATE */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              Conversion Formula (Never Hardcoded)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Coin Denominator</label>
                <input
                  type="number"
                  value={settings.conversionRateCoins}
                  onChange={(e) => setSettings({ ...settings, conversionRateCoins: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">= Equivalent BDT (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.conversionRateBdt}
                  onChange={(e) => setSettings({ ...settings, conversionRateBdt: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white font-mono text-xs"
                  required
                />
              </div>
            </div>
            <div className="text-[11px] text-amber-200">
              Current Rate: <b>{settings.conversionRateCoins} Coins = {settings.conversionRateBdt} BDT</b> (1 Coin = {(settings.conversionRateBdt / settings.conversionRateCoins).toFixed(4)} BDT)
            </div>
          </div>

          {/* MIN / MAX BOUNDS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Min Withdrawal (Coins)</label>
              <input
                type="number"
                value={settings.minWithdrawalCoins}
                onChange={(e) => setSettings({ ...settings, minWithdrawalCoins: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Max Withdrawal (Coins / Req)</label>
              <input
                type="number"
                value={settings.maxWithdrawalCoins}
                onChange={(e) => setSettings({ ...settings, maxWithdrawalCoins: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* FEES */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Processing Fee (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.processingFeePercent}
                onChange={(e) => setSettings({ ...settings, processingFeePercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Fixed Fee (BDT)</label>
              <input
                type="number"
                step="0.5"
                value={settings.processingFeeFixedBdt}
                onChange={(e) => setSettings({ ...settings, processingFeeFixedBdt: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* ANTI-ABUSE LIMITS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Daily Cap Per User (Coins)</label>
              <input
                type="number"
                value={settings.dailyLimitCoins}
                onChange={(e) => setSettings({ ...settings, dailyLimitCoins: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Weekly Cap Per User (Coins)</label>
              <input
                type="number"
                value={settings.weeklyLimitCoins}
                onChange={(e) => setSettings({ ...settings, weeklyLimitCoins: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* VERIFICATION REQUIREMENT */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">User Eligibility Rule</label>
            <select
              value={settings.verificationRequirement}
              onChange={(e) => setSettings({ ...settings, verificationRequirement: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs"
            >
              <option value="none">No verification required (Open to all)</option>
              <option value="phone_verified">Require Verified Bangladesh Phone Number</option>
              <option value="kyc_verified">Require KYC Identity Verification</option>
              <option value="account_age_24h">Require Account Age &gt; 24 Hours</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
            >
              {isSavingSettings ? 'Saving...' : 'Save Financial Policy'}
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 3: COIN PACKAGES MANAGEMENT */}
      {activeSubTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Manage Coin Store Bundles</span>
            <button
              onClick={() => {
                setEditingPkg(null);
                setPkgFormData({
                  name: '',
                  coinAmount: 1000,
                  bonusCoins: 100,
                  priceBdt: 115,
                  priceUsd: 9.99,
                  badgeText: '',
                  perUserLimit: 0,
                  dailyLimit: 0,
                  isActive: true,
                });
                setShowPkgModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Create Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{pkg.name}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        pkg.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {pkg.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-300">
                    {pkg.coinAmount ? `${pkg.coinAmount.toLocaleString()} Coins` : 'Custom Package'}
                  </div>
                  {pkg.bonusCoins > 0 && (
                    <div className="text-[10px] text-emerald-400 font-semibold">
                      +{pkg.bonusCoins.toLocaleString()} Bonus Coins
                    </div>
                  )}
                  <div className="text-xs text-slate-300 font-mono mt-1">
                    {pkg.priceBdt} BDT (${pkg.priceUsd} USD)
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setEditingPkg(pkg);
                      setPkgFormData({
                        name: pkg.name,
                        coinAmount: pkg.coinAmount,
                        bonusCoins: pkg.bonusCoins,
                        priceBdt: pkg.priceBdt,
                        priceUsd: pkg.priceUsd,
                        badgeText: pkg.badgeText || '',
                        perUserLimit: pkg.perUserLimit || 0,
                        dailyLimit: pkg.dailyLimit || 0,
                        isActive: pkg.isActive ?? true,
                      });
                      setShowPkgModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: PAYMENT TRANSACTIONS & RECONCILIATION */}
      {activeSubTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={paymentGatewayFilter}
                onChange={(e) => setPaymentGatewayFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="all">All Gateways</option>
                <option value="bkash">bKash Direct</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">DBBL Rocket</option>
                <option value="sslcommerz">SSLCommerz</option>
                <option value="stripe">Stripe</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              <button
                onClick={fetchPayments}
                className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Invoice / Date</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Coins</th>
                  <th className="p-3.5">Amount (BDT)</th>
                  <th className="p-3.5">Gateway</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No payment transactions found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.03]">
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-white">{p.transactionId}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{p.userName || 'Member'}</div>
                        <div className="text-[10px] text-slate-400">{p.userEmail}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-300">
                        +{p.totalCoins.toLocaleString()}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        ৳{p.amountBdt.toFixed(2)}
                      </td>
                      <td className="p-3.5 uppercase font-mono text-[10px]">{p.gatewayId}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            p.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : p.status === 'refunded'
                              ? 'bg-purple-500/20 text-purple-300'
                              : p.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleReconcilePayment(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px]"
                            title="Re-query Gateway API"
                          >
                            Reconcile
                          </button>
                          {p.status === 'completed' && (
                            <button
                              onClick={() => handleRefundPayment(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px]"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANAGE WITHDRAWAL REQUEST ACTION MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                Manage Request {selectedReq.requestCode}
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User:</span>
                <span className="text-white font-semibold">{selectedReq.userName} ({selectedReq.userEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coins Deducted:</span>
                <span className="text-amber-300 font-mono font-bold">{selectedReq.coinsAmount.toLocaleString()} Coins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Payout to Send:</span>
                <span className="text-emerald-400 font-mono font-extrabold text-sm">৳{selectedReq.netPayoutBdt.toFixed(2)} BDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payout Method & Details:</span>
                <span className="text-white font-mono">{selectedReq.payoutMethodType.toUpperCase()} - {selectedReq.payoutAccountDetails}</span>
              </div>
            </div>

            {/* Stage Transition Buttons */}
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold uppercase text-slate-400">Move Workflow Status:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReviewWithdrawal(selectedReq.id, 'reviewing')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold"
                >
                  Mark Reviewing
                </button>
                <button
                  onClick={() => handleReviewWithdrawal(selectedReq.id, 'approved')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/30 text-xs font-semibold"
                >
                  Approve Request
                </button>
                <button
                  onClick={() => handleReviewWithdrawal(selectedReq.id, 'processing')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-semibold"
                >
                  Mark Processing
                </button>
              </div>

              {/* Mark Paid Section */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <label className="text-xs font-bold text-emerald-300 block">
                  Disburse & Mark Paid (Finalize)
                </label>
                <input
                  type="text"
                  placeholder="Enter Bank / bKash Transaction Reference..."
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs font-mono"
                />
                <button
                  onClick={() => handleMarkPaid(selectedReq.id)}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                >
                  Confirm Disbursed & Paid
                </button>
              </div>

              {/* Reject Section */}
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                <label className="text-xs font-bold text-rose-300 block">
                  Reject Request (Restores Coins to User)
                </label>
                <input
                  type="text"
                  placeholder="Mandatory Rejection Reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-white text-xs"
                />
                <button
                  onClick={() => handleRejectWithdrawal(selectedReq.id)}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                >
                  Reject & Refund Coins
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER AUDIT SNAPSHOT MODAL */}
      {userHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> User Financial Profile
              </h3>
              <button onClick={() => setUserHistoryModal(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="font-bold text-white text-sm">{userHistoryModal.user?.fullName}</div>
                <div className="text-slate-400">Username: @{userHistoryModal.user?.username}</div>
                <div className="text-slate-400">Email: {userHistoryModal.user?.email}</div>
                <div className="text-slate-400">Phone: {userHistoryModal.user?.phone || 'Not provided'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400">Current Balance</div>
                  <div className="font-bold text-amber-300 font-mono text-sm">
                    {userHistoryModal.walletSummary?.availableBalance?.toLocaleString()} Coins
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <div className="text-[10px] text-slate-400">Lifetime Paid Out</div>
                  <div className="font-bold text-emerald-400 font-mono text-sm">
                    ৳{userHistoryModal.walletSummary?.withdrawnAmountBdt?.toFixed(2)} BDT
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setUserHistoryModal(null)}
              className="w-full py-2 rounded-xl bg-white/10 text-white font-semibold text-xs"
            >
              Close Snapshot
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PACKAGE MODAL */}
      {showPkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <form onSubmit={handleSavePackage} className="w-full max-w-md bg-slate-900 border border-white/20 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingPkg ? 'Edit Coin Package' : 'Create Coin Package'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Bundle Title</label>
                <input
                  type="text"
                  placeholder="e.g. Bronze Booster"
                  value={pkgFormData.name}
                  onChange={(e) => setPkgFormData({ ...pkgFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Coins Included</label>
                  <input
                    type="number"
                    value={pkgFormData.coinAmount}
                    onChange={(e) => setPkgFormData({ ...pkgFormData, coinAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Bonus Coins</label>
                  <input
                    type="number"
                    value={pkgFormData.bonusCoins}
                    onChange={(e) => setPkgFormData({ ...pkgFormData, bonusCoins: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Price (BDT ৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pkgFormData.priceBdt}
                    onChange={(e) => setPkgFormData({ ...pkgFormData, priceBdt: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Price (USD $)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pkgFormData.priceUsd}
                    onChange={(e) => setPkgFormData({ ...pkgFormData, priceUsd: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Badge Text (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Best Value, +15% Bonus"
                  value={pkgFormData.badgeText}
                  onChange={(e) => setPkgFormData({ ...pkgFormData, badgeText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={pkgFormData.isActive}
                  onChange={(e) => setPkgFormData({ ...pkgFormData, isActive: e.target.checked })}
                  className="rounded accent-amber-500"
                />
                <span className="text-slate-300 font-semibold">Active in Store</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPkgModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
              >
                Save Bundle
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
