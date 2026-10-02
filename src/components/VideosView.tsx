import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Users,
  History,
  Search,
  Upload,
  Heart,
  Share2,
  Bookmark,
  Clock,
  Eye,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  Play,
  Filter,
} from 'lucide-react';
import { VideoItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../design-system/ToastContext';
import { GlassCard } from '../design-system/components/GlassCard';
import { GlassButton } from '../design-system/components/GlassButton';
import { GlassInput } from '../design-system/components/GlassInput';
import { IconVideos, IconCoin } from '../design-system/icons/OriginalIcons';
import { LiquidVideoPlayer } from './LiquidVideoPlayer';
import { AdMobBanner } from './ads/AdMobBanner';

interface VideosViewProps {
  onOpenGiftModal: (targetId: string, receiverId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({ onOpenGiftModal, onOpenProfile }) => {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  // Feed tabs: discovery | recommended | trending | following | history
  const [activeTab, setActiveTab] = useState<'discovery' | 'recommended' | 'trending' | 'following' | 'history'>('discovery');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active playing video ID (Lazy loading: only ONE video plays/loads at a time!)
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Upload Video Modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newCategory, setNewCategory] = useState('creative');
  const [newTags, setNewTags] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const categories = [
    { id: 'all', label: 'All Feeds' },
    { id: 'creative', label: 'Creative & 3D' },
    { id: 'music', label: 'Music & Synthesizer' },
    { id: 'tech', label: 'Tech & Shaders' },
    { id: 'gaming', label: 'Gaming & Metaverse' },
  ];

  // Fetch videos from backend
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'history') {
        if (!token) {
          setHistoryItems([]);
          setIsLoading(false);
          return;
        }
        const res = await fetch('/api/videos/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistoryItems(data.history || []);
        }
      } else {
        let url = `/api/videos/feed?tab=${activeTab}`;
        if (activeCategory !== 'all') url += `&category=${activeCategory}`;
        if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setVideos(data.videos || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, activeCategory, searchQuery, token]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Like video toggle
  const handleToggleLike = async (videoId: string) => {
    if (!token) {
      addToast('Please sign in to like videos', 'info');
      return;
    }
    try {
      const res = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId ? { ...v, isLiked: data.isLiked, likesCount: data.likesCount } : v
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Record watch view & progress
  const handleTimeUpdate = (videoId: string, currentTime: number, duration: number) => {
    // Only periodically report watch progress (e.g. after every 5 seconds)
    if (Math.floor(currentTime) % 5 === 0 && Math.floor(currentTime) > 0) {
      fetch(`/api/videos/${videoId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          watchDuration: 5,
          lastPosition: Math.round(currentTime),
          completed: currentTime >= duration - 2,
        }),
      }).catch(() => {});
    }
  };

  // Clear watch history
  const handleClearHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/videos/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHistoryItems([]);
        addToast('Watch history cleared', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Upload video
  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newVideoUrl.trim()) return;

    setIsPublishing(true);
    try {
      const tagsArray = newTags
        .split(/[,\s#]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle.trim() || 'Untitled Broadcast',
          caption: newCaption.trim(),
          videoUrl: newVideoUrl.trim(),
          thumbnailUrl: newThumbnailUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
          category: newCategory,
          tags: tagsArray,
          durationSeconds: 180,
          qualitySources: {
            '1080p': newVideoUrl.trim(),
            '720p': newVideoUrl.trim(),
            '480p': newVideoUrl.trim(),
          },
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewCaption('');
        setNewVideoUrl('');
        setNewThumbnailUrl('');
        setNewTags('');
        setShowUploadModal(false);
        fetchVideos();
        addToast('Video published successfully!', 'success');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  // Format seconds to mm:ss
  const formatDuration = (secs: number) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <GlassCard variant="surface" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <IconVideos size={22} className="text-cyan-500" />
              <span>Nixo Video Discovery</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adaptive high-definition video broadcasts, WebGL breakdowns, and audiovisual streams
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <GlassButton
                variant="primary"
                size="sm"
                leftIcon={<Upload size={14} />}
                onClick={() => setShowUploadModal(true)}
              >
                Upload Video
              </GlassButton>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/10 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'discovery'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Compass size={14} />
            <span>Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'recommended'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Recommended</span>
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp size={14} />
            <span>Trending</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('following')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'following'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Following</span>
            </button>
          )}

          {user && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              <History size={14} />
              <span>Watch History</span>
            </button>
          )}
        </div>

        {/* Search Bar & Category Filter (Only in Discovery Feed) */}
        {activeTab === 'discovery' && (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search videos by title, shaders, music, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="videos_feed_banner" variant="banner" className="my-3" />

      {/* --- WATCH HISTORY VIEW --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History size={16} className="text-cyan-400" />
              <span>Your Watch History</span>
            </h2>
            {historyItems.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading watch history...</div>
          ) : historyItems.length === 0 ? (
            <div className="glass-card p-10 text-center rounded-3xl space-y-2 border border-white/10">
              <p className="text-xs font-bold text-slate-300">No watch history yet</p>
              <p className="text-[11px] text-slate-400">Videos you watch will appear here to resume anytime.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <GlassCard
                  key={item.id}
                  variant="surface"
                  className="p-3 flex items-center gap-3.5 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-black shrink-0">
                    <img
                      src={item.video.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white font-bold">
                      {formatDuration(item.video.durationSeconds)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.video.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {item.video.author.fullName} · {item.video.viewsCount} views
                    </p>
                    <div className="text-[10px] text-cyan-400 font-semibold">
                      Watched: {item.lastPositionSeconds}s {item.completed ? '(Completed)' : ''}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- VIDEO FEED ITEMS --- */}
      {activeTab !== 'history' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-3xl space-y-2 border border-white/10">
              <Compass className="w-10 h-10 text-cyan-400 mx-auto opacity-80" />
              <p className="text-xs font-bold text-slate-200">No videos found</p>
              <p className="text-[11px] text-slate-400">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            videos.map((video) => {
              const isPlayingThis = activePlayingId === video.id;

              return (
                <GlassCard
                  key={video.id}
                  variant="surface"
                  className="overflow-hidden rounded-3xl border border-white/10 space-y-3"
                >
                  {/* Author Row */}
                  <div className="p-4 flex items-center justify-between pb-1">
                    <div
                      onClick={() => onOpenProfile && onOpenProfile(video.userId)}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-90"
                    >
                      <img
                        src={video.author.avatarUrl}
                        alt={video.author.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-cyan-400/50 shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                            {video.author.fullName}
                          </h3>
                          {video.author.isVerified && (
                            <CheckCircle2 size={12} className="text-cyan-400 fill-cyan-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">@{video.author.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <GlassButton
                        variant="glass"
                        size="sm"
                        leftIcon={<IconCoin size={14} className="text-amber-400" />}
                        onClick={() => onOpenGiftModal(video.id, video.userId)}
                      >
                        Tip Coins
                      </GlassButton>
                    </div>
                  </div>

                  {/* LAZY LOADED VIDEO PLAYER:
                      If not yet clicked to play, render optimized image poster with instant play overlay.
                      When clicked, mount LiquidVideoPlayer with quality selection and captions!
                  */}
                  <div className="relative bg-black w-full aspect-video max-h-[460px] overflow-hidden">
                    {isPlayingThis ? (
                      <LiquidVideoPlayer
                        src={video.videoUrl}
                        poster={video.thumbnailUrl}
                        title={video.title}
                        qualitySources={video.qualitySources}
                        captions={video.captions}
                        autoPlay={true}
                        onTimeUpdate={(curr, dur) => handleTimeUpdate(video.id, curr, dur)}
                        className="w-full h-full"
                      />
                    ) : (
                      <div
                        onClick={() => setActivePlayingId(video.id)}
                        className="relative w-full h-full cursor-pointer group"
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-cyan-500/90 group-hover:bg-cyan-400 text-white flex items-center justify-center shadow-xl shadow-cyan-500/40 group-hover:scale-110 transition-transform">
                            <Play size={28} className="ml-1 fill-white" />
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-white/20">
                          {formatDuration(video.durationSeconds)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title, Metadata & Action Row */}
                  <div className="p-4 pt-1 space-y-3">
                    <div className="space-y-1">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                        {video.title}
                      </h2>
                      {video.caption && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {video.caption}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {video.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-cyan-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-3 text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Eye size={14} className="text-cyan-400" />
                          <span>{video.viewsCount.toLocaleString()} views</span>
                        </span>
                        <span>·</span>
                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Like Button */}
                        <button
                          onClick={() => handleToggleLike(video.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                            video.isLiked
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Heart
                            size={14}
                            className={video.isLiked ? 'fill-rose-500 text-rose-500' : ''}
                          />
                          <span className="font-bold font-mono">{video.likesCount}</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                            addToast('Video link copied to clipboard!', 'success');
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
                          title="Share Video"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      )}

      {/* --- UPLOAD VIDEO MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload size={18} className="text-cyan-400" />
                <span>Upload Video Broadcast</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublishVideo} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Video Title</label>
                <GlassInput
                  placeholder="e.g. Deep Dive into WebGPU Compute Shaders"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Video Direct URL</label>
                <GlassInput
                  placeholder="https://... (.mp4, cloud storage, or hosted url)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Poster Thumbnail URL (Optional)</label>
                <GlassInput
                  placeholder="https://... image poster url"
                  value={newThumbnailUrl}
                  onChange={(e) => setNewThumbnailUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="creative" className="bg-slate-900 text-white">Creative & 3D</option>
                  <option value="music" className="bg-slate-900 text-white">Music & Synthesizer</option>
                  <option value="tech" className="bg-slate-900 text-white">Tech & Shaders</option>
                  <option value="gaming" className="bg-slate-900 text-white">Gaming & Metaverse</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tags (Comma or space separated)</label>
                <GlassInput
                  placeholder="WebGPU, Shaders, 3D, Design"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Provide an overview of your broadcast..."
                  className="w-full bg-white/5 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <GlassButton variant="ghost" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  type="submit"
                  disabled={!newVideoUrl.trim() || isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Broadcast'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
