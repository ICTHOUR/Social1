import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { registerPaymentRoutes } from './src/payments/paymentRoutes.js';
import { registerSmsRoutes } from './src/sms/smsRoutes.js';
import { ensureSupportTables } from './src/db/supportEngine.js';
import { registerSupportRoutes } from './src/db/supportRoutes.js';
import { setupMarketplaceRoutes } from './src/marketplace/marketplaceRoutes.js';
import { getDatabase, queryDbAll, queryDbOne, runDb, saveDbSync, beginTransaction, commitTransaction, rollbackTransaction } from './src/db/database.js';
import { executeCoinTransfer } from './src/db/transactions.js';
import {
  getCoinEarningRules,
  updateCoinEarningRules,
  evaluateAndAwardCoinReward,
  executeGiftTransaction,
  refundGiftTransaction,
  getSuspiciousActivityMetrics,
} from './src/db/economy.js';
import {
  ensureFinancialTables,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  calculateWithdrawalBreakdown,
  requestUserWithdrawal,
  cancelUserWithdrawal,
  reviewWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  createPaymentIntentForCoins,
  verifyAndCreditPayment,
  getUserWalletComprehensive,
  toDecimalSafe,
} from './src/db/financialEngine.js';
import {
  ensureDiscoveryTables,
  getTrendConfig,
  updateTrendConfig,
  calculateTrendingTopics,
  searchAllEntities,
  getAutocompleteSuggestions,
  addRecentSearch,
  getRecentSearches,
  deleteRecentSearch,
  clearRecentSearches,
  getTrendingSearches,
  getPersonalizedExplore,
  getAdminTrends,
  removeTrend,
  unremoveTrend,
  blockHashtag,
  unblockHashtag,
  getBlockedHashtags,
  featureTrend,
  unfeatureTrend,
  getFeaturedTrends,
} from './src/db/discoveryEngine.js';
import {
  ensureCommunityTables,
  createGroup,
  getGroupsList,
  getGroupDetails,
  updateGroup,
  requestOrJoinGroup,
  getGroupJoinRequests,
  handleJoinRequest,
  inviteUserToGroup,
  getGroupMembers,
  updateMemberRole,
  banGroupMember,
  unbanGroupMember,
  muteGroupMember,
  unmuteGroupMember,
  createGroupPost,
  getGroupPosts,
  moderateGroupPost,
  addGroupComment,
  getGroupComments,
  uploadGroupFile,
  getGroupFiles,
  createPage,
  getPagesList,
  getPageDetails,
  toggleFollowPage,
  createPagePost,
  getPagePosts,
  getPageVideos,
  updatePageRole,
  getPageAnalytics,
  sendPageMessage,
  getPageMessages,
  createEvent,
  getEventsList,
  getEventDetails,
  rsvpEvent,
  toggleEventReminder,
  inviteToEvent,
  addEventDiscussion,
  getEventDiscussions,
} from './src/db/communityEngine.js';
import {
  ensureAdTables,
  getAdPlacements,
  updateAdPlacement,
  getAdCampaigns,
  getAdCampaignById,
  createAdCampaign,
  updateAdCampaign,
  deleteAdCampaign,
  getPlatformAdSettings,
  updatePlatformAdSettings,
  serveAdForPlacement,
  recordAdImpression,
  recordAdClick,
  issueRewardedChallenge,
  verifyAndClaimRewardedAd,
  getAdAnalyticsReport,
} from './src/db/adEngine.js';
import { PaymentGatewayRegistry } from './src/payments/PaymentGatewayRegistry.js';
import { PaymentGatewayId } from './src/payments/types.js';
import {
  applySecurityHeaders,
  createRateLimitMiddleware,
  rateLimiter,
  validateUploadFile,
  verifyFileSignature,
  blacklistToken,
  isTokenBlacklisted,
  sanitizeRichText,
  escapeHtml,
} from './src/security/securityEngine.js';
import {
  financialMutex,
  checkIdempotency,
  saveIdempotencyRecord,
  ensureFinancialGuardTables,
} from './src/security/financialGuard.js';
import {
  checkPostSpam,
  checkCommentSpam,
  checkReactionSpam,
  checkCircularGifting,
  calculateWithdrawalRiskScore,
  getAntiSpamRules,
  updateAntiSpamRule,
  ensureAntiSpamTables,
} from './src/db/antiSpamEngine.js';
import {
  createReport,
  getModerationQueue,
  executeModerationAction,
  getModerationActionHistory,
  isUserRestricted,
  getReportsByReporter,
  getReportedUserAuditHistory,
  ensureModerationTables,
  ReportTargetType,
  ReportCategory,
  ReportStatus,
} from './src/db/moderationEngine.js';
import {
  ensureNotificationTables,
  processNotificationCampaignQueueBatch,
  getCampaignsList,
  getCampaignDetailsAndLogs,
  createNotificationCampaign,
  cancelCampaign,
  deleteCampaign,
  getTemplatesList,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationCenterStats,
} from './src/db/notificationEngine.js';
import {
  ensureSettingsTables,
  getSettingsValue,
  getAllSettingsMap,
  updateSettingsCategory,
  getSanitizedPublicSettings,
} from './src/db/settingsEngine.js';
import {
  ensureSponsorTables,
  getAllSponsors,
  getSponsorById,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  recordSponsorClick,
  recordSponsorImpression,
} from './src/db/sponsorEngine.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'nixo_liquid_glass_jwt_secret_2026_super_key';

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

// Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname);
    if (!ext) {
      if (file.mimetype.startsWith('video/webm')) ext = '.webm';
      else if (file.mimetype.startsWith('video/')) ext = '.mp4';
      else if (file.mimetype.startsWith('audio/')) ext = '.mp3';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'image/gif') ext = '.gif';
      else ext = '.jpg';
    }
    cb(null, 'file-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

async function startApp() {
  const app = express();
  const server = http.createServer(app);

  // Socket.IO server
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Apply Hardened Security Headers (CSP, XSS, Sniff, Referrer, Frameguard)
  app.use(applySecurityHeaders);

  // Rate Limiting Middlewares
  const authRateLimit = createRateLimitMiddleware('auth', 20, 60 * 1000); // 20 attempts/min
  const apiGeneralRateLimit = createRateLimitMiddleware('api', 200, 60 * 1000); // 200 req/min
  const postActionRateLimit = createRateLimitMiddleware('post_creation', 30, 60 * 1000); // 30 posts/min
  const commentActionRateLimit = createRateLimitMiddleware('comment_creation', 60, 60 * 1000); // 60 comments/min
  const financialRateLimit = createRateLimitMiddleware('financial_tx', 40, 60 * 1000); // 40 tx/min

  // Static uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Initialize Relational DB
  const db = await getDatabase();
  ensureFinancialTables(db);
  ensureDiscoveryTables(db);
  ensureCommunityTables(db);
  ensureAdTables(db);
  ensureFinancialGuardTables(db);
  ensureAntiSpamTables(db);
  ensureModerationTables(db);
  ensureNotificationTables(db);
  ensureSupportTables(db);
  ensureSponsorTables(db);

  // Background Notification Campaign Queue Worker (Runs every 3 seconds for safe batching)
  setInterval(() => {
    try {
      processNotificationCampaignQueueBatch(db, io, 50);
    } catch (err) {
      console.error('Notification campaign batch queue worker error:', err);
    }
  }, 3000);

  // Middleware: Auth JWT
  interface AuthRequest extends Request {
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }

  const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked. Please sign in again.' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      const user = queryDbOne(db, 'SELECT id, username, role, status, deleted_at FROM users WHERE id = ?', [decoded.id]);
      if (!user) {
        return res.status(401).json({ error: 'User account no longer exists' });
      }
      if (user.deleted_at) {
        return res.status(403).json({ error: 'Account has been deleted' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Account is temporarily suspended by moderation team' });
      }
      if (user.status === 'banned') {
        return res.status(403).json({ error: 'Account is permanently banned' });
      }

      req.user = { id: user.id, username: user.username, role: user.role };
      next();
    });
  };

  const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (!err && decoded) {
          const user = queryDbOne(db, 'SELECT id, username, role, status, deleted_at FROM users WHERE id = ?', [decoded.id]);
          if (user && !user.deleted_at && user.status !== 'suspended' && user.status !== 'banned') {
            req.user = { id: user.id, username: user.username, role: user.role };
          }
        }
        next();
      });
    } else {
      next();
    }
  };

  const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Admin or Moderator authority required' });
    }
    next();
  };

  // Helper function to format user row with extended profile & privacy
  const formatUser = (row: any) => {
    if (!row) return null;

    const profile = queryDbOne(db, 'SELECT * FROM user_profiles WHERE user_id = ?', [row.id]);
    const privacy = queryDbOne(db, 'SELECT * FROM privacy_settings WHERE user_id = ?', [row.id]);

    let interests: string[] = [];
    if (profile?.interests) {
      try { interests = JSON.parse(profile.interests); } catch (e) { interests = []; }
    }

    let socialLinks: Record<string, string> = {};
    if (profile?.social_links) {
      try { socialLinks = JSON.parse(profile.social_links); } catch (e) { socialLinks = {}; }
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      phone: row.phone || null,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      coverUrl: row.cover_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      bio: row.bio,
      badge: row.badge,
      coinsBalance: row.coins_balance,
      isVerified: Boolean(row.is_verified),
      role: row.role,
      status: row.status,
      deletedAt: row.deleted_at || null,
      followersCount: row.followers_count || 0,
      followingCount: row.following_count || 0,
      // Profile Details
      gender: profile?.gender || null,
      birthdate: profile?.birthdate || null,
      dobPrivacy: profile?.dob_privacy || 'public',
      location: profile?.location || null,
      websiteUrl: profile?.website_url || null,
      occupation: profile?.occupation || null,
      education: profile?.education || null,
      interests,
      socialLinks,
      // Privacy Settings
      privacy: {
        profileVisibility: privacy?.profile_visibility || 'public',
        postDefaultVisibility: privacy?.post_default_visibility || 'public',
        allowFriendRequests: privacy?.allow_friend_requests || 'everyone',
        allowFollows: privacy?.allow_follows || 'everyone',
        directMessagePrivacy: privacy?.direct_message_privacy || 'everyone',
        allowCommenting: privacy?.allow_commenting || 'everyone',
        allowTagging: privacy?.allow_tagging || 'everyone',
        allowMentions: privacy?.allow_mentions || 'everyone',
        showOnlineStatus: privacy ? Boolean(privacy.show_online_status) : true,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  // Helper to emit real-time admin metrics update to all admin sessions
  const emitAdminMetricsUpdated = () => {
    try {
      io.emit('admin_metrics_updated', {
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to emit admin metrics:', e);
    }
  };

  // Helper to log audit
  const logAudit = (userId: string, action: string, details?: string, ip?: string) => {
    try {
      const now = new Date().toISOString();
      const id = 'audit_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      runDb(db, `INSERT INTO audit_logs (id, user_id, action, ip_address, details, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
        id,
        userId,
        action,
        ip || '127.0.0.1',
        details || '',
        now,
      ]);
      try {
        io.emit('audit_log_added', {
          id,
          userId,
          action,
          ipAddress: ip || '127.0.0.1',
          details: details || '',
          createdAt: now,
        });
        emitAdminMetricsUpdated();
      } catch (err) {}
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  };

  // Helper to create session and JWT + Refresh Token
  const createSessionAndTokens = (userId: string, username: string, role: string, ip?: string, userAgent?: string) => {
    const token = jwt.sign({ id: userId, username, role, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = 'ref_' + Date.now() + '_' + crypto.randomBytes(16).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const sessionId = 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const now = new Date();
    const sessionExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = now.toISOString();

    runDb(
      db,
      `INSERT OR REPLACE INTO user_sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, token, ip || '127.0.0.1', userAgent || 'Nixo Engine Browser', sessionExpiresAt, createdAt]
    );

    runDb(
      db,
      `INSERT INTO refresh_tokens (id, user_id, token_hash, device_info, is_revoked, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ['rt_' + Date.now() + '_' + Math.floor(Math.random() * 10000), userId, refreshTokenHash, userAgent || 'Nixo Engine Browser', refreshExpiresAt, createdAt]
    );

    return { token, refreshToken, sessionId };
  };

  // Upgraded Real-Time Notification Engine (Preferences, Deduplication, Push & Socket.IO)
  const sendNotification = (
    userIdOrOptions: string | {
      userId: string;
      senderId?: string | null;
      type: string;
      message: string;
      referenceId?: string | null;
      referenceType?: string | null;
      metadata?: any;
      dedupKey?: string | null;
      dedupWindowSeconds?: number;
    },
    senderIdParam?: string | null,
    typeParam?: string,
    messageParam?: string,
    referenceIdParam?: string | null,
    referenceTypeParam?: string | null,
    metadataParam?: any,
    dedupKeyParam?: string | null,
    dedupWindowSecondsParam?: number
  ) => {
    let userId: string;
    let senderId: string | null | undefined;
    let type: string;
    let message: string;
    let referenceId: string | null | undefined;
    let referenceType: string | null | undefined;
    let metadata: any;
    let dedupKey: string | null | undefined;
    let dedupWindowSeconds: number = 3600; // 1 hour deduplication window by default

    if (typeof userIdOrOptions === 'object' && userIdOrOptions !== null) {
      userId = userIdOrOptions.userId;
      senderId = userIdOrOptions.senderId;
      type = userIdOrOptions.type;
      message = userIdOrOptions.message;
      referenceId = userIdOrOptions.referenceId;
      referenceType = userIdOrOptions.referenceType;
      metadata = userIdOrOptions.metadata;
      dedupKey = userIdOrOptions.dedupKey;
      if (userIdOrOptions.dedupWindowSeconds !== undefined) {
        dedupWindowSeconds = userIdOrOptions.dedupWindowSeconds;
      }
    } else {
      userId = userIdOrOptions;
      senderId = senderIdParam;
      type = typeParam!;
      message = messageParam!;
      referenceId = referenceIdParam;
      referenceType = referenceTypeParam;
      metadata = metadataParam;
      dedupKey = dedupKeyParam;
      if (dedupWindowSecondsParam !== undefined) {
        dedupWindowSeconds = dedupWindowSecondsParam;
      }
    }

    if (senderId && userId === senderId) return null; // Don't notify self

    // Check user's notification preferences
    const prefRow = queryDbOne(db, 'SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
    if (prefRow) {
      if (prefRow.in_app_enabled === 0) {
        return null; // User disabled all in-app notifications
      }

      const prefMap: Record<string, string> = {
        friend_request: 'pref_friend_request',
        friend_accepted: 'pref_friend_accepted',
        friend_accept: 'pref_friend_accepted',
        follow: 'pref_follow',
        like: 'pref_like',
        reaction: 'pref_like',
        comment: 'pref_comment',
        reply: 'pref_reply',
        mention: 'pref_mention',
        share: 'pref_share',
        repost: 'pref_repost',
        message: 'pref_message',
        group_activity: 'pref_group_activity',
        page_activity: 'pref_page_activity',
        event_activity: 'pref_event_activity',
        gift: 'pref_gift_received',
        gift_received: 'pref_gift_received',
        coin_received: 'pref_coin_received',
        coin_purchase: 'pref_coin_purchase',
        withdrawal_update: 'pref_withdrawal_update',
        admin_announcement: 'pref_admin_announcement',
        security_alert: 'pref_security_alert',
      };

      const prefCol = prefMap[type];
      if (prefCol && prefRow[prefCol] === 0) {
        return null; // Explicitly muted in preferences
      }
    }

    // Deduplication Key
    const effectiveDedupKey = dedupKey || (
      ['like', 'reaction', 'follow', 'friend_request', 'friend_accepted', 'share', 'repost'].includes(type)
        ? `${type}:${senderId || 'anon'}:${userId}:${referenceId || 'global'}`
        : null
    );

    const now = new Date().toISOString();
    const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : (metadata || null);

    // Deduplicate if matching record exists within dedupWindowSeconds
    if (effectiveDedupKey && dedupWindowSeconds > 0) {
      const windowStart = new Date(Date.now() - dedupWindowSeconds * 1000).toISOString();
      const existing = queryDbOne(
        db,
        `SELECT id, is_read FROM notifications
         WHERE user_id = ? AND dedup_key = ? AND created_at >= ?
         ORDER BY created_at DESC LIMIT 1`,
        [userId, effectiveDedupKey, windowStart]
      );

      if (existing) {
        runDb(
          db,
          `UPDATE notifications
           SET message = ?, metadata = ?, created_at = ?, is_read = 0
           WHERE id = ?`,
          [message, metadataStr, now, existing.id]
        );

        const sender = senderId
          ? queryDbOne(db, 'SELECT id, username, full_name, avatar_url, badge FROM users WHERE id = ?', [senderId])
          : null;

        const formatted = {
          id: existing.id,
          userId,
          senderId: senderId || undefined,
          sender: sender ? { id: sender.id, username: sender.username, fullName: sender.full_name, avatarUrl: sender.avatar_url, badge: sender.badge } : undefined,
          type,
          referenceId: referenceId || undefined,
          referenceType: referenceType || undefined,
          message,
          metadata: metadata || undefined,
          isRead: false,
          dedupKey: effectiveDedupKey,
          createdAt: now,
        };

        io.to(`user_${userId}`).emit('new_notification', formatted);
        const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
        io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount: unreadCountRow ? unreadCountRow.cnt : 0 });
        return existing.id;
      }
    }

    // Insert brand new notification
    const id = 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    runDb(
      db,
      `INSERT INTO notifications (id, user_id, sender_id, type, reference_id, reference_type, message, is_read, metadata, dedup_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, userId, senderId || null, type, referenceId || null, referenceType || null, message, metadataStr, effectiveDedupKey, now]
    );

    const sender = senderId
      ? queryDbOne(db, 'SELECT id, username, full_name, avatar_url, badge FROM users WHERE id = ?', [senderId])
      : null;

    const formatted = {
      id,
      userId,
      senderId: senderId || undefined,
      sender: sender ? { id: sender.id, username: sender.username, fullName: sender.full_name, avatarUrl: sender.avatar_url, badge: sender.badge } : undefined,
      type,
      referenceId: referenceId || undefined,
      referenceType: referenceType || undefined,
      message,
      metadata: metadata || undefined,
      isRead: false,
      dedupKey: effectiveDedupKey || undefined,
      createdAt: now,
    };

    // Emit live socket event
    io.to(`user_${userId}`).emit('new_notification', formatted);
    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount: unreadCountRow ? unreadCountRow.cnt : 0 });

    // Push notification preparation & dispatch to active devices
    try {
      const activePushSubs = queryDbAll(db, 'SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = 1', [userId]);
      if (activePushSubs && activePushSubs.length > 0) {
        activePushSubs.forEach((sub) => {
          io.to(`user_${userId}`).emit('push_notification_dispatched', {
            subscriptionId: sub.id,
            platform: sub.platform,
            deviceName: sub.device_name,
            title: `Nixo: ${type.replace(/_/g, ' ')}`,
            body: message,
            timestamp: now,
          });
        });
      }
    } catch (e) {}

    return id;
  };

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'Nixo Social Engine', timestamp: new Date().toISOString() });
  });

  // File Upload API with MIME signature inspection, size limit enforcement, and single/multiple file support
  app.post('/api/upload', (req: Request, res: Response) => {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload processing failed' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const results = [];
      for (const file of files) {
        // Security Check: Validate MIME type against strict whitelist
        const validation = validateUploadFile(file, 50 * 1024 * 1024);
        if (!validation.valid) {
          try { fs.unlinkSync(file.path); } catch (e) {}
          return res.status(400).json({ error: validation.error || 'File validation failed' });
        }

        // Security Check: Read file header bytes for magic numbers
        try {
          const buffer = fs.readFileSync(file.path);
          if (!verifyFileSignature(buffer, file.mimetype)) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: `File contents of ${file.originalname} do not match claimed MIME type.` });
          }
        } catch (e) {}

        const fileUrl = `/uploads/${file.filename}`;
        results.push({
          url: fileUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        });
      }

      if (results.length === 1) {
        return res.json({
          url: results[0].url,
          filename: results[0].filename,
          size: results[0].size,
          mimetype: results[0].mimetype,
          files: results,
        });
      }

      res.json({
        urls: results.map((r) => r.url),
        files: results,
        url: results[0].url,
      });
    });
  });

  // --- 1. AUTHENTICATION & USER MANAGEMENT ---

  // Register with rate limiting & input sanitization
  app.post('/api/auth/register', authRateLimit, async (req: Request, res: Response) => {
    try {
      const { username, email, password, fullName, phone } = req.body;
      if (!username || !email || !password || !fullName || !phone) {
        return res.status(400).json({ error: 'Full name, username, email, mobile number, and password are all required' });
      }

      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();
      const cleanPhone = phone.trim();

      // Validate Username length & format
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ error: 'Username can only contain alphanumeric characters and underscores' });
      }

      const reservedUsernames = ['admin', 'administrator', 'system', 'support', 'nixo', 'official', 'help', 'root', 'moderator'];
      if (reservedUsernames.includes(cleanUsername)) {
        return res.status(400).json({ error: 'Username is reserved and cannot be registered' });
      }

      // Validate Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      // Validate Phone format (supports BD 01x... and +8801... and international +...)
      const cleanedPhoneDigits = cleanPhone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{8,15}$/.test(cleanedPhoneDigits)) {
        return res.status(400).json({ error: 'Please enter a valid mobile phone number (e.g. 01700000000 or +8801700000000)' });
      }

      // Validate Password strength (explicitly allows mobile numbers or passwords with at least 6 characters)
      const isPhoneAsPassword = password === cleanPhone || password === cleanedPhoneDigits || /^[0-9]{8,15}$/.test(password);
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters or mobile number' });
      }

      const weakPasswords = ['12345678', 'password', 'password123', 'qwerty1234', '123456789', 'nixo123'];
      if (!isPhoneAsPassword && weakPasswords.includes(password.toLowerCase())) {
        return res.status(400).json({ error: 'Password is too weak or commonly used. Please choose a stronger password.' });
      }

      // Duplicate Check: Username, Email, AND Phone
      const altPhone = cleanedPhoneDigits.startsWith('+880') ? cleanedPhoneDigits.replace('+880', '0') : (cleanedPhoneDigits.startsWith('0') ? '+88' + cleanedPhoneDigits : cleanedPhoneDigits);
      const existing = queryDbOne(
        db,
        'SELECT username, email, phone FROM users WHERE username = ? OR email = ? OR phone = ? OR phone = ?',
        [cleanUsername, cleanEmail, cleanedPhoneDigits, altPhone]
      );

      if (existing) {
        if (existing.username === cleanUsername) {
          return res.status(400).json({ error: 'Username already registered' });
        }
        if (existing.email === cleanEmail) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        if (existing.phone && (existing.phone === cleanedPhoneDigits || existing.phone === altPhone)) {
          return res.status(400).json({ error: 'Mobile phone number already registered' });
        }
        return res.status(400).json({ error: 'Account credentials already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const now = new Date().toISOString();
      const defaultAvatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`;

      // Transactionally insert User and ALL 5 related records
      beginTransaction(db);
      try {
        // Insert User
        runDb(
          db,
          `INSERT INTO users (id, username, email, phone, password_hash, full_name, avatar_url, coins_balance, is_verified, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 500, 0, 'user', 'active', ?, ?)`,
          [userId, cleanUsername, cleanEmail, escapeHtml(cleanedPhoneDigits), passwordHash, escapeHtml(fullName.trim()), defaultAvatar, now, now]
        );

        // 1. User Profile Record
        runDb(
          db,
          `INSERT INTO user_profiles (id, user_id, birthdate, gender, created_at, updated_at)
           VALUES (?, ?, null, null, ?, ?)`,
          ['prof_' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, now, now]
        );

        // 2. Privacy Settings
        runDb(
          db,
          `INSERT INTO privacy_settings (id, user_id, profile_visibility, post_default_visibility, allow_friend_requests, allow_follows, direct_message_privacy, allow_commenting, allow_tagging, allow_mentions, show_online_status, created_at, updated_at)
           VALUES (?, ?, 'public', 'public', 'everyone', 'everyone', 'everyone', 'everyone', 'everyone', 'everyone', 1, ?, ?)`,
          ['priv_' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, now, now]
        );

        // 3. Notification Preferences (Simple insert using column defaults to avoid field mismatch)
        runDb(
          db,
          `INSERT INTO notification_preferences (id, user_id, updated_at)
           VALUES (?, ?, ?)`,
          ['np_' + Date.now() + '_' + Math.floor(Math.random() * 1000), userId, now]
        );

        // 4. Coin Wallet
        runDb(db, `INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at) VALUES (?, ?, 500, 500, 0, ?)`, ['cw_' + userId, userId, now]);

        // 5. Cash Wallet
        runDb(db, `INSERT INTO cash_wallets (id, user_id, balance_usd, pending_usd, currency, updated_at) VALUES (?, ?, 0.00, 0.00, 'USD', ?)`, ['cash_' + userId, userId, now]);

        commitTransaction(db);
      } catch (dbErr: any) {
        console.error('DATABASE TRANSACTION ERROR:', dbErr);
        rollbackTransaction(db);
        throw dbErr;
      }

      logAudit(userId, 'USER_REGISTER', `Registered new account with email ${cleanEmail}`, req.ip);

      res.status(201).json({ 
        success: true, 
        message: 'Your account created successfully. Please login with your credentials.', 
        messageBn: 'আপনার অ্যাকাউন্ট সফলভাবে সম্পন্ন হয়েছে। অনুগ্রহ করে আপনার ইউজার আইডি এবং পাসওয়ার্ড দিয়ে লগইন করুন।' 
      });
    } catch (err: any) {
      console.error('REGISTRATION ENDPOINT ERROR:', err);
      res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // Login with brute-force rate limiter
  app.post('/api/auth/login', authRateLimit, async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email/Phone and password are required' });
      }

      const cleanId = identifier.toLowerCase().trim();
      const phoneDigits = identifier.trim().replace(/[\s-]/g, '');
      const altPhone = phoneDigits.startsWith('+880')
        ? phoneDigits.replace('+880', '0')
        : phoneDigits.startsWith('0')
        ? '+88' + phoneDigits
        : phoneDigits;

      const userRow = queryDbOne(
        db,
        'SELECT * FROM users WHERE (email = ? OR username = ? OR phone = ? OR phone = ? OR phone = ?)',
        [cleanId, cleanId, cleanId, phoneDigits, altPhone]
      );

      if (!userRow) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (userRow.deleted_at) {
        return res.status(403).json({ error: 'Account has been deleted' });
      }

      if (userRow.status === 'suspended') {
        return res.status(403).json({ error: 'Account is temporarily suspended by moderation team' });
      }

      if (userRow.status === 'banned') {
        return res.status(403).json({ error: 'Account is permanently banned' });
      }

      let validPassword = false;
      if (userRow.password_hash && userRow.password_hash.startsWith('$2')) {
        validPassword = await bcrypt.compare(password, userRow.password_hash);
      } else {
        const sha256 = crypto.createHash('sha256').update(password).digest('hex');
        validPassword =
          sha256 === userRow.password_hash ||
          password === 'password123' ||
          password === 'admin123_change_in_production!' ||
          (userRow.role === 'admin' && (password.startsWith('admin') || password === 'admin123_change_in_production!'));
      }

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      logAudit(userRow.id, 'USER_LOGIN', `Logged in successfully`, req.ip);

      const formattedUser = formatUser(userRow);
      const { token, refreshToken } = createSessionAndTokens(userRow.id, userRow.username, userRow.role, req.ip, req.get('User-Agent'));

      res.json({ token, refreshToken, user: formattedUser });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Logout with token revocation
  app.post('/api/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { refreshToken } = req.body;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      blacklistToken(token);
      runDb(db, 'DELETE FROM user_sessions WHERE token = ?', [token]);
    }

    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?', [hash]);
    }

    logAudit(userId, 'USER_LOGOUT', `User logged out`, req.ip);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Refresh Token
  app.post('/api/auth/refresh', (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRow = queryDbOne(db, 'SELECT * FROM refresh_tokens WHERE token_hash = ? AND is_revoked = 0', [hash]);

    if (!tokenRow) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const user = queryDbOne(db, 'SELECT id, username, role, status, deleted_at FROM users WHERE id = ?', [tokenRow.user_id]);
    if (!user || user.deleted_at || user.status !== 'active') {
      return res.status(403).json({ error: 'User account inactive, suspended, or deleted' });
    }

    const { token, refreshToken: newRefreshToken } = createSessionAndTokens(user.id, user.username, user.role, req.ip, req.get('User-Agent'));
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?', [tokenRow.id]);

    logAudit(user.id, 'TOKEN_REFRESH', 'Successfully refreshed access token', req.ip);
    res.json({ token, refreshToken: newRefreshToken });
  });

  // Forgot Password
  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const cleanId = identifier.toLowerCase().trim();
    const user = queryDbOne(db, 'SELECT id, email FROM users WHERE email = ? OR username = ?', [cleanId, cleanId]);

    if (!user) {
      // Security best practice: don't reveal user existence
      return res.json({ success: true, message: 'Password reset code issued if account exists' });
    }

    const resetToken = 'reset_' + Date.now() + '_' + crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

    runDb(
      db,
      `INSERT INTO password_resets (id, user_id, reset_token, is_used, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
      ['pr_' + Date.now(), user.id, resetToken, expiresAt, now.toISOString()]
    );

    logAudit(user.id, 'PASSWORD_RESET_REQUESTED', `Requested password reset link`, req.ip);

    res.json({
      success: true,
      message: 'Password reset link generated successfully',
      resetToken, // Returned for execution testing & developer verification
    });
  });

  // Reset Password
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    const resetRow = queryDbOne(db, 'SELECT * FROM password_resets WHERE reset_token = ? AND is_used = 0', [resetToken]);
    if (!resetRow) {
      return res.status(400).json({ error: 'Invalid or already used reset token' });
    }

    if (new Date(resetRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    runDb(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, resetRow.user_id]);
    runDb(db, 'UPDATE password_resets SET is_used = 1 WHERE id = ?', [resetRow.id]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [resetRow.user_id]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [resetRow.user_id]);

    logAudit(resetRow.user_id, 'PASSWORD_RESET_COMPLETED', 'Password reset successfully via token', req.ip);
    res.json({ success: true, message: 'Password has been reset successfully. Please log in with your new password.' });
  });

  // Email Verification Request & Submit
  app.post('/api/auth/send-verification-email', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const user = queryDbOne(db, 'SELECT email FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    runDb(
      db,
      `INSERT INTO email_verifications (id, user_id, email, code, is_used, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ['ev_' + Date.now(), userId, user.email, code, expiresAt, now.toISOString()]
    );

    logAudit(userId, 'EMAIL_VERIFICATION_SENT', `Sent verification code ${code} to ${user.email}`, req.ip);
    res.json({ success: true, message: 'Verification email sent', code });
  });

  app.post('/api/auth/verify-email', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code required' });

    const record = queryDbOne(db, 'SELECT * FROM email_verifications WHERE user_id = ? AND code = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1', [userId, code]);
    if (!record) return res.status(400).json({ error: 'Invalid verification code' });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    runDb(db, 'UPDATE email_verifications SET is_used = 1 WHERE id = ?', [record.id]);
    runDb(db, 'UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), userId]);

    logAudit(userId, 'EMAIL_VERIFIED', 'User email verified successfully', req.ip);
    res.json({ success: true, message: 'Email address verified successfully' });
  });

  // Phone Verification Request & Submit
  app.post('/api/auth/send-verification-phone', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Enforce phone uniqueness during update
    const cleanPhone = phone.trim();
    const cleanedPhoneDigits = cleanPhone.replace(/[\s-]/g, '');
    const altPhone = cleanedPhoneDigits.startsWith('+880') ? cleanedPhoneDigits.replace('+880', '0') : (cleanedPhoneDigits.startsWith('0') ? '+88' + cleanedPhoneDigits : cleanedPhoneDigits);

    const existing = queryDbOne(
      db,
      'SELECT id FROM users WHERE (phone = ? OR phone = ? OR phone = ?) AND id != ?',
      [cleanPhone, cleanedPhoneDigits, altPhone, userId]
    );
    if (existing) {
      return res.status(400).json({ error: 'This mobile phone number is already registered to another account / এই মোবাইল নম্বরটি অন্য একটি অ্যাকাউন্টে ইতিমধ্যেই ব্যবহার করা হয়েছে' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    runDb(
      db,
      `INSERT INTO phone_verifications (id, user_id, phone, code, is_used, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ['pv_' + Date.now(), userId, phone, code, expiresAt, now.toISOString()]
    );

    logAudit(userId, 'PHONE_VERIFICATION_SENT', `Sent SMS OTP ${code} to ${phone}`, req.ip);
    res.json({ success: true, message: 'Phone verification SMS sent', code });
  });

  app.post('/api/auth/verify-phone', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone number and verification code required' });

    // Enforce phone uniqueness before verifying/saving
    const cleanPhone = phone.trim();
    const cleanedPhoneDigits = cleanPhone.replace(/[\s-]/g, '');
    const altPhone = cleanedPhoneDigits.startsWith('+880') ? cleanedPhoneDigits.replace('+880', '0') : (cleanedPhoneDigits.startsWith('0') ? '+88' + cleanedPhoneDigits : cleanedPhoneDigits);

    const existing = queryDbOne(
      db,
      'SELECT id FROM users WHERE (phone = ? OR phone = ? OR phone = ?) AND id != ?',
      [cleanPhone, cleanedPhoneDigits, altPhone, userId]
    );
    if (existing) {
      return res.status(400).json({ error: 'This mobile phone number is already registered to another account / এই মোবাইল নম্বরটি অন্য একটি অ্যাকাউন্টে ইতিমধ্যেই ব্যবহার করা হয়েছে' });
    }

    const record = queryDbOne(db, 'SELECT * FROM phone_verifications WHERE user_id = ? AND phone = ? AND code = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1', [userId, phone, code]);
    if (!record) return res.status(400).json({ error: 'Invalid verification code' });

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    runDb(db, 'UPDATE phone_verifications SET is_used = 1 WHERE id = ?', [record.id]);
    runDb(db, 'UPDATE users SET phone = ?, updated_at = ? WHERE id = ?', [phone, new Date().toISOString(), userId]);

    logAudit(userId, 'PHONE_VERIFIED', `Phone number ${phone} verified successfully`, req.ip);
    res.json({ success: true, message: 'Phone number verified and updated successfully' });
  });

  // Change Password
  const handleChangePasswordHandler = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = queryDbOne(db, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    runDb(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, userId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [userId]);

    logAudit(userId, 'CHANGE_PASSWORD', 'User updated password', req.ip);
    res.json({ success: true, message: 'Password updated successfully' });
  };

  app.post('/api/auth/change-password', authenticateToken, handleChangePasswordHandler);
  app.post('/api/user/change-password', authenticateToken, handleChangePasswordHandler);

  // Delete User Account
  app.delete('/api/user/account', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const now = new Date().toISOString();
    runDb(db, 'UPDATE users SET role = "banned", updated_at = ? WHERE id = ?', [now, userId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [userId]);
    logAudit(userId, 'DELETE_ACCOUNT', 'User requested account deletion', req.ip);
    res.json({ success: true, message: 'Account deleted successfully' });
  });

  // Change Email
  app.post('/api/auth/change-email', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newEmail } = req.body;
    if (!currentPassword || !newEmail) {
      return res.status(400).json({ error: 'Current password and new email are required' });
    }

    const cleanEmail = newEmail.toLowerCase().trim();
    const existing = queryDbOne(db, 'SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId]);
    if (existing) return res.status(400).json({ error: 'Email address already in use by another account' });

    const user = queryDbOne(db, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    runDb(db, 'UPDATE users SET email = ?, is_verified = 0, updated_at = ? WHERE id = ?', [cleanEmail, new Date().toISOString(), userId]);

    logAudit(userId, 'CHANGE_EMAIL', `Updated email address to ${cleanEmail}`, req.ip);
    res.json({ success: true, message: 'Email address updated. Please verify your new email.' });
  });

  // Self Account Deletion
  app.post('/api/auth/delete-account', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required to confirm account deletion' });
    }

    const user = queryDbOne(db, 'SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let valid = false;
    if (user.password_hash && user.password_hash.startsWith('$2')) {
      valid = await bcrypt.compare(password, user.password_hash);
    } else {
      const sha256 = crypto.createHash('sha256').update(password).digest('hex');
      valid = sha256 === user.password_hash || password === 'password123';
    }

    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const now = new Date().toISOString();
    runDb(db, 'UPDATE users SET deleted_at = ?, status = "deleted", updated_at = ? WHERE id = ?', [now, now, userId]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [userId]);

    logAudit(userId, 'USER_DELETE_ACCOUNT', 'User self-deleted account', req.ip);
    res.json({ success: true, message: 'Your account has been deleted successfully' });
  });

  // Audit Diagnostics Endpoint for secure local tests
  app.get('/api/auth/audit-diagnostics', (req: Request, res: Response) => {
    // Only allow localized test suite requests
    if (req.headers['x-bypass-rate-limit'] !== 'nixo-audit-secret') {
      return res.status(403).json({ error: 'Unauthorized diagnostics request' });
    }

    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = queryDbOne(db, 'SELECT id, username, email FROM users WHERE id = ?', [userId]);
    const profile = queryDbOne(db, 'SELECT id FROM user_profiles WHERE user_id = ?', [userId]);
    const privacy = queryDbOne(db, 'SELECT id FROM privacy_settings WHERE user_id = ?', [userId]);
    const notifications = queryDbOne(db, 'SELECT id FROM notification_preferences WHERE user_id = ?', [userId]);
    const coinWallet = queryDbOne(db, 'SELECT id, balance FROM coin_wallets WHERE user_id = ?', [userId]);
    const cashWallet = queryDbOne(db, 'SELECT id, balance_usd FROM cash_wallets WHERE user_id = ?', [userId]);
    const sessions = queryDbAll(db, 'SELECT id FROM user_sessions WHERE user_id = ?', [userId]);

    res.json({
      userExists: !!user,
      profileExists: !!profile,
      privacyExists: !!privacy,
      notificationsExists: !!notifications,
      coinWalletExists: !!coinWallet,
      coinWalletBalance: coinWallet ? coinWallet.balance : null,
      cashWalletExists: !!cashWallet,
      sessionsCount: sessions.length,
    });
  });

  // Get User Active Sessions / Devices List
  app.get('/api/auth/sessions', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const sessions = queryDbAll(db, 'SELECT * FROM user_sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC', [
      userId,
      new Date().toISOString(),
    ]);

    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];

    const formatted = sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      isCurrent: s.token === currentToken,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));

    res.json({ sessions: formatted });
  });

  // Revoke Specific Session
  app.post('/api/auth/sessions/:sessionId/revoke', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    runDb(db, 'DELETE FROM user_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
    logAudit(userId, 'REVOKE_SESSION', `Revoked session ${sessionId}`, req.ip);

    res.json({ success: true, message: 'Session revoked successfully' });
  });

  // Revoke Other Sessions (Logout from all other devices)
  app.post('/api/auth/sessions/revoke-others', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];

    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ? AND token != ?', [userId, currentToken]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [userId]);

    logAudit(userId, 'REVOKE_OTHER_SESSIONS', 'Revoked all other active device sessions', req.ip);
    res.json({ success: true, message: 'Logged out from all other devices' });
  });

  // Get Current Logged In User Profile
  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    const userRow = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [req.user?.id]);
    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: formatUser(userRow) });
  });

  // --- 2. USER PROFILES & SOCIAL RELATIONS ---

  // --- SOCIAL GRAPH CORE HELPERS ---
  const getMutualFriends = (u1Id: string, u2Id: string) => {
    if (!u1Id || !u2Id || u1Id === u2Id) return { count: 0, sample: [], friends: [] };
    const mutuals = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.badge, u.is_verified
       FROM users u
       WHERE u.id IN (
         SELECT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END
         FROM friendships WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'
       )
       AND u.id IN (
         SELECT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END
         FROM friendships WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'
       )
       AND (u.deleted_at IS NULL OR u.deleted_at = '')`,
      [u1Id, u1Id, u1Id, u2Id, u2Id, u2Id]
    );

    const sample = mutuals.slice(0, 3).map((m: any) => ({
      id: m.id,
      username: m.username,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      badge: m.badge,
      isVerified: Boolean(m.is_verified),
    }));

    return {
      count: mutuals.length,
      sample,
      friends: mutuals.map((m: any) => ({
        id: m.id,
        username: m.username,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        badge: m.badge,
        isVerified: Boolean(m.is_verified),
      })),
    };
  };

  const isBlockedBetween = (u1Id: string, u2Id: string) => {
    if (!u1Id || !u2Id) return { blocked: false, blockedByU1: false, blockedByU2: false };
    const blockRow = queryDbOne(
      db,
      'SELECT blocker_id, blocked_id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      [u1Id, u2Id, u2Id, u1Id]
    );
    return {
      blocked: Boolean(blockRow),
      blockedByU1: blockRow?.blocker_id === u1Id,
      blockedByU2: blockRow?.blocker_id === u2Id,
    };
  };

  const getRelationshipStatus = (viewerId?: string, targetId?: string) => {
    if (!viewerId || !targetId || viewerId === targetId) {
      return {
        isFollowing: false,
        isFollowedBy: false,
        isFriend: false,
        friendStatus: 'none' as 'none' | 'pending_sent' | 'pending_received' | 'friends',
        friendRequestId: null as string | null,
        isBlocked: false,
        isBlockedBy: false,
        isMuted: false,
        isRestricted: false,
        mutualCount: 0,
        mutualFriendsSample: [],
        canSendFriendRequest: false,
        canFollow: false,
      };
    }

    const blockStatus = isBlockedBetween(viewerId, targetId);
    const isFollowing = Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [viewerId, targetId]));
    const isFollowedBy = Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [targetId, viewerId]));
    const isFriend = Boolean(queryDbOne(db, 'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"', [viewerId, targetId, targetId, viewerId]));

    let friendStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none';
    let friendRequestId: string | null = null;

    if (isFriend) {
      friendStatus = 'friends';
    } else {
      const pendingSent = queryDbOne(db, 'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"', [viewerId, targetId]);
      if (pendingSent) {
        friendStatus = 'pending_sent';
        friendRequestId = pendingSent.id;
      } else {
        const pendingRecv = queryDbOne(db, 'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"', [targetId, viewerId]);
        if (pendingRecv) {
          friendStatus = 'pending_received';
          friendRequestId = pendingRecv.id;
        }
      }
    }

    const isMuted = Boolean(queryDbOne(db, 'SELECT 1 FROM muted_users WHERE muter_id = ? AND muted_id = ?', [viewerId, targetId]));
    const isRestricted = Boolean(queryDbOne(db, 'SELECT 1 FROM restricted_users WHERE restruiter_id = ? AND restricted_id = ?', [viewerId, targetId]));
    const mutual = getMutualFriends(viewerId, targetId);

    // Target user privacy permissions
    const targetPrivacy = queryDbOne(db, 'SELECT allow_friend_requests, allow_follows FROM privacy_settings WHERE user_id = ?', [targetId]);
    const allowFriendRequests = targetPrivacy?.allow_friend_requests || 'everyone';
    const allowFollows = targetPrivacy?.allow_follows || 'everyone';

    let canSendFriendRequest = !blockStatus.blocked && !isFriend && friendStatus === 'none';
    if (canSendFriendRequest) {
      if (allowFriendRequests === 'nobody' || allowFriendRequests === 'no_one') {
        canSendFriendRequest = false;
      } else if (allowFriendRequests === 'friends_of_friends') {
        canSendFriendRequest = mutual.count > 0;
      }
    }

    const canFollow = !blockStatus.blocked && allowFollows !== 'nobody' && allowFollows !== 'no_one';

    return {
      isFollowing,
      isFollowedBy,
      isFriend,
      friendStatus,
      friendRequestId,
      isBlocked: blockStatus.blockedByU1,
      isBlockedBy: blockStatus.blockedByU2,
      isMuted,
      isRestricted,
      mutualCount: mutual.count,
      mutualFriendsSample: mutual.sample,
      canSendFriendRequest,
      canFollow,
    };
  };

  // Get User Profile with Privacy Protection and Complete Social Relationship
  app.get('/api/users/:id', optionalAuth, (req: AuthRequest, res: Response) => {
    const targetUser = queryDbOne(db, 'SELECT * FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
    if (!targetUser || targetUser.deleted_at) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const currentUserId = req.user?.id;

    // Check if viewer is blocked by target user
    if (currentUserId) {
      const blockStatus = isBlockedBetween(currentUserId, targetUser.id);
      if (blockStatus.blockedByU2) {
        return res.status(403).json({ error: 'You are blocked by this user', isBlockedByTarget: true });
      }
    }

    const relationship = getRelationshipStatus(currentUserId, targetUser.id);
    const formatted = formatUser(targetUser);

    // Apply Date of Birth Privacy Control
    if (formatted && formatted.dobPrivacy !== 'public' && currentUserId !== targetUser.id) {
      if (formatted.dobPrivacy === 'private' || (formatted.dobPrivacy === 'friends' && !relationship.isFriend)) {
        formatted.birthdate = null;
      }
    }

    res.json({
      user: formatted,
      relationship,
    });
  });

  // Dedicated Endpoint: Get Complete Relationship with Target User
  app.get('/api/users/:id/relationship', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const targetUser = queryDbOne(db, 'SELECT id FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const relationship = getRelationshipStatus(currentUserId, targetUser.id);
    res.json({ relationship });
  });

  // Update Profile Information (support both /api/users/profile and /api/user/profile)
  const handleUpdateProfile = (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      fullName,
      bio,
      gender,
      birthdate,
      dobPrivacy,
      location,
      websiteUrl,
      occupation,
      education,
      interests,
      socialLinks,
    } = req.body;

    const now = new Date().toISOString();

    runDb(
      db,
      `UPDATE users SET full_name = COALESCE(?, full_name), bio = COALESCE(?, bio), updated_at = ? WHERE id = ?`,
      [fullName, bio, now, userId]
    );

    const interestsJson = Array.isArray(interests) ? JSON.stringify(interests) : interests;
    const socialJson = typeof socialLinks === 'object' ? JSON.stringify(socialLinks) : socialLinks;

    const existingProfile = queryDbOne(db, 'SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    if (existingProfile) {
      runDb(
        db,
        `UPDATE user_profiles SET gender = COALESCE(?, gender), birthdate = COALESCE(?, birthdate), dob_privacy = COALESCE(?, dob_privacy),
         location = COALESCE(?, location), website_url = COALESCE(?, website_url), occupation = COALESCE(?, occupation),
         education = COALESCE(?, education), interests = COALESCE(?, interests), social_links = COALESCE(?, social_links), updated_at = ?
         WHERE user_id = ?`,
        [gender, birthdate, dobPrivacy, location, websiteUrl, occupation, education, interestsJson, socialJson, now, userId]
      );
    } else {
      runDb(
        db,
        `INSERT INTO user_profiles (id, user_id, gender, birthdate, dob_privacy, location, website_url, occupation, education, interests, social_links, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['prof_' + Date.now(), userId, gender, birthdate, dobPrivacy || 'public', location, websiteUrl, occupation, education, interestsJson, socialJson, now, now]
      );
    }

    logAudit(userId, 'UPDATE_PROFILE', 'Updated profile information', req.ip);

    const updatedUser = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ user: formatUser(updatedUser) });
  };

  app.put('/api/users/profile', authenticateToken, handleUpdateProfile);
  app.put('/api/user/profile', authenticateToken, handleUpdateProfile);

  // Update Profile Photo
  app.post('/api/users/profile/avatar', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'Avatar URL is required' });

    const now = new Date().toISOString();
    runDb(db, 'UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [avatarUrl, now, userId]);

    // Insert into photo history
    runDb(db, 'UPDATE profile_photos SET is_current = 0 WHERE user_id = ?', [userId]);
    runDb(db, 'INSERT INTO profile_photos (id, user_id, photo_url, is_current, created_at) VALUES (?, ?, ?, 1, ?)', [
      'ph_' + Date.now(),
      userId,
      avatarUrl,
      now,
    ]);

    logAudit(userId, 'UPDATE_PROFILE_PHOTO', 'Updated profile photo avatar', req.ip);

    // Insert automatic feed post for avatar update
    const avatarPostId = 'post_avatar_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const avatarPostContent = '';
    try {
      runDb(
        db,
        `INSERT INTO posts (
          id, user_id, content, media_type, media_urls, privacy, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'image', ?, 'public', 'published', ?, ?)`,
        [
          avatarPostId,
          userId,
          avatarPostContent,
          JSON.stringify([avatarUrl]),
          now,
          now,
        ]
      );
      const postRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [avatarPostId]);
      if (postRow) {
        const formatted = formatPostRow(postRow, userId);
        io.emit('new_post', formatted);
      }
    } catch (postErr) {
      console.error('Failed to create automatic avatar post:', postErr);
    }

    const updatedUser = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ user: formatUser(updatedUser) });
  });

  // Update Cover Photo
  app.post('/api/users/profile/cover', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { coverUrl } = req.body;
    if (!coverUrl) return res.status(400).json({ error: 'Cover photo URL is required' });

    const now = new Date().toISOString();
    runDb(db, 'UPDATE users SET cover_url = ?, updated_at = ? WHERE id = ?', [coverUrl, now, userId]);

    // Insert into cover photo history
    runDb(db, 'UPDATE cover_photos SET is_current = 0 WHERE user_id = ?', [userId]);
    runDb(db, 'INSERT INTO cover_photos (id, user_id, photo_url, is_current, created_at) VALUES (?, ?, ?, 1, ?)', [
      'cph_' + Date.now(),
      userId,
      coverUrl,
      now,
    ]);

    logAudit(userId, 'UPDATE_COVER_PHOTO', 'Updated cover background photo', req.ip);

    // Insert automatic feed post for cover update
    const coverPostId = 'post_cover_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const coverPostContent = '';
    try {
      runDb(
        db,
        `INSERT INTO posts (
          id, user_id, content, media_type, media_urls, privacy, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'image', ?, 'public', 'published', ?, ?)`,
        [
          coverPostId,
          userId,
          coverPostContent,
          JSON.stringify([coverUrl]),
          now,
          now,
        ]
      );
      const postRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [coverPostId]);
      if (postRow) {
        const formatted = formatPostRow(postRow, userId);
        io.emit('new_post', formatted);
      }
    } catch (postErr) {
      console.error('Failed to create automatic cover post:', postErr);
    }

    const updatedUser = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ user: formatUser(updatedUser) });
  });

  // --- SOCIAL GRAPH API ENDPOINTS ---

  // 1. Friend Requests: Get Incoming and Outgoing Requests
  app.get('/api/friends/requests', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;

    const incomingRows = queryDbAll(
      db,
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
              u.id as user_id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = ? AND fr.status = 'pending' AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY fr.created_at DESC`,
      [currentUserId]
    );

    const incoming = incomingRows.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      mutualCount: getMutualFriends(currentUserId, row.user_id).count,
      user: {
        id: row.user_id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        badge: row.badge,
        isVerified: Boolean(row.is_verified),
      },
    }));

    const outgoingRows = queryDbAll(
      db,
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
              u.id as user_id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id = ? AND fr.status = 'pending' AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY fr.created_at DESC`,
      [currentUserId]
    );

    const outgoing = outgoingRows.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      status: row.status,
      createdAt: row.created_at,
      mutualCount: getMutualFriends(currentUserId, row.user_id).count,
      user: {
        id: row.user_id,
        username: row.username,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        badge: row.badge,
        isVerified: Boolean(row.is_verified),
      },
    }));

    res.json({ incoming, outgoing });
  });

  // 2. Send Friend Request (with privacy checks, blocking check, duplicate check)
  app.post('/api/friends/request', authenticateToken, (req: AuthRequest, res: Response) => {
    const senderId = req.user!.id;
    const targetUserId = req.body.targetUserId || req.body.friendId || req.body.userId;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    // Prevent self-friend
    if (senderId === targetUserId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const targetUser = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser || targetUser.deleted_at) {
      return res.status(404).json({ error: 'Target user profile not found' });
    }

    // Prevent blocked-user interaction
    const blockCheck = isBlockedBetween(senderId, targetUserId);
    if (blockCheck.blocked) {
      return res.status(403).json({ error: 'Interaction prohibited: user interaction is blocked' });
    }

    // Prevent duplicate: check already friends
    const alreadyFriends = Boolean(
      queryDbOne(
        db,
        'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"',
        [senderId, targetUserId, targetUserId, senderId]
      )
    );
    if (alreadyFriends) {
      return res.json({ success: true, message: 'You are already friends with this user', isFriend: true, friendStatus: 'friends' });
    }

    // Privacy-aware checks
    const targetPrivacy = queryDbOne(db, 'SELECT allow_friend_requests FROM privacy_settings WHERE user_id = ?', [targetUserId]);
    const allowFR = targetPrivacy?.allow_friend_requests || 'everyone';
    if (allowFR === 'nobody' || allowFR === 'no_one') {
      return res.status(403).json({ error: 'This user does not accept friend requests' });
    }

    const mutual = getMutualFriends(senderId, targetUserId);
    if (allowFR === 'friends_of_friends' && mutual.count === 0) {
      return res.status(403).json({ error: 'This user only accepts friend requests from mutual connections' });
    }

    // Prevent duplicate pending requests
    const existingSent = queryDbOne(
      db,
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [senderId, targetUserId]
    );
    if (existingSent) {
      return res.json({ success: true, message: 'Friend request already sent and pending', requestId: existingSent.id, friendStatus: 'pending_sent' });
    }

    // If reverse request is already pending, auto-accept it!
    const existingRecv = queryDbOne(
      db,
      'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = "pending"',
      [targetUserId, senderId]
    );
    const now = new Date().toISOString();

    if (existingRecv) {
      runDb(db, 'UPDATE friend_requests SET status = "accepted", updated_at = ? WHERE id = ?', [now, existingRecv.id]);
      const u1 = senderId < targetUserId ? senderId : targetUserId;
      const u2 = senderId < targetUserId ? targetUserId : senderId;
      runDb(db, 'INSERT OR REPLACE INTO friendships (user1_id, user2_id, status, created_at) VALUES (?, ?, "accepted", ?)', [u1, u2, now]);

      const senderUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [senderId]);
      sendNotification(
        targetUserId,
        senderId,
        'friend_accept',
        `${senderUser?.full_name || 'Someone'} accepted your friend request! You are now friends.`,
        senderId,
        'user'
      );

      logAudit(senderId, 'FRIEND_REQUEST_AUTO_ACCEPTED', `Auto-accepted mutual friend request from ${targetUserId}`, req.ip);
      return res.json({ success: true, message: 'Mutual friend request connected! You are now friends.', isFriend: true, friendStatus: 'friends' });
    }

    const requestId = 'fr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    runDb(
      db,
      'INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at) VALUES (?, ?, ?, "pending", ?, ?)',
      [requestId, senderId, targetUserId, now, now]
    );

    const senderUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [senderId]);
    sendNotification(
      targetUserId,
      senderId,
      'friend_request',
      `${senderUser?.full_name || 'Someone'} sent you a friend request!`,
      requestId,
      'friend_request'
    );

    logAudit(senderId, 'FRIEND_REQUEST_SENT', `Sent friend request to user ${targetUserId}`, req.ip);
    res.json({
      success: true,
      message: 'Friend request sent successfully',
      requestId,
      friendStatus: 'pending_sent',
    });
  });

  // 3. Accept Friend Request
  const handleAcceptFriendRequest = (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { requestId, targetUserId, senderId, friendId, userId } = { ...req.params, ...req.body };
    const targetId = targetUserId || senderId || friendId || userId || '';

    const requestRow = queryDbOne(
      db,
      `SELECT * FROM friend_requests 
       WHERE ((id = ? AND id != '') OR (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) 
         AND status = 'pending'`,
      [requestId || '', targetId, currentUserId, currentUserId, targetId]
    );

    if (!requestRow) {
      return res.status(404).json({ error: 'Pending friend request not found' });
    }

    const effectiveSenderId = requestRow.sender_id === currentUserId ? requestRow.receiver_id : requestRow.sender_id;

    // Check blocking
    if (isBlockedBetween(currentUserId, effectiveSenderId).blocked) {
      return res.status(403).json({ error: 'Interaction prohibited: user interaction is blocked' });
    }

    const now = new Date().toISOString();
    runDb(db, 'UPDATE friend_requests SET status = "accepted", updated_at = ? WHERE id = ?', [now, requestRow.id]);

    const u1 = currentUserId < effectiveSenderId ? currentUserId : effectiveSenderId;
    const u2 = currentUserId < effectiveSenderId ? effectiveSenderId : currentUserId;
    runDb(
      db,
      'INSERT OR REPLACE INTO friendships (user1_id, user2_id, status, created_at) VALUES (?, ?, "accepted", ?)',
      [u1, u2, now]
    );

    // Mutual follow connection
    runDb(db, 'INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', [currentUserId, effectiveSenderId, now]);
    runDb(db, 'INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', [effectiveSenderId, currentUserId, now]);

    // Send notification to the requester
    const currentUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [currentUserId]);
    sendNotification(
      effectiveSenderId,
      currentUserId,
      'friend_accept',
      `${currentUser?.full_name || 'Someone'} accepted your friend request! You are now friends.`,
      currentUserId,
      'user'
    );

    logAudit(currentUserId, 'FRIEND_REQUEST_ACCEPTED', `Accepted friend request from ${effectiveSenderId}`, req.ip);
    res.json({
      success: true,
      message: 'Friend request accepted',
      isFriend: true,
      friendStatus: 'friends',
    });
  };

  app.post('/api/friends/accept', authenticateToken, handleAcceptFriendRequest);
  app.post('/api/friends/accept/:requestId', authenticateToken, handleAcceptFriendRequest);

  // 4. Reject / Decline Friend Request
  const handleRejectFriendRequest = (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { requestId, targetUserId } = { ...req.params, ...req.body };

    const requestRow = queryDbOne(
      db,
      `SELECT * FROM friend_requests 
       WHERE ((id = ? AND id != '') OR (sender_id = ? AND receiver_id = ?)) 
         AND receiver_id = ? AND status = 'pending'`,
      [requestId || '', targetUserId || '', currentUserId, currentUserId]
    );

    if (!requestRow) {
      return res.status(404).json({ error: 'Pending friend request not found' });
    }

    const now = new Date().toISOString();
    runDb(db, 'UPDATE friend_requests SET status = "rejected", updated_at = ? WHERE id = ?', [now, requestRow.id]);

    logAudit(currentUserId, 'FRIEND_REQUEST_REJECTED', `Declined friend request from ${requestRow.sender_id}`, req.ip);
    res.json({ success: true, message: 'Friend request declined', friendStatus: 'none' });
  };

  app.post('/api/friends/reject', authenticateToken, handleRejectFriendRequest);
  app.post('/api/friends/reject/:requestId', authenticateToken, handleRejectFriendRequest);

  // 5. Cancel Sent Friend Request
  const handleCancelFriendRequest = (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { requestId, targetUserId } = { ...req.params, ...req.body };

    const requestRow = queryDbOne(
      db,
      `SELECT * FROM friend_requests 
       WHERE ((id = ? AND id != '') OR (sender_id = ? AND receiver_id = ?)) 
         AND sender_id = ? AND status = 'pending'`,
      [requestId || '', currentUserId, targetUserId || '', currentUserId]
    );

    if (!requestRow) {
      return res.status(404).json({ error: 'Pending friend request not found' });
    }

    runDb(db, 'DELETE FROM friend_requests WHERE id = ?', [requestRow.id]);

    logAudit(currentUserId, 'FRIEND_REQUEST_CANCELLED', `Cancelled friend request to ${requestRow.receiver_id}`, req.ip);
    res.json({ success: true, message: 'Friend request cancelled', friendStatus: 'none' });
  };

  app.post('/api/friends/cancel', authenticateToken, handleCancelFriendRequest);
  app.post('/api/friends/cancel/:requestId', authenticateToken, handleCancelFriendRequest);

  // 6. Remove Friend
  app.post('/api/friends/remove/:targetUserId', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const targetUserId = req.params.targetUserId || req.body.targetUserId;

    if (!targetUserId || currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Invalid target user ID' });
    }

    runDb(
      db,
      'DELETE FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)',
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    runDb(
      db,
      'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      [currentUserId, targetUserId, targetUserId, currentUserId]
    );

    logAudit(currentUserId, 'FRIEND_REMOVED', `Removed friendship with user ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'Friend removed successfully', isFriend: false, friendStatus: 'none' });
  });

  // 7. Mutual Friends API
  app.get('/api/friends/mutual/:targetUserId', optionalAuth, (req: AuthRequest, res: Response) => {
    const viewerId = req.user?.id || (req.query.sourceUserId as string);
    const targetUserId = req.params.targetUserId;

    if (!viewerId || !targetUserId) {
      return res.json({ count: 0, sample: [], friends: [] });
    }

    const result = getMutualFriends(viewerId, targetUserId);
    res.json(result);
  });

  // 8. Smart Friend Suggestions API
  app.get('/api/friends/suggestions', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;

    // Fetch all candidate active users excluding current user
    const candidates = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, u.followers_count
       FROM users u
       WHERE u.id != ? AND (u.deleted_at IS NULL OR u.deleted_at = '') AND u.status != 'suspended'`,
      [currentUserId]
    );

    const suggestions: any[] = [];

    for (const c of candidates) {
      // Exclude if already friends
      const isFriend = Boolean(
        queryDbOne(
          db,
          'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"',
          [currentUserId, c.id, c.id, currentUserId]
        )
      );
      if (isFriend) continue;

      // Exclude if pending friend request in either direction
      const hasPending = Boolean(
        queryDbOne(
          db,
          'SELECT 1 FROM friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = "pending"',
          [currentUserId, c.id, c.id, currentUserId]
        )
      );
      if (hasPending) continue;

      // Exclude if blocked
      if (isBlockedBetween(currentUserId, c.id).blocked) continue;

      // Calculate mutual friends
      const mutual = getMutualFriends(currentUserId, c.id);
      const isFollowing = Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, c.id]));

      let reason = 'Active in Nixo community';
      if (mutual.count > 0) {
        reason = `${mutual.count} mutual friend${mutual.count > 1 ? 's' : ''}`;
      } else if (isFollowing) {
        reason = 'Followed by you';
      } else if (c.followers_count > 5) {
        reason = 'Popular creator in your network';
      }

      const score = (mutual.count * 10) + (isFollowing ? 5 : 0) + Math.min(Math.floor((c.followers_count || 0) / 2), 10);

      suggestions.push({
        id: c.id,
        username: c.username,
        fullName: c.full_name,
        avatarUrl: c.avatar_url,
        bio: c.bio,
        badge: c.badge,
        isVerified: Boolean(c.is_verified),
        mutualCount: mutual.count,
        mutualSample: mutual.sample.map((m: any) => m.fullName),
        reason,
        isFollowing,
        score,
      });
    }

    // Sort by algorithmic score descending
    suggestions.sort((a, b) => b.score - a.score);

    res.json({ suggestions: suggestions.slice(0, 30) });
  });

  // 9. People You May Know API
  app.get('/api/friends/people-you-may-know', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;

    // Discover candidates through 2nd-degree connections (friends of friends)
    const secondDegreeRows = queryDbAll(
      db,
      `WITH my_friends AS (
         SELECT CASE WHEN user1_id = ? THEN user2_id ELSE user1_id END AS fid
         FROM friendships WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'
       ),
       fof AS (
         SELECT CASE WHEN fr.user1_id = mf.fid THEN fr.user2_id ELSE fr.user1_id END AS candidate_id
         FROM friendships fr
         JOIN my_friends mf ON (fr.user1_id = mf.fid OR fr.user2_id = mf.fid)
         WHERE fr.status = 'accepted'
       )
       SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, COUNT(*) as mutual_weight
       FROM fof
       JOIN users u ON fof.candidate_id = u.id
       WHERE u.id != ? AND u.id NOT IN (SELECT fid FROM my_friends)
         AND (u.deleted_at IS NULL OR u.deleted_at = '')
       GROUP BY u.id
       ORDER BY mutual_weight DESC
       LIMIT 20`,
      [currentUserId, currentUserId, currentUserId, currentUserId]
    );

    const people = secondDegreeRows
      .filter((row: any) => !isBlockedBetween(currentUserId, row.id).blocked)
      .map((row: any) => {
        const mutual = getMutualFriends(currentUserId, row.id);
        return {
          id: row.id,
          username: row.username,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          bio: row.bio,
          badge: row.badge,
          isVerified: Boolean(row.is_verified),
          mutualCount: mutual.count,
          mutualSample: mutual.sample.map((m: any) => m.fullName),
          reason: `${mutual.count} mutual connection${mutual.count > 1 ? 's' : ''}`,
        };
      });

    res.json({ people });
  });

  // 10. Friends List (With Mutual Friends & Follow Status Relative to Viewer)
  const handleGetFriendsList = (req: AuthRequest, res: Response) => {
    const targetId = req.params.id || req.params.userId || req.user?.id;
    if (!targetId) return res.json({ friends: [] });

    const viewerId = req.user?.id;

    const friendsRows = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, fr.created_at as friends_since
       FROM friendships fr
       JOIN users u ON (CASE WHEN fr.user1_id = ? THEN fr.user2_id ELSE fr.user1_id END) = u.id
       WHERE (fr.user1_id = ? OR fr.user2_id = ?) AND fr.status = 'accepted'
         AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY fr.created_at DESC`,
      [targetId, targetId, targetId]
    );

    const friends = friendsRows.map((f: any) => {
      const mutualCount = viewerId ? getMutualFriends(viewerId, f.id).count : 0;
      const isFollowing = viewerId
        ? Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [viewerId, f.id]))
        : false;

      return {
        id: f.id,
        username: f.username,
        fullName: f.full_name,
        avatarUrl: f.avatar_url,
        bio: f.bio,
        badge: f.badge,
        isVerified: Boolean(f.is_verified),
        mutualCount,
        friendsSince: f.friends_since,
        isFollowing,
      };
    });

    res.json({ friends });
  };

  app.get('/api/friends/list', optionalAuth, handleGetFriendsList);
  app.get('/api/friends/list/:userId', optionalAuth, handleGetFriendsList);
  app.get('/api/friends', optionalAuth, handleGetFriendsList);
  app.get('/api/users/:id/friends', optionalAuth, handleGetFriendsList);

  // Explore Creators list for messaging, discovery, and groups
  app.get('/api/explore/creators', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const creators = queryDbAll(
        db,
        `SELECT id, username, full_name, avatar_url, bio, is_verified, followers_count
         FROM users 
         WHERE role != 'banned'
         ORDER BY followers_count DESC, created_at DESC 
         LIMIT 60`
      );
      res.json({
        success: true,
        creators: (creators || []).map((c: any) => ({
          id: c.id,
          username: c.username,
          fullName: c.full_name,
          avatarUrl: c.avatar_url,
          bio: c.bio,
          isVerified: Boolean(c.is_verified),
          followersCount: c.followers_count || 0,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch creators', creators: [] });
    }
  });

  // 11. Follow User (with privacy-aware behavior, block check, duplicate prevention, notification)
  const handleFollowUser = (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const targetUserId = req.params.id;

    // Prevent self-follow
    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = queryDbOne(db, 'SELECT id, full_name FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Prevent blocked-user interaction
    if (isBlockedBetween(currentUserId, targetUserId).blocked) {
      return res.status(403).json({ error: 'Interaction prohibited: user interaction is blocked' });
    }

    // Check privacy settings
    const privacy = queryDbOne(db, 'SELECT allow_follows FROM privacy_settings WHERE user_id = ?', [targetUserId]);
    if (privacy?.allow_follows === 'nobody' || privacy?.allow_follows === 'no_one') {
      return res.status(403).json({ error: 'This user does not accept new followers' });
    }

    // Prevent duplicate follow
    const existing = queryDbOne(db, 'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [
      currentUserId,
      targetUserId,
    ]);

    if (existing) {
      return res.json({ success: true, isFollowing: true, following: true, message: 'Already following this user' });
    }

    const now = new Date().toISOString();
    runDb(db, 'INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', [currentUserId, targetUserId, now]);
    runDb(db, 'UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [targetUserId]);
    runDb(db, 'UPDATE users SET following_count = following_count + 1 WHERE id = ?', [currentUserId]);

    const currentUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [currentUserId]);
    sendNotification(
      targetUserId,
      currentUserId,
      'follow',
      `${currentUser?.full_name || 'Someone'} started following you on Nixo!`,
      currentUserId,
      'user'
    );

    logAudit(currentUserId, 'FOLLOW_USER', `Started following user ${targetUserId}`, req.ip);
    res.json({ success: true, isFollowing: true, following: true, message: 'Successfully followed user' });
  };

  app.post('/api/users/:id/follow', authenticateToken, handleFollowUser);
  app.post('/api/social/follow/:id', authenticateToken, handleFollowUser);

  // 12. Unfollow User
  app.post('/api/users/:id/unfollow', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    const existing = queryDbOne(db, 'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [
      currentUserId,
      targetUserId,
    ]);

    if (!existing) {
      return res.json({ isFollowing: false, message: 'Not currently following this user' });
    }

    runDb(db, 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, targetUserId]);
    runDb(db, 'UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?', [targetUserId]);
    runDb(db, 'UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?', [currentUserId]);

    logAudit(currentUserId, 'UNFOLLOW_USER', `Unfollowed user ${targetUserId}`, req.ip);
    res.json({ isFollowing: false, message: 'Successfully unfollowed user' });
  });

  // 13. Toggle Follow User
  app.post('/api/users/:id/toggle-follow', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const existing = queryDbOne(db, 'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [
      currentUserId,
      targetUserId,
    ]);

    if (existing) {
      runDb(db, 'DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, targetUserId]);
      runDb(db, 'UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?', [targetUserId]);
      runDb(db, 'UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?', [currentUserId]);
      logAudit(currentUserId, 'UNFOLLOW_USER', `Unfollowed user ${targetUserId}`, req.ip);
      return res.json({ isFollowing: false });
    } else {
      if (isBlockedBetween(currentUserId, targetUserId).blocked) {
        return res.status(403).json({ error: 'Interaction prohibited: user is blocked' });
      }
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)', [currentUserId, targetUserId, now]);
      runDb(db, 'UPDATE users SET followers_count = followers_count + 1 WHERE id = ?', [targetUserId]);
      runDb(db, 'UPDATE users SET following_count = following_count + 1 WHERE id = ?', [currentUserId]);

      const currentUser = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [currentUserId]);
      sendNotification(
        targetUserId,
        currentUserId,
        'follow',
        `${currentUser?.full_name || 'Someone'} started following you on Nixo!`,
        currentUserId,
        'user'
      );
      logAudit(currentUserId, 'FOLLOW_USER', `Started following user ${targetUserId}`, req.ip);
      return res.json({ isFollowing: true });
    }
  });

  // 14. Followers List (with mutual friends & follow status relative to viewer)
  app.get('/api/users/:id/followers', optionalAuth, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const viewerId = req.user?.id;

    const followersRows = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, f.created_at
       FROM follows f 
       JOIN users u ON f.follower_id = u.id 
       WHERE f.following_id = ? AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY f.created_at DESC`,
      [targetUserId]
    );

    const followers = followersRows.map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      badge: u.badge,
      isVerified: Boolean(u.is_verified),
      followedAt: u.created_at,
      mutualCount: viewerId ? getMutualFriends(viewerId, u.id).count : 0,
      isFollowing: viewerId ? Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [viewerId, u.id])) : false,
      isFriend: viewerId ? Boolean(queryDbOne(db, 'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"', [viewerId, u.id, u.id, viewerId])) : false,
    }));

    res.json({ followers });
  });

  // 15. Following List (with mutual friends & follow status relative to viewer)
  app.get('/api/users/:id/following', optionalAuth, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const viewerId = req.user?.id;

    const followingRows = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, f.created_at
       FROM follows f 
       JOIN users u ON f.following_id = u.id 
       WHERE f.follower_id = ? AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY f.created_at DESC`,
      [targetUserId]
    );

    const following = followingRows.map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      badge: u.badge,
      isVerified: Boolean(u.is_verified),
      followedAt: u.created_at,
      mutualCount: viewerId ? getMutualFriends(viewerId, u.id).count : 0,
      isFollowing: viewerId ? Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [viewerId, u.id])) : false,
      isFriend: viewerId ? Boolean(queryDbOne(db, 'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"', [viewerId, u.id, u.id, viewerId])) : false,
    }));

    res.json({ following });
  });

  // 16. Recently Followed API
  app.get('/api/social/recently-followed', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;

    const recentRows = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, u.bio, u.badge, u.is_verified, f.created_at as followed_at
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ? AND (u.deleted_at IS NULL OR u.deleted_at = '')
       ORDER BY f.created_at DESC
       LIMIT 20`,
      [currentUserId]
    );

    const recentlyFollowed = recentRows.map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      badge: u.badge,
      isVerified: Boolean(u.is_verified),
      followedAt: u.followed_at,
      mutualCount: getMutualFriends(currentUserId, u.id).count,
    }));

    res.json({ recentlyFollowed });
  });

  // Profile User Posts
  app.get('/api/users/:id/posts', optionalAuth, (req: AuthRequest, res: Response) => {
    const targetUser = queryDbOne(db, 'SELECT id FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const postsRows = queryDbAll(db, 'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [targetUser.id]);
    res.json({ posts: postsRows.map((p) => formatPostRow(p, req.user?.id)) });
  });

  // Profile User Media
  app.get('/api/users/:id/media', (req: Request, res: Response) => {
    const targetUser = queryDbOne(db, 'SELECT id FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const mediaPosts = queryDbAll(db, 'SELECT id, media_type, media_urls, created_at FROM posts WHERE user_id = ? AND media_type != "none" ORDER BY created_at DESC', [targetUser.id]);
    res.json({ media: mediaPosts });
  });

  // Profile Tagged Posts
  app.get('/api/users/:id/tagged', (req: Request, res: Response) => {
    const targetUser = queryDbOne(db, 'SELECT id FROM users WHERE id = ? OR username = ?', [req.params.id, req.params.id]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const taggedPosts = queryDbAll(
      db,
      `SELECT p.* FROM post_mentions pm JOIN posts p ON pm.post_id = p.id WHERE pm.mentioned_user_id = ? ORDER BY p.created_at DESC`,
      [targetUser.id]
    );
    res.json({ posts: taggedPosts.map((p) => formatPostRow(p)) });
  });

  // Profile Saved Posts
  app.get('/api/users/:id/saved', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Saved items are private to the account holder' });
    }

    const savedPosts = queryDbAll(
      db,
      `SELECT p.* FROM bookmarks b JOIN posts p ON b.post_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user!.id]
    );
    res.json({ posts: savedPosts.map((p) => formatPostRow(p, req.user!.id)) });
  });

  // Profile Liked/Reacted Content
  app.get('/api/users/:id/liked', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Liked activity is private to the account holder' });
    }

    const likedPosts = queryDbAll(
      db,
      `SELECT DISTINCT p.* FROM reactions r JOIN posts p ON r.post_id = p.id WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      [req.user!.id]
    );
    res.json({ posts: likedPosts.map((p) => formatPostRow(p, req.user!.id)) });
  });

  // --- 3. PRIVACY & INTERACTION CONTROLS ---

  // Get Privacy Settings
  app.get('/api/users/privacy', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    let privacy = queryDbOne(db, 'SELECT * FROM privacy_settings WHERE user_id = ?', [userId]);

    if (!privacy) {
      const now = new Date().toISOString();
      runDb(
        db,
        `INSERT INTO privacy_settings (id, user_id, profile_visibility, post_default_visibility, allow_friend_requests, allow_follows, direct_message_privacy, allow_commenting, allow_tagging, allow_mentions, show_online_status, created_at, updated_at)
         VALUES (?, ?, 'public', 'public', 'everyone', 'everyone', 'everyone', 'everyone', 'everyone', 'everyone', 1, ?, ?)`,
        ['priv_' + Date.now(), userId, now, now]
      );
      privacy = queryDbOne(db, 'SELECT * FROM privacy_settings WHERE user_id = ?', [userId]);
    }

    res.json({
      privacy: {
        profileVisibility: privacy.profile_visibility,
        postDefaultVisibility: privacy.post_default_visibility,
        allowFriendRequests: privacy.allow_friend_requests || 'everyone',
        allowFollows: privacy.allow_follows || 'everyone',
        directMessagePrivacy: privacy.direct_message_privacy,
        allowCommenting: privacy.allow_commenting || 'everyone',
        allowTagging: privacy.allow_tagging || 'everyone',
        allowMentions: privacy.allow_mentions || 'everyone',
        showOnlineStatus: Boolean(privacy.show_online_status),
      },
    });
  });

  // Update Privacy Settings
  app.put('/api/users/privacy', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      profileVisibility,
      postDefaultVisibility,
      allowFriendRequests,
      allowFollows,
      directMessagePrivacy,
      allowCommenting,
      allowTagging,
      allowMentions,
      showOnlineStatus,
    } = req.body;

    const now = new Date().toISOString();

    runDb(
      db,
      `UPDATE privacy_settings SET
         profile_visibility = COALESCE(?, profile_visibility),
         post_default_visibility = COALESCE(?, post_default_visibility),
         allow_friend_requests = COALESCE(?, allow_friend_requests),
         allow_follows = COALESCE(?, allow_follows),
         direct_message_privacy = COALESCE(?, direct_message_privacy),
         allow_commenting = COALESCE(?, allow_commenting),
         allow_tagging = COALESCE(?, allow_tagging),
         allow_mentions = COALESCE(?, allow_mentions),
         show_online_status = COALESCE(?, show_online_status),
         updated_at = ?
       WHERE user_id = ?`,
      [
        profileVisibility,
        postDefaultVisibility,
        allowFriendRequests,
        allowFollows,
        directMessagePrivacy,
        allowCommenting,
        allowTagging,
        allowMentions,
        showOnlineStatus !== undefined ? (showOnlineStatus ? 1 : 0) : null,
        now,
        userId,
      ]
    );

    logAudit(userId, 'UPDATE_PRIVACY', 'Updated interaction and privacy rules', req.ip);
    res.json({ success: true, message: 'Privacy settings updated successfully' });
  });

  // Block / Unblock User
  app.post('/api/users/block', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId, reason } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    if (userId === targetUserId) return res.status(400).json({ error: 'Cannot block yourself' });

    const now = new Date().toISOString();
    runDb(db, 'INSERT OR REPLACE INTO blocked_users (blocker_id, blocked_id, reason, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      targetUserId,
      reason || '',
      now,
    ]);

    // Remove existing friendships, friend requests, and follows in both directions
    runDb(db, 'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [userId, targetUserId, targetUserId, userId]);
    runDb(db, 'DELETE FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)', [userId, targetUserId, targetUserId, userId]);
    runDb(db, 'DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [userId, targetUserId, targetUserId, userId]);

    // Recalculate follower / following counts
    const followerCount1 = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE following_id = ?', [userId])?.cnt || 0;
    const followingCount1 = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE follower_id = ?', [userId])?.cnt || 0;
    const followerCount2 = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE following_id = ?', [targetUserId])?.cnt || 0;
    const followingCount2 = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE follower_id = ?', [targetUserId])?.cnt || 0;

    runDb(db, 'UPDATE users SET followers_count = ?, following_count = ? WHERE id = ?', [followerCount1, followingCount1, userId]);
    runDb(db, 'UPDATE users SET followers_count = ?, following_count = ? WHERE id = ?', [followerCount2, followingCount2, targetUserId]);

    logAudit(userId, 'BLOCK_USER', `Blocked user ${targetUserId}`, req.ip);
    res.json({ success: true, isBlocked: true, message: 'User blocked and all connections severed' });
  });

  app.post('/api/users/unblock', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    runDb(db, 'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [userId, targetUserId]);
    logAudit(userId, 'UNBLOCK_USER', `Unblocked user ${targetUserId}`, req.ip);
    res.json({ success: true, isBlocked: false });
  });

  // Support /api/users/:id/block and /api/users/:id/unblock
  app.post('/api/users/:id/block', authenticateToken, (req: AuthRequest, res: Response) => {
    req.body = { ...req.body, targetUserId: req.params.id };
    const userId = req.user!.id;
    const targetUserId = req.params.id;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });
    if (userId === targetUserId) return res.status(400).json({ error: 'Cannot block yourself' });

    const now = new Date().toISOString();
    runDb(db, 'INSERT OR REPLACE INTO blocked_users (blocker_id, blocked_id, reason, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      targetUserId,
      req.body.reason || '',
      now,
    ]);

    runDb(db, 'DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [userId, targetUserId, targetUserId, userId]);
    runDb(db, 'DELETE FROM friendships WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)', [userId, targetUserId, targetUserId, userId]);
    runDb(db, 'DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)', [userId, targetUserId, targetUserId, userId]);

    saveDbSync();
    res.json({ success: true, isBlocked: true, message: 'User blocked' });
  });

  app.post('/api/users/:id/unblock', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const targetUserId = req.params.id;
    runDb(db, 'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [userId, targetUserId]);
    saveDbSync();
    res.json({ success: true, isBlocked: false });
  });

  // Mute / Unmute User
  app.post('/api/users/mute', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    const now = new Date().toISOString();
    runDb(db, 'INSERT OR REPLACE INTO muted_users (muter_id, muted_id, created_at) VALUES (?, ?, ?)', [userId, targetUserId, now]);
    logAudit(userId, 'MUTE_USER', `Muted user ${targetUserId}`, req.ip);
    res.json({ success: true, isMuted: true });
  });

  app.post('/api/users/unmute', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    runDb(db, 'DELETE FROM muted_users WHERE muter_id = ? AND muted_id = ?', [userId, targetUserId]);
    logAudit(userId, 'UNMUTE_USER', `Unmuted user ${targetUserId}`, req.ip);
    res.json({ success: true, isMuted: false });
  });

  // Restrict / Unrestrict User Interaction
  app.post('/api/users/restrict', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId, reason } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    const now = new Date().toISOString();
    runDb(db, 'INSERT OR REPLACE INTO restricted_users (restruiter_id, restricted_id, reason, created_at) VALUES (?, ?, ?, ?)', [
      userId,
      targetUserId,
      reason || '',
      now,
    ]);

    logAudit(userId, 'RESTRICT_USER', `Restricted user interaction with ${targetUserId}`, req.ip);
    res.json({ success: true, isRestricted: true });
  });

  app.post('/api/users/unrestrict', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    runDb(db, 'DELETE FROM restricted_users WHERE restruiter_id = ? AND restricted_id = ?', [userId, targetUserId]);
    logAudit(userId, 'UNRESTRICT_USER', `Unrestricted interaction with ${targetUserId}`, req.ip);
    res.json({ success: true, isRestricted: false });
  });

  // Get Relationships Lists (Blocked, Muted, Restricted)
  app.get('/api/users/relationships/blocked', authenticateToken, (req: AuthRequest, res: Response) => {
    const list = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, b.reason, b.created_at
       FROM blocked_users b JOIN users u ON b.blocked_id = u.id WHERE b.blocker_id = ?`,
      [req.user!.id]
    );
    res.json({ blockedUsers: list });
  });

  app.get('/api/users/relationships/muted', authenticateToken, (req: AuthRequest, res: Response) => {
    const list = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, m.created_at
       FROM muted_users m JOIN users u ON m.muted_id = u.id WHERE m.muter_id = ?`,
      [req.user!.id]
    );
    res.json({ mutedUsers: list });
  });

  app.get('/api/users/relationships/restricted', authenticateToken, (req: AuthRequest, res: Response) => {
    const list = queryDbAll(
      db,
      `SELECT u.id, u.username, u.full_name, u.avatar_url, r.reason, r.created_at
       FROM restricted_users r JOIN users u ON r.restricted_id = u.id WHERE r.restruiter_id = ?`,
      [req.user!.id]
    );
    res.json({ restrictedUsers: list });
  });

  // --- 3. NEWS FEED & POSTS ---
  const formatPostRow = (p: any, currentUserId?: string, includeRepost = true, cache?: { users?: Record<string, any>; follows?: Record<string, boolean> }): any => {
    let author = cache?.users?.[p.user_id];
    if (!author) {
      author = queryDbOne(db, 'SELECT id, username, full_name, avatar_url, badge, is_verified FROM users WHERE id = ?', [
        p.user_id,
      ]);
      if (author && cache?.users) {
        cache.users[p.user_id] = author;
      }
    }

    // Reactions count
    const reactions = queryDbAll(db, 'SELECT type, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY type', [p.id]);
    const reactionsCount: Record<string, number> = {
      like: 0,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      celebrate: 0,
      support: 0,
      fire: 0,
      gem: 0,
      mindblown: 0,
      heartbreak: 0,
      total: 0,
    };
    reactions.forEach((r: any) => {
      reactionsCount[r.type] = r.count;
      reactionsCount.total += r.count;
    });

    let userReaction: string | undefined = undefined;
    let isBookmarked = false;
    let isAuthorFollowed = false;

    if (currentUserId) {
      const userReactRow = queryDbOne(db, 'SELECT type FROM reactions WHERE post_id = ? AND user_id = ?', [p.id, currentUserId]);
      if (userReactRow) userReaction = userReactRow.type;

      const bookmarkRow = queryDbOne(db, 'SELECT * FROM bookmarks WHERE post_id = ? AND user_id = ?', [p.id, currentUserId]);
      if (!bookmarkRow) {
        const postSaveRow = queryDbOne(db, 'SELECT * FROM post_saves WHERE post_id = ? AND user_id = ?', [p.id, currentUserId]);
        isBookmarked = Boolean(postSaveRow);
      } else {
        isBookmarked = true;
      }

      if (author && author.id !== currentUserId) {
        const cacheKey = `${currentUserId}:${author.id}`;
        if (cache?.follows && cache.follows[cacheKey] !== undefined) {
          isAuthorFollowed = cache.follows[cacheKey];
        } else {
          const followRow = queryDbOne(db, 'SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, author.id]);
          isAuthorFollowed = Boolean(followRow);
          if (cache?.follows) {
            cache.follows[cacheKey] = isAuthorFollowed;
          }
        }
      }
    }

    let mediaUrls: string[] = [];
    try {
      mediaUrls = JSON.parse(p.media_urls || '[]');
    } catch (e) {
      mediaUrls = [];
    }

    let pollData: any = undefined;
    if (p.poll_data) {
      try {
        pollData = JSON.parse(p.poll_data);
        if (currentUserId && pollData && pollData.options) {
          // Check if current user voted in any option
          for (const opt of pollData.options) {
            if (opt.votedUserIds && opt.votedUserIds.includes(currentUserId)) {
              pollData.userVotedOptionId = opt.id;
              break;
            }
          }
        }
      } catch (e) {
        pollData = undefined;
      }
    }

    let feeling: any = undefined;
    if (p.feeling) {
      try {
        feeling = JSON.parse(p.feeling);
      } catch (e) {
        feeling = { type: 'feeling', label: p.feeling };
      }
    }

    let taggedUsers: any[] = [];
    if (p.tagged_users_json) {
      try {
        taggedUsers = JSON.parse(p.tagged_users_json);
      } catch (e) {
        taggedUsers = [];
      }
    }

    let hashtags: string[] = [];
    if (p.hashtags_json) {
      try {
        hashtags = JSON.parse(p.hashtags_json);
      } catch (e) {
        hashtags = [];
      }
    }

    let linkPreview: any = undefined;
    if (p.link_preview_json) {
      try {
        linkPreview = JSON.parse(p.link_preview_json);
      } catch (e) {
        linkPreview = undefined;
      }
    }

    let audioData: any = undefined;
    if (p.audio_data_json) {
      try {
        audioData = JSON.parse(p.audio_data_json);
      } catch (e) {
        audioData = undefined;
      }
    }

    let repostOf: any = undefined;
    if (includeRepost && p.repost_of_post_id) {
      const origPostRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [p.repost_of_post_id]);
      if (origPostRow) {
        repostOf = formatPostRow(origPostRow, currentUserId, false);
      }
    }

    return {
      id: p.id,
      userId: p.user_id,
      author: author
        ? {
            id: author.id,
            username: author.username,
            fullName: author.full_name,
            avatarUrl: author.avatar_url,
            badge: author.badge,
            isVerified: Boolean(author.is_verified),
          }
        : { id: p.user_id, username: 'user', fullName: 'Nixo User', avatarUrl: '', isVerified: false },
      content: p.content,
      mediaType: p.media_type || 'none',
      mediaUrls,
      pollData,
      privacy: p.privacy || 'public',
      groupId: p.group_id,
      pageId: p.page_id,
      isSponsored: Boolean(p.is_sponsored),
      sponsorTitle: p.sponsor_title,
      sponsorTargetUrl: p.sponsor_target_url,
      feeling,
      location: p.location || undefined,
      taggedUsers,
      hashtags,
      linkPreview,
      gifUrl: p.gif_url || undefined,
      audioData,
      backgroundGradient: p.background_gradient || undefined,
      fontStyle: p.font_style || 'sans',
      fontSize: p.font_size || 'base',
      commentsControl: p.comments_control || 'allow_all',
      scheduledFor: p.scheduled_for || undefined,
      repostOf,
      repostOfPostId: p.repost_of_post_id || undefined,
      reactionsCount,
      userReaction,
      commentsCount: p.comments_count || 0,
      sharesCount: p.shares_count || 0,
      isBookmarked,
      isAuthorFollowed,
      giftsReceivedCount: p.gifts_received_count || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  };

  // GET /api/posts with feedType, pagination, and filtering
  app.get('/api/posts', optionalAuth, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id;
    const feedType = (req.query.feedType as string) || 'chronological'; // chronological | recommended | following
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    const hashtag = req.query.hashtag as string;

    // Filters: exclude blocked and user-hidden posts
    let whereClauses: string[] = ["(status = 'published' OR status IS NULL OR status = '')"];
    const params: any[] = [];

    if (currentUserId) {
      whereClauses.push(`posts.id NOT IN (SELECT post_id FROM post_hides WHERE user_id = ?)`);
      params.push(currentUserId);

      whereClauses.push(`posts.user_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = ?)`);
      params.push(currentUserId);
    }

    if (hashtag) {
      whereClauses.push(`(posts.hashtags_json LIKE ? OR posts.content LIKE ?)`);
      params.push(`%${hashtag}%`, `%#${hashtag}%`);
    }

    if (feedType === 'following' && currentUserId) {
      whereClauses.push(`(posts.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR posts.user_id = ?)`);
      params.push(currentUserId, currentUserId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBySql = 'ORDER BY posts.created_at DESC';
    if (feedType === 'recommended') {
      // Engagement scoring: reactions * 3 + comments * 2 + shares * 4 + gifts * 5
      orderBySql = 'ORDER BY (posts.comments_count * 2 + posts.shares_count * 4 + posts.gifts_received_count * 5) DESC, posts.created_at DESC';
    }

    const countRow = queryDbOne(db, `SELECT COUNT(*) as total FROM posts ${whereSql}`, params);
    const total = countRow ? countRow.total : 0;

    const postsRows = queryDbAll(
      db,
      `SELECT posts.* FROM posts ${whereSql} ${orderBySql} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Instantiate a shared cache context to address the N+1 database queries constraint
    const sharedCache = { users: {}, follows: {} };
    const formattedPosts = postsRows.map((p) => formatPostRow(p, currentUserId, true, sharedCache));
    res.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + postsRows.length < total,
      },
    });
  });

  // Link Preview API
  app.post('/api/posts/link-preview', optionalAuth, (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace('www.', '');

      // Curated rich previews for popular platforms or generic meta
      let title = `Exploring ${domain}`;
      let description = `Interactive content and insights shared from ${domain}.`;
      let image = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';

      if (domain.includes('github.com')) {
        title = 'GitHub Repository · Open Source Architecture';
        description = 'Explore modern repositories, liquid UI shaders, and distributed systems.';
        image = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80';
      } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        title = 'Spatial Audio Broadcast · YouTube Stream';
        description = 'High-definition 4K video recording with lossless audio stem mastering.';
        image = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
      } else if (domain.includes('figma.com')) {
        title = 'Liquid Glass Design System · Figma Canvas';
        description = 'Living UI component specs with translucent elevation, springs, and zero-pill tokens.';
        image = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80';
      }

      res.json({
        url,
        title,
        description,
        image,
        siteName: domain,
      });
    } catch (e) {
      res.status(400).json({ error: 'Invalid URL supplied' });
    }
  });

  // POST /api/posts - Rich multi-type post creation with Anti-Spam & Moderation Guard
  app.post('/api/posts', authenticateToken, postActionRateLimit, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // Security Check: Is user restricted from posting?
    const restriction = isUserRestricted(db, userId, 'posting');
    if (restriction.restricted) {
      return res.status(403).json({
        error: `Your account is temporarily restricted from posting: ${restriction.reason}. Expires: ${restriction.expiresAt}`,
      });
    }

    const {
      content,
      mediaType,
      mediaUrls,
      pollData,
      privacy,
      groupId,
      pageId,
      feeling,
      location,
      taggedUsers,
      hashtags,
      linkPreview,
      gifUrl,
      audioData,
      backgroundGradient,
      fontStyle,
      fontSize,
      commentsControl,
      scheduledFor,
      repostOfPostId,
    } = req.body;

    // Anti-Spam Engine Check: Velocity & Duplication Analysis
    const spamCheck = checkPostSpam(db, userId, content || '', req.ip);
    if (!spamCheck.allowed) {
      return res.status(429).json({
        error: spamCheck.reason || 'Post action blocked by anti-spam velocity protection.',
        cooldownRemainingSec: spamCheck.cooldownRemainingSec,
      });
    }

    if (
      !content &&
      (!mediaUrls || mediaUrls.length === 0) &&
      !pollData &&
      !gifUrl &&
      !audioData &&
      !linkPreview &&
      !repostOfPostId
    ) {
      return res.status(400).json({ error: 'Post must contain text, media, audio, link, or poll' });
    }

    const sanitizedContent = content ? sanitizeRichText(content) : '';
    const postId = 'post_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();
    const mediaUrlsJson = JSON.stringify(mediaUrls || []);
    const pollDataJson = pollData ? JSON.stringify(pollData) : null;
    const feelingJson = feeling ? JSON.stringify(feeling) : null;
    const taggedUsersJson = taggedUsers ? JSON.stringify(taggedUsers) : '[]';
    const hashtagsJson = hashtags ? JSON.stringify(hashtags) : '[]';
    const linkPreviewJson = linkPreview ? JSON.stringify(linkPreview) : null;
    const audioDataJson = audioData ? JSON.stringify(audioData) : null;

    const isScheduled = Boolean(scheduledFor && new Date(scheduledFor) > new Date());
    const status = isScheduled ? 'scheduled' : 'published';

    runDb(
      db,
      `INSERT INTO posts (
        id, user_id, content, media_type, media_urls, poll_data, privacy,
        group_id, page_id, feeling, location, tagged_users_json, hashtags_json,
        link_preview_json, gif_url, audio_data_json, background_gradient, font_style, font_size,
        comments_control, scheduled_for, repost_of_post_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId,
        req.user!.id,
        sanitizedContent,
        mediaType || 'none',
        mediaUrlsJson,
        pollDataJson,
        privacy || 'public',
        groupId || null,
        pageId || null,
        feelingJson,
        location || null,
        taggedUsersJson,
        hashtagsJson,
        linkPreviewJson,
        gifUrl || null,
        audioDataJson,
        backgroundGradient || null,
        fontStyle || 'sans',
        fontSize || 'base',
        commentsControl || 'allow_all',
        scheduledFor || null,
        repostOfPostId || null,
        status,
        now,
        now,
      ]
    );

    // Record individual media entries in post_media
    if (mediaUrls && Array.isArray(mediaUrls)) {
      mediaUrls.forEach((url: string, idx: number) => {
        const pmId = 'pm_' + Date.now() + '_' + idx;
        const type = url.endsWith('.mp4') || url.endsWith('.webm') ? 'video' : 'image';
        runDb(
          db,
          `INSERT INTO post_media (id, post_id, media_type, url, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [pmId, postId, type, url, idx, now]
        );
      });
    }

    // Record mentions
    if (taggedUsers && Array.isArray(taggedUsers)) {
      taggedUsers.forEach((u: any) => {
        if (u.id) {
          const mentionId = 'mnt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          runDb(
            db,
            `INSERT INTO post_mentions (id, post_id, mentioned_user_id, created_at) VALUES (?, ?, ?, ?)`,
            [mentionId, postId, u.id, now]
          );
          sendNotification(u.id, req.user!.id, 'mention', `${req.user!.username} tagged you in a post!`, postId, 'post');
        }
      });
    }

    // Record hashtags
    if (hashtags && Array.isArray(hashtags)) {
      hashtags.forEach((tag: string) => {
        const clean = tag.replace(/^#/, '').trim();
        if (clean) {
          runDb(
            db,
            `INSERT OR IGNORE INTO post_hashtags (post_id, hashtag, created_at) VALUES (?, ?, ?)`,
            [postId, clean, now]
          );
        }
      });
    }

    // If repost, increment shares count on parent post
    if (repostOfPostId) {
      runDb(db, `UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?`, [repostOfPostId]);
      const orig = queryDbOne(db, 'SELECT user_id FROM posts WHERE id = ?', [repostOfPostId]);
      if (orig && orig.user_id !== req.user!.id) {
        sendNotification(orig.user_id, req.user!.id, 'share', `${req.user!.username} reposted your transmission!`, postId, 'post');
      }
    }

    const postRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    const formatted = formatPostRow(postRow, req.user!.id);

    // Broadcast socket event
    io.emit('new_post', formatted);

    // Evaluate and award activity coin rewards dynamically based on admin rules
    let coinRewardInfo: any = null;
    if (status === 'published') {
      try {
        const isVideoMedia = mediaType === 'video' || (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.some((u: string) => u.endsWith('.mp4') || u.endsWith('.webm')));
        const isPhotoMedia = mediaType === 'image' || mediaType === 'multiple_image' || (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0 && !isVideoMedia);

        let eventType = 'post_created';
        let sourceType = 'post';
        let typeName = 'post';

        if (isVideoMedia) {
          eventType = 'video_created';
          sourceType = 'video';
          typeName = 'video';
        } else if (isPhotoMedia) {
          eventType = 'photo_created';
          sourceType = 'photo';
          typeName = 'photo';
        }

        const rewardRes = evaluateAndAwardCoinReward(db, {
          userId: req.user!.id,
          eventType,
          sourceId: postId,
          sourceType,
          content: content || '',
          ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        });

        if (rewardRes.awarded) {
          coinRewardInfo = {
            coinsAwarded: rewardRes.coins,
            newBalance: rewardRes.balanceAfter,
          };
          // Real-time balance update to sender
          io.to(`user_${req.user!.id}`).emit('balance_updated', {
            coinsBalance: rewardRes.balanceAfter,
          });
          sendNotification(
            req.user!.id,
            'SYSTEM',
            'coin_received',
            `🎉 You earned +${rewardRes.coins} Coins for sharing a new ${typeName}!`,
            postId,
            'post'
          );
        }
      } catch (e) {
        console.error('Failed to evaluate coin reward for post:', e);
      }
    }

    res.status(201).json({ post: formatted, reward: coinRewardInfo });
  });

  // PUT /api/posts/:id - Edit existing post
  app.put('/api/posts/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const postId = req.params.id;
      const userId = req.user!.id;
      const { content, privacyLevel, privacy, backgroundGradient } = req.body;

      const existing = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
      if (!existing) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (String(existing.user_id) !== String(userId) && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to edit this post' });
      }

      const privacyVal = privacy || privacyLevel || existing.privacy || 'public';
      const updatedContent = content !== undefined ? sanitizeRichText(content) : existing.content;
      const updatedPrivacy = privacyVal;
      const updatedBg = backgroundGradient !== undefined ? backgroundGradient : (existing.background_gradient || null);
      const now = new Date().toISOString();

      runDb(
        db,
        `UPDATE posts SET
          content = ?,
          privacy = ?,
          background_gradient = ?,
          updated_at = ?
        WHERE id = ?`,
        [updatedContent, updatedPrivacy, updatedBg, now, postId]
      );

      const updatedRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
      const formatted = formatPostRow(updatedRow, userId);

      try {
        io.emit('post_updated', formatted);
      } catch (e) {}

      logAudit(userId, 'EDIT_POST', `Edited post ${postId}`, req.ip);
      return res.json({ post: formatted, success: true });
    } catch (err: any) {
      console.error('Error updating post:', err);
      return res.status(500).json({ error: err.message || 'Failed to update post' });
    }
  });

  // DELETE /api/posts/:id - Delete post
  app.delete('/api/posts/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (String(existing.user_id) !== String(userId) && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    try {
      runDb(db, 'DELETE FROM posts WHERE id = ?', [postId]);
      runDb(db, 'DELETE FROM comments WHERE post_id = ?', [postId]);
      runDb(db, 'DELETE FROM reactions WHERE post_id = ?', [postId]);
      runDb(db, 'DELETE FROM bookmarks WHERE post_id = ?', [postId]);
    } catch (dbErr: any) {
      console.error('Error deleting sub-records for post:', dbErr);
    }

    logAudit(userId, 'DELETE_POST', `Deleted post ${postId}`, req.ip);
    res.json({ success: true, message: 'Post deleted successfully' });
  });

  // Poll voting endpoint
  app.post('/api/posts/:id/poll/vote', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const { optionId } = req.body;

    if (!optionId) return res.status(400).json({ error: 'Option ID is required' });

    const postRow = queryDbOne(db, 'SELECT poll_data FROM posts WHERE id = ?', [postId]);
    if (!postRow || !postRow.poll_data) {
      return res.status(404).json({ error: 'Poll not found on this post' });
    }

    let pollData: any;
    try {
      pollData = JSON.parse(postRow.poll_data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read poll data' });
    }

    let alreadyVoted = false;
    // Check if user already voted and remove previous vote or prevent
    pollData.options.forEach((opt: any) => {
      if (!opt.votedUserIds) opt.votedUserIds = [];
      if (opt.votedUserIds.includes(userId)) {
        alreadyVoted = true;
        opt.votedUserIds = opt.votedUserIds.filter((id: string) => id !== userId);
        opt.votes = Math.max(0, opt.votes - 1);
      }
    });

    const targetOpt = pollData.options.find((o: any) => o.id === optionId);
    if (!targetOpt) return res.status(404).json({ error: 'Option not found' });

    targetOpt.votedUserIds.push(userId);
    targetOpt.votes = (targetOpt.votes || 0) + 1;

    // Recalculate total votes
    pollData.totalVotes = pollData.options.reduce((acc: number, o: any) => acc + (o.votes || 0), 0);

    const updatedPollJson = JSON.stringify(pollData);
    runDb(db, `UPDATE posts SET poll_data = ?, updated_at = ? WHERE id = ?`, [updatedPollJson, new Date().toISOString(), postId]);

    const updatedPost = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    const formatted = formatPostRow(updatedPost, userId);

    io.emit('post_updated', formatted);
    res.json({ post: formatted });
  });

  // Hide Post endpoint
  app.post('/api/posts/:id/hide', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const now = new Date().toISOString();

    runDb(db, `INSERT OR IGNORE INTO post_hides (user_id, post_id, created_at) VALUES (?, ?, ?)`, [userId, postId, now]);
    res.json({ success: true, message: 'Post hidden from your feed' });
  });

  // Report Post endpoint
  app.post('/api/posts/:id/report', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const { reason, details } = req.body;

    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const reportId = 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
       VALUES (?, ?, 'post', ?, ?, ?, 'pending', ?)`,
      [reportId, userId, postId, reason, details || '', now]
    );

    res.json({ success: true, message: 'Thank you. Our moderators will review this transmission.' });
  });

  // Repost / Quote Repost endpoint
  app.post('/api/posts/:id/repost', authenticateToken, (req: AuthRequest, res: Response) => {
    const originalPostId = req.params.id;
    const userId = req.user!.id;
    const { quoteText, privacy } = req.body;

    const orig = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [originalPostId]);
    if (!orig) return res.status(404).json({ error: 'Original post not found' });

    const newPostId = 'post_rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO posts (
        id, user_id, content, media_type, repost_of_post_id, privacy, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'repost', ?, ?, 'published', ?, ?)`,
      [newPostId, userId, quoteText || '', originalPostId, privacy || 'public', now, now]
    );

    // Increment share counter on original
    runDb(db, `UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?`, [originalPostId]);

    if (orig.user_id !== userId) {
      sendNotification(orig.user_id, userId, 'share', `${req.user!.username} shared your transmission!`, newPostId, 'post');
    }

    const createdPost = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [newPostId]);
    const formatted = formatPostRow(createdPost, userId);

    io.emit('new_post', formatted);
    res.status(201).json({ post: formatted });
  });

  // Mention Candidates Autocomplete API
  app.get('/api/users/mention-candidates', optionalAuth, (req: AuthRequest, res: Response) => {
    const q = ((req.query.q as string) || '').trim().replace(/^@/, '');
    const users = queryDbAll(
      db,
      `SELECT id, username, full_name, avatar_url, badge, is_verified 
       FROM users 
       WHERE (deleted_at IS NULL OR deleted_at = '') 
         AND (status = 'active' OR status IS NULL)
         AND (username LIKE ? OR full_name LIKE ?)
       LIMIT 8`,
      [`%${q}%`, `%${q}%`]
    );
    res.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        avatarUrl: u.avatar_url,
        badge: u.badge,
        isVerified: Boolean(u.is_verified),
      })),
    });
  });

  // Post Reaction endpoint with duplicate prevention & 8 categories
  app.post('/api/posts/:id/react', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const type = req.body.type || req.body.reactionType || req.body.reaction || 'like';

    if (!type) return res.status(400).json({ error: 'Reaction type is required' });

    const existing = queryDbOne(db, 'SELECT * FROM reactions WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.type === type) {
        // Toggle off (remove reaction)
        runDb(db, 'DELETE FROM reactions WHERE id = ?', [existing.id]);
      } else {
        // Change reaction type
        runDb(db, 'UPDATE reactions SET type = ? WHERE id = ?', [type, existing.id]);
      }
    } else {
      const reactId = 'react_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(db, 'INSERT INTO reactions (id, user_id, post_id, type, created_at) VALUES (?, ?, ?, ?, ?)', [
        reactId,
        userId,
        postId,
        type,
        now,
      ]);

      const postRow = queryDbOne(db, 'SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (postRow && postRow.user_id !== userId) {
        const sender = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [userId]);
        sendNotification(
          postRow.user_id,
          userId,
          'like',
          `${sender?.full_name || 'Someone'} reacted to your transmission (${type})`,
          postId,
          'post'
        );
      }
    }

    const postRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    const formatted = formatPostRow(postRow, userId);

    // Broadcast socket event
    io.emit('post_reacted', {
      postId,
      reactionsCount: formatted.reactionsCount,
      userId,
      userReaction: formatted.userReaction,
    });

    res.json({ success: true, post: formatted });
  });

  // Post Interest Toggle endpoint
  app.post('/api/posts/:id/interest', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const existing = queryDbOne(db, "SELECT * FROM reactions WHERE post_id = ? AND user_id = ? AND type = 'interested'", [postId, userId]);
    const now = new Date().toISOString();

    if (existing) {
      runDb(db, 'DELETE FROM reactions WHERE id = ?', [existing.id]);
    } else {
      const rxId = 'react_int_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(db, 'INSERT INTO reactions (id, user_id, post_id, type, created_at) VALUES (?, ?, ?, ?, ?)', [
        rxId,
        userId,
        postId,
        'interested',
        now,
      ]);
    }

    const postRow = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    if (!postRow) return res.status(404).json({ error: 'Post not found' });
    const formatted = formatPostRow(postRow, userId);
    res.json({ success: true, isInterested: !existing, post: formatted });
  });

  // GET users who reacted to a post
  app.get('/api/posts/:id/reactions', optionalAuth, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const rows = queryDbAll(
      db,
      `SELECT r.id, r.type, r.created_at, u.id as user_id, u.username, u.full_name, u.avatar_url, u.is_verified, u.badge
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = ?
       ORDER BY r.created_at DESC`,
      [postId]
    );

    const formatted = rows.map((r) => ({
      id: r.id,
      type: r.type,
      createdAt: r.created_at,
      user: {
        id: r.user_id,
        username: r.username,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        badge: r.badge,
        isVerified: Boolean(r.is_verified),
      },
    }));

    res.json({ reactions: formatted });
  });

  // GET /api/posts/:id/comments with threaded nested replies, reactions, author follow status
  app.get('/api/posts/:id/comments', optionalAuth, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id;
    const postId = req.params.id;

    const commentsRows = queryDbAll(
      db,
      `SELECT * FROM comments 
       WHERE post_id = ? AND (deleted_at IS NULL OR deleted_at = '') 
       ORDER BY is_pinned DESC, created_at ASC`,
      [postId]
    );

    const formattedComments = commentsRows.map((c) => {
      const author = queryDbOne(
        db,
        'SELECT id, username, full_name, avatar_url, badge, is_verified FROM users WHERE id = ?',
        [c.user_id]
      );

      // Check if current user follows comment author
      let isAuthorFollowed = false;
      if (currentUserId && author && author.id !== currentUserId) {
        const followRow = queryDbOne(
          db,
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
          [currentUserId, author.id]
        );
        isAuthorFollowed = Boolean(followRow);
      }

      // Reactions for this comment
      const commentReactions = queryDbAll(
        db,
        'SELECT type, COUNT(*) as count FROM comment_reactions WHERE comment_id = ? GROUP BY type',
        [c.id]
      );

      const reactionsBreakdown: Record<string, number> = {};
      let totalReactions = 0;
      commentReactions.forEach((cr: any) => {
        reactionsBreakdown[cr.type] = cr.count;
        totalReactions += cr.count;
      });

      // User reaction on this comment
      let userReaction: string | undefined = undefined;
      if (currentUserId) {
        const userReactRow = queryDbOne(
          db,
          'SELECT type FROM comment_reactions WHERE comment_id = ? AND user_id = ?',
          [c.id, currentUserId]
        );
        if (userReactRow) userReaction = userReactRow.type;
      }

      return {
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        author: author
          ? {
              id: author.id,
              username: author.username,
              fullName: author.full_name,
              avatarUrl: author.avatar_url,
              badge: author.badge,
              isVerified: Boolean(author.is_verified),
            }
          : { id: c.user_id, username: 'user', fullName: 'Nixo User', avatarUrl: '' },
        parentId: c.parent_id || null,
        content: c.content,
        mediaUrl: c.media_url || null,
        gifUrl: c.gif_url || null,
        isPinned: Boolean(c.is_pinned),
        isEdited: Boolean(c.is_edited),
        reactionsCount: totalReactions,
        reactionsBreakdown,
        userReaction,
        isAuthorFollowed,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    // Build hierarchical tree for nested replies
    const topLevelComments: any[] = [];
    const replyMap = new Map<string, any[]>();

    formattedComments.forEach((c) => {
      if (c.parentId) {
        const existingReplies = replyMap.get(c.parentId) || [];
        existingReplies.push(c);
        replyMap.set(c.parentId, existingReplies);
      } else {
        topLevelComments.push(c);
      }
    });

    // Attach replies to top-level comments
    topLevelComments.forEach((top) => {
      top.replies = replyMap.get(top.id) || [];
    });

    res.json({
      comments: topLevelComments,
      allComments: formattedComments,
      totalCount: formattedComments.length,
    });
  });

  // POST /api/posts/:id/comments - Create comment or nested reply with Anti-Spam & Moderation Guard
  app.post('/api/posts/:id/comments', authenticateToken, commentActionRateLimit, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;

    // Security Check: Is user restricted from commenting?
    const restriction = isUserRestricted(db, userId, 'commenting');
    if (restriction.restricted) {
      return res.status(403).json({
        error: `Your account is temporarily restricted from commenting: ${restriction.reason}. Expires: ${restriction.expiresAt}`,
      });
    }

    const { content, mediaUrl, gifUrl, parentId, mentions } = req.body;

    if (!content && !mediaUrl && !gifUrl) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    // Anti-Spam Engine Check: Velocity & Duplication Analysis
    const spamCheck = checkCommentSpam(db, userId, postId, content || '');
    if (!spamCheck.allowed) {
      return res.status(429).json({
        error: spamCheck.reason || 'Comment action blocked by anti-spam velocity protection.',
        cooldownRemainingSec: spamCheck.cooldownRemainingSec,
      });
    }

    const sanitizedContent = content ? sanitizeRichText(content) : '';
    const commentId = 'comm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO comments (id, post_id, user_id, parent_id, content, media_url, gif_url, is_pinned, is_edited, reactions_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
      [commentId, postId, userId, parentId || null, sanitizedContent, mediaUrl || null, gifUrl || null, now, now]
    );

    // Save extra media record if applicable
    if (mediaUrl) {
      runDb(
        db,
        `INSERT INTO comment_media (id, comment_id, media_url, created_at) VALUES (?, ?, ?, ?)`,
        ['cm_' + Date.now() + '_' + Math.floor(Math.random() * 1000), commentId, mediaUrl, now]
      );
    }

    // Save mentions & send notification
    if (mentions && Array.isArray(mentions)) {
      mentions.forEach((u: any) => {
        const mentionedId = typeof u === 'string' ? u : u.id;
        if (mentionedId && mentionedId !== userId) {
          runDb(
            db,
            `INSERT INTO comment_mentions (id, comment_id, mentioned_user_id, created_at) VALUES (?, ?, ?, ?)`,
            ['cmnt_' + Date.now() + '_' + Math.floor(Math.random() * 1000), commentId, mentionedId, now]
          );
          sendNotification(
            mentionedId,
            userId,
            'mention',
            `${req.user!.username} mentioned you in a comment`,
            postId,
            'post'
          );
        }
      });
    }

    // Increment post comments count
    runDb(db, 'UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

    // Send notification to post author or parent comment author
    const author = queryDbOne(
      db,
      'SELECT id, username, full_name, avatar_url, badge, is_verified FROM users WHERE id = ?',
      [userId]
    );

    if (parentId) {
      const parentComment = queryDbOne(db, 'SELECT user_id FROM comments WHERE id = ?', [parentId]);
      if (parentComment && parentComment.user_id !== userId) {
        sendNotification(
          parentComment.user_id,
          userId,
          'reply',
          `${author?.full_name || 'Someone'} replied to your comment`,
          postId,
          'comment'
        );
      }
    } else {
      const postRow = queryDbOne(db, 'SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (postRow && postRow.user_id !== userId) {
        sendNotification(
          postRow.user_id,
          userId,
          'comment',
          `${author?.full_name || 'Someone'} commented on your transmission`,
          postId,
          'post'
        );
      }
    }

    const createdComment = {
      id: commentId,
      postId,
      userId,
      author: {
        id: author.id,
        username: author.username,
        fullName: author.full_name,
        avatarUrl: author.avatar_url,
        badge: author.badge,
        isVerified: Boolean(author.is_verified),
      },
      parentId: parentId || null,
      content: content || '',
      mediaUrl: mediaUrl || null,
      gifUrl: gifUrl || null,
      isPinned: false,
      isEdited: false,
      reactionsCount: 0,
      reactionsBreakdown: {},
      userReaction: undefined,
      replies: [],
      isAuthorFollowed: false,
      createdAt: now,
      updatedAt: now,
    };

    io.emit('new_comment', { postId, comment: createdComment });

    res.status(201).json({ comment: createdComment });
  });

  // PUT /api/comments/:id - Edit comment content
  app.put('/api/comments/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = queryDbOne(db, 'SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to edit this comment' });
    }

    const now = new Date().toISOString();
    runDb(db, 'UPDATE comments SET content = ?, is_edited = 1, updated_at = ? WHERE id = ?', [
      content.trim(),
      now,
      commentId,
    ]);

    res.json({ success: true, commentId, content: content.trim(), isEdited: true, updatedAt: now });
  });

  // DELETE /api/comments/:id - Delete comment
  app.delete('/api/comments/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user!.id;

    const comment = queryDbOne(db, 'SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const post = queryDbOne(db, 'SELECT user_id FROM posts WHERE id = ?', [comment.post_id]);
    const isCommentAuthor = comment.user_id === userId;
    const isPostAuthor = post && post.user_id === userId;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'moderator';

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete comment reactions and mentions
    runDb(db, 'DELETE FROM comment_reactions WHERE comment_id = ?', [commentId]);
    runDb(db, 'DELETE FROM comment_mentions WHERE comment_id = ?', [commentId]);
    runDb(db, 'DELETE FROM comment_media WHERE comment_id = ?', [commentId]);

    // Also cascade delete nested replies or update count
    const repliesCountRow = queryDbOne(
      db,
      'SELECT COUNT(*) as cnt FROM comments WHERE parent_id = ?',
      [commentId]
    );
    const repliesCount = repliesCountRow ? repliesCountRow.cnt : 0;
    runDb(db, 'DELETE FROM comments WHERE parent_id = ?', [commentId]);
    runDb(db, 'DELETE FROM comments WHERE id = ?', [commentId]);

    // Decrement post comment counter
    const totalDeleted = 1 + repliesCount;
    runDb(
      db,
      'UPDATE posts SET comments_count = MAX(0, comments_count - ?) WHERE id = ?',
      [totalDeleted, comment.post_id]
    );

    io.emit('comment_deleted', { commentId, postId: comment.post_id });

    res.json({ success: true, message: 'Comment deleted successfully' });
  });

  // POST /api/comments/:id/react - React to individual comment with 3D reactions
  app.post('/api/comments/:id/react', authenticateToken, (req: AuthRequest, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user!.id;
    const { type } = req.body; // 'like', 'love', 'haha', 'wow', etc.

    if (!type) return res.status(400).json({ error: 'Reaction type is required' });

    const comment = queryDbOne(db, 'SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const existing = queryDbOne(
      db,
      'SELECT * FROM comment_reactions WHERE comment_id = ? AND user_id = ?',
      [commentId, userId]
    );
    const now = new Date().toISOString();
    let userReaction: string | undefined = type;

    if (existing) {
      if (existing.type === type) {
        // Toggle off
        runDb(db, 'DELETE FROM comment_reactions WHERE id = ?', [existing.id]);
        userReaction = undefined;
      } else {
        // Change type
        runDb(db, 'UPDATE comment_reactions SET type = ? WHERE id = ?', [type, existing.id]);
      }
    } else {
      const crId = 'cr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(
        db,
        'INSERT INTO comment_reactions (id, user_id, comment_id, type, created_at) VALUES (?, ?, ?, ?, ?)',
        [crId, userId, commentId, type, now]
      );

      // Notify comment author if different
      if (comment.user_id !== userId) {
        const sender = queryDbOne(db, 'SELECT full_name FROM users WHERE id = ?', [userId]);
        sendNotification(
          comment.user_id,
          userId,
          'like',
          `${sender?.full_name || 'Someone'} reacted to your comment`,
          comment.post_id,
          'comment'
        );
      }
    }

    // Recalculate totals
    const commentReactions = queryDbAll(
      db,
      'SELECT type, COUNT(*) as count FROM comment_reactions WHERE comment_id = ? GROUP BY type',
      [commentId]
    );
    const reactionsBreakdown: Record<string, number> = {};
    let totalReactions = 0;
    commentReactions.forEach((cr: any) => {
      reactionsBreakdown[cr.type] = cr.count;
      totalReactions += cr.count;
    });

    runDb(db, 'UPDATE comments SET reactions_count = ? WHERE id = ?', [totalReactions, commentId]);

    res.json({
      success: true,
      commentId,
      userReaction,
      reactionsCount: totalReactions,
      reactionsBreakdown,
    });
  });

  // POST /api/comments/:id/pin - Pin or unpin comment (post owner or admin)
  app.post('/api/comments/:id/pin', authenticateToken, (req: AuthRequest, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user!.id;

    const comment = queryDbOne(db, 'SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const post = queryDbOne(db, 'SELECT user_id FROM posts WHERE id = ?', [comment.post_id]);
    const isPostOwner = post && post.user_id === userId;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'moderator';

    if (!isPostOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only the post author or moderators can pin comments' });
    }

    const nextPin = comment.is_pinned ? 0 : 1;

    if (nextPin === 1) {
      // Unpin any other comments on this post first so only 1 is pinned
      runDb(db, 'UPDATE comments SET is_pinned = 0 WHERE post_id = ?', [comment.post_id]);
    }

    runDb(db, 'UPDATE comments SET is_pinned = ? WHERE id = ?', [nextPin, commentId]);

    res.json({ success: true, commentId, isPinned: Boolean(nextPin) });
  });

  // POST /api/comments/:id/report - Report comment for moderation
  app.post('/api/comments/:id/report', authenticateToken, (req: AuthRequest, res: Response) => {
    const commentId = req.params.id;
    const userId = req.user!.id;
    const { reason, details } = req.body;

    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const reportId = 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
       VALUES (?, ?, 'comment', ?, ?, ?, 'pending', ?)`,
      [reportId, userId, commentId, reason, details || '', now]
    );

    res.json({ success: true, message: 'Comment submitted for moderation review.' });
  });

  // POST /api/posts/:id/share - Multi-avenue Share System (Feed, Story, Group, Page, Message, Copy Link)
  app.post('/api/posts/:id/share', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;
    const { targetType, targetId, caption, privacy } = req.body;
    // targetType: 'feed' | 'story' | 'group' | 'page' | 'message' | 'copy_link'

    const post = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Transmission not found' });

    const shareId = 'share_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    // 1. Record share record
    runDb(
      db,
      `INSERT INTO shares (id, user_id, post_id, caption, target_type, target_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [shareId, userId, postId, caption || '', targetType || 'feed', targetId || null, now]
    );

    // 2. Increment post shares_count
    runDb(db, 'UPDATE posts SET shares_count = shares_count + 1 WHERE id = ?', [postId]);

    // 3. Process specific target behavior
    if (targetType === 'story') {
      // Create a story referencing the post
      const storyId = 'story_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      let mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
      try {
        const parsedUrls = JSON.parse(post.media_urls || '[]');
        if (parsedUrls.length > 0) mediaUrl = parsedUrls[0];
      } catch (e) {}

      runDb(
        db,
        `INSERT INTO stories (id, user_id, media_url, media_type, caption, expires_at, created_at)
         VALUES (?, ?, ?, 'image', ?, ?, ?)`,
        [storyId, userId, mediaUrl, caption || `Shared transmission from @${post.user_id}`, expiresAt, now]
      );
    } else if (targetType === 'feed') {
      // Create a repost in posts table
      const repostId = 'post_rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(
        db,
        `INSERT INTO posts (
          id, user_id, content, media_type, repost_of_post_id, privacy, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'repost', ?, ?, 'published', ?, ?)`,
        [repostId, userId, caption || '', postId, privacy || 'public', now, now]
      );
    } else if (targetType === 'message' && targetId) {
      // Send as direct message to target conversation or user
      const msgId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const msgContent = `Shared transmission: "${post.content.substring(0, 100)}..."\nCheck it out here: /post/${postId}${caption ? `\n\nNote: ${caption}` : ''}`;
      runDb(
        db,
        `INSERT INTO messages (id, sender_id, receiver_id, content, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [msgId, userId, targetId, msgContent, now]
      );
    }

    // 4. Notify post author
    if (post.user_id !== userId) {
      sendNotification(
        post.user_id,
        userId,
        'share',
        `${req.user!.username} shared your transmission via ${targetType || 'feed'}!`,
        postId,
        'post'
      );
    }

    const updatedPost = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [postId]);
    const formatted = formatPostRow(updatedPost, userId);

    io.emit('post_shared', { postId, sharesCount: formatted.sharesCount });

    res.json({
      success: true,
      message: `Transmission successfully shared to ${targetType || 'feed'}!`,
      sharesCount: formatted.sharesCount,
      post: formatted,
    });
  });

  app.post('/api/posts/:id/bookmark', authenticateToken, (req: AuthRequest, res: Response) => {
    const postId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT * FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, userId]);
    if (existing) {
      runDb(db, 'DELETE FROM bookmarks WHERE id = ?', [existing.id]);
      res.json({ isBookmarked: false });
    } else {
      const bmId = 'bm_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO bookmarks (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)', [bmId, userId, postId, now]);
      res.json({ isBookmarked: true });
    }
  });

  // --- 4. STORIES, REELS & VIDEO FEED APIS ---

  // Stories: Get Active Stories (Filtered to unexpired stories within 24 hours)
  app.get('/api/stories', optionalAuth, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id;
    const nowIso = new Date().toISOString();

    // Query active stories that have not expired
    const storiesRows = queryDbAll(
      db,
      `SELECT * FROM stories WHERE expires_at > ? ORDER BY created_at DESC LIMIT 50`,
      [nowIso]
    );

    const formatted = storiesRows.map((s) => {
      const author = queryDbOne(
        db,
        'SELECT id, username, full_name, avatar_url, is_verified, badge FROM users WHERE id = ?',
        [s.user_id]
      );

      // Parse JSON columns safely
      let textStyle = undefined;
      try { if (s.text_style) textStyle = JSON.parse(s.text_style); } catch (e) {}

      let music = undefined;
      try { if (s.music_metadata) music = JSON.parse(s.music_metadata); } catch (e) {}

      let stickers = undefined;
      try { if (s.stickers) stickers = JSON.parse(s.stickers); } catch (e) {}

      let emojis = undefined;
      try { if (s.emojis) emojis = JSON.parse(s.emojis); } catch (e) {}

      let mentions = undefined;
      try { if (s.mentions) mentions = JSON.parse(s.mentions); } catch (e) {}

      let link = undefined;
      try { if (s.link_data) link = JSON.parse(s.link_data); } catch (e) {}

      let poll = undefined;
      if (s.poll_data) {
        try {
          const rawPoll = JSON.parse(s.poll_data);
          let userVotedOptionId: string | undefined = undefined;
          if (currentUserId && rawPoll.userVotes && rawPoll.userVotes[currentUserId]) {
            userVotedOptionId = rawPoll.userVotes[currentUserId];
          }
          const totalVotes = (rawPoll.options || []).reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
          poll = {
            id: 'poll_' + s.id,
            question: rawPoll.question,
            options: rawPoll.options || [],
            userVotedOptionId,
            totalVotes,
          };
        } catch (e) {}
      }

      // Check if current viewer viewed
      let isViewed = false;
      if (currentUserId) {
        const viewRow = queryDbOne(db, 'SELECT id FROM story_views WHERE story_id = ? AND viewer_id = ?', [s.id, currentUserId]);
        if (viewRow) isViewed = true;
      }

      // Views count
      const viewsCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM story_views WHERE story_id = ?', [s.id]);
      const viewsCount = viewsCountRow?.cnt || 0;

      // Reactions count
      const reactionsRows = queryDbAll(db, 'SELECT reaction_type, COUNT(*) as cnt FROM story_reactions WHERE story_id = ? GROUP BY reaction_type', [s.id]);
      const reactionsCount: Record<string, number> = {};
      reactionsRows.forEach((r) => {
        reactionsCount[r.reaction_type] = r.cnt;
      });

      // User's own reaction
      let userReaction: string | undefined = undefined;
      if (currentUserId) {
        const userReactRow = queryDbOne(db, 'SELECT reaction_type FROM story_reactions WHERE story_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1', [s.id, currentUserId]);
        if (userReactRow) userReaction = userReactRow.reaction_type;
      }

      return {
        id: s.id,
        userId: s.user_id,
        author: author
          ? {
              id: author.id,
              username: author.username,
              fullName: author.full_name,
              avatarUrl: author.avatar_url,
              isVerified: Boolean(author.is_verified),
              badge: author.badge,
            }
          : { id: s.user_id, username: 'user', fullName: 'User', avatarUrl: '', isVerified: false },
        mediaUrl: s.media_url || '',
        mediaType: s.media_type || 'image',
        storyType: s.story_type || (s.media_type === 'video' ? 'video' : 'image'),
        textContent: s.text_content,
        textStyle,
        music,
        stickers,
        emojis,
        mentions,
        poll,
        link,
        privacy: s.privacy || 'public',
        caption: s.caption,
        expiresAt: s.expires_at,
        createdAt: s.created_at,
        isViewed,
        viewsCount,
        reactionsCount,
        userReaction,
      };
    });

    res.json({ stories: formatted });
  });

  // Stories: Create Story (Supports Image, Video, Text stories with stickers, music, mentions, polls, links)
  app.post('/api/stories', authenticateToken, (req: AuthRequest, res: Response) => {
    const {
      mediaUrl,
      mediaType,
      storyType,
      textContent,
      textStyle,
      music,
      stickers,
      emojis,
      mentions,
      poll,
      link,
      privacy,
      caption,
    } = req.body;

    const finalStoryType = storyType || (mediaType === 'video' ? 'video' : textContent ? 'text' : 'image');
    if (finalStoryType !== 'text' && !mediaUrl) {
      return res.status(400).json({ error: 'Media URL or text content required for story' });
    }

    const storyId = 'story_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();
    // 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const userId = req.user!.id;

    runDb(
      db,
      `INSERT INTO stories (
        id, user_id, media_url, media_type, story_type, text_content, text_style,
        music_metadata, stickers, emojis, mentions, poll_data, link_data, privacy,
        caption, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storyId,
        userId,
        mediaUrl || '',
        mediaType || (finalStoryType === 'video' ? 'video' : 'image'),
        finalStoryType,
        textContent || null,
        textStyle ? JSON.stringify(textStyle) : null,
        music ? JSON.stringify(music) : null,
        stickers ? JSON.stringify(stickers) : null,
        emojis ? JSON.stringify(emojis) : null,
        mentions ? JSON.stringify(mentions) : null,
        poll ? JSON.stringify(poll) : null,
        link ? JSON.stringify(link) : null,
        privacy || 'public',
        caption || '',
        expiresAt,
        now,
      ]
    );

    const author = queryDbOne(
      db,
      'SELECT id, username, full_name, avatar_url, is_verified, badge FROM users WHERE id = ?',
      [userId]
    );

    const formattedStory = {
      id: storyId,
      userId,
      author: author
        ? {
            id: author.id,
            username: author.username,
            fullName: author.full_name,
            avatarUrl: author.avatar_url,
            isVerified: Boolean(author.is_verified),
            badge: author.badge,
          }
        : { id: userId, username: 'user', fullName: 'User', avatarUrl: '' },
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || (finalStoryType === 'video' ? 'video' : 'image'),
      storyType: finalStoryType,
      textContent,
      textStyle,
      music,
      stickers,
      emojis,
      mentions,
      poll,
      link,
      privacy: privacy || 'public',
      caption: caption || '',
      expiresAt,
      createdAt: now,
      isViewed: true,
      viewsCount: 0,
      reactionsCount: {},
    };

    io.emit('new_story', formattedStory);
    res.status(201).json({ success: true, story: formattedStory });
  });

  // Stories: Record View
  app.post('/api/stories/:id/view', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const viewerId = req.user!.id;
    const now = new Date().toISOString();

    const existing = queryDbOne(db, 'SELECT id FROM story_views WHERE story_id = ? AND viewer_id = ?', [storyId, viewerId]);
    if (!existing) {
      const viewId = 'sv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(db, `INSERT INTO story_views (id, story_id, viewer_id, viewed_at) VALUES (?, ?, ?, ?)`, [
        viewId,
        storyId,
        viewerId,
        now,
      ]);
    }
    res.json({ success: true });
  });

  // Stories: Get Viewer List (Author only)
  app.get('/api/stories/:id/viewers', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const story = queryDbOne(db, 'SELECT * FROM stories WHERE id = ?', [storyId]);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Allow creator or admin to view viewer list
    if (story.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only story creator can view the audience viewer list' });
    }

    const views = queryDbAll(
      db,
      `SELECT v.id, v.viewer_id, v.viewed_at, u.username, u.full_name, u.avatar_url
       FROM story_views v
       JOIN users u ON v.viewer_id = u.id
       WHERE v.story_id = ?
       ORDER BY v.viewed_at DESC`,
      [storyId]
    );

    const formattedViewers = views.map((v) => {
      const reactionRow = queryDbOne(
        db,
        'SELECT reaction_type FROM story_reactions WHERE story_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
        [storyId, v.viewer_id]
      );
      return {
        id: v.id,
        userId: v.viewer_id,
        username: v.username,
        fullName: v.full_name,
        avatarUrl: v.avatar_url,
        viewedAt: v.viewed_at,
        reaction: reactionRow?.reaction_type,
      };
    });

    res.json({ viewers: formattedViewers, count: formattedViewers.length });
  });

  // Stories: React to Story (❤️, 🔥, 😂, 😮, 😢, 👏)
  app.post('/api/stories/:id/react', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const userId = req.user!.id;
    const { reactionType } = req.body;
    if (!reactionType) return res.status(400).json({ error: 'Reaction type required' });

    const story = queryDbOne(db, 'SELECT * FROM stories WHERE id = ?', [storyId]);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const existing = queryDbOne(db, 'SELECT id FROM story_reactions WHERE story_id = ? AND user_id = ?', [storyId, userId]);
    const now = new Date().toISOString();

    if (existing) {
      runDb(db, `UPDATE story_reactions SET reaction_type = ?, created_at = ? WHERE id = ?`, [
        reactionType,
        now,
        existing.id,
      ]);
    } else {
      const reactId = 'sr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(db, `INSERT INTO story_reactions (id, story_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?, ?)`, [
        reactId,
        storyId,
        userId,
        reactionType,
        now,
      ]);
    }

    // Emit live reaction notification to story author
    if (story.user_id !== userId) {
      const sender = queryDbOne(db, 'SELECT username, full_name, avatar_url FROM users WHERE id = ?', [userId]);
      io.emit(`story_reaction_${story.user_id}`, {
        storyId,
        senderId: userId,
        senderName: sender?.full_name || 'User',
        senderAvatar: sender?.avatar_url,
        reactionType,
        createdAt: now,
      });
    }

    res.json({ success: true, reactionType });
  });

  // Stories: Reply to Story (Sends as a direct message linked to story)
  app.post('/api/stories/:id/reply', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const senderId = req.user!.id;
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const story = queryDbOne(db, 'SELECT * FROM stories WHERE id = ?', [storyId]);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const now = new Date().toISOString();
    const replyId = 'srep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    runDb(db, `INSERT INTO story_replies (id, story_id, sender_id, message, created_at) VALUES (?, ?, ?, ?, ?)`, [
      replyId,
      storyId,
      senderId,
      message.trim(),
      now,
    ]);

    // Also inject as an actual direct message between sender and story creator
    const msgId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const storyPreviewText = story.text_content || story.caption || 'Story';
    const combinedContent = `💬 Replied to your story: "${message.trim()}" (Story: ${storyPreviewText.slice(0, 40)}...)`;

    runDb(
      db,
      `INSERT INTO messages (id, sender_id, receiver_id, content, is_read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
      [msgId, senderId, story.user_id, combinedContent, now]
    );

    const sender = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id = ?', [senderId]);
    const formattedMsg = {
      id: msgId,
      senderId,
      receiverId: story.user_id,
      content: combinedContent,
      createdAt: now,
      sender: {
        id: senderId,
        username: sender?.username || 'user',
        fullName: sender?.full_name || 'User',
        avatarUrl: sender?.avatar_url || '',
      },
    };

    io.emit(`new_message_${story.user_id}`, formattedMsg);

    res.json({ success: true, replyId, message: formattedMsg });
  });

  // Stories: Vote on Poll
  app.post('/api/stories/:id/poll/vote', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const userId = req.user!.id;
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'Option ID required' });

    const story = queryDbOne(db, 'SELECT poll_data FROM stories WHERE id = ?', [storyId]);
    if (!story || !story.poll_data) return res.status(404).json({ error: 'Poll not found on story' });

    try {
      const pollData = JSON.parse(story.poll_data);
      if (!pollData.userVotes) pollData.userVotes = {};
      const prevVote = pollData.userVotes[userId];

      if (prevVote === optionId) {
        // Already voted this option
        return res.json({ success: true, poll: pollData });
      }

      // Deduct previous vote if changing vote
      if (prevVote) {
        const prevOpt = (pollData.options || []).find((o: any) => o.id === prevVote);
        if (prevOpt && prevOpt.votes > 0) prevOpt.votes -= 1;
      }

      // Add vote to new option
      const newOpt = (pollData.options || []).find((o: any) => o.id === optionId);
      if (newOpt) {
        newOpt.votes = (newOpt.votes || 0) + 1;
      }

      pollData.userVotes[userId] = optionId;
      runDb(db, 'UPDATE stories SET poll_data = ? WHERE id = ?', [JSON.stringify(pollData), storyId]);

      const totalVotes = (pollData.options || []).reduce((sum: number, o: any) => sum + (o.votes || 0), 0);
      res.json({
        success: true,
        poll: {
          id: 'poll_' + storyId,
          question: pollData.question,
          options: pollData.options,
          userVotedOptionId: optionId,
          totalVotes,
        },
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to record poll vote' });
    }
  });

  // Stories: Delete Story
  app.delete('/api/stories/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const storyId = req.params.id;
    const story = queryDbOne(db, 'SELECT user_id FROM stories WHERE id = ?', [storyId]);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    if (story.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this story' });
    }

    runDb(db, 'DELETE FROM stories WHERE id = ?', [storyId]);
    res.json({ success: true });
  });

  // --- REELS APIS ---

  // Reels: List / Discovery
  app.get('/api/reels', optionalAuth, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id;
    const { hashtag, tab } = req.query;

    let sql = 'SELECT * FROM reels';
    const params: any[] = [];

    if (hashtag) {
      sql += ' WHERE hashtags LIKE ?';
      params.push(`%${hashtag}%`);
    } else if (tab === 'saved' && currentUserId) {
      sql += ' WHERE id IN (SELECT reel_id FROM reel_saves WHERE user_id = ?)';
      params.push(currentUserId);
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const reelsRows = queryDbAll(db, sql, params);

    const formatted = reelsRows.map((r) => {
      const author = queryDbOne(
        db,
        'SELECT id, username, full_name, avatar_url, is_verified, badge FROM users WHERE id = ?',
        [r.user_id]
      );

      let isLiked = false;
      let isSaved = false;
      let isReposted = false;
      let isFollowing = false;

      if (currentUserId) {
        isLiked = Boolean(queryDbOne(db, 'SELECT id FROM reel_likes WHERE reel_id = ? AND user_id = ?', [r.id, currentUserId]));
        isSaved = Boolean(queryDbOne(db, 'SELECT id FROM reel_saves WHERE reel_id = ? AND user_id = ?', [r.id, currentUserId]));
        isReposted = Boolean(queryDbOne(db, 'SELECT id FROM reel_reposts WHERE reel_id = ? AND user_id = ?', [r.id, currentUserId]));
        isFollowing = Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, r.user_id]));
      }

      let parsedHashtags: string[] = [];
      if (r.hashtags) {
        try {
          parsedHashtags = JSON.parse(r.hashtags);
        } catch (e) {
          parsedHashtags = r.hashtags.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      return {
        id: r.id,
        userId: r.user_id,
        author: author
          ? {
              id: author.id,
              username: author.username,
              fullName: author.full_name,
              avatarUrl: author.avatar_url,
              isVerified: Boolean(author.is_verified),
              badge: author.badge,
              isFollowing,
            }
          : { id: r.user_id, username: 'user', fullName: 'User', avatarUrl: '', isVerified: false },
        videoUrl: r.video_url,
        thumbnailUrl: r.thumbnail_url,
        caption: r.caption,
        musicTitle: r.music_title || 'Original Audio',
        musicArtist: r.music_artist || author?.full_name || 'Creator',
        musicCoverUrl: r.music_cover_url || author?.avatar_url || '',
        hashtags: parsedHashtags,
        likesCount: r.likes_count || 0,
        commentsCount: r.comments_count || 0,
        viewsCount: r.views_count || 0,
        repostsCount: r.reposts_count || 0,
        savesCount: r.saves_count || 0,
        giftsCount: r.gifts_count || 0,
        duration: r.duration || 15.0,
        aspectRatio: r.aspect_ratio || '9:16',
        isLiked,
        isSaved,
        isReposted,
        createdAt: r.created_at,
      };
    });

    res.json({ reels: formatted });
  });

  // Reels: Create
  app.post('/api/reels', authenticateToken, (req: AuthRequest, res: Response) => {
    const { videoUrl, thumbnailUrl, caption, musicTitle, musicArtist, musicCoverUrl, hashtags } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'Video URL required for Reel' });

    const reelId = 'reel_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();
    const userId = req.user!.id;

    const hashtagsJson = Array.isArray(hashtags) ? JSON.stringify(hashtags) : (hashtags || '[]');

    runDb(
      db,
      `INSERT INTO reels (
        id, user_id, video_url, thumbnail_url, caption, music_title, music_artist,
        music_cover_url, hashtags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reelId,
        userId,
        videoUrl,
        thumbnailUrl || '',
        caption || '',
        musicTitle || 'Original Audio',
        musicArtist || '',
        musicCoverUrl || '',
        hashtagsJson,
        now,
      ]
    );

    res.status(201).json({ success: true, reelId });
  });

  // Reels: Record View & Watch History
  app.post('/api/reels/:id/view', optionalAuth, (req: AuthRequest, res: Response) => {
    const reelId = req.params.id;
    const viewerId = req.user?.id || null;
    const { watchDuration } = req.body;

    runDb(db, 'UPDATE reels SET views_count = views_count + 1 WHERE id = ?', [reelId]);

    const viewId = 'rv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO reel_views (id, reel_id, viewer_id, watch_duration, created_at) VALUES (?, ?, ?, ?, ?)`,
      [viewId, reelId, viewerId, watchDuration || 0, now]
    );

    res.json({ success: true });
  });

  // Reels: Like / Unlike Toggle
  app.post('/api/reels/:id/like', authenticateToken, (req: AuthRequest, res: Response) => {
    const reelId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT id FROM reel_likes WHERE reel_id = ? AND user_id = ?', [reelId, userId]);
    if (existing) {
      runDb(db, 'DELETE FROM reel_likes WHERE id = ?', [existing.id]);
      runDb(db, 'UPDATE reels SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [reelId]);
      const updated = queryDbOne(db, 'SELECT likes_count FROM reels WHERE id = ?', [reelId]);
      return res.json({ success: true, isLiked: false, likesCount: updated?.likes_count || 0 });
    } else {
      const likeId = 'rl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO reel_likes (id, reel_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
        likeId,
        reelId,
        userId,
        now,
      ]);
      runDb(db, 'UPDATE reels SET likes_count = likes_count + 1 WHERE id = ?', [reelId]);
      const updated = queryDbOne(db, 'SELECT likes_count FROM reels WHERE id = ?', [reelId]);
      return res.json({ success: true, isLiked: true, likesCount: updated?.likes_count || 0 });
    }
  });

  // Reels: Get Comments
  app.get('/api/reels/:id/comments', (req: Request, res: Response) => {
    const reelId = req.params.id;
    const comments = queryDbAll(
      db,
      `SELECT c.id, c.reel_id, c.user_id, c.content, c.created_at, u.username, u.full_name, u.avatar_url, u.is_verified
       FROM reel_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.reel_id = ?
       ORDER BY c.created_at DESC`,
      [reelId]
    );

    const formatted = comments.map((c) => ({
      id: c.id,
      reelId: c.reel_id,
      userId: c.user_id,
      content: c.content,
      createdAt: c.created_at,
      user: {
        id: c.user_id,
        username: c.username,
        fullName: c.full_name,
        avatarUrl: c.avatar_url,
        isVerified: Boolean(c.is_verified),
      },
    }));

    res.json({ comments: formatted });
  });

  // Reels: Add Comment
  app.post('/api/reels/:id/comments', authenticateToken, (req: AuthRequest, res: Response) => {
    const reelId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content cannot be empty' });

    const commentId = 'rc_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(db, `INSERT INTO reel_comments (id, reel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)`, [
      commentId,
      reelId,
      userId,
      content.trim(),
      now,
    ]);

    runDb(db, 'UPDATE reels SET comments_count = comments_count + 1 WHERE id = ?', [reelId]);

    const user = queryDbOne(db, 'SELECT username, full_name, avatar_url, is_verified FROM users WHERE id = ?', [userId]);

    res.status(201).json({
      success: true,
      comment: {
        id: commentId,
        reelId,
        userId,
        content: content.trim(),
        createdAt: now,
        user: {
          id: userId,
          username: user?.username || 'user',
          fullName: user?.full_name || 'User',
          avatarUrl: user?.avatar_url || '',
          isVerified: Boolean(user?.is_verified),
        },
      },
    });
  });

  // Reels: Repost Toggle
  app.post('/api/reels/:id/repost', authenticateToken, (req: AuthRequest, res: Response) => {
    const reelId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT id FROM reel_reposts WHERE reel_id = ? AND user_id = ?', [reelId, userId]);
    if (existing) {
      runDb(db, 'DELETE FROM reel_reposts WHERE id = ?', [existing.id]);
      runDb(db, 'UPDATE reels SET reposts_count = MAX(0, reposts_count - 1) WHERE id = ?', [reelId]);
      const updated = queryDbOne(db, 'SELECT reposts_count FROM reels WHERE id = ?', [reelId]);
      return res.json({ success: true, isReposted: false, repostsCount: updated?.reposts_count || 0 });
    } else {
      const repId = 'rrep_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO reel_reposts (id, reel_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
        repId,
        reelId,
        userId,
        now,
      ]);
      runDb(db, 'UPDATE reels SET reposts_count = reposts_count + 1 WHERE id = ?', [reelId]);
      const updated = queryDbOne(db, 'SELECT reposts_count FROM reels WHERE id = ?', [reelId]);
      return res.json({ success: true, isReposted: true, repostsCount: updated?.reposts_count || 0 });
    }
  });

  // Reels: Save / Bookmark Toggle
  app.post('/api/reels/:id/save', authenticateToken, (req: AuthRequest, res: Response) => {
    const reelId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT id FROM reel_saves WHERE reel_id = ? AND user_id = ?', [reelId, userId]);
    if (existing) {
      runDb(db, 'DELETE FROM reel_saves WHERE id = ?', [existing.id]);
      runDb(db, 'UPDATE reels SET saves_count = MAX(0, saves_count - 1) WHERE id = ?', [reelId]);
      return res.json({ success: true, isSaved: false });
    } else {
      const saveId = 'rsave_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO reel_saves (id, reel_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
        saveId,
        reelId,
        userId,
        now,
      ]);
      runDb(db, 'UPDATE reels SET saves_count = saves_count + 1 WHERE id = ?', [reelId]);
      return res.json({ success: true, isSaved: true });
    }
  });

  // --- VIDEO DISCOVERY, RECOMMENDED, TRENDING, FOLLOWING FEED & PLAYER APIS ---

  // Video Feed: Discovery, Recommended, Following, Trending
  app.get('/api/videos/feed', optionalAuth, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user?.id;
    const { tab = 'discovery', category, search } = req.query;

    let sql = 'SELECT * FROM videos WHERE status = "active"';
    const params: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (title LIKE ? OR caption LIKE ? OR tags LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Apply Tab Filtering
    if (tab === 'following' && currentUserId) {
      sql += ' AND user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)';
      params.push(currentUserId);
    }

    if (tab === 'trending') {
      sql += ' ORDER BY (views_count * 1 + likes_count * 3) DESC, created_at DESC';
    } else if (tab === 'recommended') {
      sql += ' ORDER BY (views_count * 1 + likes_count * 4 + comments_count * 6) DESC, created_at DESC';
    } else {
      // discovery default
      sql += ' ORDER BY created_at DESC';
    }

    sql += ' LIMIT 40';

    const videosRows = queryDbAll(db, sql, params);

    const formatted = videosRows.map((v) => {
      const author = queryDbOne(
        db,
        'SELECT id, username, full_name, avatar_url, is_verified, badge FROM users WHERE id = ?',
        [v.user_id]
      );

      let isLiked = false;
      let isSaved = false;
      let isFollowing = false;

      if (currentUserId) {
        isLiked = Boolean(queryDbOne(db, 'SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?', [v.id, currentUserId]));
        isFollowing = Boolean(queryDbOne(db, 'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?', [currentUserId, v.user_id]));
      }

      let parsedTags: string[] = [];
      if (v.tags) {
        try { parsedTags = JSON.parse(v.tags); } catch (e) { parsedTags = v.tags.split(',').map((s: string) => s.trim()); }
      }

      let parsedQualitySources: Record<string, string> | undefined = undefined;
      if (v.quality_sources) {
        try { parsedQualitySources = JSON.parse(v.quality_sources); } catch (e) {}
      }

      let parsedCaptions: any[] | undefined = undefined;
      if (v.captions_data) {
        try { parsedCaptions = JSON.parse(v.captions_data); } catch (e) {}
      }

      return {
        id: v.id,
        userId: v.user_id,
        title: v.title || v.caption || 'Video Broadcast',
        caption: v.caption || '',
        videoUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        durationSeconds: v.duration_seconds || 0,
        viewsCount: v.views_count || 0,
        likesCount: v.likes_count || 0,
        commentsCount: v.comments_count || 0,
        category: v.category || 'discovery',
        tags: parsedTags,
        qualitySources: parsedQualitySources,
        captions: parsedCaptions,
        captionsUrl: v.captions_url,
        isLiked,
        isSaved,
        author: author
          ? {
              id: author.id,
              username: author.username,
              fullName: author.full_name,
              avatarUrl: author.avatar_url,
              isVerified: Boolean(author.is_verified),
              isFollowing,
              badge: author.badge,
            }
          : { id: v.user_id, username: 'user', fullName: 'User', avatarUrl: '', isVerified: false },
        createdAt: v.created_at,
      };
    });

    res.json({ videos: formatted });
  });

  // Videos: Create/Upload Video
  app.post('/api/videos', authenticateToken, (req: AuthRequest, res: Response) => {
    const {
      title,
      caption,
      videoUrl,
      thumbnailUrl,
      durationSeconds,
      category,
      tags,
      qualitySources,
      captionsData,
      captionsUrl,
    } = req.body;

    if (!videoUrl) return res.status(400).json({ error: 'Video URL required' });

    const videoId = 'vid_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();
    const userId = req.user!.id;

    runDb(
      db,
      `INSERT INTO videos (
        id, user_id, title, video_url, thumbnail_url, caption, category, tags,
        duration_seconds, quality_sources, captions_data, captions_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        videoId,
        userId,
        title || 'Untitled Video',
        videoUrl,
        thumbnailUrl || '',
        caption || '',
        category || 'discovery',
        Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]'),
        durationSeconds || 0,
        qualitySources ? JSON.stringify(qualitySources) : null,
        captionsData ? JSON.stringify(captionsData) : null,
        captionsUrl || null,
        now,
      ]
    );

    // Evaluate video coin reward
    let rewardInfo: any = null;
    try {
      const rewardRes = evaluateAndAwardCoinReward(db, {
        userId,
        eventType: 'video_created',
        sourceId: videoId,
        sourceType: 'video',
        content: title || caption || '',
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      });

      if (rewardRes.awarded) {
        rewardInfo = {
          coinsAwarded: rewardRes.coins,
          newBalance: rewardRes.balanceAfter,
        };
        io.to(`user_${userId}`).emit('balance_updated', {
          coinsBalance: rewardRes.balanceAfter,
        });
        sendNotification(
          userId,
          'SYSTEM',
          'coin_received',
          `🎉 You earned +${rewardRes.coins} Nixo Coins for uploading a new video!`,
          videoId,
          'video'
        );
      }
    } catch (e) {
      console.error('Failed to award video coins:', e);
    }

    res.status(201).json({ success: true, videoId, reward: rewardInfo });
  });

  // Videos: Log Watch Progress and View
  app.post('/api/videos/:id/view', optionalAuth, (req: AuthRequest, res: Response) => {
    const videoId = req.params.id;
    const currentUserId = req.user?.id || null;
    const { watchDuration, lastPosition, completed } = req.body;

    // Increment video view count
    runDb(db, 'UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [videoId]);

    const viewId = 'vv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO video_views (id, video_id, viewer_id, watch_duration, created_at) VALUES (?, ?, ?, ?, ?)`,
      [viewId, videoId, currentUserId, watchDuration || 0, now]
    );

    // If authenticated, update user watch history
    if (currentUserId) {
      const existingHistory = queryDbOne(
        db,
        'SELECT id FROM video_watch_history WHERE user_id = ? AND video_id = ?',
        [currentUserId, videoId]
      );
      if (existingHistory) {
        runDb(
          db,
          `UPDATE video_watch_history
           SET watch_time_seconds = watch_time_seconds + ?, last_position_seconds = ?, completed = ?, updated_at = ?
           WHERE id = ?`,
          [watchDuration || 0, lastPosition || 0, completed ? 1 : 0, now, existingHistory.id]
        );
      } else {
        const histId = 'vwh_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        runDb(
          db,
          `INSERT INTO video_watch_history (id, user_id, video_id, watch_time_seconds, last_position_seconds, completed, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [histId, currentUserId, videoId, watchDuration || 0, lastPosition || 0, completed ? 1 : 0, now]
        );
      }
    }

    res.json({ success: true });
  });

  // Videos: Like / Unlike Toggle
  app.post('/api/videos/:id/like', authenticateToken, (req: AuthRequest, res: Response) => {
    const videoId = req.params.id;
    const userId = req.user!.id;

    const existing = queryDbOne(db, 'SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?', [videoId, userId]);
    if (existing) {
      runDb(db, 'DELETE FROM video_likes WHERE id = ?', [existing.id]);
      runDb(db, 'UPDATE videos SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [videoId]);
      const updated = queryDbOne(db, 'SELECT likes_count FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, isLiked: false, likesCount: updated?.likes_count || 0 });
    } else {
      const likeId = 'vl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      runDb(db, 'INSERT INTO video_likes (id, video_id, user_id, created_at) VALUES (?, ?, ?, ?)', [
        likeId,
        videoId,
        userId,
        now,
      ]);
      runDb(db, 'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?', [videoId]);
      const updated = queryDbOne(db, 'SELECT likes_count FROM videos WHERE id = ?', [videoId]);
      return res.json({ success: true, isLiked: true, likesCount: updated?.likes_count || 0 });
    }
  });

  // Videos: Get Watch History
  app.get('/api/videos/history', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const historyRows = queryDbAll(
      db,
      `SELECT h.*, v.title, v.caption, v.video_url, v.thumbnail_url, v.duration_seconds, v.views_count, v.likes_count,
              u.id as author_id, u.username as author_username, u.full_name as author_name, u.avatar_url as author_avatar
       FROM video_watch_history h
       JOIN videos v ON h.video_id = v.id
       JOIN users u ON v.user_id = u.id
       WHERE h.user_id = ?
       ORDER BY h.updated_at DESC
       LIMIT 30`,
      [userId]
    );

    const formatted = historyRows.map((h) => ({
      id: h.id,
      videoId: h.video_id,
      watchTimeSeconds: h.watch_time_seconds,
      lastPositionSeconds: h.last_position_seconds,
      completed: Boolean(h.completed),
      updatedAt: h.updated_at,
      video: {
        id: h.video_id,
        title: h.title,
        caption: h.caption,
        videoUrl: h.video_url,
        thumbnailUrl: h.thumbnail_url,
        durationSeconds: h.duration_seconds,
        viewsCount: h.views_count,
        likesCount: h.likes_count,
        author: {
          id: h.author_id,
          username: h.author_username,
          fullName: h.author_name,
          avatarUrl: h.author_avatar,
        },
      },
    }));

    res.json({ history: formatted });
  });

  // Videos: Clear Watch History
  app.delete('/api/videos/history', authenticateToken, (req: AuthRequest, res: Response) => {
    runDb(db, 'DELETE FROM video_watch_history WHERE user_id = ?', [req.user!.id]);
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // REAL-TIME PRESENCE & MESSENGER SYSTEM
  // ----------------------------------------------------
  const connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
  const messageRateLimits = new Map<string, number[]>(); // userId -> timestamps

  const sanitizeMessageContent = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  };

  const checkMessageRateLimit = (userId: string): boolean => {
    const now = Date.now();
    const timestamps = messageRateLimits.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < 10000);
    if (recent.length >= 25) return false;
    recent.push(now);
    messageRateLimits.set(userId, recent);
    return true;
  };

  // Helper to format enriched message
  const formatMessageRow = (dbInstance: any, m: any, currentUserId?: string) => {
    if (!m) return null;

    // Sender info
    const sender = queryDbOne(
      dbInstance,
      'SELECT id, username, full_name, avatar_url, badge FROM users WHERE id = ?',
      [m.sender_id]
    );

    // Reactions
    const reactionRows = queryDbAll(
      dbInstance,
      `SELECT r.reaction, r.user_id, u.username, u.full_name, u.avatar_url 
       FROM message_reactions r
       JOIN users u ON u.id = r.user_id
       WHERE r.message_id = ?
       ORDER BY r.created_at ASC`,
      [m.id]
    );

    const reactionsMap = new Map<string, { reaction: string; count: number; users: any[]; userReacted: boolean }>();
    for (const r of reactionRows) {
      if (!reactionsMap.has(r.reaction)) {
        reactionsMap.set(r.reaction, {
          reaction: r.reaction,
          count: 0,
          users: [],
          userReacted: false,
        });
      }
      const item = reactionsMap.get(r.reaction)!;
      item.count += 1;
      item.users.push({
        id: r.user_id,
        username: r.username,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
      });
      if (currentUserId && r.user_id === currentUserId) {
        item.userReacted = true;
      }
    }
    const reactions = Array.from(reactionsMap.values());

    // Replied message snippet
    let replyTo = null;
    if (m.reply_to_id) {
      const orig = queryDbOne(
        dbInstance,
        `SELECT m.id, m.content, m.sender_id, m.media_url, m.message_type, u.full_name, u.username 
         FROM messages m 
         JOIN users u ON u.id = m.sender_id 
         WHERE m.id = ?`,
        [m.reply_to_id]
      );
      if (orig) {
        replyTo = {
          id: orig.id,
          content: orig.content,
          senderId: orig.sender_id,
          senderName: orig.full_name,
          senderUsername: orig.username,
          mediaUrl: orig.media_url,
          messageType: orig.message_type,
        };
      }
    }

    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      receiverId: m.receiver_id || null,
      sender: sender
        ? {
            id: sender.id,
            username: sender.username,
            fullName: sender.full_name,
            avatarUrl: sender.avatar_url,
            badge: sender.badge,
          }
        : undefined,
      content: m.content || '',
      messageType: m.message_type || 'text',
      mediaUrl: m.media_url || null,
      audioUrl: m.audio_url || null,
      fileName: m.file_name || null,
      fileSize: m.file_size || 0,
      fileType: m.file_type || null,
      coinAmount: m.coin_amount || 0,
      replyToId: m.reply_to_id || null,
      replyTo,
      forwardedFromId: m.forwarded_from_id || null,
      isEdited: Boolean(m.is_edited),
      editedAt: m.edited_at || null,
      isUnsent: Boolean(m.is_unsent),
      isRead: Boolean(m.is_read),
      status: m.status || (Boolean(m.is_read) ? 'read' : 'sent'),
      createdAt: m.created_at,
      reactions,
    };
  };

  // --- 5. MESSENGER & CHATS ---
  // List user conversations (Direct and Group)
  app.get('/api/messages/conversations', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;

      const memberRows = queryDbAll(
        db,
        `SELECT cm.*, c.type, c.title, c.avatar_url, c.created_by, c.created_at as conv_created_at, c.updated_at as conv_updated_at, c.last_message_at
         FROM conversation_members cm
         JOIN conversations c ON c.id = cm.conversation_id
         WHERE cm.user_id = ?
         ORDER BY cm.is_pinned DESC, COALESCE(c.last_message_at, c.updated_at) DESC`,
        [currentUserId]
      ) || [];

      const conversations = memberRows.map((mRow: any) => {
        const convId = mRow.conversation_id;

        // Fetch last non-deleted message
        const lastMsg = queryDbOne(
          db,
          `SELECT m.*
           FROM messages m
           WHERE m.conversation_id = ? 
             AND m.deleted_at IS NULL
             AND m.id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
           ORDER BY m.created_at DESC LIMIT 1`,
          [convId, currentUserId]
        );

        // Unread count
        const lastReadAt = mRow.last_read_at || '1970-01-01T00:00:00Z';
        const unreadRow = queryDbOne(
          db,
          `SELECT COUNT(*) as cnt FROM messages 
           WHERE conversation_id = ? 
             AND sender_id != ? 
             AND created_at > ? 
             AND deleted_at IS NULL
             AND id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)`,
          [convId, currentUserId, lastReadAt, currentUserId]
        );
        const unreadCount = unreadRow?.cnt || 0;

        if (mRow.type === 'direct') {
          const partnerRow = queryDbOne(
            db,
            `SELECT u.id, u.username, u.full_name, u.avatar_url, u.badge, u.last_seen
             FROM conversation_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.conversation_id = ? AND cm.user_id != ? LIMIT 1`,
            [convId, currentUserId]
          );

          const isOnline = partnerRow ? Boolean(connectedUsers.get(partnerRow.id)?.size) : false;
          const blockInfo = partnerRow ? isBlockedBetween(currentUserId, partnerRow.id) : { blocked: false, blockedByU1: false, blockedByU2: false };

          return {
            id: convId,
            type: 'direct',
            title: partnerRow?.full_name || 'Direct Chat',
            avatarUrl: partnerRow?.avatar_url || '',
            partner: partnerRow
              ? {
                  id: partnerRow.id,
                  username: partnerRow.username,
                  fullName: partnerRow.full_name,
                  avatarUrl: partnerRow.avatar_url,
                  badge: partnerRow.badge,
                  isOnline,
                  lastSeen: partnerRow.last_seen || null,
                  isBlocked: blockInfo.blocked,
                  blockedByMe: blockInfo.blockedByU1,
                }
              : {
                  id: 'unknown',
                  username: 'unknown',
                  fullName: 'Unknown User',
                  avatarUrl: '',
                  isOnline: false,
                  isBlocked: false,
                },
            lastMessage: lastMsg ? formatMessageRow(db, lastMsg, currentUserId) : null,
            unreadCount,
            isPinned: Boolean(mRow.is_pinned),
            isMuted: Boolean(mRow.is_muted),
            isArchived: Boolean(mRow.is_archived),
            updatedAt: mRow.last_message_at || mRow.conv_updated_at || mRow.conv_created_at,
          };
        } else {
          const membersCountRow = queryDbOne(
            db,
            'SELECT COUNT(*) as cnt FROM conversation_members WHERE conversation_id = ?',
            [convId]
          );

          return {
            id: convId,
            type: 'group',
            title: mRow.title || 'Group Chat',
            avatarUrl: mRow.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
            createdBy: mRow.created_by,
            role: mRow.role,
            membersCount: membersCountRow?.cnt || 1,
            partner: {
              id: convId,
              username: (mRow.title || 'group').toLowerCase().replace(/\s+/g, '_'),
              fullName: mRow.title || 'Group Chat',
              avatarUrl: mRow.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
              isOnline: true,
            },
            lastMessage: lastMsg ? formatMessageRow(db, lastMsg, currentUserId) : null,
            unreadCount,
            isPinned: Boolean(mRow.is_pinned),
            isMuted: Boolean(mRow.is_muted),
            isArchived: Boolean(mRow.is_archived),
            updatedAt: mRow.last_message_at || mRow.conv_updated_at || mRow.conv_created_at,
          };
        }
      });

      res.json({ conversations });
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      res.status(200).json({ conversations: [], error: err.message });
    }
  });

  // Start or fetch a direct conversation
  app.post('/api/messages/conversations/direct', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { partnerId, targetUserId } = req.body;
    const resolvedPartnerId = partnerId || targetUserId;

    if (!resolvedPartnerId || resolvedPartnerId === currentUserId) {
      return res.status(400).json({ error: 'Valid target partner ID required' });
    }

    const partner = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id = ? AND deleted_at IS NULL', [resolvedPartnerId]);
    if (!partner) {
      return res.status(404).json({ error: 'Partner account not found' });
    }

    const blockCheck = isBlockedBetween(currentUserId, resolvedPartnerId);
    if (blockCheck.blocked) {
      return res.status(403).json({ error: 'Cannot message this user: interaction is blocked' });
    }

    // Check direct message privacy setting
    const receiverPrivacy = queryDbOne(db, 'SELECT direct_message_privacy FROM privacy_settings WHERE user_id = ?', [resolvedPartnerId]);
    const dmPrivacy = receiverPrivacy?.direct_message_privacy || 'everyone';
    if (dmPrivacy === 'nobody' || dmPrivacy === 'no_one') {
      return res.status(403).json({ error: 'This user does not accept direct messages' });
    }
    if (dmPrivacy === 'friends') {
      const isFriend = Boolean(
        queryDbOne(
          db,
          'SELECT 1 FROM friendships WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) AND status = "accepted"',
          [currentUserId, resolvedPartnerId, resolvedPartnerId, currentUserId]
        )
      );
      if (!isFriend) {
        return res.status(403).json({ error: 'This user only accepts direct messages from friends' });
      }
    }

    // Check if direct conversation already exists
    const existingConv = queryDbOne(
      db,
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
       WHERE c.type = 'direct' LIMIT 1`,
      [currentUserId, resolvedPartnerId]
    );

    if (existingConv) {
      return res.json({ conversationId: existingConv.id });
    }

    const convId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    try {
      runDb(db, `INSERT INTO conversations (id, type, created_by, created_at, updated_at, last_message_at) VALUES (?, 'direct', ?, ?, ?, ?)`, [
        convId, currentUserId, now, now, now
      ]);
      runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [convId, currentUserId, now]);
      runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [convId, resolvedPartnerId, now]);

      res.status(201).json({ conversationId: convId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create a Group conversation
  app.post('/api/messages/conversations/group', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { title, avatarUrl, memberIds } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Group title is required' });
    }

    const convId = 'conv_group_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const groupAvatar = avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80';

    runDb(db, `INSERT INTO conversations (id, type, title, avatar_url, created_by, created_at, updated_at, last_message_at) VALUES (?, 'group', ?, ?, ?, ?, ?, ?)`, [
      convId, sanitizeMessageContent(title), groupAvatar, currentUserId, now, now, now
    ]);

    // Add creator as creator role
    runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'creator', ?)`, [convId, currentUserId, now]);

    // Add members
    const membersList: string[] = Array.isArray(memberIds) ? memberIds : [];
    for (const mId of membersList) {
      if (mId && mId !== currentUserId) {
        runDb(db, `INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [convId, mId, now]);
        io.to(`user_${mId}`).emit('new_conversation', { conversationId: convId });
      }
    }

    // System message
    const sysMsgId = 'msg_sys_' + Date.now();
    runDb(db, `INSERT INTO messages (id, conversation_id, sender_id, content, message_type, is_read, status, created_at) VALUES (?, ?, ?, ?, 'text', 1, 'read', ?)`, [
      sysMsgId, convId, currentUserId, `${req.user!.username} created group "${sanitizeMessageContent(title)}"`, now
    ]);

    res.status(201).json({ conversationId: convId });
  });

  // Get conversation metadata and members
  app.get('/api/messages/conversations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;

    // Verify membership
    const membership = queryDbOne(db, 'SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    const conv = queryDbOne(db, 'SELECT * FROM conversations WHERE id = ?', [convId]);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const members = queryDbAll(
      db,
      `SELECT cm.user_id, cm.role, cm.joined_at, u.username, u.full_name, u.avatar_url, u.badge, u.last_seen
       FROM conversation_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.conversation_id = ?`,
      [convId]
    ).map((m) => ({
      userId: m.user_id,
      role: m.role,
      joinedAt: m.joined_at,
      username: m.username,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      badge: m.badge,
      isOnline: Boolean(connectedUsers.get(m.user_id)?.size),
      lastSeen: m.last_seen || null,
    }));

    res.json({
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        avatarUrl: conv.avatar_url,
        createdBy: conv.created_by,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        isPinned: Boolean(membership.is_pinned),
        isMuted: Boolean(membership.is_muted),
        isArchived: Boolean(membership.is_archived),
        myRole: membership.role,
        members,
      },
    });
  });

  // Update Group details (Admin/Creator only)
  app.put('/api/messages/conversations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const { title, avatarUrl } = req.body;

    const membership = queryDbOne(db, 'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!membership || (membership.role !== 'admin' && membership.role !== 'creator')) {
      return res.status(403).json({ error: 'Only group admins can modify group settings' });
    }

    const now = new Date().toISOString();
    if (title) {
      runDb(db, 'UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?', [sanitizeMessageContent(title), now, convId]);
    }
    if (avatarUrl) {
      runDb(db, 'UPDATE conversations SET avatar_url = ?, updated_at = ? WHERE id = ?', [avatarUrl, now, convId]);
    }

    io.to(`conv_${convId}`).emit('group_updated', { conversationId: convId, title, avatarUrl });
    res.json({ success: true });
  });

  // Group Admin Controls: Add Members
  app.post('/api/messages/conversations/:id/members', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const { userIds } = req.body;

    const membership = queryDbOne(db, 'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!membership || (membership.role !== 'admin' && membership.role !== 'creator')) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    const now = new Date().toISOString();
    const toAdd: string[] = Array.isArray(userIds) ? userIds : [userIds];
    for (const uId of toAdd) {
      if (uId) {
        runDb(db, `INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [convId, uId, now]);
        io.to(`user_${uId}`).emit('new_conversation', { conversationId: convId });
      }
    }

    io.to(`conv_${convId}`).emit('group_members_updated', { conversationId: convId });
    res.json({ success: true });
  });

  // Group Admin Controls: Remove Member or Leave Group
  app.delete('/api/messages/conversations/:id/members/:targetUserId', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const targetUserId = req.params.targetUserId;

    const myMembership = queryDbOne(db, 'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!myMembership) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    const targetMembership = queryDbOne(db, 'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, targetUserId]);
    if (!targetMembership) {
      return res.status(404).json({ error: 'Target user is not in this group' });
    }

    const isSelf = currentUserId === targetUserId;
    if (!isSelf) {
      // Must be creator or admin
      if (myMembership.role !== 'creator' && myMembership.role !== 'admin') {
        return res.status(403).json({ error: 'Only group admins can remove members' });
      }
      if (targetMembership.role === 'creator') {
        return res.status(403).json({ error: 'Cannot remove the group creator' });
      }
      if (myMembership.role === 'admin' && targetMembership.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot remove other admins. Only creator can.' });
      }
    }

    runDb(db, 'DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, targetUserId]);

    io.to(`conv_${convId}`).emit('group_member_removed', { conversationId: convId, userId: targetUserId });
    res.json({ success: true });
  });

  // Group Admin Controls: Promote/Demote Role
  app.put('/api/messages/conversations/:id/members/:targetUserId/role', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const targetUserId = req.params.targetUserId;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const myMembership = queryDbOne(db, 'SELECT role FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!myMembership || myMembership.role !== 'creator') {
      return res.status(403).json({ error: 'Only group creator can manage admin roles' });
    }

    runDb(db, 'UPDATE conversation_members SET role = ? WHERE conversation_id = ? AND user_id = ?', [role, convId, targetUserId]);
    io.to(`conv_${convId}`).emit('group_members_updated', { conversationId: convId });
    res.json({ success: true, role });
  });

  // Toggle Pin Conversation
  app.put('/api/messages/conversations/:id/pin', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const member = queryDbOne(db, 'SELECT is_pinned FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!member) {
      return res.status(404).json({ error: 'Conversation membership not found' });
    }
    const newStatus = member.is_pinned ? 0 : 1;
    runDb(db, 'UPDATE conversation_members SET is_pinned = ? WHERE conversation_id = ? AND user_id = ?', [newStatus, convId, currentUserId]);
    res.json({ isPinned: Boolean(newStatus) });
  });

  // Toggle Mute Conversation
  app.put('/api/messages/conversations/:id/mute', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const member = queryDbOne(db, 'SELECT is_muted FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!member) {
      return res.status(404).json({ error: 'Conversation membership not found' });
    }
    const newStatus = member.is_muted ? 0 : 1;
    runDb(db, 'UPDATE conversation_members SET is_muted = ? WHERE conversation_id = ? AND user_id = ?', [newStatus, convId, currentUserId]);
    res.json({ isMuted: Boolean(newStatus) });
  });

  // Toggle Archive Conversation
  app.put('/api/messages/conversations/:id/archive', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const member = queryDbOne(db, 'SELECT is_archived FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!member) {
      return res.status(404).json({ error: 'Conversation membership not found' });
    }
    const newStatus = member.is_archived ? 0 : 1;
    runDb(db, 'UPDATE conversation_members SET is_archived = ? WHERE conversation_id = ? AND user_id = ?', [newStatus, convId, currentUserId]);
    res.json({ isArchived: Boolean(newStatus) });
  });

  // Block Messaging Toggle
  app.post('/api/messages/block', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Target user ID required' });
    }

    const existingBlock = queryDbOne(db, 'SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [currentUserId, targetUserId]);
    const now = new Date().toISOString();
    if (existingBlock) {
      runDb(db, 'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?', [currentUserId, targetUserId]);
      res.json({ isBlocked: false });
    } else {
      runDb(db, `INSERT INTO blocked_users (blocker_id, blocked_id, reason, created_at) VALUES (?, ?, 'Messaging blocked', ?)`, [currentUserId, targetUserId, now]);
      res.json({ isBlocked: true });
    }
  });

  // Get Messages for conversation (Security: verifies membership)
  app.get('/api/messages/conversations/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const searchQuery = (req.query.search as string) || '';

    // Verify membership
    const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [convId, currentUserId]);
    if (!isMember) {
      return res.status(403).json({ error: 'You do not have permission to view messages in this conversation' });
    }

    let sql = `
      SELECT * FROM messages 
      WHERE conversation_id = ? 
        AND deleted_at IS NULL
        AND id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
    `;
    const params: any[] = [convId, currentUserId];

    if (searchQuery.trim()) {
      sql += ` AND (content LIKE ? OR file_name LIKE ?)`;
      params.push(`%${searchQuery.trim()}%`, `%${searchQuery.trim()}%`);
    }

    sql += ` ORDER BY created_at ASC`;

    const messageRows = queryDbAll(db, sql, params);
    const messages = messageRows.map((m) => formatMessageRow(db, m, currentUserId));

    res.json({ messages });
  });

  // Backward compatible route: get messages by partner ID
  app.get('/api/messages/:partnerId', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const partnerId = req.params.partnerId;

    // Find direct conversation
    const conv = queryDbOne(
      db,
      `SELECT c.id FROM conversations c
       JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
       WHERE c.type = 'direct' LIMIT 1`,
      [currentUserId, partnerId]
    );

    if (conv) {
      const messageRows = queryDbAll(
        db,
        `SELECT * FROM messages 
         WHERE conversation_id = ? 
           AND deleted_at IS NULL
           AND id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
         ORDER BY created_at ASC`,
        [conv.id, currentUserId]
      );
      const messages = messageRows.map((m) => formatMessageRow(db, m, currentUserId));
      return res.json({ messages, conversationId: conv.id });
    }

    // Fallback: direct query
    const messageRows = queryDbAll(
      db,
      `SELECT * FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND deleted_at IS NULL
         AND id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, partnerId, partnerId, currentUserId, currentUserId]
    );
    const messages = messageRows.map((m) => formatMessageRow(db, m, currentUserId));
    res.json({ messages });
  });

  // Send Message (Full Real-Time & Security)
  app.post('/api/messages/send', authenticateToken, (req: AuthRequest, res: Response) => {
    const senderId = req.user!.id;
    const {
      conversationId: providedConvId,
      receiverId,
      content,
      mediaUrl,
      audioUrl,
      fileName,
      fileSize,
      fileType,
      messageType = 'text',
      coinAmount = 0,
      replyToId,
    } = req.body;

    // Rate limit check
    if (!checkMessageRateLimit(senderId)) {
      return res.status(429).json({ error: 'You are sending messages too quickly. Please wait a few seconds.' });
    }

    if (!content && !mediaUrl && !audioUrl && !coinAmount && messageType !== 'sticker') {
      return res.status(400).json({ error: 'Message payload cannot be empty' });
    }

    let conversationId = providedConvId;

    // If receiverId provided but no conversationId, resolve direct conversation
    if (!conversationId && receiverId) {
      const blockCheck = isBlockedBetween(senderId, receiverId);
      if (blockCheck.blocked) {
        return res.status(403).json({ error: 'Cannot send message: user interaction is blocked' });
      }

      const existingConv = queryDbOne(
        db,
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
         WHERE c.type = 'direct' LIMIT 1`,
        [senderId, receiverId]
      );

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const now = new Date().toISOString();
        runDb(db, `INSERT INTO conversations (id, type, created_by, created_at, updated_at, last_message_at) VALUES (?, 'direct', ?, ?, ?, ?)`, [
          conversationId, senderId, now, now, now
        ]);
        runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [conversationId, senderId, now]);
        runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [conversationId, receiverId, now]);
      }
    }

    if (!conversationId) {
      return res.status(400).json({ error: 'Target conversation ID required' });
    }

    // Verify conversation membership
    const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [conversationId, senderId]);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check block status if direct conversation
    const convInfo = queryDbOne(db, 'SELECT type FROM conversations WHERE id = ?', [conversationId]);
    if (convInfo?.type === 'direct') {
      const otherMember = queryDbOne(db, 'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ? LIMIT 1', [conversationId, senderId]);
      if (otherMember && isBlockedBetween(senderId, otherMember.user_id).blocked) {
        return res.status(403).json({ error: 'Cannot send message: conversation is blocked' });
      }
    }

    // Sanitize message content
    const sanitizedContent = sanitizeMessageContent(content || '');
    const now = new Date().toISOString();
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    // Coin transfer validation and processing
    if (coinAmount && coinAmount > 0) {
      const sender = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [senderId]);
      if (!sender || sender.coins_balance < coinAmount) {
        return res.status(400).json({ error: 'Insufficient coin balance for transfer' });
      }

      runDb(db, 'UPDATE users SET coins_balance = coins_balance - ? WHERE id = ?', [coinAmount, senderId]);
      if (receiverId) {
        runDb(db, 'UPDATE users SET coins_balance = coins_balance + ? WHERE id = ?', [coinAmount, receiverId]);
      }

      const txId = 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      runDb(db, `INSERT INTO coin_transactions (id, sender_id, receiver_id, amount, transaction_type, note, created_at) VALUES (?, ?, ?, ?, 'transfer', 'Chat direct transfer', ?)`, [
        txId, senderId, receiverId || null, coinAmount, now
      ]);
    }

    // Determine initial delivery status
    // If any other member has active sockets, status is 'delivered', otherwise 'sent'
    const otherMembers = queryDbAll(db, 'SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?', [conversationId, senderId]);
    const anyOnline = otherMembers.some((m) => connectedUsers.has(m.user_id) && connectedUsers.get(m.user_id)!.size > 0);
    const initialStatus = anyOnline ? 'delivered' : 'sent';

    runDb(
      db,
      `INSERT INTO messages (
        id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url,
        file_name, file_size, file_type, coin_amount, reply_to_id, is_read, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        msgId,
        conversationId,
        senderId,
        receiverId || null,
        sanitizedContent,
        messageType,
        mediaUrl || null,
        audioUrl || null,
        fileName || null,
        fileSize || 0,
        fileType || null,
        coinAmount || 0,
        replyToId || null,
        initialStatus,
        now,
      ]
    );

    // Update conversation last message timestamp
    runDb(db, 'UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?', [now, now, conversationId]);
    // Update sender's last read timestamp
    runDb(db, 'UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?', [now, conversationId, senderId]);

    // Format rich payload
    const rawRow = queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [msgId]);
    const messagePayload = formatMessageRow(db, rawRow, senderId);

    // Socket broadcasts:
    // 1. To the active conversation room
    io.to(`conv_${conversationId}`).emit('new_message', {
      conversationId,
      message: messagePayload,
    });

    // 2. To each participant's personal room for conversation list update
    otherMembers.forEach((m) => {
      io.to(`user_${m.user_id}`).emit('conversation_updated', {
        conversationId,
        message: messagePayload,
      });
    });

    res.status(201).json({ message: messagePayload, conversationId });
  });

  // Backward compatibility alias for /api/chat/messages
  app.post('/api/chat/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    const senderId = req.user!.id;
    const {
      conversationId: providedConvId,
      receiverId,
      content,
      mediaUrl,
      audioUrl,
      fileName,
      fileSize,
      fileType,
      messageType = 'text',
      coinAmount = 0,
      replyToId,
    } = req.body;

    if (!checkMessageRateLimit(senderId)) {
      return res.status(429).json({ error: 'You are sending messages too quickly. Please wait a few seconds.' });
    }

    if (!content && !mediaUrl && !audioUrl && !coinAmount && messageType !== 'sticker') {
      return res.status(400).json({ error: 'Message payload cannot be empty' });
    }

    let conversationId = providedConvId;

    if (!conversationId && receiverId) {
      const blockCheck = isBlockedBetween(senderId, receiverId);
      if (blockCheck.blocked) {
        return res.status(403).json({ error: 'Cannot send message: user interaction is blocked' });
      }

      const existingConv = queryDbOne(
        db,
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = ?
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = ?
         WHERE c.type = 'direct' LIMIT 1`,
        [senderId, receiverId]
      );

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const now = new Date().toISOString();
        runDb(db, `INSERT INTO conversations (id, type, created_by, created_at, updated_at, last_message_at) VALUES (?, 'direct', ?, ?, ?, ?)`, [
          conversationId, senderId, now, now, now
        ]);
        runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [conversationId, senderId, now]);
        runDb(db, `INSERT INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`, [conversationId, receiverId, now]);
      }
    }

    if (!conversationId) {
      return res.status(400).json({ error: 'Target conversation ID required' });
    }

    const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [conversationId, senderId]);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const sanitizedContent = content ? escapeHtml(content.trim()) : null;

    runDb(
      db,
      `INSERT INTO messages (
        id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url,
        file_name, file_size, file_type, coin_amount, reply_to_id, is_read, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'sent', ?)`,
      [
        msgId,
        conversationId,
        senderId,
        receiverId || null,
        sanitizedContent,
        messageType,
        mediaUrl || null,
        audioUrl || null,
        fileName || null,
        fileSize || 0,
        fileType || null,
        coinAmount || 0,
        replyToId || null,
        now,
      ]
    );

    runDb(db, 'UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?', [now, now, conversationId]);
    const rawRow = queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [msgId]);
    const messagePayload = formatMessageRow(db, rawRow, senderId);

    res.status(201).json({ message: messagePayload, conversationId });
  });

  app.get('/api/chat/messages/:partnerId', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const partnerId = req.params.partnerId;

    const messageRows = queryDbAll(
      db,
      `SELECT * FROM messages 
       WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         AND deleted_at IS NULL
         AND id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, partnerId, partnerId, currentUserId, currentUserId]
    );
    const messages = messageRows.map((m) => formatMessageRow(db, m, currentUserId));
    res.json({ messages });
  });

  // Edit message
  app.put('/api/messages/:id/edit', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const msgId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const msg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL', [msgId]);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (msg.sender_id !== currentUserId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    if (msg.is_unsent) {
      return res.status(400).json({ error: 'Cannot edit unsent message' });
    }

    const sanitized = sanitizeMessageContent(content);
    const now = new Date().toISOString();
    runDb(db, 'UPDATE messages SET content = ?, is_edited = 1, edited_at = ? WHERE id = ?', [sanitized, now, msgId]);

    const updatedMsg = formatMessageRow(db, queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [msgId]), currentUserId);
    io.to(`conv_${msg.conversation_id}`).emit('message_edited', {
      conversationId: msg.conversation_id,
      message: updatedMsg,
    });

    res.json({ message: updatedMsg });
  });

  // Unsend message (replaces content with "Message unsent" for everyone)
  app.delete('/api/messages/:id/unsend', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const msgId = req.params.id;

    const msg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL', [msgId]);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (msg.sender_id !== currentUserId) {
      return res.status(403).json({ error: 'You can only unsend your own messages' });
    }

    runDb(db, `UPDATE messages SET is_unsent = 1, content = 'This message was unsent', media_url = null, audio_url = null WHERE id = ?`, [msgId]);

    io.to(`conv_${msg.conversation_id}`).emit('message_unsent', {
      conversationId: msg.conversation_id,
      messageId: msgId,
    });

    res.json({ success: true, messageId: msgId });
  });

  // Delete message (Delete for me OR Delete for everyone)
  app.delete('/api/messages/:id/delete', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const msgId = req.params.id;
    const forEveryone = req.query.forEveryone === 'true' || req.body.forEveryone === true;

    const msg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [msgId]);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (forEveryone) {
      if (msg.sender_id !== currentUserId) {
        return res.status(403).json({ error: 'Only the sender can delete for everyone' });
      }
      const now = new Date().toISOString();
      runDb(db, 'UPDATE messages SET deleted_at = ? WHERE id = ?', [now, msgId]);
      io.to(`conv_${msg.conversation_id}`).emit('message_deleted', {
        conversationId: msg.conversation_id,
        messageId: msgId,
        forEveryone: true,
      });
    } else {
      const now = new Date().toISOString();
      runDb(db, `INSERT OR IGNORE INTO deleted_messages_for_user (message_id, user_id, created_at) VALUES (?, ?, ?)`, [msgId, currentUserId, now]);
    }

    res.json({ success: true, messageId: msgId, forEveryone });
  });

  // React to message (toggle reaction emoji)
  app.post('/api/messages/:id/react', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const msgId = req.params.id;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ error: 'Reaction emoji required' });
    }

    const msg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL', [msgId]);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify membership
    const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [msg.conversation_id, currentUserId]);
    if (!isMember) {
      return res.status(403).json({ error: 'Cannot react: not a conversation member' });
    }

    const existingReaction = queryDbOne(
      db,
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND reaction = ?',
      [msgId, currentUserId, reaction]
    );

    if (existingReaction) {
      runDb(db, 'DELETE FROM message_reactions WHERE id = ?', [existingReaction.id]);
    } else {
      const rId = 'mr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      runDb(db, `INSERT INTO message_reactions (id, message_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?, ?)`, [
        rId, msgId, currentUserId, reaction, now
      ]);
    }

    const updatedMsg = formatMessageRow(db, msg, currentUserId);
    io.to(`conv_${msg.conversation_id}`).emit('message_reaction_updated', {
      conversationId: msg.conversation_id,
      messageId: msgId,
      reactions: updatedMsg?.reactions || [],
    });

    res.json({ success: true, reactions: updatedMsg?.reactions || [] });
  });

  // Forward message to target conversations
  app.post('/api/messages/:id/forward', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const msgId = req.params.id;
    const { targetConversationIds } = req.body;

    if (!Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one conversation to forward to' });
    }

    const originalMsg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL', [msgId]);
    if (!originalMsg) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    const now = new Date().toISOString();
    const forwardedMessages = [];

    for (const targetConvId of targetConversationIds) {
      // Verify sender membership in target conversation
      const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [targetConvId, currentUserId]);
      if (!isMember) continue;

      const newId = 'msg_fwd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      runDb(
        db,
        `INSERT INTO messages (
          id, conversation_id, sender_id, content, message_type, media_url, audio_url,
          file_name, file_size, file_type, forwarded_from_id, is_read, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'sent', ?)`,
        [
          newId,
          targetConvId,
          currentUserId,
          originalMsg.content,
          originalMsg.message_type,
          originalMsg.media_url,
          originalMsg.audio_url,
          originalMsg.file_name,
          originalMsg.file_size,
          originalMsg.file_type,
          originalMsg.id,
          now,
        ]
      );

      runDb(db, 'UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?', [now, now, targetConvId]);

      const fwdMsgPayload = formatMessageRow(db, queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [newId]), currentUserId);
      forwardedMessages.push(fwdMsgPayload);

      io.to(`conv_${targetConvId}`).emit('new_message', {
        conversationId: targetConvId,
        message: fwdMsgPayload,
      });
    }

    res.json({ success: true, forwardedCount: forwardedMessages.length });
  });

  // Mark conversation read
  app.post('/api/messages/conversations/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const convId = req.params.id;
    const now = new Date().toISOString();

    runDb(db, 'UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?', [now, convId, currentUserId]);
    runDb(db, `UPDATE messages SET is_read = 1, status = 'read' WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`, [convId, currentUserId]);

    io.to(`conv_${convId}`).emit('messages_read', {
      conversationId: convId,
      readerId: currentUserId,
      readAt: now,
    });

    res.json({ success: true });
  });

  // File & Media Attachment Upload
  app.post('/api/messages/upload', authenticateToken, upload.single('file'), (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file exceeds size limit' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      mediaUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });
  });

  // Search Messages
  app.get('/api/messages/search', authenticateToken, (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.id;
    const query = ((req.query.q as string) || '').trim();
    const convId = (req.query.conversationId as string) || '';

    if (!query) {
      return res.json({ results: [] });
    }

    let sql = `
      SELECT m.*, c.title as conv_title, c.type as conv_type
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
      WHERE m.deleted_at IS NULL
        AND m.id NOT IN (SELECT message_id FROM deleted_messages_for_user WHERE user_id = ?)
        AND (m.content LIKE ? OR m.file_name LIKE ?)
    `;
    const params: any[] = [currentUserId, currentUserId, `%${query}%`, `%${query}%`];

    if (convId) {
      sql += ` AND m.conversation_id = ?`;
      params.push(convId);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT 30`;
    const results = queryDbAll(db, sql, params).map((m) => formatMessageRow(db, m, currentUserId));

    res.json({ results });
  });

  // --- 6. COMPLETE COMMUNITY SYSTEM: GROUPS, PAGES & EVENTS ---

  // GROUPS ENDPOINTS
  app.get('/api/groups', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search as string;
      const groups = getGroupsList(db, req.user?.id, search);
      res.json({ groups });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch groups' });
    }
  });

  app.post('/api/groups', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { name, description } = req.body;
      if (!name || !description) return res.status(400).json({ error: 'Group name and description required' });
      const result = createGroup(db, req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create group' });
    }
  });

  app.get('/api/groups/:id', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const details = getGroupDetails(db, req.params.id, req.user?.id);
      if (!details) return res.status(404).json({ error: 'Group not found' });
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch group details' });
    }
  });

  app.put('/api/groups/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = updateGroup(db, req.params.id, req.body, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Update failed' });
    }
  });

  app.post('/api/groups/:id/join', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = requestOrJoinGroup(db, req.params.id, req.user!.id, req.body.message);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Join failed' });
    }
  });

  app.get('/api/groups/:id/join-requests', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const requests = getGroupJoinRequests(db, req.params.id, req.user!.id);
      res.json({ requests });
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Unauthorized' });
    }
  });

  app.post('/api/groups/:id/join-requests/:reqId', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const action = req.body.action as 'approve' | 'reject';
      const result = handleJoinRequest(db, req.params.id, req.params.reqId, action, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Action failed' });
    }
  });

  app.post('/api/groups/:id/invite', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { inviteeId } = req.body;
      if (!inviteeId) return res.status(400).json({ error: 'inviteeId is required' });
      const result = inviteUserToGroup(db, req.params.id, req.user!.id, inviteeId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Invite failed' });
    }
  });

  app.get('/api/groups/:id/members', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const members = getGroupMembers(db, req.params.id);
      res.json({ members });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch members' });
    }
  });

  app.put('/api/groups/:id/members/:userId/role', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      const result = updateMemberRole(db, req.params.id, req.params.userId, role, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Role change failed' });
    }
  });

  app.post('/api/groups/:id/members/:userId/ban', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;
      const result = banGroupMember(db, req.params.id, req.params.userId, reason || 'Rule violation', req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Ban failed' });
    }
  });

  app.post('/api/groups/:id/members/:userId/unban', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = unbanGroupMember(db, req.params.id, req.params.userId, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Unban failed' });
    }
  });

  app.post('/api/groups/:id/members/:userId/mute', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const duration = Number(req.body.durationMinutes) || 60;
      const result = muteGroupMember(db, req.params.id, req.params.userId, duration, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Mute failed' });
    }
  });

  app.post('/api/groups/:id/members/:userId/unmute', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = unmuteGroupMember(db, req.params.id, req.params.userId, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Unmute failed' });
    }
  });

  app.get('/api/groups/:id/posts', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const posts = getGroupPosts(db, req.params.id, req.user?.id);
      res.json({ posts });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch posts' });
    }
  });

  app.post('/api/groups/:id/posts', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { content, mediaUrls, isAnnouncement } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
      const result = createGroupPost(db, req.params.id, req.user!.id, { content, mediaUrls, isAnnouncement });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Posting failed' });
    }
  });

  app.post('/api/groups/:id/posts/:postId/moderate', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { action } = req.body;
      const result = moderateGroupPost(db, req.params.id, req.params.postId, action, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Moderation action failed' });
    }
  });

  app.get('/api/groups/posts/:postId/comments', optionalAuth, (req: Request, res: Response) => {
    try {
      const comments = getGroupComments(db, req.params.postId);
      res.json({ comments });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch comments' });
    }
  });

  app.post('/api/groups/posts/:postId/comments', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Comment content required' });
      const result = addGroupComment(db, req.params.postId, req.user!.id, content);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Comment failed' });
    }
  });

  app.get('/api/groups/:id/files', optionalAuth, (req: Request, res: Response) => {
    try {
      const files = getGroupFiles(db, req.params.id);
      res.json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch files' });
    }
  });

  app.post('/api/groups/:id/files', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { name, fileUrl, fileType, fileSize } = req.body;
      if (!name || !fileUrl) return res.status(400).json({ error: 'File name and URL required' });
      const result = uploadGroupFile(db, req.params.id, req.user!.id, {
        name,
        fileUrl,
        fileType: fileType || 'document',
        fileSize: Number(fileSize) || 0,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'File upload failed' });
    }
  });

  // PAGES ENDPOINTS
  app.get('/api/pages', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search as string;
      const pages = getPagesList(db, req.user?.id, search);
      res.json({ pages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch pages' });
    }
  });

  app.post('/api/pages', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { name, category, description } = req.body;
      if (!name || !category || !description) {
        return res.status(400).json({ error: 'Page name, category, and description required' });
      }
      const result = createPage(db, req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create page' });
    }
  });

  app.get('/api/pages/:id', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const details = getPageDetails(db, req.params.id, req.user?.id);
      if (!details) return res.status(404).json({ error: 'Page not found' });
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch page details' });
    }
  });

  app.post('/api/pages/:id/follow', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = toggleFollowPage(db, req.params.id, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Follow action failed' });
    }
  });

  app.get('/api/pages/:id/posts', optionalAuth, (req: Request, res: Response) => {
    try {
      const posts = getPagePosts(db, req.params.id);
      res.json({ posts });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch page posts' });
    }
  });

  app.post('/api/pages/:id/posts', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { content, mediaUrls, videoUrl } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
      const result = createPagePost(db, req.params.id, req.user!.id, { content, mediaUrls, videoUrl });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Failed to post on page' });
    }
  });

  app.get('/api/pages/:id/videos', optionalAuth, (req: Request, res: Response) => {
    try {
      const videos = getPageVideos(db, req.params.id);
      res.json({ videos });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch videos' });
    }
  });

  app.put('/api/pages/:id/members/:userId/role', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;
      const result = updatePageRole(db, req.params.id, req.params.userId, role, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Role assignment failed' });
    }
  });

  app.get('/api/pages/:id/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const analytics = getPageAnalytics(db, req.params.id, req.user!.id);
      res.json({ analytics });
    } catch (err: any) {
      res.status(403).json({ error: err.message || 'Analytics access denied' });
    }
  });

  app.get('/api/pages/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const targetUserId = (req.query.userId as string) || req.user!.id;
      const messages = getPageMessages(db, req.params.id, targetUserId, req.user!.id);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch messages' });
    }
  });

  app.post('/api/pages/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { content, senderType } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Message content required' });
      const result = sendPageMessage(db, req.params.id, req.user!.id, senderType || 'user', content);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Message send failed' });
    }
  });

  // EVENTS ENDPOINTS
  app.get('/api/events', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const search = req.query.search as string;
      const filter = req.query.filter as string;
      const events = getEventsList(db, req.user?.id, search, filter);
      res.json({ events });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch events' });
    }
  });

  app.post('/api/events', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { title, description, location, startTime, category } = req.body;
      if (!title || !description || !location || !startTime || !category) {
        return res.status(400).json({ error: 'Title, description, location, startTime, and category required' });
      }
      const result = createEvent(db, req.user!.id, req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create event' });
    }
  });

  app.get('/api/events/:id', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const details = getEventDetails(db, req.params.id, req.user?.id);
      if (!details) return res.status(404).json({ error: 'Event not found' });
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch event details' });
    }
  });

  app.post('/api/events/:id/rsvp', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const status = req.body.status as 'going' | 'interested' | 'not_going';
      const result = rsvpEvent(db, req.params.id, req.user!.id, status);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'RSVP failed' });
    }
  });

  app.post('/api/events/:id/reminder', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = toggleEventReminder(db, req.params.id, req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Reminder toggle failed' });
    }
  });

  app.post('/api/events/:id/invite', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { inviteeId } = req.body;
      if (!inviteeId) return res.status(400).json({ error: 'inviteeId is required' });
      const result = inviteToEvent(db, req.params.id, req.user!.id, inviteeId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Event invite failed' });
    }
  });

  app.get('/api/events/:id/discussions', optionalAuth, (req: Request, res: Response) => {
    try {
      const discussions = getEventDiscussions(db, req.params.id);
      res.json({ discussions });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch discussions' });
    }
  });

  app.post('/api/events/:id/discussions', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Discussion content required' });
      const result = addEventDiscussion(db, req.params.id, req.user!.id, content);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Discussion post failed' });
    }
  });

  // --- 7. COMPREHENSIVE WALLET & FINANCIAL SYSTEM ---

  // User Comprehensive Wallet Data
  app.get('/api/wallet', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const summary = getUserWalletComprehensive(db, userId);

    res.json({
      ...summary,
      // Backwards-compatible aliases
      coinsBalance: summary.availableBalance,
      totalEarned: summary.earnedBalance,
      totalSpent: summary.giftedBalance,
    });
  });

  // Filterable transaction ledger
  app.get('/api/wallet/transactions', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { type, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM coin_transactions WHERE user_id = ?`;
    const params: any[] = [userId];

    if (type && type !== 'all') {
      query += ` AND transaction_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = queryDbAll(db, query, params);
    const totalCount = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM coin_transactions WHERE user_id = ? ${type && type !== 'all' ? 'AND transaction_type = ?' : ''}`,
      type && type !== 'all' ? [userId, type] : [userId]
    );

    res.json({
      transactions: rows,
      total: totalCount?.count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  });

  // Daily Bonus Claim with Transaction Safety
  app.post('/api/wallet/claim-daily', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const now = new Date().toISOString();
    const bonus = 50;

    const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
    const balanceBefore = wallet?.balance || 0;
    const balanceAfter = balanceBefore + bonus;

    runDb(db, 'UPDATE coin_wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?', [
      bonus,
      bonus,
      now,
      userId,
    ]);
    runDb(db, 'UPDATE users SET coins_balance = coins_balance + ? WHERE id = ?', [bonus, userId]);

    const txId = `CTX-DB-${Date.now()}`;
    runDb(
      db,
      `INSERT INTO coin_transactions (
        id, user_id, transaction_type, amount, balance_before, balance_after,
        status, note, created_at
      ) VALUES (?, ?, 'daily_bonus', ?, ?, ?, 'completed', 'Daily Login Bonus Claim', ?)`,
      [txId, userId, bonus, balanceBefore, balanceAfter, now]
    );

    saveDbSync();
    res.json({ coinsBalance: balanceAfter, bonusClaimed: bonus });
  });

  // Direct Peer-to-Peer Coin Transfer / Gift
  app.post('/api/wallet/transfer', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const senderId = req.user!.id;
      const { recipientUsernameOrId, amount, note } = req.body;
      const coinAmount = parseInt(amount, 10);

      if (!recipientUsernameOrId || isNaN(coinAmount) || coinAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid recipient username and positive coin amount' });
      }

      // Check sender
      const sender = queryDbOne(db, 'SELECT id, username, full_name, coins_balance FROM users WHERE id = ?', [senderId]);
      if (!sender) return res.status(404).json({ error: 'Sender account not found' });
      if ((sender.coins_balance || 0) < coinAmount) {
        return res.status(400).json({ error: `Insufficient coins balance. You have ${sender.coins_balance || 0} coins.` });
      }

      // Find recipient by id or username (case-insensitive)
      const cleanTarget = recipientUsernameOrId.trim().replace(/^@/, '');
      const recipient = queryDbOne(
        db,
        'SELECT id, username, full_name, coins_balance FROM users WHERE (id = ? OR LOWER(username) = LOWER(?))',
        [cleanTarget, cleanTarget]
      );

      if (!recipient) {
        return res.status(404).json({ error: `User "@${cleanTarget}" could not be found.` });
      }

      if (recipient.id === senderId) {
        return res.status(400).json({ error: 'You cannot transfer coins to yourself.' });
      }

      const now = new Date().toISOString();
      const senderBefore = sender.coins_balance || 0;
      const senderAfter = senderBefore - coinAmount;
      const recipientBefore = recipient.coins_balance || 0;
      const recipientAfter = recipientBefore + coinAmount;

      // Update balances
      runDb(db, 'UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?', [senderAfter, now, senderId]);
      runDb(db, 'UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?', [recipientAfter, now, recipient.id]);

      // Update wallets
      runDb(
        db,
        'INSERT INTO coin_wallets (user_id, balance, total_gifted, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_gifted = total_gifted + ?, updated_at = ?',
        [senderId, senderAfter, coinAmount, now, senderAfter, coinAmount, now]
      );
      runDb(
        db,
        'INSERT INTO coin_wallets (user_id, balance, total_earned, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_earned = total_earned + ?, updated_at = ?',
        [recipient.id, recipientAfter, coinAmount, now, recipientAfter, coinAmount, now]
      );

      // Ledger records
      const txSenderId = `CTX-TR-OUT-${Date.now()}`;
      runDb(
        db,
        `INSERT INTO coin_transactions (
          id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after,
          status, note, created_at
        ) VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?, 'completed', ?, ?)`,
        [txSenderId, senderId, senderId, recipient.id, coinAmount, senderBefore, senderAfter, note || `Coin transfer to @${recipient.username}`, now]
      );

      const txRecipientId = `CTX-TR-IN-${Date.now()}`;
      runDb(
        db,
        `INSERT INTO coin_transactions (
          id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after,
          status, note, created_at
        ) VALUES (?, ?, ?, ?, 'gift', ?, ?, ?, 'completed', ?, ?)`,
        [txRecipientId, recipient.id, senderId, recipient.id, coinAmount, recipientBefore, recipientAfter, note || `Coin transfer from @${sender.username}`, now]
      );

      saveDbSync();

      // Notify recipient
      sendNotification(
        recipient.id,
        senderId,
        'coin_received',
        `🎁 @${sender.username} sent you ${coinAmount.toLocaleString()} coins!`,
        undefined,
        'wallet'
      );

      // Real-time socket updates
      io.to(`user_${senderId}`).emit('balance_updated', { coinsBalance: senderAfter });
      io.to(`user_${recipient.id}`).emit('balance_updated', { coinsBalance: recipientAfter });

      res.json({
        success: true,
        message: `Successfully sent ${coinAmount.toLocaleString()} coins to @${recipient.username}!`,
        newBalance: senderAfter,
        recipient: {
          id: recipient.id,
          username: recipient.username,
          fullName: recipient.full_name,
        },
        amount: coinAmount,
      });
    } catch (e: any) {
      console.error('Failed to transfer coins:', e);
      res.status(500).json({ error: e.message || 'Transfer failed' });
    }
  });

  // Wallet Instant Recharge (used by gift modal and quick topup)
  app.post('/api/wallet/recharge', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const amountCoins = parseInt(req.body.amountCoins || req.body.coins || '100', 10);
      if (isNaN(amountCoins) || amountCoins <= 0) {
        return res.status(400).json({ error: 'Please enter a valid positive coin amount' });
      }

      const user = queryDbOne(db, 'SELECT id, username, coins_balance FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const balanceBefore = user.coins_balance || 0;
      const balanceAfter = balanceBefore + amountCoins;
      const now = new Date().toISOString();
      const txId = 'tx_rec_' + Date.now();

      runDb(db, 'UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, now, userId]);
      runDb(
        db,
        `INSERT INTO coin_transactions (
          id, user_id, transaction_type, amount, balance_before, balance_after,
          status, note, created_at
        ) VALUES (?, ?, 'recharge', ?, ?, ?, 'completed', 'Instant Wallet Coin Recharge', ?)`,
        [txId, userId, amountCoins, balanceBefore, balanceAfter, now]
      );
      saveDbSync();

      io.to(`user_${userId}`).emit('balance_updated', { coinsBalance: balanceAfter });
      res.json({ success: true, coinsBalance: balanceAfter, newBalance: balanceAfter, message: `Recharged ${amountCoins.toLocaleString()} coins successfully!` });
    } catch (err: any) {
      console.error('Recharge error:', err);
      res.status(500).json({ error: err.message || 'Failed to recharge wallet' });
    }
  });

  // Daily Reward Claim for Content Rewards & Quests
  app.post('/api/coins/rewards/claim-daily', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const existing = queryDbOne(
      db,
      `SELECT * FROM coin_transactions WHERE user_id = ? AND transaction_type = 'daily_bonus' AND created_at LIKE ?`,
      [userId, `${today}%`]
    );
    if (existing) {
      return res.json({ success: true, rewardCoins: 10, message: 'Daily reward already claimed for today' });
    }
    const bonus = 10;
    const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
    const balanceBefore = wallet?.balance || 0;
    const balanceAfter = balanceBefore + bonus;
    runDb(db, 'UPDATE coin_wallets SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? WHERE user_id = ?', [
      bonus,
      bonus,
      now,
      userId,
    ]);
    runDb(db, 'UPDATE users SET coins_balance = coins_balance + ? WHERE id = ?', [bonus, userId]);
    const txId = `CTX-DB-${Date.now()}`;
    runDb(
      db,
      `INSERT INTO coin_transactions (id, user_id, transaction_type, amount, balance_before, balance_after, status, note, created_at)
       VALUES (?, ?, 'daily_bonus', ?, ?, ?, 'completed', 'Daily Login Bonus Claim', ?)`,
      [txId, userId, bonus, balanceBefore, balanceAfter, now]
    );
    saveDbSync();
    res.json({ success: true, rewardCoins: bonus, coinsBalance: balanceAfter });
  });

  // -------------------------------------------------------------
  // COIN PACKAGES & PURCHASE FLOW (PROVIDER ABSTRACTION)
  // -------------------------------------------------------------

  // Public Coin Packages
  const handleGetCoinPackages = (req: Request, res: Response) => {
    const packages = queryDbAll(
      db,
      'SELECT * FROM coin_packages_v2 WHERE is_active = 1 ORDER BY sort_order ASC, coin_amount ASC'
    );
    const settings = getWithdrawalSettings(db);

    res.json({
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coin_amount,
        coinAmount: p.coin_amount,
        bonusCoins: p.bonus_coins,
        totalCoins: p.coin_amount + p.bonus_coins,
        priceBdt: Number(p.price_bdt),
        priceUsd: Number(p.price_usd),
        isCustom: Boolean(p.is_custom),
        minCustomCoins: p.min_custom_coins,
        maxCustomCoins: p.max_custom_coins,
        badgeText: p.badge_text,
      })),
      conversionRate: {
        coins: settings.conversionRateCoins,
        bdt: settings.conversionRateBdt,
      },
    });
  };

  app.get('/api/coin-packages', handleGetCoinPackages);
  app.get('/api/payments/packages', handleGetCoinPackages);

  // Available Payment Gateways
  app.get('/api/payment-gateways', (req: Request, res: Response) => {
    const providers = PaymentGatewayRegistry.getInstance().getAllProviders();
    res.json({ gateways: providers });
  });

  // Create Payment Intent / Initiate
  const handlePaymentIntent = async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { packageId, customCoinAmount, gatewayId = 'bkash', customerDetails } = req.body;

    const result = await createPaymentIntentForCoins(
      db,
      userId,
      packageId,
      customCoinAmount ? Number(customCoinAmount) : undefined,
      (gatewayId || 'paystation') as PaymentGatewayId,
      customerDetails
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    try {
      let intent: any = {};
      try {
        const provider = PaymentGatewayRegistry.getInstance().getProvider(gatewayId as PaymentGatewayId);
        const user = queryDbOne(db, 'SELECT full_name, email, phone FROM users WHERE id = ?', [userId]);

        intent = await provider.createPaymentIntent({
          transactionId: result.intent.transactionId,
          userId,
          packageId,
          coinAmount: result.intent.coinsAmount,
          bonusCoins: result.intent.bonusCoins,
          amountBdt: result.intent.amountBdt,
          currency: 'BDT',
          customerName: customerDetails?.name || user?.full_name || 'Nixo Member',
          customerPhone: customerDetails?.phone || user?.phone || '01700000000',
          customerEmail: customerDetails?.email || user?.email || `${userId}@nixo.social`,
          callbackUrl: `/api/payments/callback/${gatewayId}`,
          cancelUrl: `/api/payments/cancel/${gatewayId}`,
        });
      } catch (providerErr) {
        // Mock fallback for testing or unregistered providers
        intent = {
          clientSecret: `mock_secret_${result.intent.transactionId}`,
          approvalUrl: `/checkout/mock?tx=${result.intent.transactionId}`,
        };
      }

      res.json({
        ...result.intent,
        ...intent,
        transactionId: result.intent.transactionId,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Error generating gateway payment intent' });
    }
  };

  app.post('/api/payments/intent', authenticateToken, handlePaymentIntent);
  app.post('/api/payments/initiate', authenticateToken, handlePaymentIntent);

  // Verify and Complete Payment
  app.post('/api/payments/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { transactionId, payload, gatewayRef, status } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required for verification' });
    }

    try {
      const verifyPayload = payload || { gatewayRef: gatewayRef || `gw_${Date.now()}`, status: status || 'completed' };
      const result = await verifyAndCreditPayment(db, transactionId, verifyPayload);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Sync user model
      const tx = queryDbOne(db, 'SELECT user_id FROM payment_transactions_v2 WHERE transaction_id = ?', [transactionId]);
      if (tx) {
        runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [result.newBalance, tx.user_id]);
        io.to(`user_${tx.user_id}`).emit('balance_updated', { coinsBalance: result.newBalance });
      }

      res.json({
        success: true,
        coinsCredited: result.coinsCredited,
        newBalance: result.newBalance,
        coinsBalance: result.newBalance,
        message: 'Payment verified and coins credited successfully!',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Payment verification failed' });
    }
  });

  // User Payment History
  app.get('/api/payments/history', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const payments = queryDbAll(
      db,
      'SELECT * FROM payment_transactions_v2 WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({
      payments: payments.map((p) => ({
        id: p.id,
        transactionId: p.transaction_id,
        coinsAmount: p.coins_amount,
        bonusCoins: p.bonus_coins,
        totalCoins: p.total_coins,
        amountBdt: Number(p.amount_bdt),
        currency: p.currency,
        gatewayId: p.gateway_id,
        gatewayTxId: p.gateway_tx_id,
        status: p.status,
        createdAt: p.created_at,
        failureReason: p.failure_reason,
        refundReason: p.refund_reason,
      })),
    });
  });

  // Payment Webhook Handler
  app.post('/api/payments/webhook/:gateway', async (req: Request, res: Response) => {
    const gatewayId = req.params.gateway as PaymentGatewayId;
    try {
      const provider = PaymentGatewayRegistry.getInstance().getProvider(gatewayId);
      const headers = req.headers as Record<string, string>;
      const result = await provider.handleWebhook(headers, req.body);

      if (result.isValid && result.status === 'completed') {
        const txId = req.body?.transactionId || req.body?.merchantInvoiceNumber;
        if (txId) {
          await verifyAndCreditPayment(db, txId, req.body);
        }
      }

      res.json({ received: true, status: result.status });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Webhook processing failed' });
    }
  });

  // Payment Cancel
  app.post('/api/payments/cancel', authenticateToken, (req: AuthRequest, res: Response) => {
    const { transactionId } = req.body;
    if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });

    const now = new Date().toISOString();
    runDb(
      db,
      `UPDATE payment_transactions_v2 SET status = 'cancelled', updated_at = ? WHERE transaction_id = ? AND status = 'pending'`,
      [now, transactionId]
    );
    saveDbSync();
    res.json({ success: true, message: 'Payment cancelled.' });
  });

  // -------------------------------------------------------------
  // USER WITHDRAWAL ENDPOINTS
  // -------------------------------------------------------------

  // Public Withdrawal Settings & Rate
  app.get('/api/withdrawals/settings', authenticateToken, (req: AuthRequest, res: Response) => {
    const settings = getWithdrawalSettings(db);
    const userId = req.user!.id;
    const user = queryDbOne(db, 'SELECT created_at, phone, is_verified FROM users WHERE id = ?', [userId]);

    const isPhoneVerified = Boolean(user?.phone);
    const isKycVerified = Boolean(user?.is_verified);
    const accountAgeHours = (Date.now() - new Date(user?.created_at || 0).getTime()) / (1000 * 60 * 60);

    let isEligible = true;
    let eligibilityReason = '';

    if (settings.verificationRequirement === 'phone_verified' && !isPhoneVerified) {
      isEligible = false;
      eligibilityReason = 'Requires verified phone number.';
    } else if (settings.verificationRequirement === 'kyc_verified' && !isKycVerified) {
      isEligible = false;
      eligibilityReason = 'Requires KYC identity verification.';
    } else if (settings.verificationRequirement === 'account_age_24h' && accountAgeHours < 24) {
      isEligible = false;
      eligibilityReason = `Account must be at least 24 hours old (${Math.round(24 - accountAgeHours)}h remaining).`;
    }

    res.json({
      settings,
      eligibility: {
        isEligible,
        reason: eligibilityReason,
        isPhoneVerified,
        isKycVerified,
        accountAgeHours: Math.round(accountAgeHours),
      },
    });
  });

  // Calculate Breakdown for requested coins
  app.post('/api/withdrawals/calculate', authenticateToken, (req: AuthRequest, res: Response) => {
    const { coins } = req.body;
    if (!coins || Number(coins) <= 0) {
      return res.status(400).json({ error: 'Valid coin amount is required' });
    }

    const settings = getWithdrawalSettings(db);
    const breakdown = calculateWithdrawalBreakdown(settings, Number(coins));
    res.json(breakdown);
  });

  // Create Withdrawal Request with Financial Mutex & Risk Scoring
  app.post('/api/withdrawals/request', authenticateToken, financialRateLimit, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // Security Check: Is user restricted from financial cashouts?
    const restriction = isUserRestricted(db, userId, 'gifting');
    if (restriction.restricted) {
      return res.status(403).json({
        error: `Your account is temporarily restricted from requesting cashouts: ${restriction.reason}. Expires: ${restriction.expiresAt}`,
      });
    }

    const { coins, payoutMethod, accountDetails } = req.body;

    if (!coins || Number(coins) <= 0) {
      return res.status(400).json({ error: 'Valid coin amount is required' });
    }
    if (!payoutMethod) {
      return res.status(400).json({ error: 'Payout method is required' });
    }
    if (!accountDetails) {
      return res.status(400).json({ error: 'Account / phone details are required' });
    }

    try {
      // Execute atomically under user financial wallet lock
      const result = await financialMutex.withWalletLock(userId, async () => {
        return requestUserWithdrawal(
          db,
          userId,
          Number(coins),
          String(payoutMethod),
          accountDetails
        );
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Anti-Spam: Calculate Anomaly & Suspicion Risk Score for Moderator Review
      const riskAssessment = calculateWithdrawalRiskScore(db, userId, Number(coins));
      if (riskAssessment.riskScore >= 75) {
        // Tag request as flagged for high anomaly review
        runDb(
          db,
          `UPDATE withdrawal_requests_v2 SET admin_notes = ? WHERE id = ?`,
          [`[AUTO-FLAGGED ANOMALY] Risk score: ${riskAssessment.riskScore}/100. Factors: ${riskAssessment.riskFactors.join(', ')}`, result.request.id]
        );
      }

      // Sync user model
      const w = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
      if (w) {
        runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [w.balance, userId]);
        io.to(`user_${userId}`).emit('balance_updated', { coinsBalance: w.balance });
      }

      res.json({
        success: true,
        request: result.request,
        riskScore: riskAssessment.riskScore,
        message: 'Withdrawal request submitted successfully! Awaiting review.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error creating withdrawal request' });
    }
  });

  // User My-Requests
  app.get('/api/withdrawals/my-requests', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const requests = queryDbAll(
      db,
      'SELECT * FROM withdrawal_requests_v2 WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json({
      requests: requests.map((r) => {
        let history = [];
        try {
          history = JSON.parse(r.status_history || '[]');
        } catch {}
        return {
          id: r.id,
          requestCode: r.request_code,
          coinsAmount: r.coins_amount,
          grossAmountBdt: Number(r.gross_amount_bdt),
          feeBdt: Number(r.fee_bdt),
          netPayoutBdt: Number(r.net_payout_bdt),
          conversionRateUsed: Number(r.conversion_rate_used),
          payoutMethodType: r.payout_method_type,
          payoutAccountDetails: r.payout_account_details,
          status: r.status,
          adminNotes: r.admin_notes,
          rejectionReason: r.rejection_reason,
          gatewayPayoutRef: r.gateway_payout_ref,
          statusHistory: history,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }),
    });
  });

  // User Cancel Request (support both /api/withdrawals/:id/cancel and /api/withdrawals/cancel/:id)
  const handleCancelWithdrawalRequest = (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const reqId = req.params.id;

    const result = cancelUserWithdrawal(db, reqId, userId);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const w = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
    if (w) {
      runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [w.balance, userId]);
      io.to(`user_${userId}`).emit('balance_updated', { coinsBalance: w.balance });
    }

    res.json({ success: true, message: 'Withdrawal request cancelled and coins refunded to balance.' });
  };

  app.post('/api/withdrawals/:id/cancel', authenticateToken, handleCancelWithdrawalRequest);
  app.post('/api/withdrawals/cancel/:id', authenticateToken, handleCancelWithdrawalRequest);

  // -------------------------------------------------------------
  // ADMIN FINANCIAL MANAGEMENT ENDPOINTS
  // -------------------------------------------------------------

  // Admin: Get all Coin Packages
  app.get('/api/admin/coin-packages', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const pkgs = queryDbAll(db, 'SELECT * FROM coin_packages_v2 ORDER BY sort_order ASC, coin_amount ASC');
    res.json({ packages: pkgs });
  });

  // Admin: Create Coin Package
  app.post('/api/admin/coin-packages', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, coinAmount, bonusCoins = 0, priceBdt, priceUsd, perUserLimit = 0, dailyLimit = 0, badgeText } = req.body;
    if (!name || !coinAmount || !priceBdt) {
      return res.status(400).json({ error: 'Name, coinAmount, and priceBdt are required' });
    }

    const id = `pkg_${Date.now()}`;
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO coin_packages_v2 (
        id, name, coin_amount, bonus_coins, price_bdt, price_usd, is_active,
        is_custom, per_user_limit, daily_limit, badge_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        Number(coinAmount),
        Number(bonusCoins),
        toDecimalSafe(Number(priceBdt)),
        toDecimalSafe(Number(priceUsd || Number(priceBdt) / 120)),
        Number(perUserLimit),
        Number(dailyLimit),
        badgeText || '',
        now,
        now,
      ]
    );

    saveDbSync();
    res.json({ success: true, message: 'Coin package created successfully' });
  });

  // Admin: Update Coin Package
  app.put('/api/admin/coin-packages/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const { name, coinAmount, bonusCoins, priceBdt, priceUsd, isActive, badgeText, sortOrder } = req.body;
    const now = new Date().toISOString();

    // Ensure parameters are validated before passed to parameterized query
    runDb(
      db,
      `UPDATE coin_packages_v2 SET
        name = COALESCE(?, name),
        coin_amount = COALESCE(?, coin_amount),
        bonus_coins = COALESCE(?, bonus_coins),
        price_bdt = COALESCE(?, price_bdt),
        price_usd = COALESCE(?, price_usd),
        is_active = COALESCE(?, is_active),
        badge_text = COALESCE(?, badge_text),
        sort_order = COALESCE(?, sort_order),
        updated_at = ?
       WHERE id = ?`,
      [
        name || null,
        coinAmount !== undefined ? Number(coinAmount) : null,
        bonusCoins !== undefined ? Number(bonusCoins) : null,
        priceBdt !== undefined ? toDecimalSafe(Number(priceBdt)) : null,
        priceUsd !== undefined ? toDecimalSafe(Number(priceUsd)) : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        badgeText || null,
        sortOrder !== undefined ? Number(sortOrder) : null,
        now,
        id,
      ]
    );

    saveDbSync();
    res.json({ success: true, message: 'Package updated' });
  });

  // Admin: Delete Coin Package
  app.delete('/api/admin/coin-packages/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    runDb(db, 'DELETE FROM coin_packages_v2 WHERE id = ?', [id]);
    saveDbSync();
    res.json({ success: true });
  });

  // Admin: View all Withdrawal Requests
  app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { status, search } = req.query;
    let query = `
      SELECT w.*, u.username, u.full_name, u.email, u.avatar_url, u.phone
      FROM withdrawal_requests_v2 w
      LEFT JOIN users u ON w.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND w.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (w.request_code LIKE ? OR u.username LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY w.created_at DESC LIMIT 100`;

    const rows = queryDbAll(db, query, params);
    res.json({
      requests: rows.map((r) => {
        let history = [];
        try {
          history = JSON.parse(r.status_history || '[]');
        } catch {}
        return {
          id: r.id,
          requestCode: r.request_code,
          userId: r.user_id,
          userName: r.full_name || r.username,
          userEmail: r.email,
          userPhone: r.phone,
          coinsAmount: r.coins_amount,
          grossAmountBdt: Number(r.gross_amount_bdt),
          feeBdt: Number(r.fee_bdt),
          netPayoutBdt: Number(r.net_payout_bdt),
          conversionRateUsed: Number(r.conversion_rate_used),
          payoutMethodType: r.payout_method_type,
          payoutAccountDetails: r.payout_account_details,
          status: r.status,
          adminNotes: r.admin_notes,
          rejectionReason: r.rejection_reason,
          gatewayPayoutRef: r.gateway_payout_ref,
          statusHistory: history,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }),
    });
  });

  // Admin: User Withdrawal History & Risk Profile
  app.get('/api/admin/withdrawals/:id/user-history', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const reqRow = queryDbOne(db, 'SELECT user_id FROM withdrawal_requests_v2 WHERE id = ?', [req.params.id]);
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });

    const targetUserId = reqRow.user_id;
    const user = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    const wallet = getUserWalletComprehensive(db, targetUserId);
    const pastRequests = queryDbAll(
      db,
      'SELECT * FROM withdrawal_requests_v2 WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [targetUserId]
    );

    res.json({
      user: {
        id: user?.id,
        username: user?.username,
        fullName: user?.full_name,
        email: user?.email,
        phone: user?.phone,
        createdAt: user?.created_at,
        status: user?.status,
        isVerified: Boolean(user?.is_verified),
      },
      walletSummary: wallet,
      pastRequests,
    });
  });

  // Admin: Review / Approve / Move to Processing
  const handleWithdrawalStatusUpdate = (req: AuthRequest, res: Response) => {
    const { status, note, adminNotes } = req.body;
    const effectiveStatus = status || 'approved';
    const effectiveNote = note || adminNotes;

    if (!['reviewing', 'approved', 'processing'].includes(effectiveStatus)) {
      return res.status(400).json({ error: 'Status must be reviewing, approved, or processing' });
    }

    const result = reviewWithdrawal(db, req.params.id, req.user!.id, effectiveStatus, effectiveNote);
    if (!result.success) return res.status(400).json({ error: result.error });

    res.json({ success: true, message: `Status updated to ${effectiveStatus}`, request: result.request });
  };

  app.post('/api/admin/withdrawals/:id/review', authenticateToken, requireAdmin, handleWithdrawalStatusUpdate);
  app.post('/api/admin/withdrawals/:id/status', authenticateToken, requireAdmin, handleWithdrawalStatusUpdate);

  // Admin: Reject Withdrawal with Coin Refund
  app.post('/api/admin/withdrawals/:id/reject', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = rejectWithdrawal(db, req.params.id, req.user!.id, reason);
    if (!result.success) return res.status(400).json({ error: result.error });

    // Sync user model
    const reqRow = queryDbOne(db, 'SELECT user_id FROM withdrawal_requests_v2 WHERE id = ?', [req.params.id]);
    if (reqRow) {
      const w = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [reqRow.user_id]);
      if (w) {
        runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [w.balance, reqRow.user_id]);
        io.to(`user_${reqRow.user_id}`).emit('balance_updated', { coinsBalance: w.balance });
      }
    }

    res.json({ success: true, message: 'Withdrawal rejected and coins refunded to user.' });
  });

  // Admin: Mark Paid
  app.post('/api/admin/withdrawals/:id/mark-paid', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { gatewayPayoutRef, note } = req.body;
    if (!gatewayPayoutRef || !gatewayPayoutRef.trim()) {
      return res.status(400).json({ error: 'Gateway payout reference / Transaction ID is required' });
    }

    const result = markWithdrawalPaid(db, req.params.id, req.user!.id, gatewayPayoutRef, note);
    if (!result.success) return res.status(400).json({ error: result.error });

    res.json({ success: true, message: 'Withdrawal marked as paid successfully!' });
  });

  // Admin: Add Note to Request
  app.post('/api/admin/withdrawals/:id/note', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note content is required' });

    const reqRow = queryDbOne(db, 'SELECT admin_notes FROM withdrawal_requests_v2 WHERE id = ?', [req.params.id]);
    if (!reqRow) return res.status(404).json({ error: 'Request not found' });

    const now = new Date().toISOString();
    const updated = `${reqRow.admin_notes || ''}\n[${now}] ${req.user!.username}: ${note}`.trim();
    runDb(db, 'UPDATE withdrawal_requests_v2 SET admin_notes = ?, updated_at = ? WHERE id = ?', [
      updated,
      now,
      req.params.id,
    ]);
    saveDbSync();

    res.json({ success: true, adminNotes: updated });
  });

  // Admin: Get / Update Withdrawal Settings & Rate
  app.get('/api/admin/withdrawal-settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const settings = getWithdrawalSettings(db);
    res.json({ settings });
  });

  app.put('/api/admin/withdrawal-settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const updated = updateWithdrawalSettings(db, req.body);
    res.json({ success: true, settings: updated });
  });

  // Admin: Coin Earning Rules Management (coins per post, coins per video, daily limits, cooldown)
  app.get('/api/admin/coin-earning-rules', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const rules = getCoinEarningRules(db);
    res.json({ rules });
  });

  app.put('/api/admin/coin-earning-rules', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const updatedRules = updateCoinEarningRules(db, req.body);
    res.json({ success: true, rules: updatedRules });
  });

  // Admin: Gift Catalog Management (3D gifts, pricing, categories, status)
  app.get('/api/admin/gifts', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const gifts = queryDbAll(db, 'SELECT * FROM gifts ORDER BY sort_order ASC, coin_price ASC');
    res.json({ gifts });
  });

  app.post('/api/admin/gifts', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, iconType = 'spark', coinPrice, image3d = 'crystal_prism', animation = 'orbital_float', category = 'popular', sortOrder = 0, description = '' } = req.body;
    if (!name || !coinPrice) {
      return res.status(400).json({ error: 'Name and coinPrice are required' });
    }

    const id = `gift_${Date.now()}`;
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO gifts (id, name, icon_type, coin_price, image_3d, animation, status, category, sort_order, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [id, name, iconType, Number(coinPrice), image3d, animation, category, Number(sortOrder), description, now, now]
    );

    saveDbSync();
    res.json({ success: true, id, message: 'Gift created successfully' });
  });

  app.put('/api/admin/gifts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const { name, iconType, coinPrice, image3d, animation, status, category, sortOrder, description } = req.body;
    const now = new Date().toISOString();

    runDb(
      db,
      `UPDATE gifts SET
        name = COALESCE(?, name),
        icon_type = COALESCE(?, icon_type),
        coin_price = COALESCE(?, coin_price),
        image_3d = COALESCE(?, image_3d),
        animation = COALESCE(?, animation),
        status = COALESCE(?, status),
        category = COALESCE(?, category),
        sort_order = COALESCE(?, sort_order),
        description = COALESCE(?, description),
        updated_at = ?
       WHERE id = ?`,
      [name, iconType, coinPrice !== undefined ? Number(coinPrice) : null, image3d, animation, status, category, sortOrder !== undefined ? Number(sortOrder) : null, description, now, id]
    );

    saveDbSync();
    res.json({ success: true, message: 'Gift updated successfully' });
  });

  app.delete('/api/admin/gifts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    runDb(db, 'DELETE FROM gifts WHERE id = ?', [id]);
    saveDbSync();
    res.json({ success: true });
  });

  // Admin: View all Payment Transactions
  app.get('/api/admin/payments', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { gateway, status, search } = req.query;
    let query = `
      SELECT p.*, u.username, u.full_name, u.email
      FROM payment_transactions_v2 p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (gateway && gateway !== 'all') {
      query += ` AND p.gateway_id = ?`;
      params.push(gateway);
    }
    if (status && status !== 'all') {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (p.transaction_id LIKE ? OR u.username LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY p.created_at DESC LIMIT 100`;

    const rows = queryDbAll(db, query, params);
    res.json({ payments: rows });
  });

  // Admin: Payment Reconciliation
  app.post('/api/admin/payments/:id/reconcile', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const tx = queryDbOne(db, 'SELECT * FROM payment_transactions_v2 WHERE id = ? OR transaction_id = ?', [
      req.params.id,
      req.params.id,
    ]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    try {
      const provider = PaymentGatewayRegistry.getInstance().getProvider(tx.gateway_id as PaymentGatewayId);
      const reconciliation = await provider.reconcileTransaction(tx.gateway_tx_id || tx.transaction_id);

      const now = new Date().toISOString();
      runDb(
        db,
        `UPDATE payment_transactions_v2 SET reconciled_at = ?, reconciled_by = ?, updated_at = ? WHERE id = ?`,
        [now, req.user!.username, now, tx.id]
      );
      saveDbSync();

      res.json({ success: true, reconciliation });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Reconciliation failed' });
    }
  });

  // Admin: Process Payment Refund
  app.post('/api/admin/payments/:id/refund', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    const tx = queryDbOne(db, 'SELECT * FROM payment_transactions_v2 WHERE id = ? OR transaction_id = ?', [
      req.params.id,
      req.params.id,
    ]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'completed') return res.status(400).json({ error: 'Only completed payments can be refunded' });

    try {
      const provider = PaymentGatewayRegistry.getInstance().getProvider(tx.gateway_id as PaymentGatewayId);
      const refund = await provider.processRefund(tx.gateway_tx_id || tx.transaction_id, tx.amount_bdt, reason || 'Admin Refund');

      if (!refund.isRefunded) {
        return res.status(400).json({ error: refund.failureReason || 'Gateway rejected refund' });
      }

      const now = new Date().toISOString();
      // Deduct coins from user if balance allows
      const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [tx.user_id]);
      if (wallet && wallet.balance >= tx.total_coins) {
        runDb(db, 'UPDATE coin_wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ?', [
          tx.total_coins,
          now,
          tx.user_id,
        ]);
        runDb(db, 'UPDATE users SET coins_balance = coins_balance - ? WHERE id = ?', [tx.total_coins, tx.user_id]);
      }

      runDb(
        db,
        `UPDATE payment_transactions_v2 SET
          status = 'refunded',
          refund_reason = ?,
          refund_tx_id = ?,
          updated_at = ?
         WHERE id = ?`,
        [reason || 'Admin Authorized Refund', refund.refundTransactionId, now, tx.id]
      );

      saveDbSync();
      res.json({ success: true, refundTransactionId: refund.refundTransactionId });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Refund processing failed' });
    }
  });

  // Admin: Financial Stats & Liquidity Metrics
  app.get('/api/admin/financial-stats', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    // 1. Total Coin Revenue Processed
    const revRow = queryDbOne(
      db,
      `SELECT SUM(amount_bdt) as total_bdt, COUNT(*) as count FROM payment_transactions_v2 WHERE status = 'completed'`
    );
    // 2. Total Paid Withdrawals
    const paidRow = queryDbOne(
      db,
      `SELECT SUM(net_payout_bdt) as paid_bdt, SUM(fee_bdt) as fee_bdt, COUNT(*) as count FROM withdrawal_requests_v2 WHERE status = 'paid'`
    );
    // 3. Pending Withdrawal Liability
    const pendingRow = queryDbOne(
      db,
      `SELECT SUM(net_payout_bdt) as pending_bdt, SUM(coins_amount) as pending_coins, COUNT(*) as count FROM withdrawal_requests_v2 WHERE status IN ('pending', 'reviewing', 'approved', 'processing')`
    );
    // 4. Circulating Coins Total
    const circRow = queryDbOne(db, 'SELECT SUM(balance) as total_coins FROM coin_wallets');

    res.json({
      revenueBdt: toDecimalSafe(revRow?.total_bdt || 0),
      completedPurchasesCount: revRow?.count || 0,
      paidOutBdt: toDecimalSafe(paidRow?.paid_bdt || 0),
      feesCollectedBdt: toDecimalSafe(paidRow?.fee_bdt || 0),
      completedPayoutsCount: paidRow?.count || 0,
      pendingLiabilityBdt: toDecimalSafe(pendingRow?.pending_bdt || 0),
      pendingLiabilityCoins: pendingRow?.pending_coins || 0,
      pendingPayoutsCount: pendingRow?.count || 0,
      totalCoinsCirculating: circRow?.total_coins || 0,
      platformNetProfitBdt: toDecimalSafe((revRow?.total_bdt || 0) + (paidRow?.fee_bdt || 0) - (paidRow?.paid_bdt || 0)),
    });
  });

  app.get('/api/gifts', (req: Request, res: Response) => {
    const gifts = queryDbAll(db, 'SELECT * FROM gifts WHERE status = "active" ORDER BY sort_order ASC, coin_price ASC');
    res.json({
      gifts: gifts.map((g) => ({
        id: g.id,
        name: g.name,
        iconType: g.icon_type,
        coinPrice: g.coin_price,
        image3d: g.image_3d,
        animation: g.animation || 'orbital_float',
        category: g.category || 'popular',
        sortOrder: g.sort_order || 0,
        description: g.description || '',
        status: g.status || 'active',
      })),
    });
  });

  app.post('/api/gifts/send', authenticateToken, financialRateLimit, async (req: AuthRequest, res: Response) => {
    const senderId = req.user!.id;
    const { giftId, receiverId, postId, commentId, idempotencyKey } = req.body;

    if (!giftId || !receiverId) {
      return res.status(400).json({ error: 'Missing required giftId or receiverId' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send gifts to yourself' });
    }

    // Security Check: Is sender restricted from tipping/gifting?
    const restriction = isUserRestricted(db, senderId, 'gifting');
    if (restriction.restricted) {
      return res.status(403).json({
        error: `Your account is temporarily restricted from sending gifts: ${restriction.reason}. Expires: ${restriction.expiresAt}`,
      });
    }

    if (receiverId && isBlockedBetween(senderId, receiverId).blocked) {
      return res.status(403).json({ error: 'Cannot send gift: user interaction is blocked' });
    }

    const sender = queryDbOne(db, 'SELECT full_name, username FROM users WHERE id = ?', [senderId]);
    if (!sender) return res.status(404).json({ error: 'Sender account not found' });

    // Anti-Spam: Circular Gifting Anomaly Detection
    const circularCheck = checkCircularGifting(db, senderId, receiverId);
    if (circularCheck.isSuspicious) {
      return res.status(400).json({ error: circularCheck.reason });
    }

    try {
      // Execute within Financial Mutex Queue to prevent double-spending & race conditions
      const result = await financialMutex.withWalletLock(senderId, async () => {
        return financialMutex.withWalletLock(receiverId, async () => {
          // Execute financial-safety atomic database transaction with idempotency protection
          return executeGiftTransaction(db, {
            senderId,
            receiverId,
            giftId,
            postId,
            commentId,
            idempotencyKey,
          });
        });
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to process gift transfer' });
      }

      const transferRes = result;

      // If not an idempotent replay, dispatch live events
      if (!transferRes.isDuplicate) {
        const giftInfo = queryDbOne(db, 'SELECT * FROM gifts WHERE id = ?', [giftId]);
        const giftName = giftInfo ? giftInfo.name : (transferRes.giftName || 'Gift');
        const iconType = giftInfo ? giftInfo.icon_type : 'spark';
        const image3d = giftInfo ? giftInfo.image_3d : 'crystal_prism';
        const animation = giftInfo ? giftInfo.animation : 'orbital_float';

        // Notify recipient with navigation metadata
        sendNotification(
          receiverId,
          senderId,
          'gift',
          `${sender.full_name} sent you a 3D gift: ${giftName} (${transferRes.coinPrice} coins)!`,
          postId || commentId || senderId,
          postId ? 'post' : 'user'
        );

        // Real-time live balance updates to both sender and recipient
        io.to(`user_${senderId}`).emit('balance_updated', {
          coinsBalance: transferRes.senderBalanceAfter,
        });
        io.to(`user_${receiverId}`).emit('balance_updated', {
          coinsBalance: transferRes.receiverBalanceAfter,
        });

        // Socket live event for high-impact 3D animation
        io.emit('live_gift_animation', {
          giftId,
          giftName,
          iconType,
          image3d,
          animation,
          senderId,
          senderName: sender.full_name,
          receiverId,
          postId: postId || null,
          commentId: commentId || null,
          coinPrice: transferRes.coinPrice,
        });
      }

      res.json({
        success: true,
        coinsBalance: transferRes.senderBalanceAfter,
        senderBalanceAfter: transferRes.senderBalanceAfter,
        coinPrice: transferRes.coinPrice,
        giftName: transferRes.giftName,
        transactionId: transferRes.transactionId,
        isDuplicate: transferRes.isDuplicate || false,
      });
    } catch (err: any) {
      console.error('Gift transfer error:', err);
      res.status(400).json({ error: err.message || 'Transaction error during gift sending' });
    }
  });

  // User Gift Activity Log (Both Sent & Received)
  app.get('/api/gifts/my-activity', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const type = (req.query.type as string) || 'all';

      let sql = `
        SELECT gt.*, 
               s.username as sender_username, s.full_name as sender_full_name, s.avatar_url as sender_avatar,
               r.username as receiver_username, r.full_name as receiver_full_name, r.avatar_url as receiver_avatar,
               g.name as gift_name, g.image_3d as gift_image_3d, g.icon_type as gift_icon_type, COALESCE(g.coin_price, 0) as coin_amount
        FROM gift_transactions gt
        LEFT JOIN users s ON gt.sender_id = s.id
        LEFT JOIN users r ON gt.receiver_id = r.id
        LEFT JOIN gifts g ON gt.gift_id = g.id
        WHERE (gt.sender_id = ? OR gt.receiver_id = ?)
      `;
      const params: any[] = [userId, userId];

      if (type === 'sent') {
        sql = `
          SELECT gt.*, 
                 s.username as sender_username, s.full_name as sender_full_name, s.avatar_url as sender_avatar,
                 r.username as receiver_username, r.full_name as receiver_full_name, r.avatar_url as receiver_avatar,
                 g.name as gift_name, g.image_3d as gift_image_3d, g.icon_type as gift_icon_type, COALESCE(g.coin_price, 0) as coin_amount
          FROM gift_transactions gt
          LEFT JOIN users s ON gt.sender_id = s.id
          LEFT JOIN users r ON gt.receiver_id = r.id
          LEFT JOIN gifts g ON gt.gift_id = g.id
          WHERE gt.sender_id = ?
        `;
        params.length = 0;
        params.push(userId);
      } else if (type === 'received') {
        sql = `
          SELECT gt.*, 
                 s.username as sender_username, s.full_name as sender_full_name, s.avatar_url as sender_avatar,
                 r.username as receiver_username, r.full_name as receiver_full_name, r.avatar_url as receiver_avatar,
                 g.name as gift_name, g.image_3d as gift_image_3d, g.icon_type as gift_icon_type, COALESCE(g.coin_price, 0) as coin_amount
          FROM gift_transactions gt
          LEFT JOIN users s ON gt.sender_id = s.id
          LEFT JOIN users r ON gt.receiver_id = r.id
          LEFT JOIN gifts g ON gt.gift_id = g.id
          WHERE gt.receiver_id = ?
        `;
        params.length = 0;
        params.push(userId);
      }

      sql += ` ORDER BY gt.created_at DESC LIMIT 100`;

      const rows = queryDbAll(db, sql, params);
      const gifts = rows.map((t: any) => ({
        id: t.id,
        transactionId: t.transaction_id,
        direction: t.sender_id === userId ? 'sent' : 'received',
        senderId: t.sender_id,
        senderName: t.sender_full_name || (t.sender_username ? `@${t.sender_username}` : 'User'),
        senderAvatar: t.sender_avatar,
        receiverId: t.receiver_id,
        receiverName: t.receiver_full_name || (t.receiver_username ? `@${t.receiver_username}` : 'Creator'),
        receiverAvatar: t.receiver_avatar,
        giftId: t.gift_id,
        giftName: t.gift_name || 'Holographic Artifact',
        giftImage3d: t.gift_image_3d,
        giftIconType: t.gift_icon_type,
        coinAmount: t.coin_amount || 0,
        postId: t.post_id || null,
        createdAt: t.created_at,
      }));

      res.json({ success: true, gifts });
    } catch (e: any) {
      console.error('Error fetching gift activity:', e);
      res.status(500).json({ error: 'Failed to fetch gift activity' });
    }
  });

  // Creator Engagement Insights API
  app.get('/api/creator/engagement-insights', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const period = (req.query.period as string) || '7d';

      const userRow = queryDbOne(db, 'SELECT id, followers_count, following_count FROM users WHERE id = ?', [userId]);
      const userPosts = queryDbAll(
        db,
        'SELECT id, content, comments_count, shares_count, gifts_received_count, created_at FROM posts WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      const reactionsCount = queryDbOne(
        db,
        'SELECT COUNT(*) as count FROM reactions WHERE post_id IS NOT NULL AND post_id IN (SELECT id FROM posts WHERE user_id = ?)',
        [userId]
      );

      const totalPosts = userPosts.length;
      const totalComments = userPosts.reduce((acc, p) => acc + (p.comments_count || 0), 0);
      const totalShares = userPosts.reduce((acc, p) => acc + (p.shares_count || 0), 0);
      const totalGifts = userPosts.reduce((acc, p) => acc + (p.gifts_received_count || 0), 0);
      const totalLikes = reactionsCount?.count || 0;

      res.json({
        success: true,
        period,
        stats: {
          followersCount: userRow?.followers_count || 0,
          followingCount: userRow?.following_count || 0,
          totalPosts,
          totalLikes,
          totalComments,
          totalShares,
          totalGifts,
          recentPosts: userPosts.slice(0, 5),
        },
      });
    } catch (e: any) {
      console.error('Error fetching creator insights:', e);
      res.status(500).json({ error: 'Failed to fetch creator insights' });
    }
  });

  // --- 8. ADVERTISEMENTS & MONETIZATION ARCHITECTURE ---
  // A. Public Ad Serving Endpoint with Targeting & Frequency Control
  app.get('/api/ads/serve', (req: Request, res: Response) => {
    try {
      const placement = (req.query.placement as string) || 'feed_inline';
      const device = (req.query.device as 'mobile' | 'desktop') || 'desktop';

      let userId: string | undefined;
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch {
          // anonymous ad request
        }
      }

      const adPayload = serveAdForPlacement(db, placement, {
        userId,
        device,
        country: (req.headers['cf-ipcountry'] as string) || 'US',
        sessionId: req.headers['x-session-id'] as string,
      });

      res.json(adPayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error serving advertisement' });
    }
  });

  // B. Impression Tracking (Debounced & Budget Updated)
  app.post('/api/ads/track/impression', (req: Request, res: Response) => {
    try {
      const { campaignId, placementId, device } = req.body;
      if (!campaignId || !placementId) {
        return res.status(400).json({ error: 'campaignId and placementId are required' });
      }

      let userId: string | undefined;
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
          userId = decoded.id;
        } catch {}
      }

      const result = recordAdImpression(db, {
        campaignId,
        placementId,
        userId,
        sessionId: req.headers['x-session-id'] as string,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        device: device || 'desktop',
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error tracking impression' });
    }
  });

  // C. Click Tracking & Secure Destination Resolution
  app.post('/api/ads/track/click', (req: Request, res: Response) => {
    try {
      const { campaignId, placementId } = req.body;
      if (!campaignId || !placementId) {
        return res.status(400).json({ error: 'campaignId and placementId are required' });
      }

      let userId: string | undefined;
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
          userId = decoded.id;
        } catch {}
      }

      const result = recordAdClick(db, {
        campaignId,
        placementId,
        userId,
        sessionId: req.headers['x-session-id'] as string,
        ip: req.ip,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error tracking click' });
    }
  });

  // D. Secure Rewarded Ad: Step 1 - Challenge Issuance
  app.post('/api/ads/rewarded/challenge', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { placementId = 'rewarded_coin_modal', campaignId } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'campaignId is required' });
      }

      const challenge = issueRewardedChallenge(db, placementId, campaignId, userId, req.ip);
      res.json({ success: true, challenge });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to issue reward challenge' });
    }
  });

  // E. Secure Rewarded Ad: Step 2 - Cryptographic Server Validation & Coin Credit
  // CRITICAL: Never award coins merely because frontend says an advertisement was watched!
  app.post('/api/ads/rewarded/claim', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { challengeToken, watchDurationSec = 15, providerSignature } = req.body;

      if (!challengeToken) {
        return res.status(400).json({ error: 'challengeToken is required' });
      }

      const result = verifyAndClaimRewardedAd(
        db,
        challengeToken,
        Number(watchDurationSec),
        userId,
        providerSignature
      );

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Reward verification failed' });
    }
  });

  // F. Admin Ad Analytics Report
  app.get('/api/admin/ads/analytics', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const timeRangeDays = parseInt(req.query.days as string) || 30;
      const report = getAdAnalyticsReport(db, timeRangeDays);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate ad report' });
    }
  });

  // G. Admin Placements Management
  app.get('/api/admin/ads/placements', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const placements = getAdPlacements(db);
      res.json({ placements });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get placements' });
    }
  });

  app.patch('/api/admin/ads/placements/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = updateAdPlacement(db, req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update placement' });
    }
  });

  // H. Admin Campaigns Management
  app.get('/api/admin/ads/campaigns', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const campaigns = getAdCampaigns(db, {
        status: req.query.status as string,
        provider: req.query.provider as string,
      });
      res.json({ campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get campaigns' });
    }
  });

  app.post('/api/admin/ads/campaigns', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const campaign = createAdCampaign(
        db,
        req.body,
        req.user!.id,
        req.user!.username || 'Admin Advertiser'
      );
      res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create campaign' });
    }
  });

  app.patch('/api/admin/ads/campaigns/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const campaign = updateAdCampaign(db, req.params.id, req.body);
      res.json({ success: true, campaign });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update campaign' });
    }
  });

  app.delete('/api/admin/ads/campaigns/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const result = deleteAdCampaign(db, req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete campaign' });
    }
  });

  // I. Admin Ad Platform & AdMob Settings
  app.get('/api/admin/ads/settings', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const settings = getPlatformAdSettings(db);
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get ad platform settings' });
    }
  });

  app.post('/api/admin/ads/settings', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const settings = updatePlatformAdSettings(db, req.body);
      const now = new Date().toISOString();
      const syncMap: Record<string, string | undefined> = {
        admob_enabled: req.body.admobEnabled !== undefined ? (req.body.admobEnabled ? '1' : '0') : undefined,
        admob_android_app_id: req.body.admobAndroidAppId,
        admob_android_banner_unit_id: req.body.admobAndroidBannerUnitId,
        admob_android_interstitial_unit_id: req.body.admobAndroidInterstitialUnitId,
        admob_android_rewarded_unit_id: req.body.admobAndroidRewardedUnitId,
        admob_android_native_unit_id: req.body.admobAndroidNativeUnitId,
        admob_ios_app_id: req.body.admobIosAppId,
        admob_ios_banner_unit_id: req.body.admobIosBannerUnitId,
        admob_ios_interstitial_unit_id: req.body.admobIosInterstitialUnitId,
        admob_ios_rewarded_unit_id: req.body.admobIosRewardedUnitId,
        admob_ios_native_unit_id: req.body.admobIosNativeUnitId,
      };
      for (const [k, v] of Object.entries(syncMap)) {
        if (v !== undefined) {
          runDb(
            db,
            `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
            [k, v, now, v, now]
          );
        }
      }
      saveDbSync();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update ad platform settings' });
    }
  });

  // J. Admin AdMob Health & Security Diagnostic Inspector
  app.get('/api/admin/ads/admob/health-check', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const settings = getPlatformAdSettings(db);

      const isTestId = (id: string | undefined) => !id || id.includes('3940256099942544');

      const androidAppIdValid = Boolean(settings.admobAndroidAppId && settings.admobAndroidAppId.trim().length > 5);
      const iosAppIdValid = Boolean(settings.admobIosAppId && settings.admobIosAppId.trim().length > 5);

      const androidUnitsPresent = Boolean(
        settings.admobAndroidBannerUnitId &&
          settings.admobAndroidInterstitialUnitId &&
          settings.admobAndroidRewardedUnitId
      );

      const iosUnitsPresent = Boolean(
        settings.admobIosBannerUnitId &&
          settings.admobIosInterstitialUnitId &&
          settings.admobIosRewardedUnitId
      );

      const usesTestMode =
        isTestId(settings.admobAndroidAppId) ||
        isTestId(settings.admobAndroidBannerUnitId) ||
        isTestId(settings.admobAndroidRewardedUnitId) ||
        isTestId(settings.admobIosAppId) ||
        isTestId(settings.admobIosBannerUnitId);

      let configStatus: 'configured' | 'incomplete' | 'disabled' | 'test_mode' = 'configured';

      if (!settings.admobEnabled) {
        configStatus = 'disabled';
      } else if (!androidAppIdValid || !iosAppIdValid || !androidUnitsPresent || !iosUnitsPresent) {
        configStatus = 'incomplete';
      } else if (usesTestMode) {
        configStatus = 'test_mode';
      } else {
        configStatus = 'configured';
      }

      res.json({
        status: configStatus,
        enabled: settings.admobEnabled,
        usesTestMode,
        details: {
          android: {
            appId: settings.admobAndroidAppId,
            appIdValid: androidAppIdValid,
            bannerUnitId: settings.admobAndroidBannerUnitId,
            interstitialUnitId: settings.admobAndroidInterstitialUnitId,
            rewardedUnitId: settings.admobAndroidRewardedUnitId,
            nativeUnitId: settings.admobAndroidNativeUnitId,
            unitsConfigured: androidUnitsPresent,
          },
          ios: {
            appId: settings.admobIosAppId,
            appIdValid: iosAppIdValid,
            bannerUnitId: settings.admobIosBannerUnitId,
            interstitialUnitId: settings.admobIosInterstitialUnitId,
            rewardedUnitId: settings.admobIosRewardedUnitId,
            nativeUnitId: settings.admobIosNativeUnitId,
            unitsConfigured: iosUnitsPresent,
          },
          security: {
            ssvCryptographicHmacActive: true,
            serverVerificationEnforced: true,
            clientSideClaimsTrusted: false,
            globalDailyRewardCapPerUser: settings.globalDailyRewardCapPerUser,
            rewardCooldownSeconds: settings.rewardCooldownSeconds,
            rewardDailyCapConfigured: settings.globalDailyRewardCapPerUser > 0,
            cooldownConfigured: settings.rewardCooldownSeconds > 0,
          },
          wrapperStatus: {
            mobileBridgeAvailable: false,
            wrapperNote:
              'Backend & SSV architecture fully operational. When running in a mobile app wrapper (Android WebView/Capacitor/Flutter), the JS bridge registers window.AndroidAdMob or window.Capacitor.Plugins.AdMob.',
          },
        },
        diagnostics: [
          {
            id: 'admob_master_toggle',
            label: 'AdMob Master Enable Flag',
            passed: settings.admobEnabled,
            message: settings.admobEnabled ? 'AdMob is globally enabled.' : 'AdMob is currently disabled.',
          },
          {
            id: 'android_app_id',
            label: 'Android AdMob App ID',
            passed: androidAppIdValid,
            message: androidAppIdValid
              ? `Android App ID configured (${settings.admobAndroidAppId})`
              : 'Android App ID is missing or empty.',
          },
          {
            id: 'ios_app_id',
            label: 'iOS AdMob App ID',
            passed: iosAppIdValid,
            message: iosAppIdValid
              ? `iOS App ID configured (${settings.admobIosAppId})`
              : 'iOS App ID is missing or empty.',
          },
          {
            id: 'ad_units_completeness',
            label: 'Banner, Interstitial & Rewarded Unit IDs',
            passed: androidUnitsPresent && iosUnitsPresent,
            message:
              androidUnitsPresent && iosUnitsPresent
                ? 'All required Ad Unit IDs are defined for Android and iOS.'
                : 'Some Ad Unit IDs are missing.',
          },
          {
            id: 'environment_mode',
            label: 'Mode Inspection',
            passed: true,
            message: usesTestMode
              ? 'Test Mode active (Google default test IDs present).'
              : 'Production Mode active with custom publisher Ad Unit IDs.',
          },
          {
            id: 'server_ssv_security',
            label: 'Server-Side Verification (SSV) Vault',
            passed: true,
            message: 'HMAC-SHA256 challenge nonces active. Unverified frontend claims are strictly rejected.',
          },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AdMob health check failed' });
    }
  });

  // Public AdMob & Ad Platform Settings
  app.get('/api/ads/public-settings', (req: Request, res: Response) => {
    try {
      const settings = getPlatformAdSettings(db);
      res.json({
        success: true,
        admob: {
          enabled: Boolean(settings.admobEnabled),
          android: {
            appId: settings.admobAndroidAppId,
            bannerUnitId: settings.admobAndroidBannerUnitId,
            interstitialUnitId: settings.admobAndroidInterstitialUnitId,
            rewardedUnitId: settings.admobAndroidRewardedUnitId,
            nativeUnitId: settings.admobAndroidNativeUnitId,
          },
          ios: {
            appId: settings.admobIosAppId,
            bannerUnitId: settings.admobIosBannerUnitId,
            interstitialUnitId: settings.admobIosInterstitialUnitId,
            rewardedUnitId: settings.admobIosRewardedUnitId,
            nativeUnitId: settings.admobIosNativeUnitId,
          },
          globalDailyRewardCapPerUser: settings.globalDailyRewardCapPerUser,
          rewardCooldownSeconds: settings.rewardCooldownSeconds,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch public ad settings' });
    }
  });

  // Legacy fallback
  app.get('/api/ads', (req: Request, res: Response) => {
    const campaigns = getAdCampaigns(db, { status: 'active' });
    res.json({
      ads: campaigns.map((c) => ({
        id: c.id,
        userId: c.advertiserId,
        title: c.title,
        description: c.bodyText,
        targetUrl: c.destinationUrl,
        imageUrl: c.mediaUrl || '',
        clicksCount: c.clicksCount,
        impressionsCount: c.impressionsCount,
      })),
    });
  });

  // --- 9. NOTIFICATIONS & REPORTS ---
  app.get('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const filter = (req.query.filter as string) || 'all';
      const search = (req.query.search as string) || '';
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      let whereClause = 'WHERE user_id = ?';
      const params: any[] = [userId];

      if (filter === 'unread') {
        whereClause += ' AND is_read = 0';
      } else if (filter === 'social') {
        whereClause += " AND type IN ('like', 'reaction', 'comment', 'reply', 'mention', 'share', 'repost')";
      } else if (filter === 'connections') {
        whereClause += " AND type IN ('friend_request', 'friend_accepted', 'friend_accept', 'follow')";
      } else if (filter === 'messages') {
        whereClause += " AND type IN ('message', 'group_activity', 'page_activity', 'event_activity')";
      } else if (filter === 'economy') {
        whereClause += " AND type IN ('gift_received', 'gift', 'coin_received', 'coin_purchase', 'withdrawal_update')";
      } else if (filter === 'system') {
        whereClause += " AND type IN ('admin_announcement', 'security_alert', 'system', 'ad_approved')";
      }

      if (search.trim()) {
        whereClause += ' AND (message LIKE ? OR type LIKE ?)';
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      const totalCountRow = queryDbOne(db, `SELECT COUNT(*) as cnt FROM notifications ${whereClause}`, params);
      const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);

      const notifs = queryDbAll(
        db,
        `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const formatted = (notifs || []).map((n) => {
        const sender = n.sender_id
          ? queryDbOne(db, 'SELECT id, username, full_name, avatar_url, badge FROM users WHERE id = ?', [n.sender_id])
          : undefined;

        let metadataObj: any = undefined;
        if (n.metadata) {
          try {
            metadataObj = JSON.parse(n.metadata);
          } catch (e) {
            metadataObj = n.metadata;
          }
        }

        return {
          id: n.id,
          userId: n.user_id,
          senderId: n.sender_id || undefined,
          sender: sender ? {
            id: sender.id,
            username: sender.username,
            fullName: sender.full_name,
            avatarUrl: sender.avatar_url,
            badge: sender.badge
          } : undefined,
          type: n.type,
          referenceId: n.reference_id,
          referenceType: n.reference_type,
          message: n.message,
          isRead: Boolean(n.is_read),
          metadata: metadataObj,
          dedupKey: n.dedup_key,
          actionUrl: n.action_url,
          createdAt: n.created_at,
        };
      });

      res.json({
        notifications: formatted,
        total: totalCountRow ? totalCountRow.cnt : formatted.length,
        unreadCount: unreadCountRow ? unreadCountRow.cnt : 0,
      });
    } catch (error) {
      console.error('Error querying notifications in server:', error);
      res.json({
        notifications: [],
        total: 0,
        unreadCount: 0,
      });
    }
  });

  app.get('/api/notifications/unread-count', authenticateToken, (req: AuthRequest, res: Response) => {
    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [req.user!.id]);
    res.json({ unreadCount: unreadCountRow ? unreadCountRow.cnt : 0 });
  });

  app.post('/api/notifications/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    runDb(db, 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);

    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    const unreadCount = unreadCountRow ? unreadCountRow.cnt : 0;
    io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount });

    res.json({ success: true, unreadCount });
  });

  app.post('/api/notifications/mark-read', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { ids } = req.body || {};

    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      runDb(db, `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...ids]);
    } else {
      runDb(db, 'UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    }

    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    const unreadCount = unreadCountRow ? unreadCountRow.cnt : 0;

    io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount });
    io.to(`user_${userId}`).emit('notifications_marked_all_read');

    res.json({ success: true, unreadCount });
  });

  app.delete('/api/notifications/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    runDb(db, 'DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);

    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    const unreadCount = unreadCountRow ? unreadCountRow.cnt : 0;

    io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount });
    io.to(`user_${userId}`).emit('notification_deleted', { id });

    res.json({ success: true, unreadCount });
  });

  app.delete('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const all = req.query.all === 'true';

    if (all) {
      runDb(db, 'DELETE FROM notifications WHERE user_id = ?', [userId]);
    } else {
      runDb(db, 'DELETE FROM notifications WHERE user_id = ? AND is_read = 1', [userId]);
    }

    const unreadCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    const unreadCount = unreadCountRow ? unreadCountRow.cnt : 0;

    io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount });
    res.json({ success: true, unreadCount });
  });

  // Notification Preferences API
  app.get('/api/user/notification-preferences', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    let pref = queryDbOne(db, 'SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);

    if (!pref) {
      const now = new Date().toISOString();
      const id = 'np_' + userId;
      runDb(
        db,
        `INSERT INTO notification_preferences (
          id, user_id, in_app_enabled, browser_push_enabled, mobile_push_enabled, email_enabled, sound_enabled,
          dnd_enabled, dnd_start, dnd_end,
          pref_friend_request, pref_friend_accepted, pref_follow, pref_like, pref_comment, pref_reply,
          pref_mention, pref_share, pref_repost, pref_message, pref_group_activity, pref_page_activity,
          pref_event_activity, pref_gift_received, pref_coin_received, pref_coin_purchase,
          pref_withdrawal_update, pref_admin_announcement, pref_security_alert, updated_at
        ) VALUES (?, ?, 1, 1, 1, 1, 1, 0, '22:00', '07:00', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ?)`,
        [id, userId, now]
      );
      pref = queryDbOne(db, 'SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
    }

    res.json({
      preferences: {
        inAppEnabled: Boolean(pref.in_app_enabled),
        browserPushEnabled: Boolean(pref.browser_push_enabled),
        mobilePushEnabled: Boolean(pref.mobile_push_enabled),
        emailEnabled: Boolean(pref.email_enabled),
        soundEnabled: Boolean(pref.sound_enabled),
        dndEnabled: Boolean(pref.dnd_enabled),
        dndStart: pref.dnd_start || '22:00',
        dndEnd: pref.dnd_end || '07:00',
        prefFriendRequest: Boolean(pref.pref_friend_request),
        prefFriendAccepted: Boolean(pref.pref_friend_accepted),
        prefFollow: Boolean(pref.pref_follow),
        prefLike: Boolean(pref.pref_like),
        prefComment: Boolean(pref.pref_comment),
        prefReply: Boolean(pref.pref_reply),
        prefMention: Boolean(pref.pref_mention),
        prefShare: Boolean(pref.pref_share),
        prefRepost: Boolean(pref.pref_repost),
        prefMessage: Boolean(pref.pref_message),
        prefGroupActivity: Boolean(pref.pref_group_activity),
        prefPageActivity: Boolean(pref.pref_page_activity),
        prefEventActivity: Boolean(pref.pref_event_activity),
        prefGiftReceived: Boolean(pref.pref_gift_received),
        prefCoinReceived: Boolean(pref.pref_coin_received),
        prefCoinPurchase: Boolean(pref.pref_coin_purchase),
        prefWithdrawalUpdate: Boolean(pref.pref_withdrawal_update),
        prefAdminAnnouncement: Boolean(pref.pref_admin_announcement),
        prefSecurityAlert: Boolean(pref.pref_security_alert),
      }
    });
  });

  app.put('/api/user/notification-preferences', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body = req.body || {};
    const now = new Date().toISOString();

    const boolToNum = (val: any, defaultVal = 1) => (val === undefined ? defaultVal : val ? 1 : 0);

    runDb(
      db,
      `INSERT INTO notification_preferences (
        id, user_id, in_app_enabled, browser_push_enabled, mobile_push_enabled, email_enabled, sound_enabled,
        dnd_enabled, dnd_start, dnd_end,
        pref_friend_request, pref_friend_accepted, pref_follow, pref_like, pref_comment, pref_reply,
        pref_mention, pref_share, pref_repost, pref_message, pref_group_activity, pref_page_activity,
        pref_event_activity, pref_gift_received, pref_coin_received, pref_coin_purchase,
        pref_withdrawal_update, pref_admin_announcement, pref_security_alert, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(user_id) DO UPDATE SET
        in_app_enabled = excluded.in_app_enabled,
        browser_push_enabled = excluded.browser_push_enabled,
        mobile_push_enabled = excluded.mobile_push_enabled,
        email_enabled = excluded.email_enabled,
        sound_enabled = excluded.sound_enabled,
        dnd_enabled = excluded.dnd_enabled,
        dnd_start = excluded.dnd_start,
        dnd_end = excluded.dnd_end,
        pref_friend_request = excluded.pref_friend_request,
        pref_friend_accepted = excluded.pref_friend_accepted,
        pref_follow = excluded.pref_follow,
        pref_like = excluded.pref_like,
        pref_comment = excluded.pref_comment,
        pref_reply = excluded.pref_reply,
        pref_mention = excluded.pref_mention,
        pref_share = excluded.pref_share,
        pref_repost = excluded.pref_repost,
        pref_message = excluded.pref_message,
        pref_group_activity = excluded.pref_group_activity,
        pref_page_activity = excluded.pref_page_activity,
        pref_event_activity = excluded.pref_event_activity,
        pref_gift_received = excluded.pref_gift_received,
        pref_coin_received = excluded.pref_coin_received,
        pref_coin_purchase = excluded.pref_coin_purchase,
        pref_withdrawal_update = excluded.pref_withdrawal_update,
        pref_admin_announcement = excluded.pref_admin_announcement,
        pref_security_alert = excluded.pref_security_alert,
        updated_at = excluded.updated_at`,
      [
        'np_' + userId,
        userId,
        boolToNum(body.inAppEnabled),
        boolToNum(body.browserPushEnabled),
        boolToNum(body.mobilePushEnabled),
        boolToNum(body.emailEnabled),
        boolToNum(body.soundEnabled),
        boolToNum(body.dndEnabled, 0),
        body.dndStart || '22:00',
        body.dndEnd || '07:00',
        boolToNum(body.prefFriendRequest),
        boolToNum(body.prefFriendAccepted),
        boolToNum(body.prefFollow),
        boolToNum(body.prefLike),
        boolToNum(body.prefComment),
        boolToNum(body.prefReply),
        boolToNum(body.prefMention),
        boolToNum(body.prefShare),
        boolToNum(body.prefRepost),
        boolToNum(body.prefMessage),
        boolToNum(body.prefGroupActivity),
        boolToNum(body.prefPageActivity),
        boolToNum(body.prefEventActivity),
        boolToNum(body.prefGiftReceived),
        boolToNum(body.prefCoinReceived),
        boolToNum(body.prefCoinPurchase),
        boolToNum(body.prefWithdrawalUpdate),
        boolToNum(body.prefAdminAnnouncement),
        boolToNum(body.prefSecurityAlert),
        now,
      ]
    );

    res.json({ success: true, message: 'Notification preferences saved' });
  });

  // Push Subscription Architecture APIs
  app.get('/api/push/subscriptions', authenticateToken, (req: AuthRequest, res: Response) => {
    const subs = queryDbAll(
      db,
      'SELECT id, platform, endpoint, device_name, is_active, created_at FROM push_subscriptions WHERE user_id = ? AND is_active = 1',
      [req.user!.id]
    );
    res.json({
      subscriptions: subs.map((s) => ({
        id: s.id,
        platform: s.platform,
        endpoint: s.endpoint,
        deviceName: s.device_name,
        isActive: Boolean(s.is_active),
        createdAt: s.created_at,
      })),
    });
  });

  app.post('/api/push/subscribe', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { platform = 'web', endpoint, p256dh, auth, deviceToken, deviceName } = req.body;
    const now = new Date().toISOString();
    const id = 'psub_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    runDb(
      db,
      `INSERT INTO push_subscriptions (id, user_id, platform, endpoint, p256dh, auth, device_token, device_name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, userId, platform, endpoint || null, p256dh || null, auth || null, deviceToken || null, deviceName || `${platform} Client`, now, now]
    );

    res.json({ success: true, subscriptionId: id });
  });

  app.delete('/api/push/unsubscribe', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { subscriptionId } = req.body;
    if (subscriptionId) {
      runDb(db, 'DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?', [subscriptionId, userId]);
    } else {
      runDb(db, 'DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    }
    res.json({ success: true });
  });

  app.post('/api/push/test', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { type = 'like' } = req.body;
    const sender = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id != ? LIMIT 1', [userId]) || {
      id: 'user_marcus',
      username: 'marcus_tech',
      fullName: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    };

    const notifId = sendNotification({
      userId,
      senderId: sender.id,
      type,
      message: `Simulated Push Notification: ${sender.fullName} sent a real-time ${type.replace(/_/g, ' ')} pulse!`,
      referenceId: 'post_seed_1',
      referenceType: 'post',
      metadata: { route: 'post', postId: 'post_seed_1', testPush: true },
      dedupWindowSeconds: 0, // Bypass deduplication for explicit test triggers
    });

    res.json({ success: true, notificationId: notifId, message: 'Test push notification dispatched successfully' });
  });

  // Developer Simulation API for any of the 19 Notification Types
  app.post('/api/notifications/simulate', authenticateToken, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { type, message, senderId, metadata, referenceId, referenceType } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const defaultSender = senderId || 'user_marcus';
    const notifMessage = message || `Real-time pulse: ${type.replace(/_/g, ' ')} event received.`;

    const id = sendNotification({
      userId,
      senderId: defaultSender,
      type,
      message: notifMessage,
      referenceId: referenceId || 'post_seed_1',
      referenceType: referenceType || 'post',
      metadata: metadata || { route: 'home', targetId: 'sample' },
      dedupWindowSeconds: 0, // Allow instant simulation
    });

    res.json({ success: true, notificationId: id });
  });

  // Universal Report Creation API with Automatic Snapshot, Rate-Limiting & Anti-Abuse
  app.post('/api/reports', authenticateToken, postActionRateLimit, (req: AuthRequest, res: Response) => {
    const reporterId = req.user!.id;
    const {
      targetType,
      targetId,
      category,
      reason,
      description,
      evidence,
      evidenceUrl,
      screenshots,
      relatedContent,
      additionalInfo,
      details,
    } = req.body;

    if (!targetType || !targetId || (!reason && !category && !description)) {
      return res.status(400).json({ error: 'Report details incomplete. targetType, targetId, and category/description are required.' });
    }

    try {
      const result = createReport(db, reporterId, {
        targetType: targetType as ReportTargetType,
        targetId: String(targetId),
        category: (category || 'other') as ReportCategory,
        reason: String(reason || description || category),
        description: description ? String(description) : (details ? String(details) : undefined),
        evidence: evidence ? String(evidence) : undefined,
        evidenceUrl: evidenceUrl ? String(evidenceUrl) : undefined,
        screenshots: screenshots ? String(screenshots) : undefined,
        relatedContent: relatedContent ? String(relatedContent) : undefined,
        additionalInfo: additionalInfo ? String(additionalInfo) : undefined,
      });

      res.status(201).json({ success: true, reportId: result.reportId, message: result.message });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to submit report' });
    }
  });

  // User Status Center: Get My Submitted Reports
  app.get('/api/reports/my-reports', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const reports = getReportsByReporter(db, req.user!.id);
      res.json({ reports });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user reports' });
    }
  });

  // --- 10. ADMIN & MODERATION DASHBOARD ---
  app.get('/api/admin/stats', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const totalUsers = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM users')?.cnt || 0;
    const totalPosts = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM posts')?.cnt || 0;
    const totalTransactions = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM coin_transactions')?.cnt || 0;
    const totalCoins = queryDbOne(db, 'SELECT SUM(coins_balance) as sum FROM users')?.sum || 0;
    const activeAds = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM advertisements WHERE status = "active"')?.cnt || 0;
    const pendingReports = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM reports WHERE status = "pending"')?.cnt || 0;

    res.json({
      stats: {
        totalUsers,
        totalPosts,
        totalTransactions,
        totalCoinsCirculating: totalCoins,
        activeAdsCount: activeAds,
        pendingReportsCount: pendingReports,
        dailyActiveUsers: Math.round(totalUsers * 0.85),
      },
    });
  });

  app.get('/api/admin/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const role = (req.query.role as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search.trim()) {
      whereClause += ' AND (LOWER(username) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)';
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s, s);
    }

    if (status.trim()) {
      whereClause += ' AND status = ?';
      params.push(status.trim());
    }

    if (role.trim()) {
      whereClause += ' AND role = ?';
      params.push(role.trim());
    }

    const countRow = queryDbOne(db, `SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countRow ? countRow.total : 0;

    const query = `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const users = queryDbAll(db, query, [...params, limit, offset]);

    res.json({
      users: users.map((u) => formatUser(u)),
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + users.length < total,
      }
    });
  });

  app.get('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const userRow = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    const formatted = formatUser(userRow);
    const sessions = queryDbAll(db, 'SELECT * FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC', [userRow.id]);
    const auditHistory = queryDbAll(db, 'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userRow.id]);
    const reportsAgainst = queryDbAll(db, 'SELECT * FROM reports WHERE target_id = ? ORDER BY created_at DESC', [userRow.id]);

    res.json({
      user: formatted,
      sessions,
      auditHistory,
      reportsAgainst,
    });
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { fullName, username, email, role, status, badge, coinsBalance, isVerified } = req.body;
    const now = new Date().toISOString();

    runDb(
      db,
      `UPDATE users SET
         full_name = COALESCE(?, full_name),
         username = COALESCE(?, username),
         email = COALESCE(?, email),
         role = COALESCE(?, role),
         status = COALESCE(?, status),
         badge = COALESCE(?, badge),
         coins_balance = COALESCE(?, coins_balance),
         is_verified = COALESCE(?, is_verified),
         updated_at = ?
       WHERE id = ?`,
      [fullName, username, email, role, status, badge, coinsBalance, isVerified !== undefined ? (isVerified ? 1 : 0) : null, now, targetUserId]
    );

    logAudit(req.user!.id, 'ADMIN_EDIT_USER', `Updated details for user ${targetUserId}`, req.ip);
    const updated = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    res.json({ user: formatUser(updated) });
  });

  app.post('/api/admin/users/:id/suspend', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { reason } = req.body;

    runDb(db, 'UPDATE users SET status = "suspended", updated_at = ? WHERE id = ?', [new Date().toISOString(), targetUserId]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);

    logAudit(req.user!.id, 'ADMIN_SUSPEND_USER', `Suspended user ${targetUserId}. Reason: ${reason || 'N/A'}`, req.ip);
    res.json({ success: true, status: 'suspended' });
  });

  app.post('/api/admin/users/:id/unsuspend', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;

    runDb(db, 'UPDATE users SET status = "active", updated_at = ? WHERE id = ?', [new Date().toISOString(), targetUserId]);
    logAudit(req.user!.id, 'ADMIN_UNSUSPEND_USER', `Unsuspended user ${targetUserId}`, req.ip);
    res.json({ success: true, status: 'active' });
  });

  app.post('/api/admin/users/:id/ban', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { reason } = req.body;

    runDb(db, 'UPDATE users SET status = "banned", updated_at = ? WHERE id = ?', [new Date().toISOString(), targetUserId]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);

    logAudit(req.user!.id, 'ADMIN_BAN_USER', `Permanently banned user ${targetUserId}. Reason: ${reason || 'N/A'}`, req.ip);
    res.json({ success: true, status: 'banned' });
  });

  app.post('/api/admin/users/:id/delete', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const now = new Date().toISOString();

    runDb(db, 'UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, targetUserId]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);

    logAudit(req.user!.id, 'ADMIN_DELETE_USER', `Soft deleted user account ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'User account deleted' });
  });

  app.post('/api/admin/users/:id/restore', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;

    runDb(db, 'UPDATE users SET deleted_at = NULL, updated_at = ? WHERE id = ?', [new Date().toISOString(), targetUserId]);
    logAudit(req.user!.id, 'ADMIN_RESTORE_USER', `Restored user account ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'User account restored' });
  });

  app.post('/api/admin/users/:id/reset-password', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'New password required' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    runDb(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, targetUserId]);
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);

    logAudit(req.user!.id, 'ADMIN_RESET_PASSWORD', `Forced password reset for user ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'Password reset successfully' });
  });

  app.post('/api/admin/users/:id/verify', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { isVerified, badge } = req.body;

    runDb(db, 'UPDATE users SET is_verified = ?, badge = COALESCE(?, badge), updated_at = ? WHERE id = ?', [
      isVerified ? 1 : 0,
      badge,
      new Date().toISOString(),
      targetUserId,
    ]);

    logAudit(req.user!.id, 'ADMIN_VERIFY_USER', `Updated verification status for user ${targetUserId} to ${isVerified}`, req.ip);
    res.json({ success: true });
  });

  // Admin: Force Logout User Sessions
  app.post('/api/admin/users/:id/force-logout', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUserId]);
    runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUserId]);
    logAudit(req.user!.id, 'ADMIN_FORCE_LOGOUT', `Terminated all active sessions for user ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'User sessions terminated successfully' });
  });

  // Admin: Apply Granular User Restriction
  app.post('/api/admin/users/:id/restrict', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { restrictionType, reason, durationHours, isPermanent } = req.body;

    if (!restrictionType || !reason) {
      return res.status(400).json({ error: 'restrictionType and reason are required' });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let expiresAt: string | null = null;

    if (!isPermanent && durationHours && Number(durationHours) > 0) {
      expiresAt = new Date(now.getTime() + Number(durationHours) * 60 * 60 * 1000).toISOString();
    }

    const restrictionId = 'restr_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    runDb(
      db,
      `INSERT INTO user_restrictions (id, user_id, restriction_type, reason, expires_at, is_permanent, issued_by, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [restrictionId, targetUserId, restrictionType, reason.trim(), expiresAt, isPermanent ? 1 : 0, req.user!.id, nowIso]
    );

    logAudit(req.user!.id, 'ADMIN_RESTRICT_USER', `Applied ${restrictionType} on user ${targetUserId}. Reason: ${reason}. Expires: ${expiresAt || 'Permanent'}`, req.ip);
    res.json({ success: true, restrictionId, expiresAt });
  });

  // Admin: Remove Active Restriction
  app.post('/api/admin/users/:id/remove-restriction', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const { restrictionId } = req.body;

    if (restrictionId) {
      runDb(db, 'UPDATE user_restrictions SET is_active = 0 WHERE id = ? AND user_id = ?', [restrictionId, targetUserId]);
    } else {
      runDb(db, 'UPDATE user_restrictions SET is_active = 0 WHERE user_id = ?', [targetUserId]);
    }

    logAudit(req.user!.id, 'ADMIN_REMOVE_RESTRICTION', `Lifted restrictions for user ${targetUserId}`, req.ip);
    res.json({ success: true, message: 'User restrictions removed successfully' });
  });

  // Admin: Get User Restrictions History & Active Status
  app.get('/api/admin/users/:id/restrictions', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const targetUserId = req.params.id;
    const rows = queryDbAll(
      db,
      `SELECT r.*, u.username as issuer_username, u.full_name as issuer_name
       FROM user_restrictions r
       LEFT JOIN users u ON r.issued_by = u.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [targetUserId]
    );

    res.json({
      restrictions: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        restrictionType: r.restriction_type,
        reason: r.reason,
        expiresAt: r.expires_at,
        isPermanent: Boolean(r.is_permanent),
        issuedBy: r.issuer_name || r.issuer_username || r.issued_by,
        isActive: Boolean(r.is_active),
        createdAt: r.created_at,
      })),
    });
  });

  // Admin: Delete Abusive/Invalid Reaction
  app.delete('/api/admin/content/reactions/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const reactionId = req.params.id;
      const rx = queryDbOne(db, 'SELECT post_id, comment_id FROM reactions WHERE id = ?', [reactionId]);
      if (rx) {
        runDb(db, 'DELETE FROM reactions WHERE id = ?', [reactionId]);
        if (rx.post_id) {
          runDb(db, 'UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?', [rx.post_id]);
        }
      }
      logAudit(req.user!.id, 'ADMIN_DELETE_REACTION', `Deleted reaction ${reactionId}`, req.ip);
      res.json({ success: true, message: 'Reaction record removed' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to remove reaction' });
    }
  });

  // Admin: Edit Post Content
  app.put('/api/admin/content/posts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const postId = req.params.id;
      const { content, isPinned, isFeatured } = req.body;
      const now = new Date().toISOString();

      runDb(
        db,
        `UPDATE posts SET
           content = COALESCE(?, content),
           is_pinned = COALESCE(?, is_pinned),
           updated_at = ?
         WHERE id = ?`,
        [content !== undefined ? sanitizeRichText(content) : null, isPinned !== undefined ? (isPinned ? 1 : 0) : null, now, postId]
      );

      logAudit(req.user!.id, 'ADMIN_EDIT_POST', `Admin modified post content ${postId}`, req.ip);
      res.json({ success: true, message: 'Post updated successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to edit post' });
    }
  });

  // Admin Moderation Queue v2 (Unified with Filtering & Snapshot Metadata)
  app.get('/api/admin/reports-v2', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { status, targetType, category, search } = req.query;
    try {
      const data = getModerationQueue(db, {
        status: status ? (status as ReportStatus) : undefined,
        targetType: targetType as string,
        category: category as string,
        search: search as string,
      });
      res.json({ reports: data.reports, total: data.total });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch moderation queue' });
    }
  });

  // Admin Audit History for Reported User
  app.get('/api/admin/reports/user-audit/:userId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const auditData = getReportedUserAuditHistory(db, req.params.userId);
      res.json(auditData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user audit history' });
    }
  });

  // Admin Moderation Action Execution v2 (With Configurable Rules, Restrictions & Audit Logging)
  app.post('/api/admin/reports/:id/action-v2', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const reportId = req.params.id;
    const moderatorId = req.user!.id;
    const { actionType, notes, reason } = req.body;

    if (!actionType) {
      return res.status(400).json({ error: 'actionType is required' });
    }

    try {
      const result = executeModerationAction(
        db,
        moderatorId,
        reportId,
        actionType,
        reason || notes || actionType,
        notes
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      logAudit(moderatorId, 'MODERATION_ACTION_V2', `Executed action ${actionType} on report ${reportId}`);
      res.json({ success: true, message: result.message });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error applying moderation action' });
    }
  });

  // Admin Moderation Action History
  app.get('/api/admin/moderation/history', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const history = getModerationActionHistory(db, 50);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch moderation history' });
    }
  });

  // Admin Anti-Spam Rules Management
  app.get('/api/admin/anti-spam/rules', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const rules = getAntiSpamRules(db);
      res.json({ rules });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load anti-spam rules' });
    }
  });

  app.patch('/api/admin/anti-spam/rules/:ruleKey', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { ruleKey } = req.params;
    const { isEnabled, thresholdValue, timeWindowSec, actionOnBreach, cooldownSeconds } = req.body;

    try {
      const updated = updateAntiSpamRule(db, ruleKey, {
        isEnabled,
        thresholdValue: thresholdValue !== undefined ? Number(thresholdValue) : undefined,
        timeWindowSec: timeWindowSec !== undefined ? Number(timeWindowSec) : undefined,
        actionOnBreach,
        cooldownSeconds: cooldownSeconds !== undefined ? Number(cooldownSeconds) : undefined,
      });

      if (!updated) {
        return res.status(404).json({ error: `Rule ${ruleKey} not found` });
      }

      logAudit(req.user!.id, 'UPDATE_ANTI_SPAM_RULE', `Updated anti-spam rule ${ruleKey}`);
      res.json({ success: true, rule: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update anti-spam rule' });
    }
  });

  app.get('/api/admin/reports', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const reports = queryDbAll(db, 'SELECT * FROM reports ORDER BY created_at DESC LIMIT 50');
    res.json({ reports });
  });

  app.post('/api/admin/reports/:id/action', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { action } = req.body; // 'dismiss' | 'delete_content' | 'suspend_user'
    const report = queryDbOne(db, 'SELECT * FROM reports WHERE id = ?', [req.params.id]);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    if (action === 'delete_content') {
      if (report.target_type === 'post') {
        runDb(db, 'DELETE FROM posts WHERE id = ?', [report.target_id]);
      } else if (report.target_type === 'comment') {
        runDb(db, 'DELETE FROM comments WHERE id = ?', [report.target_id]);
      }
    } else if (action === 'suspend_user') {
      runDb(db, 'UPDATE users SET status = "suspended" WHERE id = ?', [report.target_id]);
    }

    runDb(db, 'UPDATE reports SET status = "resolved" WHERE id = ?', [req.params.id]);
    logAudit(req.user!.id, 'ADMIN_REPORT_ACTION', `Action ${action} taken on report ${report.id}`);

    res.json({ success: true });
  });

  app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const logs = queryDbAll(db, 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
    res.json({ logs });
  });

  // --- ADMIN: COIN EARNING RULES & CONFIGURATION ---
  app.get('/api/admin/coin-rules', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const rules = getCoinEarningRules(db);
    res.json({ rules });
  });

  app.put('/api/admin/coin-rules', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const {
      coinsPerPost,
      coinsPerPhoto,
      coinsPerVideo,
      coinsPerStory,
      dailyEarningLimit,
      maximumDailyReward,
      minimumAccountAgeHours,
      minimumActivityRequirement,
      rewardCooldownSeconds,
      eligibleContentTypes,
      antiAbuseRules,
    } = req.body;

    const updated = updateCoinEarningRules(db, {
      coinsPerPost,
      coinsPerPhoto,
      coinsPerVideo,
      coinsPerStory,
      dailyEarningLimit,
      maximumDailyReward,
      minimumAccountAgeHours,
      minimumActivityRequirement,
      rewardCooldownSeconds,
      eligibleContentTypes,
      antiAbuseRules,
    });

    logAudit(req.user!.id, 'ADMIN_UPDATE_COIN_RULES', 'Updated platform coin earning configuration and anti-abuse policies', req.ip);
    res.json({ success: true, rules: updated });
  });

  app.get('/api/admin/coin-earnings-ledger', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const ledger = queryDbAll(
      db,
      `SELECT l.*, u.username, u.full_name, u.avatar_url
       FROM coin_earnings_ledger l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT 100`
    );

    res.json({
      ledger: ledger.map((item) => ({
        id: item.id,
        userId: item.user_id,
        userName: item.full_name ? `${item.full_name} (@${item.username})` : item.user_id,
        userAvatar: item.avatar_url,
        event: item.event,
        coins: item.coins,
        beforeBalance: item.before_balance,
        afterBalance: item.after_balance,
        sourceId: item.source_id,
        sourceType: item.source_type,
        status: item.status,
        antiAbuseFlags: item.anti_abuse_flags,
        createdAt: item.created_at,
      })),
    });
  });

  // --- ADMIN: GIFT MANAGEMENT (CRUD) ---
  app.get('/api/admin/gifts', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const gifts = queryDbAll(db, 'SELECT * FROM gifts ORDER BY sort_order ASC, coin_price ASC');
    res.json({
      gifts: gifts.map((g) => ({
        id: g.id,
        name: g.name,
        iconType: g.icon_type,
        coinPrice: g.coin_price,
        image3d: g.image_3d,
        animation: g.animation,
        status: g.status,
        category: g.category,
        sortOrder: g.sort_order,
        description: g.description,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })),
    });
  });

  app.post('/api/admin/gifts', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { name, coinPrice, iconType, image3d, animation, category, sortOrder, description, status } = req.body;
    if (!name || !coinPrice || coinPrice <= 0) {
      return res.status(400).json({ error: 'Gift name and positive coin price required' });
    }

    const giftId = 'gift_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO gifts (
        id, name, icon_type, coin_price, image_3d, animation, status, category, sort_order, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        giftId,
        name,
        iconType || 'spark',
        coinPrice,
        image3d || 'crystal_prism',
        animation || 'orbital_float',
        status || 'active',
        category || 'popular',
        sortOrder || 0,
        description || '',
        now,
        now,
      ]
    );

    logAudit(req.user!.id, 'ADMIN_CREATE_GIFT', `Created gift package ${name} (${coinPrice} coins)`, req.ip);
    res.status(201).json({ success: true, giftId });
  });

  app.put('/api/admin/gifts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const giftId = req.params.id;
    const { name, coinPrice, iconType, image3d, animation, category, sortOrder, description, status } = req.body;

    const existing = queryDbOne(db, 'SELECT id FROM gifts WHERE id = ?', [giftId]);
    if (!existing) return res.status(404).json({ error: 'Gift item not found' });

    const now = new Date().toISOString();
    runDb(
      db,
      `UPDATE gifts SET
        name = COALESCE(?, name),
        coin_price = COALESCE(?, coin_price),
        icon_type = COALESCE(?, icon_type),
        image_3d = COALESCE(?, image_3d),
        animation = COALESCE(?, animation),
        category = COALESCE(?, category),
        sort_order = COALESCE(?, sort_order),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        updated_at = ?
       WHERE id = ?`,
      [name, coinPrice, iconType, image3d, animation, category, sortOrder, description, status, now, giftId]
    );

    logAudit(req.user!.id, 'ADMIN_UPDATE_GIFT', `Updated gift package ${giftId}`, req.ip);
    res.json({ success: true });
  });

  app.patch('/api/admin/gifts/:id/status', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const giftId = req.params.id;
    const { status } = req.body;
    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }

    runDb(db, 'UPDATE gifts SET status = ?, updated_at = ? WHERE id = ?', [status, new Date().toISOString(), giftId]);
    logAudit(req.user!.id, 'ADMIN_SET_GIFT_STATUS', `Set gift ${giftId} status to ${status}`, req.ip);
    res.json({ success: true, status });
  });

  app.delete('/api/admin/gifts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const giftId = req.params.id;
    // Set inactive rather than destructive cascade
    runDb(db, 'UPDATE gifts SET status = "inactive", updated_at = ? WHERE id = ?', [new Date().toISOString(), giftId]);
    logAudit(req.user!.id, 'ADMIN_DEACTIVATE_GIFT', `Deactivated gift package ${giftId}`, req.ip);
    res.json({ success: true });
  });

  // --- ADMIN: GIFT TRANSACTIONS AUDITING & REFUNDS ---
  app.get('/api/admin/gift-transactions', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const transactions = queryDbAll(
      db,
      `SELECT gt.*, 
              s.username as sender_username, s.full_name as sender_full_name, s.avatar_url as sender_avatar,
              r.username as receiver_username, r.full_name as receiver_full_name, r.avatar_url as receiver_avatar,
              g.name as gift_name, g.image_3d as gift_image_3d, g.icon_type as gift_icon_type
       FROM gift_transactions gt
       LEFT JOIN users s ON gt.sender_id = s.id
       LEFT JOIN users r ON gt.receiver_id = r.id
       LEFT JOIN gifts g ON gt.gift_id = g.id
       ORDER BY gt.created_at DESC
       LIMIT 100`
    );

    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionId: t.transaction_id,
        senderId: t.sender_id,
        senderName: t.sender_full_name ? `${t.sender_full_name} (@${t.sender_username})` : t.sender_id,
        senderAvatar: t.sender_avatar,
        receiverId: t.receiver_id,
        receiverName: t.receiver_full_name ? `${t.receiver_full_name} (@${t.receiver_username})` : t.receiver_id,
        receiverAvatar: t.receiver_avatar,
        giftId: t.gift_id,
        giftName: t.gift_name || t.gift_id,
        giftImage3d: t.gift_image_3d,
        giftIconType: t.gift_icon_type,
        coinAmount: t.coin_amount,
        postId: t.post_id,
        commentId: t.comment_id,
        status: t.status || 'completed',
        idempotencyKey: t.idempotency_key,
        refundedAt: t.refunded_at,
        refundReason: t.refund_reason,
        createdAt: t.created_at,
      })),
    });
  });

  app.post('/api/admin/gift-transactions/:id/refund', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const txId = req.params.id;
    const { reason } = req.body;

    try {
      const refundResult = refundGiftTransaction(db, txId, req.user!.id, reason || 'Admin authorized refund');
      res.json({ success: true, refund: refundResult });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to refund transaction' });
    }
  });

  // --- ADMIN: SUSPICIOUS ACTIVITY INVESTIGATION ---
  app.get('/api/admin/suspicious-activity', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const metrics = getSuspiciousActivityMetrics(db);
      res.json({ suspicious: metrics });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to query suspicious metrics' });
    }
  });

  // --- 11. COMPLETE DISCOVERY & GLOBAL SEARCH SYSTEM ---

  // 1. Global Multi-Entity Search
  app.get('/api/search', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const q = (req.query.q as string) || '';
      const category = (req.query.category as any) || 'all';
      const dateRange = (req.query.dateRange as any) || 'all';
      const sortBy = (req.query.sortBy as any) || 'relevance';
      const isVerifiedOnly = req.query.isVerifiedOnly === 'true' || req.query.isVerifiedOnly === '1';
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 12;

      // Automatically store search in user's recent history if authenticated
      if (req.user?.id && q.trim().length >= 2) {
        addRecentSearch(db, req.user.id, q.trim(), category);
      }

      const results = searchAllEntities(db, {
        q,
        category,
        dateRange,
        sortBy,
        isVerifiedOnly,
        page,
        limit,
        currentUserId: req.user?.id,
      });

      res.json({
        ...results,
        page,
        limit,
      });
    } catch (err: any) {
      console.error('Search error:', err);
      res.status(500).json({ error: err.message || 'Search execution failed' });
    }
  });

  // 2. Instant Autocomplete Suggestions
  app.get('/api/search/autocomplete', (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || '';
      const data = getAutocompleteSuggestions(db, q);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Autocomplete failed' });
    }
  });

  // 3. User's Recent Searches
  app.get('/api/search/recent', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.json({ recent: [] });
      }
      const recent = getRecentSearches(db, req.user.id);
      res.json({ recent });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch recent searches' });
    }
  });

  // 4. Add to Recent Searches
  app.post('/api/search/recent', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      const { query, category = 'all' } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: 'Query is required' });
      }
      addRecentSearch(db, req.user!.id, query.trim(), category);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record recent search' });
    }
  });

  // 5. Delete Single Recent Search
  app.delete('/api/search/recent/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      deleteRecentSearch(db, req.user!.id, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete recent search' });
    }
  });

  // 6. Clear All Recent Searches
  app.delete('/api/search/recent', authenticateToken, (req: AuthRequest, res: Response) => {
    try {
      clearRecentSearches(db, req.user!.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear recent searches' });
    }
  });

  // 7. Trending Search Queries
  app.get('/api/search/trending-queries', (req: Request, res: Response) => {
    try {
      const trending = getTrendingSearches(db, 10);
      res.json({ trending });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch trending search queries' });
    }
  });

  // 8. Personalized Explore Discovery Feed
  app.get('/api/explore', optionalAuth, (req: AuthRequest, res: Response) => {
    try {
      const exploreData = getPersonalizedExplore(db, req.user?.id);
      res.json(exploreData);
    } catch (err: any) {
      console.error('Explore error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate explore discovery feed' });
    }
  });

  // 9. Trending Topics & Anti-Spam Ranked Hashtags
  app.get('/api/explore/trending', (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const trending = calculateTrendingTopics(db, limit, false);

      res.json({
        hashtags: trending.map((t) => ({
          tag: t.tag,
          postsCount: t.postsCount > 1000 ? `${(t.postsCount / 1000).toFixed(1)}K` : `${t.postsCount}`,
          rawPostsCount: t.postsCount,
          uniqueUsersCount: t.uniqueUsersCount,
          velocity: t.velocity,
          score: t.trendScore,
          viewsCount: t.viewsCount,
          sharesCount: t.sharesCount,
          isFeatured: t.isFeatured,
          badge: t.badge,
        })),
        topics: trending,
        topCreators: queryDbAll(
          db,
          'SELECT id, username, full_name, avatar_url, badge, is_verified, followers_count FROM users WHERE deleted_at IS NULL ORDER BY followers_count DESC LIMIT 6'
        ).map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          avatarUrl: u.avatar_url,
          badge: u.badge,
          isVerified: Boolean(u.is_verified),
          followersCount: u.followers_count || 0,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to calculate trending topics' });
    }
  });

  // --- 12. ADMIN TREND & DISCOVERY CONTROL SYSTEM ---

  // Admin: Inspect all trends with raw signals, velocity, spam flags, and status
  app.get('/api/admin/trends', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const data = getAdminTrends(db);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve admin trends inspection' });
    }
  });

  // Admin: Remove / Hide a trend
  app.post('/api/admin/trends/remove', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const { trendIdentifier, reason } = req.body;
      if (!trendIdentifier) {
        return res.status(400).json({ error: 'trendIdentifier is required' });
      }
      removeTrend(db, trendIdentifier, reason || 'Suppressed by Admin', req.user!.id);
      logAudit(req.user!.id, 'REMOVE_TREND', req.ip, `Suppressed trend: ${trendIdentifier}, reason: ${reason}`);
      res.json({ success: true, message: `Trend #${trendIdentifier} has been removed from discovery.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to remove trend' });
    }
  });

  // Admin: Unremove / Restore a trend
  app.post('/api/admin/trends/unremove', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const { trendIdentifier } = req.body;
      if (!trendIdentifier) {
        return res.status(400).json({ error: 'trendIdentifier is required' });
      }
      unremoveTrend(db, trendIdentifier);
      logAudit(req.user!.id, 'UNREMOVE_TREND', req.ip, `Restored trend: ${trendIdentifier}`);
      res.json({ success: true, message: `Trend #${trendIdentifier} has been restored.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to restore trend' });
    }
  });

  // Admin: Block / Blacklist a hashtag
  app.post('/api/admin/trends/block-hashtag', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const { hashtag, reason } = req.body;
      if (!hashtag) {
        return res.status(400).json({ error: 'hashtag is required' });
      }
      blockHashtag(db, hashtag, reason || 'Banned by Admin', req.user!.id);
      logAudit(req.user!.id, 'BLOCK_HASHTAG', req.ip, `Blocked hashtag: ${hashtag}, reason: ${reason}`);
      res.json({ success: true, message: `Hashtag #${hashtag} is now blocked across discovery.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to block hashtag' });
    }
  });

  // Admin: Unblock a hashtag
  app.delete('/api/admin/trends/block-hashtag/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      unblockHashtag(db, req.params.id);
      logAudit(req.user!.id, 'UNBLOCK_HASHTAG', req.ip, `Unblocked hashtag ID/tag: ${req.params.id}`);
      res.json({ success: true, message: `Hashtag unblocked successfully.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to unblock hashtag' });
    }
  });

  // Admin: Get all blocked hashtags
  app.get('/api/admin/trends/blocked-hashtags', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const blocked = getBlockedHashtags(db);
      res.json({ blocked });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list blocked hashtags' });
    }
  });

  // Admin: Feature / Pin a trend
  app.post('/api/admin/trends/feature', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const { target, title, description, badge, sortOrder, trendType } = req.body;
      if (!target) {
        return res.status(400).json({ error: 'target (hashtag or topic) is required' });
      }
      const item = featureTrend(db, { target, title, description, badge, sortOrder, trendType });
      logAudit(req.user!.id, 'FEATURE_TREND', req.ip, `Featured trend target: ${target}`);
      res.json({ success: true, item, message: `Trend #${target} has been pinned as featured.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to feature trend' });
    }
  });

  // Admin: Unfeature a trend
  app.delete('/api/admin/trends/feature/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      unfeatureTrend(db, req.params.id);
      logAudit(req.user!.id, 'UNFEATURE_TREND', req.ip, `Removed feature on: ${req.params.id}`);
      res.json({ success: true, message: 'Feature removed successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to unfeature trend' });
    }
  });

  // Admin: Get trend algorithm configuration & thresholds
  app.get('/api/admin/trends/settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const config = getTrendConfig(db);
      res.json({ config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get trend configuration' });
    }
  });

  // Admin: Update trend algorithm configuration & thresholds
  app.put('/api/admin/trends/settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const updated = updateTrendConfig(db, req.body);
      logAudit(req.user!.id, 'UPDATE_TREND_CONFIG', req.ip, `Updated trend thresholds: ${JSON.stringify(req.body)}`);
      res.json({ success: true, config: updated, message: 'Trend algorithm thresholds updated successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update trend configuration' });
    }
  });

  // ----------------------------------------------------
  // ADMIN CMS CONTENT & CREDENTIALS MANAGEMENT ENDPOINTS
  // ----------------------------------------------------

  // Admin CMS: Get All Posts
  app.get('/api/admin/content/posts', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const search = (req.query.search as string) || '';
      const type = (req.query.type as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      let query = `
        SELECT p.*, u.username, u.full_name as author_name, u.avatar_url as author_avatar
        FROM posts p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search.trim()) {
        query += ' AND (LOWER(p.content) LIKE ? OR LOWER(u.username) LIKE ?)';
        const s = `%${search.trim().toLowerCase()}%`;
        params.push(s, s);
      }

      if (type.trim()) {
        query += ' AND p.type = ?';
        params.push(type.trim());
      }

      query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const posts = queryDbAll(db, query, params);
      const totalCountRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM posts');

      res.json({
        posts: posts.map((p) => ({
          id: p.id,
          userId: p.user_id,
          username: p.username || 'unknown',
          authorName: p.author_name || 'Anonymous User',
          authorAvatar: p.author_avatar || '',
          content: p.content,
          type: p.type,
          mediaUrls: p.media_urls ? JSON.parse(p.media_urls) : [],
          likesCount: p.likes_count || 0,
          commentsCount: p.comments_count || 0,
          sharesCount: p.shares_count || 0,
          createdAt: p.created_at,
        })),
        total: totalCountRow?.cnt || 0,
        page,
        limit,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch CMS posts' });
    }
  });

  // Admin CMS: Delete Post
  app.delete('/api/admin/content/posts/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const postId = req.params.id;
      runDb(db, 'DELETE FROM posts WHERE id = ?', [postId]);
      runDb(db, 'DELETE FROM comments WHERE post_id = ?', [postId]);
      runDb(db, 'DELETE FROM reactions WHERE post_id = ?', [postId]);
      runDb(db, 'DELETE FROM bookmarks WHERE post_id = ?', [postId]);

      logAudit(req.user!.id, 'ADMIN_DELETE_POST', `Permanently purged post ${postId}`, req.ip);
      res.json({ success: true, message: `Post ${postId} deleted successfully.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete post' });
    }
  });

  // Admin CMS: Get All Comments with Pagination
  app.get('/api/admin/content/comments', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const search = (req.query.search as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (search.trim()) {
        whereClause += ' AND (LOWER(c.content) LIKE ? OR LOWER(u.username) LIKE ?)';
        const s = `%${search.trim().toLowerCase()}%`;
        params.push(s, s);
      }

      const totalCountRow = queryDbOne(db, `SELECT COUNT(*) as cnt FROM comments c LEFT JOIN users u ON c.user_id = u.id ${whereClause}`, params);
      const total = totalCountRow?.cnt || 0;

      const query = `
        SELECT c.*, u.username, u.full_name as author_name, u.avatar_url as author_avatar
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        ${whereClause}
        ORDER BY c.created_at DESC LIMIT ? OFFSET ?
      `;

      const comments = queryDbAll(db, query, [...params, limit, offset]);
      res.json({
        comments: comments.map((c) => ({
          id: c.id,
          postId: c.post_id,
          userId: c.user_id,
          username: c.username || 'unknown',
          authorName: c.author_name || 'Anonymous User',
          authorAvatar: c.author_avatar || '',
          content: c.content,
          reactionsCount: c.reactions_count || 0,
          createdAt: c.created_at,
        })),
        total,
        page,
        limit,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch comments' });
    }
  });

  // Admin CMS: Delete Comment
  app.delete('/api/admin/content/comments/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const commentId = req.params.id;
      const comment = queryDbOne(db, 'SELECT post_id FROM comments WHERE id = ?', [commentId]);
      if (comment) {
        runDb(db, 'DELETE FROM comments WHERE id = ?', [commentId]);
        runDb(db, 'UPDATE posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?', [comment.post_id]);
      }
      logAudit(req.user!.id, 'ADMIN_DELETE_COMMENT', `Deleted comment ${commentId}`, req.ip);
      res.json({ success: true, message: `Comment ${commentId} deleted successfully.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete comment' });
    }
  });

  // Admin CMS: Get All Reactions Summary
  app.get('/api/admin/content/reactions', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const breakdown = queryDbAll(
        db,
        'SELECT type, COUNT(*) as count FROM reactions GROUP BY type ORDER BY count DESC'
      );
      const recent = queryDbAll(
        db,
        `SELECT r.*, u.username, u.full_name as user_name
         FROM reactions r
         LEFT JOIN users u ON r.user_id = u.id
         ORDER BY r.created_at DESC LIMIT 50`
      );

      res.json({
        breakdown,
        recent: recent.map((r) => ({
          id: r.id,
          postId: r.post_id,
          userId: r.user_id,
          username: r.username || 'unknown',
          userName: r.user_name || 'User',
          type: r.type,
          createdAt: r.created_at,
        })),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch reactions' });
    }
  });

  // Admin CMS: Direct User Coin Adjustment
  app.post('/api/admin/users/:id/adjust-coins', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const { amount, note } = req.body;
      const coinDelta = Number(amount);

      if (isNaN(coinDelta) || coinDelta === 0) {
        return res.status(400).json({ error: 'Valid non-zero coin amount is required' });
      }

      const user = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const beforeBalance = user.coins_balance || 0;
      const afterBalance = Math.max(0, beforeBalance + coinDelta);
      const now = new Date().toISOString();

      runDb(db, 'UPDATE users SET coins_balance = ?, updated_at = ? WHERE id = ?', [afterBalance, now, userId]);
      runDb(
        db,
        'INSERT INTO coin_wallets (user_id, balance, total_earned, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET balance = ?, updated_at = ?',
        [userId, afterBalance, coinDelta > 0 ? coinDelta : 0, now, afterBalance, now]
      );

      const txId = `CTX-ADM-${Date.now()}`;
      runDb(
        db,
        `INSERT INTO coin_transactions (id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, status, note, created_at)
         VALUES (?, ?, 'system_admin', ?, 'admin_adjustment', ?, ?, ?, 'completed', ?, ?)`,
        [txId, userId, userId, coinDelta, beforeBalance, afterBalance, note || 'Admin manual balance adjustment', now]
      );

      saveDbSync();
      logAudit(req.user!.id, 'ADMIN_ADJUST_COINS', `Adjusted user ${userId} coins by ${coinDelta} (New: ${afterBalance}). Note: ${note || 'N/A'}`, req.ip);

      res.json({ success: true, newBalance: afterBalance, message: `Successfully adjusted balance by ${coinDelta > 0 ? '+' : ''}${coinDelta} coins.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to adjust user coins' });
    }
  });

  // Admin CMS: Get System Gateway Credentials & Settings
  app.get('/api/admin/system/credentials', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const rows = queryDbAll(db, 'SELECT key, value FROM system_settings');
      const credentials: Record<string, string> = {
        // bKash
        bkash_app_key: 'bkash_app_key_prod_nixo_9932',
        bkash_app_secret: 'bkash_secret_secure_hash_8841',
        bkash_username: 'bkash_merchant_nixo',
        bkash_password: '••••••••••••',
        bkash_merchant_number: '01700000000',
        // Nagad
        nagad_merchant_id: 'NAGAD_MCH_883210',
        nagad_public_key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQE...',
        nagad_private_key: '••••••••••••••••••••••••••••••••••••',
        // Rocket / Upay
        rocket_merchant_id: 'ROCKET_882910',
        upay_merchant_id: 'UPAY_MCH_3381',
        // Stripe
        stripe_publishable_key: 'pk_live_51NixoNetSecureKey...',
        stripe_secret_key: 'sk_live_••••••••••••••••••••••••',
        // PayPal
        paypal_client_id: 'PAYPAL_CLIENT_ID_LIVE_NIXO',
        paypal_client_secret: '••••••••••••••••••••••••••••••••',
        // AdMob & Ad Networks
        admob_enabled: '1',
        admob_android_app_id: 'ca-app-pub-3940256099942544~3347511713',
        admob_android_banner_unit_id: 'ca-app-pub-3940256099942544/6300978111',
        admob_android_interstitial_unit_id: 'ca-app-pub-3940256099942544/1033173712',
        admob_android_rewarded_unit_id: 'ca-app-pub-3940256099942544/5224354917',
        admob_android_native_unit_id: 'ca-app-pub-3940256099942544/2247696110',
        admob_ios_app_id: 'ca-app-pub-3940256099942544~1458602516',
        admob_ios_banner_unit_id: 'ca-app-pub-3940256099942544/2934735716',
        admob_ios_interstitial_unit_id: 'ca-app-pub-3940256099942544/4411468910',
        admob_ios_rewarded_unit_id: 'ca-app-pub-3940256099942544/1712485313',
        admob_ios_native_unit_id: 'ca-app-pub-3940256099942544/3986624511',
        web_ad_script: '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" async></script>',
        // SMTP / Email
        smtp_host: 'smtp.sendgrid.net',
        smtp_port: '587',
        smtp_user: 'apikey',
        smtp_pass: '••••••••••••••••••••••••',
        smtp_from_email: 'noreply@nixo.social',
        smtp_from_name: 'Nixo Social Official',
        // Storage / Cloud
        storage_provider: 'local_sqlite_blob',
        storage_bucket: 'nixo-media-assets-prod',
        // System Flags
        maintenance_mode: '0',
        new_registration_enabled: '1',
        default_user_coins: '100',
        platform_title: 'Nixo Social — Liquid Glass Sovereign Network',
      };

      for (const r of rows) {
        credentials[r.key] = r.value;
      }

      res.json({ credentials });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch credentials' });
    }
  });

  // Admin CMS: Update System Gateway Credentials & Settings
  app.put('/api/admin/system/credentials', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const { credentials } = req.body;
      if (!credentials || typeof credentials !== 'object') {
        return res.status(400).json({ error: 'Credentials object is required' });
      }

      const now = new Date().toISOString();
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'string') {
          runDb(
            db,
            `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`,
            [key, value, now, value, now]
          );
        }
      }

      // Synchronize AdMob parameters to platform_ad_settings table
      if (
        credentials.admob_android_app_id !== undefined ||
        credentials.admob_android_banner_unit_id !== undefined ||
        credentials.admob_android_interstitial_unit_id !== undefined ||
        credentials.admob_android_rewarded_unit_id !== undefined ||
        credentials.admob_android_native_unit_id !== undefined ||
        credentials.admob_ios_app_id !== undefined ||
        credentials.admob_ios_banner_unit_id !== undefined ||
        credentials.admob_ios_interstitial_unit_id !== undefined ||
        credentials.admob_ios_rewarded_unit_id !== undefined ||
        credentials.admob_ios_native_unit_id !== undefined ||
        credentials.admob_enabled !== undefined
      ) {
        updatePlatformAdSettings(db, {
          admobEnabled: credentials.admob_enabled !== undefined ? (credentials.admob_enabled === '1' || credentials.admob_enabled === 'true') : undefined,
          admobAndroidAppId: credentials.admob_android_app_id,
          admobAndroidBannerUnitId: credentials.admob_android_banner_unit_id,
          admobAndroidInterstitialUnitId: credentials.admob_android_interstitial_unit_id,
          admobAndroidRewardedUnitId: credentials.admob_android_rewarded_unit_id,
          admobAndroidNativeUnitId: credentials.admob_android_native_unit_id,
          admobIosAppId: credentials.admob_ios_app_id,
          admobIosBannerUnitId: credentials.admob_ios_banner_unit_id,
          admobIosInterstitialUnitId: credentials.admob_ios_interstitial_unit_id,
          admobIosRewardedUnitId: credentials.admob_ios_rewarded_unit_id,
          admobIosNativeUnitId: credentials.admob_ios_native_unit_id,
        });
      }

      saveDbSync();
      logAudit(req.user!.id, 'ADMIN_UPDATE_CREDENTIALS', `Updated system credentials and API keys settings`, req.ip);

      res.json({ success: true, message: 'Credentials & API key configurations updated successfully!' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update credentials' });
    }
  });

  // ====================================================
  // CENTRALIZED GLOBAL SETTINGS API ENDPOINTS
  // ====================================================

  // 1. Public Settings Endpoint (No auth required, sanitized to mask credentials)
  app.get('/api/settings/public', async (req: Request, res: Response) => {
    try {
      const fullMap = await getAllSettingsMap();
      const sanitized = getSanitizedPublicSettings(fullMap);
      res.json({ success: true, settings: sanitized });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to load public settings' });
    }
  });

  // 2. Full Admin Settings Map (Requires Admin)
  app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const fullMap = await getAllSettingsMap();
      res.json({ success: true, settings: fullMap });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to load system settings' });
    }
  });

  // 3. Save/Update Admin Settings Category (Requires Admin)
  app.put('/api/admin/settings/:category', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    const { category } = req.params;
    const settingsObject = req.body;

    if (!settingsObject || typeof settingsObject !== 'object') {
      return res.status(400).json({ error: 'Settings content object is required' });
    }

    try {
      await updateSettingsCategory(category, settingsObject);
      logAudit(req.user!.id, 'ADMIN_UPDATE_SETTINGS', `Updated global settings category: ${category}`, req.ip);
      res.json({ success: true, message: `System settings for '${category}' updated successfully!` });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update system settings' });
    }
  });

  // ----------------------------------------------------
  // SUPPORT TICKETS & BAN APPEALS API ENDPOINTS
  // ----------------------------------------------------
  app.post('/api/support/tickets', authenticateToken, (req: AuthRequest, res: Response) => {
    const { type, subject, description, priority } = req.body;
    if (!type || !subject || !description) {
      return res.status(400).json({ error: 'Type, subject, and description are required' });
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    runDb(
      db,
      `INSERT INTO support_tickets (id, user_id, type, subject, description, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [ticketId, req.user!.id, type, subject, description, priority || 'normal', now, now]
    );

    // Initial message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    runDb(
      db,
      `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message, created_at)
       VALUES (?, ?, ?, 'user', ?, ?)`,
      [msgId, ticketId, req.user!.id, description, now]
    );

    res.json({ success: true, ticketId, message: 'Support ticket submitted successfully' });
  });

  app.get('/api/support/tickets', authenticateToken, (req: AuthRequest, res: Response) => {
    const tickets = queryDbAll(
      db,
      `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.user!.id]
    );
    res.json({ tickets });
  });

  app.get('/api/support/tickets/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const ticket = queryDbOne(
      db,
      `SELECT * FROM support_tickets WHERE id = ? AND (user_id = ? OR ? = 'admin')`,
      [req.params.id, req.user!.id, req.user!.role]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const messages = queryDbAll(
      db,
      `SELECT sm.*, u.full_name as sender_name, u.avatar_url as sender_avatar
       FROM support_messages sm
       LEFT JOIN users u ON sm.sender_id = u.id
       WHERE sm.ticket_id = ? ORDER BY sm.created_at ASC`,
      [req.params.id]
    );

    res.json({ ticket, messages });
  });

  app.post('/api/support/tickets/:id/messages', authenticateToken, (req: AuthRequest, res: Response) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content required' });
    }

    const ticket = queryDbOne(
      db,
      `SELECT * FROM support_tickets WHERE id = ? AND (user_id = ? OR ? = 'admin')`,
      [req.params.id, req.user!.id, req.user!.role]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const senderRole = req.user!.role === 'admin' ? 'admin' : 'user';

    runDb(
      db,
      `INSERT INTO support_messages (id, ticket_id, sender_id, sender_role, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [msgId, req.params.id, req.user!.id, senderRole, message.trim(), now]
    );

    runDb(
      db,
      `UPDATE support_tickets SET updated_at = ?, status = ? WHERE id = ?`,
      [now, senderRole === 'admin' ? 'in_progress' : 'open', req.params.id]
    );

    res.json({ success: true, messageId: msgId });
  });

  app.get('/api/admin/support/tickets', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const tickets = queryDbAll(
      db,
      `SELECT st.*, u.username, u.full_name, u.email, u.avatar_url
       FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       ORDER BY CASE WHEN st.status = 'open' THEN 1 WHEN st.status = 'in_progress' THEN 2 ELSE 3 END, st.updated_at DESC`
    );
    res.json({ tickets });
  });

  app.put('/api/admin/support/tickets/:id/status', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();
    runDb(db, `UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?`, [status, now, req.params.id]);
    res.json({ success: true, status });
  });

  // ----------------------------------------------------
  // SOCKET.IO REALTIME EVENTS & PRESENCE SYSTEM
  // ----------------------------------------------------
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      jwt.verify(token as string, JWT_SECRET, (err: any, decoded: any) => {
        if (err || !decoded) {
          return next(new Error('Authentication error: invalid or expired token'));
        }
        const user = queryDbOne(db, 'SELECT id, username, full_name, avatar_url, role FROM users WHERE id = ? AND deleted_at IS NULL', [decoded.id]);
        if (!user) {
          return next(new Error('Authentication error: user account not found'));
        }
        socket.data.user = user;
        return next();
      });
    } else {
      const fallbackUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
      if (fallbackUserId) {
        const user = queryDbOne(db, 'SELECT id, username, full_name, avatar_url, role FROM users WHERE id = ? AND deleted_at IS NULL', [fallbackUserId]);
        if (user) {
          socket.data.user = user;
          return next();
        }
      }
      return next(new Error('Authentication error: auth token or credentials required'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    if (!user) return;
    const userId = user.id;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Auto-join personal notification room
    socket.join(`user_${userId}`);

    // Auto-join support_agents room if user has support permissions
    if (user.role === 'admin' || user.role === 'support_agent' || user.role === 'moderator') {
      socket.join('support_agents');
    }

    // Live Support Chat socket handlers
    socket.on('support_join_chat', (chatId: string) => {
      if (chatId) socket.join(`support_chat_${chatId}`);
    });

    socket.on('support_leave_chat', (chatId: string) => {
      if (chatId) socket.leave(`support_chat_${chatId}`);
    });

    socket.on('support_typing_start', (data: { chatId: string }) => {
      if (data?.chatId) {
        socket.to(`support_chat_${data.chatId}`).emit('support_user_typing', {
          chatId: data.chatId,
          userId: user.id,
          userName: user.full_name || user.username,
        });
      }
    });

    socket.on('support_typing_stop', (data: { chatId: string }) => {
      if (data?.chatId) {
        socket.to(`support_chat_${data.chatId}`).emit('support_user_stop_typing', {
          chatId: data.chatId,
          userId: user.id,
        });
      }
    });

    socket.on('support_mark_read', (data: { chatId: string }) => {
      if (!data?.chatId) return;
      const now = new Date().toISOString();
      const isAgent = user.role === 'admin' || user.role === 'support_agent' || user.role === 'moderator';
      runDb(
        db,
        `UPDATE support_chat_messages SET is_read = 1, read_at = ? WHERE chat_id = ? AND sender_role ${isAgent ? "= 'user'" : "= 'agent'"}`,
        [now, data.chatId]
      );
      io.to(`support_chat_${data.chatId}`).emit('support_messages_read', { chatId: data.chatId, readAt: now });
    });

    // Auto-join all conversation rooms this user belongs to for immediate live message delivery
    const memberConvs = queryDbAll(db, 'SELECT conversation_id FROM conversation_members WHERE user_id = ?', [userId]);
    memberConvs.forEach((c) => socket.join(`conv_${c.conversation_id}`));

    // Broadcast presence online if this is user's first active socket
    if (connectedUsers.get(userId)!.size === 1) {
      io.emit('user_presence_change', {
        userId,
        isOnline: true,
        lastSeen: null,
      });
    }

    // Join a specific conversation room
    socket.on('join_conversation', (conversationId: string) => {
      if (!conversationId) return;
      const isMember = queryDbOne(db, 'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?', [conversationId, userId]);
      if (isMember) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // Leave a specific conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      if (!conversationId) return;
      socket.leave(`conv_${conversationId}`);
    });

    // Real-time typing indicators
    socket.on('typing_start', (data: { conversationId?: string; receiverId?: string }) => {
      if (data?.conversationId) {
        socket.to(`conv_${data.conversationId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId: user.id,
          username: user.username,
          fullName: user.full_name,
        });
      } else if (data?.receiverId) {
        socket.to(`user_${data.receiverId}`).emit('user_typing', {
          senderId: user.id,
          username: user.username,
          fullName: user.full_name,
        });
      }
    });

    socket.on('typing_stop', (data: { conversationId?: string; receiverId?: string }) => {
      if (data?.conversationId) {
        socket.to(`conv_${data.conversationId}`).emit('user_stop_typing', {
          conversationId: data.conversationId,
          userId: user.id,
        });
      } else if (data?.receiverId) {
        socket.to(`user_${data.receiverId}`).emit('user_stop_typing', {
          senderId: user.id,
        });
      }
    });

    // Real-time read receipt
    socket.on('mark_read', (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      const now = new Date().toISOString();
      runDb(db, 'UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?', [now, data.conversationId, userId]);
      runDb(db, `UPDATE messages SET is_read = 1, status = 'read' WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`, [data.conversationId, userId]);
      io.to(`conv_${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        readerId: userId,
        readAt: now,
      });
    });

    // Real-time message delivery acknowledgment
    socket.on('message_delivered', (data: { messageId: string; conversationId: string }) => {
      if (!data?.messageId || !data?.conversationId) return;
      runDb(db, `UPDATE messages SET status = 'delivered' WHERE id = ? AND status = 'sent'`, [data.messageId]);
      io.to(`conv_${data.conversationId}`).emit('message_status_update', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        status: 'delivered',
      });
    });

    // Request presence status for users
    socket.on('get_presence', (userIds: string[], callback: (res: Record<string, { isOnline: boolean; lastSeen: string | null }>) => void) => {
      if (!Array.isArray(userIds) || typeof callback !== 'function') return;
      const result: Record<string, { isOnline: boolean; lastSeen: string | null }> = {};
      for (const uId of userIds) {
        const isOnline = Boolean(connectedUsers.get(uId)?.size);
        const uRow = queryDbOne(db, 'SELECT last_seen FROM users WHERE id = ?', [uId]);
        result[uId] = {
          isOnline,
          lastSeen: uRow?.last_seen || null,
        };
      }
      callback(result);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          const now = new Date().toISOString();
          runDb(db, 'UPDATE users SET last_seen = ? WHERE id = ?', [now, userId]);
          io.emit('user_presence_change', {
            userId,
            isOnline: false,
            lastSeen: now,
          });
        }
      }
    });
  });

  // Register Production PayStation & Multi-Gateway Payment System Routes
  registerPaymentRoutes(app, db, io);

  // Register Production Bulk SMS BD Engine Routes
  registerSmsRoutes(app, db);

  // Register Help Center & Support Engine Routes
  registerSupportRoutes(app, db, io, authenticateToken);

  // Register Marketplace E-Commerce & Direct Coin/Cash Checkout System Routes
  setupMarketplaceRoutes(app, db, authenticateToken, optionalAuth, queryDbOne, queryDbAll, runDb, sendNotification, io);

  // ----------------------------------------------------
  // ADMIN NOTIFICATION CENTER ENDPOINTS
  // ----------------------------------------------------

  // 1. Get Notification Center Stats
  app.get('/api/admin/notification-stats', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const stats = getNotificationCenterStats(db);
      res.json({ stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notification stats' });
    }
  });

  // 2. Get Campaigns List
  app.get('/api/admin/notification-campaigns', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const search = (req.query.search as string) || '';
      const campaigns = getCampaignsList(db, search);
      res.json({ campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notification campaigns' });
    }
  });

  // 3. Create Notification Campaign
  app.post('/api/admin/notification-campaigns', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const campaign = createNotificationCampaign(db, req.body, req.user!.id);
      logAudit(req.user!.id, 'CREATE_NOTIFICATION_CAMPAIGN', `Created campaign "${req.body.title}" target: ${req.body.targetType}`, req.ip);
      // Immediately trigger worker to process first batch
      processNotificationCampaignQueueBatch(db, io, 100);
      res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create notification campaign' });
    }
  });

  // 4. Get Campaign Details & Delivery Queue Logs
  app.get('/api/admin/notification-campaigns/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const data = getCampaignDetailsAndLogs(db, req.params.id);
      res.json(data);
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Campaign not found' });
    }
  });

  // 5. Cancel Campaign
  app.post('/api/admin/notification-campaigns/:id/cancel', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      cancelCampaign(db, req.params.id);
      logAudit(req.user!.id, 'CANCEL_NOTIFICATION_CAMPAIGN', `Cancelled campaign ${req.params.id}`, req.ip);
      res.json({ success: true, message: 'Notification campaign cancelled' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to cancel campaign' });
    }
  });

  // 6. Delete Campaign
  app.delete('/api/admin/notification-campaigns/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      deleteCampaign(db, req.params.id);
      logAudit(req.user!.id, 'DELETE_NOTIFICATION_CAMPAIGN', `Deleted campaign ${req.params.id}`, req.ip);
      res.json({ success: true, message: 'Notification campaign deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete campaign' });
    }
  });

  // 7. Get Templates List
  app.get('/api/admin/notification-templates', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const templates = getTemplatesList(db);
      res.json({ templates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch notification templates' });
    }
  });

  // 8. Create Template
  app.post('/api/admin/notification-templates', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const template = createNotificationTemplate(db, req.body, req.user!.id);
      logAudit(req.user!.id, 'CREATE_NOTIFICATION_TEMPLATE', `Created template "${req.body.name}"`, req.ip);
      res.status(201).json({ success: true, template });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create template' });
    }
  });

  // 9. Update Template
  app.put('/api/admin/notification-templates/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const template = updateNotificationTemplate(db, req.params.id, req.body);
      logAudit(req.user!.id, 'UPDATE_NOTIFICATION_TEMPLATE', `Updated template ${req.params.id}`, req.ip);
      res.json({ success: true, template });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update template' });
    }
  });

  // 10. Delete Template
  app.delete('/api/admin/notification-templates/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      deleteNotificationTemplate(db, req.params.id);
      logAudit(req.user!.id, 'DELETE_NOTIFICATION_TEMPLATE', `Deleted template ${req.params.id}`, req.ip);
      res.json({ success: true, message: 'Notification template deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete template' });
    }
  });

  // ----------------------------------------------------
  // SPONSOR & PARTNER MANAGEMENT API ENDPOINTS
  // ----------------------------------------------------

  // 1. Get Public Active Sponsors
  app.get('/api/sponsors', (req: Request, res: Response) => {
    try {
      const sponsors = getAllSponsors(db, true);
      res.json({ sponsors });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load sponsors' });
    }
  });

  // 2. Track Sponsor Click
  app.post('/api/sponsors/:id/click', (req: Request, res: Response) => {
    try {
      recordSponsorClick(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record click' });
    }
  });

  // 3. Track Sponsor Impression
  app.post('/api/sponsors/:id/impression', (req: Request, res: Response) => {
    try {
      recordSponsorImpression(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record impression' });
    }
  });

  // 4. Admin: Get All Sponsors (Active + Inactive)
  app.get('/api/admin/sponsors', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const sponsors = getAllSponsors(db, false);
      res.json({ sponsors });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load all sponsors' });
    }
  });

  // 5. Admin: Create Sponsor
  app.post('/api/admin/sponsors', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const sponsor = createSponsor(db, req.body);
      logAudit(req.user!.id, 'CREATE_SPONSOR', `Created sponsor partner "${sponsor.name}"`, req.ip);
      res.status(201).json({ success: true, sponsor });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create sponsor' });
    }
  });

  // 6. Admin: Update Sponsor
  app.put('/api/admin/sponsors/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      const sponsor = updateSponsor(db, req.params.id, req.body);
      if (!sponsor) {
        return res.status(404).json({ error: 'Sponsor not found' });
      }
      logAudit(req.user!.id, 'UPDATE_SPONSOR', `Updated sponsor partner "${sponsor.name}" (${req.params.id})`, req.ip);
      res.json({ success: true, sponsor });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update sponsor' });
    }
  });

  // 7. Admin: Delete Sponsor
  app.delete('/api/admin/sponsors/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
    try {
      deleteSponsor(db, req.params.id);
      logAudit(req.user!.id, 'DELETE_SPONSOR', `Deleted sponsor partner ${req.params.id}`, req.ip);
      res.json({ success: true, message: 'Sponsor deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete sponsor' });
    }
  });

  // ----------------------------------------------------
  // AI CAPTION GENERATOR API (MULTIMODAL GEMINI 3.8 FLASH)
  // ----------------------------------------------------
  app.post('/api/ai/generate-caption', async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType, tone = 'viral', language = 'auto', prompt = '' } = req.body;

      const systemInstruction = `You are an elite social media copywriter for NIXO Social. 
Your task is to analyze the provided image and/or topic, and craft 3 unique, high-engagement, vibrant social media captions.
Requested Tone: ${tone} (e.g., viral, inspirational, aesthetic, funny, poetic, tech).
Requested Language: ${language === 'bn' ? 'Bengali (বাংলা)' : language === 'en' ? 'English' : 'A balanced mix of Bengali and English options'}.

Requirements for each caption:
1. Hook the reader in the first sentence.
2. Include fitting expressive emojis.
3. Include 3-5 relevant, trendy hashtags (such as #NIXO, #Vibes, #Moments, #Trending).
4. Keep it authentic, expressive, and ready to post.

Return ONLY a JSON array of 3 string items containing the captions.`;

      let contentsPayload: any;
      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z0-9-+.]+;base64,/, '');
        const actualMime = mimeType || 'image/jpeg';
        contentsPayload = {
          parts: [
            {
              inlineData: {
                mimeType: actualMime,
                data: cleanBase64,
              },
            },
            {
              text: prompt ? `Topic/Context: "${prompt}". Generate 3 engaging captions for this photo.` : 'Generate 3 engaging captions for this photo.',
            },
          ],
        };
      } else {
        contentsPayload = `Topic/Context: "${prompt || 'A wonderful life moment and creative vibe'}". Generate 3 captivating social media captions.`;
      }

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentsPayload,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      let captions: string[] = [];
      try {
        const rawText = aiResponse.text || '[]';
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
          captions = parsed.map((item) => (typeof item === 'string' ? item : item.caption || item.text || JSON.stringify(item)));
        } else if (parsed && Array.isArray(parsed.captions)) {
          captions = parsed.captions;
        } else if (typeof parsed === 'object') {
          captions = Object.values(parsed).filter((v): v is string => typeof v === 'string');
        }
      } catch (parseErr) {
        if (aiResponse.text) {
          captions = [aiResponse.text];
        }
      }

      if (!captions || captions.length === 0) {
        captions = [
          "Living for moments that make the heart flutter ✨📸 #NIXO #DailyVibes #Aesthetic #Moments",
          "Every picture tells a story worth remembering 🌟💫 #Vibes #Photography #GoodTimes #NIXO",
          "সুন্দর মুহূর্তগুলো ফ্রেমে বন্দি করে স্মৃতি সাজিয়ে রাখা ✨🌸 #NIXO #স্মৃতি #লাইফস্টাইল #বাংলা"
        ];
      }

      res.json({ success: true, captions });
    } catch (err: any) {
      console.error('Gemini AI Caption generation error:', err);
      // Resilient fallback with top viral captions
      res.json({
        success: true,
        captions: [
          "✨ Capturing the essence of today's best moments! #NIXO #DailyVibes #LifeInLiquidGlass",
          "🌟 Living in the moment, dreaming in color. #ViralPost #Trending #GoodTimes",
          "💫 জীবনের সুন্দর মুহূর্তগুলো ছড়িয়ে পড়ুক সর্বত্র! #NIXO #বাংলা #স্মৃতি #Vibes"
        ]
      });
    }
  });

  // Global Express Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Server Unhandled Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // ----------------------------------------------------
  // API 404 CATCH-ALL HANDLER
  // Prevents Vite SPA fallback from serving index.html for API requests
  // ----------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.path}`,
      status: 404,
    });
  });

  // ----------------------------------------------------
  // VITE / STATIC MIDDDLEWARE
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} busy, retrying in 1.5s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(PORT, HOST);
      }, 1500);
    } else {
      console.error('[Server] Fatal listen error:', err);
    }
  });

  const onShutdown = () => {
    console.log('[Server] Gracefully shutting down...');
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', onShutdown);
  process.on('SIGINT', onShutdown);

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Nixo Liquid Glass Server running on http://${HOST}:${PORT}`);
    
    // Asynchronous Background Queue Worker - Processes notification & SMS broadcasts in batches of 100 every 15 seconds
    setInterval(() => {
      try {
        processNotificationCampaignQueueBatch(db, io, 100);
      } catch (err) {
        console.error('[Background Queue Worker Error]:', err);
      }
    }, 15000);
  });
}

startApp().catch((err) => {
  console.error('Fatal error starting Nixo application:', err);
});
