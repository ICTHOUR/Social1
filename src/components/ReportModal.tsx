import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassButton } from '../design-system/components/GlassButton';
import { Shield, Flag, AlertCircle, FileText, CheckCircle2, Image as ImageIcon, Link2, HelpCircle } from 'lucide-react';

export type ReportTargetType = 'user' | 'post' | 'comment' | 'video' | 'reel' | 'story' | 'group' | 'page' | 'message';
export type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate content'
  | 'impersonation'
  | 'fraud'
  | 'copyright complaint'
  | 'violence'
  | 'hate speech'
  | 'self harm'
  | 'misinformation'
  | 'other';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetAuthorName?: string;
}

const CATEGORIES: { id: ReportCategory; title: string; desc: string; icon: string }[] = [
  { id: 'spam', title: 'Spam & Flood', desc: 'Repetitive messages, unwanted ads or bots', icon: '📢' },
  { id: 'harassment', title: 'Harassment & Bullying', desc: 'Targeted aggression, intimidation or threats', icon: '🛑' },
  { id: 'inappropriate content', title: 'Inappropriate Content', desc: 'Sexually explicit or graphic material', icon: '⚠️' },
  { id: 'fraud', title: 'Scam & Financial Fraud', desc: 'Phishing schemes, coin exploits or deception', icon: '💳' },
  { id: 'impersonation', title: 'Fake Identity', desc: 'Pretending to be another creator or company', icon: '🎭' },
  { id: 'copyright complaint', title: 'Copyright Violation', desc: 'Stolen artwork, music or pirated media', icon: '©️' },
  { id: 'violence', title: 'Violence & Danger', desc: 'Physical harm threats or dangerous activities', icon: '☣️' },
  { id: 'hate speech', title: 'Hate Speech', desc: 'Discrimination based on identity or race', icon: '🚫' },
  { id: 'self harm', title: 'Self Harm Promotion', desc: 'Encouraging dangerous behavior or self-injury', icon: '🩹' },
  { id: 'misinformation', title: 'False Information', desc: 'Deceptive fake news or viral disinformation', icon: '📰' },
  { id: 'other', title: 'Other Violation', desc: 'General community guidelines infraction', icon: '📝' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetAuthorName,
}) => {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('spam');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [screenshots, setScreenshots] = useState('');
  const [relatedContent, setRelatedContent] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('You must be signed in to submit a community report.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the infraction.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType,
          targetId,
          category: selectedCategory,
          reason: description.trim(),
          description: description.trim(),
          evidence: evidence.trim() || undefined,
          screenshots: screenshots.trim() || undefined,
          relatedContent: relatedContent.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmittedReportId(data.reportId);
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedReportId(null);
    setDescription('');
    setEvidence('');
    setScreenshots('');
    setRelatedContent('');
    setAdditionalInfo('');
    setError(null);
    onClose();
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleReset}
      title={`Report ${targetType.toUpperCase()}`}
      subtitle="Help protect the community from abusive or harmful behavior"
      maxWidth="max-w-xl"
    >
      {submittedReportId ? (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Successfully Submitted</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Thank you for keeping the ecosystem safe. Your report has been queued for human moderation review.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Report Reference ID:</span>
              <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{submittedReportId}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase border border-amber-500/30">
                PENDING REVIEW
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Submitted Date:</span>
              <span className="text-slate-900 dark:text-white font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="pt-2">
            <GlassButton variant="primary" onClick={handleReset} className="w-full max-w-md mx-auto">
              Done & Close
            </GlassButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Entity Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div className="truncate">
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">Target Content / Entity</span>
              <p className="text-slate-900 dark:text-white font-semibold truncate mt-0.5">
                {targetTitle ? targetTitle : `${targetType} (ID: ${targetId.slice(0, 16)}...)`}
              </p>
              {targetAuthorName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Created by: {targetAuthorName}</p>
              )}
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
              Disputed
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category */}
          <div>
            <label className="block text-slate-800 dark:text-slate-300 font-bold mb-2">1. Select Infraction Category *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-white shadow-md shadow-rose-500/10'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <div>
                    <p className="font-bold text-xs leading-tight">{cat.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
              <span>2. Description of Issue *</span>
              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Required</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Explain why this content or user violates community standards..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition text-xs"
            />
          </div>

          {/* 3. Evidence & Screenshots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Evidence Text / Details
              </label>
              <input
                type="text"
                placeholder="Exact quotes, time-stamps, coin amounts..."
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Screenshot / Image URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={screenshots}
                onChange={(e) => setScreenshots(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 text-xs"
              />
            </div>
          </div>

          {/* 4. Related Content & Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Related Content Link or ID
              </label>
              <input
                type="text"
                placeholder="e.g. /posts/98765 or group_id"
                value={relatedContent}
                onChange={(e) => setRelatedContent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Optional Additional Notes
              </label>
              <input
                type="text"
                placeholder="Any extra context for moderators..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <GlassButton
              type="button"
              variant="glass"
              onClick={handleReset}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </GlassButton>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold transition shadow-lg shadow-rose-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-xs"
            >
              {isSubmitting ? (
                <span>Submitting Report...</span>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Submit Community Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </GlassModal>
  );
};
