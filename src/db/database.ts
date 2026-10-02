import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { applyAllMigrations } from './migrations.js';
import { ensureEconomyAndGiftsSeeded } from './economy.js';
import { ensureSettingsTables } from './settingsEngine.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'nixo_social.sqlite');

let dbInstance: SqlJsDatabase | null = null;

export function saveDatabaseToDisk(db: SqlJsDatabase) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  let db: SqlJsDatabase;
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing Nixo database from disk.');
    } catch (e) {
      console.warn('Failed to parse existing DB file, reinitializing empty DB.', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created fresh Nixo relational database instance.');
  }

  dbInstance = db;
  initSchemaAndSeeds(db);
  saveDatabaseToDisk(db);

  return db;
}

export function saveDbSync(db?: SqlJsDatabase) {
  const target = db || dbInstance;
  if (target) {
    saveDatabaseToDisk(target);
  }
}

function initSchemaAndSeeds(db: SqlJsDatabase) {
  // Apply full normalized relational migration schema
  applyAllMigrations(db);

  // Initialize and load system settings
  ensureSettingsTables(db);

  // Ensure configurable coin rules and 3D gifts are active
  ensureEconomyAndGiftsSeeded(db);

  // Seed sample development data if database is fresh
  const userCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM users');
  if (!userCount || userCount.cnt === 0) {
    console.log('Seeding initial sample development data into Nixo database...');
    const now = new Date().toISOString();

    // Default Seed Users
    db.run(`
      INSERT INTO users (id, username, email, phone, password_hash, full_name, avatar_url, cover_url, bio, badge, coins_balance, is_verified, role, created_at, updated_at)
      VALUES 
      ('user_admin', 'admin', 'admin@nixo.io', '+14155550100', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Nixo Official', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', 'Official Nixo Platform Network & Core System Admin.', 'System Admin', 100000, 1, 'admin', ?, ?),
      ('user_elena', 'elena_vibe', 'elena@nixo.io', '+14155550101', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Elena Rostova', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80', 'Digital Artist & Motion UI Designer crafting Liquid Glass experiences.', 'Creator Pro', 2450, 1, 'creator', ?, ?),
      ('user_marcus', 'marcus_tech', 'marcus@nixo.io', '+14155550102', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', 'Full-stack Architect & Web3 Monetization enthusiast.', 'VIP Creator', 1800, 1, 'user', ?, ?),
      ('user_sophia', 'sophia_ai', 'sophia@nixo.io', '+14155550103', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Sophia Chen', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', 'AI Researcher & Generative Graphics Explorer.', 'Innovator', 3200, 1, 'user', ?, ?),
      ('user_alex', 'alex_code', 'alex@nixo.io', '+14155550104', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Alex Rivera', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', 'Creative technologist & shader wizard building spatial audio interfaces.', 'Shader Prodigy', 1450, 1, 'user', ?, ?),
      ('user_clara', 'clara_sound', 'clara@nixo.io', '+14155550105', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Clara Dupont', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80', 'Sound designer, ambient modular synth producer, and visual artist.', 'Audio Architect', 2100, 1, 'user', ?, ?),
      ('user_lucas', 'lucas_spatial', 'lucas@nixo.io', '+14155550106', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Lucas Novak', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 'Spatial computing & WebXR enthusiast exploring transparent 3D glass.', 'XR Pioneer', 950, 1, 'user', ?, ?),
      ('user_maya', 'maya_zen', 'maya@nixo.io', '+14155550107', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Maya Lin', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Minimalist graphic artist & typography lover.', 'Design Lead', 1600, 1, 'user', ?, ?)
    `, [
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
    ]);

    // Seed Friendships (Accepted)
    db.run(`
      INSERT INTO friendships (user1_id, user2_id, status, created_at)
      VALUES
      ('user_elena', 'user_marcus', 'accepted', ?),
      ('user_elena', 'user_sophia', 'accepted', ?),
      ('user_marcus', 'user_sophia', 'accepted', ?),
      ('user_alex', 'user_marcus', 'accepted', ?),
      ('user_alex', 'user_sophia', 'accepted', ?)
    `, [now, now, now, now, now]);

    // Seed Pending Friend Requests
    db.run(`
      INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at)
      VALUES
      ('fr_seed_1', 'user_lucas', 'user_elena', 'pending', ?, ?),
      ('fr_seed_2', 'user_maya', 'user_elena', 'pending', ?, ?),
      ('fr_seed_3', 'user_elena', 'user_clara', 'pending', ?, ?)
    `, [now, now, now, now, now, now]);

    // Seed Follows
    db.run(`
      INSERT INTO follows (follower_id, following_id, created_at)
      VALUES
      ('user_elena', 'user_marcus', ?),
      ('user_elena', 'user_sophia', ?),
      ('user_elena', 'user_alex', ?),
      ('user_marcus', 'user_elena', ?),
      ('user_marcus', 'user_sophia', ?),
      ('user_sophia', 'user_elena', ?),
      ('user_sophia', 'user_marcus', ?),
      ('user_alex', 'user_elena', ?),
      ('user_lucas', 'user_elena', ?),
      ('user_maya', 'user_elena', ?)
    `, [now, now, now, now, now, now, now, now, now, now]);

    // Update initial follower/following counts
    db.run(`UPDATE users SET followers_count = 5, following_count = 3 WHERE id = 'user_elena'`);
    db.run(`UPDATE users SET followers_count = 3, following_count = 2 WHERE id = 'user_marcus'`);
    db.run(`UPDATE users SET followers_count = 3, following_count = 2 WHERE id = 'user_sophia'`);
    db.run(`UPDATE users SET followers_count = 1, following_count = 1 WHERE id = 'user_alex'`);

    // Seed Wallets
    db.run(`
      INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
      VALUES 
      ('cw_user_admin', 'user_admin', 100000, 100000, 0, ?),
      ('cw_user_elena', 'user_elena', 2450, 3000, 550, ?),
      ('cw_user_marcus', 'user_marcus', 1800, 2000, 200, ?),
      ('cw_user_sophia', 'user_sophia', 3200, 3500, 300, ?)
    `, [now, now, now, now]);

    // Seed Cash Wallets
    db.run(`
      INSERT INTO cash_wallets (id, user_id, balance_usd, pending_usd, currency, updated_at)
      VALUES
      ('cash_user_admin', 'user_admin', 5000.00, 250.00, 'USD', ?),
      ('cash_user_elena', 'user_elena', 245.00, 50.00, 'USD', ?),
      ('cash_user_marcus', 'user_marcus', 180.00, 0.00, 'USD', ?),
      ('cash_user_sophia', 'user_sophia', 320.00, 15.00, 'USD', ?)
    `, [now, now, now, now]);

    // Seed Gift Catalog
    db.run(`
      INSERT INTO gift_catalog (id, name, category, icon_type, coin_price, is_featured)
      VALUES 
      ('gift_spark', 'Spark Reaction', 'popular', 'spark', 10, 1),
      ('gift_heart', 'Glowing Heart', 'popular', 'heart', 50, 1),
      ('gift_gem', 'Nixo Gem', 'rare', 'gem', 250, 1),
      ('gift_crown', 'Creator Crown', 'legendary', 'crown', 1000, 1)
    `);

    // Seed System Settings & Feature Flags
    db.run(`
      INSERT INTO system_settings (key, value, description, updated_at)
      VALUES 
      ('platform_name', 'Nixo Social', 'Primary network title', ?),
      ('coin_conversion_rate_usd', '0.01', '100 Coins = 1.00 USD', ?),
      ('min_withdrawal_coins', '1000', 'Minimum coins required for creator cashout', ?)
    `, [now, now, now]);

    db.run(`
      INSERT INTO feature_flags (name, is_enabled, description, updated_at)
      VALUES
      ('camera_stories', 1, 'Allow live device camera capture for stories', ?),
      ('realtime_socket_notifications', 1, 'Realtime drawer socket updates', ?),
      ('coin_monetization', 1, 'Enable coin transfer and creator gifts', ?)
    `, [now, now, now]);

    // Seed Sample Posts Covering All 17 Post Types
    db.run(`
      INSERT INTO posts (
        id, user_id, content, media_type, media_urls, poll_data, feeling, location,
        tagged_users_json, hashtags_json, link_preview_json, gif_url, audio_data_json,
        background_gradient, comments_control, privacy, comments_count, shares_count,
        gifts_received_count, created_at, updated_at
      ) VALUES 
      (
        'post_1', 'user_elena',
        'Unveiling the new Liquid Glass UI architecture for Nixo! Built with translucent depth, backdrop blur, and custom real-time audio/visual streams. What do you think? 💎✨',
        'multiple_image',
        '["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80"]',
        null, '{"type":"feeling","label":"Euphoric ✨"}', 'Kyoto Creative District',
        '[{"id":"user_marcus","username":"marcus_tech","fullName":"Marcus Vance"}]',
        '["LiquidGlass","DesignSystem","SpatialUI"]',
        null, null, null, null, 'allow_all', 'public', 24, 8, 350, ?, ?
      ),
      (
        'post_2', 'user_marcus',
        'Just completed the transaction-safe coin ledger integration in MySQL/SQLite. Instant transfers with zero risk of negative balance or double spend!',
        'none', '[]', null, null, 'San Francisco Fintech Center',
        '[]', '["LedgerArchitecture","Fintech","Database"]',
        null, null, null, null, 'allow_all', 'public', 12, 3, 100, ?, ?
      ),
      (
        'post_3', 'user_sophia',
        'Which generative liquid visual style should we integrate into the Nixo dynamic backdrop engine?',
        'poll', '[]',
        '{"question":"Which generative liquid visual style should we integrate into the Nixo dynamic backdrop engine?","options":[{"id":"opt_1","text":"Prism Refraction & Caustics","votes":84,"votedUserIds":["user_elena"]},{"id":"opt_2","text":"Bioluminescent Deep Oceanic Wave","votes":62,"votedUserIds":["user_marcus"]},{"id":"opt_3","text":"Cybernetic Neon Glass Mesh","votes":119,"votedUserIds":[]}],"totalVotes":265}',
        '{"type":"celebrating","label":"Milestone 🚀"}', 'Geneva Research Lab',
        '[]', '["GenerativeArt","WebAudio","CreativeCoding"]',
        null, null, null, null, 'allow_all', 'public', 19, 14, 210, ?, ?
      ),
      (
        'post_4', 'user_elena',
        'Lossless 48kHz audio snippet recorded live with my analog modular synth rack. Listen to the resonance filters in spatial stereo 🎧',
        'audio', '[]', null,
        '{"type":"listening","label":"Ambient Wave 🎛️"}', 'Studio Prism One',
        '[]', '["ModularSynth","SoundDesign","Eurorack"]',
        null, null,
        '{"title":"Nixo Harmonic Resonance No. 4","artist":"Elena Rostova","audioUrl":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3","durationSeconds":180,"waveform":[24,45,68,90,75,60,82,95,100,85,70,55,40,65,80,92,88,74,60,45,30,50,70,85,90,78,65,48,32,20]}',
        null, 'allow_all', 'public', 8, 5, 120, ?, ?
      ),
      (
        'post_5', 'user_marcus',
        'Real-time ray-traced caustics simulated on 60fps WebGL canvas. Check out the liquid transmission shader demo live on GitHub!',
        'link', '[]', null, null, null,
        '[]', '["OpenSource","WebGL","Threejs"]',
        '{"url":"https://github.com/nixo-social/liquid-glass-shaders","title":"GitHub · Liquid Glass Shaders Engine","description":"High-performance WebGL & WebGPU translucent refractive shader library for modern web applications.","image":"https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80","siteName":"github.com"}',
        null, null, null, 'allow_all', 'public', 15, 9, 85, ?, ?
      ),
      (
        'post_6', 'user_sophia',
        'Pure reactive liquid geometry in perpetual motion. Mesmerizing fluid aesthetics.',
        'gif', '[]', null,
        '{"type":"feeling","label":"Hypnotized 🌀"}', null,
        '[]', '["MotionArt","GenerativeGIF"]',
        null, 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        null, null, 'allow_all', 'public', 11, 6, 75, ?, ?
      ),
      (
        'post_7', 'user_admin',
        'Nixo is not just another network. It is a sovereign digital canvas where translucent elegance meets transparent economics.',
        'none', '[]', null, null, 'Nixo Central Nexus',
        '[]', '["NixoManifesto","LiquidFuture"]',
        null, null, null,
        'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%)',
        'allow_all', 'public', 42, 28, 500, ?, ?
      ),
      (
        'post_8', 'user_elena',
        'Capturing the midnight fog rolling over Tokyo from the observation terrace.',
        'image', '["https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80"]',
        null, '{"type":"traveling","label":"Tokyo Nights 🗼"}', 'Shinjuku Skywalk, Tokyo',
        '[{"id":"user_sophia","username":"sophia_ai","fullName":"Sophia Chen"}]',
        '["Travel","TokyoNight","Cyberpunk"]',
        null, null, null, null, 'allow_all', 'public', 14, 4, 90, ?, ?
      ),
      (
        'post_9', 'user_marcus',
        'Echoing Elena''s brilliant post on our new liquid UI framework! The future of glass design is tactile, responsive, and alive.',
        'repost', '[]', null, null, null,
        '[]', '["Repost","LiquidGlass"]',
        null, null, null, null, 'allow_all', 'public', 7, 2, 40, ?, ?
      )
    `, [
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now,
      now, now
    ]);

    // Link repost_9 to post_1
    db.run(`UPDATE posts SET repost_of_post_id = 'post_1' WHERE id = 'post_9'`);

    // Seed Reactions
    db.run(`
      INSERT INTO reactions (id, user_id, post_id, type, created_at) VALUES
      ('react_1_1', 'user_marcus', 'post_1', 'love', ?),
      ('react_1_2', 'user_sophia', 'post_1', 'gem', ?),
      ('react_1_3', 'user_admin', 'post_1', 'fire', ?),
      ('react_2_1', 'user_elena', 'post_2', 'mindblown', ?),
      ('react_2_2', 'user_sophia', 'post_2', 'celebrate', ?),
      ('react_3_1', 'user_elena', 'post_3', 'fire', ?),
      ('react_4_1', 'user_marcus', 'post_4', 'love', ?),
      ('react_7_1', 'user_elena', 'post_7', 'gem', ?),
      ('react_7_2', 'user_marcus', 'post_7', 'fire', ?)
    `, [now, now, now, now, now, now, now, now, now]);

    // Seed Comments
    db.run(`
      INSERT INTO comments (id, post_id, user_id, content, reactions_count, created_at, updated_at) VALUES
      ('comm_1_1', 'post_1', 'user_marcus', 'The refraction caustics and blur balance look phenomenal! Best design system in the ecosystem.', 8, ?, ?),
      ('comm_1_2', 'post_1', 'user_sophia', 'Sending 100 coins to support this development. Incredible work Elena! 💎', 12, ?, ?),
      ('comm_3_1', 'post_3', 'user_elena', 'Voted for Cybernetic Neon Glass Mesh! The chromatic aberration effect is mind-bending.', 5, ?, ?),
      ('comm_4_1', 'post_4', 'user_marcus', 'That filter envelope modulation around 1:15 is super crisp. What analog VCF are you using?', 4, ?, ?)
    `, [now, now, now, now, now, now, now, now]);

    // Seed Groups
    db.run(`
      INSERT INTO groups (id, creator_id, name, slug, description, avatar_url, cover_url, privacy, members_count, created_at, updated_at)
      VALUES ('group_1', 'user_elena', 'Liquid Glass & Spatial UI', 'liquid-glass-ui', 'The official community for UI/UX engineers crafting glassmorphic, translucent, and spatial Web3/OS interfaces.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80', 'public', 1420, ?, ?)
    `, [now, now]);

    // Seed Pages
    db.run(`
      INSERT INTO pages (id, owner_id, name, category, description, avatar_url, cover_url, followers_count, created_at, updated_at)
      VALUES ('page_1', 'user_admin', 'Nixo Official', 'Technology & Platform', 'Official news, system updates, developer updates, and creator spotlight for Nixo Network.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80', 8950, ?, ?)
    `, [now, now]);

    // Seed Events
    db.run(`
      INSERT INTO events (id, creator_id, title, description, cover_url, location, start_time, category, attendees_count, created_at, updated_at)
      VALUES ('event_1', 'user_admin', 'Nixo Creator Summit 2026', 'Join top creators, motion designers, and developers for live streaming keynotes, coin monetization workshops, and spatial UI demos.', 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', 'Virtual Stage Nixo-Live', '2026-10-15T18:00:00Z', 'Conference', 640, ?, ?)
    `, [now, now]);
  }

  // Idempotent Social Graph Seeder
  const existingFriendships = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM friendships');
  if (!existingFriendships || existingFriendships.cnt === 0) {
    console.log('Seeding relational social graph (friendships, requests, follows, users)...');
    const now = new Date().toISOString();

    // Ensure additional social users exist
    db.run(`
      INSERT OR IGNORE INTO users (id, username, email, phone, password_hash, full_name, avatar_url, cover_url, bio, badge, coins_balance, is_verified, role, created_at, updated_at)
      VALUES 
      ('user_alex', 'alex_code', 'alex@nixo.io', '+14155550104', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Alex Rivera', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80', 'Creative technologist & shader wizard building spatial audio interfaces.', 'Shader Prodigy', 1450, 1, 'user', ?, ?),
      ('user_clara', 'clara_sound', 'clara@nixo.io', '+14155550105', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Clara Dupont', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80', 'Sound designer, ambient modular synth producer, and visual artist.', 'Audio Architect', 2100, 1, 'user', ?, ?),
      ('user_lucas', 'lucas_spatial', 'lucas@nixo.io', '+14155550106', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Lucas Novak', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 'Spatial computing & WebXR enthusiast exploring transparent 3D glass.', 'XR Pioneer', 950, 1, 'user', ?, ?),
      ('user_maya', 'maya_zen', 'maya@nixo.io', '+14155550107', '1d22e0394336c5356ec32b95c029495c0e481c960383f9829f273295b9c51c38', 'Maya Lin', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 'Minimalist graphic artist & typography lover.', 'Design Lead', 1600, 1, 'user', ?, ?)
    `, [now, now, now, now, now, now, now, now]);

    // Seed Friendships (Accepted)
    db.run(`
      INSERT OR IGNORE INTO friendships (user1_id, user2_id, status, created_at)
      VALUES
      ('user_elena', 'user_marcus', 'accepted', ?),
      ('user_elena', 'user_sophia', 'accepted', ?),
      ('user_marcus', 'user_sophia', 'accepted', ?),
      ('user_alex', 'user_marcus', 'accepted', ?),
      ('user_alex', 'user_sophia', 'accepted', ?)
    `, [now, now, now, now, now]);

    // Seed Pending Friend Requests
    db.run(`
      INSERT OR IGNORE INTO friend_requests (id, sender_id, receiver_id, status, created_at, updated_at)
      VALUES
      ('fr_seed_1', 'user_lucas', 'user_elena', 'pending', ?, ?),
      ('fr_seed_2', 'user_maya', 'user_elena', 'pending', ?, ?),
      ('fr_seed_3', 'user_elena', 'user_clara', 'pending', ?, ?)
    `, [now, now, now, now, now, now]);

    // Seed Follows
    db.run(`
      INSERT OR IGNORE INTO follows (follower_id, following_id, created_at)
      VALUES
      ('user_elena', 'user_marcus', ?),
      ('user_elena', 'user_sophia', ?),
      ('user_elena', 'user_alex', ?),
      ('user_marcus', 'user_elena', ?),
      ('user_marcus', 'user_sophia', ?),
      ('user_sophia', 'user_elena', ?),
      ('user_sophia', 'user_marcus', ?),
      ('user_alex', 'user_elena', ?),
      ('user_lucas', 'user_elena', ?),
      ('user_maya', 'user_elena', ?)
    `, [now, now, now, now, now, now, now, now, now, now]);

    // Recalculate and update followers and following count
    const allUsers = ['user_elena', 'user_marcus', 'user_sophia', 'user_alex', 'user_clara', 'user_lucas', 'user_maya', 'user_admin'];
    for (const uId of allUsers) {
      const followersCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE following_id = ?', [uId])?.cnt || 0;
      const followingCount = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM follows WHERE follower_id = ?', [uId])?.cnt || 0;
      db.run('UPDATE users SET followers_count = ?, following_count = ? WHERE id = ?', [followersCount, followingCount, uId]);
    }

    saveDatabaseToDisk(db);
  }

  // Idempotent Stories, Reels, and Videos Seeder
  const existingStories = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM stories');
  if (!existingStories || existingStories.cnt === 0) {
    console.log('Seeding rich interactive Stories, Reels, and Videos...');
    const now = new Date().toISOString();
    const expiresTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 1. Stories
    db.run(`
      INSERT INTO stories (
        id, user_id, media_url, media_type, story_type, text_content, text_style,
        music_metadata, stickers, emojis, mentions, poll_data, link_data, privacy,
        caption, expires_at, created_at
      ) VALUES
      (
        'story_seed_1', 'user_elena',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        'image', 'image', NULL, NULL,
        '{"title":"Ethereal Glass Resonance","artist":"Nixo Studio Lab","audioUrl":""}',
        '[{"id":"stk_1","type":"badge","content":"Liquid Glass 2026","x":20,"y":30}]',
        '[{"id":"em_1","emoji":"✨","x":75,"y":25}]',
        '[{"userId":"user_marcus","username":"marcus_tech","x":20,"y":85}]',
        '{"question":"Which design direction inspires you more?","options":[{"id":"opt_1","text":"Translucent Glassmorphic","votes":52},{"id":"opt_2","text":"OLED Pure Minimalist","votes":21}],"userVotes":{"user_marcus":"opt_1"}}',
        '{"url":"https://nixo.io/liquid-glass","title":"Explore Liquid UI Specs"}',
        'public',
        'Exploring real-time refraction caustics in our new Liquid Glass design engine! 💎',
        ?, ?
      ),
      (
        'story_seed_2', 'user_marcus',
        '',
        'image', 'text',
        'Patching modular analog oscillators into WebAudio nodes for tonight’s spatial live session! Tune in at 8 PM UTC 🎛️⚡',
        '{"font":"sans","bgGradient":"from-violet-600 via-indigo-600 to-cyan-500","textColor":"#FFFFFF","textAlign":"center"}',
        '{"title":"Subharmonic Modular Drift","artist":"Marcus Vance"}',
        '[{"id":"stk_2","type":"tag","content":"Sound On 🔊","x":30,"y":20}]',
        '[{"id":"em_2","emoji":"🎧","x":70,"y":80}]',
        '[{"userId":"user_sophia","username":"sophia_ai","x":25,"y":75}]',
        NULL,
        '{"url":"https://nixo.io/live","title":"Join Live Stream"}',
        'public',
        'Analog frequencies & generative patch session',
        ?, ?
      ),
      (
        'story_seed_3', 'user_sophia',
        'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-code-31911-large.mp4',
        'video', 'video', NULL, NULL,
        '{"title":"Neural Latent Drift","artist":"Sophia Chen"}',
        '[{"id":"stk_3","type":"badge","content":"WebGPU Neural","x":15,"y":20}]',
        '[{"id":"em_3","emoji":"⚡","x":80,"y":30}]',
        NULL,
        '{"question":"Are you building with WebGPU shaders this year?","options":[{"id":"opt_1","text":"Yes, production ready!","votes":38},{"id":"opt_2","text":"Still learning WebGL","votes":14}],"userVotes":{"user_elena":"opt_1"}}',
        NULL,
        'public',
        'Compiling compute shaders on device for neural style transfer.',
        ?, ?
      ),
      (
        'story_seed_4', 'user_alex',
        'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
        'image', 'image', NULL, NULL,
        '{"title":"Chromatic Aberration","artist":"Alex Rivera"}',
        '[{"id":"stk_4","type":"badge","content":"120 FPS Native","x":20,"y":25}]',
        '[{"id":"em_4","emoji":"🚀","x":80,"y":70}]',
        NULL,
        NULL,
        '{"url":"https://github.com/nixo/shaders","title":"Shader Code"}',
        'public',
        'Real-time chromatic aberration running at 120 FPS on mobile browsers.',
        ?, ?
      )
    `, [expiresTomorrow, now, expiresTomorrow, now, expiresTomorrow, now, expiresTomorrow, now]);

    // Seed Story Views & Reactions
    db.run(`
      INSERT INTO story_views (id, story_id, viewer_id, viewed_at)
      VALUES
      ('sv_1', 'story_seed_1', 'user_marcus', ?),
      ('sv_2', 'story_seed_1', 'user_sophia', ?),
      ('sv_3', 'story_seed_1', 'user_alex', ?),
      ('sv_4', 'story_seed_2', 'user_elena', ?),
      ('sv_5', 'story_seed_2', 'user_sophia', ?)
    `, [now, now, now, now, now]);

    db.run(`
      INSERT INTO story_reactions (id, story_id, user_id, reaction_type, created_at)
      VALUES
      ('sr_1', 'story_seed_1', 'user_marcus', '🔥', ?),
      ('sr_2', 'story_seed_1', 'user_sophia', '❤️', ?),
      ('sr_3', 'story_seed_2', 'user_elena', '👏', ?)
    `, [now, now, now]);

    // 2. Reels
    db.run(`
      INSERT INTO reels (
        id, user_id, video_url, thumbnail_url, caption, music_title, music_artist,
        music_cover_url, hashtags, likes_count, comments_count, views_count,
        reposts_count, saves_count, gifts_count, duration, aspect_ratio, created_at
      ) VALUES
      (
        'reel_seed_1', 'user_elena',
        'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-vertical-screen-43254-large.mp4',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        'Interactive liquid refraction & tactile haptics on mobile #LiquidGlass #DesignUI #Nixo',
        'Liquid Resonance', 'Elena Rostova',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        '["LiquidGlass","DesignUI","Nixo","CreativeTech"]',
        1420, 84, 5310, 32, 115, 18, 15.0, '9:16', ?
      ),
      (
        'reel_seed_2', 'user_marcus',
        'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-animation-41484-large.mp4',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        'Live Eurorack oscillator frequency sweeps with visual oscilloscope #Synthesizer #Eurorack #AudioVisual',
        'Subharmonic Pulse', 'Marcus Vance',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        '["Synthesizer","Eurorack","AudioVisual","SoundDesign"]',
        980, 46, 3820, 19, 74, 9, 15.0, '9:16', ?
      ),
      (
        'reel_seed_3', 'user_sophia',
        'https://assets.mixkit.co/videos/preview/mixkit-digital-matrix-style-code-lines-animation-41584-large.mp4',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
        'Real-time neural particle field running via WebGPU shaders #GenerativeAI #WebGPU #FutureTech',
        'Cybernetic Horizon', 'Sophia Chen',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
        '["GenerativeAI","WebGPU","FutureTech","CodeArt"]',
        2150, 132, 8940, 68, 312, 35, 15.0, '9:16', ?
      ),
      (
        'reel_seed_4', 'user_alex',
        'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'Golden hour volumetric atmospheric lighting in WebGL #3D #Graphics #WebGL #CreativeCoding',
        'Golden Hour Glow', 'Alex Rivera',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        '["3D","Graphics","WebGL","CreativeCoding"]',
        760, 39, 2490, 14, 53, 6, 15.0, '9:16', ?
      )
    `, [now, now, now, now]);

    // Reel Likes & Comments
    db.run(`
      INSERT INTO reel_likes (id, reel_id, user_id, created_at)
      VALUES
      ('rl_1', 'reel_seed_1', 'user_marcus', ?),
      ('rl_2', 'reel_seed_1', 'user_sophia', ?),
      ('rl_3', 'reel_seed_2', 'user_elena', ?),
      ('rl_4', 'reel_seed_3', 'user_elena', ?)
    `, [now, now, now, now]);

    db.run(`
      INSERT INTO reel_comments (id, reel_id, user_id, content, created_at)
      VALUES
      ('rc_1', 'reel_seed_1', 'user_marcus', 'The refraction curves are so satisfying! What framerate is this running at?', ?),
      ('rc_2', 'reel_seed_1', 'user_sophia', 'Gave 50 coins to support this project! Stunning aesthetics.', ?),
      ('rc_3', 'reel_seed_2', 'user_elena', 'That low-pass filter squelch is gorgeous. Great patch!', ?),
      ('rc_4', 'reel_seed_3', 'user_alex', 'WebGPU compute is truly the future of browser graphics.', ?)
    `, [now, now, now, now]);

    // 3. Videos (Video Feed & Player)
    db.run(`
      INSERT INTO videos (
        id, user_id, title, video_url, thumbnail_url, caption, music_title, category, tags,
        duration_seconds, views_count, likes_count, comments_count, quality_sources,
        captions_data, status, created_at
      ) VALUES
      (
        'vid_seed_1', 'user_elena',
        'Designing the Next Generation Liquid Glass Operating System',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        'Full engineering breakdown of real-time refraction caustics, blur shaders, accessibility contrast, and spatial layering in modern interfaces.',
        'Nixo Fluid Acoustics', 'creative',
        '["Design","LiquidGlass","SpatialUI","Motion","WebGL"]',
        596, 14200, 1890, 142,
        '{"1080p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4","720p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4","480p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4","360p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}',
        '[{"start":0,"end":4,"text":"Welcome creators to the Nixo Liquid Design system overview."},{"start":4,"end":9,"text":"Today we explore physical refraction, caustics, and adaptive glass layers."},{"start":9,"end":15,"text":"Notice how the backdrop blur maintains accessibility contrast while feeling weightless."},{"start":15,"end":23,"text":"Our real-time shaders compute micro-surface normal dispersion in WebGL."},{"start":23,"end":30,"text":"Let us inspect the live interaction and gesture physics."}]',
        'active', ?
      ),
      (
        'vid_seed_2', 'user_marcus',
        'Generative Modular Synthesis: Eurorack to WebAudio Architecture',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
        'In-depth architectural session connecting physical analog Eurorack modules with WebAudio API nodes for synchronized spatial soundscapes.',
        'Analog Drift Master', 'music',
        '["Synthesizer","Eurorack","WebAudio","SoundDesign","Ambient"]',
        653, 9400, 1240, 88,
        '{"1080p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4","720p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4","480p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"}',
        '[{"start":0,"end":5,"text":"Connecting analog CV clock signals into WebAudio audio worklets."},{"start":5,"end":12,"text":"The resonance peaks are controlled by high-order state variable filters."},{"start":12,"end":20,"text":"Observe how probability gates create organic polyrhythmic structures."}]',
        'active', ?
      ),
      (
        'vid_seed_3', 'user_sophia',
        'WebGPU Compute Shaders: High-Throughput On-Device Neural Graphics',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        'Demonstrating real-time tensor computation and WGSL shaders executing directly on consumer hardware inside the browser with zero cloud latency.',
        'Neural Matrix Pulse', 'tech',
        '["WebGPU","WGSL","MachineLearning","HighPerformance","Graphics"]',
        15, 18700, 2840, 210,
        '{"1080p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4","720p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}',
        '[{"start":0,"end":4,"text":"Compiling WGSL compute pipelines directly on the GPU."},{"start":4,"end":9,"text":"Processing two million particles with instantaneous sub-frame latency."},{"start":9,"end":15,"text":"Next we integrate memory barriers for lock-free parallel reductions."}]',
        'active', ?
      ),
      (
        'vid_seed_4', 'user_alex',
        'Procedural Cyberpunk Metropolis in Three.js and WebGL',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
        'Procedural neon signage, wet asphalt screen-space reflections, volumetric fog, and optimized instanced meshes running smoothly across devices.',
        'Cyber Rain Symphony', 'gaming',
        '["ThreeJS","Cyberpunk","Procedural","Shaders","WebGL"]',
        15, 11300, 1560, 94,
        '{"1080p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4","720p":"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"}',
        '[{"start":0,"end":4,"text":"Procedural city generation using low-memory instanced meshes."},{"start":4,"end":9,"text":"Screen space reflections simulate realistic wet asphalt neon bounce."},{"start":9,"end":15,"text":"Optimized to maintain a steady 60 FPS on integrated graphics."}]',
        'active', ?
      )
    `, [now, now, now, now]);

    // Seed Video Likes
    db.run(`
      INSERT INTO video_likes (id, video_id, user_id, created_at)
      VALUES
      ('vl_1', 'vid_seed_1', 'user_marcus', ?),
      ('vl_2', 'vid_seed_1', 'user_sophia', ?),
      ('vl_3', 'vid_seed_2', 'user_elena', ?),
      ('vl_4', 'vid_seed_3', 'user_elena', ?)
    `, [now, now, now, now]);

    // Seed Video Comments
    db.run(`
      INSERT INTO video_comments (id, video_id, user_id, content, created_at)
      VALUES
      ('vc_1', 'vid_seed_1', 'user_marcus', 'The explanation of the refraction shader pipeline around 0:15 is the clearest tutorial I have seen on liquid glass!', ?),
      ('vc_2', 'vid_seed_1', 'user_sophia', 'Bookmarking this for our engineering team. Incredible production quality!', ?),
      ('vc_3', 'vid_seed_2', 'user_elena', 'The polyrhythm gate trigger demo is mesmerizing. Looking forward to the sample library release.', ?)
    `, [now, now, now]);

    // Seed Video Watch History for demo user
    db.run(`
      INSERT INTO video_watch_history (id, user_id, video_id, watch_time_seconds, last_position_seconds, completed, updated_at)
      VALUES
      ('vwh_1', 'user_elena', 'vid_seed_2', 180, 180, 0, ?),
      ('vwh_2', 'user_elena', 'vid_seed_3', 15, 15, 1, ?)
    `, [now, now]);

    saveDatabaseToDisk(db);
  }

  // Idempotent Real-Time Messenger Seeder (Direct & Group chats, media, voice, reactions, replies)
  const existingConv = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM conversations');
  if (!existingConv || existingConv.cnt === 0) {
    console.log('Seeding rich real-time conversations, group chats, and messages...');
    const now = new Date().toISOString();
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // 1. Direct Conversation between Elena and Marcus
    db.run(`
      INSERT INTO conversations (id, type, title, avatar_url, created_by, created_at, updated_at, last_message_at)
      VALUES ('conv_elena_marcus', 'direct', null, null, 'user_elena', ?, ?, ?)
    `, [twoHoursAgo, now, now]);

    db.run(`
      INSERT INTO conversation_members (conversation_id, user_id, role, is_pinned, is_muted, is_archived, joined_at)
      VALUES 
      ('conv_elena_marcus', 'user_elena', 'member', 1, 0, 0, ?),
      ('conv_elena_marcus', 'user_marcus', 'member', 0, 0, 0, ?)
    `, [twoHoursAgo, twoHoursAgo]);

    // 2. Direct Conversation between Elena and Sophia
    db.run(`
      INSERT INTO conversations (id, type, title, avatar_url, created_by, created_at, updated_at, last_message_at)
      VALUES ('conv_elena_sophia', 'direct', null, null, 'user_sophia', ?, ?, ?)
    `, [twoHoursAgo, tenMinsAgo, tenMinsAgo]);

    db.run(`
      INSERT INTO conversation_members (conversation_id, user_id, role, is_pinned, is_muted, is_archived, joined_at)
      VALUES 
      ('conv_elena_sophia', 'user_elena', 'member', 0, 0, 0, ?),
      ('conv_elena_sophia', 'user_sophia', 'member', 0, 0, 0, ?)
    `, [twoHoursAgo, twoHoursAgo]);

    // 3. Group Conversation: Liquid Glass Architects
    db.run(`
      INSERT INTO conversations (id, type, title, avatar_url, created_by, created_at, updated_at, last_message_at)
      VALUES ('conv_group_liquid_architects', 'group', 'Liquid Glass Architects', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80', 'user_elena', ?, ?, ?)
    `, [twoHoursAgo, twentyMinsAgo, twentyMinsAgo]);

    db.run(`
      INSERT INTO conversation_members (conversation_id, user_id, role, is_pinned, is_muted, is_archived, joined_at)
      VALUES 
      ('conv_group_liquid_architects', 'user_elena', 'creator', 1, 0, 0, ?),
      ('conv_group_liquid_architects', 'user_marcus', 'admin', 0, 0, 0, ?),
      ('conv_group_liquid_architects', 'user_sophia', 'member', 0, 0, 0, ?),
      ('conv_group_liquid_architects', 'user_alex', 'member', 0, 0, 0, ?)
    `, [twoHoursAgo, twoHoursAgo, twoHoursAgo, twoHoursAgo]);

    // Messages for conv_elena_marcus
    db.run(`
      INSERT INTO messages (
        id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url,
        file_name, file_size, file_type, coin_amount, reply_to_id, is_edited, is_read, status, created_at
      ) VALUES
      (
        'msg_seed_1', 'conv_elena_marcus', 'user_elena', 'user_marcus',
        'Hey Marcus! Have you tested the new caustics shader build on mobile?',
        'text', null, null, null, 0, null, 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_2', 'conv_elena_marcus', 'user_marcus', 'user_elena',
        'Yes! Running rock solid at 60 FPS. Here is a render preview of the refractive dispersion mesh.',
        'image', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80', null,
        null, 0, null, 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_3', 'conv_elena_marcus', 'user_elena', 'user_marcus',
        'That transmission fidelity is breathtaking! Did you use multi-pass blur?',
        'text', null, null, null, 0, null, 0, 'msg_seed_2', 0, 1, 'read', ?
      ),
      (
        'msg_seed_4', 'conv_elena_marcus', 'user_marcus', 'user_elena',
        'Here is the ambient spatial audio layer I composed for the glass interactions:',
        'audio', null, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', null, 0, 'audio/mp3', 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_5', 'conv_elena_marcus', 'user_elena', 'user_marcus',
        'Sending 100 coins to support this development!',
        'coins', null, null, null, 0, null, 100, null, 0, 1, 'read', ?
      )
    `, [twoHoursAgo, oneHourAgo, twentyMinsAgo, tenMinsAgo, now]);

    // Reactions for messages
    db.run(`
      INSERT INTO message_reactions (id, message_id, user_id, reaction, created_at)
      VALUES
      ('mr_1', 'msg_seed_2', 'user_elena', '🔥', ?),
      ('mr_2', 'msg_seed_2', 'user_elena', '💎', ?),
      ('mr_3', 'msg_seed_4', 'user_elena', '❤️', ?),
      ('mr_4', 'msg_seed_5', 'user_marcus', '❤️', ?)
    `, [oneHourAgo, oneHourAgo, tenMinsAgo, now]);

    // Messages for conv_elena_sophia
    db.run(`
      INSERT INTO messages (
        id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url,
        file_name, file_size, file_type, coin_amount, reply_to_id, is_edited, is_read, status, created_at
      ) VALUES
      (
        'msg_seed_6', 'conv_elena_sophia', 'user_sophia', 'user_elena',
        'Elena, here is the complete design specification documentation for the liquid glass modal components.',
        'file', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', null,
        'Nixo_Liquid_Architecture_v2.pdf', 2450000, 'application/pdf', 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_7', 'conv_elena_sophia', 'user_elena', 'user_sophia',
        'Downloaded! Reviewing the chromatic aberration tokens now.',
        'text', null, null, null, 0, null, 0, 'msg_seed_6', 0, 1, 'read', ?
      )
    `, [oneHourAgo, tenMinsAgo]);

    // Messages for conv_group_liquid_architects
    db.run(`
      INSERT INTO messages (
        id, conversation_id, sender_id, receiver_id, content, message_type, media_url, audio_url,
        file_name, file_size, file_type, coin_amount, reply_to_id, is_edited, is_read, status, created_at
      ) VALUES
      (
        'msg_seed_8', 'conv_group_liquid_architects', 'user_elena', null,
        'Welcome everyone to the Liquid Glass Architects workspace! 🔮 Let us collaborate on sovereign spatial interfaces and real-time audio-visual UI.',
        'text', null, null, null, 0, null, 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_9', 'conv_group_liquid_architects', 'user_marcus', null,
        'Happy to be here! The WebGPU pipeline benchmarks look promising for sub-frame caustics.',
        'text', null, null, null, 0, null, 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_10', 'conv_group_liquid_architects', 'user_alex', null,
        'Procedural wet asphalt reflections shader is ready for testing.',
        'text', null, null, null, 0, null, 0, null, 0, 1, 'read', ?
      ),
      (
        'msg_seed_11', 'conv_group_liquid_architects', 'user_sophia', null,
        'I am finalizing the high-contrast accessibility tokens for dark glass themes. Will push the Figma spec today.',
        'text', null, null, null, 0, null, 0, null, 0, 1, 'read', ?
      )
    `, [twoHoursAgo, oneHourAgo, thirtyMinsAgo, twentyMinsAgo]);

    db.run(`
      INSERT INTO message_reactions (id, message_id, user_id, reaction, created_at)
      VALUES
      ('mr_5', 'msg_seed_8', 'user_marcus', '🔥', ?),
      ('mr_6', 'msg_seed_8', 'user_sophia', '❤️', ?),
      ('mr_7', 'msg_seed_8', 'user_alex', '💎', ?)
    `, [twoHoursAgo, twoHoursAgo, twoHoursAgo]);

    saveDatabaseToDisk(db);
  }

  // Idempotent Notification System Seeder (All 19 Notification Types + Preferences + Push Subscriptions)
  const existingNotifs = queryDbOne(db, 'SELECT COUNT(*) as cnt FROM notifications');
  if (!existingNotifs || existingNotifs.cnt === 0) {
    console.log('Seeding rich interactive notification suite covering all 19 notification types...');
    const now = new Date().toISOString();
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Default notification preferences for demo users
    const users = ['user_elena', 'user_marcus', 'user_sophia', 'user_alex', 'user_admin'];
    users.forEach((uId) => {
      try {
        db.run(`
          INSERT OR IGNORE INTO notification_preferences (
            id, user_id, in_app_enabled, browser_push_enabled, mobile_push_enabled, email_enabled, sound_enabled,
            dnd_enabled, dnd_start, dnd_end,
            pref_friend_request, pref_friend_accepted, pref_follow, pref_like, pref_comment, pref_reply,
            pref_mention, pref_share, pref_repost, pref_message, pref_group_activity, pref_page_activity,
            pref_event_activity, pref_gift_received, pref_coin_received, pref_coin_purchase,
            pref_withdrawal_update, pref_admin_announcement, pref_security_alert, updated_at
          ) VALUES (?, ?, 1, 1, 1, 1, 1, 0, '22:00', '07:00', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ?)
        `, ['np_' + uId, uId, now]);
      } catch (e) {}
    });

    // Seed Push Subscriptions
    try {
      db.run(`
        INSERT INTO push_subscriptions (id, user_id, platform, endpoint, p256dh, auth, device_name, is_active, created_at, updated_at)
        VALUES
        ('sub_web_1', 'user_elena', 'web', 'https://fcm.googleapis.com/fcm/send/nixo_web_elena_client', 'BKzP39xL82...', 'AuthKey_Web_Elena', 'Google Chrome on Linux (Spatial Engine)', 1, ?, ?),
        ('sub_mobile_1', 'user_elena', 'ios', null, null, null, 'Apple iPhone 16 Pro (Nixo iOS Client)', 1, ?, ?)
      `, [oneDayAgo, now, twoDaysAgo, now]);
    } catch (e) {}

    // Seed all 19 notification types for user_elena
    db.run(`
      INSERT INTO notifications (
        id, user_id, sender_id, type, reference_id, reference_type, message, is_read, metadata, dedup_key, action_url, created_at
      ) VALUES
      (
        'notif_1_friend_req', 'user_elena', 'user_lucas', 'friend_request', 'user_lucas', 'user',
        'Lucas Novak sent you a friend request.',
        0, '{"route":"friends","userId":"user_lucas","senderName":"Lucas Novak","actionUrl":"/friends"}', 'freq_user_lucas_user_elena', '/friends', ?
      ),
      (
        'notif_2_friend_acc', 'user_elena', 'user_maya', 'friend_accepted', 'user_maya', 'user',
        'Maya Lin accepted your friend request. You are now connected in Nixo!',
        0, '{"route":"profile","userId":"user_maya","senderName":"Maya Lin","actionUrl":"/profile/user_maya"}', 'facc_user_maya_user_elena', '/profile/user_maya', ?
      ),
      (
        'notif_3_follow', 'user_elena', 'user_sophia', 'follow', 'user_sophia', 'user',
        'Sophia Chen started following your transmissions and spatial designs.',
        0, '{"route":"profile","userId":"user_sophia","senderName":"Sophia Chen","actionUrl":"/profile/user_sophia"}', 'follow_user_sophia_user_elena', '/profile/user_sophia', ?
      ),
      (
        'notif_4_like', 'user_elena', 'user_marcus', 'like', 'post_seed_1', 'post',
        'Marcus Vance reacted with ❤️ to your transmission "Liquid Glass 3D UI Exploration".',
        0, '{"route":"post","postId":"post_seed_1","reactionType":"❤️","previewText":"Liquid Glass 3D UI Exploration"}', 'like_user_marcus_post_seed_1', '/post/post_seed_1', ?
      ),
      (
        'notif_5_comment', 'user_elena', 'user_clara', 'comment', 'post_seed_1', 'post',
        'Clara Dupont commented: "The refraction shader is sublime! Can’t wait for the tutorial release."',
        0, '{"route":"post","postId":"post_seed_1","commentId":"vc_1"}', 'comm_user_clara_post_seed_1', '/post/post_seed_1', ?
      ),
      (
        'notif_6_reply', 'user_elena', 'user_marcus', 'reply', 'post_seed_2', 'post',
        'Marcus Vance replied to your comment on "WebGPU Shaders": "Agreed, instanced buffers save ~4ms per frame."',
        0, '{"route":"post","postId":"post_seed_2"}', 'reply_user_marcus_post_seed_2', '/post/post_seed_2', ?
      ),
      (
        'notif_7_mention', 'user_elena', 'user_sophia', 'mention', 'post_seed_3', 'post',
        'Sophia Chen mentioned you in a transmission: "@elena_vibe check out this caustic distortion map!"',
        0, '{"route":"post","postId":"post_seed_3"}', 'mention_user_sophia_post_seed_3', '/post/post_seed_3', ?
      ),
      (
        'notif_8_share', 'user_elena', 'user_alex', 'share', 'post_seed_1', 'post',
        'Alex Rivera shared your transmission with his 4.2k followers.',
        1, '{"route":"post","postId":"post_seed_1"}', 'share_user_alex_post_seed_1', '/post/post_seed_1', ?
      ),
      (
        'notif_9_repost', 'user_elena', 'user_marcus', 'repost', 'post_seed_1', 'post',
        'Marcus Vance reposted your post to his network.',
        1, '{"route":"post","postId":"post_seed_1"}', 'repost_user_marcus_post_seed_1', '/post/post_seed_1', ?
      ),
      (
        'notif_10_message', 'user_elena', 'user_sophia', 'message', 'conv_group_liquid_architects', 'conversation',
        'Sophia Chen sent a message in Liquid Glass Architects: "Finalizing the high-contrast tokens for dark glass themes."',
        0, '{"route":"messenger","conversationId":"conv_group_liquid_architects"}', 'msg_user_sophia_conv_group_liquid_architects', '/messenger', ?
      ),
      (
        'notif_11_group_act', 'user_elena', 'user_alex', 'group_activity', 'grp_seed_1', 'group',
        'New discussion in "Liquid Glass Architects": "WebAudio synthesis & procedural soundscapes guide."',
        1, '{"route":"groups","groupId":"grp_seed_1","groupName":"Liquid Glass Architects"}', 'grp_act_grp_seed_1', '/groups', ?
      ),
      (
        'notif_12_page_act', 'user_elena', 'user_admin', 'page_activity', 'page_seed_1', 'page',
        'Nixo Design Lab published a new article: "The Future of Spatial Computing on WebGPU".',
        1, '{"route":"pages","pageId":"page_seed_1","pageName":"Nixo Design Lab"}', 'page_act_page_seed_1', '/pages', ?
      ),
      (
        'notif_13_event_act', 'user_elena', 'user_marcus', 'event_activity', 'event_seed_1', 'event',
        'Upcoming Event: "Global Spatial Web Hackathon 2026" starts in 24 hours. Check schedule & keynote.',
        0, '{"route":"events","eventId":"event_seed_1","eventName":"Global Spatial Web Hackathon 2026"}', 'event_act_event_seed_1', '/events', ?
      ),
      (
        'notif_14_gift_rec', 'user_elena', 'user_marcus', 'gift_received', 'gift_seed_1', 'wallet',
        'Marcus Vance sent you a "Cyber Phoenix" gift (+500 Nixo Coins)! 🔮',
        0, '{"route":"wallet","amount":500,"giftName":"Cyber Phoenix","badge":"💎"}', 'gift_user_marcus_user_elena_1', '/wallet', ?
      ),
      (
        'notif_15_coin_rec', 'user_elena', 'user_clara', 'coin_received', 'tx_seed_tip', 'wallet',
        'You received 250 Nixo Coins from creator tips on your Liquid Glass Shader Tutorial!',
        1, '{"route":"wallet","amount":250,"badge":"🪙"}', 'coin_rec_user_clara_user_elena_1', '/wallet', ?
      ),
      (
        'notif_16_coin_pur', 'user_elena', null, 'coin_purchase', 'tx_seed_buy', 'wallet',
        'Recharge Complete: Successfully purchased 1,000 Nixo Coins (Transaction #AC-9402).',
        1, '{"route":"wallet","amount":1000,"transactionId":"tx_seed_buy"}', 'coin_pur_tx_seed_buy', '/wallet', ?
      ),
      (
        'notif_17_withdraw', 'user_elena', null, 'withdrawal_update', 'with_seed_1', 'wallet',
        'Payout Approved: Your withdrawal request of $120.00 USD to PayPal was completed.',
        1, '{"route":"wallet","amount":120,"currency":"USD","status":"completed"}', 'with_seed_1_approved', '/wallet', ?
      ),
      (
        'notif_18_admin_ann', 'user_elena', 'user_admin', 'admin_announcement', 'ann_seed_1', 'announcement',
        'Nixo Announcement: System Update v2.4 is live with Sovereign Spatial Shaders and WebGPU caustics.',
        0, '{"route":"announcement","title":"System Update v2.4","version":"2.4.0"}', 'ann_seed_1_v24', '/announcements', ?
      ),
      (
        'notif_19_security', 'user_elena', null, 'security_alert', 'sec_seed_1', 'security',
        'Security Notice: New login session established from Chrome on Linux (IP: 192.0.2.45). Verify device.',
        0, '{"route":"settings","tab":"security","ipAddress":"192.0.2.45","device":"Chrome on Linux"}', 'sec_alert_login_192', '/settings', ?
      )
    `, [
      fiveMinsAgo, tenMinsAgo, twentyMinsAgo, thirtyMinsAgo, oneHourAgo,
      twoHoursAgo, threeHoursAgo, fourHoursAgo, fiveHoursAgo, oneHourAgo,
      twoHoursAgo, threeHoursAgo, fourHoursAgo, thirtyMinsAgo, oneHourAgo,
      twoHoursAgo, threeHoursAgo, oneDayAgo, twoDaysAgo
    ]);

    saveDatabaseToDisk(db);
  }
}

// Utility SQL execution helpers
let transactionDepth = 0;

export function beginTransaction(db: SqlJsDatabase): void {
  if (transactionDepth === 0) {
    db.run('BEGIN TRANSACTION;');
  }
  transactionDepth++;
}

export function commitTransaction(db: SqlJsDatabase): void {
  if (transactionDepth > 0) {
    transactionDepth--;
    if (transactionDepth === 0) {
      db.run('COMMIT;');
      saveDatabaseToDisk(db);
    }
  }
}

export function rollbackTransaction(db: SqlJsDatabase): void {
  if (transactionDepth > 0) {
    transactionDepth = 0;
    try {
      db.run('ROLLBACK;');
    } catch (e) {
      console.error('Rollback error:', e);
    }
  }
}

export function isInTransaction(): boolean {
  return transactionDepth > 0;
}

export function queryDbAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const sanitizedParams = params.map((p) => (p === undefined ? null : p));
  const stmt = db.prepare(sql);
  stmt.bind(sanitizedParams);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryDbOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
  const rows = queryDbAll(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runDb(db: SqlJsDatabase, sql: string, params: any[] = []): void {
  const sanitizedParams = params.map((p) => (p === undefined ? null : p));
  db.run(sql, sanitizedParams);
  if (transactionDepth === 0) {
    saveDatabaseToDisk(db);
  }
}
