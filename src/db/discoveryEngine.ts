import { Database } from 'sql.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';

export interface TrendConfig {
  id: string;
  minUniqueUsers: number;
  timeWindowHours: number;
  weightEngagement: number;
  weightVelocity: number;
  weightUniqueUsers: number;
  weightViews: number;
  weightShares: number;
  recencyDecayHours: number;
  spamDetectionEnabled: boolean;
  maxPostsPerUserCounted: number;
  updatedAt: string;
}

export interface TrendingTopicItem {
  id: string;
  tag: string;
  postsCount: number;
  uniqueUsersCount: number;
  engagementScore: number;
  velocity: number;
  viewsCount: number;
  sharesCount: number;
  trendScore: number;
  recencyHours: number;
  isFeatured: boolean;
  isSpamSuspicious: boolean;
  badge?: string;
  sampleSnippet?: string;
}

export interface SearchFilterOptions {
  q: string;
  category?: 'all' | 'users' | 'posts' | 'hashtags' | 'videos' | 'reels' | 'groups' | 'pages' | 'events';
  dateRange?: 'all' | '24h' | '7d' | '30d' | 'year';
  sortBy?: 'relevance' | 'latest' | 'popular';
  isVerifiedOnly?: boolean;
  page?: number;
  limit?: number;
  currentUserId?: string;
}

export function ensureDiscoveryTables(db: Database) {
  // 1. Searches table for recent searches
  db.run(`
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      query TEXT NOT NULL,
      category TEXT DEFAULT 'all',
      searched_at TEXT NOT NULL
    );
  `);

  // 2. Blocked hashtags table
  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_hashtags (
      id TEXT PRIMARY KEY,
      hashtag TEXT UNIQUE NOT NULL,
      reason TEXT,
      blocked_by_user_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 3. Featured / Promoted trends table
  db.run(`
    CREATE TABLE IF NOT EXISTS featured_trends (
      id TEXT PRIMARY KEY,
      trend_type TEXT DEFAULT 'hashtag',
      target TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      badge TEXT DEFAULT 'Featured',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Removed / Hidden trends table
  db.run(`
    CREATE TABLE IF NOT EXISTS removed_trends (
      id TEXT PRIMARY KEY,
      trend_identifier TEXT UNIQUE NOT NULL,
      reason TEXT,
      removed_by_user_id TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Configurable Trend Engine Parameters
  db.run(`
    CREATE TABLE IF NOT EXISTS trend_config (
      id TEXT PRIMARY KEY,
      min_unique_users INTEGER DEFAULT 3,
      time_window_hours INTEGER DEFAULT 24,
      weight_engagement REAL DEFAULT 1.0,
      weight_velocity REAL DEFAULT 1.5,
      weight_unique_users REAL DEFAULT 2.0,
      weight_views REAL DEFAULT 0.2,
      weight_shares REAL DEFAULT 1.8,
      recency_decay_hours REAL DEFAULT 12.0,
      spam_detection_enabled INTEGER DEFAULT 1,
      max_posts_per_user_counted INTEGER DEFAULT 3,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default configuration if empty
  const existingConfig = queryDbOne(db, 'SELECT id FROM trend_config WHERE id = ?', ['global_trend_config']);
  if (!existingConfig) {
    db.run(
      `INSERT INTO trend_config (
        id, min_unique_users, time_window_hours, weight_engagement, weight_velocity,
        weight_unique_users, weight_views, weight_shares, recency_decay_hours,
        spam_detection_enabled, max_posts_per_user_counted, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'global_trend_config',
        3,     // Require at least 3 unique real users before trending to prevent bot domination
        24,    // 24 hour sliding analysis window
        1.0,   // engagement weight
        1.5,   // velocity weight
        2.0,   // unique users diversity weight
        0.2,   // views weight
        1.8,   // shares weight
        12.0,  // 12-hour exponential half-life
        1,     // spam detection enabled
        3,     // max 3 posts per user counted towards trend velocity
        new Date().toISOString(),
      ]
    );
  }

  // Seed initial featured trends if none exist
  const existingFeatured = queryDbAll(db, 'SELECT id FROM featured_trends');
  if (existingFeatured.length === 0) {
    const initialFeatured = [
      {
        id: 'ft_1',
        trend_type: 'hashtag',
        target: 'LiquidGlassUI',
        title: '#LiquidGlassUI Design Revolution',
        description: 'Next-gen spatial interfaces and fluid glassmorphism aesthetics.',
        badge: 'Curated',
        sort_order: 1,
      },
      {
        id: 'ft_2',
        trend_type: 'hashtag',
        target: 'CreatorEconomy',
        title: '#CreatorEconomy in Bangladesh',
        description: 'Empowering digital storytellers with coin tipping & mobile payouts.',
        badge: 'Trending',
        sort_order: 2,
      },
    ];

    for (const f of initialFeatured) {
      db.run(
        `INSERT INTO featured_trends (id, trend_type, target, title, description, badge, sort_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [f.id, f.trend_type, f.target, f.title, f.description, f.badge, f.sort_order, new Date().toISOString()]
      );
    }
  }

  saveDbSync();
}

/**
 * Get current trend algorithm configuration
 */
export function getTrendConfig(db: Database): TrendConfig {
  const row = queryDbOne(db, 'SELECT * FROM trend_config WHERE id = ?', ['global_trend_config']);
  if (!row) {
    return {
      id: 'global_trend_config',
      minUniqueUsers: 3,
      timeWindowHours: 24,
      weightEngagement: 1.0,
      weightVelocity: 1.5,
      weightUniqueUsers: 2.0,
      weightViews: 0.2,
      weightShares: 1.8,
      recencyDecayHours: 12.0,
      spamDetectionEnabled: true,
      maxPostsPerUserCounted: 3,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: row.id,
    minUniqueUsers: Number(row.min_unique_users),
    timeWindowHours: Number(row.time_window_hours),
    weightEngagement: Number(row.weight_engagement),
    weightVelocity: Number(row.weight_velocity),
    weightUniqueUsers: Number(row.weight_unique_users),
    weightViews: Number(row.weight_views),
    weightShares: Number(row.weight_shares),
    recencyDecayHours: Number(row.recency_decay_hours),
    spamDetectionEnabled: Boolean(row.spam_detection_enabled),
    maxPostsPerUserCounted: Number(row.max_posts_per_user_counted),
    updatedAt: row.updated_at,
  };
}

/**
 * Update trend algorithm configuration
 */
export function updateTrendConfig(db: Database, config: Partial<TrendConfig>): TrendConfig {
  const current = getTrendConfig(db);
  const updated: TrendConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  runDb(
    db,
    `UPDATE trend_config SET
      min_unique_users = ?,
      time_window_hours = ?,
      weight_engagement = ?,
      weight_velocity = ?,
      weight_unique_users = ?,
      weight_views = ?,
      weight_shares = ?,
      recency_decay_hours = ?,
      spam_detection_enabled = ?,
      max_posts_per_user_counted = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      updated.minUniqueUsers,
      updated.timeWindowHours,
      updated.weightEngagement,
      updated.weightVelocity,
      updated.weightUniqueUsers,
      updated.weightViews,
      updated.weightShares,
      updated.recencyDecayHours,
      updated.spamDetectionEnabled ? 1 : 0,
      updated.maxPostsPerUserCounted,
      updated.updatedAt,
      'global_trend_config',
    ]
  );

  saveDbSync();
  return updated;
}

/**
 * Calculate multi-signal anti-spam trending topics
 */
export function calculateTrendingTopics(db: Database, limit = 10, includeInspectionDetails = false): TrendingTopicItem[] {
  const config = getTrendConfig(db);
  const now = Date.now();
  const windowMillis = config.timeWindowHours * 60 * 60 * 1000;
  const cutoffIso = new Date(now - windowMillis).toISOString();
  const recentWindowMillis = (config.timeWindowHours / 4) * 60 * 60 * 1000;
  const recentCutoffIso = new Date(now - recentWindowMillis).toISOString();

  // Get blocked and removed hashtags
  const blockedRows = queryDbAll(db, 'SELECT LOWER(hashtag) as tag FROM blocked_hashtags');
  const blockedSet = new Set<string>(blockedRows.map((b) => b.tag.replace(/^#/, '')));

  const removedRows = queryDbAll(db, 'SELECT LOWER(trend_identifier) as tag FROM removed_trends');
  const removedSet = new Set<string>(removedRows.map((r) => r.tag.replace(/^#/, '')));

  // Get active featured trends
  const featuredRows = queryDbAll(
    db,
    'SELECT * FROM featured_trends WHERE is_active = 1 ORDER BY sort_order ASC'
  );
  const featuredMap = new Map<string, any>();
  for (const f of featuredRows) {
    featuredMap.set(f.target.toLowerCase().replace(/^#/, ''), f);
  }

  // Extract candidate posts within analysis window
  // Check both explicit post_hashtags and parsed hashtags in content/reels
  const candidatePosts = queryDbAll(
    db,
    `SELECT p.id, p.user_id, p.content, p.comments_count, p.shares_count, p.created_at,
            (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reactions_count,
            (SELECT COUNT(*) FROM bookmarks b WHERE b.post_id = p.id) as saves_count
     FROM posts p
     WHERE p.created_at >= ? AND p.deleted_at IS NULL`,
    [cutoffIso]
  );

  // Group by extracted hashtags
  interface TagMetrics {
    tag: string;
    posts: any[];
    userPostCounts: Map<string, number>;
    uniqueUsers: Set<string>;
    totalEngagement: number;
    recentEngagement: number;
    olderEngagement: number;
    shares: number;
    newestPostTime: number;
    sampleSnippet: string;
  }

  const tagMap = new Map<string, TagMetrics>();

  // Helper to register hashtag interaction
  const registerTagUsage = (rawTag: string, post: any) => {
    const cleanTag = rawTag.replace(/^#/, '').trim();
    if (!cleanTag || cleanTag.length < 2) return;
    const lower = cleanTag.toLowerCase();

    // Skip if blocked or removed
    if (blockedSet.has(lower) || removedSet.has(lower)) return;

    if (!tagMap.has(lower)) {
      tagMap.set(lower, {
        tag: cleanTag,
        posts: [],
        userPostCounts: new Map<string, number>(),
        uniqueUsers: new Set<string>(),
        totalEngagement: 0,
        recentEngagement: 0,
        olderEngagement: 0,
        shares: 0,
        newestPostTime: 0,
        sampleSnippet: post.content.substring(0, 100),
      });
    }

    const data = tagMap.get(lower)!;
    const userCount = data.userPostCounts.get(post.user_id) || 0;

    // Anti-spam rule: cap number of posts counted per single user
    if (config.spamDetectionEnabled && userCount >= config.maxPostsPerUserCounted) {
      // Do not contribute to velocity/engagement beyond the cap, preventing 1 user bot spam
      return;
    }

    data.userPostCounts.set(post.user_id, userCount + 1);
    data.uniqueUsers.add(post.user_id);
    data.posts.push(post);

    const postEngagement =
      (post.reactions_count || 0) +
      (post.comments_count || 0) * 2 +
      (post.shares_count || 0) * 3 +
      (post.saves_count || 0);

    data.totalEngagement += Math.max(1, postEngagement);
    data.shares += post.shares_count || 0;

    const postTime = new Date(post.created_at).getTime();
    if (postTime > data.newestPostTime) {
      data.newestPostTime = postTime;
      data.sampleSnippet = post.content.substring(0, 100);
    }

    if (post.created_at >= recentCutoffIso) {
      data.recentEngagement += Math.max(1, postEngagement);
    } else {
      data.olderEngagement += Math.max(1, postEngagement);
    }
  };

  // 1. Process candidate posts
  for (const post of candidatePosts) {
    const matches = post.content.match(/#([\w\u0980-\u09FF]+)/g);
    if (matches) {
      for (const m of matches) {
        registerTagUsage(m, post);
      }
    }
  }

  // 2. Also incorporate reels with hashtags
  const candidateReels = queryDbAll(
    db,
    `SELECT id, user_id, caption, hashtags, likes_count, comments_count, views_count, reposts_count, created_at
     FROM reels
     WHERE created_at >= ?`,
    [cutoffIso]
  );

  for (const reel of candidateReels) {
    let reelTags: string[] = [];
    if (reel.hashtags) {
      try {
        reelTags = JSON.parse(reel.hashtags);
      } catch {
        reelTags = reel.hashtags.split(',').map((t: string) => t.trim());
      }
    }
    const captionMatches = (reel.caption || '').match(/#([\w\u0980-\u09FF]+)/g);
    if (captionMatches) reelTags = [...reelTags, ...captionMatches];

    for (const t of reelTags) {
      registerTagUsage(t, {
        id: reel.id,
        user_id: reel.user_id,
        content: reel.caption || '',
        reactions_count: reel.likes_count,
        comments_count: reel.comments_count,
        shares_count: reel.reposts_count,
        saves_count: 0,
        created_at: reel.created_at,
      });
    }
  }

  // 3. Score and rank topics
  const scoredList: TrendingTopicItem[] = [];

  for (const [lowerTag, data] of tagMap.entries()) {
    const isFeatured = featuredMap.has(lowerTag);
    const uniqueUsersCount = data.uniqueUsers.size;

    // ANTI-BOT SPAM GATE:
    // If spam detection is enabled and unique users is below minimum threshold,
    // and it is NOT explicitly featured by an admin, disqualify or flag as suspicious!
    const isSpamSuspicious = uniqueUsersCount < config.minUniqueUsers;

    if (config.spamDetectionEnabled && isSpamSuspicious && !isFeatured && !includeInspectionDetails) {
      // Exclude from public discovery
      continue;
    }

    // Velocity = recent engagement / older engagement
    const velocity = data.olderEngagement > 0
      ? Math.round((data.recentEngagement / data.olderEngagement) * 100) / 100
      : Math.min(5.0, data.recentEngagement > 0 ? 3.0 : 1.0);

    // Recency decay factor e^(-deltaHours / tau)
    const hoursSinceNewest = Math.max(0.1, (now - (data.newestPostTime || now)) / (1000 * 60 * 60));
    const recencyDecay = Math.exp(-hoursSinceNewest / config.recencyDecayHours);

    // Composite trend score
    const engagementTerm = config.weightEngagement * data.totalEngagement;
    const velocityTerm = config.weightVelocity * (velocity * 15);
    const uniqueUsersTerm = config.weightUniqueUsers * (uniqueUsersCount * 25);
    const sharesTerm = config.weightShares * (data.shares * 5);

    let compositeScore = (engagementTerm + velocityTerm + uniqueUsersTerm + sharesTerm) * recencyDecay;

    // Boost if featured
    if (isFeatured) {
      compositeScore *= 2.5;
      compositeScore += 500;
    }

    scoredList.push({
      id: `trend_${lowerTag}`,
      tag: data.tag,
      postsCount: data.posts.length,
      uniqueUsersCount,
      engagementScore: data.totalEngagement,
      velocity,
      viewsCount: data.posts.length * 45 + data.totalEngagement * 12,
      sharesCount: data.shares,
      trendScore: Math.round(compositeScore * 10) / 10,
      recencyHours: Math.round(hoursSinceNewest * 10) / 10,
      isFeatured,
      isSpamSuspicious,
      badge: isFeatured ? featuredMap.get(lowerTag)?.badge || 'Featured' : undefined,
      sampleSnippet: data.sampleSnippet,
    });
  }

  // Include featured topics even if organic activity is quiet
  for (const [lowerTag, f] of featuredMap.entries()) {
    if (!tagMap.has(lowerTag)) {
      scoredList.push({
        id: `trend_${lowerTag}`,
        tag: f.target.replace(/^#/, ''),
        postsCount: 12,
        uniqueUsersCount: 5,
        engagementScore: 120,
        velocity: 2.0,
        viewsCount: 450,
        sharesCount: 15,
        trendScore: 850 - (f.sort_order || 0) * 10,
        recencyHours: 1.0,
        isFeatured: true,
        isSpamSuspicious: false,
        badge: f.badge || 'Featured',
        sampleSnippet: f.description || '',
      });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return b.trendScore - a.trendScore;
  });

  return scoredList.slice(0, limit);
}

/**
 * Multi-Entity Global Search with Autocomplete, Filters, and Pagination
 */
export function searchAllEntities(db: Database, options: SearchFilterOptions) {
  const {
    q,
    category = 'all',
    dateRange = 'all',
    sortBy = 'relevance',
    isVerifiedOnly = false,
    page = 1,
    limit = 12,
    currentUserId,
  } = options;

  const searchTerm = q.trim();
  const searchPattern = `%${searchTerm.toLowerCase()}%`;
  const offset = (page - 1) * limit;

  // Date filter helper
  const now = Date.now();
  let dateCutoff: string | null = null;
  if (dateRange === '24h') dateCutoff = new Date(now - 24 * 3600 * 1000).toISOString();
  else if (dateRange === '7d') dateCutoff = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  else if (dateRange === '30d') dateCutoff = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
  else if (dateRange === 'year') dateCutoff = new Date(now - 365 * 24 * 3600 * 1000).toISOString();

  const results: {
    users: any[];
    posts: any[];
    hashtags: any[];
    videos: any[];
    reels: any[];
    groups: any[];
    pages: any[];
    events: any[];
    totalCount: number;
    hasMore: boolean;
  } = {
    users: [],
    posts: [],
    hashtags: [],
    videos: [],
    reels: [],
    groups: [],
    pages: [],
    events: [],
    totalCount: 0,
    hasMore: false,
  };

  if (!searchTerm) {
    return results;
  }

  // 1. Search Users
  if (category === 'all' || category === 'users') {
    let sql = `SELECT id, username, full_name, avatar_url, cover_url, bio, badge, is_verified, followers_count, coins_balance, role
               FROM users
               WHERE deleted_at IS NULL AND (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(bio) LIKE ?)`;
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (isVerifiedOnly) {
      sql += ` AND is_verified = 1`;
    }

    if (sortBy === 'popular') {
      sql += ` ORDER BY followers_count DESC, is_verified DESC`;
    } else {
      sql += ` ORDER BY is_verified DESC, followers_count DESC`;
    }

    const maxLimit = category === 'users' ? limit : 6;
    const userRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.users = userRows.map((u) => ({
      ...u,
      isVerified: Boolean(u.is_verified),
      followersCount: u.followers_count || 0,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
    }));
  }

  // 2. Search Posts
  if (category === 'all' || category === 'posts') {
    let sql = `SELECT p.*, u.username, u.full_name, u.avatar_url, u.badge, u.is_verified
               FROM posts p
               JOIN users u ON p.user_id = u.id
               WHERE p.deleted_at IS NULL AND LOWER(p.content) LIKE ?`;
    const params: any[] = [searchPattern];

    if (dateCutoff) {
      sql += ` AND p.created_at >= ?`;
      params.push(dateCutoff);
    }

    if (sortBy === 'latest') {
      sql += ` ORDER BY p.created_at DESC`;
    } else if (sortBy === 'popular') {
      sql += ` ORDER BY (p.comments_count + p.shares_count) DESC, p.created_at DESC`;
    } else {
      sql += ` ORDER BY p.created_at DESC`;
    }

    const maxLimit = category === 'posts' ? limit : 6;
    const postRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.posts = postRows.map((p) => ({
      id: p.id,
      content: p.content,
      mediaType: p.media_type,
      mediaUrls: p.media_urls ? JSON.parse(p.media_urls || '[]') : [],
      commentsCount: p.comments_count,
      sharesCount: p.shares_count,
      createdAt: p.created_at,
      author: {
        id: p.user_id,
        username: p.username,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        badge: p.badge,
        isVerified: Boolean(p.is_verified),
      },
    }));
  }

  // 3. Search Hashtags
  if (category === 'all' || category === 'hashtags') {
    const rawTag = searchTerm.replace(/^#/, '');
    const tagMatches = calculateTrendingTopics(db, 20)
      .filter((t) => t.tag.toLowerCase().includes(rawTag.toLowerCase()))
      .slice(0, category === 'hashtags' ? limit : 6);

    results.hashtags = tagMatches;
  }

  // 4. Search Videos
  if (category === 'all' || category === 'videos') {
    let sql = `SELECT p.*, u.username, u.full_name, u.avatar_url, u.is_verified
               FROM posts p
               JOIN users u ON p.user_id = u.id
               WHERE p.deleted_at IS NULL
                 AND (p.media_type = 'video' OR p.media_urls LIKE '%.mp4%' OR p.media_urls LIKE '%video%')
                 AND LOWER(p.content) LIKE ?`;
    const params: any[] = [searchPattern];

    if (dateCutoff) {
      sql += ` AND p.created_at >= ?`;
      params.push(dateCutoff);
    }

    sql += sortBy === 'popular' ? ` ORDER BY p.comments_count DESC` : ` ORDER BY p.created_at DESC`;
    const maxLimit = category === 'videos' ? limit : 6;
    const videoRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.videos = videoRows.map((v) => ({
      id: v.id,
      title: v.content,
      mediaUrls: JSON.parse(v.media_urls || '[]'),
      author: {
        id: v.user_id,
        username: v.username,
        fullName: v.full_name,
        avatarUrl: v.avatar_url,
        isVerified: Boolean(v.is_verified),
      },
      createdAt: v.created_at,
      viewsCount: (v.comments_count || 1) * 35,
    }));
  }

  // 5. Search Reels
  if (category === 'all' || category === 'reels') {
    let sql = `SELECT r.*, u.username, u.full_name, u.avatar_url, u.is_verified
               FROM reels r
               JOIN users u ON r.user_id = u.id
               WHERE (LOWER(r.caption) LIKE ? OR LOWER(r.hashtags) LIKE ? OR LOWER(r.music_title) LIKE ?)`;
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (dateCutoff) {
      sql += ` AND r.created_at >= ?`;
      params.push(dateCutoff);
    }

    sql += sortBy === 'popular' ? ` ORDER BY r.views_count DESC, r.likes_count DESC` : ` ORDER BY r.created_at DESC`;
    const maxLimit = category === 'reels' ? limit : 6;
    const reelRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.reels = reelRows.map((r) => ({
      id: r.id,
      caption: r.caption,
      videoUrl: r.video_url,
      thumbnailUrl: r.thumbnail_url,
      musicTitle: r.music_title,
      musicArtist: r.music_artist,
      likesCount: r.likes_count,
      viewsCount: r.views_count,
      commentsCount: r.comments_count,
      repostsCount: r.reposts_count,
      createdAt: r.created_at,
      author: {
        id: r.user_id,
        username: r.username,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        isVerified: Boolean(r.is_verified),
      },
    }));
  }

  // 6. Search Groups
  if (category === 'all' || category === 'groups') {
    let sql = `SELECT * FROM groups WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ?`;
    const params: any[] = [searchPattern, searchPattern];

    sql += sortBy === 'popular' ? ` ORDER BY members_count DESC` : ` ORDER BY created_at DESC`;
    const maxLimit = category === 'groups' ? limit : 6;
    const groupRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.groups = groupRows.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      avatarUrl: g.avatar_url,
      coverUrl: g.cover_url,
      privacy: g.privacy,
      membersCount: g.members_count || 1,
      createdAt: g.created_at,
    }));
  }

  // 7. Search Pages
  if (category === 'all' || category === 'pages') {
    let sql = `SELECT * FROM pages WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(category) LIKE ?`;
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    sql += sortBy === 'popular' ? ` ORDER BY followers_count DESC` : ` ORDER BY created_at DESC`;

    const maxLimit = category === 'pages' ? limit : 6;
    const pageRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.pages = pageRows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      avatarUrl: p.avatar_url,
      coverUrl: p.cover_url,
      followersCount: p.followers_count || 0,
      createdAt: p.created_at,
    }));
  }

  // 8. Search Events
  if (category === 'all' || category === 'events') {
    let sql = `SELECT e.*, u.full_name as creator_name
               FROM events e
               LEFT JOIN users u ON e.creator_id = u.id
               WHERE LOWER(e.title) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.location) LIKE ?`;
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (dateCutoff) {
      sql += ` AND e.created_at >= ?`;
      params.push(dateCutoff);
    }

    sql += sortBy === 'popular' ? ` ORDER BY e.attendees_count DESC` : ` ORDER BY e.start_time ASC`;
    const maxLimit = category === 'events' ? limit : 6;
    const eventRows = queryDbAll(db, `${sql} LIMIT ? OFFSET ?`, [...params, maxLimit, offset]);
    results.events = eventRows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      coverUrl: e.cover_url,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeesCount: e.attendees_count || 0,
      creatorName: e.creator_name,
      createdAt: e.created_at,
    }));
  }

  // Calculate total count
  const total =
    results.users.length +
    results.posts.length +
    results.hashtags.length +
    results.videos.length +
    results.reels.length +
    results.groups.length +
    results.pages.length +
    results.events.length;

  results.totalCount = total;
  results.hasMore = total >= limit;

  return results;
}

/**
 * Autocomplete prefix suggestions across users, hashtags, groups, pages
 */
export function getAutocompleteSuggestions(db: Database, query: string) {
  const q = query.trim();
  if (!q) return { suggestions: [] };
  const pattern = `${q.toLowerCase()}%`;
  const subPattern = `%${q.toLowerCase()}%`;

  const suggestions: Array<{
    type: 'user' | 'hashtag' | 'group' | 'page' | 'query';
    id: string;
    title: string;
    subtitle?: string;
    avatarUrl?: string;
    badge?: string;
  }> = [];

  // 1. Users
  const users = queryDbAll(
    db,
    `SELECT id, username, full_name, avatar_url, badge, is_verified
     FROM users
     WHERE deleted_at IS NULL AND (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ?)
     LIMIT 4`,
    [pattern, pattern]
  );
  for (const u of users) {
    suggestions.push({
      type: 'user',
      id: u.id,
      title: u.full_name,
      subtitle: `@${u.username}`,
      avatarUrl: u.avatar_url,
      badge: u.is_verified ? 'Verified' : u.badge,
    });
  }

  // 2. Hashtags
  const cleanTag = q.replace(/^#/, '');
  const trendingTags = calculateTrendingTopics(db, 8);
  for (const t of trendingTags) {
    if (t.tag.toLowerCase().includes(cleanTag.toLowerCase())) {
      suggestions.push({
        type: 'hashtag',
        id: `tag_${t.tag}`,
        title: `#${t.tag}`,
        subtitle: `${t.postsCount} posts • Trending`,
        badge: t.badge,
      });
    }
  }

  // 3. Groups
  const groups = queryDbAll(
    db,
    `SELECT id, name, members_count, avatar_url
     FROM groups
     WHERE LOWER(name) LIKE ?
     LIMIT 3`,
    [subPattern]
  );
  for (const g of groups) {
    suggestions.push({
      type: 'group',
      id: g.id,
      title: g.name,
      subtitle: `${g.members_count || 1} members`,
      avatarUrl: g.avatar_url,
    });
  }

  // 4. Pages
  const pages = queryDbAll(
    db,
    `SELECT id, name, category, avatar_url
     FROM pages
     WHERE LOWER(name) LIKE ?
     LIMIT 3`,
    [subPattern]
  );
  for (const p of pages) {
    suggestions.push({
      type: 'page',
      id: p.id,
      title: p.name,
      subtitle: `${p.category || 'Page'}`,
      avatarUrl: p.avatar_url,
    });
  }

  return { suggestions: suggestions.slice(0, 10) };
}

/**
 * Recent Searches Management
 */
export function addRecentSearch(db: Database, userId: string, queryText: string, category = 'all') {
  const q = queryText.trim();
  if (!q) return;

  // Remove duplicate query for this user
  runDb(db, `DELETE FROM searches WHERE user_id = ? AND LOWER(query) = ?`, [userId, q.toLowerCase()]);

  const id = `srch_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  runDb(
    db,
    `INSERT INTO searches (id, user_id, query, category, searched_at) VALUES (?, ?, ?, ?, ?)`,
    [id, userId, q, category, new Date().toISOString()]
  );

  saveDbSync();
}

export function getRecentSearches(db: Database, userId: string, limit = 10) {
  const rows = queryDbAll(
    db,
    `SELECT id, query, category, searched_at FROM searches WHERE user_id = ? ORDER BY searched_at DESC LIMIT ?`,
    [userId, limit]
  );
  return rows.map((r) => ({
    id: r.id,
    query: r.query,
    category: r.category,
    searchedAt: r.searched_at,
  }));
}

export function deleteRecentSearch(db: Database, userId: string, searchId: string) {
  runDb(db, `DELETE FROM searches WHERE id = ? AND user_id = ?`, [searchId, userId]);
  saveDbSync();
}

export function clearRecentSearches(db: Database, userId: string) {
  runDb(db, `DELETE FROM searches WHERE user_id = ?`, [userId]);
  saveDbSync();
}

export function getTrendingSearches(db: Database, limit = 8) {
  // Aggregate recent search queries from the past 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const searchCounts = queryDbAll(
    db,
    `SELECT query, COUNT(*) as query_count
     FROM searches
     WHERE searched_at >= ?
     GROUP BY LOWER(query)
     ORDER BY query_count DESC
     LIMIT ?`,
    [sevenDaysAgo, limit]
  );

  const topTags = calculateTrendingTopics(db, limit);
  const combined = new Set<string>();

  for (const s of searchCounts) {
    combined.add(s.query);
  }
  for (const t of topTags) {
    combined.add(`#${t.tag}`);
  }

  return Array.from(combined).slice(0, limit);
}

/**
 * Personalized Explore Discovery
 */
export function getPersonalizedExplore(db: Database, currentUserId?: string) {
  // 1. Trending Posts (highest score from recent posts)
  const postsRows = queryDbAll(
    db,
    `SELECT p.*, u.username, u.full_name, u.avatar_url, u.badge, u.is_verified,
            (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reactions_count
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.deleted_at IS NULL
     ORDER BY (p.comments_count * 2 + p.shares_count * 3) DESC, p.created_at DESC
     LIMIT 10`
  );

  const trendingPosts = postsRows.map((p) => ({
    id: p.id,
    content: p.content,
    mediaType: p.media_type,
    mediaUrls: JSON.parse(p.media_urls || '[]'),
    commentsCount: p.comments_count,
    sharesCount: p.shares_count,
    reactionsCount: p.reactions_count || 0,
    createdAt: p.created_at,
    author: {
      id: p.user_id,
      username: p.username,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      badge: p.badge,
      isVerified: Boolean(p.is_verified),
    },
  }));

  // 2. Trending Videos (reels and video posts)
  const trendingVideos = queryDbAll(
    db,
    `SELECT r.id, r.caption as title, r.video_url, r.thumbnail_url, r.likes_count, r.views_count, r.created_at,
            u.username, u.full_name, u.avatar_url, u.is_verified
     FROM reels r
     JOIN users u ON r.user_id = u.id
     ORDER BY r.views_count DESC, r.likes_count DESC
     LIMIT 6`
  ).map((v) => ({
    id: v.id,
    title: v.title,
    videoUrl: v.video_url,
    thumbnailUrl: v.thumbnail_url,
    viewsCount: v.views_count,
    likesCount: v.likes_count,
    createdAt: v.created_at,
    author: {
      username: v.username,
      fullName: v.full_name,
      avatarUrl: v.avatar_url,
      isVerified: Boolean(v.is_verified),
    },
  }));

  // 3. Popular Creators
  let creatorSql = `SELECT id, username, full_name, avatar_url, cover_url, bio, badge, is_verified, followers_count
                    FROM users
                    WHERE deleted_at IS NULL`;
  if (currentUserId) {
    creatorSql += ` AND id != '${currentUserId}'`;
  }
  creatorSql += ` ORDER BY is_verified DESC, followers_count DESC LIMIT 6`;

  const popularCreators = queryDbAll(db, creatorSql).map((c) => ({
    id: c.id,
    username: c.username,
    fullName: c.full_name,
    avatarUrl: c.avatar_url,
    coverUrl: c.cover_url,
    bio: c.bio,
    badge: c.badge,
    isVerified: Boolean(c.is_verified),
    followersCount: c.followers_count || 0,
  }));

  // 4. Popular Hashtags (from multi-signal trending engine)
  const popularHashtags = calculateTrendingTopics(db, 8);

  // 5. Suggested Users (personalized recommendations)
  const suggestedUsers = popularCreators.slice(0, 4);

  // 6. Suggested Groups
  const suggestedGroups = queryDbAll(
    db,
    `SELECT id, name, slug, description, avatar_url, cover_url, privacy, members_count
     FROM groups
     ORDER BY members_count DESC
     LIMIT 4`
  ).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    avatarUrl: g.avatar_url,
    coverUrl: g.cover_url,
    privacy: g.privacy,
    membersCount: g.members_count || 1,
  }));

  // 7. Suggested Pages
  const suggestedPages = queryDbAll(
    db,
    `SELECT id, name, description, category, avatar_url, followers_count
     FROM pages
     ORDER BY followers_count DESC
     LIMIT 4`
  ).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    avatarUrl: p.avatar_url,
    followersCount: p.followers_count || 0,
  }));

  return {
    trendingPosts,
    trendingVideos,
    popularCreators,
    popularHashtags,
    suggestedUsers,
    suggestedGroups,
    suggestedPages,
  };
}

/**
 * ADMIN: Inspect Trends with full anti-spam signals & metrics
 */
export function getAdminTrends(db: Database) {
  // Returns all candidates including those flagged as spam-suspicious
  const allTrends = calculateTrendingTopics(db, 50, true);
  const blockedHashtags = getBlockedHashtags(db);
  const featuredTrends = getFeaturedTrends(db);
  const config = getTrendConfig(db);

  return {
    trends: allTrends,
    blockedHashtags,
    featuredTrends,
    config,
  };
}

/**
 * ADMIN: Remove / Hide Trend from Discovery
 */
export function removeTrend(db: Database, trendIdentifier: string, reason: string, adminUserId: string) {
  const clean = trendIdentifier.replace(/^#/, '').toLowerCase().trim();
  const id = `rem_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Delete from featured if it was featured
  runDb(db, `DELETE FROM featured_trends WHERE LOWER(target) = ?`, [clean]);

  // Insert into removed_trends
  runDb(
    db,
    `INSERT OR REPLACE INTO removed_trends (id, trend_identifier, reason, removed_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, clean, reason || 'Suppressed by administrator', adminUserId, new Date().toISOString()]
  );

  saveDbSync();
}

/**
 * ADMIN: Unremove / Restore Trend
 */
export function unremoveTrend(db: Database, trendIdentifier: string) {
  const clean = trendIdentifier.replace(/^#/, '').toLowerCase().trim();
  runDb(db, `DELETE FROM removed_trends WHERE LOWER(trend_identifier) = ?`, [clean]);
  saveDbSync();
}

/**
 * ADMIN: Block Hashtag
 */
export function blockHashtag(db: Database, hashtag: string, reason: string, adminUserId: string) {
  const clean = hashtag.replace(/^#/, '').toLowerCase().trim();
  const id = `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  runDb(
    db,
    `INSERT OR REPLACE INTO blocked_hashtags (id, hashtag, reason, blocked_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, clean, reason || 'Violates community guidelines', adminUserId, new Date().toISOString()]
  );

  // Also remove from featured
  runDb(db, `DELETE FROM featured_trends WHERE LOWER(target) = ?`, [clean]);

  saveDbSync();
}

/**
 * ADMIN: Unblock Hashtag
 */
export function unblockHashtag(db: Database, hashtagIdOrTag: string) {
  const clean = hashtagIdOrTag.replace(/^#/, '').toLowerCase().trim();
  runDb(db, `DELETE FROM blocked_hashtags WHERE id = ? OR LOWER(hashtag) = ?`, [hashtagIdOrTag, clean]);
  saveDbSync();
}

/**
 * ADMIN: Get Blocked Hashtags
 */
export function getBlockedHashtags(db: Database) {
  return queryDbAll(db, `SELECT * FROM blocked_hashtags ORDER BY created_at DESC`);
}

/**
 * ADMIN: Feature Trend
 */
export function featureTrend(
  db: Database,
  data: {
    target: string;
    title: string;
    description?: string;
    badge?: string;
    sortOrder?: number;
    trendType?: string;
  }
) {
  const clean = data.target.replace(/^#/, '').trim();
  const id = `ft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  runDb(
    db,
    `INSERT INTO featured_trends (id, trend_type, target, title, description, badge, sort_order, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      data.trendType || 'hashtag',
      clean,
      data.title || `#${clean}`,
      data.description || '',
      data.badge || 'Featured',
      data.sortOrder || 0,
      new Date().toISOString(),
    ]
  );

  // Ensure it's not marked as removed
  runDb(db, `DELETE FROM removed_trends WHERE LOWER(trend_identifier) = ?`, [clean.toLowerCase()]);

  saveDbSync();
  return { id, target: clean };
}

/**
 * ADMIN: Unfeature Trend
 */
export function unfeatureTrend(db: Database, featureIdOrTarget: string) {
  runDb(
    db,
    `DELETE FROM featured_trends WHERE id = ? OR LOWER(target) = ?`,
    [featureIdOrTarget, featureIdOrTarget.replace(/^#/, '').toLowerCase()]
  );
  saveDbSync();
}

/**
 * ADMIN: Get Featured Trends
 */
export function getFeaturedTrends(db: Database) {
  return queryDbAll(db, `SELECT * FROM featured_trends ORDER BY sort_order ASC, created_at DESC`);
}
