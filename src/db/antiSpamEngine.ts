import crypto from 'crypto';
import { Database } from 'sql.js';
import { queryDbOne, queryDbAll, runDb, saveDbSync } from './database.js';

// ============================================================================
// ANTI-SPAM & ABUSE DETECTION ENGINE
// ============================================================================

export interface AntiSpamRule {
  id: string;
  category: 'posting' | 'commenting' | 'reactions' | 'gifting' | 'rewards' | 'withdrawals' | 'bot_traffic';
  ruleKey: string;
  name: string;
  description: string;
  thresholdValue: number;
  timeWindowSec: number;
  actionOnBreach: 'flag_for_review' | 'rate_limit' | 'cooldown' | 'shadow_flag' | 'require_manual_approval';
  cooldownSeconds: number;
  isEnabled: boolean;
  updatedAt: string;
}

export interface SpamCheckResult {
  allowed: boolean;
  flaggedForReview: boolean;
  reason?: string;
  cooldownRemainingSec?: number;
  riskScore?: number;
}

export function ensureAntiSpamTables(db: Database) {
  // Configurable rules
  db.run(`
    CREATE TABLE IF NOT EXISTS anti_spam_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      rule_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      threshold_value INTEGER NOT NULL,
      time_window_sec INTEGER NOT NULL,
      action_on_breach TEXT NOT NULL,
      cooldown_seconds INTEGER DEFAULT 60,
      is_enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // Log of detected abuse incidents & flags
  db.run(`
    CREATE TABLE IF NOT EXISTS abuse_incident_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      rule_key TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      details TEXT,
      ip_address TEXT,
      target_id TEXT,
      target_type TEXT,
      action_taken TEXT,
      status TEXT DEFAULT 'pending_review',
      created_at TEXT NOT NULL
    );
  `);

  // User action velocity history
  db.run(`
    CREATE TABLE IF NOT EXISTS user_activity_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      content_hash TEXT,
      target_id TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default rules if empty
  seedDefaultAntiSpamRules(db);
}

function seedDefaultAntiSpamRules(db: Database) {
  const count = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM anti_spam_rules')?.cnt || 0;
  if (count > 0) return;

  const defaultRules = [
    {
      id: 'rule_post_velocity',
      category: 'posting',
      rule_key: 'max_posts_per_minute',
      name: 'Post Burst Velocity',
      description: 'Maximum posts a user can publish in a 1-minute window',
      threshold_value: 3,
      time_window_sec: 60,
      action_on_breach: 'rate_limit',
      cooldown_seconds: 30,
      is_enabled: 1,
    },
    {
      id: 'rule_post_duplicate',
      category: 'posting',
      rule_key: 'duplicate_post_text',
      name: 'Duplicate Post Content',
      description: 'Disallow posting identical text within a 10-minute window',
      threshold_value: 1,
      time_window_sec: 600,
      action_on_breach: 'flag_for_review',
      cooldown_seconds: 60,
      is_enabled: 1,
    },
    {
      id: 'rule_comment_velocity',
      category: 'commenting',
      rule_key: 'max_comments_per_minute',
      name: 'Comment Flood Velocity',
      description: 'Maximum comments allowed per minute',
      threshold_value: 12,
      time_window_sec: 60,
      action_on_breach: 'rate_limit',
      cooldown_seconds: 20,
      is_enabled: 1,
    },
    {
      id: 'rule_comment_duplicate',
      category: 'commenting',
      rule_key: 'duplicate_comment_spam',
      name: 'Repeated Identical Comments',
      description: 'Detects repetitive copy-pasted comments across multiple posts',
      threshold_value: 3,
      time_window_sec: 300,
      action_on_breach: 'flag_for_review',
      cooldown_seconds: 60,
      is_enabled: 1,
    },
    {
      id: 'rule_reaction_hammering',
      category: 'reactions',
      rule_key: 'max_reactions_per_minute',
      name: 'Reaction Hammering',
      description: 'Throttles automated or bot-driven rapid reaction toggles',
      threshold_value: 30,
      time_window_sec: 60,
      action_on_breach: 'rate_limit',
      cooldown_seconds: 15,
      is_enabled: 1,
    },
    {
      id: 'rule_circular_gifting',
      category: 'gifting',
      rule_key: 'circular_tipping_ring',
      name: 'Circular Tipping Detection',
      description: 'Detects mutual rapid coin loops between two accounts within 1 hour',
      threshold_value: 5,
      time_window_sec: 3600,
      action_on_breach: 'flag_for_review',
      cooldown_seconds: 0,
      is_enabled: 1,
    },
    {
      id: 'rule_coin_farming',
      category: 'rewards',
      rule_key: 'excessive_reward_claims',
      name: 'Coin Reward Farming',
      description: 'Maximum reward claims per 6-hour period to prevent sybil farming',
      threshold_value: 10,
      time_window_sec: 21600,
      action_on_breach: 'rate_limit',
      cooldown_seconds: 3600,
      is_enabled: 1,
    },
    {
      id: 'rule_suspicious_withdrawal',
      category: 'withdrawals',
      rule_key: 'high_risk_withdrawal_threshold',
      name: 'High Risk Cashout Review',
      description: 'Automatically holds withdrawals with anomaly risk score >= 60 for moderator verification',
      threshold_value: 60,
      time_window_sec: 86400,
      action_on_breach: 'require_manual_approval',
      cooldown_seconds: 0,
      is_enabled: 1,
    },
  ];

  const now = new Date().toISOString();
  for (const r of defaultRules) {
    runDb(
      db,
      `INSERT OR IGNORE INTO anti_spam_rules (
        id, category, rule_key, name, description, threshold_value, time_window_sec,
        action_on_breach, cooldown_seconds, is_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.category,
        r.rule_key,
        r.name,
        r.description,
        r.threshold_value,
        r.time_window_sec,
        r.action_on_breach,
        r.cooldown_seconds,
        r.is_enabled,
        now,
      ]
    );
  }
}

// ============================================================================
// DETECTION RUNTIMES
// ============================================================================

/**
 * Validates post submission for spam burst or identical duplication.
 */
export function checkPostSpam(
  db: Database,
  userId: string,
  content: string,
  ipAddress?: string
): SpamCheckResult {
  const cleanContent = (content || '').trim();
  const contentHash = crypto.createHash('sha256').update(cleanContent.toLowerCase()).digest('hex');
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(now.getTime() - 600 * 1000).toISOString();

  // Velocity check (Relaxed to allow multiple / consecutive transmissions)
  const recentPosts = queryDbOne(
    db,
    `SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND created_at >= ?`,
    [userId, oneMinuteAgo]
  )?.count || 0;

  if (recentPosts >= 20) {
    logAbuseIncident(db, userId, 'max_posts_per_minute', 'posting', 'low', `User posted 20+ posts in 1 minute`, ipAddress);
    return {
      allowed: false,
      flaggedForReview: true,
      reason: 'You are submitting posts extremely fast. Please wait a few seconds before submitting another post.',
      cooldownRemainingSec: 5,
    };
  }

  // Duplicate content is explicitly allowed as per requirements (no block for duplicate posts)
  // Record event for analytics & history tracking
  recordActivityEvent(db, userId, 'post_created', contentHash, undefined, ipAddress);
  return { allowed: true, flaggedForReview: false };
}

/**
 * Validates comment submission against flood velocities and duplicate spamming.
 */
export function checkCommentSpam(
  db: Database,
  userId: string,
  content: string,
  postId: string,
  ipAddress?: string
): SpamCheckResult {
  const cleanContent = (content || '').trim();
  const contentHash = crypto.createHash('sha256').update(cleanContent.toLowerCase()).digest('hex');
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(now.getTime() - 300 * 1000).toISOString();

  // 1. Comment burst velocity
  const recentComments = queryDbOne(
    db,
    `SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at >= ?`,
    [userId, oneMinuteAgo]
  )?.count || 0;

  if (recentComments >= 12) {
    logAbuseIncident(db, userId, 'max_comments_per_minute', 'commenting', 'medium', `Comment burst exceeding 12/min`, ipAddress, postId, 'post');
    return {
      allowed: false,
      flaggedForReview: true,
      reason: 'Comment rate limit reached. Please slow down.',
      cooldownRemainingSec: 20,
    };
  }

  // 2. Repetitive identical comments
  if (cleanContent.length > 4) {
    const identicalDuplicates = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM comments WHERE user_id = ? AND created_at >= ? AND LOWER(content) = ?`,
      [userId, fiveMinutesAgo, cleanContent.toLowerCase()]
    )?.count || 0;

    if (identicalDuplicates >= 3) {
      logAbuseIncident(db, userId, 'duplicate_comment_spam', 'commenting', 'medium', `Repeated identical comment across multiple threads`, ipAddress, postId, 'post');
      return {
        allowed: false,
        flaggedForReview: true,
        reason: 'Please avoid repeatedly posting identical comments.',
      };
    }
  }

  recordActivityEvent(db, userId, 'comment_created', contentHash, postId, ipAddress);
  return { allowed: true, flaggedForReview: false };
}

/**
 * Validates reaction rate and debounces spam hammers.
 */
export function checkReactionSpam(
  db: Database,
  userId: string,
  targetId: string,
  ipAddress?: string
): SpamCheckResult {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString();

  const reactionCount = queryDbOne(
    db,
    `SELECT COUNT(*) as count FROM user_activity_events WHERE user_id = ? AND event_type = 'reaction' AND created_at >= ?`,
    [userId, oneMinuteAgo]
  )?.count || 0;

  if (reactionCount >= 30) {
    logAbuseIncident(db, userId, 'max_reactions_per_minute', 'reactions', 'low', `Excessive rapid reaction toggling (${reactionCount}/min)`, ipAddress, targetId, 'reaction');
    return {
      allowed: false,
      flaggedForReview: false,
      reason: 'Reaction rate limit reached. Please take a moment before reacting again.',
      cooldownRemainingSec: 15,
    };
  }

  recordActivityEvent(db, userId, 'reaction', undefined, targetId, ipAddress);
  return { allowed: true, flaggedForReview: false };
}

/**
 * Checks for circular tipping loops between accounts.
 */
export function checkCircularGifting(
  db: Database,
  senderId: string,
  receiverId: string
): { isSuspicious: boolean; reason?: string } {
  if (senderId === receiverId) {
    return { isSuspicious: true, reason: 'Cannot tip oneself' };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check how many times receiver tipped sender in the last hour
  const reverseTips = queryDbOne(
    db,
    `SELECT COUNT(*) as count FROM gift_transactions 
     WHERE sender_id = ? AND receiver_id = ? AND created_at >= ?`,
    [receiverId, senderId, oneHourAgo]
  )?.count || 0;

  if (reverseTips >= 5) {
    logAbuseIncident(
      db,
      senderId,
      'circular_tipping_ring',
      'gifting',
      'high',
      `Mutual circular tipping detected between ${senderId} and ${receiverId} (${reverseTips} reverse transfers)`,
      undefined,
      receiverId,
      'user'
    );
    return { isSuspicious: true, reason: 'Circular gifting loop flagged for moderation review' };
  }

  return { isSuspicious: false };
}

/**
 * Calculates Withdrawal Anomaly Risk Score (0 - 100).
 * High scores are placed in the Review Queue instead of being blindly processed or blindly banned.
 */
export function calculateWithdrawalRiskScore(
  db: Database,
  userId: string,
  coinAmount: number
): { riskScore: number; riskFactors: string[]; requiresManualReview: boolean } {
  let score = 0;
  const factors: string[] = [];

  const user = queryDbOne(db, 'SELECT created_at, is_verified, role FROM users WHERE id = ?', [userId]);
  if (!user) return { riskScore: 100, riskFactors: ['User does not exist'], requiresManualReview: true };

  const accountAgeHours = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60);

  // Factor 1: Brand new account (< 48 hours old)
  if (accountAgeHours < 48) {
    score += 35;
    factors.push(`New account (${Math.round(accountAgeHours)}h old)`);
  } else if (accountAgeHours < 168) { // < 7 days
    score += 15;
    factors.push(`Account under 7 days old`);
  }

  // Factor 2: Low platform activity (fewer than 3 posts/comments total)
  const postsCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?', [userId])?.cnt || 0;
  const commentsCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?', [userId])?.cnt || 0;
  if (postsCount + commentsCount < 3) {
    score += 25;
    factors.push(`Minimal social activity (${postsCount} posts, ${commentsCount} comments)`);
  }

  // Factor 3: Over 85% coins originated strictly from bonus/rewards with zero purchase history
  const purchasesCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM payment_transactions_v2 WHERE user_id = ? AND status = "completed"', [userId])?.cnt || 0;
  if (purchasesCount === 0 && coinAmount >= 2000) {
    score += 20;
    factors.push('High value cashout without prior payment verification history');
  }

  // Factor 4: Previous abuse logs
  const incidentCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM abuse_incident_logs WHERE user_id = ?', [userId])?.cnt || 0;
  if (incidentCount > 0) {
    score += Math.min(25, incidentCount * 10);
    factors.push(`${incidentCount} prior spam/abuse flags on record`);
  }

  const requiresManualReview = score >= 60;

  return {
    riskScore: Math.min(100, score),
    riskFactors: factors,
    requiresManualReview,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

export function recordActivityEvent(
  db: Database,
  userId: string,
  eventType: string,
  contentHash?: string,
  targetId?: string,
  ipAddress?: string
) {
  try {
    runDb(
      db,
      `INSERT INTO user_activity_events (id, user_id, event_type, content_hash, target_id, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId,
        eventType,
        contentHash || null,
        targetId || null,
        ipAddress || null,
        new Date().toISOString(),
      ]
    );
  } catch (e) {}
}

export function logAbuseIncident(
  db: Database,
  userId: string,
  ruleKey: string,
  category: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: string,
  ipAddress?: string,
  targetId?: string,
  targetType?: string,
  actionTaken: string = 'flagged'
) {
  try {
    const id = 'inc_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    runDb(
      db,
      `INSERT INTO abuse_incident_logs (
        id, user_id, rule_key, category, severity, details, ip_address,
        target_id, target_type, action_taken, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)`,
      [
        id,
        userId,
        ruleKey,
        category,
        severity,
        details,
        ipAddress || null,
        targetId || null,
        targetType || null,
        actionTaken,
        new Date().toISOString(),
      ]
    );
    saveDbSync();
  } catch (e) {
    console.error('Error logging abuse incident:', e);
  }
}

export function getAntiSpamRules(db: Database): AntiSpamRule[] {
  const rows = queryDbAll(db, 'SELECT * FROM anti_spam_rules ORDER BY category ASC, rule_key ASC');
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    ruleKey: r.rule_key,
    name: r.name,
    description: r.description,
    thresholdValue: r.threshold_value,
    timeWindowSec: r.time_window_sec,
    actionOnBreach: r.action_on_breach,
    cooldownSeconds: r.cooldown_seconds,
    isEnabled: Boolean(r.is_enabled),
    updatedAt: r.updated_at,
  }));
}

export function updateAntiSpamRule(
  db: Database,
  ruleKey: string,
  updates: Partial<AntiSpamRule>
): AntiSpamRule | null {
  const existing = queryDbOne(db, 'SELECT * FROM anti_spam_rules WHERE rule_key = ?', [ruleKey]);
  if (!existing) return null;

  const now = new Date().toISOString();
  runDb(
    db,
    `UPDATE anti_spam_rules SET
       threshold_value = COALESCE(?, threshold_value),
       time_window_sec = COALESCE(?, time_window_sec),
       action_on_breach = COALESCE(?, action_on_breach),
       cooldown_seconds = COALESCE(?, cooldown_seconds),
       is_enabled = COALESCE(?, is_enabled),
       updated_at = ?
     WHERE rule_key = ?`,
    [
      updates.thresholdValue !== undefined ? updates.thresholdValue : null,
      updates.timeWindowSec !== undefined ? updates.timeWindowSec : null,
      updates.actionOnBreach || null,
      updates.cooldownSeconds !== undefined ? updates.cooldownSeconds : null,
      updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : null,
      now,
      ruleKey,
    ]
  );
  saveDbSync();

  const updated = queryDbOne(db, 'SELECT * FROM anti_spam_rules WHERE rule_key = ?', [ruleKey]);
  return updated ? {
    id: updated.id,
    category: updated.category,
    ruleKey: updated.rule_key,
    name: updated.name,
    description: updated.description,
    thresholdValue: updated.threshold_value,
    timeWindowSec: updated.time_window_sec,
    actionOnBreach: updated.action_on_breach,
    cooldownSeconds: updated.cooldown_seconds,
    isEnabled: Boolean(updated.is_enabled),
    updatedAt: updated.updated_at,
  } : null;
}
