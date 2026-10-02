import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Comment, ReactionType } from '../types';
import { ReactionPicker } from '../design-system/components/ReactionPicker';
import {
  getReactionIconComponent,
  getReactionLabel,
} from '../design-system/icons/Reaction3DIcons';
import {
  IconVerifiedBadge,
  IconMoreHorizontal,
} from '../design-system/icons/OriginalIcons';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isPostAuthor?: boolean;
  postId: string;
  depth?: number;
  onReply: (parentId: string, parentAuthorUsername: string) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onReact: (commentId: string, type: ReactionType) => Promise<void>;
  onPin: (commentId: string) => Promise<void>;
  onReport: (commentId: string) => void;
  onFollowToggle?: (userId: string, isFollowing: boolean) => void;
  onGift?: (commentId: string, authorId: string, authorName: string) => void;
  onNavigateToProfile?: (userId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  isPostAuthor,
  postId,
  depth = 0,
  onReply,
  onDelete,
  onEdit,
  onReact,
  onPin,
  onReport,
  onFollowToggle,
  onGift,
  onNavigateToProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [isFollowing, setIsFollowing] = useState(Boolean(comment.isAuthorFollowed));
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const isAuthor = currentUserId === comment.userId;
  const canPin = isPostAuthor;
  const canDelete = isAuthor || isPostAuthor;

  const handleFollowClick = async () => {
    if (!currentUserId || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/users/${comment.userId}/follow`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const nextFollowing = Boolean(data.isFollowing);
        setIsFollowing(nextFollowing);
        if (onFollowToggle) onFollowToggle(comment.userId, nextFollowing);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      await onEdit(comment.id, editContent);
      setIsEditing(false);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleReactionPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowReactionPicker(true);
    }, 320);
  };

  const handleReactionPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleReactionClick = () => {
    // If already has reaction, clicking toggles it; or if none, applies default 'like'
    if (comment.userReaction) {
      onReact(comment.id, comment.userReaction);
    } else {
      onReact(comment.id, 'like');
    }
  };

  // Helper to render mentions nicely
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <a
            key={index}
            href={`/profile/${username}`}
            className="font-semibold text-cyan-500 hover:text-cyan-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const CurrentReactionIcon = getReactionIconComponent(comment.userReaction || 'like');

  return (
    <div className={`relative ${depth > 0 ? 'ml-6 sm:ml-9 mt-3 border-l-2 border-slate-200/80 dark:border-white/10 pl-3 sm:pl-4' : 'mt-4'}`}>
      <div className="flex items-start gap-2.5 group">
        {/* Author Avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateToProfile && comment.author?.id) onNavigateToProfile(comment.author.id);
          }}
          className="shrink-0 relative cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img
            src={
              comment.author.avatarUrl ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.author.username)}`
            }
            alt={comment.author.username}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
          />
        </div>

        {/* Comment Body Glass Card */}
        <div className="flex-1 min-w-0">
          <div className="relative p-3 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
            {/* Pinned Badge */}
            {comment.isPinned && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mb-1.5 pb-1 border-b border-amber-500/20">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4H17V2H7V4H8V12L5 15V17H11V22L12 23L13 22V17H19V15L16 12Z" />
                </svg>
                <span>Pinned Comment</span>
              </div>
            )}

            {/* Author Header & Follow Button */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToProfile && comment.author?.id) onNavigateToProfile(comment.author.id);
                  }}
                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors truncate cursor-pointer"
                >
                  {comment.author.fullName}
                </button>

                {comment.author.isVerified && (
                  <IconVerifiedBadge size={13} className="text-cyan-400 shrink-0" />
                )}

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToProfile && comment.author?.id) onNavigateToProfile(comment.author.id);
                  }}
                  className="text-[11px] text-slate-400 hover:text-cyan-500 transition-colors cursor-pointer"
                >
                  @{comment.author.username}
                </span>

                {/* Follow / Unfollow button if viewing another user's comment */}
                {currentUserId && !isAuthor && (
                  <button
                    type="button"
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight transition-colors cursor-pointer ${
                      isFollowing
                        ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500 hover:text-white'
                    }`}
                  >
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                )}
              </div>

              {/* Options Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <IconMoreHorizontal size={15} />
                </button>

                {showOptions && (
                  <div
                    className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-30 py-1 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          onPin(comment.id);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <span>{comment.isPinned ? 'Unpin' : 'Pin to Top'}</span>
                      </button>
                    )}

                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          setIsEditing(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                      >
                        <span>Edit Comment</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          onDelete(comment.id);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                      >
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowOptions(false);
                        onReport(comment.id);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Report</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Text / Edit Input */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/20 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingEdit}
                    onClick={handleSaveEdit}
                    className="px-3 py-1 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                  {renderFormattedText(comment.content)}
                </p>

                {/* Gift Received Badge on Comment */}
                {((comment as any).coinsGifted > 0 || (comment as any).gift) && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-2 text-xs font-bold text-amber-500 shadow-xs">
                    <span className="text-base animate-bounce">🎁</span>
                    <span>
                      প্রাপ্ত গিফট: {(comment as any).gift?.name || '3D Gift'} (+{(comment as any).coinsGifted || (comment as any).gift?.coinPrice || 0} NIX - উইথড্রযোগ্য)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Attached Media Photo */}
            {comment.mediaUrl && (
              <div className="mt-2.5 rounded-xl overflow-hidden max-w-sm border border-slate-200 dark:border-white/10">
                <img
                  src={comment.mediaUrl}
                  alt="Comment attachment"
                  className="w-full max-h-64 object-cover cursor-pointer hover:scale-102 transition-transform"
                />
              </div>
            )}

            {/* Attached GIF */}
            {comment.gifUrl && (
              <div className="mt-2.5 rounded-xl overflow-hidden max-w-xs border border-slate-200 dark:border-white/10">
                <img
                  src={comment.gifUrl}
                  alt="GIF"
                  className="w-full max-h-52 object-cover"
                />
              </div>
            )}

            {/* Floating Reactions Pill if there are reactions */}
            {comment.reactionsCount > 0 && (
              <div className="absolute -bottom-2.5 right-2 px-2 py-0.5 rounded-full bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/15 shadow-md flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {/* Mini Top Reaction Icons */}
                {Object.keys(comment.reactionsBreakdown || {}).slice(0, 3).map((rType) => {
                  const Icon = getReactionIconComponent(rType);
                  return <Icon key={rType} size={14} className="inline-block" />;
                })}
                <span>{comment.reactionsCount}</span>
              </div>
            )}
          </div>

          {/* Action Footer: Like/React, Reply, Timestamp, Edited */}
          <div className="flex items-center gap-4 mt-1.5 px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {/* Reaction Trigger Button with Hover / Long Press Support */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={handleReactionPressStart}
                onMouseUp={handleReactionPressEnd}
                onTouchStart={handleReactionPressStart}
                onTouchEnd={handleReactionPressEnd}
                onMouseEnter={() => setShowReactionPicker(true)}
                onClick={handleReactionClick}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${
                  comment.userReaction
                    ? 'text-cyan-500 font-bold'
                    : 'hover:text-cyan-500 dark:hover:text-cyan-400'
                }`}
              >
                {comment.userReaction ? (
                  <>
                    <CurrentReactionIcon size={16} />
                  </>
                ) : (
                  <span>React</span>
                )}
              </button>

              {/* Reaction Picker Popup */}
              <div onMouseLeave={() => setShowReactionPicker(false)}>
                <ReactionPicker
                  isOpen={showReactionPicker}
                  onSelect={(type) => {
                    onReact(comment.id, type);
                    setShowReactionPicker(false);
                  }}
                  onClose={() => setShowReactionPicker(false)}
                  currentReaction={comment.userReaction}
                  align="left"
                />
              </div>
            </div>

            {/* Reply Trigger */}
            <button
              type="button"
              onClick={() => onReply(comment.id, comment.author.username)}
              className="hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Reply
            </button>

            {/* Gift Trigger Button */}
            {onGift && currentUserId !== comment.userId && (
              <button
                type="button"
                onClick={() => onGift(comment.id, comment.userId, comment.author.fullName || comment.author.username)}
                className="text-amber-500 hover:text-amber-400 font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                title="Send 3D Gift to Commenter"
              >
                <span>🎁 Gift</span>
              </button>
            )}

            {/* Timestamp */}
            <span className="text-[10px] text-slate-400">
              {new Date(comment.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {/* Edited tag */}
            {comment.isEdited && <span className="text-[10px] text-slate-400 italic">(edited)</span>}
          </div>

          {/* Toggle nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReplies(!showReplies)}
              className="mt-2 flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              <span>
                {showReplies
                  ? `Hide replies (${comment.replies.length})`
                  : `View replies (${comment.replies.length})`}
              </span>
            </button>
          )}

          {/* Nested Replies Rendering */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isPostAuthor={isPostAuthor}
                  postId={postId}
                  depth={depth + 1}
                  onReply={onReply}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onReact={onReact}
                  onPin={onPin}
                  onReport={onReport}
                  onFollowToggle={onFollowToggle}
                  onGift={onGift}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
