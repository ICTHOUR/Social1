import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { GlassButton } from '../../design-system/components/GlassButton';
import { GlassModal } from '../../design-system/components/GlassModal';
import {
  Shield,
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Sliders,
  History,
  UserX,
  Trash2,
  AlertOctagon,
  Clock,
  Filter,
  Search,
  RefreshCw,
  HelpCircle,
  Image as ImageIcon,
  Link2,
  FileText,
  User,
  ArrowUpRight,
  Send,
  MessageSquare,
} from 'lucide-react';

interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar?: string;
  targetType: string;
  targetId: string;
  category: string;
  reason: string;
  description?: string;
  evidence?: string;
  evidenceUrl?: string;
  screenshots?: string;
  relatedContent?: string;
  additionalInfo?: string;
  requestedInfoNotes?: string;
  details?: string;
  status: 'pending' | 'reviewing' | 'action_taken' | 'dismissed' | 'escalated';
  priorityScore: number;
  assignedModeratorName?: string;
  resolutionAction?: string;
  resolutionNotes?: string;
  snapshotData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface ActionHistoryItem {
  id: string;
  moderatorName: string;
  reportId?: string;
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  notes?: string;
  previousState?: string;
  newState?: string;
  createdAt: string;
}

interface UserAuditData {
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
    role: string;
    status: string;
    is_verified?: number;
    created_at: string;
  } | null;
  reportsReceivedCount: number;
  reportsFiledCount: number;
  reportsReceived: any[];
  reportsFiled: any[];
  moderationActions: any[];
  activeRestrictions: any[];
}

interface AntiSpamRule {
  id: string;
  category: string;
  ruleKey: string;
  name: string;
  description: string;
  thresholdValue: number;
  timeWindowSec: number;
  actionOnBreach: string;
  cooldownSeconds: number;
  isEnabled: boolean;
  updatedAt: string;
}

export const AdminModerationQueue: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'anti-spam-rules'>('queue');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [rules, setRules] = useState<AntiSpamRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog & Inspector State
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [inspectingSnapshot, setInspectingSnapshot] = useState<ReportItem | null>(null);
  const [userAuditModalId, setUserAuditModalId] = useState<string | null>(null);
  const [userAuditData, setUserAuditData] = useState<UserAuditData | null>(null);
  const [loadingUserAudit, setLoadingUserAudit] = useState<boolean>(false);

  const [actionType, setActionType] = useState<string>('dismiss');
  const [actionReason, setActionReason] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/api/admin/reports-v2?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (targetTypeFilter !== 'all') url += `&targetType=${targetTypeFilter}`;
      if (categoryFilter !== 'all') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error('Error fetching reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/moderation/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      console.error('Error fetching moderation history:', e);
    }
  };

  const fetchRules = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/anti-spam/rules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      console.error('Error fetching anti-spam rules:', e);
    }
  };

  const fetchUserAudit = async (userId: string) => {
    if (!token) return;
    setUserAuditModalId(userId);
    setLoadingUserAudit(true);
    try {
      const res = await fetch(`/api/admin/reports/user-audit/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserAuditData(data);
    } catch (e) {
      console.error('Error fetching user audit:', e);
    } finally {
      setLoadingUserAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queue') fetchReports();
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'anti-spam-rules') fetchRules();
  }, [activeTab, statusFilter, targetTypeFilter, categoryFilter, token]);

  const handleExecuteAction = async () => {
    if (!selectedReport || !token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/reports/${selectedReport.id}/action-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actionType,
          reason: actionReason || `Moderator action: ${actionType}`,
          notes: actionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process moderation action');

      setStatusMsg({ text: `Action '${actionType}' executed successfully!`, type: 'success' });
      setSelectedReport(null);
      setActionReason('');
      setActionNotes('');
      fetchReports();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error processing action', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRule = async (ruleKey: string, updates: Partial<AntiSpamRule>) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/anti-spam/rules/${ruleKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Moderation Control Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Moderation Queue ({reports.filter((r) => r.status === 'pending').length} Pending)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => setActiveTab('anti-spam-rules')}
            className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'anti-spam-rules'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Anti-Spam & Abuse Limits</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'queue') fetchReports();
            if (activeTab === 'history') fetchHistory();
            if (activeTab === 'anti-spam-rules') fetchRules();
          }}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer flex items-center gap-1"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline font-bold">Refresh</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 1. QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reason, ID, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Queue</option>
                <option value="reviewing">Under Review</option>
                <option value="action_taken">Action Taken</option>
                <option value="dismissed">Dismissed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>

            <div>
              <select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Targets</option>
                <option value="user">User Account</option>
                <option value="post">Post</option>
                <option value="comment">Comment</option>
                <option value="video">Video</option>
                <option value="reel">Reel</option>
                <option value="story">Story</option>
                <option value="group">Group</option>
                <option value="page">Page</option>
                <option value="message">Direct Message</option>
              </select>
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="spam">Spam & Flood</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate content">Inappropriate Content</option>
                <option value="fraud">Fraud & Scam</option>
                <option value="impersonation">Impersonation</option>
                <option value="copyright complaint">Copyright Violation</option>
                <option value="violence">Violence</option>
                <option value="hate speech">Hate Speech</option>
                <option value="self harm">Self Harm</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Fetching moderation reports queue...</span>
            </div>
          ) : reports.length === 0 ? (
            <GlassCard className="p-8 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-white text-sm">Moderation Queue Clear!</p>
              <p className="text-slate-400 text-xs">No pending items requiring moderator action under selected filters.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => {
                const authorId =
                  rep.snapshotData?.authorId ||
                  rep.snapshotData?.senderId ||
                  (rep.targetType === 'user' ? rep.targetId : null);

                return (
                  <GlassCard key={rep.id} className="p-4 space-y-3 border-white/10 hover:border-white/20 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide ${
                            rep.status === 'pending'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : rep.status === 'reviewing'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : rep.status === 'action_taken'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : rep.status === 'escalated'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                          }`}
                        >
                          {rep.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold text-[10px] uppercase">
                          {rep.targetType}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/10 text-purple-300 font-bold text-[10px] capitalize">
                          {rep.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Priority Score: <strong className="text-white">{rep.priorityScore}</strong>
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {rep.id} • {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Left: Info & Evidence */}
                      <div className="md:col-span-2 space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Core Reason</span>
                          <p className="font-bold text-slate-100 text-xs mt-0.5">{rep.reason}</p>
                        </div>

                        {(rep.description || rep.details) && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{rep.description || rep.details}</p>
                          </div>
                        )}

                        {/* Evidence & Screenshots */}
                        {(rep.evidence || rep.screenshots || rep.relatedContent || rep.additionalInfo) && (
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-[11px]">
                            {rep.evidence && (
                              <p className="text-slate-300">
                                <strong className="text-cyan-400">Evidence Details:</strong> {rep.evidence}
                              </p>
                            )}
                            {rep.screenshots && (
                              <p className="text-slate-300 flex items-center gap-1">
                                <strong className="text-purple-400">Screenshot Link:</strong>
                                <a href={rep.screenshots} target="_blank" rel="noreferrer" className="text-cyan-400 underline truncate max-w-xs">
                                  {rep.screenshots}
                                </a>
                              </p>
                            )}
                            {rep.relatedContent && (
                              <p className="text-slate-300">
                                <strong className="text-amber-400">Related Content:</strong> {rep.relatedContent}
                              </p>
                            )}
                          </div>
                        )}

                        {/* People Involved */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span>
                            Reporter: <strong className="text-slate-200">{rep.reporterName}</strong>
                          </span>
                          {authorId && (
                            <button
                              type="button"
                              onClick={() => fetchUserAudit(authorId)}
                              className="text-cyan-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <User className="w-3 h-3" /> Inspect Author/User Profile
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col justify-center gap-2 sm:border-l sm:border-white/10 sm:pl-3">
                        <button
                          onClick={() => setInspectingSnapshot(rep)}
                          className="py-1.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Evidence Snapshot</span>
                        </button>

                        {authorId && (
                          <button
                            onClick={() => fetchUserAudit(authorId)}
                            className="py-1.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>User History & Audit</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedReport(rep);
                            setActionType('dismiss');
                          }}
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Take Action / Resolve</span>
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. MODERATION ACTION HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <h4 className="font-bold text-white text-xs">Moderator Action Audit Trail</h4>
            <span className="text-[11px] text-slate-400">{history.length} actions logged</span>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[11px] text-slate-400">
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Moderator</th>
                  <th className="p-3 font-semibold">Target Type</th>
                  <th className="p-3 font-semibold">Action Executed</th>
                  <th className="p-3 font-semibold">Reason</th>
                  <th className="p-3 font-semibold">Status Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-white/5 transition">
                    <td className="p-3 text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-white">{h.moderatorName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 font-mono text-[10px] uppercase">
                        {h.targetType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-rose-300 uppercase text-[10px]">
                      {h.action?.replace(/_/g, ' ') || 'Unknown'}
                    </td>
                    <td className="p-3 max-w-xs truncate text-[11px]">{h.reason}</td>
                    <td className="p-3 text-[10px] text-slate-400">
                      {h.previousState} ➔ <span className="text-emerald-400 font-bold">{h.newState}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ANTI-SPAM & SAFETY RULES CONFIGURATION TAB */}
      {activeTab === 'anti-spam-rules' && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="font-bold text-white text-xs">Anti-Spam Thresholds & Abuse Safeguards</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tune rate-limiting velocities, duplication detectors, and anomaly scoring to shield the platform against automated abuse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <GlassCard key={rule.id} className="p-4 space-y-3 border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      {rule.category}
                    </span>
                    <h5 className="font-bold text-white text-xs mt-1">{rule.name}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{rule.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.isEnabled}
                      onChange={(e) => handleUpdateRule(rule.ruleKey, { isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Threshold:</span>
                    <span className="font-bold text-white">{rule.thresholdValue} max / window</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Time Window:</span>
                    <span className="font-bold text-white">{rule.timeWindowSec}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Action on Breach:</span>
                    <span className="font-bold text-rose-300 uppercase text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      {rule.actionOnBreach}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* SNAPSHOT INSPECTOR MODAL */}
      {inspectingSnapshot && (
        <GlassModal
          isOpen={Boolean(inspectingSnapshot)}
          onClose={() => setInspectingSnapshot(null)}
          title={`Evidence Snapshot: ${inspectingSnapshot.targetType.toUpperCase()}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>Target ID: {inspectingSnapshot.targetId}</span>
                <span>Category: <strong className="text-purple-300">{inspectingSnapshot.category}</strong></span>
              </div>
              <p className="font-bold text-slate-200">Reason: {inspectingSnapshot.reason}</p>
              {inspectingSnapshot.description && (
                <p className="text-slate-300 text-xs">{inspectingSnapshot.description}</p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 font-mono text-[11px]">
              <p className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Captured State At Time Of Report:</p>
              <pre className="overflow-x-auto text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60">
                {JSON.stringify(inspectingSnapshot.snapshotData, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end">
              <GlassButton variant="primary" onClick={() => setInspectingSnapshot(null)}>
                Close Inspector
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* REPORTED USER AUDIT MODAL */}
      {userAuditModalId && (
        <GlassModal
          isOpen={Boolean(userAuditModalId)}
          onClose={() => {
            setUserAuditModalId(null);
            setUserAuditData(null);
          }}
          title="Reported User Audit & Profile History"
          maxWidth="max-w-2xl"
        >
          {loadingUserAudit ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
              <p>Fetching user audit data...</p>
            </div>
          ) : userAuditData?.user ? (
            <div className="space-y-4 text-xs">
              {/* User Header */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base">{userAuditData.user.full_name}</h4>
                  <p className="text-slate-400 text-xs">@{userAuditData.user.username} • ID: {userAuditData.user.id}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Joined: {new Date(userAuditData.user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 block">
                    Role: {userAuditData.user.role}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase block ${
                      userAuditData.user.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    Status: {userAuditData.user.status}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Reports Received</span>
                  <span className="text-lg font-extrabold text-rose-400">{userAuditData.reportsReceivedCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Reports Filed</span>
                  <span className="text-lg font-extrabold text-cyan-400">{userAuditData.reportsFiledCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Mutes</span>
                  <span className="text-lg font-extrabold text-purple-400">{userAuditData.activeRestrictions.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Mod Actions</span>
                  <span className="text-lg font-extrabold text-amber-400">{userAuditData.moderationActions.length}</span>
                </div>
              </div>

              {/* Active Restrictions if any */}
              {userAuditData.activeRestrictions.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <strong className="block font-bold">Active User Restrictions:</strong>
                  {userAuditData.activeRestrictions.map((r: any) => (
                    <div key={r.id} className="text-[11px] flex justify-between">
                      <span>Type: {r.restriction_type} ({r.reason})</span>
                      <span>Expires: {r.expires_at ? new Date(r.expires_at).toLocaleString() : 'Permanent'}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <GlassButton
                  variant="primary"
                  onClick={() => {
                    setUserAuditModalId(null);
                    setUserAuditData(null);
                  }}
                >
                  Close Audit View
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">User profile record not found.</div>
          )}
        </GlassModal>
      )}

      {/* MODERATION ACTION MODAL */}
      {selectedReport && (
        <GlassModal
          isOpen={Boolean(selectedReport)}
          onClose={() => setSelectedReport(null)}
          title={`Execute Action on Reported ${selectedReport.targetType.toUpperCase()}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-slate-400">Report #{selectedReport.id}</p>
              <p className="font-bold text-white mt-0.5">Reason: {selectedReport.reason}</p>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-2">Select Action *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setActionType('dismiss')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'dismiss'
                      ? 'bg-slate-500/20 border-slate-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Dismiss Report</p>
                  <p className="text-[10px] text-slate-400">No infraction found</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('request_info')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'request_info'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Request Additional Info</p>
                  <p className="text-[10px] text-slate-400">Ask reporter for more evidence</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('issue_warning')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'issue_warning'
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Issue Official Warning</p>
                  <p className="text-[10px] text-slate-400">Send system warning notification</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('delete_content')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'delete_content'
                      ? 'bg-rose-500/20 border-rose-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Delete / Remove Content</p>
                  <p className="text-[10px] text-slate-400">Remove violating content item</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('restrict_user_24h')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'restrict_user_24h'
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Restrict User (24 Hours)</p>
                  <p className="text-[10px] text-slate-400">Temporary mute from posting</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('restrict_user_7d')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'restrict_user_7d'
                      ? 'bg-purple-600/30 border-purple-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Restrict User (7 Days)</p>
                  <p className="text-[10px] text-slate-400">7-day mute restriction</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('suspend_user')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'suspend_user'
                      ? 'bg-rose-600/30 border-rose-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs">Suspend Account</p>
                  <p className="text-[10px] text-slate-400">Temporary account suspension</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('ban_user')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'ban_user'
                      ? 'bg-red-600/40 border-red-500 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-red-400">Permanent Ban</p>
                  <p className="text-[10px] text-slate-400">Ban user account</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('escalate')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    actionType === 'escalate'
                      ? 'bg-amber-600/30 border-amber-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="font-bold text-xs text-amber-300">Escalate Report</p>
                  <p className="text-[10px] text-slate-400">Escalate to senior admins</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Reason / Notes *</label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Required justification for audit trail..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <GlassButton variant="glass" onClick={() => setSelectedReport(null)} className="flex-1">
                Cancel
              </GlassButton>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteAction}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Executing Action...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};
