import { Database as SqlJsDatabase } from 'sql.js';
import { ensureFinancialGuardTables } from '../security/financialGuard.js';
import { ensureAntiSpamTables } from './antiSpamEngine.js';
import { ensureModerationTables } from './moderationEngine.js';

export function applyAllMigrations(db: SqlJsDatabase) {
  // Ensure Foreign Keys are strictly enforced
  db.run('PRAGMA foreign_keys = ON;');

  console.log('Beginning execution of Nixo Production Database Migrations...');

  // ---------------------------------------------------------
  // 1. AUTHENTICATION GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cover_url TEXT,
      bio TEXT,
      badge TEXT,
      coins_balance INTEGER DEFAULT 500,
      is_verified INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT,
      auth_provider TEXT DEFAULT 'local',
      provider_id TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      device_info TEXT,
      is_revoked INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reset_token TEXT UNIQUE NOT NULL,
      is_used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 2. PROFILE & PREFERENCES GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      location TEXT,
      website_url TEXT,
      birthdate TEXT,
      gender TEXT,
      occupation TEXT,
      education TEXT,
      interests TEXT,
      social_links TEXT,
      dob_privacy TEXT DEFAULT 'public',
      bio_extended TEXT,
      theme_preference TEXT DEFAULT 'liquid_glass_dark',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure column migrations if table already exists
  const profileCols = ['occupation', 'education', 'interests', 'social_links', 'dob_privacy'];
  profileCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE user_profiles ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column already exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      is_current INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cover_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      is_current INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      notification_email INTEGER DEFAULT 1,
      notification_push INTEGER DEFAULT 1,
      dark_mode INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en-US',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS privacy_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      profile_visibility TEXT DEFAULT 'public',
      post_default_visibility TEXT DEFAULT 'public',
      allow_friend_requests TEXT DEFAULT 'everyone',
      allow_follows TEXT DEFAULT 'everyone',
      direct_message_privacy TEXT DEFAULT 'everyone',
      allow_commenting TEXT DEFAULT 'everyone',
      allow_tagging TEXT DEFAULT 'everyone',
      allow_mentions TEXT DEFAULT 'everyone',
      show_online_status INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const privacyCols = ['allow_friend_requests', 'allow_follows', 'allow_commenting', 'allow_tagging', 'allow_mentions'];
  privacyCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE privacy_settings ADD COLUMN ${col} TEXT DEFAULT 'everyone';`);
    } catch (e) {
      // Column already exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS muted_users (
      muter_id TEXT NOT NULL,
      muted_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (muter_id, muted_id),
      FOREIGN KEY(muter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(muted_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS restricted_users (
      restruiter_id TEXT NOT NULL,
      restricted_id TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (restruiter_id, restricted_id),
      FOREIGN KEY(restruiter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(restricted_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 3. SOCIAL RELATIONS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS friendships (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      status TEXT DEFAULT 'accepted',
      created_at TEXT NOT NULL,
      PRIMARY KEY (user1_id, user2_id),
      FOREIGN KEY(user1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(user2_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS followers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      follower_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS close_friends (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 4. POSTS & MEDIA GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_type TEXT DEFAULT 'none',
      media_urls TEXT DEFAULT '[]',
      poll_data TEXT,
      privacy TEXT DEFAULT 'public',
      group_id TEXT,
      page_id TEXT,
      is_sponsored INTEGER DEFAULT 0,
      sponsor_title TEXT,
      sponsor_target_url TEXT,
      comments_count INTEGER DEFAULT 0,
      shares_count INTEGER DEFAULT 0,
      gifts_received_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_media (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      media_type TEXT NOT NULL,
      url TEXT NOT NULL,
      aspect_ratio TEXT DEFAULT '1:1',
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_audio (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT,
      audio_url TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 30,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_mentions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      mentioned_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY(mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id TEXT NOT NULL,
      hashtag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (post_id, hashtag),
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_visibility (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      visibility_type TEXT DEFAULT 'public',
      allowed_users_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_saves (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, post_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_hides (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  const extraPostCols = [
    'feeling',
    'location',
    'tagged_users_json',
    'hashtags_json',
    'link_preview_json',
    'gif_url',
    'audio_data_json',
    'background_gradient',
    'comments_control',
    'scheduled_for',
    'repost_of_post_id',
    'font_style',
    'font_size',
    'alignment',
    'privacy_level'
  ];
  extraPostCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE posts ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column already exists
    }
  });

  // ---------------------------------------------------------
  // 5. REACTIONS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS reaction_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      coin_value INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT,
      comment_id TEXT,
      reel_id TEXT,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reaction_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 6. COMMENTS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      reel_id TEXT,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      content TEXT NOT NULL,
      media_url TEXT,
      gif_url TEXT,
      is_pinned INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      reactions_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const extraCommentCols = ['gif_url', 'is_pinned', 'is_edited'];
  extraCommentCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE comments ADD COLUMN ${col} ${col.startsWith('is_') ? 'INTEGER DEFAULT 0' : 'TEXT'};`);
    } catch (e) {
      // Column already exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS comment_media (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comment_mentions (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      mentioned_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE,
      FOREIGN KEY(mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comment_reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, comment_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_user_post ON reactions(user_id, post_id);`);
  } catch (e) {}

  try {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_reactions_user_comm ON comment_reactions(user_id, comment_id);`);
  } catch (e) {}

  // ---------------------------------------------------------
  // 7. SHARING & REPOSTS
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      caption TEXT,
      target_type TEXT DEFAULT 'feed',
      target_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  const extraShareCols = ['target_type', 'target_id'];
  extraShareCols.forEach((col) => {
    try {
      db.run(`ALTER TABLE shares ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column already exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS reposts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 8. STORIES GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      story_type TEXT DEFAULT 'image',
      text_content TEXT,
      text_style TEXT,
      music_metadata TEXT,
      stickers TEXT,
      emojis TEXT,
      mentions TEXT,
      poll_data TEXT,
      link_data TEXT,
      privacy TEXT DEFAULT 'public',
      caption TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure stories columns migration
  const storyCols = [
    'story_type TEXT DEFAULT "image"',
    'text_content TEXT',
    'text_style TEXT',
    'music_metadata TEXT',
    'stickers TEXT',
    'emojis TEXT',
    'mentions TEXT',
    'poll_data TEXT',
    'link_data TEXT',
    'privacy TEXT DEFAULT "public"',
  ];
  storyCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE stories ADD COLUMN ${colDef};`);
    } catch (e) {
      // Column already exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS story_media (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      duration INTEGER DEFAULT 5,
      created_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_views (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      UNIQUE(story_id, viewer_id),
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY(viewer_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_reactions (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_replies (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 9. VIDEO & REELS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS reels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      caption TEXT NOT NULL,
      music_title TEXT,
      music_artist TEXT,
      music_cover_url TEXT,
      hashtags TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      reposts_count INTEGER DEFAULT 0,
      saves_count INTEGER DEFAULT 0,
      gifts_count INTEGER DEFAULT 0,
      duration REAL DEFAULT 15.0,
      aspect_ratio TEXT DEFAULT '9:16',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const reelCols = [
    'thumbnail_url TEXT',
    'music_artist TEXT',
    'music_cover_url TEXT',
    'hashtags TEXT',
    'reposts_count INTEGER DEFAULT 0',
    'saves_count INTEGER DEFAULT 0',
    'gifts_count INTEGER DEFAULT 0',
    'duration REAL DEFAULT 15.0',
    'aspect_ratio TEXT DEFAULT "9:16"',
  ];
  reelCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE reels ADD COLUMN ${colDef};`);
    } catch (e) {
      // Column exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS reel_likes (
      id TEXT PRIMARY KEY,
      reel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(reel_id, user_id),
      FOREIGN KEY(reel_id) REFERENCES reels(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reel_comments (
      id TEXT PRIMARY KEY,
      reel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(reel_id) REFERENCES reels(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reel_reposts (
      id TEXT PRIMARY KEY,
      reel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(reel_id, user_id),
      FOREIGN KEY(reel_id) REFERENCES reels(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reel_saves (
      id TEXT PRIMARY KEY,
      reel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(reel_id, user_id),
      FOREIGN KEY(reel_id) REFERENCES reels(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reel_views (
      id TEXT PRIMARY KEY,
      reel_id TEXT NOT NULL,
      viewer_id TEXT,
      watch_duration INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(reel_id) REFERENCES reels(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      caption TEXT NOT NULL,
      music_title TEXT,
      category TEXT DEFAULT 'discovery',
      tags TEXT,
      duration_seconds INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      quality_sources TEXT,
      captions_url TEXT,
      captions_data TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const videoCols = [
    'title TEXT',
    'category TEXT DEFAULT "discovery"',
    'tags TEXT',
    'quality_sources TEXT',
    'captions_url TEXT',
    'captions_data TEXT',
  ];
  videoCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE videos ADD COLUMN ${colDef};`);
    } catch (e) {
      // Column exists
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS video_views (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      viewer_id TEXT,
      watch_duration INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS video_likes (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(video_id, user_id),
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS video_comments (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS video_watch_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watch_time_seconds INTEGER DEFAULT 0,
      last_position_seconds INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, video_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const watchHistoryCols = [
    'watch_time_seconds INTEGER DEFAULT 0',
    'last_position_seconds INTEGER DEFAULT 0',
    'completed INTEGER DEFAULT 0',
    'updated_at TEXT',
  ];
  watchHistoryCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE video_watch_history ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  // ---------------------------------------------------------
  // 10. CHAT / MESSENGER GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'direct',
      title TEXT,
      avatar_url TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT
    );
  `);

  const convCols = ['created_by TEXT', 'last_message_at TEXT'];
  convCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE conversations ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      is_pinned INTEGER DEFAULT 0,
      is_muted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      last_read_at TEXT,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const memberCols = [
    'is_pinned INTEGER DEFAULT 0',
    'is_muted INTEGER DEFAULT 0',
    'is_archived INTEGER DEFAULT 0',
    'last_read_at TEXT',
  ];
  memberCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE conversation_members ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      media_url TEXT,
      audio_url TEXT,
      file_name TEXT,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      coin_amount INTEGER DEFAULT 0,
      reply_to_id TEXT,
      forwarded_from_id TEXT,
      is_edited INTEGER DEFAULT 0,
      edited_at TEXT,
      is_unsent INTEGER DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      created_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const msgCols = [
    'conversation_id TEXT',
    'message_type TEXT DEFAULT "text"',
    'file_name TEXT',
    'file_size INTEGER DEFAULT 0',
    'file_type TEXT',
    'reply_to_id TEXT',
    'forwarded_from_id TEXT',
    'is_edited INTEGER DEFAULT 0',
    'edited_at TEXT',
    'is_unsent INTEGER DEFAULT 0',
    'status TEXT DEFAULT "sent"',
  ];
  msgCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE messages ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  try {
    let sql = '';
    const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE name='messages'");
    if (stmt.step()) {
      const row = stmt.getAsObject();
      sql = (row.sql as string) || '';
    }
    stmt.free();

    if (sql.includes('receiver_id TEXT NOT NULL') || sql.includes('FOREIGN KEY(receiver_id)')) {
      db.run(`PRAGMA foreign_keys = OFF;`);
      db.run(`
        CREATE TABLE messages_new (
          id TEXT PRIMARY KEY,
          conversation_id TEXT,
          sender_id TEXT NOT NULL,
          receiver_id TEXT,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          media_url TEXT,
          audio_url TEXT,
          file_name TEXT,
          file_size INTEGER DEFAULT 0,
          file_type TEXT,
          coin_amount INTEGER DEFAULT 0,
          reply_to_id TEXT,
          forwarded_from_id TEXT,
          is_edited INTEGER DEFAULT 0,
          edited_at TEXT,
          is_unsent INTEGER DEFAULT 0,
          is_read INTEGER DEFAULT 0,
          status TEXT DEFAULT 'sent',
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      db.run(`
        INSERT INTO messages_new (id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url, file_name, file_size, file_type, coin_amount, reply_to_id, forwarded_from_id, is_edited, edited_at, is_unsent, is_read, status, created_at, deleted_at)
        SELECT id, conversation_id, sender_id, NULLIF(receiver_id, ''), content, message_type, media_url, audio_url, file_name, file_size, file_type, coin_amount, reply_to_id, forwarded_from_id, is_edited, edited_at, is_unsent, is_read, status, created_at, deleted_at FROM messages;
      `);
      db.run(`DROP TABLE messages;`);
      db.run(`ALTER TABLE messages_new RENAME TO messages;`);
      db.run(`PRAGMA foreign_keys = ON;`);
    }
  } catch (e) {
    console.error('Migration messages table recreate error:', e);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS message_media (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      created_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(message_id, user_id, reaction),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_reads (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      file_type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deleted_messages_for_user (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run('ALTER TABLE users ADD COLUMN last_seen TEXT;');
  } catch (e) {}

  // ---------------------------------------------------------
  // 11. GROUPS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
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
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      joined_at TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_roles (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_posts (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      status TEXT DEFAULT 'approved',
      pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_rules (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      rule_order INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 12. PAGES GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      followers_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_members (
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_id, user_id),
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_roles (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_posts (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_followers (
      page_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (page_id, user_id),
      FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 13. EVENTS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      location TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      event_type TEXT DEFAULT 'offline',
      category TEXT NOT NULL,
      attendees_count INTEGER DEFAULT 1,
      interested_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_invites (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY(inviter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(invitee_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ---------------------------------------------------------
  // 14. NOTIFICATIONS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sender_id TEXT,
      type TEXT NOT NULL,
      reference_id TEXT,
      reference_type TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const notificationCols = [
    'metadata TEXT',
    'dedup_key TEXT',
    'action_url TEXT'
  ];
  notificationCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE notifications ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      email_likes INTEGER DEFAULT 1,
      email_comments INTEGER DEFAULT 1,
      email_follows INTEGER DEFAULT 1,
      push_likes INTEGER DEFAULT 1,
      push_comments INTEGER DEFAULT 1,
      push_messages INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const notifPrefCols = [
    'in_app_enabled INTEGER DEFAULT 1',
    'browser_push_enabled INTEGER DEFAULT 1',
    'mobile_push_enabled INTEGER DEFAULT 1',
    'email_enabled INTEGER DEFAULT 1',
    'sound_enabled INTEGER DEFAULT 1',
    'dnd_enabled INTEGER DEFAULT 0',
    'dnd_start TEXT DEFAULT "22:00"',
    'dnd_end TEXT DEFAULT "07:00"',
    'pref_friend_request INTEGER DEFAULT 1',
    'pref_friend_accepted INTEGER DEFAULT 1',
    'pref_follow INTEGER DEFAULT 1',
    'pref_like INTEGER DEFAULT 1',
    'pref_comment INTEGER DEFAULT 1',
    'pref_reply INTEGER DEFAULT 1',
    'pref_mention INTEGER DEFAULT 1',
    'pref_share INTEGER DEFAULT 1',
    'pref_repost INTEGER DEFAULT 1',
    'pref_message INTEGER DEFAULT 1',
    'pref_group_activity INTEGER DEFAULT 1',
    'pref_page_activity INTEGER DEFAULT 1',
    'pref_event_activity INTEGER DEFAULT 1',
    'pref_gift_received INTEGER DEFAULT 1',
    'pref_coin_received INTEGER DEFAULT 1',
    'pref_coin_purchase INTEGER DEFAULT 1',
    'pref_withdrawal_update INTEGER DEFAULT 1',
    'pref_admin_announcement INTEGER DEFAULT 1',
    'pref_security_alert INTEGER DEFAULT 1'
  ];
  notifPrefCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE notification_preferences ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      endpoint TEXT,
      p256dh TEXT,
      auth TEXT,
      device_token TEXT,
      device_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(user_id, dedup_key);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id, platform);`);
  } catch (e) {}

  // ---------------------------------------------------------
  // 15. SEARCH & HASHTAGS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      query TEXT NOT NULL,
      category TEXT DEFAULT 'all',
      searched_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hashtags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      posts_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hashtag_followers (
      hashtag_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (hashtag_id, user_id),
      FOREIGN KEY(hashtag_id) REFERENCES hashtags(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trending_topics (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      volume_score INTEGER DEFAULT 0,
      category TEXT DEFAULT 'general',
      updated_at TEXT NOT NULL
    );
  `);

  // ---------------------------------------------------------
  // 16. AUDITABLE COIN ECONOMY GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS coin_wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 500,
      purchased_balance INTEGER DEFAULT 0,
      earned_balance INTEGER DEFAULT 500,
      received_gift_balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 500,
      total_spent INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try { db.run(`ALTER TABLE coin_wallets ADD COLUMN purchased_balance INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE coin_wallets ADD COLUMN earned_balance INTEGER DEFAULT 500`); } catch (e) {}
  try { db.run(`ALTER TABLE coin_wallets ADD COLUMN received_gift_balance INTEGER DEFAULT 0`); } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      sender_id TEXT,
      receiver_id TEXT,
      transaction_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_id TEXT,
      status TEXT DEFAULT 'completed',
      note TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_earnings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      amount_coins INTEGER NOT NULL,
      price_usd DECIMAL(10,2) NOT NULL,
      payment_method TEXT DEFAULT 'stripe',
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coin_amount INTEGER NOT NULL,
      bonus_coins INTEGER DEFAULT 0,
      price_usd DECIMAL(10,2) NOT NULL,
      is_active INTEGER DEFAULT 1
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_gifts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon_type TEXT NOT NULL,
      coin_price INTEGER NOT NULL,
      animation_url TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gift_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'popular',
      icon_type TEXT NOT NULL,
      coin_price INTEGER NOT NULL,
      is_featured INTEGER DEFAULT 1
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gift_transactions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      gift_id TEXT NOT NULL,
      post_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gift_recipients (
      id TEXT PRIMARY KEY,
      gift_transaction_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      coin_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(gift_transaction_id) REFERENCES gift_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon_type TEXT NOT NULL,
      coin_price INTEGER NOT NULL,
      image_3d TEXT,
      animation TEXT DEFAULT 'orbital_float',
      status TEXT DEFAULT 'active',
      category TEXT DEFAULT 'popular',
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  const giftCols = [
    'image_3d TEXT',
    'animation TEXT DEFAULT "orbital_float"',
    'status TEXT DEFAULT "active"',
    'category TEXT DEFAULT "popular"',
    'sort_order INTEGER DEFAULT 0',
    'description TEXT',
    'created_at TEXT',
    'updated_at TEXT'
  ];
  giftCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE gifts ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  const giftTxCols = [
    'comment_id TEXT',
    'coin_amount INTEGER DEFAULT 0',
    'status TEXT DEFAULT "completed"',
    'idempotency_key TEXT',
    'refunded_at TEXT',
    'refund_reason TEXT'
  ];
  giftTxCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE gift_transactions ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  // Configurable Coin Earning Rules & Ledger
  db.run(`
    CREATE TABLE IF NOT EXISTS coin_earning_rules (
      id TEXT PRIMARY KEY,
      coins_per_post INTEGER DEFAULT 5,
      coins_per_photo INTEGER DEFAULT 10,
      coins_per_video INTEGER DEFAULT 15,
      coins_per_story INTEGER DEFAULT 5,
      daily_earning_limit INTEGER DEFAULT 150,
      maximum_daily_reward INTEGER DEFAULT 250,
      minimum_account_age_hours INTEGER DEFAULT 0,
      minimum_activity_requirement INTEGER DEFAULT 15,
      reward_cooldown_seconds INTEGER DEFAULT 60,
      eligible_content_types TEXT DEFAULT '["post", "photo", "image", "video", "multiple_image", "audio", "poll"]',
      anti_abuse_rules TEXT DEFAULT '{"min_word_count": 3, "prevent_duplicate_content": true, "max_hourly_rewards": 5, "require_active_status": true}',
      updated_at TEXT NOT NULL
    );
  `);

  try {
    db.run('ALTER TABLE coin_earning_rules ADD COLUMN coins_per_photo INTEGER DEFAULT 10');
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_earnings_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event TEXT NOT NULL,
      coins INTEGER NOT NULL,
      before_balance INTEGER NOT NULL,
      after_balance INTEGER NOT NULL,
      source_id TEXT,
      source_type TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      ip_address TEXT,
      anti_abuse_flags TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_gift_tx_idemp ON gift_transactions(idempotency_key);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_earnings_user_created ON coin_earnings_ledger(user_id, created_at DESC);`);
  } catch (e) {}

  // ---------------------------------------------------------
  // 17. CASH WALLET & PAYOUT GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS cash_wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      balance_usd DECIMAL(10,2) DEFAULT 0.00,
      pending_usd DECIMAL(10,2) DEFAULT 0.00,
      currency TEXT DEFAULT 'USD',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_usd DECIMAL(10,2) NOT NULL,
      coins_converted INTEGER DEFAULT 0,
      payout_method_id TEXT,
      status TEXT DEFAULT 'pending',
      processed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payout_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      method_type TEXT NOT NULL,
      account_identifier TEXT NOT NULL,
      is_default INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payout_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_usd DECIMAL(10,2) NOT NULL,
      fee_usd DECIMAL(10,2) DEFAULT 0.00,
      status TEXT DEFAULT 'completed',
      reference_code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_limits (
      user_id TEXT PRIMARY KEY,
      min_withdrawal_usd DECIMAL(10,2) DEFAULT 10.00,
      max_daily_usd DECIMAL(10,2) DEFAULT 5000.00,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payout_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ---------------------------------------------------------
  // 18. ADMIN & MODERATION GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      admin_role TEXT DEFAULT 'moderator',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT UNIQUE NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY(role_id) REFERENCES admin_roles(id) ON DELETE CASCADE,
      FOREIGN KEY(permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY,
      moderator_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(moderator_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS report_targets (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      snapshot_data TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      name TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1,
      description TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  // ---------------------------------------------------------
  // 19. ADVERTISEMENT GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL,
      advertiser_name TEXT DEFAULT 'Advertiser',
      name TEXT DEFAULT '',
      title TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      provider TEXT DEFAULT 'internal',
      ad_format TEXT DEFAULT 'native',
      placements TEXT DEFAULT '["feed_inline"]',
      headline TEXT DEFAULT '',
      body_text TEXT DEFAULT '',
      call_to_action TEXT DEFAULT 'Learn More',
      destination_url TEXT DEFAULT '',
      media_url TEXT,
      media_type TEXT DEFAULT 'image',
      html_snippet TEXT,
      admob_unit_id TEXT,
      pricing_model TEXT DEFAULT 'cpm',
      bid_amount_usd DECIMAL(10,2) DEFAULT 3.50,
      total_budget_usd DECIMAL(10,2) DEFAULT 500.00,
      daily_budget_usd DECIMAL(10,2) DEFAULT 50.00,
      spent_budget_usd DECIMAL(10,2) DEFAULT 0.00,
      total_budget_coins INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      reward_coins INTEGER DEFAULT 0,
      targeting_config TEXT DEFAULT '{}',
      frequency_cap TEXT DEFAULT '{}',
      impressions_count INTEGER DEFAULT 0,
      clicks_count INTEGER DEFAULT 0,
      rewards_claimed_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY(advertiser_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS advertisements (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_url TEXT NOT NULL,
      image_url TEXT NOT NULL,
      budget_coins INTEGER NOT NULL,
      spent_coins INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      clicks_count INTEGER DEFAULT 0,
      impressions_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_placements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      placement_type TEXT DEFAULT 'banner',
      location TEXT DEFAULT '',
      allowed_providers TEXT DEFAULT '["internal","direct_sponsor","web_provider","admob"]',
      is_enabled INTEGER DEFAULT 1,
      refresh_interval_sec INTEGER DEFAULT 30,
      reward_coins INTEGER DEFAULT 0,
      frequency_cap_hourly INTEGER DEFAULT 6,
      frequency_cap_daily INTEGER DEFAULT 20,
      cooldown_minutes INTEGER DEFAULT 3,
      min_cpm_rate DECIMAL(10,2) DEFAULT 1.50,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_impressions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      placement_id TEXT,
      ad_id TEXT,
      provider TEXT DEFAULT 'internal',
      viewer_id TEXT,
      user_id TEXT,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT DEFAULT 'desktop',
      cost_usd DECIMAL(10,4) DEFAULT 0.0000,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_clicks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      placement_id TEXT,
      ad_id TEXT,
      provider TEXT DEFAULT 'internal',
      clicker_id TEXT,
      user_id TEXT,
      session_id TEXT,
      ip_address TEXT,
      cost_usd DECIMAL(10,4) DEFAULT 0.0000,
      destination_url TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ad_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // ---------------------------------------------------------
  // 20. ANALYTICS GROUP
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS post_views (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      viewer_id TEXT,
      view_duration INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_views (
      id TEXT PRIMARY KEY,
      profile_user_id TEXT NOT NULL,
      viewer_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(profile_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reaction_analytics (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      recorded_date TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS share_analytics (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      shares_count INTEGER DEFAULT 0,
      recorded_date TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS engagement_metrics (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      engagement_score INTEGER DEFAULT 0,
      recorded_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_active_users (
      date TEXT PRIMARY KEY,
      active_users_count INTEGER DEFAULT 0,
      new_users_count INTEGER DEFAULT 0,
      coin_volume INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS revenue_analytics (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      total_purchases_usd DECIMAL(10,2) DEFAULT 0.00,
      total_payouts_usd DECIMAL(10,2) DEFAULT 0.00,
      platform_margin_usd DECIMAL(10,2) DEFAULT 0.00
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS coin_activity (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      total_minted INTEGER DEFAULT 0,
      total_transferred INTEGER DEFAULT 0,
      total_burned INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'general', 'account', 'ban_appeal', 'billing', 'bug'
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
      status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_role TEXT DEFAULT 'user', -- 'user' or 'admin'
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );
  `);

  // CREATE INDEXES FOR FAST PERFORMANCE
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_partner ON messages(sender_id, receiver_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);');
  db.run('CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON coin_transactions(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, created_at DESC);');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  db.run('CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_bookmarks_post ON bookmarks(post_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);');
  db.run('CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);');

  // Initialize Security, Anti-Spam & Moderation Tables
  try { db.run("ALTER TABLE events ADD COLUMN end_time TEXT;"); } catch (_) {}
  try { db.run("ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'offline';"); } catch (_) {}
  try { db.run("ALTER TABLE events ADD COLUMN interested_count INTEGER DEFAULT 0;"); } catch (_) {}

  ensureFinancialGuardTables(db);
  ensureAntiSpamTables(db);
  ensureModerationTables(db);
  ensureMarketplaceTables(db);

  console.log('✅ Applied all 60+ production database schema migrations successfully!');
}

export function ensureMarketplaceTables(db: any) {
  db.run(`
    CREATE TABLE IF NOT EXISTS marketplace_products (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_bdt REAL NOT NULL,
      price_coins INTEGER NOT NULL,
      category TEXT NOT NULL,
      condition TEXT DEFAULT 'new',
      location TEXT NOT NULL,
      images_json TEXT NOT NULL,
      phone TEXT,
      is_negotiable INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      coins_paid INTEGER DEFAULT 0,
      delivery_address TEXT NOT NULL,
      buyer_phone TEXT NOT NULL,
      order_notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES marketplace_products(id) ON DELETE CASCADE,
      FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_mkt_products_category ON marketplace_products(category, status);');
  db.run('CREATE INDEX IF NOT EXISTS idx_mkt_products_seller ON marketplace_products(seller_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_mkt_orders_buyer ON marketplace_orders(buyer_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_mkt_orders_seller ON marketplace_orders(seller_id);');

  // Seed initial marketplace products if empty
  try {
    const res = db.exec("SELECT COUNT(*) as c FROM marketplace_products;");
    const count = res?.[0]?.values?.[0]?.[0] || 0;
    if (count === 0) {
      const now = new Date().toISOString();
      const sampleProducts = [
        {
          id: 'prod_101',
          seller_id: 'user_nixo_official',
          title: 'Apple MacBook Pro M3 (16GB RAM / 512GB SSD)',
          description: 'Brand new condition space gray MacBook Pro M3 with liquid retina XDR display. Comes with original MagSafe 3 charger and 10 months warranty.',
          price_bdt: 185000,
          price_coins: 18500,
          category: 'Electronics',
          condition: 'like_new',
          location: 'Dhaka, Gulshan',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801711223344',
          is_negotiable: 1,
        },
        {
          id: 'prod_102',
          seller_id: 'user_alex_quantum',
          title: 'Sony Alpha A7 IV Mirrorless Camera (Body Only)',
          description: '33MP full-frame Exmor R CMOS sensor, 4K 60p 10-bit recording. Shutter count under 4,500. Box and strap included.',
          price_bdt: 215000,
          price_coins: 21500,
          category: 'Electronics',
          condition: 'like_new',
          location: 'Dhaka, Dhanmondi',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1502982720700-befe977a0847?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801819998877',
          is_negotiable: 1,
        },
        {
          id: 'prod_103',
          seller_id: 'user_tania_hossain',
          title: 'Exclusive Nixo VIP Spatial Avatar & Badge Pack',
          description: 'Official digital verified collector NFT artifact with procedural hologram particle trail and 5,000 bonus platform coins.',
          price_bdt: 3500,
          price_coins: 350,
          category: 'Digital Assets',
          condition: 'new',
          location: 'Instant Delivery',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801912345678',
          is_negotiable: 0,
        },
        {
          id: 'prod_104',
          seller_id: 'user_maruf_khan',
          title: 'Keychron Q1 Pro Custom Mechanical Keyboard',
          description: 'Wireless Bluetooth + Type-C custom QMK/VIA mechanical keyboard with Gateron Jupiter Banana tactile switches and double-shot PBT keycaps.',
          price_bdt: 18500,
          price_coins: 1850,
          category: 'Gaming',
          condition: 'new',
          location: 'Chittagong, GEC',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801611002233',
          is_negotiable: 1,
        },
        {
          id: 'prod_105',
          seller_id: 'user_nixo_official',
          title: 'Nike Air Jordan 1 Retro High OG - Chicago Colorway',
          description: '100% authentic original Jordan 1 High OG, UK Size 9 / US 10. Brand new in box with extra red/black laces.',
          price_bdt: 24500,
          price_coins: 2450,
          category: 'Fashion',
          condition: 'new',
          location: 'Dhaka, Banani',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801711223344',
          is_negotiable: 0,
        },
        {
          id: 'prod_106',
          seller_id: 'user_sabbir_ahmed',
          title: 'PlayStation 5 Slim Digital Edition (1TB Storage)',
          description: 'Latest Japanese model PS5 Slim console with DualSense wireless controller and Astro Bot pre-installed. Sealed pack.',
          price_bdt: 58000,
          price_coins: 5800,
          category: 'Gaming',
          condition: 'new',
          location: 'Sylhet, Zindabazar',
          images_json: JSON.stringify([
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'
          ]),
          phone: '+8801722883344',
          is_negotiable: 1,
        }
      ];

      sampleProducts.forEach((p) => {
        try {
          db.run(
            `INSERT INTO marketplace_products (
              id, seller_id, title, description, price_bdt, price_coins,
              category, condition, location, images_json, phone, is_negotiable,
              status, views_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 24, ?, ?)`,
            [
              p.id,
              p.seller_id,
              p.title,
              p.description,
              p.price_bdt,
              p.price_coins,
              p.category,
              p.condition,
              p.location,
              p.images_json,
              p.phone,
              p.is_negotiable,
              now,
              now
            ]
          );
        } catch (_) {}
      });
    }
  } catch (_) {}
}
