import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Repeat,
  Bookmark,
  UserPlus,
  UserCheck,
  Gift,
  Music,
  Volume2,
  VolumeX,
  Plus,
  X,
  Send,
  Sparkles,
  Eye,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Compass,
  Film,
  Smartphone,
} from 'lucide-react';
import { Reel } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { GlassInput } from '../design-system/components/GlassInput';
import { GlassButton } from '../design-system/components/GlassButton';
import { AdMobBanner } from './ads/AdMobBanner';
import { AdBanner } from './ads/AdBanner';

interface ReelsViewerProps {
  onOpenGiftModal: (targetId: string, receiverId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
}

export const ReelsViewer: React.FC<ReelsViewerProps> = ({ onOpenGiftModal, onOpenProfile }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);

  // Interaction feedback states
  const [heartBurst, setHeartBurst] = useState(false);
  const [activeTab, setActiveTab] = useState<'for_you' | 'saved'>('for_you');

  // Comments slide drawer
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Create Reel Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newMusic, setNewMusic] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newHashtags, setNewHashtags] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // AdMob in Reels (Every reel has overlay ad + full screen interstitial)
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const swipeCountRef = useRef(0);

  // References
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartY = useRef<number>(0);

  // Fetch Reels with Lazy Loading & Filter
  const fetchReels = async (hashtagFilter?: string | null, tabFilter?: string) => {
    try {
      let url = '/api/reels?';
      if (hashtagFilter) url += `hashtag=${encodeURIComponent(hashtagFilter)}&`;
      if (tabFilter === 'saved') url += `tab=saved&`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReels(data.reels || []);
        setCurrentIndex(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReels(activeHashtag, activeTab);
  }, [activeHashtag, activeTab, token]);

  // Log view when current reel changes
  useEffect(() => {
    if (reels[currentIndex]) {
      const current = reels[currentIndex];
      fetch(`/api/reels/${current.id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ watchDuration: 5 }),
      }).catch(() => {});
    }
  }, [currentIndex, reels, token]);

  // Keyboard navigation for reels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments || showCreateModal) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrev();
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length, showComments, showCreateModal]);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      swipeCountRef.current += 1;
      if (swipeCountRef.current % 3 === 0) {
        setShowInterstitialAd(true);
      }
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, reels.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Touch Swipe for mobile vertical scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (deltaY > 60) {
      goToNext();
    } else if (deltaY < -60) {
      goToPrev();
    }
  };

  // Like / Heart toggle
  const handleToggleLike = async () => {
    if (!token || !reels[currentIndex]) {
      addToast('Please sign in to like reels', 'info');
      return;
    }
    const current = reels[currentIndex];
    const prevLiked = current.isLiked;

    if (!prevLiked) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 900);
    }

    try {
      const res = await fetch(`/api/reels/${current.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) =>
          prev.map((r) =>
            r.id === current.id ? { ...r, isLiked: data.isLiked, likesCount: data.likesCount } : r
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Repost toggle
  const handleToggleRepost = async () => {
    if (!token || !reels[currentIndex]) {
      addToast('Please sign in to repost', 'info');
      return;
    }
    const current = reels[currentIndex];
    try {
      const res = await fetch(`/api/reels/${current.id}/repost`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) =>
          prev.map((r) =>
            r.id === current.id ? { ...r, isReposted: data.isReposted, repostsCount: data.repostsCount } : r
          )
        );
        addToast(
          data.isReposted ? 'Reposted to your profile!' : 'Repost removed',
          'success'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save / Bookmark toggle
  const handleToggleSave = async () => {
    if (!token || !reels[currentIndex]) {
      addToast('Please sign in to save reels', 'info');
      return;
    }
    const current = reels[currentIndex];
    try {
      const res = await fetch(`/api/reels/${current.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) =>
          prev.map((r) => (r.id === current.id ? { ...r, isSaved: data.isSaved } : r))
        );
        addToast(
          data.isSaved ? 'Saved to your collection' : 'Removed from saved',
          'info'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Follow creator toggle
  const handleToggleFollow = async (creatorId: string) => {
    if (!token) {
      addToast('Please sign in to follow creators', 'info');
      return;
    }
    try {
      const res = await fetch(`/api/social/follow/${creatorId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) =>
          prev.map((r) =>
            r.userId === creatorId
              ? { ...r, author: { ...r.author, isFollowing: data.following } }
              : r
          )
        );
        addToast(
          data.following ? 'Following creator' : 'Unfollowed creator',
          'success'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Share Reel
  const handleShareReel = async () => {
    if (!reels[currentIndex]) return;
    const current = reels[currentIndex];
    const shareUrl = window.location.origin + `/reels#${current.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by ${current.author.fullName}`,
          text: current.caption,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      addToast('Link copied to clipboard!', 'success');
    } catch (e) {
      addToast('Share link: ' + shareUrl, 'info');
    }
  };

  // Open Comments Drawer
  const handleOpenComments = async () => {
    if (!reels[currentIndex]) return;
    const current = reels[currentIndex];
    setShowComments(true);
    setLoadingComments(true);

    try {
      const res = await fetch(`/api/reels/${current.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  // Submit Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !commentInput.trim() || !reels[currentIndex]) return;
    const current = reels[currentIndex];

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/reels/${current.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setReels((prev) =>
          prev.map((r) =>
            r.id === current.id ? { ...r, commentsCount: (r.commentsCount || 0) + 1 } : r
          )
        );
        setCommentInput('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Publish New Reel
  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl.trim() || !token) return;

    setIsPublishing(true);
    try {
      const parsedTags = newHashtags
        .split(/[,\s#]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: newVideoUrl.trim(),
          caption: newCaption.trim(),
          musicTitle: newMusic.trim() || 'Original Audio',
          musicArtist: newArtist.trim() || user?.fullName || 'Creator',
          hashtags: parsedTags,
        }),
      });

      if (res.ok) {
        setNewVideoUrl('');
        setNewCaption('');
        setNewMusic('');
        setNewArtist('');
        setNewHashtags('');
        setShowCreateModal(false);
        fetchReels();
        addToast('Feels published successfully!', 'success');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  if (reels.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center max-w-lg mx-auto my-8 border border-white/10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
          <Compass size={32} />
        </div>
        <h3 className="font-display font-bold text-lg text-white">No FEELS Found</h3>
        <p className="text-xs text-slate-300">
          {activeHashtag ? `No feels tagged with #${activeHashtag}.` : 'Be the first creator to share a vertical FEELS!'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {activeHashtag && (
            <button
              onClick={() => setActiveHashtag(null)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
            >
              Clear Filter
            </button>
          )}
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2 glass-button-primary rounded-full text-xs font-bold text-white shadow-lg cursor-pointer"
            >
              Upload Feels
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];
  const isOwnReel = Boolean(user && currentReel && currentReel.userId === user.id);

  return (
    <div className="max-w-md mx-auto relative h-[calc(100vh-6.5rem)] glass-card rounded-[36px] overflow-hidden border border-white/20 shadow-2xl flex flex-col justify-between my-2 bg-black select-none">
      {/* LAZY LOADED VIDEO STACK: Only the active reel video is rendered/playing to avoid network congestion */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleToggleLike}
        className="absolute inset-0 cursor-pointer"
      >
        <video
          ref={activeVideoRef}
          key={currentReel.id}
          src={currentReel.videoUrl}
          poster={currentReel.thumbnailUrl}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />

        {/* Shaded Backdrop Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/60 pointer-events-none" />

        {/* Double-Tap Heart Burst Animation */}
        {heartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
            <Heart size={90} className="fill-rose-500 text-rose-500 drop-shadow-2xl" />
          </div>
        )}
      </div>

      {/* TOP BAR: Filter Tabs & Audio Toggle */}
      <div className="relative z-20 p-4 flex items-center justify-between">
        {/* For You / Saved Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('for_you');
              setActiveHashtag(null);
            }}
            className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
              activeTab === 'for_you' && !activeHashtag
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            For You
          </button>
          {user && (
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Saved
            </button>
          )}
        </div>

        {/* Controls (Add Reel & Mute) */}
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-full bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-200 border border-cyan-400/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-lg"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Post</span>
            </button>
          )}

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-full bg-black/60 backdrop-blur-xl text-white hover:bg-black/80 border border-white/15 cursor-pointer transition-transform active:scale-95"
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} className="text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* HASHTAG PILL (If Active) */}
      {activeHashtag && (
        <div className="relative z-20 px-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/80 text-white text-xs font-bold backdrop-blur-md shadow-md">
            <span>#{activeHashtag}</span>
            <button onClick={() => setActiveHashtag(null)} className="cursor-pointer ml-1">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {/* GOOGLE ADMOB BANNER OVERLAY ON REELS */}
      <div className="relative z-20 px-3 sm:px-4 pb-1 pointer-events-auto">
        <AdBanner
          key={`admob_reel_overlay_${currentReel.id}`}
          variant="reels_overlay"
          placement={`reels_reel_${currentReel.id}`}
          className="mx-auto"
        />
      </div>

      {/* BOTTOM SECTION: Creator Info, Caption, Music & Floating Side Actions */}
      <div className="relative z-20 p-3 sm:p-4 flex items-end justify-between gap-3 pb-16 sm:pb-8">
        {/* Left: Author Info, Caption, Hashtags & Music Metadata */}
        <div className="flex-1 space-y-2 max-w-[calc(100%-68px)] sm:max-w-[75%]">
          {/* Creator Profile & Follow Button */}
          <div className="flex items-center gap-2.5">
            <div
              onClick={() => onOpenProfile && onOpenProfile(currentReel.userId)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-90"
            >
              <img
                src={currentReel.author.avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 shadow-md"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-white drop-shadow">
                    {currentReel.author.fullName}
                  </span>
                  {currentReel.author.isVerified && (
                    <CheckCircle2 size={12} className="text-cyan-400 fill-cyan-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-300">@{currentReel.author.username}</span>
              </div>
            </div>

            {/* Follow Button */}
            {!isOwnReel && user && (
              <button
                onClick={() => handleToggleFollow(currentReel.userId)}
                className={`ml-1 px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                  currentReel.author.isFollowing
                    ? 'bg-white/15 text-slate-200 border-white/20'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-400 shadow-md'
                }`}
              >
                {currentReel.author.isFollowing ? (
                  <>
                    <UserCheck size={11} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={11} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Caption */}
          {currentReel.caption && (
            <p className="text-xs text-slate-100 font-medium leading-snug drop-shadow line-clamp-3">
              {currentReel.caption}
            </p>
          )}

          {/* Hashtags */}
          {currentReel.hashtags && currentReel.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {currentReel.hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveHashtag(tag)}
                  className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Sound / Music Metadata Banner with Spinning Disc */}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-6 h-6 rounded-full bg-slate-900 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md">
              <Music size={11} className="animate-spin" />
            </div>
            <div className="text-[10px] text-slate-200 font-semibold truncate flex items-center gap-1.5">
              <span className="text-cyan-300 font-bold">{currentReel.musicTitle}</span>
              <span>·</span>
              <span className="text-slate-400">{currentReel.musicArtist}</span>
            </div>
          </div>
        </div>

        {/* Right: Floating Social Action Bar */}
        <div className="absolute right-2 sm:right-4 bottom-16 sm:bottom-20 z-30 flex flex-col items-center gap-2 sm:gap-2.5 max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-none py-1 pointer-events-auto">
          {/* Like */}
          <button
            onClick={handleToggleLike}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${
                currentReel.isLiked
                  ? 'bg-rose-500/30 border-rose-500 text-rose-400 scale-110 shadow-lg shadow-rose-500/20'
                  : 'bg-black/50 border-white/15 text-white hover:bg-black/70'
              }`}
            >
              <Heart
                size={20}
                className={currentReel.isLiked ? 'fill-rose-500 text-rose-500' : ''}
              />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow font-mono">
              {currentReel.likesCount || 0}
            </span>
          </button>

          {/* Comments */}
          <button
            onClick={handleOpenComments}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-xl transition-all">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow font-mono">
              {currentReel.commentsCount || 0}
            </span>
          </button>

          {/* Repost */}
          <button
            onClick={handleToggleRepost}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${
                currentReel.isReposted
                  ? 'bg-emerald-500/30 border-emerald-500 text-emerald-400 scale-110'
                  : 'bg-black/50 border-white/15 text-white hover:bg-black/70'
              }`}
            >
              <Repeat size={18} />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow font-mono">
              {currentReel.repostsCount || 0}
            </span>
          </button>

          {/* Save / Bookmark */}
          <button
            onClick={handleToggleSave}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${
                currentReel.isSaved
                  ? 'bg-amber-500/30 border-amber-500 text-amber-400 scale-110'
                  : 'bg-black/50 border-white/15 text-white hover:bg-black/70'
              }`}
            >
              <Bookmark
                size={18}
                className={currentReel.isSaved ? 'fill-amber-400 text-amber-400' : ''}
              />
            </div>
            <span className="text-[9px] font-bold text-slate-300 drop-shadow">
              {currentReel.isSaved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Gift Creator */}
          <button
            onClick={() => onOpenGiftModal(currentReel.id, currentReel.userId)}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-110 transition-transform">
              <Gift size={18} />
            </div>
            <span className="text-[9px] font-bold text-cyan-300 drop-shadow">Gift</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShareReel}
            className="flex flex-col items-center gap-0.5 group cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/70 border border-white/15 text-white flex items-center justify-center backdrop-blur-xl transition-all">
              <Share2 size={18} />
            </div>
            <span className="text-[9px] font-bold text-slate-300 drop-shadow">Share</span>
          </button>

          {/* Navigation Helpers (Up / Down) */}
          <div className="flex flex-col gap-1 pt-1">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="p-1 rounded-full bg-black/40 text-white disabled:opacity-20 hover:bg-black/70 cursor-pointer"
              title="Previous Feels (Up Arrow)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === reels.length - 1}
              className="p-1 rounded-full bg-black/40 text-white disabled:opacity-20 hover:bg-black/70 cursor-pointer"
              title="Next Feels (Down Arrow)"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- COMMENTS SLIDE-UP DRAWER --- */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 top-20 z-40 bg-slate-950/95 backdrop-blur-2xl rounded-t-[32px] border-t border-white/20 p-4 flex flex-col justify-between shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageCircle size={17} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Comments</h3>
              <span className="text-xs text-cyan-300 font-mono">({comments.length})</span>
            </div>
            <button
              onClick={() => setShowComments(false)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-none">
            {loadingComments ? (
              <div className="text-center text-xs text-slate-400 py-8">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                No comments yet. Start the conversation!
              </div>
            ) : (
              comments.map((comm) => (
                <div key={comm.id} className="flex gap-2.5 items-start">
                  <img
                    src={comm.user.avatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-cyan-400/40 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 bg-white/5 rounded-2xl p-2.5 border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{comm.user.fullName}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-snug">{comm.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Form */}
          <form onSubmit={handlePostComment} className="flex items-center gap-2 pt-2 border-t border-white/10">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={user ? "Add a comment..." : "Sign in to comment..."}
              disabled={!user || submittingComment}
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!user || !commentInput.trim() || submittingComment}
              className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer shadow-md"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* --- CREATE NEW REEL MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-cyan-400" />
                <span>Upload New Feels</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReel} className="space-y-3">
              {/* Direct Video File Upload or URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Video File (Direct Device Upload or URL)
                </label>
                <label className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-cyan-500/40 text-xs text-cyan-300 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Film size={15} />
                  <span>{newVideoUrl.startsWith('data:') ? '✓ Video File Selected' : 'Choose Video File From Device'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewVideoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <GlassInput
                  placeholder="Or enter Video URL (e.g. .mp4, mixkit, or cdn link)..."
                  value={newVideoUrl.startsWith('data:') ? '(Video file loaded from device)' : newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  required
                />
              </div>

              <GlassInput
                placeholder="Caption describing your Feels..."
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
              />

              {/* Music and Sound */}
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Music size={13} className="text-pink-400" />
                  <span>Music & Audio Track</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <GlassInput
                    placeholder="Sound Title (e.g. Synth Wave)"
                    value={newMusic}
                    onChange={(e) => setNewMusic(e.target.value)}
                  />
                  <GlassInput
                    placeholder="Sound Artist"
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                  />
                </div>
                {/* Preset Sound Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { title: 'Synth Wave', artist: 'Nixo Beats' },
                    { title: 'Chill Lo-Fi', artist: 'Breeze' },
                    { title: 'Summer Glow', artist: 'Solar Studio' },
                    { title: 'Deep Cyber Flow', artist: 'Neon Pulse' },
                  ].map((track, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewMusic(track.title);
                        setNewArtist(track.artist);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-[10px] font-medium cursor-pointer transition-colors"
                    >
                      🎵 {track.title}
                    </button>
                  ))}
                </div>
              </div>

              <GlassInput
                placeholder="Hashtags (e.g. LiquidGlass, DesignUI, Creative)"
                value={newHashtags}
                onChange={(e) => setNewHashtags(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  type="submit"
                  disabled={!newVideoUrl.trim() || isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Feels'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Fullscreen Google AdMob Interstitial Ad */}
      {showInterstitialAd && (
        <AdMobBanner
          variant="interstitial"
          placement={`reels_interstitial_${currentReel?.id || 'general'}`}
          onDismiss={() => setShowInterstitialAd(false)}
          onAdClosed={() => setShowInterstitialAd(false)}
        />
      )}
    </div>
  );
};
