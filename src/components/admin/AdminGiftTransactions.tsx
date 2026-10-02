import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowRightLeft,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Shield,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import { GiftTransactionRecord, SuspiciousActivityItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Gift3DPreview } from '../Gift3DPreview';

export const AdminGiftTransactions: React.FC = () => {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<GiftTransactionRecord[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Refund modal state
  const [refundingTx, setRefundingTx] = useState<GiftTransactionRecord | null>(null);
  const [refundReason, setRefundReason] = useState('Fraudulent / Accidental Gift Reversal');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [txRes, suspRes] = await Promise.all([
        fetch('/api/admin/gift-transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/suspicious-activity', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }

      if (suspRes.ok) {
        const suspData = await suspRes.json();
        setSuspicious(suspData.suspicious || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !refundingTx || isProcessingRefund) return;
    setIsProcessingRefund(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/gift-transactions/${refundingTx.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setSuccessMsg(`Refund of ${refundingTx.coinAmount} coins executed atomically.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setRefundingTx(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Refund processing error');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  // Export CSV of transactions
  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Transaction ID', 'Sender', 'Receiver', 'Gift', 'Coin Amount', 'Status', 'Timestamp'];
    const rows = transactions.map((t) => [
      t.transactionId,
      `"${t.senderName}"`,
      `"${t.receiverName}"`,
      `"${t.giftName}"`,
      t.coinAmount,
      t.status,
      t.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nixo_gift_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Top Gifters & Top Earners analytics
  const giftersMap: { [key: string]: { name: string; avatar?: string; totalSpent: number; count: number } } = {};
  const earnersMap: { [key: string]: { name: string; avatar?: string; totalEarned: number; count: number } } = {};

  transactions.forEach((tx) => {
    if (tx.status === 'completed') {
      // Sender
      if (!giftersMap[tx.senderId]) {
        giftersMap[tx.senderId] = { name: tx.senderName || tx.senderId, avatar: tx.senderAvatar, totalSpent: 0, count: 0 };
      }
      giftersMap[tx.senderId].totalSpent += tx.coinAmount;
      giftersMap[tx.senderId].count += 1;

      // Receiver
      if (!earnersMap[tx.receiverId]) {
        earnersMap[tx.receiverId] = { name: tx.receiverName || tx.receiverId, avatar: tx.receiverAvatar, totalEarned: 0, count: 0 };
      }
      earnersMap[tx.receiverId].totalEarned += tx.coinAmount;
      earnersMap[tx.receiverId].count += 1;
    }
  });

  const topGifters = Object.values(giftersMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const topEarners = Object.values(earnersMap).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 5);

  const filteredTransactions = transactions.filter((t) => {
    const q = filterQuery.toLowerCase();
    return (
      t.senderName?.toLowerCase().includes(q) ||
      t.receiverName?.toLowerCase().includes(q) ||
      t.giftName?.toLowerCase().includes(q) ||
      t.transactionId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            Gift Economy Ledger, Fraud Prevention & Analytics
          </h3>
          <p className="text-xs text-slate-300">
            Real-time atomic transfer audit trail, suspicious high-velocity anomaly detection, and reversible transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Audit</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Gifters & Top Earners Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Gifters */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                Top Platform Patrons (Gifters)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Volume Out</span>
          </div>

          <div className="space-y-2">
            {topGifters.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No gift transfers recorded yet.</p>
            ) : (
              topGifters.map((g, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-amber-400 w-4">#{idx + 1}</span>
                    <img
                      src={g.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="font-medium text-white truncate max-w-[150px]">{g.name}</span>
                  </div>
                  <div className="text-right font-mono font-bold text-amber-400 shrink-0">
                    {g.totalSpent.toLocaleString()} Coins
                    <span className="text-[10px] text-slate-400 block font-normal">({g.count} gifts)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Earners */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                Top Creator Earners
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Gifts In</span>
          </div>

          <div className="space-y-2">
            {topEarners.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No gift transfers recorded yet.</p>
            ) : (
              topEarners.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-cyan-400 w-4">#{idx + 1}</span>
                    <img
                      src={e.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0"
                    />
                    <span className="font-medium text-white truncate max-w-[150px]">{e.name}</span>
                  </div>
                  <div className="text-right font-mono font-bold text-cyan-400 shrink-0">
                    +{e.totalEarned.toLocaleString()} Coins
                    <span className="text-[10px] text-slate-400 block font-normal">({e.count} received)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Suspicious Anomaly Detection Panel */}
      {suspicious.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h4 className="font-bold text-xs text-rose-300">
              High-Priority Anomaly Signals ({suspicious.length} Flags Detected)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suspicious.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-rose-500/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{item.userName || item.userId}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono uppercase">
                    {item.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{item.details || item.detail}</p>
                <p className="text-[10px] font-mono text-slate-400">
                  Severity: <span className="uppercase text-rose-300">{item.severity}</span>
                  {item.score !== undefined && ` | Score: ${item.score}`}
                  {item.status && ` | Status: ${item.status}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sender, receiver, or gift..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredTransactions.length} of {transactions.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/5 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-2.5 rounded-l-xl">Sender</th>
                <th className="p-2.5">Recipient</th>
                <th className="p-2.5">Gift Item</th>
                <th className="p-2.5">Coins</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Context</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-2.5 font-medium text-white flex items-center gap-2">
                      <img
                        src={tx.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="truncate max-w-[120px]">{tx.senderName}</span>
                    </td>
                    <td className="p-2.5 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <img
                          src={tx.receiverAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="truncate max-w-[120px]">{tx.receiverName}</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                          <Gift3DPreview image3d={tx.giftImage3d} size="sm" isInteractive={false} />
                        </div>
                        <span className="font-semibold text-white">{tx.giftName}</span>
                      </div>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-amber-400">
                      {tx.coinAmount.toLocaleString()}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-400 font-mono">
                      {tx.postId ? `Post: ${tx.postId.substring(0, 8)}...` : tx.commentId ? 'Comment' : 'Direct'}
                    </td>
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-2.5 text-right">
                      {tx.status === 'completed' ? (
                        <button
                          onClick={() => setRefundingTx(tx)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Refund</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Reversed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorized Refund Modal */}
      {refundingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-rose-500/50 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <RotateCcw className="w-5 h-5" />
                <span>Authorize Gift Reversal & Refund</span>
              </div>
              <button onClick={() => setRefundingTx(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefund} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <p className="text-slate-300">
                  You are reversing <strong>{refundingTx.coinAmount} Coins</strong> for gift{' '}
                  <strong>{refundingTx.giftName}</strong>.
                </p>
                <p className="text-slate-400 text-[11px]">
                  Coins will be debited from recipient ({refundingTx.receiverName}) and restored to sender (
                  {refundingTx.senderName}). This action is recorded in the platform audit ledger.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Mandatory Audit Justification:</label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for reversal (e.g. fraudulent activity, verified dispute)..."
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white focus:border-rose-400 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundingTx(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isProcessingRefund ? 'Refunding...' : 'Confirm Reversal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
