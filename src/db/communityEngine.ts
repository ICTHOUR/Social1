import { Database } from 'sql.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';

/**
 * Ensures all Community Tables (Groups, Pages, Events) are created with full relational integrity & RBAC.
 */
export function ensureCommunityTables(db: Database) {
  // 1. Groups & Group Members
  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      privacy TEXT DEFAULT 'public',
      members_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      muted_until TEXT,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_rules (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      rule_order INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_posts (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_urls TEXT DEFAULT '[]',
      is_announcement INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_comments (
      id TEXT PRIMARY KEY,
      group_post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_files (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_join_requests (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS group_invites (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(invitee_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // 2. Pages
  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      category TEXT NOT NULL,
      about TEXT,
      description TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      followers_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS page_members (
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_id, user_id),
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS page_followers (
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_id, user_id),
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS page_posts (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_urls TEXT DEFAULT '[]',
      video_url TEXT,
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS page_messages (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // 3. Events
  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      event_type TEXT DEFAULT 'offline',
      location TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      category TEXT NOT NULL,
      attendees_count INTEGER DEFAULT 1,
      interested_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      has_reminder INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS event_invites (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(invitee_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  runDb(
    db,
    `CREATE TABLE IF NOT EXISTS event_discussions (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // Safe schema migrations for preexisting databases
  const safeMigrations = [
    `ALTER TABLE group_members ADD COLUMN muted_until TEXT`,
    `ALTER TABLE group_posts ADD COLUMN post_id TEXT`,
    `ALTER TABLE group_posts ADD COLUMN user_id TEXT`,
    `ALTER TABLE group_posts ADD COLUMN content TEXT`,
    `ALTER TABLE group_posts ADD COLUMN media_urls TEXT DEFAULT '[]'`,
    `ALTER TABLE group_posts ADD COLUMN is_announcement INTEGER DEFAULT 0`,
    `ALTER TABLE group_posts ADD COLUMN updated_at TEXT`,
    `ALTER TABLE groups ADD COLUMN avatar_url TEXT`,
    `ALTER TABLE groups ADD COLUMN cover_url TEXT`,
    `ALTER TABLE groups ADD COLUMN privacy TEXT DEFAULT 'public'`,
    `ALTER TABLE groups ADD COLUMN members_count INTEGER DEFAULT 1`,
    `ALTER TABLE groups ADD COLUMN updated_at TEXT`,
    `ALTER TABLE pages ADD COLUMN slug TEXT`,
    `ALTER TABLE pages ADD COLUMN views_count INTEGER DEFAULT 0`,
    `ALTER TABLE pages ADD COLUMN about TEXT`,
    `ALTER TABLE pages ADD COLUMN updated_at TEXT`,
    `ALTER TABLE page_posts ADD COLUMN post_id TEXT`,
    `ALTER TABLE page_posts ADD COLUMN author_id TEXT`,
    `ALTER TABLE page_posts ADD COLUMN content TEXT`,
    `ALTER TABLE page_posts ADD COLUMN media_urls TEXT DEFAULT '[]'`,
    `ALTER TABLE page_posts ADD COLUMN video_url TEXT`,
    `ALTER TABLE page_posts ADD COLUMN views_count INTEGER DEFAULT 0`,
    `ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'offline'`,
    `ALTER TABLE events ADD COLUMN end_time TEXT`,
    `ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'General'`,
    `ALTER TABLE events ADD COLUMN attendees_count INTEGER DEFAULT 1`,
    `ALTER TABLE events ADD COLUMN interested_count INTEGER DEFAULT 0`,
    `ALTER TABLE events ADD COLUMN updated_at TEXT`,
    `ALTER TABLE event_members ADD COLUMN has_reminder INTEGER DEFAULT 0`,
  ];

  for (const sql of safeMigrations) {
    try {
      runDb(db, sql);
    } catch (_) {
      // Column already exists
    }
  }

  // Seed sample community records if needed
  try {
    // Group 1 Rules
    const existingRules = queryDbOne(db, "SELECT COUNT(*) as c FROM group_rules WHERE group_id = 'group_1'");
    if (!existingRules || existingRules.c === 0) {
      runDb(db, `INSERT OR IGNORE INTO group_rules (id, group_id, title, description, rule_order, created_at) VALUES
        ('gr_1', 'group_1', 'Be Respectful & Constructive', 'Treat every engineer and artist with respect. Critique work constructively.', 1, datetime('now')),
        ('gr_2', 'group_1', 'No Unsolicited Advertising', 'Avoid spamming unrelated commercial links or crypto pump schemes.', 2, datetime('now')),
        ('gr_3', 'group_1', 'Share Source Code & Assets', 'Whenever sharing custom UI shaders, include code snippets or references.', 3, datetime('now'))`);
    }

    // Group 1 Members & Roles
    const existingMembers = queryDbOne(db, "SELECT COUNT(*) as c FROM group_members WHERE group_id = 'group_1'");
    if (!existingMembers || existingMembers.c <= 1) {
      runDb(db, `INSERT OR REPLACE INTO group_members (group_id, user_id, role, status, joined_at) VALUES
        ('group_1', 'user_elena', 'creator', 'active', datetime('now')),
        ('group_1', 'user_marcus', 'admin', 'active', datetime('now')),
        ('group_1', 'user_sophia', 'moderator', 'active', datetime('now')),
        ('group_1', 'user_alex', 'member', 'active', datetime('now'))`);
    }

    // Group 1 Posts & Announcements
    const existingPosts = queryDbOne(db, "SELECT COUNT(*) as c FROM group_posts WHERE group_id = 'group_1'");
    if (!existingPosts || existingPosts.c === 0) {
      runDb(db, `INSERT OR REPLACE INTO posts (id, user_id, content, media_type, media_urls, privacy, group_id, created_at, updated_at) VALUES
        ('gp_1', 'user_elena', '📣 WELCOME TO LIQUID GLASS COMMUNITY! Feel free to showcase your latest reactive blur cards, audio visualizers, and spatial components here.', 'none', '[]', 'public', 'group_1', datetime('now', '-2 days'), datetime('now', '-2 days')),
        ('gp_2', 'user_marcus', 'Quick benchmark: backdrop-filter performance improved by 35% on Chrome 134 using GPU layers. What are your favorite hardware-accelerated CSS tricks?', 'none', '[]', 'public', 'group_1', datetime('now', '-1 day'), datetime('now', '-1 day'))`);

      runDb(db, `INSERT OR REPLACE INTO group_posts (id, group_id, post_id, user_id, content, media_urls, is_announcement, status, created_at, updated_at) VALUES
        ('gp_1', 'group_1', 'gp_1', 'user_elena', '📣 WELCOME TO LIQUID GLASS COMMUNITY! Feel free to showcase your latest reactive blur cards, audio visualizers, and spatial components here.', '[]', 1, 'approved', datetime('now', '-2 days'), datetime('now', '-2 days')),
        ('gp_2', 'group_1', 'gp_2', 'user_marcus', 'Quick benchmark: backdrop-filter performance improved by 35% on Chrome 134 using GPU layers. What are your favorite hardware-accelerated CSS tricks?', '[]', 0, 'approved', datetime('now', '-1 day'), datetime('now', '-1 day'))`);

      // Group 1 Comment
      runDb(db, `INSERT OR REPLACE INTO group_comments (id, group_post_id, user_id, content, created_at) VALUES
        ('gc_1', 'gp_2', 'user_sophia', 'Using will-change: transform and backdrop-filter together gave us rock solid 60fps on mobile Safari too!', datetime('now', '-20 hours'))`);
    }

    // Page 1 Roles & Posts
    const existingPagePosts = queryDbOne(db, "SELECT COUNT(*) as c FROM page_posts WHERE page_id = 'page_1'");
    if (!existingPagePosts || existingPagePosts.c === 0) {
      runDb(db, `INSERT OR REPLACE INTO page_members (page_id, user_id, role, created_at) VALUES
        ('page_1', 'user_admin', 'owner', datetime('now')),
        ('page_1', 'user_sophia', 'moderator', datetime('now'))`);

      runDb(db, `INSERT OR REPLACE INTO posts (id, user_id, content, media_type, media_urls, privacy, page_id, created_at, updated_at) VALUES
        ('pp_1', 'user_admin', 'Introducing Nixo v4: Liquid spatial computing for the decentralized web. Enjoy silky smooth audio streams and reactive widgets.', 'none', '[]', 'public', 'page_1', datetime('now', '-5 days'), datetime('now', '-5 days')),
        ('pp_2', 'user_admin', 'Watch our keynote stream recap highlighting the new peer-to-peer audio visualizer and tipping mechanics.', 'video', '[]', 'public', 'page_1', datetime('now', '-2 days'), datetime('now', '-2 days'))`);

      runDb(db, `INSERT OR REPLACE INTO page_posts (id, page_id, post_id, author_id, content, media_urls, video_url, views_count, created_at) VALUES
        ('pp_1', 'page_1', 'pp_1', 'user_admin', 'Introducing Nixo v4: Liquid spatial computing for the decentralized web. Enjoy silky smooth audio streams and reactive widgets.', '[]', NULL, 1240, datetime('now', '-5 days')),
        ('pp_2', 'page_1', 'pp_2', 'user_admin', 'Watch our keynote stream recap highlighting the new peer-to-peer audio visualizer and tipping mechanics.', '[]', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 3890, datetime('now', '-2 days'))`);
    }

    // Event 1 Attendees & Discussion
    const existingEventDiscussions = queryDbOne(db, "SELECT COUNT(*) as c FROM event_discussions WHERE event_id = 'event_1'");
    if (!existingEventDiscussions || existingEventDiscussions.c === 0) {
      runDb(db, `INSERT OR REPLACE INTO event_members (event_id, user_id, status, has_reminder, created_at) VALUES
        ('event_1', 'user_admin', 'going', 1, datetime('now')),
        ('event_1', 'user_elena', 'going', 1, datetime('now')),
        ('event_1', 'user_marcus', 'going', 0, datetime('now')),
        ('event_1', 'user_sophia', 'interested', 1, datetime('now'))`);

      runDb(db, `INSERT OR REPLACE INTO event_discussions (id, event_id, user_id, content, created_at) VALUES
        ('ed_1', 'event_1', 'user_elena', 'Can not wait to co-host the spatial audio stage with everyone!', datetime('now', '-1 day')),
        ('ed_2', 'event_1', 'user_marcus', 'Will there be code examples available during the live stream workshop?', datetime('now', '-12 hours'))`);
    }
  } catch (err) {
    console.error('Failed to seed community samples:', err);
  }

  saveDbSync();
}

// -------------------------------------------------------------
// GROUPS: RBAC & BUSINESS LOGIC
// -------------------------------------------------------------

export function getGroupRole(db: Database, groupId: string, userId?: string): {
  role: 'creator' | 'admin' | 'moderator' | 'member' | 'guest';
  status: 'active' | 'pending' | 'banned' | 'muted' | 'none';
  mutedUntil?: string | null;
  canManage: boolean;
  canModerate: boolean;
  canPost: boolean;
} {
  if (!userId) {
    return { role: 'guest', status: 'none', canManage: false, canModerate: false, canPost: false };
  }

  const member = queryDbOne(
    db,
    `SELECT role, status, muted_until FROM group_members WHERE group_id = ? AND user_id = ?`,
    [groupId, userId]
  );

  if (!member) {
    // Check if group creator
    const grp = queryDbOne(db, 'SELECT creator_id FROM groups WHERE id = ?', [groupId]);
    if (grp && grp.creator_id === userId) {
      return { role: 'creator', status: 'active', canManage: true, canModerate: true, canPost: true };
    }
    return { role: 'guest', status: 'none', canManage: false, canModerate: false, canPost: false };
  }

  const isMuted = member.status === 'muted' && member.muted_until && new Date(member.muted_until) > new Date();
  const isBanned = member.status === 'banned';
  const role = member.role as 'creator' | 'admin' | 'moderator' | 'member';
  const canManage = role === 'creator' || role === 'admin';
  const canModerate = canManage || role === 'moderator';
  const canPost = !isBanned && !isMuted && member.status === 'active';

  return {
    role,
    status: member.status,
    mutedUntil: member.muted_until,
    canManage,
    canModerate,
    canPost,
  };
}

export function createGroup(
  db: Database,
  creatorId: string,
  data: {
    name: string;
    description: string;
    privacy?: 'public' | 'private';
    avatarUrl?: string;
    coverUrl?: string;
    rules?: Array<{ title: string; description: string }>;
  }
) {
  const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(Math.random() * 10000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO groups (id, creator_id, name, slug, description, avatar_url, cover_url, privacy, members_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      groupId,
      creatorId,
      data.name.trim(),
      slug,
      data.description.trim(),
      data.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      data.coverUrl || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      data.privacy || 'public',
      now,
      now,
    ]
  );

  // Add creator as creator role
  runDb(
    db,
    `INSERT OR REPLACE INTO group_members (group_id, user_id, role, status, joined_at)
     VALUES (?, ?, 'creator', 'active', ?)`,
    [groupId, creatorId, now]
  );

  // Insert standard or custom rules
  const rules = data.rules && data.rules.length > 0 ? data.rules : [
    { title: 'Be Respectful & Constructive', description: 'Treat fellow creators and community members with dignity.' },
    { title: 'No Spam or Self-Promotion', description: 'Keep discussions authentic and aligned with group topics.' },
    { title: 'Protect Privacy & Safety', description: 'Never share private information or unsolicited files.' },
  ];

  rules.forEach((r, idx) => {
    runDb(
      db,
      `INSERT INTO group_rules (id, group_id, title, description, rule_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`rule_${Date.now()}_${idx}`, groupId, r.title, r.description, idx + 1, now]
    );
  });

  saveDbSync();
  return { groupId, slug };
}

export function getGroupsList(db: Database, currentUserId?: string, search?: string) {
  let sql = `SELECT g.*, u.username as creator_username, u.full_name as creator_name
             FROM groups g
             JOIN users u ON g.creator_id = u.id`;
  const params: any[] = [];

  if (search && search.trim()) {
    sql += ` WHERE LOWER(g.name) LIKE ? OR LOWER(g.description) LIKE ?`;
    const pat = `%${search.trim().toLowerCase()}%`;
    params.push(pat, pat);
  }

  sql += ` ORDER BY g.members_count DESC, g.created_at DESC`;
  const rows = queryDbAll(db, sql, params);

  return rows.map((g) => {
    let memberRole = 'guest';
    let memberStatus = 'none';
    if (currentUserId) {
      const m = queryDbOne(db, 'SELECT role, status FROM group_members WHERE group_id = ? AND user_id = ?', [
        g.id,
        currentUserId,
      ]);
      if (m) {
        memberRole = m.role;
        memberStatus = m.status;
      }
    }

    return {
      id: g.id,
      creatorId: g.creator_id,
      creatorName: g.creator_name,
      creatorUsername: g.creator_username,
      name: g.name,
      slug: g.slug,
      description: g.description,
      avatarUrl: g.avatar_url,
      coverUrl: g.cover_url,
      privacy: g.privacy,
      membersCount: g.members_count || 1,
      createdAt: g.created_at,
      memberRole,
      memberStatus,
    };
  });
}

export function getGroupDetails(db: Database, groupId: string, currentUserId?: string) {
  const g = queryDbOne(
    db,
    `SELECT g.*, u.username as creator_username, u.full_name as creator_name, u.avatar_url as creator_avatar
     FROM groups g
     JOIN users u ON g.creator_id = u.id
     WHERE g.id = ? OR g.slug = ?`,
    [groupId, groupId]
  );

  if (!g) return null;

  const realGroupId = g.id;
  const userAccess = getGroupRole(db, realGroupId, currentUserId);
  const rules = queryDbAll(db, `SELECT * FROM group_rules WHERE group_id = ? ORDER BY rule_order ASC`, [realGroupId]);
  const admins = queryDbAll(
    db,
    `SELECT u.id, u.username, u.full_name, u.avatar_url, gm.role
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ? AND gm.role IN ('creator', 'admin') AND gm.status = 'active'`,
    [realGroupId]
  );
  const moderators = queryDbAll(
    db,
    `SELECT u.id, u.username, u.full_name, u.avatar_url, gm.role
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ? AND gm.role = 'moderator' AND gm.status = 'active'`,
    [realGroupId]
  );

  // If private group and user is not active member/admin, omit full contents
  const isAuthorized = g.privacy === 'public' || userAccess.status === 'active';

  return {
    group: {
      id: g.id,
      creatorId: g.creator_id,
      creatorName: g.creator_name,
      creatorUsername: g.creator_username,
      creatorAvatar: g.creator_avatar,
      name: g.name,
      slug: g.slug,
      description: g.description,
      avatarUrl: g.avatar_url,
      coverUrl: g.cover_url,
      privacy: g.privacy,
      membersCount: g.members_count || 1,
      createdAt: g.created_at,
    },
    userAccess,
    rules,
    admins,
    moderators,
    isAuthorized,
  };
}

export function updateGroup(db: Database, groupId: string, data: any, currentUserId: string) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canManage) {
    throw new Error('Unauthorized: Only group creator or admins can modify group settings.');
  }

  const now = new Date().toISOString();
  runDb(
    db,
    `UPDATE groups
     SET name = COALESCE(?, name),
         description = COALESCE(?, description),
         avatar_url = COALESCE(?, avatar_url),
         cover_url = COALESCE(?, cover_url),
         privacy = COALESCE(?, privacy),
         updated_at = ?
     WHERE id = ?`,
    [data.name, data.description, data.avatarUrl, data.coverUrl, data.privacy, now, groupId]
  );

  saveDbSync();
  return { success: true };
}

export function requestOrJoinGroup(db: Database, groupId: string, userId: string, message?: string) {
  const grp = queryDbOne(db, 'SELECT privacy FROM groups WHERE id = ?', [groupId]);
  if (!grp) throw new Error('Group not found');

  const existing = queryDbOne(db, 'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
  if (existing) {
    if (existing.status === 'banned') throw new Error('You are banned from joining this group.');
    if (existing.status === 'active') return { status: 'already_member' };
  }

  const now = new Date().toISOString();
  if (grp.privacy === 'public') {
    // Immediate join
    runDb(
      db,
      `INSERT OR REPLACE INTO group_members (group_id, user_id, role, status, joined_at)
       VALUES (?, ?, 'member', 'active', ?)`,
      [groupId, userId, now]
    );

    runDb(db, `UPDATE groups SET members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = 'active') WHERE id = ?`, [
      groupId,
      groupId,
    ]);

    saveDbSync();
    return { status: 'joined' };
  } else {
    // Private group: create join request
    const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    runDb(
      db,
      `INSERT OR REPLACE INTO group_join_requests (id, group_id, user_id, status, message, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [requestId, groupId, userId, message || 'Request to join group', now]
    );

    saveDbSync();
    return { status: 'pending_approval' };
  }
}

export function getGroupJoinRequests(db: Database, groupId: string, currentUserId: string) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) {
    throw new Error('Unauthorized: Only admins and moderators can inspect join requests.');
  }

  return queryDbAll(
    db,
    `SELECT jr.id, jr.status, jr.message, jr.created_at, u.id as user_id, u.username, u.full_name, u.avatar_url
     FROM group_join_requests jr
     JOIN users u ON jr.user_id = u.id
     WHERE jr.group_id = ? AND jr.status = 'pending'
     ORDER BY jr.created_at DESC`,
    [groupId]
  );
}

export function handleJoinRequest(
  db: Database,
  groupId: string,
  requestId: string,
  action: 'approve' | 'reject',
  currentUserId: string
) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) {
    throw new Error('Unauthorized: Only admins and moderators can review join requests.');
  }

  const req = queryDbOne(db, 'SELECT user_id FROM group_join_requests WHERE id = ? AND group_id = ?', [
    requestId,
    groupId,
  ]);
  if (!req) throw new Error('Request not found');

  const now = new Date().toISOString();
  if (action === 'approve') {
    runDb(
      db,
      `INSERT OR REPLACE INTO group_members (group_id, user_id, role, status, joined_at)
       VALUES (?, ?, 'member', 'active', ?)`,
      [groupId, req.user_id, now]
    );

    runDb(db, `UPDATE group_join_requests SET status = 'approved' WHERE id = ?`, [requestId]);
    runDb(
      db,
      `UPDATE groups SET members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = 'active') WHERE id = ?`,
      [groupId, groupId]
    );
  } else {
    runDb(db, `UPDATE group_join_requests SET status = 'rejected' WHERE id = ?`, [requestId]);
  }

  saveDbSync();
  return { success: true };
}

export function inviteUserToGroup(db: Database, groupId: string, inviterId: string, inviteeId: string) {
  const access = getGroupRole(db, groupId, inviterId);
  if (access.status !== 'active') throw new Error('Must be an active group member to invite others.');

  const inviteId = `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO group_invites (id, group_id, inviter_id, invitee_id, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [inviteId, groupId, inviterId, inviteeId, now]
  );

  saveDbSync();
  return { inviteId, success: true };
}

export function getGroupMembers(db: Database, groupId: string) {
  return queryDbAll(
    db,
    `SELECT gm.role, gm.status, gm.muted_until, gm.joined_at, u.id, u.username, u.full_name, u.avatar_url, u.badge
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?
     ORDER BY CASE gm.role WHEN 'creator' THEN 1 WHEN 'admin' THEN 2 WHEN 'moderator' THEN 3 ELSE 4 END, gm.joined_at ASC`,
    [groupId]
  );
}

export function updateMemberRole(
  db: Database,
  groupId: string,
  targetUserId: string,
  newRole: 'admin' | 'moderator' | 'member',
  currentUserId: string
) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canManage) throw new Error('Unauthorized: Only creator or admins can promote/demote members.');

  // Check target member
  const target = queryDbOne(db, 'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [
    groupId,
    targetUserId,
  ]);
  if (!target) throw new Error('Target user not in group');
  if (target.role === 'creator') throw new Error('Cannot change group creator role.');

  runDb(db, 'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?', [
    newRole,
    groupId,
    targetUserId,
  ]);
  saveDbSync();
  return { success: true };
}

export function banGroupMember(db: Database, groupId: string, targetUserId: string, reason: string, currentUserId: string) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) throw new Error('Unauthorized: Only admins and moderators can ban members.');

  const target = queryDbOne(db, 'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [
    groupId,
    targetUserId,
  ]);
  if (target?.role === 'creator' || target?.role === 'admin') {
    throw new Error('Cannot ban group creator or admin.');
  }

  runDb(
    db,
    `UPDATE group_members SET status = 'banned' WHERE group_id = ? AND user_id = ?`,
    [groupId, targetUserId]
  );

  runDb(
    db,
    `UPDATE groups SET members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = 'active') WHERE id = ?`,
    [groupId, groupId]
  );

  saveDbSync();
  return { success: true };
}

export function unbanGroupMember(db: Database, groupId: string, targetUserId: string, currentUserId: string) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) throw new Error('Unauthorized: Only admins and moderators can unban members.');

  runDb(
    db,
    `UPDATE group_members SET status = 'active' WHERE group_id = ? AND user_id = ?`,
    [groupId, targetUserId]
  );

  runDb(
    db,
    `UPDATE groups SET members_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ? AND status = 'active') WHERE id = ?`,
    [groupId, groupId]
  );

  saveDbSync();
  return { success: true };
}

export function muteGroupMember(
  db: Database,
  groupId: string,
  targetUserId: string,
  durationMinutes: number,
  currentUserId: string
) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) throw new Error('Unauthorized: Only admins and moderators can mute members.');

  const target = queryDbOne(db, 'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [
    groupId,
    targetUserId,
  ]);
  if (target?.role === 'creator' || target?.role === 'admin') {
    throw new Error('Cannot mute group creator or admin.');
  }

  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  runDb(
    db,
    `UPDATE group_members SET status = 'muted', muted_until = ? WHERE group_id = ? AND user_id = ?`,
    [mutedUntil, groupId, targetUserId]
  );

  saveDbSync();
  return { success: true, mutedUntil };
}

export function unmuteGroupMember(db: Database, groupId: string, targetUserId: string, currentUserId: string) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) throw new Error('Unauthorized: Only admins and moderators can unmute members.');

  runDb(
    db,
    `UPDATE group_members SET status = 'active', muted_until = NULL WHERE group_id = ? AND user_id = ?`,
    [groupId, targetUserId]
  );

  saveDbSync();
  return { success: true };
}

// Group Posts & Announcements
export function createGroupPost(
  db: Database,
  groupId: string,
  userId: string,
  data: { content: string; mediaUrls?: string[]; isAnnouncement?: boolean }
) {
  const access = getGroupRole(db, groupId, userId);
  if (!access.canPost) {
    throw new Error('You do not have permission to post in this group (muted or not active member).');
  }

  // Announcements can only be made by admins or moderators
  const isAnnouncement = Boolean(data.isAnnouncement && access.canModerate);
  const postId = `gp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT OR REPLACE INTO posts (id, user_id, content, media_type, media_urls, privacy, group_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'public', ?, ?, ?)`,
    [
      postId,
      userId,
      data.content.trim(),
      (data.mediaUrls && data.mediaUrls.length > 0) ? 'image' : 'none',
      JSON.stringify(data.mediaUrls || []),
      groupId,
      now,
      now,
    ]
  );

  runDb(
    db,
    `INSERT INTO group_posts (id, group_id, post_id, user_id, content, media_urls, is_announcement, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`,
    [
      postId,
      groupId,
      postId,
      userId,
      data.content.trim(),
      JSON.stringify(data.mediaUrls || []),
      isAnnouncement ? 1 : 0,
      now,
      now,
    ]
  );

  saveDbSync();
  return { postId, success: true };
}

export function getGroupPosts(db: Database, groupId: string, currentUserId?: string) {
  const rows = queryDbAll(
    db,
    `SELECT gp.*, u.username, u.full_name, u.avatar_url, u.badge, gm.role as member_role,
            (SELECT COUNT(*) FROM group_comments gc WHERE gc.group_post_id = gp.id) as comments_count
     FROM group_posts gp
     JOIN users u ON gp.user_id = u.id
     LEFT JOIN group_members gm ON (gm.group_id = gp.group_id AND gm.user_id = gp.user_id)
     WHERE gp.group_id = ? AND gp.status = 'approved'
     ORDER BY gp.is_announcement DESC, gp.created_at DESC`,
    [groupId]
  );

  return rows.map((p) => {
    let parsedMedia: string[] = [];
    try {
      parsedMedia = JSON.parse(p.media_urls || '[]');
    } catch {
      parsedMedia = [];
    }

    return {
      id: p.id,
      groupId: p.group_id,
      userId: p.user_id,
      authorName: p.full_name,
      authorUsername: p.username,
      authorAvatar: p.avatar_url,
      authorBadge: p.badge,
      authorRole: p.member_role || 'member',
      content: p.content,
      mediaUrls: parsedMedia,
      isAnnouncement: Boolean(p.is_announcement),
      commentsCount: p.comments_count || 0,
      createdAt: p.created_at,
    };
  });
}

export function moderateGroupPost(
  db: Database,
  groupId: string,
  postId: string,
  action: 'delete' | 'pin_announcement' | 'unpin',
  currentUserId: string
) {
  const access = getGroupRole(db, groupId, currentUserId);
  if (!access.canModerate) throw new Error('Unauthorized: Only admins and moderators can moderate posts.');

  if (action === 'delete') {
    runDb(db, `DELETE FROM group_posts WHERE id = ? AND group_id = ?`, [postId, groupId]);
  } else if (action === 'pin_announcement') {
    runDb(db, `UPDATE group_posts SET is_announcement = 1 WHERE id = ? AND group_id = ?`, [postId, groupId]);
  } else if (action === 'unpin') {
    runDb(db, `UPDATE group_posts SET is_announcement = 0 WHERE id = ? AND group_id = ?`, [postId, groupId]);
  }

  saveDbSync();
  return { success: true };
}

// Group Comments
export function addGroupComment(db: Database, postId: string, userId: string, content: string) {
  const post = queryDbOne(db, 'SELECT group_id FROM group_posts WHERE id = ?', [postId]);
  if (!post) throw new Error('Post not found');

  const access = getGroupRole(db, post.group_id, userId);
  if (!access.canPost) throw new Error('You do not have permission to comment in this group.');

  const commentId = `gc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO group_comments (id, group_post_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [commentId, postId, userId, content.trim(), now]
  );

  saveDbSync();
  return { commentId, success: true };
}

export function getGroupComments(db: Database, postId: string) {
  return queryDbAll(
    db,
    `SELECT gc.*, u.username, u.full_name, u.avatar_url, u.badge
     FROM group_comments gc
     JOIN users u ON gc.user_id = u.id
     WHERE gc.group_post_id = ?
     ORDER BY gc.created_at ASC`,
    [postId]
  );
}

// Group Files Repository
export function uploadGroupFile(
  db: Database,
  groupId: string,
  userId: string,
  data: { name: string; fileUrl: string; fileType: string; fileSize?: number }
) {
  const access = getGroupRole(db, groupId, userId);
  if (!access.canPost) throw new Error('Must be an active member to share files.');

  const fileId = `gf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO group_files (id, group_id, user_id, name, file_url, file_type, file_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fileId, groupId, userId, data.name, data.fileUrl, data.fileType, data.fileSize || 0, now]
  );

  saveDbSync();
  return { fileId, success: true };
}

export function getGroupFiles(db: Database, groupId: string) {
  return queryDbAll(
    db,
    `SELECT gf.*, u.username, u.full_name, u.avatar_url
     FROM group_files gf
     JOIN users u ON gf.user_id = u.id
     WHERE gf.group_id = ?
     ORDER BY gf.created_at DESC`,
    [groupId]
  );
}

// -------------------------------------------------------------
// PAGES: RBAC, POSTS, VIDEOS, ANALYTICS & MESSAGING
// -------------------------------------------------------------

export function getPageRole(db: Database, pageId: string, userId?: string): {
  role: 'owner' | 'admin' | 'moderator' | 'editor' | 'guest';
  isFollowing: boolean;
  canManage: boolean;
  canPost: boolean;
  canMessage: boolean;
} {
  if (!userId) {
    return { role: 'guest', isFollowing: false, canManage: false, canPost: false, canMessage: false };
  }

  const p = queryDbOne(db, 'SELECT owner_id FROM pages WHERE id = ?', [pageId]);
  if (p && p.owner_id === userId) {
    return { role: 'owner', isFollowing: true, canManage: true, canPost: true, canMessage: true };
  }

  const member = queryDbOne(db, 'SELECT role FROM page_members WHERE page_id = ? AND user_id = ?', [pageId, userId]);
  const follow = queryDbOne(db, 'SELECT user_id FROM page_followers WHERE page_id = ? AND user_id = ?', [pageId, userId]);

  const role = member ? (member.role as any) : 'guest';
  const isFollowing = Boolean(follow);
  const canManage = role === 'owner' || role === 'admin';
  const canPost = canManage || role === 'editor';
  const canMessage = true;

  return { role, isFollowing, canManage, canPost, canMessage };
}

export function createPage(
  db: Database,
  ownerId: string,
  data: {
    name: string;
    category: string;
    description: string;
    about?: string;
    avatarUrl?: string;
    coverUrl?: string;
  }
) {
  const pageId = `page_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(Math.random() * 10000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO pages (id, owner_id, name, slug, category, about, description, avatar_url, cover_url, followers_count, views_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [
      pageId,
      ownerId,
      data.name.trim(),
      slug,
      data.category.trim(),
      data.about || data.description,
      data.description.trim(),
      data.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      data.coverUrl || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
      now,
      now,
    ]
  );

  // Add owner to page_members and page_followers
  runDb(db, `INSERT OR REPLACE INTO page_members (page_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`, [
    pageId,
    ownerId,
    now,
  ]);
  runDb(db, `INSERT OR REPLACE INTO page_followers (page_id, user_id, created_at) VALUES (?, ?, ?)`, [pageId, ownerId, now]);

  saveDbSync();
  return { pageId, slug };
}

export function getPagesList(db: Database, currentUserId?: string, search?: string) {
  let sql = `SELECT p.*, u.username as owner_username, u.full_name as owner_name FROM pages p JOIN users u ON p.owner_id = u.id`;
  const params: any[] = [];

  if (search && search.trim()) {
    sql += ` WHERE LOWER(p.name) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.description) LIKE ?`;
    const pat = `%${search.trim().toLowerCase()}%`;
    params.push(pat, pat, pat);
  }

  sql += ` ORDER BY p.followers_count DESC, p.created_at DESC`;
  const rows = queryDbAll(db, sql, params);

  return rows.map((p) => {
    const isFollowing = currentUserId
      ? Boolean(queryDbOne(db, 'SELECT user_id FROM page_followers WHERE page_id = ? AND user_id = ?', [p.id, currentUserId]))
      : false;

    return {
      id: p.id,
      ownerId: p.owner_id,
      ownerName: p.owner_name,
      ownerUsername: p.owner_username,
      name: p.name,
      slug: p.slug,
      category: p.category,
      about: p.about,
      description: p.description,
      avatarUrl: p.avatar_url,
      coverUrl: p.cover_url,
      followersCount: p.followers_count || 0,
      viewsCount: p.views_count || 0,
      createdAt: p.created_at,
      isFollowing,
    };
  });
}

export function getPageDetails(db: Database, pageId: string, currentUserId?: string) {
  const p = queryDbOne(
    db,
    `SELECT p.*, u.username as owner_username, u.full_name as owner_name, u.avatar_url as owner_avatar
     FROM pages p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ? OR p.slug = ?`,
    [pageId, pageId]
  );

  if (!p) return null;

  // Record a page view
  runDb(db, `UPDATE pages SET views_count = views_count + 1 WHERE id = ?`, [p.id]);

  const realPageId = p.id;
  const userRole = getPageRole(db, realPageId, currentUserId);
  const roles = queryDbAll(
    db,
    `SELECT pm.role, pm.created_at, u.id as user_id, u.username, u.full_name, u.avatar_url
     FROM page_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.page_id = ?
     ORDER BY CASE pm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'moderator' THEN 3 ELSE 4 END`,
    [realPageId]
  );

  return {
    page: {
      id: p.id,
      ownerId: p.owner_id,
      ownerName: p.owner_name,
      ownerUsername: p.owner_username,
      ownerAvatar: p.owner_avatar,
      name: p.name,
      slug: p.slug,
      category: p.category,
      about: p.about,
      description: p.description,
      avatarUrl: p.avatar_url,
      coverUrl: p.cover_url,
      followersCount: p.followers_count || 0,
      viewsCount: p.views_count || 0,
      createdAt: p.created_at,
    },
    userRole,
    roles,
  };
}

export function toggleFollowPage(db: Database, pageId: string, userId: string) {
  const existing = queryDbOne(db, 'SELECT * FROM page_followers WHERE page_id = ? AND user_id = ?', [pageId, userId]);
  const now = new Date().toISOString();

  if (existing) {
    runDb(db, 'DELETE FROM page_followers WHERE page_id = ? AND user_id = ?', [pageId, userId]);
    runDb(db, 'UPDATE pages SET followers_count = MAX(0, followers_count - 1) WHERE id = ?', [pageId]);
    saveDbSync();
    return { isFollowing: false };
  } else {
    runDb(db, 'INSERT INTO page_followers (page_id, user_id, created_at) VALUES (?, ?, ?)', [pageId, userId, now]);
    runDb(db, 'UPDATE pages SET followers_count = followers_count + 1 WHERE id = ?', [pageId]);
    saveDbSync();
    return { isFollowing: true };
  }
}

export function createPagePost(
  db: Database,
  pageId: string,
  authorId: string,
  data: { content: string; mediaUrls?: string[]; videoUrl?: string }
) {
  const access = getPageRole(db, pageId, authorId);
  if (!access.canPost) throw new Error('Unauthorized: You do not have publishing access on this page.');

  const postId = `pp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO page_posts (id, page_id, author_id, content, media_urls, video_url, views_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      postId,
      pageId,
      authorId,
      data.content.trim(),
      JSON.stringify(data.mediaUrls || []),
      data.videoUrl || null,
      now,
    ]
  );

  saveDbSync();
  return { postId, success: true };
}

export function getPagePosts(db: Database, pageId: string) {
  const rows = queryDbAll(
    db,
    `SELECT pp.*, p.name as page_name, p.avatar_url as page_avatar, u.username as author_username, u.full_name as author_name
     FROM page_posts pp
     JOIN pages p ON pp.page_id = p.id
     JOIN users u ON pp.author_id = u.id
     WHERE pp.page_id = ?
     ORDER BY pp.created_at DESC`,
    [pageId]
  );

  return rows.map((r) => {
    let media: string[] = [];
    try {
      media = JSON.parse(r.media_urls || '[]');
    } catch {
      media = [];
    }
    return {
      id: r.id,
      pageId: r.page_id,
      pageName: r.page_name,
      pageAvatar: r.page_avatar,
      authorName: r.author_name,
      authorUsername: r.author_username,
      content: r.content,
      mediaUrls: media,
      videoUrl: r.video_url,
      viewsCount: r.views_count || 0,
      createdAt: r.created_at,
    };
  });
}

export function getPageVideos(db: Database, pageId: string) {
  const rows = queryDbAll(
    db,
    `SELECT pp.*, p.name as page_name, p.avatar_url as page_avatar
     FROM page_posts pp
     JOIN pages p ON pp.page_id = p.id
     WHERE pp.page_id = ? AND pp.video_url IS NOT NULL AND pp.video_url != ''
     ORDER BY pp.created_at DESC`,
    [pageId]
  );

  return rows.map((r) => ({
    id: r.id,
    pageId: r.page_id,
    pageName: r.page_name,
    pageAvatar: r.page_avatar,
    content: r.content,
    videoUrl: r.video_url,
    viewsCount: r.views_count || 0,
    createdAt: r.created_at,
  }));
}

export function updatePageRole(
  db: Database,
  pageId: string,
  targetUserId: string,
  role: 'admin' | 'moderator' | 'editor' | 'remove',
  currentUserId: string
) {
  const access = getPageRole(db, pageId, currentUserId);
  if (!access.canManage) throw new Error('Unauthorized: Only page owner or admin can assign roles.');

  const p = queryDbOne(db, 'SELECT owner_id FROM pages WHERE id = ?', [pageId]);
  if (p?.owner_id === targetUserId) throw new Error('Cannot change ownership role.');

  const now = new Date().toISOString();
  if (role === 'remove') {
    runDb(db, 'DELETE FROM page_members WHERE page_id = ? AND user_id = ?', [pageId, targetUserId]);
  } else {
    runDb(
      db,
      `INSERT OR REPLACE INTO page_members (page_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)`,
      [pageId, targetUserId, role, now]
    );
  }

  saveDbSync();
  return { success: true };
}

export function getPageAnalytics(db: Database, pageId: string, currentUserId: string) {
  const access = getPageRole(db, pageId, currentUserId);
  if (!access.canManage) throw new Error('Unauthorized: Only page managers can view analytics.');

  const p = queryDbOne(db, 'SELECT followers_count, views_count, created_at FROM pages WHERE id = ?', [pageId]);
  const postsCount = queryDbOne(db, 'SELECT COUNT(*) as count FROM page_posts WHERE page_id = ?', [pageId]);
  const videosCount = queryDbOne(db, "SELECT COUNT(*) as count FROM page_posts WHERE page_id = ? AND video_url IS NOT NULL AND video_url != ''", [pageId]);
  const totalMessages = queryDbOne(db, 'SELECT COUNT(*) as count FROM page_messages WHERE page_id = ?', [pageId]);

  return {
    followersCount: p?.followers_count || 0,
    viewsCount: p?.views_count || 0,
    postsCount: postsCount?.count || 0,
    videosCount: videosCount?.count || 0,
    totalMessages: totalMessages?.count || 0,
    reachRate: ((p?.views_count || 0) * 1.4).toFixed(0),
    engagementScore: (((p?.followers_count || 1) * 3.2) + ((postsCount?.count || 0) * 12)).toFixed(0),
  };
}

export function sendPageMessage(
  db: Database,
  pageId: string,
  userId: string,
  senderType: 'user' | 'page',
  content: string
) {
  const msgId = `pm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO page_messages (id, page_id, user_id, sender_type, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [msgId, pageId, userId, senderType, content.trim(), now]
  );

  saveDbSync();
  return { msgId, success: true, createdAt: now };
}

export function getPageMessages(db: Database, pageId: string, targetUserId: string, currentUserId: string) {
  // If currentUserId is manager, can view with targetUserId. If not manager, can only view own messages with page
  const access = getPageRole(db, pageId, currentUserId);
  const effectiveUserId = access.canManage ? targetUserId : currentUserId;

  return queryDbAll(
    db,
    `SELECT pm.*, u.username, u.full_name, u.avatar_url, p.name as page_name, p.avatar_url as page_avatar
     FROM page_messages pm
     JOIN users u ON pm.user_id = u.id
     JOIN pages p ON pm.page_id = p.id
     WHERE pm.page_id = ? AND pm.user_id = ?
     ORDER BY pm.created_at ASC`,
    [pageId, effectiveUserId]
  );
}

// -------------------------------------------------------------
// EVENTS: CREATION, RSVP, REMINDER, INVITES & DISCUSSION
// -------------------------------------------------------------

export function createEvent(
  db: Database,
  creatorId: string,
  data: {
    title: string;
    description: string;
    eventType?: 'online' | 'offline';
    location: string;
    startTime: string;
    endTime?: string;
    category: string;
    coverUrl?: string;
  }
) {
  const eventId = `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO events (id, creator_id, title, description, cover_url, event_type, location, start_time, end_time, category, attendees_count, interested_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
    [
      eventId,
      creatorId,
      data.title.trim(),
      data.description.trim(),
      data.coverUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
      data.eventType || 'offline',
      data.location.trim(),
      data.startTime,
      data.endTime || null,
      data.category.trim(),
      now,
      now,
    ]
  );

  // Add creator as going
  runDb(
    db,
    `INSERT OR REPLACE INTO event_members (event_id, user_id, status, has_reminder, created_at)
     VALUES (?, ?, 'going', 1, ?)`,
    [eventId, creatorId, now]
  );

  saveDbSync();
  return { eventId, success: true };
}

export function getEventsList(db: Database, currentUserId?: string, search?: string, filter?: string) {
  let sql = `SELECT e.*, u.username as creator_username, u.full_name as creator_name
             FROM events e
             JOIN users u ON e.creator_id = u.id`;
  const params: any[] = [];

  const conditions: string[] = [];
  if (search && search.trim()) {
    conditions.push(`(LOWER(e.title) LIKE ? OR LOWER(e.location) LIKE ? OR LOWER(e.category) LIKE ?)`);
    const pat = `%${search.trim().toLowerCase()}%`;
    params.push(pat, pat, pat);
  }

  if (filter === 'online') {
    conditions.push(`e.event_type = 'online'`);
  } else if (filter === 'offline') {
    conditions.push(`e.event_type = 'offline'`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY e.start_time ASC`;
  const rows = queryDbAll(db, sql, params);

  return rows.map((e) => {
    let rsvpStatus: 'going' | 'interested' | 'none' = 'none';
    let hasReminder = false;

    if (currentUserId) {
      const m = queryDbOne(db, 'SELECT status, has_reminder FROM event_members WHERE event_id = ? AND user_id = ?', [
        e.id,
        currentUserId,
      ]);
      if (m) {
        rsvpStatus = m.status;
        hasReminder = Boolean(m.has_reminder);
      }
    }

    return {
      id: e.id,
      creatorId: e.creator_id,
      creatorName: e.creator_name,
      creatorUsername: e.creator_username,
      title: e.title,
      description: e.description,
      coverUrl: e.cover_url,
      eventType: e.event_type,
      location: e.location,
      startTime: e.start_time,
      endTime: e.end_time,
      category: e.category,
      attendeesCount: e.attendees_count || 1,
      interestedCount: e.interested_count || 0,
      createdAt: e.created_at,
      rsvpStatus,
      hasReminder,
    };
  });
}

export function getEventDetails(db: Database, eventId: string, currentUserId?: string) {
  const e = queryDbOne(
    db,
    `SELECT e.*, u.username as creator_username, u.full_name as creator_name, u.avatar_url as creator_avatar
     FROM events e
     JOIN users u ON e.creator_id = u.id
     WHERE e.id = ?`,
    [eventId]
  );

  if (!e) return null;

  let rsvpStatus: 'going' | 'interested' | 'none' = 'none';
  let hasReminder = false;

  if (currentUserId) {
    const m = queryDbOne(db, 'SELECT status, has_reminder FROM event_members WHERE event_id = ? AND user_id = ?', [
      eventId,
      currentUserId,
    ]);
    if (m) {
      rsvpStatus = m.status;
      hasReminder = Boolean(m.has_reminder);
    }
  }

  const attendees = queryDbAll(
    db,
    `SELECT em.status, em.has_reminder, u.id, u.username, u.full_name, u.avatar_url
     FROM event_members em
     JOIN users u ON em.user_id = u.id
     WHERE em.event_id = ? AND em.status = 'going'
     LIMIT 12`,
    [eventId]
  );

  const interestedUsers = queryDbAll(
    db,
    `SELECT em.status, u.id, u.username, u.full_name, u.avatar_url
     FROM event_members em
     JOIN users u ON em.user_id = u.id
     WHERE em.event_id = ? AND em.status = 'interested'
     LIMIT 12`,
    [eventId]
  );

  return {
    event: {
      id: e.id,
      creatorId: e.creator_id,
      creatorName: e.creator_name,
      creatorUsername: e.creator_username,
      creatorAvatar: e.creator_avatar,
      title: e.title,
      description: e.description,
      coverUrl: e.cover_url,
      eventType: e.event_type,
      location: e.location,
      startTime: e.start_time,
      endTime: e.end_time,
      category: e.category,
      attendeesCount: e.attendees_count || 1,
      interestedCount: e.interested_count || 0,
      createdAt: e.created_at,
    },
    rsvpStatus,
    hasReminder,
    attendees,
    interestedUsers,
    isCreator: currentUserId ? e.creator_id === currentUserId : false,
  };
}

export function rsvpEvent(db: Database, eventId: string, userId: string, status: 'going' | 'interested' | 'not_going') {
  const existing = queryDbOne(db, 'SELECT * FROM event_members WHERE event_id = ? AND user_id = ?', [eventId, userId]);
  const now = new Date().toISOString();

  if (status === 'not_going') {
    runDb(db, 'DELETE FROM event_members WHERE event_id = ? AND user_id = ?', [eventId, userId]);
  } else {
    runDb(
      db,
      `INSERT OR REPLACE INTO event_members (event_id, user_id, status, has_reminder, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [eventId, userId, status, existing ? existing.has_reminder : 1, now]
    );
  }

  // Recount
  runDb(
    db,
    `UPDATE events
     SET attendees_count = (SELECT COUNT(*) FROM event_members WHERE event_id = ? AND status = 'going'),
         interested_count = (SELECT COUNT(*) FROM event_members WHERE event_id = ? AND status = 'interested')
     WHERE id = ?`,
    [eventId, eventId, eventId]
  );

  saveDbSync();
  return { status, success: true };
}

export function toggleEventReminder(db: Database, eventId: string, userId: string) {
  const m = queryDbOne(db, 'SELECT has_reminder FROM event_members WHERE event_id = ? AND user_id = ?', [eventId, userId]);
  const now = new Date().toISOString();

  if (!m) {
    // If not member yet, auto-register as interested with reminder
    runDb(
      db,
      `INSERT INTO event_members (event_id, user_id, status, has_reminder, created_at)
       VALUES (?, ?, 'interested', 1, ?)`,
      [eventId, userId, now]
    );
    saveDbSync();
    return { hasReminder: true };
  } else {
    const nextVal = m.has_reminder ? 0 : 1;
    runDb(db, `UPDATE event_members SET has_reminder = ? WHERE event_id = ? AND user_id = ?`, [nextVal, eventId, userId]);
    saveDbSync();
    return { hasReminder: Boolean(nextVal) };
  }
}

export function inviteToEvent(db: Database, eventId: string, inviterId: string, inviteeId: string) {
  const inviteId = `einv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO event_invites (id, event_id, inviter_id, invitee_id, status, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [inviteId, eventId, inviterId, inviteeId, now]
  );

  saveDbSync();
  return { inviteId, success: true };
}

export function addEventDiscussion(db: Database, eventId: string, userId: string, content: string) {
  const discId = `ed_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  runDb(
    db,
    `INSERT INTO event_discussions (id, event_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [discId, eventId, userId, content.trim(), now]
  );

  saveDbSync();
  return { discId, success: true };
}

export function getEventDiscussions(db: Database, eventId: string) {
  return queryDbAll(
    db,
    `SELECT ed.*, u.username, u.full_name, u.avatar_url, u.badge
     FROM event_discussions ed
     JOIN users u ON ed.user_id = u.id
     WHERE ed.event_id = ?
     ORDER BY ed.created_at ASC`,
    [eventId]
  );
}
