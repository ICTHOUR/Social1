import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  TrendingUp,
  Search,
  CheckCircle2,
  Sparkles,
  Users,
  FileText,
  Hash,
  Video,
  Film,
  Calendar,
  Layers,
  Filter,
  ArrowUpDown,
  Clock,
  Flame,
  ExternalLink,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdMobBanner } from './ads/AdMobBanner';

export type SearchCategory =
  | 'all'
  | 'users'
  | 'posts'
  | 'hashtags'
  | 'videos'
  | 'reels'
  | 'groups'
  | 'pages'
  | 'events';

export type DateRangeFilter = 'all' | '24h' | '7d' | '30d' | 'year';
export type SortOrderFilter = 'relevance' | 'latest' | 'popular';

interface ExploreViewProps {
  searchQuery?: string;
  onNavigateToProfile?: (userId: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  searchQuery: initialSearchQuery = '',
  onNavigateToProfile,
  onSelectTag,
}) => {
  const { user, token } = useAuth();
  const [query, setQuery] = useState(initialSearchQuery);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOrderFilter>('relevance');
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Search Results
  const [searchResults, setSearchResults] = useState<{
    users: any[];
    posts: any[];
    hashtags: any[];
    videos: any[];
    reels: any[];
    groups: any[];
    pages: any[];
    events: any[];
    totalCount: number;
  }>({
    users: [],
    posts: [],
    hashtags: [],
    videos: [],
    reels: [],
    groups: [],
    pages: [],
    events: [],
    totalCount: 0,
  });

  // Discovery / Explore Feed
  const [exploreFeed, setExploreFeed] = useState<{
    trendingPosts: any[];
    trendingVideos: any[];
    popularCreators: any[];
    popularHashtags: any[];
    suggestedUsers: any[];
    suggestedGroups: any[];
    suggestedPages: any[];
  }>({
    trendingPosts: [],
    trendingVideos: [],
    popularCreators: [],
    popularHashtags: [],
    suggestedUsers: [],
    suggestedGroups: [],
    suggestedPages: [],
  });

  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Update internal query if parent props change
  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setQuery(initialSearchQuery);
      if (initialSearchQuery.trim()) {
        executeSearch(initialSearchQuery, 1, false);
      }
    }
  }, [initialSearchQuery]);

  // Fetch Personalized Explore data
  const fetchExploreFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/explore', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setExploreFeed(data);
      }
    } catch (e) {
      console.error('Failed to load explore feed:', e);
    }
  }, [token]);

  // Fetch Trending Queries and Recent Searches
  const fetchSearchMeta = useCallback(async () => {
    try {
      const [trendRes, recentRes] = await Promise.all([
        fetch('/api/search/trending-queries'),
        fetch('/api/search/recent', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      ]);
      if (trendRes.ok) {
        const tData = await trendRes.json();
        setTrendingSearches(tData.trending || []);
      }
      if (recentRes.ok) {
        const rData = await recentRes.json();
        setRecentSearches(rData.recent || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchExploreFeed();
    fetchSearchMeta();
  }, [fetchExploreFeed, fetchSearchMeta]);

  // Execute Search
  const executeSearch = async (
    targetQuery: string,
    targetPage = 1,
    append = false
  ) => {
    if (!targetQuery.trim()) {
      setSearchResults({
        users: [],
        posts: [],
        hashtags: [],
        videos: [],
        reels: [],
        groups: [],
        pages: [],
        events: [],
        totalCount: 0,
      });
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: targetQuery.trim(),
        category: activeCategory,
        dateRange,
        sortBy,
        isVerifiedOnly: isVerifiedOnly ? 'true' : 'false',
        page: targetPage.toString(),
        limit: '12',
      });

      const res = await fetch(`/api/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setHasMore(data.hasMore);
        setPage(targetPage);

        if (append) {
          setSearchResults((prev) => ({
            users: [...prev.users, ...(data.users || [])],
            posts: [...prev.posts, ...(data.posts || [])],
            hashtags: [...prev.hashtags, ...(data.hashtags || [])],
            videos: [...prev.videos, ...(data.videos || [])],
            reels: [...prev.reels, ...(data.reels || [])],
            groups: [...prev.groups, ...(data.groups || [])],
            pages: [...prev.pages, ...(data.pages || [])],
            events: [...prev.events, ...(data.events || [])],
            totalCount: data.totalCount || 0,
          }));
        } else {
          setSearchResults({
            users: data.users || [],
            posts: data.posts || [],
            hashtags: data.hashtags || [],
            videos: data.videos || [],
            reels: data.reels || [],
            groups: data.groups || [],
            pages: data.pages || [],
            events: data.events || [],
            totalCount: data.totalCount || 0,
          });
        }
      }
    } catch (e) {
      console.error('Search query failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, 1, false);
  };

  const handleCategoryChange = (cat: SearchCategory) => {
    setActiveCategory(cat);
  };

  // Re-run search when filters change if query exists
  useEffect(() => {
    if (query.trim()) {
      executeSearch(query, 1, false);
    }
  }, [activeCategory, dateRange, sortBy, isVerifiedOnly]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      executeSearch(query, page + 1, true);
    }
  };

  const handleTagClick = (tag: string) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setQuery(formatted);
    setActiveCategory('all');
    executeSearch(formatted, 1, false);
    if (onSelectTag) onSelectTag(tag);
  };

  const handleClearQuery = () => {
    setQuery('');
    setSearchResults({
      users: [],
      posts: [],
      hashtags: [],
      videos: [],
      reels: [],
      groups: [],
      pages: [],
      events: [],
      totalCount: 0,
    });
  };

  const categories: Array<{ id: SearchCategory; label: string; icon: any }> = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'reels', label: 'FEELS', icon: Film },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'pages', label: 'Pages', icon: Compass },
    { id: 'events', label: 'Events', icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-3">
      {/* 1. DISCOVERY & SEARCH BANNER */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-slate-950/80 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Compass className="w-3.5 h-3.5" /> Global Discovery & Multi-Entity Search
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                Explore the Nixo Universe
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Real-time trends, verified creators, posts, viral feels, community groups, and local events.
              </p>
            </div>

            <button
              onClick={() => {
                fetchExploreFeed();
                fetchSearchMeta();
              }}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
              title="Refresh Discovery"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-3xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-cyan-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across users, posts, hashtags, videos, feels, groups, pages, events..."
                className="w-full h-12 pl-12 pr-28 rounded-2xl bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 transition-all shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {query && (
                  <button
                    type="button"
                    onClick={handleClearQuery}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          {/* Trending Searches Quick Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Hot Searches:
            </span>
            {trendingSearches.slice(0, 6).map((item) => (
              <button
                key={item}
                onClick={() => handleTagClick(item)}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-medium cursor-pointer transition-all hover:scale-102"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TABS & FILTER TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-3 rounded-2xl border border-white/10 shadow-lg">
        {/* Entity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            showFilters || isVerifiedOnly || dateRange !== 'all' || sortBy !== 'relevance'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
              : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters {(isVerifiedOnly || dateRange !== 'all' || sortBy !== 'relevance') && '• Active'}</span>
        </button>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showFilters && (
        <div className="glass-card rounded-2xl p-4 border border-purple-500/20 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Date Range Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Any Time</option>
                <option value="24h">Past 24 Hours</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="year">Past Year</option>
              </select>
            </div>

            {/* Sort Order Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-purple-400" /> Sort Results By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOrderFilter)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="relevance">Most Relevant</option>
                <option value="latest">Latest First</option>
                <option value="popular">Most Popular & Engaged</option>
              </select>
            </div>

            {/* Verification Switch */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={isVerifiedOnly}
                  onChange={(e) => setIsVerifiedOnly(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Verified Accounts Only
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Google AdMob Sponsored Banner */}
      <AdMobBanner placement="explore_feed_banner" variant="compact" className="my-2" />

      {/* 3. CONDITIONAL DISPLAY: SEARCH RESULTS vs EXPLORE DISCOVERY */}
      {query.trim().length > 0 ? (
        /* ================= SEARCH RESULTS VIEW ================= */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" /> Results for "{query}"
              <span className="text-xs text-slate-400 font-normal">
                ({searchResults.totalCount} matches found)
              </span>
            </h2>
          </div>

          {/* 3.1 USERS RESULTS */}
          {(activeCategory === 'all' || activeCategory === 'users') && searchResults.users.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Creators & Members
                </h3>
                {activeCategory === 'all' && (
                  <button
                    onClick={() => setActiveCategory('users')}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5"
                  >
                    View all users <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {searchResults.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => onNavigateToProfile && onNavigateToProfile(u.id)}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 transition-all cursor-pointer hover:border-cyan-500/40"
                  >
                    <img
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-white/20"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-white truncate flex items-center gap-1">
                        {u.fullName}
                        {u.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                      <p className="text-[10px] text-slate-300 mt-1 line-clamp-1">{u.bio || 'Nixo creator'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.2 HASHTAGS RESULTS */}
          {(activeCategory === 'all' || activeCategory === 'hashtags') && searchResults.hashtags.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Trending Topics & Hashtags
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {searchResults.hashtags.map((h) => (
                  <div
                    key={h.tag}
                    onClick={() => handleTagClick(h.tag)}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer transition-all hover:scale-102"
                  >
                    <div>
                      <p className="font-bold text-xs text-white">#{h.tag}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {h.uniqueUsersCount || 1} unique creators • Velocity {h.velocity || 1.2}x
                      </p>
                    </div>
                    <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                      {h.postsCount} posts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.3 REELS RESULTS */}
          {(activeCategory === 'all' || activeCategory === 'reels') && searchResults.reels.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> Short FEELS & Viral Clips
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {searchResults.reels.map((r) => (
                  <div
                    key={r.id}
                    className="group relative rounded-2xl overflow-hidden aspect-[9/14] bg-slate-900 border border-white/10 hover:border-amber-400/50 transition-all cursor-pointer shadow-md"
                  >
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-purple-900/40 to-slate-950 flex items-center justify-center p-2 text-center text-xs text-white font-medium">
                        {r.caption}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                      <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{r.caption}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" /> {r.viewsCount || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-pink-400" /> {r.likesCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.4 POSTS RESULTS */}
          {(activeCategory === 'all' || activeCategory === 'posts') && searchResults.posts.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-4">
              <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Community Posts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.posts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <img
                          src={p.author?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-xs text-white flex items-center gap-1">
                            {p.author?.fullName}
                            {p.author?.isVerified && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                          </p>
                          <p className="text-[10px] text-slate-400">@{p.author?.username}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">{p.content}</p>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-cyan-400" /> {p.commentsCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="w-3.5 h-3.5 text-purple-400" /> {p.sharesCount || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3.5 GROUPS & PAGES & EVENTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Groups */}
            {(activeCategory === 'all' || activeCategory === 'groups') && searchResults.groups.length > 0 && (
              <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Groups
                </h3>
                <div className="space-y-2">
                  {searchResults.groups.map((g) => (
                    <div key={g.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <img src={g.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{g.name}</p>
                        <p className="text-[10px] text-slate-400">{g.membersCount} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pages */}
            {(activeCategory === 'all' || activeCategory === 'pages') && searchResults.pages.length > 0 && (
              <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
                <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Pages
                </h3>
                <div className="space-y-2">
                  {searchResults.pages.map((p) => (
                    <div key={p.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <img src={p.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate flex items-center gap-1">
                          {p.name} {p.isVerified && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                        </p>
                        <p className="text-[10px] text-slate-400">{p.category || 'Page'} • {p.followersCount} followers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events */}
            {(activeCategory === 'all' || activeCategory === 'events') && searchResults.events.length > 0 && (
              <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-lg space-y-3">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Events
                </h3>
                <div className="space-y-2">
                  {searchResults.events.map((e) => (
                    <div key={e.id} className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                        📅
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-white truncate">{e.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{e.location || 'Online'} • {e.attendeesCount} attendees</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pagination Load More */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition-all cursor-pointer"
              >
                {isLoading ? 'Loading more...' : 'Load More Results'}
              </button>
            </div>
          )}

          {/* Empty State */}
          {searchResults.totalCount === 0 && !isLoading && (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
              <Search className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="font-bold text-base text-white">No matches found for "{query}"</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try searching for a different keyword, creator username, hashtag topic, or adjust your active filters.
              </p>
              <button
                onClick={handleClearQuery}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer"
              >
                Return to Discovery
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ================= PERSONALIZED EXPLORE DISCOVERY FEED ================= */
        <div className="space-y-6">
          {/* 1. ANTI-SPAM RANKED TRENDING TOPICS */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-400" /> Real-Time Trending Topics
                </h3>
                <p className="text-[11px] text-slate-400">
                  Scored via multi-signal velocity, engagement, and anti-spam unique user verification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {(exploreFeed.popularHashtags || []).slice(0, 8).map((h, idx) => (
                <div
                  key={h.tag}
                  onClick={() => handleTagClick(h.tag)}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/30 flex flex-col justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-purple-400 group-hover:text-pink-400 transition-colors">
                      #{idx + 1} Trending
                    </span>
                    {h.badge ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                        {h.badge}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
                        {h.uniqueUsersCount || 3} creators
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors truncate">
                      #{h.tag}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {h.postsCount > 1000 ? `${(h.postsCount / 1000).toFixed(1)}K` : h.postsCount} posts • {h.velocity || 1.5}x velocity
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. TRENDING REELS & VIDEOS HORIZONTAL STRIP */}
          {exploreFeed.trendingVideos?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" /> Trending FEELS & Visual Clips
                </h3>
                <span className="text-xs text-amber-400/80 font-medium">Top views & shares</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {exploreFeed.trendingVideos.map((v) => (
                  <div
                    key={v.id}
                    className="group relative rounded-2xl overflow-hidden aspect-[9/15] bg-slate-900 border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer shadow-lg"
                  >
                    {v.thumbnailUrl ? (
                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-t from-purple-950 via-slate-900 to-black p-2 flex flex-col justify-end">
                        <p className="text-[11px] font-bold text-white line-clamp-2">{v.title}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                      <p className="text-xs font-bold text-white line-clamp-1">{v.title}</p>
                      <p className="text-[10px] text-slate-300">@{v.author?.username}</p>
                      <div className="flex items-center justify-between text-[10px] text-amber-300 mt-1">
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> {v.viewsCount || 100}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3 text-pink-400" /> {v.likesCount || 12}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. POPULAR CREATORS SPOTLIGHT */}
          {exploreFeed.popularCreators?.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Popular Creators & Storytellers
                </h3>
                <span className="text-xs text-slate-400">Recommended for you</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {exploreFeed.popularCreators.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onNavigateToProfile && onNavigateToProfile(c.id)}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-white/20 shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-white truncate flex items-center gap-1">
                        {c.fullName}
                        {c.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </p>
                      <p className="text-[10px] text-slate-400">@{c.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          {c.badge || 'Creator'}
                        </span>
                        <span className="text-[10px] text-slate-300">{c.followersCount} followers</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SUGGESTED COMMUNITIES & PAGES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Suggested Communities */}
            {exploreFeed.suggestedGroups?.length > 0 && (
              <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" /> Suggested Communities
                </h3>
                <div className="space-y-2.5">
                  {exploreFeed.suggestedGroups.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={g.avatarUrl} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                        <div className="truncate">
                          <p className="font-bold text-xs text-white truncate">{g.name}</p>
                          <p className="text-[10px] text-slate-400">{g.membersCount} members • {g.privacy}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer transition-colors">
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Creator & Brand Pages */}
            {exploreFeed.suggestedPages?.length > 0 && (
              <div className="glass-card rounded-3xl p-5 border border-white/10 shadow-xl space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" /> Featured Platform Pages
                </h3>
                <div className="space-y-2.5">
                  {exploreFeed.suggestedPages.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-2xl object-cover" />
                        <div className="truncate">
                          <p className="font-bold text-xs text-white truncate flex items-center gap-1">
                            {p.name} {p.isVerified && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                          </p>
                          <p className="text-[10px] text-slate-400">{p.category || 'Creator Page'} • {p.followersCount} followers</p>
                        </div>
                      </div>
                      <button className="px-3 py-1 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-bold cursor-pointer transition-colors">
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
