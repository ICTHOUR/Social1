import { getDatabase, queryDbAll, queryDbOne, runDb } from './database.js';

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords?: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  type?: string;
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'waiting' | 'resolved' | 'closed';
  assigned_to?: string | null;
  attachment?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  // Join fields
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  assigned_agent_name?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin' | 'support_agent';
  message: string;
  attachment?: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface SupportChat {
  id: string;
  user_id: string;
  assigned_agent_id?: string | null;
  subject?: string | null;
  category: string;
  status: 'waiting' | 'active' | 'closed';
  first_response_at?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  // Join fields
  user_name?: string;
  user_username?: string;
  user_avatar?: string;
  assigned_agent_name?: string;
  assigned_agent_avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface SupportChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'user' | 'agent' | 'system';
  message: string;
  attachment?: string | null;
  is_read: number;
  read_at?: string | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export function ensureSupportTables(db: any) {
  // 1. Help articles table
  db.run(`
    CREATE TABLE IF NOT EXISTS help_articles (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT,
      views INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Ensure columns in support_tickets
  try { db.run("ALTER TABLE support_tickets ADD COLUMN category TEXT DEFAULT 'general';"); } catch (_) {}
  try { db.run("ALTER TABLE support_tickets ADD COLUMN assigned_to TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE support_tickets ADD COLUMN attachment TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE support_tickets ADD COLUMN closed_at TEXT;"); } catch (_) {}

  // 3. Ensure columns in support_messages
  try { db.run("ALTER TABLE support_messages ADD COLUMN attachment TEXT;"); } catch (_) {}

  // 4. Support live chats table
  db.run(`
    CREATE TABLE IF NOT EXISTS support_chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assigned_agent_id TEXT,
      subject TEXT,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'waiting',
      first_response_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Support live chat messages
  db.run(`
    CREATE TABLE IF NOT EXISTS support_chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment TEXT,
      is_read INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(chat_id) REFERENCES support_chats(id) ON DELETE CASCADE
    );
  `);

  // Seed default Help Articles if table is empty
  const countRow = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM help_articles');
  if (!countRow || countRow.cnt === 0) {
    seedHelpArticles(db);
  }
}

function seedHelpArticles(db: any) {
  const now = new Date().toISOString();
  const defaultArticles = [
    {
      id: 'art_acc_1',
      category: 'account',
      title: 'How to create and verify your Nixo account',
      content: `Creating an account on Nixo is fast and secure. Simply click "Sign Up", enter your email or phone number, choose a password, and follow the verification code sent to your device.\n\nOnce verified, you will receive a blue badge and starter reward coins in your wallet!`,
      keywords: 'signup, registration, verify, account, blue badge, password',
    },
    {
      id: 'art_acc_2',
      category: 'account',
      title: 'Managing active login sessions and account security',
      content: `Protecting your account is top priority. Go to Settings > Sessions to inspect active device logins, IP addresses, and locations.\n\nIf you see an unfamiliar login, tap "Terminate All Other Sessions" and change your password immediately.`,
      keywords: 'sessions, security, password, logout, devices, hack',
    },
    {
      id: 'art_pay_1',
      category: 'payment',
      title: 'Supported payment gateways (bKash, Nagad, Stripe, PayPal)',
      content: `Nixo supports domestic bKash, Nagad, and Rocket mobile banking as well as global Credit Cards and PayPal.\n\nTo add funds or buy Nixo Coins, open your Wallet or click "Recharge Coins". Transactions are verified automatically within 5 seconds.`,
      keywords: 'bkash, nagad, stripe, paypal, payment, recharge, buy coins',
    },
    {
      id: 'art_pay_2',
      category: 'payment',
      title: 'What to do if a payment fails or is delayed',
      content: `If your payment was deducted from your bank or mobile banking wallet but coins were not credited:\n1. Copy the Transaction ID (TrxID) from your payment receipt.\n2. Open a Support Ticket under "Payment Help" or start a Live Chat.\n3. Provide the TrxID and our automated PayStation verification will credit your wallet immediately!`,
      keywords: 'payment failed, missing coins, trxid, deposit error',
    },
    {
      id: 'art_coin_1',
      category: 'coin',
      title: 'Earning Nixo Coins through Quests and 3D Gift Rewards',
      content: `You can earn free Nixo Coins daily by:\n- Daily login streaks (+10 to +100 Coins)\n- Creating popular posts and reels (+5 Coins per 10 likes)\n- Receiving animated 3D gifts from fans during live video streams!`,
      keywords: 'coins, earn free, gifts, daily quest, reward, 3d gifts',
    },
    {
      id: 'art_coin_2',
      category: 'coin',
      title: 'Sending 3D Gifts to Creators in posts, comments & reels',
      content: `Show appreciation to creators! Click the "Gift" icon on any post, comment, or reel to pick a 3D animated gift (such as Floating Crown, Dragon Chime, Cyber Car, or Cosmic Portal). The creator receives instant coin payouts in their creator balance.`,
      keywords: 'send gift, 3d gift, creator earnings, crown, portal',
    },
    {
      id: 'art_with_1',
      category: 'withdrawal',
      title: 'How to withdraw coin earnings to Bank or Mobile Banking',
      content: `Creators can cash out earned coins into real currency (BDT or USD):\n1. Navigate to Wallet > Cash Out Coins.\n2. Choose your preferred account method (bKash, Nagad, Bank Transfer).\n3. Enter the amount (Minimum cashout is 500 Coins = $5.00 / BDT 550).\n4. Submit request. Payouts are reviewed and disbursed within 12 hours.`,
      keywords: 'withdraw, cashout, earnings, bank transfer, payout',
    },
    {
      id: 'art_rep_1',
      category: 'report',
      title: 'Reporting abusive content, spam, harassment or fake profiles',
      content: `We enforce zero tolerance for harassment, hate speech, or financial scams.\nTo report a post or user, tap the "..." menu and click "Report". Choose the infraction category and attach details. You can track your submitted reports in real-time under Help > My Reports Status!`,
      keywords: 'report, moderation, harassment, fake account, report status',
    },
    {
      id: 'art_rep_2',
      category: 'report',
      title: 'Appealing content warnings or account restrictions',
      content: `If your post was removed or account restricted by mistake, you can file a formal Ban Appeal under Help > Submit Support Ticket. Our human moderation team will inspect snapshot evidence and reply within 24 hours.`,
      keywords: 'appeal, ban appeal, restriction, unban, moderation',
    },
    {
      id: 'art_sec_1',
      category: 'security',
      title: 'Two-Factor Authentication (2FA) & Privacy Controls',
      content: `Enhance your account defense by activating 2FA in Settings > Security. You can also customize who can see your posts, direct message you, or see your online presence under Privacy Settings.`,
      keywords: '2fa, privacy, security, two factor, direct message settings',
    },
  ];

  for (const art of defaultArticles) {
    runDb(
      db,
      `INSERT INTO help_articles (id, category, title, content, keywords, views, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [art.id, art.category, art.title, art.content, art.keywords, now, now]
    );
  }
}

// ----------------------------------------------------------------------
// HELP ARTICLES API HELPERS
// ----------------------------------------------------------------------
export function getHelpArticles(db: any, options: { category?: string; search?: string } = {}) {
  let sql = `SELECT * FROM help_articles WHERE 1=1`;
  const params: any[] = [];

  if (options.category && options.category !== 'all') {
    sql += ` AND category = ?`;
    params.push(options.category);
  }

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    sql += ` AND (title LIKE ? OR content LIKE ? OR keywords LIKE ?)`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY views DESC, created_at DESC`;
  return queryDbAll(db, sql, params);
}

export function incrementHelpArticleViews(db: any, id: string) {
  runDb(db, `UPDATE help_articles SET views = views + 1 WHERE id = ?`, [id]);
}

export function createHelpArticle(db: any, article: { category: string; title: string; content: string; keywords?: string }) {
  const id = `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  runDb(
    db,
    `INSERT INTO help_articles (id, category, title, content, keywords, views, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, article.category, article.title, article.content, article.keywords || '', now, now]
  );
  return id;
}

export function updateHelpArticle(db: any, id: string, article: { category?: string; title?: string; content?: string; keywords?: string }) {
  const now = new Date().toISOString();
  const current = queryDbOne(db, 'SELECT * FROM help_articles WHERE id = ?', [id]);
  if (!current) throw new Error('Article not found');

  runDb(
    db,
    `UPDATE help_articles SET category = ?, title = ?, content = ?, keywords = ?, updated_at = ? WHERE id = ?`,
    [
      article.category || current.category,
      article.title || current.title,
      article.content || current.content,
      article.keywords !== undefined ? article.keywords : current.keywords,
      now,
      id,
    ]
  );
}

export function deleteHelpArticle(db: any, id: string) {
  runDb(db, `DELETE FROM help_articles WHERE id = ?`, [id]);
}

// ----------------------------------------------------------------------
// METRICS & DASHBOARD STATS
// ----------------------------------------------------------------------
export function getSupportMetrics(db: any) {
  const ticketCounts = queryDbAll(
    db,
    `SELECT status, COUNT(*) as cnt FROM support_tickets GROUP BY status`
  );

  const ticketStats = {
    open: 0,
    assigned: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  };

  for (const row of ticketCounts) {
    if (row.status in ticketStats) {
      (ticketStats as any)[row.status] = row.cnt;
    }
    ticketStats.total += row.cnt;
  }

  const chatCounts = queryDbAll(
    db,
    `SELECT status, COUNT(*) as cnt FROM support_chats GROUP BY status`
  );

  const chatStats = {
    waiting: 0,
    active: 0,
    closed: 0,
    total: 0,
  };

  for (const row of chatCounts) {
    if (row.status in chatStats) {
      (chatStats as any)[row.status] = row.cnt;
    }
    chatStats.total += row.cnt;
  }

  // Calculate average response time for live support chats
  const responseTimes = queryDbAll(
    db,
    `SELECT (strftime('%s', first_response_at) - strftime('%s', created_at)) as resp_sec
     FROM support_chats WHERE first_response_at IS NOT NULL`
  );

  let totalRespSec = 0;
  for (const r of responseTimes) {
    totalRespSec += Math.max(0, r.resp_sec || 0);
  }
  const avgResponseTimeSec = responseTimes.length > 0 ? Math.round(totalRespSec / responseTimes.length) : 0;

  return {
    tickets: ticketStats,
    chats: chatStats,
    avgResponseTimeSec,
  };
}

