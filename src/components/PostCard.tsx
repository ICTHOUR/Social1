import React, { useState, useRef, useEffect } from 'react';
import { Post, Comment, ReactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../design-system/ToastContext';
import { isVideoUrl } from '../utils/mediaUtils';
import { FullscreenImageModal } from './FullscreenImageModal';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassModal } from '../design-system/components/GlassModal';
import { GlassInput } from '../design-system/components/GlassInput';
import { ReactionPicker } from '../design-system/components/ReactionPicker';
import { Edit2, Trash2, X, Check, Globe, Star } from 'lucide-react';
import {
  getReactionIconComponent,
  getReactionLabel,
  REACTION_DEFINITIONS,
} from '../design-system/icons/Reaction3DIcons';
import { CommentSection } from './CommentSection';
import { ShareModal } from './ShareModal';
import { ReactionsListModal } from './ReactionsListModal';
import { ReportModal } from './ReportModal';
import { playReactionSound } from '../utils/reactionSounds';
import {
  IconReactionLove,
  IconReactionFire,
  IconReactionGem,
  IconReactionCelebrate,
  IconReactionMindblown,
  IconReactionHeartbreak,
  IconMessages,
  IconCoin,
  IconSparkles,
  IconCheck,
  IconShieldAlert,
} from '../design-system/icons/OriginalIcons';

interface PostCardProps {
  post: Post;
  onOpenGiftModal: (postId: string, receiverId: string, commentId?: string, receiverName?: string) => void;
  onPostUpdated: () => void;
  onHashtagClick?: (tag: string) => void;
  onHidePost?: (postId: string) => void;
  onNavigateToProfile?: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenGiftModal,
  onPostUpdated,
  onHashtagClick,
  onHidePost,
  onNavigateToProfile,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const { t, language, translateContent, isBn } = useLanguage();

  // Content Translation State
  const [showOriginal, setShowOriginal] = useState(false);

  // Optimistic Reactions
  const [currentReaction, setCurrentReaction] = useState<string | undefined>(post.userReaction);
  const [reactionsCount, setReactionsCount] = useState(post.reactionsCount);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  const [isReactionsListOpen, setIsReactionsListOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const reactionPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Optimistic Comments
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Optimistic Bookmarking, Follow & Interest
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
  const [isAuthorFollowed, setIsAuthorFollowed] = useState(Boolean(post.isAuthorFollowed));
  const [isInterested, setIsInterested] = useState<boolean>(post.userReaction === 'interested');
  const [interestedCount, setInterestedCount] = useState<number>(post.reactionsCount?.interested || 0);

  // Fullscreen Image Lightbox
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const getPostFontSizeClass = (size?: string) => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base sm:text-lg font-semibold';
      case 'xl':
        return 'text-lg sm:text-xl font-bold';
      case '2xl':
        return 'text-xl sm:text-2xl font-black';
      default:
        return 'text-xs sm:text-sm font-medium';
    }
  };

  const handleToggleInterest = async () => {
    if (!token) {
      addToast(isBn ? 'আগ্রহ প্রকাশ করতে লগইন করুন' : 'Please log in to express interest', 'warning');
      return;
    }
    const nextInterested = !isInterested;
    setIsInterested(nextInterested);
    setInterestedCount((prev) => (nextInterested ? prev + 1 : Math.max(0, prev - 1)));
    playReactionSound('interested');

    addToast(
      nextInterested
        ? (isBn ? '✨ আপনি এই পোস্টে আগ্রহ প্রকাশ করেছেন' : '✨ Marked as Interested')
        : (isBn ? 'আগ্রহ প্রত্যাহার করা হয়েছে' : 'Interest removed'),
      'info'
    );

    try {
      await fetch(`/api/posts/${post.id}/interest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Failed to toggle interest:', e);
    }
  };

  // Poll
  const [pollData, setPollData] = useState(post.pollData);
  const [isVoting, setIsVoting] = useState(false);

  // Audio Playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Actions Dropdown & Modals
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  // Edit Post State
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [editPrivacy, setEditPrivacy] = useState<string>(post.privacy || 'public');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Properly re-render and initialize input state upon opening the edit modal
  useEffect(() => {
    if (isEditingPost) {
      setEditContent(post.content || '');
      setEditPrivacy(post.privacy || 'public');
    }
  }, [isEditingPost, post.content, post.privacy]);

  // Auto-dismiss actions menu and reaction picker on outside click OR scroll
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node) &&
        actionsButtonRef.current &&
        !actionsButtonRef.current.contains(event.target as Node)
      ) {
        setIsActionsOpen(false);
      }
      setIsReactionPickerOpen(false);
    };

    const handleScroll = () => {
      setIsActionsOpen(false);
      setIsReactionPickerOpen(false);
    };

    if (isActionsOpen || isReactionPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isActionsOpen, isReactionPickerOpen]);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Save Edit Post Handler
  const handleSaveEdit = async () => {
    if (!token) {
      addToast(language === 'bn' ? 'পোস্ট এডিট করতে লগইন করুন' : 'Please sign in to edit posts', 'error');
      return;
    }
    if (!editContent.trim()) {
      addToast(language === 'bn' ? 'পোস্টের টেক্সট খালি রাখা যাবে না' : 'Post content cannot be empty', 'warning');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editContent.trim(),
          privacyLevel: editPrivacy,
          privacy: editPrivacy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (language === 'bn' ? 'পোস্ট আপডেট করতে ব্যর্থ হয়েছে' : 'Failed to update post'));
      }
      addToast(language === 'bn' ? 'পোস্ট সফলভাবে আপডেট করা হয়েছে!' : 'Post updated successfully!', 'success');
      setIsEditingPost(false);
      if (data.post) {
        post.content = data.post.content || editContent.trim();
        post.privacy = data.post.privacy || editPrivacy;
      }
      onPostUpdated();
    } catch (err: any) {
      addToast(err.message || (language === 'bn' ? 'পোস্ট আপডেট করতে ব্যর্থ হয়েছে' : 'Failed to update post'), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Post Handler
  const handleDeletePost = async () => {
    if (!token) return;
    if (!window.confirm(language === 'bn' ? 'আপনি কি নিশ্চিত যে এই পোস্টটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this post?')) {
      return;
    }
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to delete post');
      addToast(language === 'bn' ? 'পোস্টটি মুছে ফেলা হয়েছে' : 'Post deleted successfully', 'info');
      setIsActionsOpen(false);
      onPostUpdated();
    } catch (err: any) {
      addToast(err.message || 'Error deleting post', 'error');
    }
  };

  // 1. Optimistic Reaction Handler with procedural sound
  const handleReact = async (type: ReactionType) => {
    if (!token) {
      addToast('Please sign in to react to posts', 'info');
      return;
    }
    setIsReactionPickerOpen(false);
    playReactionSound(type);

    // Optimistic calculation
    const prevReaction = currentReaction;
    const prevCounts = { ...reactionsCount };

    const newCounts = { ...reactionsCount };
    if (prevReaction) {
      (newCounts as any)[prevReaction] = Math.max(0, ((newCounts as any)[prevReaction] || 1) - 1);
      newCounts.total = Math.max(0, newCounts.total - 1);
    }

    if (prevReaction === type) {
      setCurrentReaction(undefined);
    } else {
      setCurrentReaction(type);
      (newCounts as any)[type] = ((newCounts as any)[type] || 0) + 1;
      newCounts.total += 1;
    }
    setReactionsCount(newCounts);

    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.post) {
          setCurrentReaction(data.post.userReaction);
          setReactionsCount(data.post.reactionsCount);
        }
      } else {
        // Rollback
        setCurrentReaction(prevReaction);
        setReactionsCount(prevCounts);
      }
    } catch (e) {
      // Rollback
      setCurrentReaction(prevReaction);
      setReactionsCount(prevCounts);
    }
  };

  const handleReactionPressStart = () => {
    reactionPressTimer.current = setTimeout(() => {
      setIsReactionPickerOpen(true);
    }, 320);
  };

  const handleReactionPressEnd = () => {
    if (reactionPressTimer.current) {
      clearTimeout(reactionPressTimer.current);
      reactionPressTimer.current = null;
    }
  };

  const handleReactionClick = () => {
    if (currentReaction) {
      handleReact(currentReaction as ReactionType);
    } else {
      handleReact('like');
    }
  };

  // 2. Poll Vote Handler
  const handleVotePoll = async (optionId: string) => {
    if (!token) {
      addToast('Sign in to cast your vote', 'info');
      return;
    }
    if (isVoting) return;

    setIsVoting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/poll/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPollData(data.post.pollData);
        addToast('Vote registered in poll! 📊', 'success');
      }
    } catch (e) {
      addToast('Failed to cast vote', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  // 3. Toggle Comments
  const handleToggleComments = () => {
    setShowComments((prev) => !prev);
  };

  // 4. Follow / Unfollow Author
  const handleToggleFollow = async () => {
    if (!token) {
      addToast('Please sign in to follow creators', 'info');
      return;
    }
    const nextFollow = !isAuthorFollowed;
    setIsAuthorFollowed(nextFollow);
    setIsActionsOpen(false);

    try {
      const res = await fetch(`/api/users/${post.author.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(nextFollow ? `Now following @${post.author.username}` : `Unfollowed @${post.author.username}`, 'info');
      } else {
        setIsAuthorFollowed(!nextFollow);
      }
    } catch (e) {
      setIsAuthorFollowed(!nextFollow);
    }
  };

  // 5. Bookmark Toggle
  const handleToggleBookmark = async () => {
    if (!token) {
      addToast('Please sign in to save transmissions', 'info');
      return;
    }
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    setIsActionsOpen(false);

    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast(nextState ? 'Transmission saved to collection 🔖' : 'Removed from saved items', 'info');
      } else {
        setIsBookmarked(!nextState);
      }
    } catch (e) {
      setIsBookmarked(!nextState);
    }
  };

  // 6. Hide Post
  const handleHidePost = async () => {
    if (!token) return;
    setIsActionsOpen(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/hide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('Transmission hidden from your feed', 'info');
        if (onHidePost) onHidePost(post.id);
        else onPostUpdated();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Copy Link
  const handleCopyLink = () => {
    setIsActionsOpen(false);
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    addToast('Transmission link copied to clipboard! 📋', 'success');
  };

  // 8. Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });
      if (res.ok) {
        addToast('Report submitted for moderator review. Thank you.', 'info');
        setIsReportModalOpen(false);
        setReportDetails('');
      }
    } catch (e) {
      addToast('Failed to submit report', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Audio Playback handler
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Parse Hashtags in Content
  const renderFormattedContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            onClick={() => onHashtagClick && onHashtagClick(part.substring(1))}
            className="text-cyan-500 hover:text-cyan-400 font-semibold cursor-pointer transition-colors"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="text-violet-500 hover:text-violet-400 font-medium cursor-pointer transition-colors"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <GlassCard level={2} variant="frosted" specularEdge={true} className="p-4 sm:p-5 space-y-3.5 relative overflow-visible">
      {/* Top Bar: Author, Metadata & Action Controls */}
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => onNavigateToProfile && onNavigateToProfile(post.author.id)}
          className="flex items-center gap-3 min-w-0 cursor-pointer group/author"
        >
          <img
            src={
              post.author.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={post.author.fullName}
            className="w-10 h-10 rounded-full object-cover border border-cyan-400/40 shrink-0 group-hover/author:border-cyan-400 group-hover/author:scale-105 transition-all"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover/author:text-cyan-500 transition-colors">
                {post.author.fullName}
              </span>
              {post.author.isVerified && (
                <span className="text-[10px] text-cyan-400 font-semibold">✓</span>
              )}
              {post.author.badge && (
                <span className="text-[10px] text-slate-400 font-medium">· {post.author.badge}</span>
              )}
            </div>

            {/* Zero-Pill Unboxed Metadata Header */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1 flex-wrap">
              <span className="group-hover/author:underline">@{post.author.username}</span>
              <span>·</span>
              <span>
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>

              {post.feeling && (
                <>
                  <span>·</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                    {translateContent(post.feeling.label)}
                  </span>
                </>
              )}

              {post.location && (
                <>
                  <span>·</span>
                  <span className="text-violet-600 dark:text-violet-400 font-medium">
                    📍 {translateContent(post.location)}
                  </span>
                </>
              )}

              {post.scheduledFor && (
                <>
                  <span>·</span>
                  <span className="text-amber-500 font-medium">⏱️ {isBn ? 'শিডিউলড' : 'Scheduled'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Right Quick Actions & 3-Dot Dropdown */}
        <div className="relative flex items-center gap-1.5 shrink-0">
          {user && user.id !== post.author.id && (
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                isAuthorFollowed
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                  : 'bg-black/5 dark:bg-white/10 hover:bg-cyan-500 hover:text-white text-slate-700 dark:text-slate-200'
              }`}
            >
              {isAuthorFollowed ? t('post.following', 'Following') : t('post.follow', '+ Follow')}
            </button>
          )}

          <button
            ref={actionsButtonRef}
            type="button"
            onClick={() => setIsActionsOpen(!isActionsOpen)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="More options"
          >
            •••
          </button>

          {/* Action Menu Dropdown */}
          {isActionsOpen && (
            <div ref={actionsMenuRef} className="absolute right-0 top-8 z-30 w-48 rounded-2xl p-1.5 liquid-glass-floating border border-black/10 dark:border-white/15 shadow-2xl space-y-0.5 text-xs">
              {/* Author / Admin Edit & Delete Actions */}
              {user && (String(user.id) === String(post.author.id) || user.role === 'admin') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsOpen(false);
                      setEditContent(post.content || '');
                      setEditPrivacy(post.privacy || 'public');
                      setIsEditingPost(true);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('post.edit', 'Edit Post')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-rose-500 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('post.delete', 'Delete Post')}</span>
                  </button>
                  <div className="border-t border-black/5 dark:border-white/10 my-1" />
                </>
              )}

              {/* Interest Toggle Option inside Options Menu */}
              <button
                type="button"
                onClick={() => {
                  setIsActionsOpen(false);
                  handleToggleInterest();
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center justify-between cursor-pointer font-medium transition-colors ${
                  isInterested
                    ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'hover:bg-cyan-500/15 text-slate-700 dark:text-slate-200 hover:text-cyan-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${isInterested ? 'fill-cyan-500 text-cyan-500' : 'text-slate-400'}`} />
                  <span>{isBn ? 'ইন্টারেস্ট (Interest)' : 'Express Interest'}</span>
                </div>
                {interestedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-500 font-bold">
                    {interestedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleBookmark}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 flex items-center gap-2 cursor-pointer"
              >
                <span>{isBookmarked ? `🔖 ${t('post.saved', 'Saved')}` : `🔖 ${t('post.save', 'Save Post')}`}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsActionsOpen(false);
                  setIsShareModalOpen(true);
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 flex items-center gap-2 cursor-pointer"
              >
                <span>🔁 {isBn ? 'শেয়ার' : 'Share'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 flex items-center gap-2 cursor-pointer"
              >
                <span>📋 {t('post.copyLink', 'Copy Link')}</span>
              </button>
              <button
                type="button"
                onClick={handleHidePost}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-amber-500/15 hover:text-amber-500 flex items-center gap-2 cursor-pointer"
              >
                <span>👁️ {t('post.hide', 'Hide Transmission')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsActionsOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-rose-500 flex items-center gap-2 cursor-pointer"
              >
                <span>🚩 {t('post.report', 'Report Post')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tagged Users Bar */}
      {post.taggedUsers && post.taggedUsers.length > 0 && (
        <div className="text-[11px] text-slate-400">
          with{' '}
          {post.taggedUsers.map((u, i) => (
            <span key={u.id}>
              <span className="text-cyan-500 font-semibold cursor-pointer">@{u.username}</span>
              {i < post.taggedUsers!.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Main Content Area (Optional Liquid Background for Pure Text Quotes) */}
      {post.content && (
        <div
          className={`rounded-2xl transition-all ${
            post.backgroundGradient
              ? 'p-6 sm:p-10 text-white text-base sm:text-xl font-extrabold shadow-xl text-center leading-relaxed min-h-[220px] sm:min-h-[280px] flex items-center justify-center border border-white/20 drop-shadow-md'
              : `${getPostFontSizeClass(post.fontSize)} text-slate-800 dark:text-slate-100 leading-relaxed`
          }`}
          style={{ background: post.backgroundGradient || undefined }}
        >
          {renderFormattedContent(showOriginal ? post.content : translateContent(post.content))}
        </div>
      )}

      {/* Content Translation Toggle Row */}
      {post.content && post.content.length > 5 && (
        <div className="-mt-1 pt-0.5 text-[11px] text-slate-400">
          <button
            type="button"
            onClick={() => setShowOriginal((prev) => !prev)}
            className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold cursor-pointer select-none transition-colors"
          >
            <Globe className="w-3 h-3 text-cyan-500" />
            <span>
              {showOriginal
                ? (isBn ? '🌐 বাংলায় অনুবাদ দেখুন' : '🌐 See Translation')
                : (isBn ? '🌐 মূল ইংরেজি লেখা দেখুন' : '🌐 See Original')}
            </span>
          </button>
        </div>
      )}

      {/* Media Type Renders */}

      {/* 1. Multiple Images & Single Image Gallery */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div
          className={`grid gap-2.5 rounded-2xl overflow-hidden ${
            post.mediaUrls.length === 1
              ? 'grid-cols-1'
              : post.mediaUrls.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {post.mediaUrls.map((url, i) => {
            const isVid = isVideoUrl(url, post.mediaType);
            if (isVid) {
              return (
                <div key={i} className="col-span-full rounded-2xl overflow-hidden bg-black/60 shadow-md">
                  <video src={url} controls className="w-full max-h-[500px] object-contain bg-black" />
                </div>
              );
            }
            return (
              <div
                key={i}
                onClick={() => setFullscreenImageUrl(url)}
                className={`relative overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer group transition-transform hover:scale-[1.005] ${
                  post.mediaUrls.length === 1 ? 'w-full flex items-center justify-center' : ''
                }`}
              >
                <img
                  src={url}
                  alt="Post attachment"
                  className={`w-full transition-transform duration-300 group-hover:scale-[1.02] ${
                    post.mediaUrls.length === 1
                      ? 'max-h-[600px] object-contain rounded-2xl'
                      : 'h-44 sm:h-52 object-cover rounded-xl'
                  }`}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
                    {language === 'bn' ? '🔍 ফুল স্ক্রিন এ দেখুন' : '🔍 View Full Size'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. GIF Render */}
      {post.gifUrl && (
        <div
          onClick={() => setFullscreenImageUrl(post.gifUrl || null)}
          className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/20 cursor-pointer group"
        >
          <img src={post.gifUrl} alt="GIF" className="w-full max-h-[500px] object-contain" />
        </div>
      )}

      {/* 3. Audio Player with Waveform */}
      {post.audioData && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-teal-500/10 border border-violet-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {post.audioData.title}
              </div>
              <div className="text-[11px] text-slate-400">{post.audioData.artist}</div>
            </div>
            <button
              type="button"
              onClick={toggleAudio}
              className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-cyan-500/30 transition-transform active:scale-95 cursor-pointer"
            >
              {isPlayingAudio ? '❚❚' : '▶'}
            </button>
          </div>

          <audio
            ref={audioRef}
            src={post.audioData.audioUrl}
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              setAudioProgress((audio.currentTime / audio.duration) * 100);
            }}
            onEnded={() => setIsPlayingAudio(false)}
          />

          {/* Simulated Waveform Visualizer */}
          <div className="flex items-end gap-1 h-8 pt-1">
            {(
              post.audioData.waveform || [
                30, 45, 70, 90, 80, 60, 40, 75, 95, 85, 65, 45, 30, 50, 80, 100, 70, 50,
              ]
            ).map((bar, idx) => {
              const isPast = (idx / 18) * 100 <= audioProgress;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPast ? 'bg-cyan-400' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  style={{ height: `${bar}%` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Rich Link Preview Card */}
      {post.linkPreview && (
        <a
          href={post.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-cyan-400/50 transition-all group"
        >
          {post.linkPreview.image && (
            <img
              src={post.linkPreview.image}
              alt=""
              className="w-full h-44 object-cover group-hover:scale-[1.01] transition-transform"
            />
          )}
          <div className="p-3.5 space-y-1">
            <div className="text-[10px] uppercase font-bold text-cyan-500 tracking-wider">
              {post.linkPreview.siteName}
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors">
              {post.linkPreview.title}
            </h4>
            {post.linkPreview.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {post.linkPreview.description}
              </p>
            )}
          </div>
        </a>
      )}

      {/* 5. Interactive Poll */}
      {pollData && (
        <div className="p-4 rounded-2xl border border-cyan-400/30 bg-cyan-500/5 space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-white">
            {pollData.question}
          </div>

          <div className="space-y-2">
            {pollData.options.map((opt) => {
              const totalVotes = pollData.totalVotes || 0;
              const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              const hasVotedThis = pollData.userVotedOptionId === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVotePoll(opt.id)}
                  disabled={isVoting}
                  className={`w-full text-left p-3 rounded-xl border relative overflow-hidden transition-all cursor-pointer ${
                    hasVotedThis
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                      : 'border-black/10 dark:border-white/10 hover:border-cyan-400/40 bg-white/40 dark:bg-black/20 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {/* Percentage Bar Filler */}
                  <div
                    className="absolute inset-y-0 left-0 bg-cyan-500/15 pointer-events-none transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      {hasVotedThis && <span className="text-cyan-500">✓</span>}
                      <span>{translateContent(opt.text)}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{percentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 text-right font-medium">
            {pollData.totalVotes} {isBn ? 'টি ভোট দেওয়া হয়েছে' : 'total votes cast'}
          </div>
        </div>
      )}

      {/* 6. Repost Nested Card */}
      {post.repostOf && (
        <div className="p-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-2.5">
          <div className="flex items-center gap-2">
            <img
              src={post.repostOf.author.avatarUrl}
              alt=""
              className="w-6 h-6 rounded-full object-cover border border-cyan-400/40"
            />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {post.repostOf.author.fullName}
            </span>
            <span className="text-[10px] text-slate-400">@{post.repostOf.author.username}</span>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300">
            {renderFormattedContent(translateContent(post.repostOf.content))}
          </div>

          {post.repostOf.mediaUrls && post.repostOf.mediaUrls.length > 0 && (
            <img
              src={post.repostOf.mediaUrls[0]}
              alt=""
              className="w-full max-h-48 object-cover rounded-xl"
            />
          )}
        </div>
      )}

      {/* Reaction Counts Ribbon with Click to View Modal & Top 3D Icons */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-slate-400">
        <button
          type="button"
          onClick={() => setIsReactionsListOpen(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
        >
          {reactionsCount.total > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="flex -space-x-1.5 items-center">
                {Object.entries(reactionsCount)
                  .filter(([k, v]) => k !== 'total' && typeof v === 'number' && v > 0)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 3)
                  .map(([type]) => {
                    const IconComp = getReactionIconComponent(type);
                    return (
                      <span key={type} className="inline-block drop-shadow-sm">
                        <IconComp size={16} />
                      </span>
                    );
                  })}
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {reactionsCount.total}
              </span>
            </div>
          ) : (
            <span>{isBn ? 'প্রথম রিঅ্যাক্ট করুন' : 'Be first to react'}</span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleComments}
            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {commentsCount} {isBn ? 'মন্তব্য' : 'comments'}
          </button>
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            {post.sharesCount} {isBn ? 'শেয়ার' : 'shares'}
          </button>
          {post.giftsReceivedCount ? (
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              <IconCoin size={12} /> {post.giftsReceivedCount} {isBn ? 'কয়েন' : 'coins'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Interactive Action Bar: React, Comment, Repost, Gift */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 relative">
        {/* Reaction Trigger with Animated ReactionPicker on Long-Press & Hover */}
        <div
          className="relative"
          onMouseEnter={() => setIsReactionPickerOpen(true)}
          onMouseLeave={() => setIsReactionPickerOpen(false)}
        >
          <button
            type="button"
            onMouseDown={handleReactionPressStart}
            onMouseUp={handleReactionPressEnd}
            onTouchStart={handleReactionPressStart}
            onTouchEnd={handleReactionPressEnd}
            onClick={handleReactionClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs font-semibold select-none ${
              currentReaction
                ? 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15'
                : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {currentReaction ? (
              <>
                {React.createElement(getReactionIconComponent(currentReaction), { size: 18 })}
              </>
            ) : (
              <>
                <IconSparkles size={14} />
                <span>{t('post.like', 'React')}</span>
              </>
            )}
          </button>

          <ReactionPicker
            isOpen={isReactionPickerOpen}
            onSelect={handleReact}
            onClose={() => setIsReactionPickerOpen(false)}
            currentReaction={currentReaction}
          />
        </div>

        {/* Comment button */}
        <button
          type="button"
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-xs font-semibold ${
            showComments
              ? 'text-cyan-500 bg-cyan-500/10'
              : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <IconMessages size={14} />
          <span>{t('post.comment', 'Comment')}</span>
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-xs font-semibold"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          <span>{isBn ? 'শেয়ার' : 'Share'}</span>
        </button>

        {/* Gift Button */}
        <button
          type="button"
          onClick={() => onOpenGiftModal(post.id, post.userId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all active:scale-95 cursor-pointer text-xs font-semibold"
        >
          <IconCoin size={14} />
          <span>{isBn ? 'গিফট' : 'Gift'}</span>
        </button>
      </div>

      {/* Advanced Nested Comments Section */}
      {showComments && (
        <CommentSection
          postId={post.id}
          isPostAuthor={user?.id === post.userId}
          onCommentsCountChange={(cnt) => setCommentsCount(cnt)}
          onOpenGiftModal={(pId, rId, cId, rName) => onOpenGiftModal(pId, rId, cId, rName)}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}

      {/* Share Modal (Feed, Story, Group, Page, Message, Copy Link) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
        onShareSuccess={(newShares) => onPostUpdated()}
      />

      {/* Reactions List Breakdown Modal */}
      <ReactionsListModal
        isOpen={isReactionsListOpen}
        onClose={() => setIsReactionsListOpen(false)}
        postId={post.id}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="post"
        targetId={post.id}
        targetTitle={post.content ? post.content.slice(0, 45) : 'Post Media'}
        targetAuthorName={post.author?.fullName || post.author?.username}
      />

      {/* Edit Post Modal (Escaped via createPortal with top-level z-index) */}
      <GlassModal
        isOpen={isEditingPost}
        onClose={() => setIsEditingPost(false)}
        title={language === 'bn' ? 'পোস্ট সম্পাদনা করুন' : 'Edit Post'}
        subtitle={language === 'bn' ? 'আপনার পোস্টের বিবরণ ও গোপনীয়তা হালনাগাদ করুন' : 'Update your transmission caption and privacy level'}
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <GlassButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsEditingPost(false)}
              className="px-5 py-2 font-bold cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </GlassButton>

            <GlassButton
              type="button"
              variant="primary"
              size="md"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editContent.trim()}
              className="px-6 py-2 font-bold shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              {isSavingEdit
                ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                : (language === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-4 pt-1 flex flex-col">
          {/* Post Author Preview */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={post.author.avatarUrl}
                alt={post.author.fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/40 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{post.author.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">@{post.author.username}</p>
              </div>
            </div>

            {/* Privacy Dropdown */}
            <div className="shrink-0">
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value)}
                className="bg-white dark:bg-slate-800 text-xs rounded-xl px-3 py-1.5 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer shadow-xs"
              >
                <option value="public">{language === 'bn' ? '🌍 পাবলিক (Public)' : '🌍 Public'}</option>
                <option value="friends">{language === 'bn' ? '👥 বন্ধুরা (Friends)' : '👥 Friends Only'}</option>
                <option value="only_me">{language === 'bn' ? '🔒 শুধুমাত্র আমি (Only Me)' : '🔒 Only Me'}</option>
              </select>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all bg-white dark:bg-[#070b16]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={language === 'bn' ? 'আপনার পোস্টের নতুন বার্তা লিখুন...' : 'Write your updated transmission content...'}
                rows={5}
                className="w-full bg-transparent p-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none leading-relaxed"
                autoFocus
              />
            </div>
            <div className="flex justify-between items-center px-1 text-[11px] text-slate-400">
              <span>{language === 'bn' ? 'টেক্সট এডিট করুন' : 'Edit text content'}</span>
              <span>{editContent.length} chars</span>
            </div>
          </div>
        </div>
      </GlassModal>

      {/* Fullscreen Image Lightbox Modal */}
      <FullscreenImageModal
        isOpen={Boolean(fullscreenImageUrl)}
        imageUrl={fullscreenImageUrl}
        onClose={() => setFullscreenImageUrl(null)}
        title={post.author?.fullName ? `${post.author.fullName}'s Photo` : undefined}
      />
    </GlassCard>
  );
};
