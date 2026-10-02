import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Flame,
  Laugh,
  Eye,
  Music,
  ExternalLink,
  AtSign,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  CheckCircle2,
  Lock,
  Globe,
  Users,
  Film,
} from 'lucide-react';
import { Story, StoryViewer } from '../types';
import { getApiBaseUrl } from '../services/nativeInit';
import { useAuth } from '../context/AuthContext';
import { CameraStoryModal } from './CameraStoryModal';
import { CreateReelModal } from './CreateReelModal';
import { IconCameraStory } from '../design-system/icons/OriginalIcons';
import { useToast } from '../design-system/ToastContext';

interface StoriesCarouselProps {
  onCreateStory?: () => void;
  onCreateFeels?: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const StoriesCarousel: React.FC<StoriesCarouselProps> = ({
  onCreateStory,
  onCreateFeels,
  onOpenProfile,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);

  // Playback timer & hold-to-pause
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reaction & Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [reactionBurst, setReactionBurst] = useState<string | null>(null);

  // Viewer drawer (author only)
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [viewersList, setViewersList] = useState<StoryViewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStories();

    // Socket.IO live listener
    const socket: Socket = io(getApiBaseUrl(), { transports: ['websocket', 'polling'] });
    socket.on('new_story', (newStory: Story) => {
      setStories((prev) => {
        if (prev.some((s) => s.id === newStory.id)) return prev;
        return [newStory, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Log view when active story changes
  useEffect(() => {
    if (activeStoryIndex !== null && stories[activeStoryIndex]) {
      const current = stories[activeStoryIndex];
      setProgress(0);
      setShowViewersDrawer(false);

      if (token) {
        fetch(`/api/stories/${current.id}/view`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [activeStoryIndex, token]);

  // Auto progression timer
  useEffect(() => {
    if (activeStoryIndex === null || !stories[activeStoryIndex] || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const currentStory = stories[activeStoryIndex];
    // Use 6 seconds for images/text, or duration of video if known
    const storyDurationMs = currentStory.storyType === 'video' ? 10000 : 5500;
    const intervalMs = 50;
    const step = (intervalMs / storyDurationMs) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timerRef.current);
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeStoryIndex, isPaused, stories]);

  // Navigation handlers
  const handlePrevStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      setProgress(0);
    }
  }, [activeStoryIndex]);

  const handleNextStory = useCallback(() => {
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      setProgress(0);
    } else {
      // Reached the end of stories
      setActiveStoryIndex(null);
      setProgress(0);
    }
  }, [activeStoryIndex, stories.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeStoryIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevStory();
      if (e.key === 'ArrowRight') handleNextStory();
      if (e.key === 'Escape') setActiveStoryIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStoryIndex, handlePrevStory, handleNextStory]);

  // Quick reaction
  const handleSendReaction = async (reaction: string) => {
    if (!token || activeStoryIndex === null || !stories[activeStoryIndex]) return;
    const currentStory = stories[activeStoryIndex];

    setReactionBurst(reaction);
    setTimeout(() => setReactionBurst(null), 1200);

    try {
      await fetch(`/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reactionType: reaction }),
      });

      // Update local state
      setStories((prev) =>
        prev.map((s) => {
          if (s.id !== currentStory.id) return s;
          const updatedCounts = { ...(s.reactionsCount || {}) };
          updatedCounts[reaction] = (updatedCounts[reaction] || 0) + 1;
          return { ...s, reactionsCount: updatedCounts, userReaction: reaction };
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Reply to story
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !replyText.trim() || activeStoryIndex === null || !stories[activeStoryIndex]) return;
    const currentStory = stories[activeStoryIndex];

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (res.ok) {
        addToast(`Reply sent to @${currentStory.author.username}`, 'success');
        setReplyText('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Vote on poll
  const handleVotePoll = async (optionId: string) => {
    if (!token || activeStoryIndex === null || !stories[activeStoryIndex]) return;
    const currentStory = stories[activeStoryIndex];

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/poll/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setStories((prev) =>
          prev.map((s) => (s.id === currentStory.id ? { ...s, poll: data.poll } : s))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load viewers list
  const handleOpenViewers = async () => {
    if (!token || activeStoryIndex === null || !stories[activeStoryIndex]) return;
    const currentStory = stories[activeStoryIndex];

    setShowViewersDrawer(true);
    setIsPaused(true);
    setLoadingViewers(true);

    try {
      const res = await fetch(`/api/stories/${currentStory.id}/viewers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setViewersList(data.viewers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Delete story
  const handleDeleteStory = async () => {
    if (!token || activeStoryIndex === null || !stories[activeStoryIndex]) return;
    const currentStory = stories[activeStoryIndex];

    try {
      const res = await fetch(`/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('Story deleted', 'info');
        setStories((prev) => prev.filter((s) => s.id !== currentStory.id));
        setActiveStoryIndex(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate 24-hour remaining string
  const formatTimeLeft = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h left`;
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins}m left`;
  };

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const isAuthor = Boolean(user && activeStory && activeStory.userId === user.id);

  return (
    <div className="mb-4 overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-3">
        {/* Split Add Story (Top 50%) + Create FEELS (Bottom 50%) Card */}
        {user && (
          <div className="shrink-0 w-24 sm:w-26 h-36 rounded-3xl border border-dashed border-cyan-500/40 bg-white/60 dark:bg-[#111728]/60 backdrop-blur-xl p-1 flex flex-col justify-between shadow-md select-none">
            {/* Top 50%: Add Story */}
            <button
              type="button"
              onClick={() => (onCreateStory ? onCreateStory() : setShowCameraModal(true))}
              className="w-full h-[calc(50%-2px)] flex flex-col items-center justify-center rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all cursor-pointer group p-1 active:scale-95"
              title="Add a 24h Story"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-xs group-hover:scale-110 transition-transform">
                <IconCameraStory size={14} />
              </div>
              <span className="text-[10px] font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                Add Story
              </span>
            </button>

            {/* Bottom 50%: Create FEELS (Reels) */}
            <button
              type="button"
              onClick={() => {
                if (onCreateFeels) {
                  onCreateFeels();
                } else {
                  setShowReelModal(true);
                }
              }}
              className="w-full h-[calc(50%-2px)] flex flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white hover:opacity-95 active:scale-95 transition-all cursor-pointer p-1 group shadow-md shadow-purple-500/20"
              title="Create FEELS / Reel Video"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-pink-100 group-hover:scale-110 transition-transform">
                <Film size={14} />
              </div>
              <span className="text-[10px] font-black tracking-tight text-white mt-0.5 leading-none">
                Create FEELS
              </span>
            </button>
          </div>
        )}

        {/* Stories List */}
        {stories.map((story, idx) => (
          <div
            key={story.id}
            onClick={() => setActiveStoryIndex(idx)}
            className={`shrink-0 w-22 h-36 relative rounded-3xl overflow-hidden p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-md group ${
              story.isViewed
                ? 'bg-slate-300 dark:bg-slate-700/60'
                : 'bg-gradient-to-tr from-cyan-400 via-teal-400 to-violet-500 shadow-cyan-500/20'
            }`}
          >
            <div className="w-full h-full rounded-[22px] overflow-hidden relative bg-slate-950">
              {story.storyType === 'text' || !story.mediaUrl ? (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    story.textStyle?.bgGradient || 'from-indigo-600 via-purple-600 to-pink-600'
                  } p-2 flex items-center justify-center text-center`}
                >
                  <p className="text-[10px] font-bold text-white line-clamp-4 leading-tight">
                    {story.textContent || 'Spark Story'}
                  </p>
                </div>
              ) : story.storyType === 'video' ? (
                <video
                  src={story.mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={story.mediaUrl}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              )}

              {/* Overlay author info & badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2 flex flex-col justify-between pointer-events-none">
                <div className="flex items-center justify-between">
                  <img
                    src={story.author.avatarUrl}
                    alt={story.author.fullName}
                    className="w-7 h-7 rounded-full object-cover border-2 border-cyan-400 shadow-sm"
                  />
                  {story.music && (
                    <span className="p-1 rounded-full bg-black/50 text-cyan-300">
                      <Music size={10} />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-white truncate block">
                    {story.author.fullName.split(' ')[0]}
                  </span>
                  <span className="text-[8px] text-cyan-300/80 font-mono block">
                    {formatTimeLeft(story.expiresAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- FULLSCREEN MODERN STORY VIEWER MODAL --- */}
      {activeStoryIndex !== null && activeStory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 select-none">
          {/* Close Button */}
          <button
            onClick={() => setActiveStoryIndex(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>

          {/* Desktop Left / Right Arrow Navigators */}
          <button
            onClick={handlePrevStory}
            disabled={activeStoryIndex === 0}
            className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={handleNextStory}
            disabled={activeStoryIndex === stories.length - 1}
            className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronRight size={24} />
          </button>

          {/* Center Story Canvas Container */}
          <div
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerCancel={() => setIsPaused(false)}
            className="relative w-full max-w-[380px] h-[640px] max-h-[92vh] rounded-[32px] overflow-hidden border border-white/20 flex flex-col justify-between p-4 bg-slate-950 shadow-2xl shadow-cyan-500/10"
          >
            {/* Tap areas for next/previous navigation */}
            <div
              onClick={handlePrevStory}
              className="absolute left-0 top-16 bottom-20 w-[35%] z-20 cursor-pointer"
            />
            <div
              onClick={handleNextStory}
              className="absolute right-0 top-16 bottom-20 w-[65%] z-20 cursor-pointer"
            />

            {/* Background Media */}
            {activeStory.storyType === 'text' ? (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  activeStory.textStyle?.bgGradient || 'from-violet-600 via-indigo-600 to-cyan-500'
                } flex items-center justify-center p-8 text-center`}
              >
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed drop-shadow-md">
                  {activeStory.textContent}
                </h2>
              </div>
            ) : activeStory.storyType === 'video' ? (
              <video
                ref={videoRef}
                src={activeStory.mediaUrl}
                autoPlay
                playsInline
                muted={isMuted}
                loop
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={activeStory.mediaUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/70 pointer-events-none" />

            {/* Floating Burst Reaction Particles Animation */}
            {reactionBurst && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-bounce text-6xl">
                {reactionBurst}
              </div>
            )}

            {/* TOP HEADER: Progress Segments & Author Info */}
            <div className="relative z-30 space-y-2.5">
              {/* Progress Bar Segments */}
              <div className="flex items-center gap-1.5 w-full">
                {stories.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-75"
                      style={{
                        width:
                          idx < activeStoryIndex
                            ? '100%'
                            : idx === activeStoryIndex
                            ? `${progress}%`
                            : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Author Row */}
              <div className="flex items-center justify-between">
                <div
                  onClick={() => onOpenProfile && onOpenProfile(activeStory.userId)}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-90"
                >
                  <img
                    src={activeStory.author.avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border-2 border-cyan-400"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-xs text-white drop-shadow">
                        {activeStory.author.fullName}
                      </p>
                      {activeStory.author.isVerified && (
                        <CheckCircle2 size={12} className="text-cyan-400 fill-cyan-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-300">
                      <span>@{activeStory.author.username}</span>
                      <span>·</span>
                      <span className="text-cyan-300 font-mono">
                        {formatTimeLeft(activeStory.expiresAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Privacy Badge */}
                  <span
                    className="p-1 rounded-full bg-black/40 text-slate-300 border border-white/10"
                    title={`Privacy: ${activeStory.privacy}`}
                  >
                    {activeStory.privacy === 'close_friends' ? (
                      <Lock size={12} className="text-emerald-400" />
                    ) : activeStory.privacy === 'friends' ? (
                      <Users size={12} className="text-cyan-400" />
                    ) : (
                      <Globe size={12} className="text-slate-300" />
                    )}
                  </span>

                  {/* Sound Toggle (for video stories) */}
                  {activeStory.storyType === 'video' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  )}

                  {/* Delete (if author) */}
                  {isAuthor && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStory();
                      }}
                      className="p-1.5 rounded-full bg-rose-500/30 text-rose-300 hover:bg-rose-500/50 cursor-pointer"
                      title="Delete Story"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* INTERACTIVE OVERLAYS: Music, Stickers, Poll, Link, Mentions */}
            <div className="relative z-30 my-auto space-y-3 pointer-events-auto">
              {/* Music Badge */}
              {activeStory.music && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/30 text-white w-fit shadow-lg">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center text-black">
                    <Music size={11} className="animate-spin" />
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">
                    <span className="text-cyan-300 truncate max-w-[160px] inline-block align-bottom">
                      {activeStory.music.title}
                    </span>
                    <span className="text-slate-400 text-[9px] block">
                      {activeStory.music.artist}
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Poll Sticker */}
              {activeStory.poll && (
                <div className="glass-card bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-3.5 space-y-2.5 max-w-[260px] shadow-2xl">
                  <p className="text-xs font-bold text-white text-center leading-snug">
                    {activeStory.poll.question}
                  </p>
                  <div className="space-y-1.5">
                    {activeStory.poll.options.map((opt) => {
                      const totalVotes = activeStory.poll?.totalVotes || 0;
                      const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                      const isUserVoted = activeStory.poll?.userVotedOptionId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleVotePoll(opt.id)}
                          className={`relative w-full h-8 rounded-xl overflow-hidden text-xs font-semibold px-3 flex items-center justify-between border transition-all cursor-pointer ${
                            isUserVoted
                              ? 'border-cyan-400 text-white'
                              : 'border-white/10 hover:border-cyan-400/50 text-slate-200'
                          }`}
                        >
                          {/* Percentage Fill Bar */}
                          <div
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                              isUserVoted ? 'bg-cyan-500/40' : 'bg-white/15'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                          <span className="relative z-10 truncate max-w-[180px]">{opt.text}</span>
                          <span className="relative z-10 font-mono text-[10px] text-cyan-300">
                            {pct}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[9px] text-slate-400 text-center font-mono">
                    {activeStory.poll.totalVotes} votes
                  </div>
                </div>
              )}

              {/* Link Sticker */}
              {activeStory.link && (
                <a
                  href={activeStory.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white text-xs font-bold w-fit shadow-lg shadow-cyan-500/30 transition-transform hover:scale-105"
                >
                  <ExternalLink size={13} />
                  <span>{activeStory.link.title || 'Visit Link'}</span>
                </a>
              )}

              {/* Mentions Sticker */}
              {activeStory.mentions && activeStory.mentions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeStory.mentions.map((m) => (
                    <button
                      key={m.userId}
                      onClick={() => onOpenProfile && onOpenProfile(m.userId)}
                      className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-400/40 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-500/20 cursor-pointer"
                    >
                      <AtSign size={11} />
                      <span>{m.username}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Stickers & Emojis */}
              {activeStory.stickers && activeStory.stickers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeStory.stickers.map((stk) => (
                    <span
                      key={stk.id}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-500/70 to-pink-500/70 text-white font-extrabold text-xs shadow-md border border-white/20 tracking-wide"
                    >
                      {stk.content}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* BOTTOM SECTION: Caption, Quick Reactions, Reply Input or Viewer Count */}
            <div className="relative z-30 space-y-2.5">
              {/* Caption */}
              {activeStory.caption && (
                <p className="text-xs text-white bg-black/60 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 leading-snug">
                  {activeStory.caption}
                </p>
              )}

              {/* Author vs Viewer Controls */}
              {isAuthor ? (
                /* Creator View: Open Audience Viewers Drawer */
                <div className="flex items-center justify-between p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                  <button
                    onClick={handleOpenViewers}
                    className="flex items-center gap-2 text-xs font-bold text-white hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <Eye size={16} className="text-cyan-400" />
                    <span>{activeStory.viewsCount || 0} Viewers</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Tap to see who watched</span>
                </div>
              ) : (
                /* Viewer View: Quick Reactions & Reply input */
                <div className="space-y-2">
                  {/* Quick Reactions Bar */}
                  <div className="flex items-center justify-between px-2">
                    {['❤️', '🔥', '😂', '😮', '😢', '👏'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        className={`text-xl hover:scale-125 active:scale-90 transition-transform p-1 cursor-pointer ${
                          activeStory.userReaction === emoji ? 'scale-115 drop-shadow-md' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Reply form */}
                  <form onSubmit={handleSendReply} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${activeStory.author.fullName.split(' ')[0]}...`}
                      className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer shadow-md transition-all"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* AUDIENCE VIEWERS SLIDE-UP DRAWER (Author Only) */}
            {showViewersDrawer && (
              <div className="absolute inset-x-0 bottom-0 top-24 z-40 bg-slate-900/95 backdrop-blur-2xl rounded-t-[28px] border-t border-white/20 p-4 flex flex-col justify-between shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">Story Viewers</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {viewersList.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewersDrawer(false);
                      setIsPaused(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Viewers List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 scrollbar-none">
                  {loadingViewers ? (
                    <div className="text-center text-xs text-slate-400 py-6">Loading viewers...</div>
                  ) : viewersList.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-6">
                      No viewers yet. Check back soon!
                    </div>
                  ) : (
                    viewersList.map((viewer) => (
                      <div
                        key={viewer.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={viewer.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-cyan-400/40"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{viewer.fullName}</p>
                            <p className="text-[10px] text-slate-400">@{viewer.username}</p>
                          </div>
                        </div>

                        {/* Reaction if viewer reacted */}
                        {viewer.reaction && (
                          <span className="text-lg">{viewer.reaction}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera & Story Creator Modal */}
      <CameraStoryModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onStoryCreated={fetchStories}
      />

      {/* FEELS / Reel Creator Modal */}
      <CreateReelModal
        isOpen={showReelModal}
        onClose={() => setShowReelModal(false)}
      />
    </div>
  );
};
