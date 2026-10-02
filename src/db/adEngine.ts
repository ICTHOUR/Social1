import { Database } from 'sql.js';
import crypto from 'crypto';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';
import {
  AdPlacement,
  AdCampaign,
  AdPlatformSettings,
  AdAnalyticsReport,
  AdProviderType,
  AdFormatType,
  AdPricingModel,
  AdRewardedChallenge,
} from '../types.js';

const AD_SECRET_HMAC = process.env.AD_SECRET_HMAC || 'nixo_liquid_glass_ad_vault_secret_2026';

// ---------------------------------------------------------------------------
// 1. SCHEMA MIGRATIONS & INITIALIZATION
// ---------------------------------------------------------------------------
export function ensureAdTables(db: Database) {
  // 1. Ad Placements
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_placements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      placement_type TEXT NOT NULL,
      allowed_providers TEXT NOT NULL DEFAULT '["internal","direct_sponsor","web_provider","admob"]',
      is_enabled INTEGER DEFAULT 1,
      refresh_interval_sec INTEGER DEFAULT 30,
      reward_coins INTEGER DEFAULT 0,
      frequency_cap_hourly INTEGER DEFAULT 6,
      frequency_cap_daily INTEGER DEFAULT 20,
      cooldown_minutes INTEGER DEFAULT 3,
      min_cpm_rate DECIMAL(10,2) DEFAULT 1.50,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Ad Campaigns
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id TEXT PRIMARY KEY,
      advertiser_id TEXT NOT NULL,
      advertiser_name TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      provider TEXT DEFAULT 'internal',
      ad_format TEXT DEFAULT 'native',
      placements TEXT DEFAULT '["feed_inline"]',
      headline TEXT NOT NULL,
      body_text TEXT NOT NULL,
      call_to_action TEXT DEFAULT 'Learn More',
      destination_url TEXT NOT NULL,
      media_url TEXT,
      media_type TEXT DEFAULT 'image',
      html_snippet TEXT,
      admob_unit_id TEXT,
      pricing_model TEXT DEFAULT 'cpm',
      bid_amount_usd DECIMAL(10,2) DEFAULT 3.50,
      total_budget_usd DECIMAL(10,2) DEFAULT 500.00,
      daily_budget_usd DECIMAL(10,2) DEFAULT 50.00,
      spent_budget_usd DECIMAL(10,2) DEFAULT 0.00,
      start_date TEXT NOT NULL,
      end_date TEXT,
      reward_coins INTEGER DEFAULT 0,
      targeting_config TEXT DEFAULT '{}',
      frequency_cap TEXT DEFAULT '{}',
      impressions_count INTEGER DEFAULT 0,
      clicks_count INTEGER DEFAULT 0,
      rewards_claimed_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Ad Platform Settings
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_platform_settings (
      id TEXT PRIMARY KEY,
      admob_enabled INTEGER DEFAULT 1,
      admob_android_app_id TEXT DEFAULT 'ca-app-pub-3940256099942544~3347511713',
      admob_android_banner_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/6300978111',
      admob_android_interstitial_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/1033173712',
      admob_android_rewarded_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/5224354917',
      admob_android_native_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/2247696110',
      admob_ios_app_id TEXT DEFAULT 'ca-app-pub-3940256099942544~1458782514',
      admob_ios_banner_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/2934735716',
      admob_ios_interstitial_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/4411468910',
      admob_ios_rewarded_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/1712485313',
      admob_ios_native_unit_id TEXT DEFAULT 'ca-app-pub-3940256099942544/3986624511',
      web_ads_enabled INTEGER DEFAULT 1,
      web_ad_network_name TEXT DEFAULT 'Nixo Web Direct Exchange',
      web_header_script TEXT DEFAULT '',
      direct_sponsors_enabled INTEGER DEFAULT 1,
      internal_ads_enabled INTEGER DEFAULT 1,
      global_daily_reward_cap_per_user INTEGER DEFAULT 100,
      reward_cooldown_seconds INTEGER DEFAULT 60,
      ad_blocker_detection_mode TEXT DEFAULT 'notice',
      updated_at TEXT NOT NULL
    );
  `);

  // 4. Ad Impressions
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_impressions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      placement_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT DEFAULT 'desktop',
      cost_usd DECIMAL(10,4) DEFAULT 0.0000,
      created_at TEXT NOT NULL
    );
  `);

  // 5. Ad Clicks
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_clicks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      placement_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      cost_usd DECIMAL(10,4) DEFAULT 0.0000,
      destination_url TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Ad Rewarded Verifications (Server-Side Nonce & Verification Records)
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_reward_verifications (
      id TEXT PRIMARY KEY,
      challenge_token TEXT UNIQUE NOT NULL,
      campaign_id TEXT NOT NULL,
      placement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      nonce TEXT NOT NULL,
      challenge_issued_at TEXT NOT NULL,
      min_watch_duration_sec INTEGER DEFAULT 15,
      verified_at TEXT,
      reward_coins INTEGER DEFAULT 0,
      reward_granted INTEGER DEFAULT 0,
      ssv_transaction_id TEXT,
      status TEXT DEFAULT 'issued',
      ip_address TEXT
    );
  `);

  // 7. Ad User Frequency Table
  db.run(`
    CREATE TABLE IF NOT EXISTS ad_user_frequency (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      placement_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      last_impression_at TEXT NOT NULL,
      hourly_count INTEGER DEFAULT 1,
      daily_count INTEGER DEFAULT 1,
      date_key TEXT NOT NULL
    );
  `);

  // Ensure column migrations if tables existed from legacy schema
  const impressionCols = [
    'campaign_id TEXT DEFAULT ""',
    'placement_id TEXT DEFAULT "feed_inline"',
    'provider TEXT DEFAULT "internal"',
    'user_id TEXT',
    'session_id TEXT',
    'ip_address TEXT',
    'user_agent TEXT',
    'device_type TEXT DEFAULT "desktop"',
    'cost_usd DECIMAL(10,4) DEFAULT 0.0000',
    'created_at TEXT DEFAULT ""',
  ];
  impressionCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE ad_impressions ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  const clickCols = [
    'campaign_id TEXT DEFAULT ""',
    'placement_id TEXT DEFAULT "feed_inline"',
    'provider TEXT DEFAULT "internal"',
    'user_id TEXT',
    'session_id TEXT',
    'cost_usd DECIMAL(10,4) DEFAULT 0.0000',
    'destination_url TEXT DEFAULT ""',
    'created_at TEXT DEFAULT ""',
  ];
  clickCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE ad_clicks ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  const placementCols = [
    'description TEXT DEFAULT ""',
    'placement_type TEXT DEFAULT "banner"',
    'allowed_providers TEXT DEFAULT \'["internal","direct_sponsor","web_provider","admob"]\'',
    'is_enabled INTEGER DEFAULT 1',
    'refresh_interval_sec INTEGER DEFAULT 30',
    'reward_coins INTEGER DEFAULT 0',
    'frequency_cap_hourly INTEGER DEFAULT 6',
    'frequency_cap_daily INTEGER DEFAULT 20',
    'cooldown_minutes INTEGER DEFAULT 3',
    'min_cpm_rate DECIMAL(10,2) DEFAULT 1.50',
    'created_at TEXT DEFAULT ""',
    'updated_at TEXT DEFAULT ""',
  ];
  placementCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE ad_placements ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  const campaignCols = [
    'advertiser_name TEXT DEFAULT ""',
    'title TEXT DEFAULT ""',
    'provider TEXT DEFAULT "internal"',
    'ad_format TEXT DEFAULT "native"',
    'placements TEXT DEFAULT \'["feed_inline"]\'',
    'headline TEXT DEFAULT ""',
    'body_text TEXT DEFAULT ""',
    'call_to_action TEXT DEFAULT "Learn More"',
    'destination_url TEXT DEFAULT ""',
    'media_url TEXT',
    'media_type TEXT DEFAULT "image"',
    'html_snippet TEXT',
    'admob_unit_id TEXT',
    'pricing_model TEXT DEFAULT "cpm"',
    'bid_amount_usd DECIMAL(10,2) DEFAULT 3.50',
    'total_budget_usd DECIMAL(10,2) DEFAULT 500.00',
    'daily_budget_usd DECIMAL(10,2) DEFAULT 50.00',
    'spent_budget_usd DECIMAL(10,2) DEFAULT 0.00',
    'start_date TEXT DEFAULT ""',
    'end_date TEXT',
    'reward_coins INTEGER DEFAULT 0',
    'targeting_config TEXT DEFAULT "{}"',
    'frequency_cap TEXT DEFAULT "{}"',
    'impressions_count INTEGER DEFAULT 0',
    'clicks_count INTEGER DEFAULT 0',
    'rewards_claimed_count INTEGER DEFAULT 0',
    'updated_at TEXT DEFAULT ""',
  ];
  campaignCols.forEach((colDef) => {
    try {
      db.run(`ALTER TABLE ad_campaigns ADD COLUMN ${colDef};`);
    } catch (e) {}
  });

  // Create fast lookup indexes safely
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_ad_imp_camp ON ad_impressions(campaign_id, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_ad_imp_place ON ad_impressions(placement_id, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_ad_clk_camp ON ad_clicks(campaign_id, created_at);');
    db.run('CREATE INDEX IF NOT EXISTS idx_ad_reward_user ON ad_reward_verifications(user_id, status);');
    db.run('CREATE INDEX IF NOT EXISTS idx_ad_freq_user ON ad_user_frequency(user_id, placement_id, date_key);');
  } catch (e) {}

  // Seed default data if empty
  seedDefaultAdData(db);
}

function seedDefaultAdData(db: Database) {
  const now = new Date().toISOString();

  // 1. Settings
  const existingSettings = queryDbOne(db, 'SELECT id FROM ad_platform_settings WHERE id = "default_settings"');
  if (!existingSettings) {
    runDb(
      db,
      `INSERT INTO ad_platform_settings (
        id, admob_enabled, admob_android_app_id, admob_android_banner_unit_id,
        admob_android_interstitial_unit_id, admob_android_rewarded_unit_id,
        admob_ios_app_id, admob_ios_banner_unit_id, admob_ios_interstitial_unit_id,
        admob_ios_rewarded_unit_id, web_ads_enabled, web_ad_network_name,
        web_header_script, direct_sponsors_enabled, internal_ads_enabled,
        global_daily_reward_cap_per_user, reward_cooldown_seconds,
        ad_blocker_detection_mode, updated_at
      ) VALUES (
        'default_settings', 1,
        'ca-app-pub-3940256099942544~3347511713',
        'ca-app-pub-3940256099942544/6300978111',
        'ca-app-pub-3940256099942544/1033173712',
        'ca-app-pub-3940256099942544/5224354917',
        'ca-app-pub-3940256099942544~1458782514',
        'ca-app-pub-3940256099942544/2934735716',
        'ca-app-pub-3940256099942544/4411468910',
        'ca-app-pub-3940256099942544/1712485313',
        1, 'Nixo Web Direct Exchange',
        '', 1, 1, 100, 60, 'notice', ?
      )`,
      [now]
    );
  }

  // 2. Default Placements
  const placementCount = queryDbOne(db, 'SELECT COUNT(*) as c FROM ad_placements');
  if (!placementCount || placementCount.c === 0) {
    const defaultPlacements = [
      {
        id: 'feed_inline',
        name: 'Feed In-Stream Native Glass',
        description: 'Blended organic native sponsored glass cards within the primary social feed stream.',
        placement_type: 'native',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'web_provider']),
        is_enabled: 1,
        refresh_interval_sec: 45,
        reward_coins: 0,
        frequency_cap_hourly: 6,
        frequency_cap_daily: 25,
        cooldown_minutes: 2,
        min_cpm_rate: 3.5,
      },
      {
        id: 'sidebar_right',
        name: 'Right Sidebar Sticky Showcase',
        description: 'Persistent high-visibility glass promotion block on desktop right rail.',
        placement_type: 'banner',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'web_provider', 'admob']),
        is_enabled: 1,
        refresh_interval_sec: 30,
        reward_coins: 0,
        frequency_cap_hourly: 10,
        frequency_cap_daily: 40,
        cooldown_minutes: 1,
        min_cpm_rate: 2.2,
      },
      {
        id: 'reels_interstitial',
        name: 'Reels Immersive Interstitial',
        description: 'Full-height 9:16 video interstitial ad seamlessly rendered between reel playback.',
        placement_type: 'interstitial',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'admob']),
        is_enabled: 1,
        refresh_interval_sec: 0,
        reward_coins: 0,
        frequency_cap_hourly: 3,
        frequency_cap_daily: 10,
        cooldown_minutes: 5,
        min_cpm_rate: 6.0,
      },
      {
        id: 'story_sponsor',
        name: 'Stories Sponsored Snap',
        description: 'Full-screen 24h story slide inserted between friend story transitions.',
        placement_type: 'native',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor']),
        is_enabled: 1,
        refresh_interval_sec: 0,
        reward_coins: 0,
        frequency_cap_hourly: 4,
        frequency_cap_daily: 12,
        cooldown_minutes: 4,
        min_cpm_rate: 4.8,
      },
      {
        id: 'explore_native',
        name: 'Explore Grid Feature Tile',
        description: 'Sponsored tile placed inside Explore & Discovery grid results.',
        placement_type: 'native',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'web_provider']),
        is_enabled: 1,
        refresh_interval_sec: 60,
        reward_coins: 0,
        frequency_cap_hourly: 8,
        frequency_cap_daily: 30,
        cooldown_minutes: 2,
        min_cpm_rate: 2.8,
      },
      {
        id: 'rewarded_coin_modal',
        name: 'Rewarded Coin Vault Stream',
        description: 'Opt-in verified rewarded interactive video ad that credits Nixo coins upon server verification.',
        placement_type: 'rewarded',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'admob', 'web_provider']),
        is_enabled: 1,
        refresh_interval_sec: 0,
        reward_coins: 25,
        frequency_cap_hourly: 4,
        frequency_cap_daily: 10,
        cooldown_minutes: 2,
        min_cpm_rate: 15.0,
      },
      {
        id: 'video_preroll',
        name: 'Video Player Preroll (5s Skip)',
        description: 'Short video ad clip preceding high-definition community video playback.',
        placement_type: 'video',
        allowed_providers: JSON.stringify(['internal', 'direct_sponsor', 'admob']),
        is_enabled: 1,
        refresh_interval_sec: 0,
        reward_coins: 0,
        frequency_cap_hourly: 5,
        frequency_cap_daily: 15,
        cooldown_minutes: 3,
        min_cpm_rate: 8.5,
      },
    ];

    for (const p of defaultPlacements) {
      runDb(
        db,
        `INSERT OR REPLACE INTO ad_placements (
          id, name, description, placement_type, location, allowed_providers, is_enabled,
          refresh_interval_sec, reward_coins, frequency_cap_hourly, frequency_cap_daily,
          cooldown_minutes, min_cpm_rate, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          p.id,
          p.name,
          p.description,
          p.placement_type,
          p.id,
          p.allowed_providers,
          p.is_enabled,
          p.refresh_interval_sec,
          p.reward_coins,
          p.frequency_cap_hourly,
          p.frequency_cap_daily,
          p.cooldown_minutes,
          p.min_cpm_rate,
          now,
          now,
        ]
      );
    }
  }

  // 3. Default Demo Campaigns
  const campaignCount = queryDbOne(db, 'SELECT COUNT(*) as c FROM ad_campaigns');
  if (!campaignCount || campaignCount.c === 0) {
    const demoCampaigns = [
      {
        id: 'camp_nixo_pro',
        advertiser_id: 'user_admin',
        advertiser_name: 'Nixo Network',
        title: 'Upgrade to Nixo Pro: Spatial Audio & Zero Commission',
        status: 'active',
        provider: 'internal',
        ad_format: 'native',
        placements: JSON.stringify(['feed_inline', 'sidebar_right', 'explore_native']),
        headline: 'Unlock 48kHz Spatial Streaming & VIP Badges',
        body_text:
          'Get zero platform commission on gifts, custom profile fluid shaders, and priority discovery across all trending channels.',
        call_to_action: 'Upgrade to Pro',
        destination_url: '/#wallet',
        media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        media_type: 'image',
        pricing_model: 'cpm',
        bid_amount_usd: 5.0,
        total_budget_usd: 2000.0,
        daily_budget_usd: 150.0,
        spent_budget_usd: 142.5,
        start_date: new Date(Date.now() - 7 * 86400000).toISOString(),
        reward_coins: 0,
        targeting_config: JSON.stringify({ device: 'all', verifiedOnly: false }),
        frequency_cap: JSON.stringify({ perUserHourly: 4, perUserDaily: 15, cooldownMinutes: 2 }),
        impressions_count: 2850,
        clicks_count: 146,
        rewards_claimed_count: 0,
      },
      {
        id: 'camp_prism_audio',
        advertiser_id: 'user_elena',
        advertiser_name: 'Prism Spatial Acoustics',
        title: 'Lossless Wireless Studio Monitors with Spatial Tracking',
        status: 'active',
        provider: 'direct_sponsor',
        ad_format: 'native',
        placements: JSON.stringify(['feed_inline', 'sidebar_right', 'video_preroll']),
        headline: 'Experience Sound as Light — 32-bit Float Wireless Audio',
        body_text:
          'Engineered specifically for creators producing immersive binaural streams. Ultra-low 2ms latency with spatial dynamic head tracking.',
        call_to_action: 'Explore Hardware',
        destination_url: 'https://prismacoustics.example.com',
        media_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=80',
        media_type: 'image',
        pricing_model: 'cpc',
        bid_amount_usd: 0.85,
        total_budget_usd: 1200.0,
        daily_budget_usd: 80.0,
        spent_budget_usd: 212.5,
        start_date: new Date(Date.now() - 5 * 86400000).toISOString(),
        reward_coins: 0,
        targeting_config: JSON.stringify({ device: 'all' }),
        frequency_cap: JSON.stringify({ perUserHourly: 3, perUserDaily: 10, cooldownMinutes: 5 }),
        impressions_count: 4210,
        clicks_count: 250,
        rewards_claimed_count: 0,
      },
      {
        id: 'camp_rewarded_vault',
        advertiser_id: 'user_admin',
        advertiser_name: 'Nixo Rewards Vault',
        title: 'Watch & Claim +25 Free Nixo Coins',
        status: 'active',
        provider: 'admob',
        ad_format: 'rewarded',
        placements: JSON.stringify(['rewarded_coin_modal']),
        headline: 'Earn Instant Coins to Tip Your Favorite Creators',
        body_text:
          'Support the network by watching a short verified 15-second sponsor spotlight. Coins are credited instantly to your wallet upon server verification.',
        call_to_action: 'Watch & Claim 25 Coins',
        destination_url: '/#reward',
        media_url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-animation-41484-large.mp4',
        media_type: 'video',
        pricing_model: 'cpv',
        bid_amount_usd: 0.08,
        total_budget_usd: 1500.0,
        daily_budget_usd: 100.0,
        spent_budget_usd: 94.24,
        start_date: new Date(Date.now() - 3 * 86400000).toISOString(),
        reward_coins: 25,
        targeting_config: JSON.stringify({ device: 'all' }),
        frequency_cap: JSON.stringify({ perUserHourly: 2, perUserDaily: 6, cooldownMinutes: 5 }),
        impressions_count: 1178,
        clicks_count: 312,
        rewards_claimed_count: 284,
      },
      {
        id: 'camp_web_partner_cloud',
        advertiser_id: 'user_marcus',
        advertiser_name: 'HyperGPU Cloud',
        title: 'Real-Time Neural Shaders on Serverless WebGPU',
        status: 'active',
        provider: 'web_provider',
        ad_format: 'banner',
        placements: JSON.stringify(['sidebar_right', 'feed_inline']),
        headline: 'Instant WebGPU Rendering Clusters with Zero Setup',
        body_text:
          'Deploy neural radiance fields and generative particle simulations at 120fps with sub-millisecond edge routing.',
        call_to_action: 'Start Free Tier',
        destination_url: 'https://hypergpu.example.com',
        media_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        media_type: 'image',
        pricing_model: 'cpm',
        bid_amount_usd: 4.2,
        total_budget_usd: 800.0,
        daily_budget_usd: 50.0,
        spent_budget_usd: 84.0,
        start_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        reward_coins: 0,
        targeting_config: JSON.stringify({ device: 'desktop' }),
        frequency_cap: JSON.stringify({ perUserHourly: 5, perUserDaily: 20, cooldownMinutes: 2 }),
        impressions_count: 1980,
        clicks_count: 88,
        rewards_claimed_count: 0,
      },
    ];

    for (const c of demoCampaigns) {
      runDb(
        db,
        `INSERT OR REPLACE INTO ad_campaigns (
          id, advertiser_id, advertiser_name, name, title, status, provider, ad_format,
          placements, headline, body_text, call_to_action, destination_url,
          media_url, media_type, pricing_model, bid_amount_usd, total_budget_usd,
          daily_budget_usd, spent_budget_usd, total_budget_coins, start_date, reward_coins,
          targeting_config, frequency_cap, impressions_count, clicks_count,
          rewards_claimed_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.id,
          c.advertiser_id,
          c.advertiser_name,
          c.title,
          c.title,
          c.status,
          c.provider,
          c.ad_format,
          c.placements,
          c.headline,
          c.body_text,
          c.call_to_action,
          c.destination_url,
          c.media_url,
          c.media_type,
          c.pricing_model,
          c.bid_amount_usd,
          c.total_budget_usd,
          c.daily_budget_usd,
          c.spent_budget_usd,
          Math.round(c.total_budget_usd * 100),
          c.start_date,
          c.reward_coins,
          c.targeting_config,
          c.frequency_cap,
          c.impressions_count,
          c.clicks_count,
          c.rewards_claimed_count,
          now,
          now,
        ]
      );
    }
  }

  saveDbSync();
}

// ---------------------------------------------------------------------------
// 2. PLACEMENTS ENGINE
// ---------------------------------------------------------------------------
export function getAdPlacements(db: Database): AdPlacement[] {
  const rows = queryDbAll(db, 'SELECT * FROM ad_placements ORDER BY is_enabled DESC, name ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    placementType: r.placement_type as AdFormatType,
    allowedProviders: JSON.parse(r.allowed_providers || '[]'),
    isEnabled: Boolean(r.is_enabled),
    refreshIntervalSec: r.refresh_interval_sec,
    rewardCoins: r.reward_coins,
    frequencyCapHourly: r.frequency_cap_hourly,
    frequencyCapDaily: r.frequency_cap_daily,
    cooldownMinutes: r.cooldown_minutes,
    minCpmRate: Number(r.min_cpm_rate || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function updateAdPlacement(db: Database, id: string, data: Partial<AdPlacement>) {
  const now = new Date().toISOString();
  const current = queryDbOne(db, 'SELECT * FROM ad_placements WHERE id = ?', [id]);
  if (!current) throw new Error(`Placement ${id} not found`);

  runDb(
    db,
    `UPDATE ad_placements SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      placement_type = COALESCE(?, placement_type),
      allowed_providers = COALESCE(?, allowed_providers),
      is_enabled = COALESCE(?, is_enabled),
      refresh_interval_sec = COALESCE(?, refresh_interval_sec),
      reward_coins = COALESCE(?, reward_coins),
      frequency_cap_hourly = COALESCE(?, frequency_cap_hourly),
      frequency_cap_daily = COALESCE(?, frequency_cap_daily),
      cooldown_minutes = COALESCE(?, cooldown_minutes),
      min_cpm_rate = COALESCE(?, min_cpm_rate),
      updated_at = ?
     WHERE id = ?`,
    [
      data.name,
      data.description,
      data.placementType,
      data.allowedProviders ? JSON.stringify(data.allowedProviders) : null,
      data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : null,
      data.refreshIntervalSec,
      data.rewardCoins,
      data.frequencyCapHourly,
      data.frequencyCapDaily,
      data.cooldownMinutes,
      data.minCpmRate,
      now,
      id,
    ]
  );
  saveDbSync();
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. CAMPAIGNS ENGINE
// ---------------------------------------------------------------------------
export function getAdCampaigns(db: Database, filter?: { status?: string; provider?: string }): AdCampaign[] {
  let query = 'SELECT * FROM ad_campaigns WHERE 1=1';
  const params: any[] = [];
  if (filter?.status && filter.status !== 'all') {
    query += ' AND status = ?';
    params.push(filter.status);
  }
  if (filter?.provider && filter.provider !== 'all') {
    query += ' AND provider = ?';
    params.push(filter.provider);
  }
  query += ' ORDER BY created_at DESC';

  const rows = queryDbAll(db, query, params);
  return rows.map((r) => formatCampaignRow(r));
}

export function getAdCampaignById(db: Database, id: string): AdCampaign | null {
  const row = queryDbOne(db, 'SELECT * FROM ad_campaigns WHERE id = ?', [id]);
  return row ? formatCampaignRow(row) : null;
}

function formatCampaignRow(r: any): AdCampaign {
  return {
    id: r.id,
    advertiserId: r.advertiser_id,
    advertiserName: r.advertiser_name,
    title: r.title,
    status: r.status,
    provider: r.provider as AdProviderType,
    adFormat: r.ad_format as AdFormatType,
    placements: JSON.parse(r.placements || '[]'),
    headline: r.headline,
    bodyText: r.body_text,
    callToAction: r.call_to_action || 'Learn More',
    destinationUrl: r.destination_url,
    mediaUrl: r.media_url,
    mediaType: r.media_type || 'image',
    htmlSnippet: r.html_snippet,
    admobUnitId: r.admob_unit_id,
    pricingModel: r.pricing_model as AdPricingModel,
    bidAmountUsd: Number(r.bid_amount_usd || 0),
    totalBudgetUsd: Number(r.total_budget_usd || 0),
    dailyBudgetUsd: Number(r.daily_budget_usd || 0),
    spentBudgetUsd: Number(r.spent_budget_usd || 0),
    startDate: r.start_date,
    endDate: r.end_date,
    rewardCoins: r.reward_coins || 0,
    targetingConfig: JSON.parse(r.targeting_config || '{}'),
    frequencyCap: JSON.parse(r.frequency_cap || '{}'),
    impressionsCount: r.impressions_count || 0,
    clicksCount: r.clicks_count || 0,
    rewardsClaimedCount: r.rewards_claimed_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createAdCampaign(db: Database, data: Partial<AdCampaign>, creatorUserId: string, creatorName: string) {
  const now = new Date().toISOString();
  const id = `camp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  runDb(
    db,
    `INSERT INTO ad_campaigns (
      id, advertiser_id, advertiser_name, title, status, provider, ad_format,
      placements, headline, body_text, call_to_action, destination_url,
      media_url, media_type, html_snippet, admob_unit_id, pricing_model,
      bid_amount_usd, total_budget_usd, daily_budget_usd, spent_budget_usd,
      start_date, end_date, reward_coins, targeting_config, frequency_cap,
      impressions_count, clicks_count, rewards_claimed_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    [
      id,
      creatorUserId,
      creatorName || 'Advertiser',
      data.title || 'Untitled Campaign',
      data.status || 'active',
      data.provider || 'internal',
      data.adFormat || 'native',
      JSON.stringify(data.placements || ['feed_inline']),
      data.headline || data.title || '',
      data.bodyText || '',
      data.callToAction || 'Learn More',
      data.destinationUrl || '/',
      data.mediaUrl || null,
      data.mediaType || 'image',
      data.htmlSnippet || null,
      data.admobUnitId || null,
      data.pricingModel || 'cpm',
      data.bidAmountUsd ?? 3.5,
      data.totalBudgetUsd ?? 500.0,
      data.dailyBudgetUsd ?? 50.0,
      data.startDate || now,
      data.endDate || null,
      data.rewardCoins ?? 0,
      JSON.stringify(data.targetingConfig || {}),
      JSON.stringify(data.frequencyCap || { perUserHourly: 4, perUserDaily: 15, cooldownMinutes: 3 }),
      now,
      now,
    ]
  );

  saveDbSync();
  return getAdCampaignById(db, id);
}

export function updateAdCampaign(db: Database, id: string, data: Partial<AdCampaign>) {
  const now = new Date().toISOString();
  const current = queryDbOne(db, 'SELECT * FROM ad_campaigns WHERE id = ?', [id]);
  if (!current) throw new Error(`Campaign ${id} not found`);

  runDb(
    db,
    `UPDATE ad_campaigns SET
      title = COALESCE(?, title),
      status = COALESCE(?, status),
      provider = COALESCE(?, provider),
      ad_format = COALESCE(?, ad_format),
      placements = COALESCE(?, placements),
      headline = COALESCE(?, headline),
      body_text = COALESCE(?, body_text),
      call_to_action = COALESCE(?, call_to_action),
      destination_url = COALESCE(?, destination_url),
      media_url = COALESCE(?, media_url),
      media_type = COALESCE(?, media_type),
      html_snippet = COALESCE(?, html_snippet),
      admob_unit_id = COALESCE(?, admob_unit_id),
      pricing_model = COALESCE(?, pricing_model),
      bid_amount_usd = COALESCE(?, bid_amount_usd),
      total_budget_usd = COALESCE(?, total_budget_usd),
      daily_budget_usd = COALESCE(?, daily_budget_usd),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      reward_coins = COALESCE(?, reward_coins),
      targeting_config = COALESCE(?, targeting_config),
      frequency_cap = COALESCE(?, frequency_cap),
      updated_at = ?
     WHERE id = ?`,
    [
      data.title,
      data.status,
      data.provider,
      data.adFormat,
      data.placements ? JSON.stringify(data.placements) : null,
      data.headline,
      data.bodyText,
      data.callToAction,
      data.destinationUrl,
      data.mediaUrl,
      data.mediaType,
      data.htmlSnippet,
      data.admobUnitId,
      data.pricingModel,
      data.bidAmountUsd,
      data.totalBudgetUsd,
      data.dailyBudgetUsd,
      data.startDate,
      data.endDate,
      data.rewardCoins,
      data.targetingConfig ? JSON.stringify(data.targetingConfig) : null,
      data.frequencyCap ? JSON.stringify(data.frequencyCap) : null,
      now,
      id,
    ]
  );

  saveDbSync();
  return getAdCampaignById(db, id);
}

export function deleteAdCampaign(db: Database, id: string) {
  runDb(db, 'DELETE FROM ad_campaigns WHERE id = ?', [id]);
  saveDbSync();
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. PLATFORM AD SETTINGS
// ---------------------------------------------------------------------------
export function getPlatformAdSettings(db: Database): AdPlatformSettings {
  const row = queryDbOne(db, 'SELECT * FROM ad_platform_settings LIMIT 1');
  if (!row) {
    seedDefaultAdData(db);
    return getPlatformAdSettings(db);
  }
  return {
    id: row.id,
    admobEnabled: Boolean(row.admob_enabled),
    admobAndroidAppId: row.admob_android_app_id || '',
    admobAndroidBannerUnitId: row.admob_android_banner_unit_id || '',
    admobAndroidInterstitialUnitId: row.admob_android_interstitial_unit_id || '',
    admobAndroidRewardedUnitId: row.admob_android_rewarded_unit_id || '',
    admobAndroidNativeUnitId: row.admob_android_native_unit_id || 'ca-app-pub-3940256099942544/2247696110',
    admobIosAppId: row.admob_ios_app_id || '',
    admobIosBannerUnitId: row.admob_ios_banner_unit_id || '',
    admobIosInterstitialUnitId: row.admob_ios_interstitial_unit_id || '',
    admobIosRewardedUnitId: row.admob_ios_rewarded_unit_id || '',
    admobIosNativeUnitId: row.admob_ios_native_unit_id || 'ca-app-pub-3940256099942544/3986624511',
    webAdsEnabled: Boolean(row.web_ads_enabled),
    webAdNetworkName: row.web_ad_network_name || 'Nixo Web Direct Exchange',
    webHeaderScript: row.web_header_script || '',
    directSponsorsEnabled: Boolean(row.direct_sponsors_enabled),
    internalAdsEnabled: Boolean(row.internal_ads_enabled),
    globalDailyRewardCapPerUser: row.global_daily_reward_cap_per_user || 100,
    rewardCooldownSeconds: row.reward_cooldown_seconds || 60,
    adBlockerDetectionMode: (row.ad_blocker_detection_mode as any) || 'notice',
    updatedAt: row.updated_at,
  };
}

export function updatePlatformAdSettings(db: Database, data: Partial<AdPlatformSettings>) {
  const now = new Date().toISOString();
  runDb(
    db,
    `UPDATE ad_platform_settings SET
      admob_enabled = COALESCE(?, admob_enabled),
      admob_android_app_id = COALESCE(?, admob_android_app_id),
      admob_android_banner_unit_id = COALESCE(?, admob_android_banner_unit_id),
      admob_android_interstitial_unit_id = COALESCE(?, admob_android_interstitial_unit_id),
      admob_android_rewarded_unit_id = COALESCE(?, admob_android_rewarded_unit_id),
      admob_android_native_unit_id = COALESCE(?, admob_android_native_unit_id),
      admob_ios_app_id = COALESCE(?, admob_ios_app_id),
      admob_ios_banner_unit_id = COALESCE(?, admob_ios_banner_unit_id),
      admob_ios_interstitial_unit_id = COALESCE(?, admob_ios_interstitial_unit_id),
      admob_ios_rewarded_unit_id = COALESCE(?, admob_ios_rewarded_unit_id),
      admob_ios_native_unit_id = COALESCE(?, admob_ios_native_unit_id),
      web_ads_enabled = COALESCE(?, web_ads_enabled),
      web_ad_network_name = COALESCE(?, web_ad_network_name),
      web_header_script = COALESCE(?, web_header_script),
      direct_sponsors_enabled = COALESCE(?, direct_sponsors_enabled),
      internal_ads_enabled = COALESCE(?, internal_ads_enabled),
      global_daily_reward_cap_per_user = COALESCE(?, global_daily_reward_cap_per_user),
      reward_cooldown_seconds = COALESCE(?, reward_cooldown_seconds),
      ad_blocker_detection_mode = COALESCE(?, ad_blocker_detection_mode),
      updated_at = ?
     WHERE id = 'default_settings'`,
    [
      data.admobEnabled !== undefined ? (data.admobEnabled ? 1 : 0) : null,
      data.admobAndroidAppId,
      data.admobAndroidBannerUnitId,
      data.admobAndroidInterstitialUnitId,
      data.admobAndroidRewardedUnitId,
      data.admobAndroidNativeUnitId,
      data.admobIosAppId,
      data.admobIosBannerUnitId,
      data.admobIosInterstitialUnitId,
      data.admobIosRewardedUnitId,
      data.admobIosNativeUnitId,
      data.webAdsEnabled !== undefined ? (data.webAdsEnabled ? 1 : 0) : null,
      data.webAdNetworkName,
      data.webHeaderScript,
      data.directSponsorsEnabled !== undefined ? (data.directSponsorsEnabled ? 1 : 0) : null,
      data.internalAdsEnabled !== undefined ? (data.internalAdsEnabled ? 1 : 0) : null,
      data.globalDailyRewardCapPerUser,
      data.rewardCooldownSeconds,
      data.adBlockerDetectionMode,
      now,
    ]
  );
  saveDbSync();
  return getPlatformAdSettings(db);
}

// ---------------------------------------------------------------------------
// 5. SERVE AD ENGINE & FREQUENCY CONTROL
// ---------------------------------------------------------------------------
export interface AdServeContext {
  userId?: string;
  isVerified?: boolean;
  device?: 'mobile' | 'desktop' | 'tablet';
  country?: string;
  sessionId?: string;
}

export function serveAdForPlacement(db: Database, placementId: string, context: AdServeContext = {}) {
  const placement = queryDbOne(db, 'SELECT * FROM ad_placements WHERE id = ?', [placementId]);
  if (!placement || placement.is_enabled === 0) {
    return { available: false, reason: 'Placement disabled or not found' };
  }

  const allowedProviders: string[] = JSON.parse(placement.allowed_providers || '[]');
  const settings = getPlatformAdSettings(db);

  // Check which providers are currently enabled at the platform level
  const activeProviders = allowedProviders.filter((p) => {
    if (p === 'admob') return settings.admobEnabled;
    if (p === 'web_provider') return settings.webAdsEnabled;
    if (p === 'direct_sponsor') return settings.directSponsorsEnabled;
    if (p === 'internal') return settings.internalAdsEnabled;
    return false;
  });

  if (activeProviders.length === 0) {
    return { available: false, reason: 'No active ad providers configured for placement' };
  }

  // Frequency Capping check for logged-in user
  if (context.userId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const userFreq = queryDbOne(
      db,
      'SELECT * FROM ad_user_frequency WHERE user_id = ? AND placement_id = ? AND date_key = ?',
      [context.userId, placementId, todayStr]
    );

    if (userFreq) {
      if (userFreq.daily_count >= placement.frequency_cap_daily) {
        return { available: false, reason: 'Daily frequency cap reached for user' };
      }
      // Check cooldown
      const lastImp = new Date(userFreq.last_impression_at).getTime();
      const elapsedMins = (Date.now() - lastImp) / 60000;
      if (elapsedMins < placement.cooldown_minutes) {
        return { available: false, reason: 'User in frequency cooldown period' };
      }
    }
  }

  // Find eligible campaigns matching placement, status, and active date range
  const nowIso = new Date().toISOString();
  const allActiveCampaigns = queryDbAll(
    db,
    `SELECT * FROM ad_campaigns
     WHERE status = 'active'
       AND spent_budget_usd < total_budget_usd
       AND start_date <= ?
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY bid_amount_usd DESC`,
    [nowIso, nowIso]
  );

  const eligibleCampaigns = allActiveCampaigns.filter((c) => {
    // 1. Provider must be in activeProviders
    if (!activeProviders.includes(c.provider)) return false;

    // 2. Placements array check
    const campaignPlacements: string[] = JSON.parse(c.placements || '[]');
    if (!campaignPlacements.includes(placementId)) return false;

    // 3. Targeting check
    try {
      const targeting = JSON.parse(c.targeting_config || '{}');
      if (targeting.device && targeting.device !== 'all' && context.device) {
        if (targeting.device !== context.device) return false;
      }
      if (targeting.verifiedOnly && !context.isVerified) {
        return false;
      }
    } catch {
      // ignore parse error
    }

    return true;
  });

  if (eligibleCampaigns.length === 0) {
    // Fallback: If no custom campaign matches, check if AdMob or generic web banner unit is enabled
    if (activeProviders.includes('admob')) {
      return {
        available: true,
        campaign: null,
        placement: {
          id: placement.id,
          name: placement.name,
          placementType: placement.placement_type,
          rewardCoins: placement.reward_coins,
          refreshIntervalSec: placement.refresh_interval_sec,
        },
        provider: 'admob',
        admobConfig: {
          appId: context.device === 'mobile' ? settings.admobAndroidAppId : settings.admobIosAppId,
          bannerUnitId: settings.admobAndroidBannerUnitId,
          interstitialUnitId: settings.admobAndroidInterstitialUnitId,
          rewardedUnitId: settings.admobAndroidRewardedUnitId,
        },
      };
    }
    return { available: false, reason: 'No eligible campaigns available' };
  }

  // Pick top candidate or weighted random from top 3
  const candidate = eligibleCampaigns[Math.floor(Math.random() * Math.min(eligibleCampaigns.length, 3))];

  return {
    available: true,
    campaign: formatCampaignRow(candidate),
    placement: {
      id: placement.id,
      name: placement.name,
      placementType: placement.placement_type,
      rewardCoins: placement.reward_coins || candidate.reward_coins || 0,
      refreshIntervalSec: placement.refresh_interval_sec,
    },
    provider: candidate.provider,
    admobConfig:
      candidate.provider === 'admob'
        ? {
            appId: settings.admobAndroidAppId,
            unitId: candidate.admob_unit_id || settings.admobAndroidBannerUnitId,
            rewardedUnitId: settings.admobAndroidRewardedUnitId,
          }
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// 6. IMPRESSION & CLICK TRACKING
// ---------------------------------------------------------------------------
export function recordAdImpression(
  db: Database,
  data: {
    campaignId: string;
    placementId: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    device?: string;
  }
) {
  const now = new Date().toISOString();
  const id = `imp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const campaign = queryDbOne(db, 'SELECT * FROM ad_campaigns WHERE id = ?', [data.campaignId]);
  const provider = campaign?.provider || 'internal';

  // Cost calculation for CPM pricing model
  let costUsd = 0;
  if (campaign && campaign.pricing_model === 'cpm' && campaign.bid_amount_usd > 0) {
    costUsd = Number((campaign.bid_amount_usd / 1000).toFixed(6));
  }

  runDb(
    db,
    `INSERT INTO ad_impressions (
      id, campaign_id, placement_id, provider, user_id, session_id,
      ip_address, user_agent, device_type, cost_usd, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.campaignId,
      data.placementId,
      provider,
      data.userId || null,
      data.sessionId || null,
      data.ip || null,
      data.userAgent || null,
      data.device || 'desktop',
      costUsd,
      now,
    ]
  );

  // Update campaign counters & budget
  if (campaign) {
    const newSpent = Number((campaign.spent_budget_usd + costUsd).toFixed(4));
    const isCompleted = newSpent >= campaign.total_budget_usd ? 'completed' : campaign.status;

    runDb(
      db,
      `UPDATE ad_campaigns SET
        impressions_count = impressions_count + 1,
        spent_budget_usd = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
      [newSpent, isCompleted, now, data.campaignId]
    );
  }

  // Update user frequency
  if (data.userId) {
    const dateKey = now.slice(0, 10);
    const existingFreq = queryDbOne(
      db,
      'SELECT id, daily_count, hourly_count FROM ad_user_frequency WHERE user_id = ? AND placement_id = ? AND date_key = ?',
      [data.userId, data.placementId, dateKey]
    );

    if (existingFreq) {
      runDb(
        db,
        `UPDATE ad_user_frequency SET
          daily_count = daily_count + 1,
          hourly_count = hourly_count + 1,
          last_impression_at = ?
         WHERE id = ?`,
        [now, existingFreq.id]
      );
    } else {
      const freqId = `freq_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      runDb(
        db,
        `INSERT INTO ad_user_frequency (
          id, user_id, placement_id, campaign_id, last_impression_at,
          hourly_count, daily_count, date_key
        ) VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
        [freqId, data.userId, data.placementId, data.campaignId, now, dateKey]
      );
    }
  }

  saveDbSync();
  return { success: true, impressionId: id };
}

export function recordAdClick(
  db: Database,
  data: {
    campaignId: string;
    placementId: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
  }
) {
  const now = new Date().toISOString();
  const id = `clk_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const campaign = queryDbOne(db, 'SELECT * FROM ad_campaigns WHERE id = ?', [data.campaignId]);
  const provider = campaign?.provider || 'internal';
  const destinationUrl = campaign?.destination_url || '/';

  // Cost calculation for CPC pricing model
  let costUsd = 0;
  if (campaign && campaign.pricing_model === 'cpc' && campaign.bid_amount_usd > 0) {
    costUsd = Number(campaign.bid_amount_usd.toFixed(4));
  }

  runDb(
    db,
    `INSERT INTO ad_clicks (
      id, campaign_id, placement_id, provider, user_id, session_id,
      cost_usd, destination_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.campaignId,
      data.placementId,
      provider,
      data.userId || null,
      data.sessionId || null,
      costUsd,
      destinationUrl,
      now,
    ]
  );

  // Update campaign counters & budget
  if (campaign) {
    const newSpent = Number((campaign.spent_budget_usd + costUsd).toFixed(4));
    const isCompleted = newSpent >= campaign.total_budget_usd ? 'completed' : campaign.status;

    runDb(
      db,
      `UPDATE ad_campaigns SET
        clicks_count = clicks_count + 1,
        spent_budget_usd = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`,
      [newSpent, isCompleted, now, data.campaignId]
    );
  }

  saveDbSync();
  return { success: true, clickId: id, destinationUrl };
}

// ---------------------------------------------------------------------------
// 7. SECURE REWARDED AD VALIDATION & COIN CREDITING
// ---------------------------------------------------------------------------
export function issueRewardedChallenge(
  db: Database,
  placementId: string,
  campaignId: string,
  userId: string,
  ip?: string
): AdRewardedChallenge {
  const placement = queryDbOne(db, 'SELECT * FROM ad_placements WHERE id = ?', [placementId]);
  const campaign = queryDbOne(db, 'SELECT * FROM ad_campaigns WHERE id = ?', [campaignId]);
  const settings = getPlatformAdSettings(db);

  if (!userId) {
    throw new Error('Authentication required to receive rewarded coins');
  }

  // 1. Check daily user reward cap
  const todayStr = new Date().toISOString().slice(0, 10);
  const rewardsToday = queryDbOne(
    db,
    `SELECT COALESCE(SUM(reward_coins), 0) as totalCoins
     FROM ad_reward_verifications
     WHERE user_id = ? AND reward_granted = 1 AND challenge_issued_at LIKE ?`,
    [userId, `${todayStr}%`]
  );

  const dailyCoinsAwarded = Number(rewardsToday?.totalCoins || 0);
  if (dailyCoinsAwarded >= settings.globalDailyRewardCapPerUser) {
    throw new Error(
      `Daily ad reward limit of ${settings.globalDailyRewardCapPerUser} coins reached. Please check back tomorrow!`
    );
  }

  // 2. Check cooldown between rewarded views
  const lastClaim = queryDbOne(
    db,
    `SELECT verified_at FROM ad_reward_verifications
     WHERE user_id = ? AND reward_granted = 1
     ORDER BY verified_at DESC LIMIT 1`,
    [userId]
  );

  if (lastClaim?.verified_at) {
    const elapsedSec = (Date.now() - new Date(lastClaim.verified_at).getTime()) / 1000;
    if (elapsedSec < settings.rewardCooldownSeconds) {
      const waitSec = Math.ceil(settings.rewardCooldownSeconds - elapsedSec);
      throw new Error(`Reward cooldown active. Please wait ${waitSec}s before claiming again.`);
    }
  }

  // Determine reward coins and minimum duration
  const rewardCoins = campaign?.reward_coins || placement?.reward_coins || 25;
  const minWatchDurationSec = 15; // standard 15-second minimum watch rule
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = new Date();
  const challengeToken = crypto
    .createHmac('sha256', AD_SECRET_HMAC)
    .update(`${userId}:${placementId}:${campaignId}:${nonce}:${now.getTime()}`)
    .digest('hex');

  const id = `rc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  runDb(
    db,
    `INSERT INTO ad_reward_verifications (
      id, challenge_token, campaign_id, placement_id, user_id, provider,
      nonce, challenge_issued_at, min_watch_duration_sec, reward_coins,
      reward_granted, status, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'issued', ?)`,
    [
      id,
      challengeToken,
      campaignId,
      placementId,
      userId,
      campaign?.provider || 'admob',
      nonce,
      now.toISOString(),
      minWatchDurationSec,
      rewardCoins,
      ip || null,
    ]
  );

  saveDbSync();

  return {
    challengeToken,
    campaignId,
    placementId,
    provider: (campaign?.provider as AdProviderType) || 'admob',
    rewardCoins,
    minWatchDurationSec,
    expiresAt: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 minutes expiry
  };
}

export function verifyAndClaimRewardedAd(
  db: Database,
  challengeToken: string,
  watchDurationSec: number,
  userId: string,
  providerSignature?: string
) {
  if (!challengeToken) throw new Error('Challenge token is required');
  if (!userId) throw new Error('Authentication required');

  const challenge = queryDbOne(db, 'SELECT * FROM ad_reward_verifications WHERE challenge_token = ?', [
    challengeToken,
  ]);

  if (!challenge) {
    throw new Error('Invalid or non-existent reward challenge token');
  }

  if (challenge.user_id !== userId) {
    throw new Error('Security Error: Reward token does not belong to authenticated user');
  }

  if (challenge.status === 'claimed' || challenge.reward_granted === 1) {
    throw new Error('Reward has already been claimed for this challenge');
  }

  if (challenge.status !== 'issued') {
    throw new Error(`Reward challenge is in invalid state: ${challenge.status}`);
  }

  // 1. Time duration verification
  const issuedTime = new Date(challenge.challenge_issued_at).getTime();
  const nowTime = Date.now();
  const elapsedSeconds = (nowTime - issuedTime) / 1000;

  // Ensure ad was actually played for required time (at least min_watch_duration_sec minus small 1s tolerance)
  if (elapsedSeconds < challenge.min_watch_duration_sec - 1) {
    throw new Error(
      `Watch duration verification failed. Minimum required: ${challenge.min_watch_duration_sec}s, actual: ${Math.floor(
        elapsedSeconds
      )}s`
    );
  }

  // Expiration check (10 minutes)
  if (elapsedSeconds > 600) {
    runDb(db, 'UPDATE ad_reward_verifications SET status = "expired" WHERE id = ?', [challenge.id]);
    saveDbSync();
    throw new Error('Reward challenge expired. Please watch a fresh ad.');
  }

  // 2. Execute atomic reward grant
  const nowIso = new Date().toISOString();
  const rewardCoins = challenge.reward_coins;

  // Update user coins balance
  runDb(db, 'UPDATE users SET coins_balance = coins_balance + ? WHERE id = ?', [rewardCoins, userId]);

  // Record audit transaction in coin_transactions
  const txId = `tx_ad_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  runDb(
    db,
    `INSERT INTO coin_transactions (id, sender_id, receiver_id, user_id, amount, transaction_type, note, created_at)
     VALUES (?, 'system_ads', ?, ?, ?, 'ad_reward', ?, ?)`,
    [
      txId,
      userId,
      userId,
      rewardCoins,
      `Rewarded Ad Bonus: ${challenge.placement_id} (+${rewardCoins} coins)`,
      nowIso,
    ]
  );

  // Update verification status
  runDb(
    db,
    `UPDATE ad_reward_verifications SET
      status = 'claimed',
      reward_granted = 1,
      verified_at = ?,
      ssv_transaction_id = ?
     WHERE id = ?`,
    [nowIso, txId, challenge.id]
  );

  // Update campaign rewards count
  runDb(
    db,
    `UPDATE ad_campaigns SET
      rewards_claimed_count = rewards_claimed_count + 1,
      updated_at = ?
     WHERE id = ?`,
    [nowIso, challenge.campaign_id]
  );

  saveDbSync();

  const updatedUser = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [userId]);

  return {
    success: true,
    coinsAwarded: rewardCoins,
    newBalance: updatedUser?.coins_balance || 0,
    transactionId: txId,
    message: `🎉 Successfully verified! +${rewardCoins} Nixo Coins added to your wallet.`,
  };
}

// ---------------------------------------------------------------------------
// 8. ADMIN AD REPORTING & ANALYTICS
// ---------------------------------------------------------------------------
export function getAdAnalyticsReport(db: Database, timeRangeDays: number = 30): AdAnalyticsReport {
  const sinceDate = new Date(Date.now() - timeRangeDays * 86400000).toISOString();

  // Summary Aggregates
  const impAgg = queryDbOne(
    db,
    `SELECT COUNT(*) as totalImpressions, COALESCE(SUM(cost_usd), 0) as totalCost
     FROM ad_impressions WHERE created_at >= ?`,
    [sinceDate]
  );

  const clkAgg = queryDbOne(
    db,
    `SELECT COUNT(*) as totalClicks, COALESCE(SUM(cost_usd), 0) as totalClickCost
     FROM ad_clicks WHERE created_at >= ?`,
    [sinceDate]
  );

  const rewardAgg = queryDbOne(
    db,
    `SELECT COUNT(*) as rewardsClaimed, COALESCE(SUM(reward_coins), 0) as totalCoins
     FROM ad_reward_verifications WHERE status = 'claimed' AND verified_at >= ?`,
    [sinceDate]
  );

  const activeCamps = queryDbOne(
    db,
    `SELECT COUNT(*) as c FROM ad_campaigns WHERE status = 'active'`
  );

  const enabledPlacements = queryDbOne(
    db,
    `SELECT COUNT(*) as c FROM ad_placements WHERE is_enabled = 1`
  );

  const totalImpressions = Number(impAgg?.totalImpressions || 0);
  const totalClicks = Number(clkAgg?.totalClicks || 0);
  const overallCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const estimatedRevenueUsd = Number((Number(impAgg?.totalCost || 0) + Number(clkAgg?.totalClickCost || 0)).toFixed(2));

  // Placement Breakdown
  const placements = getAdPlacements(db);
  const placementBreakdown = placements.map((p) => {
    const pImp = queryDbOne(
      db,
      `SELECT COUNT(*) as count, COALESCE(SUM(cost_usd), 0) as cost FROM ad_impressions WHERE placement_id = ? AND created_at >= ?`,
      [p.id, sinceDate]
    );
    const pClk = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM ad_clicks WHERE placement_id = ? AND created_at >= ?`,
      [p.id, sinceDate]
    );
    const pRew = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM ad_reward_verifications WHERE placement_id = ? AND status = 'claimed' AND verified_at >= ?`,
      [p.id, sinceDate]
    );

    const impCount = Number(pImp?.count || 0);
    const clkCount = Number(pClk?.count || 0);
    const ctr = impCount > 0 ? Number(((clkCount / impCount) * 100).toFixed(2)) : 0;

    return {
      placementId: p.id,
      placementName: p.name,
      impressions: impCount,
      clicks: clkCount,
      ctr,
      revenueUsd: Number(pImp?.cost || 0),
      rewardsClaimed: Number(pRew?.count || 0),
    };
  });

  // Campaign Breakdown
  const campaigns = getAdCampaigns(db);
  const campaignBreakdown = campaigns.map((c) => {
    const ctr = c.impressionsCount > 0 ? Number(((c.clicksCount / c.impressionsCount) * 100).toFixed(2)) : 0;
    return {
      campaignId: c.id,
      title: c.title,
      advertiserName: c.advertiserName,
      provider: c.provider,
      status: c.status,
      impressions: c.impressionsCount,
      clicks: c.clicksCount,
      ctr,
      spentUsd: c.spentBudgetUsd,
      budgetUsd: c.totalBudgetUsd,
    };
  });

  // Provider Distribution
  const providers: AdProviderType[] = ['internal', 'direct_sponsor', 'web_provider', 'admob'];
  const providerDistribution = providers.map((prov) => {
    const provImp = queryDbOne(
      db,
      `SELECT COUNT(*) as count, COALESCE(SUM(cost_usd), 0) as cost FROM ad_impressions WHERE provider = ? AND created_at >= ?`,
      [prov, sinceDate]
    );
    const provClk = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM ad_clicks WHERE provider = ? AND created_at >= ?`,
      [prov, sinceDate]
    );
    const impCount = Number(provImp?.count || 0);
    const sharePercent = totalImpressions > 0 ? Number(((impCount / totalImpressions) * 100).toFixed(1)) : 25;

    return {
      provider: prov,
      impressions: impCount,
      clicks: Number(provClk?.count || 0),
      revenueUsd: Number(provImp?.cost || 0),
      sharePercent,
    };
  });

  // Daily Trends (last 7-14 days)
  const dailyTrends: Array<{ date: string; impressions: number; clicks: number; revenueUsd: number; ctr: number }> = [];
  const daysToShow = Math.min(timeRangeDays, 14);
  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateKey = d.toISOString().slice(0, 10);

    const dayImp = queryDbOne(
      db,
      `SELECT COUNT(*) as count, COALESCE(SUM(cost_usd), 0) as cost FROM ad_impressions WHERE created_at LIKE ?`,
      [`${dateKey}%`]
    );
    const dayClk = queryDbOne(
      db,
      `SELECT COUNT(*) as count FROM ad_clicks WHERE created_at LIKE ?`,
      [`${dateKey}%`]
    );

    const imps = Number(dayImp?.count || 0);
    const clks = Number(dayClk?.count || 0);
    const ctr = imps > 0 ? Number(((clks / imps) * 100).toFixed(2)) : 0;

    dailyTrends.push({
      date: dateKey,
      impressions: imps,
      clicks: clks,
      revenueUsd: Number(dayImp?.cost || 0),
      ctr,
    });
  }

  return {
    summary: {
      totalImpressions,
      totalClicks,
      overallCtr,
      estimatedRevenueUsd,
      rewardsClaimed: Number(rewardAgg?.rewardsClaimed || 0),
      totalCoinsAwarded: Number(rewardAgg?.totalCoins || 0),
      activeCampaignsCount: Number(activeCamps?.c || 0),
      enabledPlacementsCount: Number(enabledPlacements?.c || 0),
    },
    placementBreakdown,
    campaignBreakdown,
    providerDistribution,
    dailyTrends,
  };
}
