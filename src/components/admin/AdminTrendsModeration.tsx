import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Sliders,
  Bookmark,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Pin,
  Trash2,
  RefreshCw,
  Plus,
  Flame,
  Users,
  Eye,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminTrendsModeration: React.FC = () => {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'inspect' | 'blocked' | 'featured' | 'thresholds'>('inspect');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Data states
  const [trends, setTrends] = useState<any[]>([]);
  const [blockedHashtags, setBlockedHashtags] = useState<any[]>([]);
  const [featuredTrends, setFeaturedTrends] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    minUniqueUsers: 3,
    timeWindowHours: 24,
    weightEngagement: 1.0,
    weightVelocity: 1.5,
    weightUniqueUsers: 2.0,
    weightViews: 0.2,
    weightShares: 1.8,
    recencyDecayHours: 12.0,
    spamDetectionEnabled: true,
    maxPostsPerUserCounted: 3,
  });

  // Modal / Form states
  const [removeModal, setRemoveModal] = useState<{ isOpen: boolean; trendId: string; reason: string }>({
    isOpen: false,
    trendId: '',
    reason: '',
  });

  const [blockModal, setBlockModal] = useState<{ isOpen: boolean; hashtag: string; reason: string }>({
    isOpen: false,
    hashtag: '',
    reason: 'Violates content policy / spam manipulation',
  });

  const [featureModal, setFeatureModal] = useState<{
    isOpen: boolean;
    target: string;
    title: string;
    description: string;
    badge: string;
    sortOrder: number;
  }>({
    isOpen: false,
    target: '',
    title: '',
    description: '',
    badge: 'Featured',
    sortOrder: 1,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/trends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends || []);
        setBlockedHashtags(data.blockedHashtags || []);
        setFeaturedTrends(data.featuredTrends || []);
        if (data.config) setConfig(data.config);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to load trend moderation data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Remove Trend Action
  const handleRemoveTrend = async () => {
    if (!removeModal.trendId) return;
    try {
      const res = await fetch('/api/admin/trends/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trendIdentifier: removeModal.trendId,
          reason: removeModal.reason || 'Suppressed by Admin',
        }),
      });
      if (res.ok) {
        showToast(`Trend #${removeModal.trendId} suppressed from public feed.`);
        setRemoveModal({ isOpen: false, trendId: '', reason: '' });
        fetchAllData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to remove trend', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Block Hashtag Action
  const handleBlockHashtag = async () => {
    if (!blockModal.hashtag.trim()) return;
    try {
      const res = await fetch('/api/admin/trends/block-hashtag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hashtag: blockModal.hashtag.trim(),
          reason: blockModal.reason,
        }),
      });
      if (res.ok) {
        showToast(`Hashtag #${blockModal.hashtag} added to blacklist.`);
        setBlockModal({ isOpen: false, hashtag: '', reason: '' });
        fetchAllData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to block hashtag', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Unblock Hashtag Action
  const handleUnblockHashtag = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trends/block-hashtag/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Hashtag unblocked successfully.');
        fetchAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Feature Trend Action
  const handleFeatureTrend = async () => {
    if (!featureModal.target.trim()) return;
    try {
      const res = await fetch('/api/admin/trends/feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(featureModal),
      });
      if (res.ok) {
        showToast(`Trend #${featureModal.target} pinned as featured.`);
        setFeatureModal({
          isOpen: false,
          target: '',
          title: '',
          description: '',
          badge: 'Featured',
          sortOrder: 1,
        });
        fetchAllData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to feature trend', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Unfeature Trend Action
  const handleUnfeatureTrend = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/trends/feature/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Featured trend unpinned.');
        fetchAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Save Threshold Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/trends/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('Trend algorithm parameters and anti-spam thresholds updated!');
        fetchAllData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to update settings', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-3xl border border-white/10">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" /> Trends & Discovery Moderation Engine
          </h2>
          <p className="text-xs text-slate-400">
            Real-time trend analysis, anti-spam bot defense, manual overrides, and configurable ranking weights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('inspect')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'inspect'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Inspect Active Trends ({trends.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('blocked')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'blocked'
              ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Blocked Hashtags ({blockedHashtags.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('featured')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'featured'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Featured & Pinned ({featuredTrends.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('thresholds')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'thresholds'
              ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Algorithm Thresholds & Weights</span>
        </button>
      </div>

      {/* 1. INSPECT TRENDS SUB-TAB */}
      {activeSubTab === 'inspect' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Topic / Tag</th>
                  <th className="pb-3 px-2">Posts</th>
                  <th className="pb-3 px-2">Unique Users</th>
                  <th className="pb-3 px-2">Engagement</th>
                  <th className="pb-3 px-2">Velocity</th>
                  <th className="pb-3 px-2">Recency</th>
                  <th className="pb-3 px-2">Composite Score</th>
                  <th className="pb-3 px-2">Spam Guard</th>
                  <th className="pb-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trends.length > 0 ? (
                  trends.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">#{idx + 1}</span>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1">
                              #{t.tag}
                              {t.isFeatured && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                                  {t.badge || 'Featured'}
                                </span>
                              )}
                            </p>
                            {t.sampleSnippet && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{t.sampleSnippet}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-semibold text-slate-200">{t.postsCount}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            t.uniqueUsersCount < (config.minUniqueUsers || 3)
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {t.uniqueUsersCount} users
                        </span>
                      </td>
                      <td className="py-3 px-2 font-semibold text-cyan-300">{t.engagementScore}</td>
                      <td className="py-3 px-2 font-semibold text-purple-300">{t.velocity}x</td>
                      <td className="py-3 px-2 text-slate-400">{t.recencyHours}h ago</td>
                      <td className="py-3 px-2 font-black text-amber-400">{t.trendScore}</td>
                      <td className="py-3 px-2">
                        {t.isSpamSuspicious ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> Bot Suspicious
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Verified Organic
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setFeatureModal({
                                isOpen: true,
                                target: t.tag,
                                title: `#${t.tag}`,
                                description: `Curated trending topic #${t.tag}`,
                                badge: 'Promoted',
                                sortOrder: 1,
                              })
                            }
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                            title="Pin / Feature this trend"
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setRemoveModal({
                                isOpen: true,
                                trendId: t.tag,
                                reason: 'Hidden by administrator',
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 cursor-pointer"
                            title="Suppress / Hide trend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setBlockModal({
                                isOpen: true,
                                hashtag: t.tag,
                                reason: 'Violates platform guidelines',
                              })
                            }
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            title="Blacklist hashtag globally"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No active trend signals in the current analysis window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BLOCKED HASHTAGS SUB-TAB */}
      {activeSubTab === 'blocked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between glass-card p-4 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Blacklisted Hashtags</h3>
              <p className="text-xs text-slate-400">
                Hashtags in this list will never be recommended, indexed in trending topics, or suggested in autocomplete.
              </p>
            </div>
            <button
              onClick={() =>
                setBlockModal({
                  isOpen: true,
                  hashtag: '',
                  reason: 'Violates community guidelines / bot spam',
                })
              }
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Block Hashtag
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Blocked Hashtag</th>
                  <th className="pb-3 px-2">Reason</th>
                  <th className="pb-3 px-2">Blocked By</th>
                  <th className="pb-3 px-2">Timestamp</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {blockedHashtags.length > 0 ? (
                  blockedHashtags.map((b) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 font-bold text-rose-400">#{b.hashtag}</td>
                      <td className="py-3 px-2 text-slate-300">{b.reason || 'No reason provided'}</td>
                      <td className="py-3 px-2 text-slate-400">{b.blocked_by_user_id || 'System'}</td>
                      <td className="py-3 px-2 text-slate-400">{new Date(b.created_at).toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleUnblockHashtag(b.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No hashtags are currently blocked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. FEATURED TRENDS SUB-TAB */}
      {activeSubTab === 'featured' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between glass-card p-4 rounded-3xl border border-white/10">
            <div>
              <h3 className="text-sm font-bold text-white">Curated & Featured Trends</h3>
              <p className="text-xs text-slate-400">
                Pin official announcements, community campaigns, or sponsored topics at the top of the discovery leaderboard.
              </p>
            </div>
            <button
              onClick={() =>
                setFeatureModal({
                  isOpen: true,
                  target: '',
                  title: '',
                  description: '',
                  badge: 'Promoted',
                  sortOrder: featuredTrends.length + 1,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Feature New Topic
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Order</th>
                  <th className="pb-3 px-2">Target</th>
                  <th className="pb-3 px-2">Title</th>
                  <th className="pb-3 px-2">Description</th>
                  <th className="pb-3 px-2">Badge</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {featuredTrends.length > 0 ? (
                  featuredTrends.map((f) => (
                    <tr key={f.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 font-black text-amber-400">#{f.sort_order}</td>
                      <td className="py-3 px-2 font-bold text-white">#{f.target}</td>
                      <td className="py-3 px-2 font-semibold text-slate-200">{f.title}</td>
                      <td className="py-3 px-2 text-slate-400 truncate max-w-xs">{f.description}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 text-[10px]">
                          {f.badge || 'Featured'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleUnfeatureTrend(f.id)}
                          className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer"
                        >
                          Remove Pin
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No featured trends configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ALGORITHM THRESHOLDS & POLICY SUB-TAB */}
      {activeSubTab === 'thresholds' && (
        <form onSubmit={handleSaveConfig} className="glass-card rounded-3xl p-6 border border-white/10 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" /> Multi-Signal Mathematical Ranking Parameters
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure weights for engagement, velocity acceleration, user diversity, view counts, and anti-spam bot dampening.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Anti-Bot Spam Detection Toggle */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.spamDetectionEnabled}
                  onChange={(e) => setConfig({ ...config, spamDetectionEnabled: e.target.checked })}
                  className="rounded text-purple-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-white text-sm">Enable Anti-Bot Spam Shield</span>
                  <p className="text-slate-400 text-xs">
                    Disqualifies trending topics that fail the minimum unique users diversity threshold.
                  </p>
                </div>
              </label>
            </div>

            {/* Minimum Unique Users */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Minimum Unique Users Threshold</label>
              <p className="text-[11px] text-slate-400">
                Number of distinct verified/active accounts required before a hashtag is eligible to trend.
              </p>
              <input
                type="number"
                min="1"
                max="50"
                value={config.minUniqueUsers}
                onChange={(e) => setConfig({ ...config, minUniqueUsers: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Analysis Sliding Time Window */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Analysis Sliding Window (Hours)</label>
              <p className="text-[11px] text-slate-400">
                Time period examined to compute velocity and engagement metrics.
              </p>
              <input
                type="number"
                min="1"
                max="168"
                value={config.timeWindowHours}
                onChange={(e) => setConfig({ ...config, timeWindowHours: parseInt(e.target.value, 10) || 24 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Engagement Weight */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Engagement Weight ({config.weightEngagement}x)</label>
              <p className="text-[11px] text-slate-400">Multiplier for likes, comments, and saves.</p>
              <input
                type="number"
                step="0.1"
                min="0"
                value={config.weightEngagement}
                onChange={(e) => setConfig({ ...config, weightEngagement: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Velocity Weight */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Velocity Weight ({config.weightVelocity}x)</label>
              <p className="text-[11px] text-slate-400">Multiplier for rapid growth acceleration in recent hours.</p>
              <input
                type="number"
                step="0.1"
                min="0"
                value={config.weightVelocity}
                onChange={(e) => setConfig({ ...config, weightVelocity: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Unique Users Diversity Weight */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Unique Users Weight ({config.weightUniqueUsers}x)</label>
              <p className="text-[11px] text-slate-400">Bonus multiplier for broad community participation.</p>
              <input
                type="number"
                step="0.1"
                min="0"
                value={config.weightUniqueUsers}
                onChange={(e) => setConfig({ ...config, weightUniqueUsers: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Shares & Reposts Weight */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Shares / Reposts Weight ({config.weightShares}x)</label>
              <p className="text-[11px] text-slate-400">High-intent viral propagation multiplier.</p>
              <input
                type="number"
                step="0.1"
                min="0"
                value={config.weightShares}
                onChange={(e) => setConfig({ ...config, weightShares: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Recency Decay Half-Life */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Recency Decay Half-Life ({config.recencyDecayHours}h)</label>
              <p className="text-[11px] text-slate-400">Exponential decay constant (smaller = fades faster).</p>
              <input
                type="number"
                step="1"
                min="1"
                value={config.recencyDecayHours}
                onChange={(e) => setConfig({ ...config, recencyDecayHours: parseFloat(e.target.value) || 12 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>

            {/* Max Posts Counted Per User */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <label className="font-bold text-white block">Max Posts Per User Counted ({config.maxPostsPerUserCounted})</label>
              <p className="text-[11px] text-slate-400">Prevents a single bot script spamming posts repeatedly.</p>
              <input
                type="number"
                min="1"
                max="20"
                value={config.maxPostsPerUserCounted}
                onChange={(e) => setConfig({ ...config, maxPostsPerUserCounted: parseInt(e.target.value, 10) || 3 })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-400 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              Save Trend Algorithm Thresholds
            </button>
          </div>
        </form>
      )}

      {/* MODAL: Block Hashtag */}
      {blockModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 border border-white/10 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" /> Block Hashtag Across Platform
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hashtag Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">#</span>
                  <input
                    type="text"
                    value={blockModal.hashtag}
                    onChange={(e) => setBlockModal({ ...blockModal, hashtag: e.target.value })}
                    placeholder="tagname"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Blacklisting</label>
                <input
                  type="text"
                  value={blockModal.reason}
                  onChange={(e) => setBlockModal({ ...blockModal, reason: e.target.value })}
                  placeholder="e.g. Bot manipulation, hate speech"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockModal({ isOpen: false, hashtag: '', reason: '' })}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockHashtag}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Blacklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Remove / Hide Trend */}
      {removeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 border border-white/10 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-400" /> Suppress Trend #{removeModal.trendId}
            </h3>
            <p className="text-xs text-slate-300">
              This will immediately remove #{removeModal.trendId} from the public trending leaderboard and explore highlights.
            </p>
            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Audit Reason</label>
              <input
                type="text"
                value={removeModal.reason}
                onChange={(e) => setRemoveModal({ ...removeModal, reason: e.target.value })}
                placeholder="Reason for removal"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveModal({ isOpen: false, trendId: '', reason: '' })}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveTrend}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Suppress Trend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Feature / Pin Trend */}
      {featureModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 border border-white/10 max-w-md w-full space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-400" /> Pin / Feature Trend
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hashtag Target</label>
                <input
                  type="text"
                  value={featureModal.target}
                  onChange={(e) => setFeatureModal({ ...featureModal, target: e.target.value })}
                  placeholder="e.g. LiquidGlassUI"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Display Title</label>
                <input
                  type="text"
                  value={featureModal.title}
                  onChange={(e) => setFeatureModal({ ...featureModal, title: e.target.value })}
                  placeholder="e.g. #LiquidGlassUI Next-Gen Spatial"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Badge Text</label>
                <input
                  type="text"
                  value={featureModal.badge}
                  onChange={(e) => setFeatureModal({ ...featureModal, badge: e.target.value })}
                  placeholder="Featured, Official, Sponsored"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sort Priority Order</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={featureModal.sortOrder}
                  onChange={(e) => setFeatureModal({ ...featureModal, sortOrder: parseInt(e.target.value, 10) || 1 })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setFeatureModal({
                    isOpen: false,
                    target: '',
                    title: '',
                    description: '',
                    badge: 'Featured',
                    sortOrder: 1,
                  })
                }
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFeatureTrend}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Pin Trend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
