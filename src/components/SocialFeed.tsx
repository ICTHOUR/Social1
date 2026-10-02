import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { PostCard } from './PostCard';
import { StoriesCarousel } from './StoriesCarousel';
import { LiveStreamModal } from './LiveStreamModal';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { PullToRefresh } from '../design-system/components/PullToRefresh';
import { SkeletonPost } from '../design-system/components/Skeleton';
import {
  IconRefresh,
  IconSparkles,
  IconPlus,
  IconShieldAlert,
} from '../design-system/icons/OriginalIcons';
import { AdSlot } from './ads/AdSlot';
import { AdMobBanner } from './ads/AdMobBanner';
import { AdBanner } from './ads/AdBanner';
import { getSocket } from '../services/socket';

interface SocialFeedProps {
  onOpenCreatePost: () => void;
  onOpenCreateStory: () => void;
  onOpenGiftModal: (postId: string, receiverId: string) => void;
  isSavedOnly?: boolean;
  onNavigateToProfile?: (userId: string) => void;
}

type FeedType = 'chronological' | 'recommended' | 'following';

export const SocialFeed: React.FC<SocialFeedProps> = ({
  onOpenCreatePost,
  onOpenCreateStory,
  onOpenGiftModal,
  isSavedOnly = false,
  onNavigateToProfile,
}) => {
  const { user, token } = useAuth();
  const { t, isBn } = useLanguage();
  const [feedType, setFeedType] = useState<FeedType>('chronological');
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(12);

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState<number>(0);

  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Fetch feed posts
  const fetchFeed = useCallback(
    async (targetPage = 1, isRefresh = false) => {
      if (targetPage === 1) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const queryParams = new URLSearchParams({
          feedType,
          page: targetPage.toString(),
          limit: '10',
        });
        if (activeHashtag) {
          queryParams.append('hashtag', activeHashtag);
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const endpoint = isSavedOnly && user
          ? `/api/users/${user.id}/saved`
          : `/api/posts?${queryParams.toString()}`;

        const res = await fetch(endpoint, { headers });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to load transmission feed');
        }

        const data = await res.json();
        const incomingPosts: Post[] = data.posts || [];
        const pagination = data.pagination || { hasMore: false };

        if (targetPage === 1) {
          setPosts(incomingPosts);
          setNewPostsAvailable(0);
        } else {
          setPosts((prev) => {
            // Deduplicate incoming
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = incomingPosts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...fresh];
          });
        }

        setPage(targetPage);
        setHasMore(pagination.hasMore);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error connecting to realm network');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [feedType, activeHashtag, token, isSavedOnly, user]
  );

  // Refetch when feedType or hashtag changes
  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  // Listen for local post creation events to prepend immediately
  useEffect(() => {
    const handleLocalPostCreated = (e: any) => {
      const newPost = e.detail;
      if (newPost && newPost.id) {
        setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
      } else {
        fetchFeed(1, true);
      }
    };

    window.addEventListener('nixo-post-created', handleLocalPostCreated);
    return () => window.removeEventListener('nixo-post-created', handleLocalPostCreated);
  }, [fetchFeed]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket(token, user?.id);

    const handleNewPost = (newPost: Post) => {
      if (feedType === 'chronological' && !activeHashtag) {
        setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
      } else {
        setNewPostsAvailable((prev) => prev + 1);
      }
    };

    const handlePostUpdated = (updatedPost: Post) => {
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    };

    socket.on('new_post', handleNewPost);
    socket.on('post_updated', handlePostUpdated);

    return () => {
      socket.off('new_post', handleNewPost);
      socket.off('post_updated', handlePostUpdated);
    };
  }, [feedType, activeHashtag, token, user?.id]);

  // Infinite scroll intersection observer with virtualization windowing
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (visibleLimit < posts.length) {
            setVisibleLimit((prev) => Math.min(prev + 10, posts.length));
          } else if (hasMore && !isLoadingMore) {
            fetchFeed(page + 1);
          }
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, page, fetchFeed, visibleLimit, posts.length]);

  const handleHidePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="space-y-4">
      {/* 24-Hour Stories Carousel */}
      <StoriesCarousel onCreateStory={onOpenCreateStory} onOpenProfile={onNavigateToProfile} />

      {/* Composer Quick Card */}
      <GlassCard
        level={2}
        variant="frosted"
        interactive={true}
        className="p-3.5 sm:p-4 space-y-3 cursor-pointer hover:border-cyan-400/40 transition-all duration-300"
        onClick={onOpenCreatePost}
      >
        <div className="flex items-center gap-3">
          <img
            src={
              user?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover border border-cyan-400/40 shrink-0 shadow-sm"
          />
          <div className="flex-1 px-4 py-2.5 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shadow-inner">
            {user
              ? (isBn ? `আপনার মনে কী চলছে, ${user.fullName.split(' ')[0]}?` : `What frequency are you tuning into, ${user.fullName.split(' ')[0]}?`)
              : (isBn ? 'আপনার নতুন ভাবনা বা আপডেট সবার সাথে শেয়ার করুন...' : 'Broadcast a thought, transmission, or poll to the realm...')}
          </div>
        </div>

        {/* Quick Media Action Shortcuts */}
        <div className="flex items-center justify-around pt-2 border-t border-black/5 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5 hover:text-cyan-500 transition-colors">
            📷 <span>{t('feed.photoVideo', 'Media')}</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
            📊 <span>{t('feed.poll', 'Poll')}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLiveModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 font-bold transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-full shadow-sm"
          >
            🔴 <span>{isBn ? 'লাইভ করুন' : 'Go Live'}</span>
          </button>
          <span className="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
            ✨ <span>{t('feed.feeling', 'Feeling')}</span>
          </span>
        </div>
      </GlassCard>

      {/* Feed Filter & Segment Tabs */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl liquid-glass-surface border border-black/5 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'chronological', label: t('feed.recent', 'Recent'), icon: '⏱️' },
            { id: 'recommended', label: t('feed.forYou', 'For You'), icon: '✨' },
            { id: 'following', label: t('feed.following', 'Following'), icon: '👥' },
          ] as const
        ).map((tTab) => (
          <button
            key={tTab.id}
            type="button"
            onClick={() => {
              setFeedType(tTab.id);
              setActiveHashtag(null);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              feedType === tTab.id && !activeHashtag
                ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/15 text-cyan-600 dark:text-cyan-400 shadow-sm border border-cyan-400/40 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>{tTab.icon}</span>
            <span>{tTab.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => fetchFeed(1, true)}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer px-2"
        title="Refresh Feed"
      >
        <span className={isLoading ? 'animate-spin' : ''}>
          <IconRefresh size={14} />
        </span>
      </button>
      </div>

      {/* Active Hashtag Filter Chip */}
      {activeHashtag && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-600 dark:text-cyan-400">
          <span>
            Filtering by tag: <strong className="font-bold">#{activeHashtag}</strong>
          </span>
          <button
            type="button"
            onClick={() => setActiveHashtag(null)}
            className="hover:text-rose-500 font-bold ml-2 cursor-pointer"
          >
            ✕ Clear
          </button>
        </div>
      )}
      {/* New Posts Live Alert Banner */}
      {newPostsAvailable > 0 && (
        <button
          type="button"
          onClick={() => fetchFeed(1)}
          className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-transform active:scale-98 cursor-pointer"
        >
          <IconSparkles size={14} />
          <span>{newPostsAvailable} new transmission{newPostsAvailable > 1 ? 's' : ''} available · Click to refresh</span>
        </button>
      )}

      {/* Transmission Post Cards with Pull-To-Refresh */}
      <PullToRefresh onRefresh={() => fetchFeed(1, true)}>
        <div className="space-y-4">
          {/* Skeletons on initial load */}
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonPost />
              <SkeletonPost />
              <SkeletonPost />
            </div>
          ) : error ? (
            /* Error State */
            <GlassCard variant="surface" className="p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <IconShieldAlert size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Unable to synchronise feed
              </h3>
              <p className="text-xs text-slate-400">{error}</p>
              <GlassButton variant="primary" size="sm" onClick={() => fetchFeed(1)}>
                Try Again
              </GlassButton>
            </GlassCard>
          ) : posts.length === 0 ? (
            /* Empty State */
            <GlassCard variant="surface" className="p-8 text-center space-y-3">
              <div className="text-3xl">🌌</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Quiet in this realm frequency
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeHashtag
                  ? `No transmissions matching #${activeHashtag} yet.`
                  : feedType === 'following'
                  ? 'None of your followed creators have posted recently. Explore the recommended feed!'
                  : 'Be the pioneer to publish the very first transmission in this sector.'}
              </p>
              <GlassButton variant="primary" size="sm" onClick={onOpenCreatePost}>
                Broadcast First Transmission
              </GlassButton>
            </GlassCard>
          ) : (
            /* Transmission Post Cards with Virtualization Windowing & CSS Content-Visibility */
            posts.slice(0, visibleLimit).map((post, index) => (
              <div key={post.id} style={{ contentVisibility: 'auto', containIntrinsicSize: '550px' }}>
                <PostCard
                  post={post}
                  onOpenGiftModal={onOpenGiftModal}
                  onPostUpdated={() => fetchFeed(page)}
                  onHashtagClick={(tag) => setActiveHashtag(tag)}
                  onHidePost={handleHidePost}
                  onNavigateToProfile={onNavigateToProfile}
                />
                {/* Dynamically served Google AdMob Banner Ad every two posts */}
                {(index + 1) % 2 === 0 && (
                  <div className="my-4 animate-in fade-in duration-300">
                    <AdBanner
                      placement={`feed_inline_admob_${index}`}
                      variant="feed"
                    />
                  </div>
                )}
              </div>
            ))
          )}
          {/* Infinite Scroll Trigger & Spinner */}
          <div ref={observerTargetRef} className="py-2 text-center">
            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-500 font-semibold py-3">
                <span className="animate-spin">
                  <IconRefresh size={16} />
                </span>
                <span>Streaming more transmissions...</span>
              </div>
            )}
            {!hasMore && posts.length > 0 && !isLoading && (
              <div className="text-center text-[11px] text-slate-400 py-4 font-medium">
                — You have caught up with all realm transmissions —
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <LiveStreamModal isOpen={isLiveModalOpen} onClose={() => setIsLiveModalOpen(false)} />
    </div>
  );
};
