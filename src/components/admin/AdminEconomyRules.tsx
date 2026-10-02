import React, { useState, useEffect } from 'react';
import {
  Coins,
  ShieldAlert,
  Save,
  Clock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { CoinEarningRules, CoinEarningLedgerItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdminEconomyRules: React.FC = () => {
  const { token } = useAuth();
  const [rules, setRules] = useState<CoinEarningRules | null>(null);
  const [ledger, setLedger] = useState<CoinEarningLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [coinsPerPost, setCoinsPerPost] = useState(5);
  const [coinsPerPhoto, setCoinsPerPhoto] = useState(10);
  const [coinsPerVideo, setCoinsPerVideo] = useState(15);
  const [coinsPerStory, setCoinsPerStory] = useState(5);
  const [dailyEarningLimit, setDailyEarningLimit] = useState(200);
  const [maximumDailyReward, setMaximumDailyReward] = useState(500);
  const [minimumAccountAgeHours, setMinimumAccountAgeHours] = useState(0);
  const [minimumActivityRequirement, setMinimumActivityRequirement] = useState(1);
  const [rewardCooldownSeconds, setRewardCooldownSeconds] = useState(15);

  // Anti-abuse policies
  const [minContentLength, setMinContentLength] = useState(1);
  const [duplicateContentBlocked, setDuplicateContentBlocked] = useState(false);
  const [maxDailyPostsEligible, setMaxDailyPostsEligible] = useState(50);
  const [eligibleTypes, setEligibleTypes] = useState<string[]>(['text', 'image', 'photo', 'video', 'poll', 'article']);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rulesRes, ledgerRes] = await Promise.all([
        fetch('/api/admin/coin-rules', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/coin-earnings-ledger', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        const r: CoinEarningRules = rulesData.rules;
        setRules(r);
        setCoinsPerPost(r.coinsPerPost ?? 5);
        setCoinsPerPhoto(r.coinsPerPhoto ?? 10);
        setCoinsPerVideo(r.coinsPerVideo ?? 15);
        setCoinsPerStory(r.coinsPerStory ?? 5);
        setDailyEarningLimit(r.dailyEarningLimit);
        setMaximumDailyReward(r.maximumDailyReward);
        setMinimumAccountAgeHours(r.minimumAccountAgeHours);
        setMinimumActivityRequirement(r.minimumActivityRequirement);
        setRewardCooldownSeconds(r.rewardCooldownSeconds);
        setEligibleTypes(r.eligibleContentTypes || ['text', 'image', 'video']);
        if (r.antiAbuseRules) {
          setMinContentLength(r.antiAbuseRules.minContentLength ?? 1);
          setDuplicateContentBlocked(r.antiAbuseRules.duplicateContentBlocked ?? false);
          setMaxDailyPostsEligible(r.antiAbuseRules.maxDailyPostsEligible ?? 50);
        }
      }

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setLedger(ledgerData.ledger || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch economy settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/coin-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coinsPerPost,
          coinsPerPhoto,
          coinsPerVideo,
          coinsPerStory,
          dailyEarningLimit,
          maximumDailyReward,
          minimumAccountAgeHours,
          minimumActivityRequirement,
          rewardCooldownSeconds,
          eligibleContentTypes: eligibleTypes,
          antiAbuseRules: {
            minContentLength,
            duplicateContentBlocked,
            maxDailyPostsEligible,
            spamCooldownSeconds: rewardCooldownSeconds,
          },
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update rules');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error updating rules');
    } finally {
      setSaving(false);
    }
  };

  const toggleContentType = (type: string) => {
    if (eligibleTypes.includes(type)) {
      setEligibleTypes(eligibleTypes.filter((t) => t !== type));
    } else {
      setEligibleTypes([...eligibleTypes, type]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Coins className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-amber-300">Configurable Virtual Coin Rules & Anti-Abuse Policies</h4>
          <p className="text-slate-300 mt-0.5">
            Coin rewards are calculated and validated in real time. Rules are backed by an immutable ledger recording
            pre/post balances, source entities, and anti-spam verification hashes.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Economy rules and anti-abuse policies updated and deployed successfully!</span>
        </div>
      )}

      {/* Rules Form */}
      <form onSubmit={handleSaveRules} className="glass-card rounded-3xl p-5 border border-white/10 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-bold text-sm text-white">Dynamic Activity Earning Matrix</h3>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Deploy Policy'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text Post reward */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Coins Per Text Post (পয়েন্ট)</label>
            <input
              type="number"
              min="0"
              max="1000"
              value={coinsPerPost}
              onChange={(e) => setCoinsPerPost(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Base reward for standard text posts (Default: 5).</p>
          </div>

          {/* Photo Post reward */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Coins Per Photo Post (পয়েন্ট)</label>
            <input
              type="number"
              min="0"
              max="1000"
              value={coinsPerPhoto}
              onChange={(e) => setCoinsPerPhoto(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Reward for image/photo posts (Default: 10).</p>
          </div>

          {/* Video reward */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Coins Per Video Upload (পয়েন্ট)</label>
            <input
              type="number"
              min="0"
              max="2000"
              value={coinsPerVideo}
              onChange={(e) => setCoinsPerVideo(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Reward for video broadcasts (Default: 15).</p>
          </div>

          {/* Story reward */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Coins Per Story (পয়েন্ট)</label>
            <input
              type="number"
              min="0"
              max="500"
              value={coinsPerStory}
              onChange={(e) => setCoinsPerStory(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Reward for ephemeral 24h stories (Default: 5).</p>
          </div>
        </div>

        {/* Cooldowns and Caps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Daily Earning Limit (Per User)</label>
            <input
              type="number"
              min="10"
              max="10000"
              value={dailyEarningLimit}
              onChange={(e) => setDailyEarningLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Standard daily coin earnings ceiling.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Maximum Hard Cap (Daily)</label>
            <input
              type="number"
              min="50"
              max="50000"
              value={maximumDailyReward}
              onChange={(e) => setMaximumDailyReward(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Absolute ceiling including bonuses and activities.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Reward Cooldown (Seconds)</label>
            <input
              type="number"
              min="0"
              max="3600"
              value={rewardCooldownSeconds}
              onChange={(e) => setRewardCooldownSeconds(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-300">Minimum delay between reward events (Anti-Spam).</p>
          </div>
        </div>

        {/* Anti-Abuse & Account Eligibility */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h4 className="font-bold text-xs text-white">Anti-Abuse & Fraud Protection Rules</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Minimum Account Age (Hours)</label>
              <input
                type="number"
                min="0"
                max="720"
                value={minimumAccountAgeHours}
                onChange={(e) => setMinimumAccountAgeHours(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-300">Prevents newly spawned bots from harvesting coins.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Min Content Length (Characters)</label>
              <input
                type="number"
                min="0"
                max="500"
                value={minContentLength}
                onChange={(e) => setMinContentLength(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-300">Disqualifies low-effort spam or single-character posts.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Max Eligible Posts Per Day</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxDailyPostsEligible}
                onChange={(e) => setMaxDailyPostsEligible(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
              />
              <p className="text-[10px] text-slate-300">Cap on number of posts rewarded per user per day.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={duplicateContentBlocked}
                onChange={(e) => setDuplicateContentBlocked(e.target.checked)}
                className="rounded border-white/20 bg-black text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>Block Repeated / Duplicate Text Spam</span>
            </label>
          </div>
        </div>

        {/* Eligible Content Types */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Eligible Content Types for Rewards:</label>
          <div className="flex flex-wrap gap-2">
            {['text', 'image', 'video', 'poll', 'article', 'audio'].map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => toggleContentType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  eligibleTypes.includes(type)
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Immutable Transaction Ledger Section */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-bold text-sm text-white">Immutable Coin Earnings Ledger</h3>
          </div>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/5 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="p-2.5 rounded-l-xl">Recipient User</th>
                <th className="p-2.5">Event</th>
                <th className="p-2.5">Reward</th>
                <th className="p-2.5">Balance Path</th>
                <th className="p-2.5">Source Entity</th>
                <th className="p-2.5">Anti-Abuse Hash</th>
                <th className="p-2.5 rounded-r-xl">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No ledger records logged yet. New posts or videos will appear here dynamically.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-2.5 font-medium text-white flex items-center gap-2">
                      <img
                        src={row.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="truncate max-w-[140px]">{row.userName || row.userId}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                        {row.event}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold font-mono text-amber-400">
                      +{row.coins} Coins
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-400">
                      {row.beforeBalance} → <span className="text-white font-bold">{row.afterBalance}</span>
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-400">
                      {row.sourceType}: {row.sourceId?.substring(0, 10)}...
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-400">
                      {row.antiAbuseFlags ? 'Verified ✓' : 'Direct'}
                    </td>
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
