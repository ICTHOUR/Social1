import { Database as SqlJsDatabase } from 'sql.js';

export type CampaignTargetType = 'individual' | 'bulk' | 'group' | 'filtered' | 'all';

export type CampaignTargetFilter =
  | 'active'
  | 'inactive'
  | 'verified'
  | 'new_users'
  | 'creators'
  | 'coin_users'
  | 'specific_group'
  | 'specific_page'
  | 'custom_selection';

export type CampaignStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'cancelled' | 'failed';

export function ensureNotificationTables(db: SqlJsDatabase) {
  // 1. Alter notifications table with extra rich attributes if missing
  const extraNotifCols = [
    'campaign_id TEXT',
    'title TEXT',
    'image_url TEXT',
    'deep_link TEXT',
    'priority TEXT DEFAULT "normal"',
    'expires_at TEXT',
  ];

  extraNotifCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE notifications ADD COLUMN ${colDef};`);
    } catch (e) {
      // Column already exists
    }
  });

  // 2. Notification Campaigns Table
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT,
      deep_link TEXT,
      priority TEXT DEFAULT 'normal',
      target_type TEXT NOT NULL,
      target_filter TEXT,
      target_id TEXT,
      custom_user_ids TEXT,
      status TEXT DEFAULT 'draft',
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      scheduled_at TEXT,
      expires_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Notification Campaign Queue Table (Batch queue)
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_campaign_queue (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      notification_id TEXT,
      sent_at TEXT,
      delivered_at TEXT,
      read_at TEXT,
      FOREIGN KEY(campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Notification Templates Table
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT,
      deep_link TEXT,
      priority TEXT DEFAULT 'normal',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Indexes for high performance
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaign_status ON notification_campaigns(status, scheduled_at);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaign_queue_pending ON notification_campaign_queue(campaign_id, status);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaign_queue_user ON notification_campaign_queue(user_id, status);`);
  } catch (e) {}

  // Seed Default Notification Templates if empty
  try {
    const countRes = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notification_templates');
    if (!countRes || countRes.cnt === 0) {
      const now = new Date().toISOString();
      db.run(`
        INSERT INTO notification_templates (id, name, category, title, message, image_url, deep_link, priority, created_by, created_at, updated_at)
        VALUES
        ('tmpl_welcome', 'Welcome Announcement', 'onboarding', '🎉 Welcome to Nixo Social!', 'We are thrilled to have you in our liquid glass social ecosystem. Explore creator posts, join groups, and start streaming today!', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80', '/explore', 'normal', 'user_admin', ?, ?),
        ('tmpl_coin_bonus', 'Flash Coin Reward', 'economy', '💰 Daily Coin Bonus Released!', 'You have been awarded a special creator coin bonus. Tap here to view your updated Nixo wallet balance!', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=300&q=80', '/wallet', 'high', 'user_admin', ?, ?),
        ('tmpl_system_maint', 'System Maintenance Notice', 'system', '⚡ Platform Upgrade Scheduled', 'Nixo core services will undergo a 10-minute performance upgrade tonight at 02:00 UTC. Your data is completely safe.', '', '/settings', 'urgent', 'user_admin', ?, ?),
        ('tmpl_trending_creator', 'Featured Creator Spotlight', 'content', '🌟 Discover Trending Creators', 'Check out today''s top trending visual artists, video creators, and spatial design pioneers on Nixo!', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', '/explore', 'normal', 'user_admin', ?, ?)
      `, [now, now, now, now, now, now, now, now]);
    }
  } catch (e) {
    console.warn('Template seeding warning:', e);
  }
}

// Helpers
function queryDbAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (e) {
    console.error('queryDbAll error:', e, sql, params);
    return [];
  }
}

function queryDbOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
  const rows = queryDbAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runDb(db: SqlJsDatabase, sql: string, params: any[] = []) {
  try {
    db.run(sql, params);
  } catch (e) {
    console.error('runDb error:', e, sql, params);
    throw e;
  }
}

// ----------------------------------------------------------------------
// CAMPAIGN CREATION & QUEUEING ENGINE
// ----------------------------------------------------------------------

export function createNotificationCampaign(db: SqlJsDatabase, data: any, createdBy: string) {
  const {
    title,
    message,
    imageUrl,
    deepLink,
    priority = 'normal',
    targetType,
    targetFilter,
    targetId,
    customUserIds,
    scheduledAt,
    expiresAt,
    saveAsTemplate,
    templateName,
  } = data;

  if (!title || !title.trim() || !message || !message.trim()) {
    throw new Error('Title and message text are required');
  }

  if (!targetType) {
    throw new Error('targetType is required (individual, bulk, group, filtered, all)');
  }

  const campaignId = 'camp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  const initialStatus = scheduledAt && new Date(scheduledAt) > new Date() ? 'queued' : 'queued';

  let customUserIdsStr: string | null = null;
  if (Array.isArray(customUserIds)) {
    customUserIdsStr = JSON.stringify(customUserIds);
  } else if (typeof customUserIds === 'string' && customUserIds.trim()) {
    customUserIdsStr = JSON.stringify(
      customUserIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }

  runDb(
    db,
    `INSERT INTO notification_campaigns (
      id, title, message, image_url, deep_link, priority, target_type, target_filter,
      target_id, custom_user_ids, status, total_recipients, sent_count, delivered_count,
      read_count, failed_count, scheduled_at, expires_at, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?)`,
    [
      campaignId,
      title.trim(),
      message.trim(),
      imageUrl || null,
      deepLink || null,
      priority || 'normal',
      targetType,
      targetFilter || null,
      targetId || null,
      customUserIdsStr,
      initialStatus,
      scheduledAt || null,
      expiresAt || null,
      createdBy,
      now,
      now,
    ]
  );

  // Optionally save as template
  if (saveAsTemplate && templateName && templateName.trim()) {
    createNotificationTemplate(db, {
      name: templateName.trim(),
      category: 'campaigns',
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl || '',
      deepLink: deepLink || '',
      priority: priority || 'normal',
    }, createdBy);
  }

  // Populate recipient queue asynchronously
  resolveAndQueueCampaignRecipients(db, campaignId);

  return queryDbOne(db, 'SELECT * FROM notification_campaigns WHERE id = ?', [campaignId]);
}

export function resolveAndQueueCampaignRecipients(db: SqlJsDatabase, campaignId: string) {
  const campaign = queryDbOne(db, 'SELECT * FROM notification_campaigns WHERE id = ?', [campaignId]);
  if (!campaign) return;

  const targetType: CampaignTargetType = campaign.target_type;
  const targetFilter: CampaignTargetFilter = campaign.target_filter;
  const targetId = campaign.target_id;

  let recipientUserIds: string[] = [];

  if (targetType === 'individual') {
    if (campaign.custom_user_ids) {
      try {
        const parsed = JSON.parse(campaign.custom_user_ids);
        if (Array.isArray(parsed) && parsed.length > 0) recipientUserIds = [parsed[0]];
      } catch (e) {
        recipientUserIds = [campaign.custom_user_ids];
      }
    } else if (targetId) {
      recipientUserIds = [targetId];
    }
  } else if (targetType === 'bulk' || targetFilter === 'custom_selection') {
    if (campaign.custom_user_ids) {
      try {
        recipientUserIds = JSON.parse(campaign.custom_user_ids);
      } catch (e) {
        recipientUserIds = campaign.custom_user_ids.split(',').map((s: string) => s.trim());
      }
    }
  } else if (targetType === 'all') {
    const rows = queryDbAll(
      db,
      `SELECT id FROM users WHERE status = 'active' AND (deleted_at IS NULL OR deleted_at = '')`
    );
    recipientUserIds = rows.map((r) => r.id);
  } else if (targetType === 'group' || targetFilter === 'specific_group') {
    if (targetId) {
      const rows = queryDbAll(
        db,
        `SELECT user_id FROM group_members WHERE group_id = ? AND status = 'active'`,
        [targetId]
      );
      recipientUserIds = rows.map((r) => r.user_id);
    }
  } else if (targetFilter === 'specific_page') {
    if (targetId) {
      const rows = queryDbAll(
        db,
        `SELECT user_id FROM page_followers WHERE page_id = ?`,
        [targetId]
      );
      recipientUserIds = rows.map((r) => r.user_id);
    }
  } else if (targetType === 'filtered') {
    let sql = `SELECT id FROM users WHERE (deleted_at IS NULL OR deleted_at = '')`;
    const params: any[] = [];

    switch (targetFilter) {
      case 'active':
        sql += ` AND status = 'active'`;
        break;
      case 'inactive':
        sql += ` AND status IN ('suspended', 'banned')`;
        break;
      case 'verified':
        sql += ` AND is_verified = 1 AND status = 'active'`;
        break;
      case 'new_users': {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        sql += ` AND created_at >= ? AND status = 'active'`;
        params.push(thirtyDaysAgo);
        break;
      }
      case 'creators':
        sql += ` AND role = 'creator' AND status = 'active'`;
        break;
      case 'coin_users':
        sql += ` AND coins_balance > 0 AND status = 'active'`;
        break;
      default:
        sql += ` AND status = 'active'`;
        break;
    }

    const rows = queryDbAll(db, sql, params);
    recipientUserIds = rows.map((r) => r.id);
  }

  // Deduplicate user IDs
  const uniqueUserIds = Array.from(new Set(recipientUserIds.filter(Boolean)));

  // Populate batch queue
  const now = new Date().toISOString();
  for (const uid of uniqueUserIds) {
    const qId = 'cq_' + campaignId + '_' + uid;
    runDb(
      db,
      `INSERT OR IGNORE INTO notification_campaign_queue (
        id, campaign_id, user_id, status, sent_at
      ) VALUES (?, ?, ?, 'pending', NULL)`,
      [qId, campaignId, uid]
    );
  }

  runDb(
    db,
    `UPDATE notification_campaigns
     SET total_recipients = ?, status = 'processing', updated_at = ?
     WHERE id = ?`,
    [uniqueUserIds.length, now, campaignId]
  );
}

// ----------------------------------------------------------------------
// BATCH QUEUE PROCESSING ROUTINE (PREVENTS EVENT LOOP BLOCKING)
// ----------------------------------------------------------------------

export function processNotificationCampaignQueueBatch(
  db: SqlJsDatabase,
  io: any,
  batchSize = 100
): number {
  const nowIso = new Date().toISOString();

  // Pick up queue items that are pending and belong to active processing/queued campaigns whose scheduled time is reached
  const queueItems = queryDbAll(
    db,
    `SELECT q.id as queue_id, q.campaign_id, q.user_id,
            c.title, c.message, c.image_url, c.deep_link, c.priority, c.expires_at, c.created_by
     FROM notification_campaign_queue q
     JOIN notification_campaigns c ON q.campaign_id = c.id
     WHERE q.status = 'pending'
       AND c.status IN ('queued', 'processing')
       AND (c.scheduled_at IS NULL OR c.scheduled_at <= ?)
     LIMIT ?`,
    [nowIso, batchSize]
  );

  if (queueItems.length === 0) {
    // Check if any campaigns marked processing have completed all pending items
    const activeCampaigns = queryDbAll(
      db,
      `SELECT id FROM notification_campaigns WHERE status IN ('queued', 'processing')`
    );

    for (const c of activeCampaigns) {
      const pendingCountRow = queryDbOne(
        db,
        `SELECT COUNT(*) as cnt FROM notification_campaign_queue WHERE campaign_id = ? AND status = 'pending'`,
        [c.id]
      );
      if (pendingCountRow && pendingCountRow.cnt === 0) {
        runDb(
          db,
          `UPDATE notification_campaigns SET status = 'completed', updated_at = ? WHERE id = ?`,
          [nowIso, c.id]
        );
      }
    }
    return 0;
  }

  let processedCount = 0;

  for (const item of queueItems) {
    const {
      queue_id,
      campaign_id,
      user_id,
      title,
      message,
      image_url,
      deep_link,
      priority,
      expires_at,
      created_by,
    } = item;

    // Check Campaign Expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      runDb(
        db,
        `UPDATE notification_campaign_queue
         SET status = 'failed', error_message = 'Campaign expired before delivery', sent_at = ?
         WHERE id = ?`,
        [nowIso, queue_id]
      );
      runDb(
        db,
        `UPDATE notification_campaigns SET failed_count = failed_count + 1 WHERE id = ?`,
        [campaign_id]
      );
      continue;
    }

    // Check User Notification Preferences & Mute Settings
    const prefRow = queryDbOne(
      db,
      'SELECT in_app_enabled, pref_admin_announcement FROM notification_preferences WHERE user_id = ?',
      [user_id]
    );

    if (prefRow) {
      if (prefRow.in_app_enabled === 0 || prefRow.pref_admin_announcement === 0) {
        runDb(
          db,
          `UPDATE notification_campaign_queue
           SET status = 'failed', error_message = 'Muted by user preferences', sent_at = ?
           WHERE id = ?`,
          [nowIso, queue_id]
        );
        runDb(
          db,
          `UPDATE notification_campaigns SET failed_count = failed_count + 1 WHERE id = ?`,
          [campaign_id]
        );
        continue;
      }
    }

    // Anti-Spam Frequency Cap Enforcement (Prevent flooding > 30 notifications / 24 hours per user)
    const recentNotifCount = queryDbOne(
      db,
      `SELECT COUNT(*) as cnt FROM notifications
       WHERE user_id = ? AND created_at >= ?`,
      [user_id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]
    );

    if (recentNotifCount && recentNotifCount.cnt > 40 && priority !== 'urgent') {
      runDb(
        db,
        `UPDATE notification_campaign_queue
         SET status = 'failed', error_message = 'Anti-spam daily rate limit reached', sent_at = ?
         WHERE id = ?`,
        [nowIso, queue_id]
      );
      runDb(
        db,
        `UPDATE notification_campaigns SET failed_count = failed_count + 1 WHERE id = ?`,
        [campaign_id]
      );
      continue;
    }

    // Create Notification Record in notifications table
    const notifId = 'notif_cmp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const metadataObj = {
      route: 'announcement',
      campaignId: campaign_id,
      deepLink: deep_link || undefined,
      imageUrl: image_url || undefined,
      priority: priority || 'normal',
    };

    runDb(
      db,
      `INSERT INTO notifications (
        id, user_id, sender_id, type, reference_id, reference_type, message,
        is_read, metadata, campaign_id, title, image_url, deep_link, priority,
        expires_at, created_at
      ) VALUES (?, ?, ?, 'admin_announcement', ?, 'campaign', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notifId,
        user_id,
        created_by || 'user_admin',
        campaign_id,
        message,
        JSON.stringify(metadataObj),
        campaign_id,
        title,
        image_url || null,
        deep_link || null,
        priority || 'normal',
        expires_at || null,
        nowIso,
      ]
    );

    // Update Queue record
    runDb(
      db,
      `UPDATE notification_campaign_queue
       SET status = 'delivered', notification_id = ?, sent_at = ?, delivered_at = ?
       WHERE id = ?`,
      [notifId, nowIso, nowIso, queue_id]
    );

    // Increment Campaign Counters
    runDb(
      db,
      `UPDATE notification_campaigns
       SET sent_count = sent_count + 1, delivered_count = delivered_count + 1, updated_at = ?
       WHERE id = ?`,
      [nowIso, campaign_id]
    );

    // Emit Real-Time Socket.IO event to target user's socket room
    if (io) {
      const sender = queryDbOne(
        db,
        'SELECT id, username, full_name, avatar_url, badge FROM users WHERE id = ?',
        [created_by || 'user_admin']
      );

      const formattedNotif = {
        id: notifId,
        userId: user_id,
        senderId: created_by || 'user_admin',
        sender: sender
          ? {
              id: sender.id,
              username: sender.username,
              fullName: sender.full_name,
              avatarUrl: sender.avatar_url,
              badge: sender.badge,
            }
          : { id: 'user_admin', username: 'admin', fullName: 'Nixo Admin', avatarUrl: '' },
        type: 'admin_announcement',
        title,
        message,
        imageUrl: image_url || undefined,
        deepLink: deep_link || undefined,
        priority: priority || 'normal',
        isRead: false,
        metadata: metadataObj,
        createdAt: nowIso,
      };

      io.to(`user_${user_id}`).emit('new_notification', formattedNotif);

      const unreadCountRow = queryDbOne(
        db,
        'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0',
        [user_id]
      );
      io.to(`user_${user_id}`).emit('unread_count_updated', {
        unreadCount: unreadCountRow ? unreadCountRow.cnt : 0,
      });
    }

    processedCount++;
  }

  return processedCount;
}

// ----------------------------------------------------------------------
// ADMIN CAMPAIGN MANAGEMENT APIS
// ----------------------------------------------------------------------

export function getCampaignsList(db: SqlJsDatabase, search = '') {
  let sql = `SELECT * FROM notification_campaigns`;
  const params: any[] = [];

  if (search && search.trim()) {
    sql += ` WHERE title LIKE ? OR message LIKE ?`;
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  sql += ` ORDER BY created_at DESC`;

  const campaigns = queryDbAll(db, sql, params);

  return campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    message: c.message,
    imageUrl: c.image_url,
    deepLink: c.deep_link,
    priority: c.priority,
    targetType: c.target_type,
    targetFilter: c.target_filter,
    targetId: c.target_id,
    customUserIds: c.custom_user_ids ? JSON.parse(c.custom_user_ids) : [],
    status: c.status,
    totalRecipients: c.total_recipients,
    sentCount: c.sent_count,
    deliveredCount: c.delivered_count,
    readCount: c.read_count,
    failedCount: c.failed_count,
    scheduledAt: c.scheduled_at,
    expiresAt: c.expires_at,
    createdBy: c.created_by,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export function getCampaignDetailsAndLogs(db: SqlJsDatabase, campaignId: string) {
  const c = queryDbOne(db, 'SELECT * FROM notification_campaigns WHERE id = ?', [campaignId]);
  if (!c) throw new Error('Campaign not found');

  const logs = queryDbAll(
    db,
    `SELECT q.id, q.campaign_id, q.user_id, q.status, q.error_message, q.sent_at, q.delivered_at, q.read_at,
            u.username, u.full_name, u.avatar_url, u.email
     FROM notification_campaign_queue q
     LEFT JOIN users u ON q.user_id = u.id
     WHERE q.campaign_id = ?
     ORDER BY q.sent_at DESC
     LIMIT 500`,
    [campaignId]
  );

  return {
    campaign: {
      id: c.id,
      title: c.title,
      message: c.message,
      imageUrl: c.image_url,
      deepLink: c.deep_link,
      priority: c.priority,
      targetType: c.target_type,
      targetFilter: c.target_filter,
      targetId: c.target_id,
      customUserIds: c.custom_user_ids ? JSON.parse(c.custom_user_ids) : [],
      status: c.status,
      totalRecipients: c.total_recipients,
      sentCount: c.sent_count,
      deliveredCount: c.delivered_count,
      readCount: c.read_count,
      failedCount: c.failed_count,
      scheduledAt: c.scheduled_at,
      expiresAt: c.expires_at,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    },
    logs: logs.map((l) => ({
      id: l.id,
      campaignId: l.campaign_id,
      userId: l.user_id,
      username: l.username || 'user',
      fullName: l.full_name || 'Nixo User',
      avatarUrl: l.avatar_url || '',
      email: l.email || '',
      status: l.status,
      errorMessage: l.error_message,
      sentAt: l.sent_at,
      deliveredAt: l.delivered_at,
      readAt: l.read_at,
    })),
  };
}

export function cancelCampaign(db: SqlJsDatabase, campaignId: string) {
  const now = new Date().toISOString();
  runDb(
    db,
    `UPDATE notification_campaigns SET status = 'cancelled', updated_at = ? WHERE id = ?`,
    [now, campaignId]
  );
  runDb(
    db,
    `UPDATE notification_campaign_queue SET status = 'failed', error_message = 'Campaign cancelled by admin' WHERE campaign_id = ? AND status = 'pending'`,
    [campaignId]
  );
}

export function deleteCampaign(db: SqlJsDatabase, campaignId: string) {
  runDb(db, 'DELETE FROM notification_campaign_queue WHERE campaign_id = ?', [campaignId]);
  runDb(db, 'DELETE FROM notification_campaigns WHERE id = ?', [campaignId]);
}

// ----------------------------------------------------------------------
// TEMPLATES MANAGEMENT
// ----------------------------------------------------------------------

export function getTemplatesList(db: SqlJsDatabase) {
  const templates = queryDbAll(db, 'SELECT * FROM notification_templates ORDER BY created_at DESC');
  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    title: t.title,
    message: t.message,
    imageUrl: t.image_url,
    deepLink: t.deep_link,
    priority: t.priority,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

export function createNotificationTemplate(db: SqlJsDatabase, data: any, createdBy: string) {
  const { name, category = 'general', title, message, imageUrl, deepLink, priority = 'normal' } = data;
  if (!name || !title || !message) {
    throw new Error('Name, title, and message are required for template creation');
  }

  const id = 'tmpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO notification_templates (
      id, name, category, title, message, image_url, deep_link, priority, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name.trim(),
      category,
      title.trim(),
      message.trim(),
      imageUrl || null,
      deepLink || null,
      priority || 'normal',
      createdBy,
      now,
      now,
    ]
  );

  return queryDbOne(db, 'SELECT * FROM notification_templates WHERE id = ?', [id]);
}

export function updateNotificationTemplate(db: SqlJsDatabase, templateId: string, data: any) {
  const { name, category, title, message, imageUrl, deepLink, priority } = data;
  const now = new Date().toISOString();

  runDb(
    db,
    `UPDATE notification_templates SET
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       title = COALESCE(?, title),
       message = COALESCE(?, message),
       image_url = COALESCE(?, image_url),
       deep_link = COALESCE(?, deep_link),
       priority = COALESCE(?, priority),
       updated_at = ?
     WHERE id = ?`,
    [
      name ? name.trim() : null,
      category || null,
      title ? title.trim() : null,
      message ? message.trim() : null,
      imageUrl !== undefined ? imageUrl : null,
      deepLink !== undefined ? deepLink : null,
      priority || null,
      now,
      templateId,
    ]
  );

  return queryDbOne(db, 'SELECT * FROM notification_templates WHERE id = ?', [templateId]);
}

export function deleteNotificationTemplate(db: SqlJsDatabase, templateId: string) {
  runDb(db, 'DELETE FROM notification_templates WHERE id = ?', [templateId]);
}

// ----------------------------------------------------------------------
// STATS & ANALYTICS
// ----------------------------------------------------------------------

export function getNotificationCenterStats(db: SqlJsDatabase) {
  const totalSentRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications');
  const activeCampaignsRow = queryDbOne(
    db,
    `SELECT COUNT(*) as cnt FROM notification_campaigns WHERE status IN ('queued', 'processing')`
  );
  const totalCampaignsRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notification_campaigns');

  const deliveredQueueRow = queryDbOne(
    db,
    `SELECT COUNT(*) as cnt FROM notification_campaign_queue WHERE status = 'delivered'`
  );

  const readQueueRow = queryDbOne(
    db,
    `SELECT COUNT(*) as cnt FROM notification_campaign_queue WHERE status = 'read' OR read_at IS NOT NULL`
  );

  const failedQueueRow = queryDbOne(
    db,
    `SELECT COUNT(*) as cnt FROM notification_campaign_queue WHERE status = 'failed'`
  );

  const templatesRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notification_templates');

  return {
    totalSent: totalSentRow ? totalSentRow.cnt : 0,
    totalCampaigns: totalCampaignsRow ? totalCampaignsRow.cnt : 0,
    activeCampaigns: activeCampaignsRow ? activeCampaignsRow.cnt : 0,
    deliveredQueueCount: deliveredQueueRow ? deliveredQueueRow.cnt : 0,
    readQueueCount: readQueueRow ? readQueueRow.cnt : 0,
    failedQueueCount: failedQueueRow ? failedQueueRow.cnt : 0,
    templatesCount: templatesRow ? templatesRow.cnt : 0,
  };
}
