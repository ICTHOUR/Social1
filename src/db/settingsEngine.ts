import { Database as SqlJsDatabase } from 'sql.js';
import { getDatabase, saveDbSync } from './database.js';

// Simple in-memory cache for ultra-fast, non-blocking O(1) lookups
let settingsCache: Record<string, any> = {};

export function ensureSettingsTables(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Default seed configurations
  const defaultSettings: Record<string, any> = {
    general: {
      siteName: 'NIXO Social',
      logo: '/nix-logo.svg',
      favicon: '/nix-logo.svg',
      description: 'The Next Generation Liquid Glass Social Experience',
      language: 'en',
      timezone: 'UTC',
      currency: 'USD',
    },
    typography: {
      activeFont: 'Plus Jakarta Sans',
      activeBanglaFont: 'Hind Siliguri',
      activeEnglishFont: 'Plus Jakarta Sans',
      applyTo: 'all', // 'all' | 'feed' | 'dashboard'
      fontSizeScale: 100, // 100%
      availableFonts: [
        { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Modern UI)', lang: 'en', category: 'sans-serif' },
        { id: 'Inter', name: 'Inter (Clean & Crisp)', lang: 'en', category: 'sans-serif' },
        { id: 'Outfit', name: 'Outfit (Geometric Liquid)', lang: 'en', category: 'sans-serif' },
        { id: 'Space Grotesk', name: 'Space Grotesk (Tech / Cyber)', lang: 'en', category: 'sans-serif' },
        { id: 'Poppins', name: 'Poppins (Friendly & Bold)', lang: 'en', category: 'sans-serif' },
        { id: 'Hind Siliguri', name: 'Hind Siliguri (হিন্দ শিলিগুড়ি - স্পষ্ট ও আধুনিক)', lang: 'bn', category: 'sans-serif' },
        { id: 'Noto Sans Bengali', name: 'Noto Sans Bengali (নোতো সান্স বাংলা)', lang: 'bn', category: 'sans-serif' },
        { id: 'Tiro Bangla', name: 'Tiro Bangla (তিরো বাংলা - ক্লাসিক্যাল)', lang: 'bn', category: 'serif' },
        { id: 'Noto Serif Bengali', name: 'Noto Serif Bengali (নোতো শরিফ বাংলা)', lang: 'bn', category: 'serif' },
      ],
    },
    registration: {
      registrationEnabled: true,
      verificationRequired: false,
      usernameRules: { minLength: 3, maxLength: 20, allowSpecialChars: false },
      ageRules: { minAgeRequired: 13 },
      loginMethods: ['email', 'phone', 'username'],
    },
    social: {
      posting: true,
      commenting: true,
      sharing: true,
      reactions: true,
      following: true,
      friends: true,
      messaging: true,
    },
    content: {
      uploadLimits: { maxFilesPerPost: 6 },
      imageSizeLimitMb: 10,
      videoSizeLimitMb: 50,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'mp3'],
      moderationEnabled: true,
    },
    coin: {
      earningEnabled: true,
      dailyLimit: 500,
      packages: [
        { id: 'coin_pkg_1', coins: 100, priceUsd: 0.99 },
        { id: 'coin_pkg_2', coins: 500, priceUsd: 4.99 },
        { id: 'coin_pkg_3', coins: 1200, priceUsd: 9.99 },
        { id: 'coin_pkg_4', coins: 3000, priceUsd: 24.99 },
        { id: 'coin_pkg_5', coins: 7500, priceUsd: 59.99 },
      ],
      conversionRateUsdToCoin: 100, // 1 USD = 100 Coins
      withdrawalEnabled: true,
      withdrawalMinimumCoins: 1000,
      processingFeePercentage: 2,
    },
    gift: {
      catalog: [
        { id: 'gift_star', name: 'Cosmic Star', priceCoins: 50, icon: '🌟', animation: 'sparkle' },
        { id: 'gift_heart', name: 'Liquid Heart', priceCoins: 100, icon: '💖', animation: 'float' },
        { id: 'gift_diamond', name: 'Nixo Diamond', priceCoins: 500, icon: '💎', animation: 'rotate' },
        { id: 'gift_rocket', name: 'Hyper Rocket', priceCoins: 1000, icon: '🚀', animation: 'fly' },
      ],
      statusActive: true,
      animationsEnabled: true,
    },
    payment: {
      provider: 'stripe',
      credentials: {
        stripePublicKey: 'pk_test_placeholder_key_nixo_liquid_glass',
        stripeSecretKey: 'sk_test_placeholder_secret_key_nixo_liquid_glass',
      },
      currency: 'USD',
      testLiveMode: 'test',
    },
    sms: {
      provider: 'twilio',
      credentials: {
        twilioAccountSid: 'AC_placeholder_sid',
        twilioAuthToken: 'token_placeholder',
      },
      senderId: 'NIXO',
    },
    advertisement: {
      webAdsEnabled: true,
      mobileAdsEnabled: false,
      admobConfiguration: {
        bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
        rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
      },
      rewardedAdsEnabled: true,
    },
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
    },
    security: {
      rateLimitRequests: 100,
      rateLimitWindowMinutes: 15,
      sessionDurationHours: 72,
      maxLoginAttempts: 5,
      twoFaArchitecture: 'disabled', // 'disabled' | 'email' | 'authenticator'
      maintenanceMode: false,
    },
  };

  const now = new Date().toISOString();

  for (const [key, defaultValue] of Object.entries(defaultSettings)) {
    // Check if key already exists
    const stmt = db.prepare('SELECT COUNT(*) as count FROM system_settings WHERE key = ?');
    stmt.bind([key]);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();

    if (result.count === 0) {
      const insertStmt = db.prepare('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)');
      insertStmt.run([key, JSON.stringify(defaultValue), now]);
      insertStmt.free();
    }
  }

  // Populate cache
  loadAllSettingsIntoCache(db);
}

function loadAllSettingsIntoCache(db: SqlJsDatabase) {
  try {
    const stmt = db.prepare('SELECT key, value FROM system_settings');
    const tempCache: Record<string, any> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const rawValue = row.value as string;
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(rawValue);
      } catch (e) {
        parsedValue = rawValue;
      }
      tempCache[row.key as string] = parsedValue;
    }
    stmt.free();
    settingsCache = tempCache;
    console.log('⚡️ Centralized Global Settings Cache Loaded successfully!');
  } catch (err) {
    console.error('Error seeding settings cache:', err);
  }
}

export async function getSettingsValue(categoryKey: string): Promise<any> {
  if (settingsCache[categoryKey] !== undefined) {
    return settingsCache[categoryKey];
  }
  const db = await getDatabase();
  const stmt = db.prepare('SELECT value FROM system_settings WHERE key = ?');
  stmt.bind([categoryKey]);
  let value: any = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    const rawValue = row.value as string;
    try {
      value = JSON.parse(rawValue);
    } catch (e) {
      value = rawValue;
    }
    settingsCache[categoryKey] = value;
  }
  stmt.free();
  return value;
}

export async function getAllSettingsMap(): Promise<Record<string, any>> {
  const db = await getDatabase();
  loadAllSettingsIntoCache(db);
  return settingsCache;
}

export async function updateSettingsCategory(categoryKey: string, newValueObject: any): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)');
  stmt.run([categoryKey, JSON.stringify(newValueObject), now]);
  stmt.free();

  saveDbSync(db);

  // Update memory cache
  settingsCache[categoryKey] = newValueObject;
}

/**
 * Strips secret tokens and private keys for security
 */
export function getSanitizedPublicSettings(fullSettings: Record<string, any>): Record<string, any> {
  const publicSettings = JSON.parse(JSON.stringify(fullSettings));

  // Strip payment credentials
  if (publicSettings.payment && publicSettings.payment.credentials) {
    publicSettings.payment.credentials = {
      stripePublicKey: publicSettings.payment.credentials.stripePublicKey || '',
      stripeSecretKey: '•'?.repeat(12) || '********', // secure masking
    };
  }

  // Strip Twilio secrets
  if (publicSettings.sms && publicSettings.sms.credentials) {
    publicSettings.sms.credentials = {
      twilioAccountSid: publicSettings.sms.credentials.twilioAccountSid || '',
      twilioAuthToken: '•'?.repeat(12) || '********', // secure masking
    };
  }

  return publicSettings;
}
