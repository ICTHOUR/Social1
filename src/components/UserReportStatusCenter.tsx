import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import {
  Shield,
  Flag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';

interface ReportItem {
  id: string;
  reporterId: string;
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
  status: 'pending' | 'reviewing' | 'action_taken' | 'dismissed' | 'escalated';
  resolutionAction?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserReportStatusCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserReportStatusCenter: React.FC<UserReportStatusCenterProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const fetchMyReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports/my-reports', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error('Failed to fetch user reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyReports();
    }
  }, [isOpen, token]);

  const filteredReports = reports.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.targetType.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: ReportItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Review
          </span>
        );
      case 'reviewing':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> In Review
          </span>
        );
      case 'action_taken':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Action Taken
          </span>
        );
      case 'dismissed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Dismissed
          </span>
        );
      case 'escalated':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Escalated
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="My Community Reports Status"
      subtitle="Track your submitted infractions, review statuses, and resolution notes"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Search & Refresh */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports by ID, category, target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <GlassButton variant="glass" onClick={fetchMyReports} disabled={loading} className="py-2 text-xs flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </GlassButton>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <p>Loading report status queue...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2 bg-white/5 rounded-2xl border border-white/10 p-6">
            <Shield className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
            <p className="font-bold text-white text-sm">No Community Reports Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You have not submitted any infractions recently. When you report a user or post, it will appear here with live tracking.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {filteredReports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-white/20 transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-cyan-400">{rep.id}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-300 uppercase">
                      {rep.targetType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(rep.status)}
                    <span className="text-[11px] text-slate-400">
                      {new Date(rep.createdAt).toLocaleDateString()} {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                    <p className="text-white font-medium capitalize mt-0.5">{rep.category}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reason / Description</span>
                    <p className="text-slate-300 mt-0.5 line-clamp-2">{rep.description || rep.reason}</p>
                  </div>
                </div>

                {/* Moderator Requested Info Warning Banner */}
                {rep.requestedInfoNotes && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                    <div>
                      <strong className="block text-cyan-300 font-bold">Moderator Requested Additional Information:</strong>
                      <p className="mt-0.5 text-slate-200">{rep.requestedInfoNotes}</p>
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {(rep.status === 'action_taken' || rep.status === 'dismissed') && rep.resolutionNotes && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Resolution Outcome & Notes
                    </span>
                    <p className="text-slate-200 leading-relaxed">{rep.resolutionNotes}</p>
                    {rep.resolutionAction && (
                      <div className="text-[10px] text-cyan-400 pt-1 font-semibold">
                        Action Executed: {rep.resolutionAction.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence links if present */}
                {(rep.evidence || rep.screenshots || rep.relatedContent) && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                    {rep.screenshots && (
                      <a
                        href={rep.screenshots}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] hover:bg-purple-500/20 transition"
                      >
                        <ImageIcon className="w-3 h-3" /> Screenshot Attached
                      </a>
                    )}
                    {rep.relatedContent && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                        Related: {rep.relatedContent}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 text-right">
          <GlassButton variant="glass" onClick={onClose} className="px-6 py-2 text-xs">
            Close
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};
