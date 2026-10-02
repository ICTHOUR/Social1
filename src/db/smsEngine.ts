import crypto from 'crypto';
import { Database } from 'sql.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';
import { SmsGatewayRegistry } from '../sms/SmsGatewayRegistry.js';
import { BulkSmsBdProvider } from '../sms/BulkSmsBdProvider.js';
import {
  SmsCampaign,
  SmsMessageRecord,
  SmsOptions,
  SmsStatus,
  SmsTargetAudienceType,
  SmsTemplate,
} from '../sms/types.js';

/**
 * Ensures all SMS persistent tables are initialized and default templates seeded
 */
export function ensureSmsTables(db: Database): void {
  // 1. Provider Settings Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS sms_providers (
      gateway_id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1,
      is_test_mode INTEGER DEFAULT 1,
      api_key TEXT,
      sender_id TEXT,
      api_url TEXT,
      rate_limit INTEGER DEFAULT 60,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Templates Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS sms_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Campaigns Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      audience_type TEXT NOT NULL,
      target_filter_json TEXT,
      template_id TEXT,
      message_content TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      scheduled_at TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  // 4. Messages Table (Audit Log)
  runDb(db, `
    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      user_id TEXT,
      user_name TEXT,
      phone_number TEXT NOT NULL,
      message TEXT NOT NULL,
      sms_type TEXT DEFAULT 'plain',
      status TEXT DEFAULT 'pending',
      provider_name TEXT NOT NULL,
      provider_msg_id TEXT,
      error_code TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      sent_at TEXT,
      delivered_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Delivery Logs Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS sms_delivery_logs (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_msg_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default BulkSMSBD settings if not exists
  const existingProvider = queryDbOne(db, 'SELECT gateway_id FROM sms_providers WHERE gateway_id = "bulksmsbd"');
  if (!existingProvider) {
    const now = new Date().toISOString();
    runDb(
      db,
      `INSERT INTO sms_providers (gateway_id, is_enabled, is_test_mode, api_key, sender_id, api_url, rate_limit, updated_at)
       VALUES ('bulksmsbd', 1, 1, 'demo_bulksmsbd_api_key_883921', 'NixoBD', 'http://bulksmsbd.net/api/smsapi', 60, ?)`,
      [now]
    );
  }

  // Seed Default SMS System Templates if empty
  const templateCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM sms_templates');
  if (!templateCount || templateCount.cnt === 0) {
    const now = new Date().toISOString();
    const defaultTemplates = [
      {
        id: 'tmpl_otp_verification',
        name: 'OTP Security Code',
        category: 'otp',
        content: 'Your {app_name} security code is: {otp_code}. Valid for 5 minutes. Do not share with anyone.',
        is_system: 1,
      },
      {
        id: 'tmpl_welcome_user',
        name: 'Welcome to Platform',
        category: 'welcome',
        content: 'Welcome {user_name} to {app_name}! Your account is now active. Enjoy exploring!',
        is_system: 1,
      },
      {
        id: 'tmpl_payment_payout',
        name: 'Payout Confirmation',
        category: 'transactional',
        content: 'Hi {user_name}, your payout request of {amount} BDT has been successfully processed.',
        is_system: 1,
      },
      {
        id: 'tmpl_admin_announcement',
        name: 'Platform Broadcast Announcement',
        category: 'announcement',
        content: 'Announcement from {app_name}: {announcement_text}. Thank you for being with us!',
        is_system: 1,
      },
      {
        id: 'tmpl_account_suspended',
        name: 'Account Suspension Alert',
        category: 'alert',
        content: 'Alert: Your {app_name} account has been temporarily suspended due to a terms violation.',
        is_system: 1,
      },
    ];

    for (const t of defaultTemplates) {
      runDb(
        db,
        `INSERT INTO sms_templates (id, name, category, content, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.name, t.category, t.content, t.is_system, now, now]
      );
    }
  }

  saveDbSync();
}

// -------------------------------------------------------------
// SMS SETTINGS MANAGEMENT
// -------------------------------------------------------------

export function getSmsProviderSettings(db: Database) {
  ensureSmsTables(db);
  const row = queryDbOne(db, 'SELECT * FROM sms_providers WHERE gateway_id = "bulksmsbd"');
  const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd') as BulkSmsBdProvider;

  if (!row) {
    return provider.getConfig();
  }

  return {
    gatewayId: 'bulksmsbd',
    name: provider.name,
    isEnabled: Boolean(row.is_enabled),
    isTestMode: Boolean(row.is_test_mode),
    senderId: row.sender_id || 'NixoBD',
    apiUrl: row.api_url || 'http://bulksmsbd.net/api/smsapi',
    rateLimitPerMinute: row.rate_limit || 60,
    apiKeyMasked: row.api_key ? '••••••••' + row.api_key.slice(-4) : '',
    updatedAt: row.updated_at,
  };
}

export function updateSmsProviderSettings(
  db: Database,
  settings: {
    isEnabled?: boolean;
    isTestMode?: boolean;
    apiKey?: string;
    senderId?: string;
    apiUrl?: string;
    rateLimitPerMinute?: number;
  }
) {
  ensureSmsTables(db);
  const now = new Date().toISOString();
  const current = queryDbOne(db, 'SELECT * FROM sms_providers WHERE gateway_id = "bulksmsbd"');

  const isEnabled = settings.isEnabled !== undefined ? (settings.isEnabled ? 1 : 0) : (current ? current.is_enabled : 1);
  const isTestMode = settings.isTestMode !== undefined ? (settings.isTestMode ? 1 : 0) : (current ? current.is_test_mode : 1);
  const senderId = settings.senderId !== undefined ? settings.senderId : (current?.sender_id || 'NixoBD');
  const apiUrl = settings.apiUrl !== undefined ? settings.apiUrl : (current?.api_url || 'http://bulksmsbd.net/api/smsapi');
  const rateLimit = settings.rateLimitPerMinute || current?.rate_limit || 60;

  let apiKey = current?.api_key || 'demo_bulksmsbd_api_key_883921';
  if (settings.apiKey && !settings.apiKey.startsWith('••••')) {
    apiKey = settings.apiKey.trim();
  }

  runDb(
    db,
    `INSERT INTO sms_providers (gateway_id, is_enabled, is_test_mode, api_key, sender_id, api_url, rate_limit, updated_at)
     VALUES ('bulksmsbd', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(gateway_id) DO UPDATE SET
       is_enabled = ?, is_test_mode = ?, api_key = ?, sender_id = ?, api_url = ?, rate_limit = ?, updated_at = ?`,
    [
      isEnabled, isTestMode, apiKey, senderId, apiUrl, rateLimit, now,
      isEnabled, isTestMode, apiKey, senderId, apiUrl, rateLimit, now
    ]
  );

  // Sync active runtime instance
  try {
    const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd') as BulkSmsBdProvider;
    provider.updateConfig({
      isEnabled: Boolean(isEnabled),
      isTestMode: Boolean(isTestMode),
      apiKey,
      senderId,
      apiUrl,
      rateLimitPerMinute: rateLimit,
    });
  } catch (e) {
    console.warn('Runtime provider update warning:', e);
  }

  saveDbSync();
  return getSmsProviderSettings(db);
}

// -------------------------------------------------------------
// RATE LIMITING HELPERS
// -------------------------------------------------------------

export function checkOtpRateLimit(db: Database, phoneNumber: string, maxPer5Min: number = 3): { allowed: boolean; remainingSeconds?: number } {
  ensureSmsTables(db);
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const recentCount = queryDbOne(
    db,
    `SELECT COUNT(*) as cnt FROM sms_messages WHERE phone_number = ? AND sms_type = 'otp' AND created_at >= ?`,
    [phoneNumber, fiveMinAgo]
  );

  if (recentCount && recentCount.cnt >= maxPer5Min) {
    return { allowed: false, remainingSeconds: 300 };
  }

  return { allowed: true };
}

// -------------------------------------------------------------
// SINGLE & TRANSACTIONAL SMS DISPATCH & AUDIT
// -------------------------------------------------------------

export async function sendAuditedSingleSms(
  db: Database,
  options: {
    phoneNumber: string;
    message: string;
    userId?: string;
    userName?: string;
    smsType?: 'plain' | 'unicode' | 'otp' | 'transactional';
    campaignId?: string;
  }
) {
  ensureSmsTables(db);
  const now = new Date().toISOString();
  const msgId = `SMS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd') as BulkSmsBdProvider;
  const cleanPhone = provider.sanitizePhoneNumber(options.phoneNumber);

  // Rate-limiting check if OTP
  if (options.smsType === 'otp') {
    const rateCheck = checkOtpRateLimit(db, cleanPhone);
    if (!rateCheck.allowed) {
      throw new Error('OTP rate limit exceeded. Please wait 5 minutes before requesting a new OTP.');
    }
  }

  // Insert Pending Record
  runDb(
    db,
    `INSERT INTO sms_messages (id, campaign_id, user_id, user_name, phone_number, message, sms_type, status, provider_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      msgId,
      options.campaignId || null,
      options.userId || null,
      options.userName || null,
      cleanPhone,
      options.message,
      options.smsType || 'plain',
      provider.name,
      now,
    ]
  );

  // Call Provider API
  const result = await provider.sendSingleSms({
    recipient: cleanPhone,
    message: options.message,
    type: options.smsType === 'unicode' ? 'unicode' : 'plain',
    referenceId: msgId,
  });

  const updatedStatus = result.status;
  const sentTime = result.success ? new Date().toISOString() : null;

  // Update Record with Provider Status
  runDb(
    db,
    `UPDATE sms_messages SET
      status = ?,
      provider_msg_id = ?,
      error_code = ?,
      error_message = ?,
      sent_at = ?
     WHERE id = ?`,
    [
      updatedStatus,
      result.providerMessageId || null,
      result.responseCode || null,
      result.error || null,
      sentTime,
      msgId,
    ]
  );

  // Record Delivery Audit Log
  runDb(
    db,
    `INSERT INTO sms_delivery_logs (id, message_id, status, provider_msg_id, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `DLR-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      msgId,
      updatedStatus,
      result.providerMessageId || null,
      JSON.stringify(result.responseRaw || { error: result.error }),
      now,
    ]
  );

  saveDbSync();

  return {
    id: msgId,
    phoneNumber: cleanPhone,
    status: updatedStatus,
    providerMessageId: result.providerMessageId,
    error: result.error,
  };
}

// -------------------------------------------------------------
// CAMPAIGNS & BULK SMS DISPATCH
// -------------------------------------------------------------

export function getAudienceTargetUsers(
  db: Database,
  audienceType: SmsTargetAudienceType,
  filterJson?: string
): Array<{ id?: string; full_name?: string; phone?: string }> {
  ensureSmsTables(db);

  if (audienceType === 'all_users') {
    return queryDbAll(db, `SELECT id, full_name, phone FROM users WHERE phone IS NOT NULL AND LENGTH(phone) >= 10`);
  }

  if (audienceType === 'active_users') {
    return queryDbAll(db, `SELECT id, full_name, phone FROM users WHERE (status IS NULL OR status != 'suspended') AND phone IS NOT NULL AND LENGTH(phone) >= 10`);
  }

  if (audienceType === 'suspended_users') {
    return queryDbAll(db, `SELECT id, full_name, phone FROM users WHERE status = 'suspended' AND phone IS NOT NULL AND LENGTH(phone) >= 10`);
  }

  if (audienceType === 'specific_users' && filterJson) {
    try {
      const parsed = JSON.parse(filterJson);
      if (Array.isArray(parsed.userIds) && parsed.userIds.length > 0) {
        const placeholders = parsed.userIds.map(() => '?').join(',');
        return queryDbAll(db, `SELECT id, full_name, phone FROM users WHERE id IN (${placeholders}) AND phone IS NOT NULL`, parsed.userIds);
      }
    } catch (e) {
      console.warn('Error parsing specific_users filter:', e);
    }
  }

  if (audienceType === 'group_members' && filterJson) {
    try {
      const parsed = JSON.parse(filterJson);
      if (parsed.communityId) {
        return queryDbAll(
          db,
          `SELECT u.id, u.full_name, u.phone
           FROM community_members cm
           JOIN users u ON cm.user_id = u.id
           WHERE cm.community_id = ? AND u.phone IS NOT NULL`,
          [parsed.communityId]
        );
      }
    } catch (e) {
      console.warn('Error parsing group_members filter:', e);
    }
  }

  if (audienceType === 'custom_numbers' && filterJson) {
    try {
      const parsed = JSON.parse(filterJson);
      if (Array.isArray(parsed.phoneNumbers)) {
        return parsed.phoneNumbers.map((p: string) => ({ phone: p.trim() }));
      }
    } catch (e) {
      console.warn('Error parsing custom_numbers filter:', e);
    }
  }

  return [];
}

export async function executeSmsCampaign(db: Database, campaignId: string) {
  ensureSmsTables(db);
  const now = new Date().toISOString();

  const campaign = queryDbOne(db, 'SELECT * FROM sms_campaigns WHERE id = ?', [campaignId]);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Update status to processing
  runDb(db, 'UPDATE sms_campaigns SET status = "processing" WHERE id = ?', [campaignId]);

  const targetUsers = getAudienceTargetUsers(db, campaign.audience_type as SmsTargetAudienceType, campaign.target_filter_json);
  const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd') as BulkSmsBdProvider;

  let sent = 0;
  let failed = 0;
  let delivered = 0;

  for (const target of targetUsers) {
    if (!target.phone) continue;

    const formattedMessage = campaign.message_content
      .replace(/\{user_name\}/g, target.full_name || 'Valued Member')
      .replace(/\{app_name\}/g, 'Nixo');

    try {
      const res = await sendAuditedSingleSms(db, {
        phoneNumber: target.phone,
        message: formattedMessage,
        userId: target.id,
        userName: target.full_name,
        smsType: 'plain',
        campaignId,
      });

      if (res.status === 'sent' || res.status === 'delivered') {
        sent++;
        if (res.status === 'delivered') delivered++;
      } else {
        failed++;
      }
    } catch (err: any) {
      failed++;
    }
  }

  const finalStatus = failed === targetUsers.length ? 'failed' : 'completed';

  runDb(
    db,
    `UPDATE sms_campaigns SET
      status = ?,
      total_recipients = ?,
      sent_count = ?,
      delivered_count = ?,
      failed_count = ?,
      completed_at = ?
     WHERE id = ?`,
    [finalStatus, targetUsers.length, sent, delivered, failed, new Date().toISOString(), campaignId]
  );

  saveDbSync();

  return {
    campaignId,
    total: targetUsers.length,
    sent,
    failed,
    delivered,
  };
}

// -------------------------------------------------------------
// TEMPLATES MANAGEMENT
// -------------------------------------------------------------

export function getSmsTemplates(db: Database): SmsTemplate[] {
  ensureSmsTables(db);
  const rows = queryDbAll(db, 'SELECT * FROM sms_templates ORDER BY is_system DESC, name ASC');
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    content: r.content,
    isSystem: Boolean(r.is_system),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveSmsTemplate(
  db: Database,
  template: { id?: string; name: string; category: any; content: string }
) {
  ensureSmsTables(db);
  const now = new Date().toISOString();
  const id = template.id || `tmpl_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

  runDb(
    db,
    `INSERT INTO sms_templates (id, name, category, content, is_system, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = ?, category = ?, content = ?, updated_at = ?`,
    [id, template.name, template.category, template.content, now, now, template.name, template.category, template.content, now]
  );

  saveDbSync();
  return queryDbOne(db, 'SELECT * FROM sms_templates WHERE id = ?', [id]);
}

export function deleteSmsTemplate(db: Database, id: string) {
  ensureSmsTables(db);
  const existing = queryDbOne(db, 'SELECT is_system FROM sms_templates WHERE id = ?', [id]);
  if (existing && existing.is_system) {
    throw new Error('System SMS templates cannot be deleted.');
  }
  runDb(db, 'DELETE FROM sms_templates WHERE id = ?', [id]);
  saveDbSync();
}

// -------------------------------------------------------------
// RETRY FAILED SMS
// -------------------------------------------------------------

export async function retryFailedSmsMessage(db: Database, messageId: string) {
  ensureSmsTables(db);
  const msg = queryDbOne(db, 'SELECT * FROM sms_messages WHERE id = ?', [messageId]);
  if (!msg) {
    throw new Error(`SMS message ${messageId} not found`);
  }

  const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd') as BulkSmsBdProvider;
  const result = await provider.sendSingleSms({
    recipient: msg.phone_number,
    message: msg.message,
    referenceId: msg.id,
  });

  const now = new Date().toISOString();
  const newRetryCount = (msg.retry_count || 0) + 1;

  runDb(
    db,
    `UPDATE sms_messages SET
      status = ?,
      provider_msg_id = ?,
      error_code = ?,
      error_message = ?,
      retry_count = ?,
      sent_at = ?
     WHERE id = ?`,
    [
      result.status,
      result.providerMessageId || null,
      result.responseCode || null,
      result.error || null,
      newRetryCount,
      result.success ? now : msg.sent_at,
      messageId,
    ]
  );

  runDb(
    db,
    `INSERT INTO sms_delivery_logs (id, message_id, status, provider_msg_id, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `DLR-RETRY-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      messageId,
      result.status,
      result.providerMessageId || null,
      JSON.stringify({ retry: true, retryCount: newRetryCount, raw: result.responseRaw || { error: result.error } }),
      now,
    ]
  );

  saveDbSync();

  return {
    messageId,
    status: result.status,
    retryCount: newRetryCount,
    error: result.error,
  };
}
