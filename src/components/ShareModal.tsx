import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Post } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { IconCameraStory, IconLock, IconVerifiedBadge } from '../design-system/icons/OriginalIcons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onShareSuccess?: (newSharesCount: number) => void;
}

type ShareTarget = 'feed' | 'story' | 'group' | 'page' | 'message' | 'copy_link';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  post,
  onShareSuccess,
}) => {
  const { language } = useLanguage();
  const [selectedTarget, setSelectedTarget] = useState<ShareTarget>('feed');
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = postUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setStatusMessage(language === 'bn' ? 'পোস্টের লিঙ্ক কপি করা হয়েছে!' : 'Transmission link copied to clipboard!');

      // Register share event on backend
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/posts/${post.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetType: 'copy_link' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onShareSuccess && data.sharesCount !== undefined) {
          onShareSuccess(data.sharesCount);
        }
      }

      setTimeout(() => {
        setCopiedLink(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareSubmit = async () => {
    if (selectedTarget === 'copy_link') {
      handleCopyLink();
      return;
    }

    setIsSharing(true);
    setStatusMessage(null);

    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/posts/${post.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetType: selectedTarget,
          targetId: selectedRecipient || undefined,
          caption,
          privacy,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || (language === 'bn' ? 'শেয়ার করতে ব্যর্থ হয়েছে' : 'Failed to share transmission'));
      }

      const data = await res.json();
      if (onShareSuccess && data.sharesCount !== undefined) {
        onShareSuccess(data.sharesCount);
      }

      setStatusMessage(data.message || (language === 'bn' ? 'সফলভাবে শেয়ার করা হয়েছে!' : 'Shared successfully!'));
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      setStatusMessage(error.message || (language === 'bn' ? 'শেয়ারের সময় ত্রুটি হয়েছে' : 'Error executing share'));
    } finally {
      setIsSharing(false);
    }
  };

  const targets = [
    {
      id: 'feed' as ShareTarget,
      label: language === 'bn' ? 'ফিডে শেয়ার' : 'Share to Feed',
      description: language === 'bn' ? 'আপনার ব্যক্তিগত টাইমলাইনে শেয়ার করুন' : 'Quote repost onto your personal stream with your thoughts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      ),
      color: 'bg-cyan-500/15 text-cyan-500',
    },
    {
      id: 'story' as ShareTarget,
      label: language === 'bn' ? 'স্টোরিতে দিন' : 'Add to Story',
      description: language === 'bn' ? '২৪ ঘণ্টার হাইলাইট স্টোরিতে দিন' : 'Display as an ephemeral 24-hour transmission highlight',
      icon: <IconCameraStory size={18} className="text-pink-500" />,
      color: 'bg-pink-500/15 text-pink-500',
    },
    {
      id: 'group' as ShareTarget,
      label: language === 'bn' ? 'গ্রুপে শেয়ার' : 'Share to Group',
      description: language === 'bn' ? 'কমিউনিটি বা গ্রুপে পাঠান' : 'Broadcast to a specialized community cluster or guild',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: 'bg-emerald-500/15 text-emerald-500',
    },
    {
      id: 'page' as ShareTarget,
      label: language === 'bn' ? 'পেইজে পোস্ট' : 'Share to Page',
      description: language === 'bn' ? 'আপনার ক্রিয়েটর পেইজে পোস্ট করুন' : 'Publish on an official organization or creator node',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      color: 'bg-purple-500/15 text-purple-500',
    },
    {
      id: 'message' as ShareTarget,
      label: language === 'bn' ? 'মেসেঞ্জারে পাঠান' : 'Send via Chat',
      description: language === 'bn' ? 'ইনবক্সে সরাসরি পাঠান' : 'Forward directly to a peer via encrypted channel',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      color: 'bg-amber-500/15 text-amber-500',
    },
    {
      id: 'copy_link' as ShareTarget,
      label: language === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link',
      description: language === 'bn' ? 'পোস্টের লিঙ্ক সরাসরি কপি করুন' : 'Direct deep link URL ready to paste anywhere',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
      color: 'bg-blue-500/15 text-blue-500',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/35 dark:bg-black/65 backdrop-blur-md pb-safe">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-white/15 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] text-slate-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-white/10 shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'পোস্ট শেয়ার করুন' : 'Share Transmission'}</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Target Options Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {targets.map((t) => {
                const isSelected = selectedTarget === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(t.id);
                      if (t.id === 'copy_link') handleCopyLink();
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15 shadow-xs ring-1 ring-cyan-500'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.color}`}>
                      {t.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Target Context Fields */}
            {selectedTarget === 'feed' && (
              <div className="space-y-2.5">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={language === 'bn' ? 'আপনার মতামত বা ক্যাপশন লিখুন...' : 'Add your commentary or context to this repost...'}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <IconLock size={14} />
                    <span>{language === 'bn' ? 'প্রাইভেসি:' : 'Audience:'}</span>
                  </div>
                  <select
                    value={privacy}
                    onChange={(e: any) => setPrivacy(e.target.value)}
                    className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="public">{language === 'bn' ? 'পাবলিক (সবার জন্য)' : 'Public (Entire Nixo)'}</option>
                    <option value="followers">{language === 'bn' ? 'শুধুমাত্র ফলোয়ার্স' : 'Followers Only'}</option>
                    <option value="private">{language === 'bn' ? 'অনলি মি (ব্যক্তিগত)' : 'Private (Only Me)'}</option>
                  </select>
                </div>
              </div>
            )}

            {selectedTarget === 'group' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'bn' ? 'গ্রুপ বা কমিউনিটি নির্বাচন করুন' : 'Select Target Community / Guild'}
                </label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="grp_devs">Quantum Developers Cluster</option>
                  <option value="grp_design">Nixo Spatial UI Guild</option>
                  <option value="grp_ai">Synthetic Intelligence Syndicate</option>
                  <option value="grp_explorers">Cosmic Node Explorers</option>
                </select>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={language === 'bn' ? 'গ্রুপের জন্য বার্তা লিখুন...' : 'Write a message for group members...'}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              </div>
            )}

            {selectedTarget === 'page' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'bn' ? 'সম্পর্কিত পেইজ নির্বাচন করুন' : 'Select Associated Page'}
                </label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="pg_nixo_official">Nixo Official Page</option>
                  <option value="pg_future_lab">Future Systems Lab</option>
                </select>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={language === 'bn' ? 'পেইজের অফিসিয়াল ক্যাপশন লিখুন...' : 'Official statement or caption...'}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              </div>
            )}

            {selectedTarget === 'message' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'bn' ? 'ইউজারনেম বা আইডি' : 'Recipient Username or Node'}
                </label>
                <input
                  type="text"
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  placeholder="e.g. @sarah or username"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={language === 'bn' ? 'ইনবক্স বার্তা...' : 'Direct message note...'}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              </div>
            )}

            {/* Embedded Mini Post Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src={
                    post.author.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`
                  }
                  alt={post.author.username}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {post.author.fullName}
                </span>
                {post.author.isVerified && <IconVerifiedBadge size={12} className="text-cyan-400" />}
                <span className="text-[11px] text-slate-400">@{post.author.username}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                {post.content}
              </p>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                  statusMessage.includes('Error') || statusMessage.includes('ত্রুটি') || statusMessage.includes('ব্যর্থ')
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                }`}
              >
                {statusMessage}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>

            {selectedTarget === 'copy_link' ? (
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                {copiedLink ? (language === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (language === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link')}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSharing}
                onClick={handleShareSubmit}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all shadow-lg hover:shadow-cyan-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSharing ? (language === 'bn' ? 'শেয়ার হচ্ছে...' : 'Transmitting...') : (language === 'bn' ? 'শেয়ার করুন' : 'Share Now')}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
