import { Express, Request, Response } from 'express';
import { Database } from 'sql.js';
import crypto from 'crypto';
import {
  deleteSmsTemplate,
  executeSmsCampaign,
  getAudienceTargetUsers,
  getSmsProviderSettings,
  getSmsTemplates,
  retryFailedSmsMessage,
  saveSmsTemplate,
  sendAuditedSingleSms,
  updateSmsProviderSettings,
  ensureSmsTables,
} from '../db/smsEngine.js';
import { SmsGatewayRegistry } from './SmsGatewayRegistry.js';
import { BulkSmsBdProvider } from './BulkSmsBdProvider.js';
import { SmsTargetAudienceType } from './types.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from '../db/database.js';

export function registerSmsRoutes(app: Express, db: Database) {
  ensureSmsTables(db);

  // Helper middleware check for authenticated user
  const getUserFromReq = (req: Request) => (req as any).user;

  // -------------------------------------------------------------
  // 1. SINGLE SMS & TRANSACTIONAL SMS DISPATCH
  // -------------------------------------------------------------
  app.post('/api/sms/send-single', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, message, smsType = 'plain', userId, userName } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
      }

      const result = await sendAuditedSingleSms(db, {
        phoneNumber,
        message,
        userId,
        userName,
        smsType,
      });

      res.json({ success: result.status === 'sent' || result.status === 'delivered', result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to dispatch single SMS' });
    }
  });

  // -------------------------------------------------------------
  // 2. OTP DISPATCH WITH RATE LIMITING
  // -------------------------------------------------------------
  app.post('/api/sms/send-otp', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, otpCode } = req.body;
      if (!phoneNumber || !otpCode) {
        return res.status(400).json({ error: 'phoneNumber and otpCode are required' });
      }

      const message = `Your Nixo security verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`;

      const result = await sendAuditedSingleSms(db, {
        phoneNumber,
        message,
        smsType: 'otp',
      });

      res.json({
        success: result.status === 'sent' || result.status === 'delivered',
        message: 'OTP dispatch initiated',
        result,
      });
    } catch (err: any) {
      res.status(429).json({ error: err.message || 'OTP rate limit or dispatch error' });
    }
  });

  // -------------------------------------------------------------
  // 3. ADMIN SETTINGS & PROVIDER CONFIGURATION
  // -------------------------------------------------------------
  app.get('/api/admin/sms/settings', (req: Request, res: Response) => {
    try {
      const settings = getSmsProviderSettings(db);
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load SMS settings' });
    }
  });

  app.put('/api/admin/sms/settings', (req: Request, res: Response) => {
    try {
      const { isEnabled, isTestMode, apiKey, senderId, apiUrl, rateLimitPerMinute } = req.body;

      const updated = updateSmsProviderSettings(db, {
        isEnabled,
        isTestMode,
        apiKey,
        senderId,
        apiUrl,
        rateLimitPerMinute: rateLimitPerMinute ? Number(rateLimitPerMinute) : undefined,
      });

      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update SMS settings' });
    }
  });

  // -------------------------------------------------------------
  // 4. ADMIN TEST SMS DISPATCH
  // -------------------------------------------------------------
  app.post('/api/admin/sms/test-sms', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, customMessage } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber is required for Test SMS' });
      }

      const message = customMessage || 'Test SMS from Nixo BulkSMSBD Gateway Integration. Connection verified!';

      const result = await sendAuditedSingleSms(db, {
        phoneNumber,
        message,
        smsType: 'plain',
        userName: 'Admin Test User',
      });

      res.json({
        success: result.status === 'sent' || result.status === 'delivered',
        message: result.status === 'delivered' ? 'Test SMS Sent & Delivered!' : 'Test SMS Dispatched',
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test SMS failed' });
    }
  });

  // -------------------------------------------------------------
  // 5. SMS BALANCE CHECK
  // -------------------------------------------------------------
  app.get('/api/admin/sms/balance', async (req: Request, res: Response) => {
    try {
      const provider = SmsGatewayRegistry.getInstance().getProvider('bulksmsbd');
      const balanceData = await provider.getBalance();
      res.json(balanceData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to query SMS balance' });
    }
  });

  // -------------------------------------------------------------
  // 6. TEMPLATES MANAGEMENT
  // -------------------------------------------------------------
  app.get('/api/admin/sms/templates', (req: Request, res: Response) => {
    try {
      const templates = getSmsTemplates(db);
      res.json({ templates });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch SMS templates' });
    }
  });

  app.post('/api/admin/sms/templates', (req: Request, res: Response) => {
    try {
      const { id, name, category, content } = req.body;
      if (!name || !content) {
        return res.status(400).json({ error: 'name and content are required' });
      }

      const template = saveSmsTemplate(db, { id, name, category: category || 'custom', content });
      res.json({ success: true, template });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save SMS template' });
    }
  });

  app.delete('/api/admin/sms/templates/:id', (req: Request, res: Response) => {
    try {
      deleteSmsTemplate(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete template' });
    }
  });

  // -------------------------------------------------------------
  // 7. CAMPAIGN CREATION & BROADCAST
  // -------------------------------------------------------------
  app.post('/api/admin/sms/campaigns', async (req: Request, res: Response) => {
    try {
      const { title, audienceType, filterJson, templateId, messageContent, scheduleAt } = req.body;

      if (!title || !audienceType || !messageContent) {
        return res.status(400).json({ error: 'title, audienceType, and messageContent are required' });
      }

      const campaignId = `CMP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const now = new Date().toISOString();

      const targets = getAudienceTargetUsers(db, audienceType as SmsTargetAudienceType, filterJson);

      runDb(
        db,
        `INSERT INTO sms_campaigns (
          id, title, audience_type, target_filter_json, template_id, message_content, status, total_recipients, scheduled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignId,
          title,
          audienceType,
          filterJson ? JSON.stringify(filterJson) : null,
          templateId || null,
          messageContent,
          scheduleAt ? 'scheduled' : 'processing',
          targets.length,
          scheduleAt || null,
          now,
        ]
      );

      saveDbSync();

      // If immediate execution, run campaign loop
      if (!scheduleAt) {
        executeSmsCampaign(db, campaignId).catch((err) => {
          console.error('Campaign background execution error:', err);
        });
      }

      res.json({
        success: true,
        campaignId,
        totalRecipients: targets.length,
        message: scheduleAt ? 'Campaign scheduled successfully' : 'Campaign execution started',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create campaign' });
    }
  });

  app.get('/api/admin/sms/campaigns', (req: Request, res: Response) => {
    try {
      const campaigns = queryDbAll(db, `SELECT * FROM sms_campaigns ORDER BY created_at DESC LIMIT 50`);
      res.json({ campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch campaigns' });
    }
  });

  // -------------------------------------------------------------
  // 8. AUDIT LOGS & MESSAGES LIST
  // -------------------------------------------------------------
  app.get('/api/admin/sms/messages', (req: Request, res: Response) => {
    try {
      const { status, campaignId, limit = '100' } = req.query;

      let sql = 'SELECT * FROM sms_messages WHERE 1=1';
      const params: any[] = [];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (campaignId) {
        sql += ' AND campaign_id = ?';
        params.push(campaignId);
      }

      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Number(limit));

      const messages = queryDbAll(db, sql, params);
      const deliveryLogs = queryDbAll(db, 'SELECT * FROM sms_delivery_logs ORDER BY created_at DESC LIMIT 50');

      res.json({ messages, deliveryLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load SMS messages' });
    }
  });

  // -------------------------------------------------------------
  // 9. RETRY FAILED SMS
  // -------------------------------------------------------------
  app.post('/api/admin/sms/retry/:messageId', async (req: Request, res: Response) => {
    try {
      const result = await retryFailedSmsMessage(db, req.params.messageId);
      res.json({ success: result.status === 'sent' || result.status === 'delivered', result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Retry failed' });
    }
  });

  // -------------------------------------------------------------
  // 10. COMMUNITY GROUPS & TARGETING HELPERS
  // -------------------------------------------------------------
  app.get('/api/admin/sms/groups', (req: Request, res: Response) => {
    try {
      const communities = queryDbAll(db, `
        SELECT c.id, c.name, COUNT(cm.id) as member_count
        FROM communities c
        LEFT JOIN community_members cm ON c.id = cm.community_id
        GROUP BY c.id
      `);
      const users = queryDbAll(db, `SELECT id, full_name, phone, status FROM users WHERE phone IS NOT NULL AND LENGTH(phone) >= 10`);

      res.json({ communities, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch groups and users for targeting' });
    }
  });
}
