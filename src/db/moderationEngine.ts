import { Database } from 'sql.js';
import { queryDbOne, queryDbAll, runDb, saveDbSync } from './database.js';

// ============================================================================
// UNIVERSAL REPORT & MODERATION ENGINE
// ============================================================================

export type ReportTargetType = 'user' | 'post' | 'comment' | 'video' | 'reel' | 'story' | 'group' | 'page' | 'message';
export type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate content'
  | 'impersonation'
  | 'fraud'
  | 'copyright complaint'
  | 'violence'
  | 'hate speech'
  | 'self harm'
  | 'misinformation'
  | 'other';

export type ReportStatus = 'pending' | 'reviewing' | 'action_taken' | 'dismissed' | 'escalated';

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  reporterAvatar?: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  reason: string;
  description?: string;
  evidence?: string;
  evidenceUrl?: string;
  screenshots?: string;
  relatedContent?: string;
  additionalInfo?: string;
  requestedInfoNotes?: string;
  details?: string;
  status: ReportStatus;
  priorityScore: number;
  assignedModeratorId?: string;
  assignedModeratorName?: string;
  resolutionAction?: string;
  resolutionNotes?: string;
  snapshotData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationActionLog {
  id: string;
  moderatorId: string;
  moderatorName?: string;
  reportId?: string;
  targetType: string;
  targetId: string;
  targetAuthorId?: string;
  action: string;
  reason: string;
  notes?: string;
  previousState?: string;
  newState?: string;
  createdAt: string;
}

export interface UserRestriction {
  id: string;
  userId: string;
  restrictionType: 'mute_posting' | 'mute_commenting' | 'mute_gifting' | 'full_mute' | 'suspended' | 'banned';
  reason: string;
  expiresAt?: string;
  isPermanent: boolean;
  issuedBy: string;
  createdAt: string;
}

export function ensureModerationTables(db: Database) {
  // Enhanced Reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS reports_v2 (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      category TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      evidence TEXT,
      evidence_url TEXT,
      screenshots TEXT,
      related_content TEXT,
      additional_info TEXT,
      requested_info_notes TEXT,
      details TEXT,
      status TEXT DEFAULT 'pending',
      priority_score INTEGER DEFAULT 50,
      assigned_moderator_id TEXT,
      resolution_action TEXT,
      resolution_notes TEXT,
      snapshot_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration for additional columns if table already existed
  const extraCols = [
    'description TEXT',
    'evidence TEXT',
    'screenshots TEXT',
    'related_content TEXT',
    'additional_info TEXT',
    'requested_info_notes TEXT',
  ];
  extraCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE reports_v2 ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  // Moderation action history
  db.run(`
    CREATE TABLE IF NOT EXISTS moderation_action_history (
      id TEXT PRIMARY KEY,
      moderator_id TEXT NOT NULL,
      report_id TEXT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_author_id TEXT,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      previous_state TEXT,
      new_state TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // User restrictions & temporary mutes
  db.run(`
    CREATE TABLE IF NOT EXISTS user_restrictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      restriction_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      expires_at TEXT,
      is_permanent INTEGER DEFAULT 0,
      issued_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Indexes for high performance queue queries
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_rep_v2_status ON reports_v2(status, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_rep_v2_target ON reports_v2(target_type, target_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_rep_v2_reporter ON reports_v2(reporter_id, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_mod_hist_target ON moderation_action_history(target_type, target_id);');
    db.run('CREATE INDEX IF NOT EXISTS idx_usr_restr ON user_restrictions(user_id, is_active);');
  } catch (e) {}
}

/**
 * Automatically captures snapshot data for reported entity so evidence isn't lost if deleted.
 */
function captureTargetSnapshot(db: Database, targetType: ReportTargetType, targetId: string): Record<string, any> {
  try {
    if (targetType === 'post' || targetType === 'reel') {
      const post = queryDbOne(db, 'SELECT * FROM posts WHERE id = ?', [targetId]);
      if (post) {
        const author = queryDbOne(db, 'SELECT id, username, full_name, avatar_url, role, status FROM users WHERE id = ?', [post.user_id]);
        return {
          id: post.id,
          authorId: post.user_id,
          authorUsername: author?.username,
          authorName: author?.full_name,
          authorAvatar: author?.avatar_url,
          authorStatus: author?.status,
          content: post.content,
          mediaUrl: post.media_url,
          mediaType: post.media_type,
          createdAt: post.created_at,
        };
      }
    } else if (targetType === 'comment') {
      const comment = queryDbOne(db, 'SELECT * FROM comments WHERE id = ?', [targetId]);
      if (comment) {
        const author = queryDbOne(db, 'SELECT id, username, full_name, avatar_url, status FROM users WHERE id = ?', [comment.user_id]);
        return {
          id: comment.id,
          postId: comment.post_id,
          authorId: comment.user_id,
          authorUsername: author?.username,
          authorName: author?.full_name,
          authorAvatar: author?.avatar_url,
          authorStatus: author?.status,
          content: comment.content,
          createdAt: comment.created_at,
        };
      }
    } else if (targetType === 'user') {
      const user = queryDbOne(db, 'SELECT * FROM users WHERE id = ?', [targetId]);
      if (user) {
        const totalPosts = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?', [targetId]);
        const totalReportsReceived = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM reports_v2 WHERE target_type = "user" AND target_id = ?', [targetId]);
        return {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          status: user.status,
          role: user.role,
          email: user.email,
          totalPosts: totalPosts?.cnt || 0,
          totalReportsReceived: totalReportsReceived?.cnt || 0,
          createdAt: user.created_at,
        };
      }
    } else if (targetType === 'video') {
      const video = queryDbOne(db, 'SELECT * FROM videos WHERE id = ?', [targetId]) || queryDbOne(db, 'SELECT * FROM posts WHERE id = ? AND media_type = "video"', [targetId]);
      if (video) {
        const author = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id = ?', [video.user_id]);
        return {
          id: video.id,
          authorId: video.user_id,
          authorUsername: author?.username,
          authorName: author?.full_name,
          title: video.title || video.content,
          caption: video.caption || video.content,
          mediaUrl: video.video_url || video.media_url,
          thumbnailUrl: video.thumbnail_url,
          createdAt: video.created_at,
        };
      }
    } else if (targetType === 'story') {
      const story = queryDbOne(db, 'SELECT * FROM stories WHERE id = ?', [targetId]);
      if (story) {
        const author = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id = ?', [story.user_id]);
        return {
          id: story.id,
          authorId: story.user_id,
          authorUsername: author?.username,
          authorName: author?.full_name,
          mediaUrl: story.media_url,
          caption: story.caption,
          createdAt: story.created_at,
        };
      }
    } else if (targetType === 'message') {
      const msg = queryDbOne(db, 'SELECT * FROM messages WHERE id = ?', [targetId]);
      if (msg) {
        const sender = queryDbOne(db, 'SELECT id, username, full_name, avatar_url FROM users WHERE id = ?', [msg.sender_id]);
        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderUsername: sender?.username,
          senderName: sender?.full_name,
          receiverId: msg.receiver_id,
          content: msg.content,
          mediaUrl: msg.media_url,
          createdAt: msg.created_at,
        };
      }
    } else if (targetType === 'group') {
      const group = queryDbOne(db, 'SELECT * FROM groups WHERE id = ?', [targetId]);
      if (group) {
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          creatorId: group.creator_id,
          createdAt: group.created_at,
        };
      }
    } else if (targetType === 'page') {
      const page = queryDbOne(db, 'SELECT * FROM pages WHERE id = ?', [targetId]);
      if (page) {
        return {
          id: page.id,
          name: page.name,
          description: page.description,
          ownerId: page.owner_id,
          createdAt: page.created_at,
        };
      }
    }
  } catch (e) {
    console.error('Error taking report snapshot:', e);
  }
  return { targetId, targetType, snapshotUnavailable: true };
}

/**
 * Creates a new report with rate limiting and anti-abuse safeguards.
 */
export function createReport(
  db: Database,
  reporterId: string,
  params: {
    targetType: ReportTargetType;
    targetId: string;
    category: ReportCategory;
    reason: string;
    description?: string;
    evidence?: string;
    evidenceUrl?: string;
    screenshots?: string;
    relatedContent?: string;
    additionalInfo?: string;
  }
): { success: boolean; reportId: string; message?: string } {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Rate Limiting Check (Max 5 reports per user in 15 minutes)
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const recentReportCount = queryDbOne(
    db,
    'SELECT COUNT(*) as cnt FROM reports_v2 WHERE reporter_id = ? AND created_at >= ?',
    [reporterId, fifteenMinsAgo]
  );

  if (recentReportCount && recentReportCount.cnt >= 5) {
    throw new Error('Report rate limit exceeded. You can submit up to 5 reports every 15 minutes. Please try again shortly.');
  }

  // 2. Duplicate Check Protection (Prevent duplicate active reports from same reporter)
  const existingActive = queryDbOne(
    db,
    `SELECT id, status FROM reports_v2
     WHERE reporter_id = ? AND target_type = ? AND target_id = ?
     AND status IN ('pending', 'reviewing', 'escalated')`,
    [reporterId, params.targetType, params.targetId]
  );

  if (existingActive) {
    throw new Error('You already have an active report submitted for this content under review.');
  }

  // 3. Prevent self-reporting
  if (params.targetType === 'user' && params.targetId === reporterId) {
    throw new Error('You cannot submit a report against your own account.');
  }

  const reportId = 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

  // Priority scoring based on category & repeated report volume on target
  let priorityScore = 50;
  if (['violence', 'hate speech', 'self harm', 'fraud', 'harassment'].includes(params.category)) {
    priorityScore = 85;
  } else if (['inappropriate content', 'impersonation'].includes(params.category)) {
    priorityScore = 70;
  } else if (['copyright complaint', 'misinformation'].includes(params.category)) {
    priorityScore = 60;
  }

  // Elevate priority if target has received multiple reports from different users
  const priorReportsOnTarget = queryDbOne(
    db,
    'SELECT COUNT(*) as cnt FROM reports_v2 WHERE target_type = ? AND target_id = ?',
    [params.targetType, params.targetId]
  );
  if (priorReportsOnTarget && priorReportsOnTarget.cnt > 0) {
    priorityScore += Math.min(30, priorReportsOnTarget.cnt * 5);
  }

  const snapshot = captureTargetSnapshot(db, params.targetType, params.targetId);

  const mainReason = params.reason || params.description || 'Violation of Community Guidelines';
  const descriptionText = params.description || params.reason || '';
  const evidenceText = params.evidence || params.evidenceUrl || '';
  const screenshotsText = params.screenshots || params.evidenceUrl || '';

  runDb(
    db,
    `INSERT INTO reports_v2 (
      id, reporter_id, target_type, target_id, category, reason, description, evidence,
      evidence_url, screenshots, related_content, additional_info, details, status,
      priority_score, snapshot_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      reportId,
      reporterId,
      params.targetType,
      params.targetId,
      params.category,
      mainReason.trim(),
      descriptionText.trim(),
      evidenceText.trim(),
      params.evidenceUrl?.trim() || screenshotsText.trim() || null,
      screenshotsText.trim() || null,
      params.relatedContent?.trim() || null,
      params.additionalInfo?.trim() || null,
      descriptionText.trim(),
      priorityScore,
      JSON.stringify(snapshot),
      nowIso,
      nowIso,
    ]
  );

  // Sync with legacy reports table
  runDb(
    db,
    `INSERT OR IGNORE INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [reportId, reporterId, params.targetType, params.targetId, mainReason.trim(), descriptionText.trim(), nowIso]
  );

  // Audit record for report creation
  runDb(
    db,
    `INSERT INTO moderation_action_history (
      id, moderator_id, report_id, target_type, target_id, action, reason, previous_state, new_state, created_at
    ) VALUES (?, ?, ?, ?, ?, 'report_submitted', ?, 'none', 'pending', ?)`,
    [
      'mact_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      reporterId,
      reportId,
      params.targetType,
      params.targetId,
      `Report submitted for ${params.category}`,
      nowIso,
    ]
  );

  saveDbSync();
  return { success: true, reportId, message: 'Report submitted successfully' };
}

/**
 * Retrieves reports submitted by a specific user (User Report Status Center).
 */
export function getReportsByReporter(db: Database, reporterId: string): ReportItem[] {
  const rows = queryDbAll(
    db,
    `SELECT r.*, m.full_name as moderator_name
     FROM reports_v2 r
     LEFT JOIN users m ON r.assigned_moderator_id = m.id
     WHERE r.reporter_id = ?
     ORDER BY r.created_at DESC`,
    [reporterId]
  );

  return rows.map((r) => {
    let snapshot: any = {};
    try {
      snapshot = JSON.parse(r.snapshot_data || '{}');
    } catch (e) {}

    return {
      id: r.id,
      reporterId: r.reporter_id,
      targetType: r.target_type,
      targetId: r.target_id,
      category: r.category,
      reason: r.reason,
      description: r.description || r.details,
      evidence: r.evidence,
      evidenceUrl: r.evidence_url,
      screenshots: r.screenshots,
      relatedContent: r.related_content,
      additionalInfo: r.additional_info,
      requestedInfoNotes: r.requested_info_notes,
      details: r.details,
      status: r.status === 'resolved' ? 'action_taken' : (r.status as ReportStatus),
      priorityScore: r.priority_score,
      assignedModeratorId: r.assigned_moderator_id,
      assignedModeratorName: r.moderator_name,
      resolutionAction: r.resolution_action,
      resolutionNotes: r.resolution_notes,
      snapshotData: snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

/**
 * Retrieves moderation reports queue for Admin Dashboard.
 */
export function getModerationQueue(
  db: Database,
  filter?: {
    status?: ReportStatus | string;
    targetType?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): { reports: ReportItem[]; total: number } {
  let query = `
    SELECT r.*, u.username as reporter_username, u.full_name as reporter_name, u.avatar_url as reporter_avatar,
           m.full_name as moderator_name
    FROM reports_v2 r
    LEFT JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users m ON r.assigned_moderator_id = m.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.status && filter.status !== 'all') {
    if (filter.status === 'action_taken') {
      query += ` AND r.status IN ('action_taken', 'resolved')`;
    } else {
      query += ' AND r.status = ?';
      params.push(filter.status);
    }
  }

  if (filter?.targetType && filter.targetType !== 'all') {
    query += ' AND r.target_type = ?';
    params.push(filter.targetType);
  }

  if (filter?.category && filter.category !== 'all') {
    query += ' AND r.category = ?';
    params.push(filter.category);
  }

  if (filter?.search) {
    query += ' AND (r.reason LIKE ? OR r.description LIKE ? OR r.details LIKE ? OR r.target_id LIKE ? OR r.id LIKE ?)';
    const s = `%${filter.search}%`;
    params.push(s, s, s, s, s);
  }

  query += ' ORDER BY r.priority_score DESC, r.created_at DESC';

  const allMatching = queryDbAll(db, query, params);
  const total = allMatching.length;

  const limit = filter?.limit || 100;
  const offset = filter?.offset || 0;
  const pagedRows = allMatching.slice(offset, offset + limit);

  const reports: ReportItem[] = pagedRows.map((r) => {
    let snapshot: any = {};
    try {
      snapshot = JSON.parse(r.snapshot_data || '{}');
    } catch (e) {}

    return {
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name || r.reporter_username || 'Anonymous Member',
      reporterAvatar: r.reporter_avatar,
      targetType: r.target_type,
      targetId: r.target_id,
      category: r.category,
      reason: r.reason,
      description: r.description || r.details,
      evidence: r.evidence,
      evidenceUrl: r.evidence_url,
      screenshots: r.screenshots,
      relatedContent: r.related_content,
      additionalInfo: r.additional_info,
      requestedInfoNotes: r.requested_info_notes,
      details: r.details,
      status: r.status === 'resolved' ? 'action_taken' : (r.status as ReportStatus),
      priorityScore: r.priority_score,
      assignedModeratorId: r.assigned_moderator_id,
      assignedModeratorName: r.moderator_name,
      resolutionAction: r.resolution_action,
      resolutionNotes: r.resolution_notes,
      snapshotData: snapshot,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return { reports, total };
}

/**
 * Retrieves comprehensive history & profile audit for a reported user or reporter.
 */
export function getReportedUserAuditHistory(db: Database, userId: string) {
  const user = queryDbOne(
    db,
    'SELECT id, username, full_name, avatar_url, email, role, status, is_verified, created_at FROM users WHERE id = ?',
    [userId]
  );

  const reportsReceived = queryDbAll(
    db,
    `SELECT * FROM reports_v2 WHERE (target_type = 'user' AND target_id = ?) OR target_id IN (
       SELECT id FROM posts WHERE user_id = ?
       UNION SELECT id FROM comments WHERE user_id = ?
       UNION SELECT id FROM messages WHERE sender_id = ?
     ) ORDER BY created_at DESC`,
    [userId, userId, userId, userId]
  );

  const reportsFiled = queryDbAll(
    db,
    `SELECT id, target_type, target_id, category, status, created_at FROM reports_v2 WHERE reporter_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  const moderationActions = queryDbAll(
    db,
    `SELECT * FROM moderation_action_history WHERE target_author_id = ? OR target_id = ? ORDER BY created_at DESC`,
    [userId, userId]
  );

  const activeRestrictions = queryDbAll(
    db,
    `SELECT * FROM user_restrictions WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  return {
    user,
    reportsReceivedCount: reportsReceived.length,
    reportsFiledCount: reportsFiled.length,
    reportsReceived,
    reportsFiled,
    moderationActions,
    activeRestrictions,
  };
}

/**
 * Executes a granular moderation action with complete audit trail.
 */
export function executeModerationAction(
  db: Database,
  moderatorId: string,
  reportId: string,
  action:
    | 'dismiss'
    | 'assign_reviewing'
    | 'request_info'
    | 'issue_warning'
    | 'hide_content'
    | 'delete_content'
    | 'restrict_user_24h'
    | 'restrict_user_7d'
    | 'restrict_user_30d'
    | 'suspend_user'
    | 'ban_user'
    | 'escalate'
    | 'mark_action_taken',
  reason: string,
  notes?: string
): { success: boolean; message: string } {
  const report = queryDbOne(db, 'SELECT * FROM reports_v2 WHERE id = ?', [reportId]);
  if (!report) {
    return { success: false, message: 'Report not found' };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let targetAuthorId = '';
  const previousState = report.status;
  let newState: ReportStatus = 'action_taken';

  let snapshot: any = {};
  try {
    snapshot = JSON.parse(report.snapshot_data || '{}');
    targetAuthorId =
      snapshot.authorId ||
      snapshot.creatorId ||
      snapshot.ownerId ||
      snapshot.senderId ||
      (report.target_type === 'user' ? report.target_id : '');
  } catch (e) {}

  if (action === 'assign_reviewing') {
    newState = 'reviewing';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'reviewing', assigned_moderator_id = ?, updated_at = ? WHERE id = ?`,
      [moderatorId, nowIso, reportId]
    );
  } else if (action === 'request_info') {
    newState = 'reviewing';
    const requestMessage = notes || reason || 'Please provide additional context or screenshot evidence regarding this report.';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'reviewing', requested_info_notes = ?, assigned_moderator_id = ?, updated_at = ? WHERE id = ?`,
      [requestMessage, moderatorId, nowIso, reportId]
    );

    // Send notification to the reporter
    runDb(
      db,
      `INSERT INTO notifications (id, user_id, sender_id, type, title, message, reference_id, reference_type, is_read, created_at)
       VALUES (?, ?, ?, 'moderation_info_request', 'Information Requested on Report', ?, ?, 'report', 0, ?)`,
      [
        'notif_req_' + Date.now(),
        report.reporter_id,
        moderatorId,
        `Moderator team requested additional information regarding Report #${reportId.slice(0, 10)}: "${requestMessage}"`,
        reportId,
        nowIso,
      ]
    );
  } else if (action === 'dismiss') {
    newState = 'dismissed';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'dismissed', resolution_action = 'dismissed', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'dismissed' WHERE id = ?`, [reportId]);
  } else if (action === 'escalate') {
    newState = 'escalated';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'escalated', priority_score = priority_score + 40, resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
  } else if (action === 'issue_warning') {
    newState = 'action_taken';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = 'warning_issued', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);

    if (targetAuthorId) {
      const warnNotifId = 'notif_warn_' + Date.now();
      runDb(
        db,
        `INSERT INTO notifications (id, user_id, sender_id, type, title, message, reference_id, reference_type, is_read, created_at)
         VALUES (?, ?, ?, 'system_warning', 'Official Community Warning', ?, ?, 'moderation', 0, ?)`,
        [
          warnNotifId,
          targetAuthorId,
          moderatorId,
          `Your content regarding "${report.target_type}" was flagged for ${report.category}. Reason: ${reason}. Please review community guidelines.`,
          report.target_id,
          nowIso,
        ]
      );
    }
  } else if (action === 'hide_content' || action === 'delete_content') {
    newState = 'action_taken';
    if (['post', 'reel'].includes(report.target_type)) {
      runDb(db, 'DELETE FROM posts WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'comment') {
      runDb(db, 'DELETE FROM comments WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'message') {
      runDb(db, 'DELETE FROM messages WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'video') {
      runDb(db, 'DELETE FROM videos WHERE id = ?', [report.target_id]);
      runDb(db, 'DELETE FROM posts WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'story') {
      runDb(db, 'DELETE FROM stories WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'group') {
      runDb(db, 'DELETE FROM groups WHERE id = ?', [report.target_id]);
    } else if (report.target_type === 'page') {
      runDb(db, 'DELETE FROM pages WHERE id = ?', [report.target_id]);
    }

    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = '${action}', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);
  } else if (action === 'restrict_user_24h' || action === 'restrict_user_7d' || action === 'restrict_user_30d') {
    newState = 'action_taken';
    const hours = action === 'restrict_user_24h' ? 24 : action === 'restrict_user_7d' ? 168 : 720;
    const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

    const targetUser = targetAuthorId || (report.target_type === 'user' ? report.target_id : '');
    if (targetUser) {
      runDb(
        db,
        `INSERT INTO user_restrictions (id, user_id, restriction_type, reason, expires_at, is_permanent, issued_by, is_active, created_at)
         VALUES (?, ?, 'full_mute', ?, ?, 0, ?, 1, ?)`,
        ['restr_' + Date.now(), targetUser, reason, expiresAt, moderatorId, nowIso]
      );
    }

    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = '${action}', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);
  } else if (action === 'suspend_user') {
    newState = 'action_taken';
    const targetUser = targetAuthorId || (report.target_type === 'user' ? report.target_id : '');
    if (targetUser) {
      runDb(db, 'UPDATE users SET status = "suspended", updated_at = ? WHERE id = ?', [nowIso, targetUser]);
      runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUser]);
      runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUser]);
    }

    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = 'user_suspended', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);
  } else if (action === 'ban_user') {
    newState = 'action_taken';
    const targetUser = targetAuthorId || (report.target_type === 'user' ? report.target_id : '');
    if (targetUser) {
      runDb(db, 'UPDATE users SET status = "banned", updated_at = ? WHERE id = ?', [nowIso, targetUser]);
      runDb(db, 'DELETE FROM user_sessions WHERE user_id = ?', [targetUser]);
      runDb(db, 'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?', [targetUser]);
    }

    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = 'user_banned', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);
  } else if (action === 'mark_action_taken') {
    newState = 'action_taken';
    runDb(
      db,
      `UPDATE reports_v2 SET status = 'action_taken', resolution_action = 'manual_action_taken', resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [notes || reason, nowIso, reportId]
    );
    runDb(db, `UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);
  }

  // Record audit trail in action history
  runDb(
    db,
    `INSERT INTO moderation_action_history (
      id, moderator_id, report_id, target_type, target_id, target_author_id,
      action, reason, notes, previous_state, new_state, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'mact_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      moderatorId,
      reportId,
      report.target_type,
      report.target_id,
      targetAuthorId || null,
      action,
      reason,
      notes || null,
      previousState,
      newState,
      nowIso,
    ]
  );

  saveDbSync();
  return { success: true, message: `Moderation action '${action}' completed successfully` };
}

/**
 * Checks if a user currently has active restrictions (e.g., mute).
 */
export function isUserRestricted(
  db: Database,
  userId: string,
  actionType: 'posting' | 'commenting' | 'gifting'
): { restricted: boolean; reason?: string; expiresAt?: string } {
  const nowIso = new Date().toISOString();
  const restriction = queryDbOne(
    db,
    `SELECT * FROM user_restrictions 
     WHERE user_id = ? AND is_active = 1 
     AND (expires_at IS NULL OR expires_at > ?)
     ORDER BY created_at DESC LIMIT 1`,
    [userId, nowIso]
  );

  if (!restriction) {
    return { restricted: false };
  }

  return {
    restricted: true,
    reason: restriction.reason,
    expiresAt: restriction.expires_at,
  };
}

/**
 * Retrieves audit history of all moderation actions taken.
 */
export function getModerationActionHistory(db: Database, limit: number = 100): ModerationActionLog[] {
  const rows = queryDbAll(
    db,
    `SELECT h.*, u.username as moderator_username, u.full_name as moderator_name
     FROM moderation_action_history h
     LEFT JOIN users u ON h.moderator_id = u.id
     ORDER BY h.created_at DESC LIMIT ?`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    moderatorId: r.moderator_id,
    moderatorName: r.moderator_name || r.moderator_username || 'Admin Staff',
    reportId: r.report_id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetAuthorId: r.target_author_id,
    action: r.action,
    reason: r.reason,
    notes: r.notes,
    previousState: r.previous_state,
    newState: r.new_state,
    createdAt: r.created_at,
  }));
}
