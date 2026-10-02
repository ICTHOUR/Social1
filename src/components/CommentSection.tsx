import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Comment, ReactionType, User } from '../types';
import { CommentItem } from './CommentItem';
import { GifPickerModal } from './GifPickerModal';
import { MentionDropdown } from './MentionDropdown';
import { ReportModal } from './ReportModal';
import {
  IconCameraStory,
  IconSend,
  IconSparkles,
} from '../design-system/icons/OriginalIcons';
import { playReactionSound } from '../utils/reactionSounds';

interface CommentSectionProps {
  postId: string;
  isPostAuthor?: boolean;
  onCommentsCountChange?: (count: number) => void;
  onOpenGiftModal?: (postId: string, receiverId: string, commentId?: string, receiverName?: string) => void;
  onNavigateToProfile?: (userId: string) => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  isPostAuthor,
  onCommentsCountChange,
  onOpenGiftModal,
  onNavigateToProfile,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // New comment input states
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<string | null>(null);
  const [attachedGif, setAttachedGif] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals & Mention
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Spam or unwanted advertising');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch current user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nixo_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch (e) {}
  }, []);

  // Fetch comments
  const loadComments = async () => {
    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        if (onCommentsCountChange && data.totalCount !== undefined) {
          onCommentsCountChange(data.totalCount);
        }
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  // Handle typing & @mention query detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);

    // Detect @ symbol at cursor
    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    const lastWordMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (lastWordMatch) {
      setMentionQuery(lastWordMatch[1]);
      setIsMentionOpen(true);
    } else {
      setIsMentionOpen(false);
    }
  };

  // Mention selection
  const handleSelectMention = (user: { username: string }) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);

    const replaced = textBeforeCursor.replace(/@[a-zA-Z0-9_]*$/, `@${user.username} `);
    setContent(replaced + textAfterCursor);
    setIsMentionOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Image attachment upload
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setAttachedMedia(loadEvt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit comment / reply
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !attachedMedia && !attachedGif) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('nixo_token');
      // Extract mentions
      const mentionsList: string[] = [];
      const mentionMatches = content.matchAll(/@([a-zA-Z0-9_]+)/g);
      for (const m of mentionMatches) {
        mentionsList.push(m[1]);
      }

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: content.trim(),
          parentId: replyingTo?.id || null,
          mediaUrl: attachedMedia,
          gifUrl: attachedGif,
          mentions: mentionsList,
        }),
      });

      if (res.ok) {
        // Play gentle interaction chime
        playReactionSound('like');
        setContent('');
        setAttachedMedia(null);
        setAttachedGif(null);
        setReplyingTo(null);
        await loadComments();
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // React to comment
  const handleReactToComment = async (commentId: string, type: ReactionType) => {
    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistically update comment reactions in state
        const updateRecursive = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.id === commentId) {
              return {
                ...c,
                userReaction: data.userReaction,
                reactionsCount: data.reactionsCount,
                reactionsBreakdown: data.reactionsBreakdown,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateRecursive(c.replies) };
            }
            return c;
          });
        };

        setComments(updateRecursive(comments));
      }
    } catch (err) {
      console.error('Comment reaction error:', err);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string, newContent: string) => {
    const token = localStorage.getItem('nixo_token');
    const res = await fetch(`/api/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (res.ok) {
      const updateRecursive = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: newContent, isEdited: true };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateRecursive(c.replies) };
          }
          return c;
        });
      };
      setComments(updateRecursive(comments));
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        // Remove from state
        const removeRecursive = (list: Comment[]): Comment[] => {
          return list
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies ? removeRecursive(c.replies) : [],
            }));
        };
        const updated = removeRecursive(comments);
        setComments(updated);
        if (onCommentsCountChange) onCommentsCountChange(Math.max(0, updated.length));
      }
    } catch (err) {
      console.error('Comment delete error:', err);
    }
  };

  // Pin comment
  const handlePinComment = async (commentId: string) => {
    try {
      const token = localStorage.getItem('nixo_token');
      const res = await fetch(`/api/comments/${commentId}/pin`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        // Unpin others and set this comment's pin status
        const updateRecursive = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            const isThis = c.id === commentId;
            return {
              ...c,
              isPinned: isThis ? data.isPinned : false,
              replies: c.replies ? updateRecursive(c.replies) : [],
            };
          });
        };

        const updated = updateRecursive(comments);
        // Sort pinned to top
        updated.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        setComments([...updated]);
      }
    } catch (err) {
      console.error('Comment pin error:', err);
    }
  };

  // Report submit
  const handleReportSubmit = async () => {
    if (!reportingCommentId) return;
    try {
      const token = localStorage.getItem('nixo_token');
      await fetch(`/api/comments/${reportingCommentId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: reportReason }),
      });
      setReportingCommentId(null);
    } catch (e) {
      console.error('Failed to report comment:', e);
    }
  };

  return (
    <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-4">
      {/* Comments List */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading discussion...</div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No responses yet. Be the first to initiate dialogue on this transmission!
          </div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUser?.id}
              isPostAuthor={isPostAuthor}
              postId={postId}
              onReply={(parentId, authorUsername) => {
                setReplyingTo({ id: parentId, username: authorUsername });
                textareaRef.current?.focus();
              }}
              onDelete={handleDeleteComment}
              onEdit={handleEditComment}
              onReact={handleReactToComment}
              onPin={handlePinComment}
              onReport={(commId) => setReportingCommentId(commId)}
              onGift={(commId, authorId, authorName) => {
                if (onOpenGiftModal) {
                  onOpenGiftModal(postId, authorId, commId, authorName);
                }
              }}
              onNavigateToProfile={onNavigateToProfile}
            />
          ))
        )}
      </div>

      {/* Composer Container */}
      <div className="relative pt-2">
        {/* Active Reply Banner */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center justify-between px-3 py-1.5 mb-2 bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 rounded-xl text-xs text-cyan-600 dark:text-cyan-400"
            >
              <div className="flex items-center gap-1.5 font-medium truncate">
                <span>Replying to</span>
                <span className="font-bold">@{replyingTo.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="hover:text-cyan-300 transition-colors p-0.5"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Attachments Preview */}
        {(attachedMedia || attachedGif) && (
          <div className="mb-2 relative inline-block">
            <div className="relative rounded-xl overflow-hidden max-w-xs border border-slate-200 dark:border-white/15 bg-slate-900 shadow-md">
              <img
                src={attachedMedia || attachedGif || ''}
                alt="Attachment preview"
                className="max-h-40 w-auto object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setAttachedMedia(null);
                  setAttachedGif(null);
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Input Field Form */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <div className="relative flex-1 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 focus-within:ring-2 focus-within:ring-cyan-500/50 transition-all">
            {/* Mention Autocomplete Dropdown */}
            <MentionDropdown
              query={mentionQuery}
              isOpen={isMentionOpen}
              onSelectUser={handleSelectMention}
              onClose={() => setIsMentionOpen(false)}
            />

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                replyingTo
                  ? `Write a reply to @${replyingTo.username}...`
                  : 'Transmit a thoughtful response... (@ to mention)'
              }
              rows={2}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none"
            />

            {/* Bottom Toolbar: Photo, GIF, Emojis */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/5">
              <div className="flex items-center gap-1">
                {/* Photo Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <IconCameraStory size={16} />
                </button>

                {/* GIF Button */}
                <button
                  type="button"
                  onClick={() => setIsGifModalOpen(true)}
                  title="Attach GIF"
                  className="px-1.5 py-0.5 rounded-lg text-[11px] font-black text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  GIF
                </button>

                {/* Quick Emoji Insert */}
                <div className="flex items-center gap-0.5 text-sm">
                  {['✨', '🔥', '🚀', '❤️', '👏'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setContent((prev) => prev + emoji)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (!content.trim() && !attachedMedia && !attachedGif)}
                className="w-8 h-8 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-md hover:shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <IconSend size={15} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* GIF Picker Modal */}
      <GifPickerModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        onSelectGif={(url) => {
          setAttachedGif(url);
          setAttachedMedia(null);
        }}
      />

      {/* Report Modal */}
      {reportingCommentId && (
        <ReportModal
          isOpen={Boolean(reportingCommentId)}
          onClose={() => setReportingCommentId(null)}
          targetType="comment"
          targetId={reportingCommentId}
          targetTitle="User Comment"
        />
      )}
    </div>
  );
};
