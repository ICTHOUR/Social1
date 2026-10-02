import { Database as SqlJsDatabase } from 'sql.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';
import { runInTransaction, CoinTransactionResult } from './transactions.js';

export interface CoinEarningEvaluationResult {
  awarded: boolean;
  coins: number;
  reason?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  ledgerId?: string;
}

export interface GiftTransferParams {
  senderId: string;
  receiverId: string;
  giftId: string;
  postId?: string;
  commentId?: string;
  idempotencyKey?: string;
}

export interface GiftTransferResult {
  success: boolean;
  transactionId?: string;
  giftId?: string;
  giftName?: string;
  coinPrice?: number;
  senderBalanceAfter?: number;
  receiverBalanceAfter?: number;
  error?: string;
  isDuplicate?: boolean;
}

/**
 * Ensures that the system has modern 3D gifts and configurable coin earning rules seeded.
 */
export function ensureEconomyAndGiftsSeeded(db: SqlJsDatabase) {
  const now = new Date().toISOString();

  // 1. Seed or verify coin_earning_rules
  const existingRules = queryDbOne(db, 'SELECT id FROM coin_earning_rules WHERE id = "current_rules"');
  if (!existingRules) {
    db.run(
      `INSERT INTO coin_earning_rules (
        id, coins_per_post, coins_per_photo, coins_per_video, coins_per_story, daily_earning_limit,
        maximum_daily_reward, minimum_account_age_hours, minimum_activity_requirement,
        reward_cooldown_seconds, eligible_content_types, anti_abuse_rules, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'current_rules',
        5, // coins per text post (default: 5)
        10, // coins per photo post (default: 10)
        15, // coins per video post (default: 15)
        5, // coins per story (default: 5)
        200, // daily earning limit
        500, // maximum daily reward
        0, // min account age in hours (default 0 for dev, configurable)
        1, // minimum characters for post eligibility
        15, // reward cooldown in seconds
        JSON.stringify(['post', 'photo', 'image', 'video', 'multiple_image', 'audio', 'poll']),
        JSON.stringify({
          minWordCount: 0,
          preventDuplicateContent: false,
          maxHourlyRewards: 50,
          requireActiveStatus: true,
        }),
        now,
      ]
    );
    saveDbSync();
  }

  // 2. Seed modern original 3D gift items across all tiers
  const giftTiers = [
    {
      id: 'gift_spark_50',
      name: 'Cosmic Stardust',
      coin_price: 50,
      icon_type: 'spark',
      image_3d: 'cosmic_stardust',
      animation: 'orbital_float',
      category: 'popular',
      sort_order: 1,
      description: 'Luminescent stardust gathered from deep nebula clouds.',
    },
    {
      id: 'gift_prism_100',
      name: 'Nixo Crystal Prism',
      coin_price: 100,
      icon_type: 'diamond',
      image_3d: 'crystal_prism',
      animation: 'crystal_burst',
      category: 'popular',
      sort_order: 2,
      description: 'Handcrafted refractive glass prism with glowing core caustics.',
    },
    {
      id: 'gift_lotus_200',
      name: 'Neon Cyber Lotus',
      coin_price: 200,
      icon_type: 'potion',
      image_3d: 'cyber_lotus',
      animation: 'cosmic_pulse',
      category: 'luxury',
      sort_order: 3,
      description: 'Bioluminescent cybernetic blossom with opening optical petals.',
    },
    {
      id: 'gift_chalice_300',
      name: 'Liquid Gold Chalice',
      coin_price: 300,
      icon_type: 'star',
      image_3d: 'gold_chalice',
      animation: 'golden_rain',
      category: 'luxury',
      sort_order: 4,
      description: 'Molten gold goblet overflowing with golden liquid particles.',
    },
    {
      id: 'gift_nova_500',
      name: 'Celestial Nova Orb',
      coin_price: 500,
      icon_type: 'rocket',
      image_3d: 'nova_orb',
      animation: 'quantum_flare',
      category: 'cosmic',
      sort_order: 5,
      description: 'Miniature hypernova stellar core captured inside a spatial magnetic sphere.',
    },
    {
      id: 'gift_crown_1000',
      name: 'Quantum Phoenix Crown',
      coin_price: 1000,
      icon_type: 'crown',
      image_3d: 'phoenix_crown',
      animation: 'astral_surge',
      category: 'legendary',
      sort_order: 6,
      description: 'Coronation artifact forged in quantum fire for elite creators.',
    },
    {
      id: 'gift_relic_2500',
      name: 'Hypercube Chrono Relic',
      coin_price: 2500,
      icon_type: 'gem',
      image_3d: 'hypercube_relic',
      animation: 'quantum_flare',
      category: 'vip',
      sort_order: 7,
      description: 'Four-dimensional tesseract radiating spatial spacetime distortion.',
    },
    {
      id: 'gift_dragon_5000',
      name: 'Imperial Astral Dragon',
      coin_price: 5000,
      icon_type: 'dragon',
      image_3d: 'astral_dragon',
      animation: 'astral_surge',
      category: 'legendary',
      sort_order: 8,
      description: 'Supreme astral dragon spirit bearing an ethereal pearl of immense fortune.',
    },
  ];

  for (const g of giftTiers) {
    const exists = queryDbOne(db, 'SELECT id FROM gifts WHERE id = ?', [g.id]);
    if (!exists) {
      db.run(
        `INSERT INTO gifts (
          id, name, icon_type, coin_price, image_3d, animation, status, category, sort_order, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.icon_type, g.coin_price, g.image_3d, g.animation, g.category, g.sort_order, g.description, now, now]
      );
    } else {
      // Ensure modern columns are up to date
      db.run(
        `UPDATE gifts SET 
          name = ?, coin_price = ?, image_3d = ?, animation = ?, category = ?, sort_order = ?, description = ?, updated_at = ?
         WHERE id = ?`,
        [g.name, g.coin_price, g.image_3d, g.animation, g.category, g.sort_order, g.description, now, g.id]
      );
    }
  }

  saveDbSync();
}

/**
 * Returns active Coin Earning Configuration
 */
export function getCoinEarningRules(db: SqlJsDatabase) {
  const row = queryDbOne(db, 'SELECT * FROM coin_earning_rules WHERE id = "current_rules"');
  if (!row) {
    ensureEconomyAndGiftsSeeded(db);
    return queryDbOne(db, 'SELECT * FROM coin_earning_rules WHERE id = "current_rules"');
  }

  let eligibleContentTypes = ['post', 'video', 'multiple_image', 'audio', 'poll'];
  try {
    if (row.eligible_content_types) {
      eligibleContentTypes = JSON.parse(row.eligible_content_types);
    }
  } catch (e) {}

  let antiAbuseRules = {
    minWordCount: 2,
    preventDuplicateContent: true,
    maxHourlyRewards: 8,
    requireActiveStatus: true,
  };
  try {
    if (row.anti_abuse_rules) {
      antiAbuseRules = JSON.parse(row.anti_abuse_rules);
    }
  } catch (e) {}

  return {
    id: row.id,
    coinsPerPost: row.coins_per_post ?? 5,
    coinsPerPhoto: row.coins_per_photo !== undefined && row.coins_per_photo !== null ? row.coins_per_photo : 10,
    coinsPerVideo: row.coins_per_video ?? 15,
    coinsPerStory: row.coins_per_story ?? 5,
    dailyEarningLimit: row.daily_earning_limit,
    maximumDailyReward: row.maximum_daily_reward,
    minimumAccountAgeHours: row.minimum_account_age_hours,
    minimumActivityRequirement: row.minimum_activity_requirement,
    rewardCooldownSeconds: row.reward_cooldown_seconds,
    eligibleContentTypes,
    antiAbuseRules,
    updatedAt: row.updated_at,
  };
}

/**
 * Updates Coin Earning Configuration (Admin)
 */
export function updateCoinEarningRules(
  db: SqlJsDatabase,
  rules: {
    coinsPerPost?: number;
    coinsPerPhoto?: number;
    coinsPerVideo?: number;
    coinsPerStory?: number;
    dailyEarningLimit?: number;
    maximumDailyReward?: number;
    minimumAccountAgeHours?: number;
    minimumActivityRequirement?: number;
    rewardCooldownSeconds?: number;
    eligibleContentTypes?: string[];
    antiAbuseRules?: Record<string, any>;
  }
) {
  const current = getCoinEarningRules(db);
  const now = new Date().toISOString();

  const nextCoinsPerPost = rules.coinsPerPost !== undefined ? rules.coinsPerPost : current.coinsPerPost;
  const nextCoinsPerPhoto = rules.coinsPerPhoto !== undefined ? rules.coinsPerPhoto : ((current as any).coinsPerPhoto ?? 10);
  const nextCoinsPerVideo = rules.coinsPerVideo !== undefined ? rules.coinsPerVideo : current.coinsPerVideo;
  const nextCoinsPerStory = rules.coinsPerStory !== undefined ? rules.coinsPerStory : current.coinsPerStory;
  const nextDailyLimit = rules.dailyEarningLimit !== undefined ? rules.dailyEarningLimit : current.dailyEarningLimit;
  const nextMaxDaily = rules.maximumDailyReward !== undefined ? rules.maximumDailyReward : current.maximumDailyReward;
  const nextMinAge = rules.minimumAccountAgeHours !== undefined ? rules.minimumAccountAgeHours : current.minimumAccountAgeHours;
  const nextMinActivity = rules.minimumActivityRequirement !== undefined ? rules.minimumActivityRequirement : current.minimumActivityRequirement;
  const nextCooldown = rules.rewardCooldownSeconds !== undefined ? rules.rewardCooldownSeconds : current.rewardCooldownSeconds;
  const nextEligibleTypes = JSON.stringify(rules.eligibleContentTypes || current.eligibleContentTypes);
  const nextAntiAbuse = JSON.stringify(rules.antiAbuseRules || current.antiAbuseRules);

  try {
    db.run('ALTER TABLE coin_earning_rules ADD COLUMN coins_per_photo INTEGER DEFAULT 10');
  } catch (e) {}

  db.run(
    `UPDATE coin_earning_rules SET
      coins_per_post = ?,
      coins_per_photo = ?,
      coins_per_video = ?,
      coins_per_story = ?,
      daily_earning_limit = ?,
      maximum_daily_reward = ?,
      minimum_account_age_hours = ?,
      minimum_activity_requirement = ?,
      reward_cooldown_seconds = ?,
      eligible_content_types = ?,
      anti_abuse_rules = ?,
      updated_at = ?
     WHERE id = "current_rules"`,
    [
      nextCoinsPerPost,
      nextCoinsPerPhoto,
      nextCoinsPerVideo,
      nextCoinsPerStory,
      nextDailyLimit,
      nextMaxDaily,
      nextMinAge,
      nextMinActivity,
      nextCooldown,
      nextEligibleTypes,
      nextAntiAbuse,
      now,
    ]
  );
  saveDbSync();
  return getCoinEarningRules(db);
}

/**
 * Validates anti-abuse policies, checks cooldown, daily limit, account age,
 * and atomically records immutable ledger & awards coins to user.
 */
export function evaluateAndAwardCoinReward(
  db: SqlJsDatabase,
  params: {
    userId: string;
    eventType: 'post_created' | 'video_created' | 'photo_created' | 'story_created' | string;
    sourceId: string;
    sourceType: string;
    content?: string;
    ipAddress?: string;
  }
): CoinEarningEvaluationResult {
  const { userId, eventType, sourceId, sourceType, content = '', ipAddress } = params;
  const rules = getCoinEarningRules(db);
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Fetch User Record
  const user = queryDbOne(db, 'SELECT id, username, status, coins_balance, created_at FROM users WHERE id = ?', [userId]);
  if (!user) {
    return { awarded: false, coins: 0, reason: 'User not found' };
  }
  if (user.status !== 'active') {
    return { awarded: false, coins: 0, reason: 'Account is not in active standing' };
  }

  // 2. Minimum Account Age Check
  if (rules.minimumAccountAgeHours > 0) {
    const createdDate = new Date(user.created_at);
    const ageHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    if (ageHours < rules.minimumAccountAgeHours) {
      return { awarded: false, coins: 0, reason: `Account must be at least ${rules.minimumAccountAgeHours} hours old to earn platform rewards` };
    }
  }

  // 3. Eligible Content Type Check
  if (!rules.eligibleContentTypes.includes(sourceType) && !rules.eligibleContentTypes.includes(eventType)) {
    return { awarded: false, coins: 0, reason: `Activity ${sourceType} is not currently configured for coin incentives` };
  }

  // 4. Minimum Activity Requirement (content length check)
  const trimmed = content.trim();
  if (sourceType !== 'video' && sourceType !== 'story' && sourceType !== 'photo' && sourceType !== 'image') {
    if (trimmed.length < rules.minimumActivityRequirement) {
      return { awarded: false, coins: 0, reason: `Content does not meet minimum activity length (${rules.minimumActivityRequirement} characters)` };
    }
  }

  // 5. Anti-Abuse: Word Count & Duplicate Spam Check
  if (rules.antiAbuseRules.minWordCount > 0 && trimmed.length > 0) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < rules.antiAbuseRules.minWordCount) {
      return { awarded: false, coins: 0, reason: `Content must have at least ${rules.antiAbuseRules.minWordCount} words` };
    }
  }

  if (rules.antiAbuseRules.preventDuplicateContent && trimmed.length > 10) {
    const recentDuplicate = queryDbOne(
      db,
      `SELECT id FROM posts WHERE user_id = ? AND id != ? AND content = ? AND created_at >= datetime('now', '-1 day') LIMIT 1`,
      [userId, sourceId, trimmed]
    );
    if (recentDuplicate) {
      return { awarded: false, coins: 0, reason: 'Duplicate content detected (anti-spam protection)' };
    }
  }

  // 6. Reward Cooldown Check
  if (rules.rewardCooldownSeconds > 0) {
    const lastReward = queryDbOne(
      db,
      `SELECT created_at FROM coin_earnings_ledger WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (lastReward && lastReward.created_at) {
      const elapsedSeconds = (now.getTime() - new Date(lastReward.created_at).getTime()) / 1000;
      if (elapsedSeconds < rules.rewardCooldownSeconds) {
        return {
          awarded: false,
          coins: 0,
          reason: `Reward cooldown active. Please wait ${Math.ceil(rules.rewardCooldownSeconds - elapsedSeconds)}s between earned rewards.`,
        };
      }
    }
  }

  // 7. Determine Reward Amount based on activity type
  // Text Post = coinsPerPost (5), Photo Post = coinsPerPhoto (10), Video Post = coinsPerVideo (15)
  let coinsToAward = rules.coinsPerPost ?? 5;
  if (sourceType === 'video' || eventType === 'video_created') {
    coinsToAward = rules.coinsPerVideo ?? 15;
  } else if (sourceType === 'photo' || sourceType === 'image' || eventType === 'photo_created') {
    coinsToAward = (rules as any).coinsPerPhoto ?? 10;
  } else if (sourceType === 'story' || eventType === 'story_created') {
    coinsToAward = rules.coinsPerStory ?? 5;
  }

  if (coinsToAward <= 0) {
    return { awarded: false, coins: 0, reason: 'Reward for this activity is currently set to 0' };
  }

  // 8. Daily Earning Limit & Maximum Daily Cap Verification
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEarnedRow = queryDbOne(
    db,
    `SELECT COALESCE(SUM(coins), 0) as total FROM coin_earnings_ledger WHERE user_id = ? AND status = 'completed' AND created_at >= ?`,
    [userId, startOfDay]
  );
  const todayEarned = todayEarnedRow ? Number(todayEarnedRow.total) : 0;

  if (todayEarned >= rules.dailyEarningLimit || todayEarned >= rules.maximumDailyReward) {
    return { awarded: false, coins: 0, reason: `Maximum daily coin earning limit (${rules.dailyEarningLimit} coins) reached.` };
  }

  // Trim reward if it exceeds maximum daily reward
  if (todayEarned + coinsToAward > rules.maximumDailyReward) {
    coinsToAward = rules.maximumDailyReward - todayEarned;
  }
  if (coinsToAward <= 0) {
    return { awarded: false, coins: 0, reason: 'Daily reward cap reached' };
  }

  // 9. Atomic Transactional Execution
  return runInTransaction(db, () => {
    // Re-verify user balance inside transaction
    const sender = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [userId]);
    const balanceBefore = sender ? sender.coins_balance : 0;
    const balanceAfter = balanceBefore + coinsToAward;

    // Update user balance
    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [balanceAfter, userId]);

    // Update coin_wallets
    db.run(
      `INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_earned = total_earned + ?, updated_at = ?`,
      ['cw_' + userId, userId, balanceAfter, coinsToAward, nowIso, balanceAfter, coinsToAward, nowIso]
    );

    // Record Immutable Earnings Ledger Entry
    const ledgerId = 'cel_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    db.run(
      `INSERT INTO coin_earnings_ledger (
        id, user_id, event, coins, before_balance, after_balance, source_id, source_type, status, ip_address, anti_abuse_flags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, '{}', ?)`,
      [ledgerId, userId, eventType, coinsToAward, balanceBefore, balanceAfter, sourceId, sourceType, ipAddress || 'local', nowIso]
    );

    // Record Immutable Coin Transactions Entry
    const txId = 'ctx_' + Date.now() + '_rwd_' + Math.floor(Math.random() * 10000);
    db.run(
      `INSERT INTO coin_transactions (
        id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at
      ) VALUES (?, ?, 'SYSTEM', ?, 'reward', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        txId,
        userId,
        userId,
        coinsToAward,
        balanceBefore,
        balanceAfter,
        sourceId,
        `Activity Reward: ${eventType.replace(/_/g, ' ')} (+${coinsToAward} coins)`,
        JSON.stringify({ eventType, sourceId, sourceType, ledgerId }),
        nowIso,
      ]
    );

    return {
      awarded: true,
      coins: coinsToAward,
      balanceBefore,
      balanceAfter,
      ledgerId,
    };
  });
}

/**
 * Executes a Financial-Safety Atomic Gift Transaction
 * - Idempotency protection against double clicks
 * - Database-level atomic rollback
 * - Strict balance sufficiency validation
 * - Synchronous debit and credit ledger recording
 */
export function executeGiftTransaction(
  db: SqlJsDatabase,
  params: GiftTransferParams
): GiftTransferResult {
  const { senderId, receiverId, giftId, postId, commentId, idempotencyKey } = params;

  if (senderId === receiverId) {
    return { success: false, error: 'You cannot send a gift to yourself' };
  }

  // 1. Idempotency Check: Prevent duplicate gift transmissions
  if (idempotencyKey) {
    const existing = queryDbOne(
      db,
      'SELECT id, transaction_id, coin_amount FROM gift_transactions WHERE idempotency_key = ?',
      [idempotencyKey]
    );
    if (existing) {
      const sender = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [senderId]);
      return {
        success: true,
        transactionId: existing.id,
        isDuplicate: true,
        coinPrice: existing.coin_amount,
        senderBalanceAfter: sender ? sender.coins_balance : 0,
      };
    }
  }

  // 2. Fetch Gift Details
  const gift = queryDbOne(
    db,
    'SELECT id, name, coin_price, image_3d, animation, status FROM gifts WHERE id = ?',
    [giftId]
  );
  if (!gift) {
    return { success: false, error: 'Gift item not found in catalog' };
  }
  if (gift.status !== 'active') {
    return { success: false, error: 'This gift is currently unavailable' };
  }

  const coinPrice = gift.coin_price;

  // 3. Atomic Database Transaction
  return runInTransaction(db, () => {
    // A. Verify sender has sufficient PURCHASED coins (Only coins bought from store/PayStation can be gifted)
    const sender = queryDbOne(db, 'SELECT id, username, full_name, coins_balance, status FROM users WHERE id = ?', [senderId]);
    if (!sender) throw new Error('Sender user account not found');
    if (sender.status === 'suspended' || sender.status === 'banned') throw new Error('Sender account is restricted');

    const senderWallet = queryDbOne(db, 'SELECT purchased_balance, earned_balance, received_gift_balance, balance FROM coin_wallets WHERE user_id = ?', [senderId]);
    const purchasedBalance = Number(senderWallet?.purchased_balance) || 0;

    if (purchasedBalance < coinPrice) {
      throw new Error(`গিফট করার জন্য আমাদের স্টোর থেকে কেনা কয়েন প্রয়োজন। ফ্রি অর্জিত (Earned) বা রিসিভ করা কয়েন অন্যকে গিফট করা যাবে না।`);
    }

    const senderBalanceBefore = Number(sender.coins_balance) || 0;
    if (senderBalanceBefore < coinPrice) {
      throw new Error(`আপনার পর্যাপ্ত কয়েন নেই`);
    }

    // B. Verify receiver exists
    const receiver = queryDbOne(db, 'SELECT id, username, full_name, coins_balance, status FROM users WHERE id = ?', [receiverId]);
    if (!receiver) throw new Error('Recipient user account not found');

    const receiverBalanceBefore = Number(receiver.coins_balance) || 0;

    // C. Calculate atomic balances
    const senderBalanceAfter = senderBalanceBefore - coinPrice;
    const receiverBalanceAfter = receiverBalanceBefore + coinPrice;

    // D. Update users table
    runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [senderBalanceAfter, senderId]);
    runDb(db, 'UPDATE users SET coins_balance = ? WHERE id = ?', [receiverBalanceAfter, receiverId]);

    const now = new Date().toISOString();

    // E. Update coin_wallets with exact balance tracking
    runDb(
      db,
      `INSERT INTO coin_wallets (id, user_id, balance, purchased_balance, total_spent, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET 
         balance = balance - ?, 
         purchased_balance = MAX(0, purchased_balance - ?), 
         total_spent = total_spent + ?, 
         updated_at = ?`,
      ['cw_' + senderId, senderId, senderBalanceAfter, 0, coinPrice, now, coinPrice, coinPrice, coinPrice, now]
    );

    runDb(
      db,
      `INSERT INTO coin_wallets (id, user_id, balance, received_gift_balance, total_earned, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET 
         balance = balance + ?, 
         received_gift_balance = received_gift_balance + ?, 
         total_earned = total_earned + ?, 
         updated_at = ?`,
      ['cw_' + receiverId, receiverId, receiverBalanceAfter, coinPrice, coinPrice, now, coinPrice, coinPrice, coinPrice, now]
    );

    // F. Record Immutable Debit & Credit in coin_transactions
    const txIdSender = 'ctx_' + Date.now() + '_g_s_' + Math.floor(Math.random() * 10000);
    const txIdReceiver = 'ctx_' + Date.now() + '_g_r_' + Math.floor(Math.random() * 10000);

    const metaStr = JSON.stringify({
      giftId,
      giftName: gift.name,
      image3d: gift.image_3d,
      animation: gift.animation,
      postId: postId || null,
      commentId: commentId || null,
      idempotencyKey: idempotencyKey || null,
    });

    runDb(
      db,
      `INSERT INTO coin_transactions (
        id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at
      ) VALUES (?, ?, ?, ?, 'gift', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        txIdSender,
        senderId,
        senderId,
        receiverId,
        -coinPrice,
        senderBalanceBefore,
        senderBalanceAfter,
        postId || commentId || giftId,
        `Sent ${gift.name} gift to ${receiver.full_name}`,
        metaStr,
        now,
      ]
    );

    runDb(
      db,
      `INSERT INTO coin_transactions (
        id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at
      ) VALUES (?, ?, ?, ?, 'gift', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        txIdReceiver,
        receiverId,
        senderId,
        receiverId,
        coinPrice,
        receiverBalanceBefore,
        receiverBalanceAfter,
        postId || commentId || giftId,
        `Received ${gift.name} gift from ${sender.full_name}`,
        metaStr,
        now,
      ]
    );

    // G. Record in gift_transactions
    const sentGiftId = 'gtx_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    runDb(
      db,
      `INSERT INTO gift_transactions (
        id, transaction_id, sender_id, receiver_id, gift_id, post_id, comment_id, coin_amount, status, idempotency_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
      [
        sentGiftId,
        txIdSender,
        senderId,
        receiverId,
        giftId,
        postId || null,
        commentId || null,
        coinPrice,
        idempotencyKey || null,
        now,
      ]
    );

    // H. Increment gifts count on post or comment if applicable
    if (postId) {
      runDb(db, 'UPDATE posts SET gifts_received_count = gifts_received_count + 1 WHERE id = ?', [postId]);
    }

    return {
      success: true,
      transactionId: sentGiftId,
      giftId,
      giftName: gift.name,
      coinPrice,
      senderBalanceAfter,
      receiverBalanceAfter,
    };
  });
}

/**
 * Admin authorized gift refund
 * - Atomically reverses the transaction: credits sender, debits recipient
 * - Records reversal transaction in ledger
 * - Updates status of gift transaction to 'refunded'
 */
export function refundGiftTransaction(
  db: SqlJsDatabase,
  giftTransactionId: string,
  adminId: string,
  reason: string
) {
  const giftTx = queryDbOne(
    db,
    'SELECT * FROM gift_transactions WHERE id = ?',
    [giftTransactionId]
  );
  if (!giftTx) throw new Error('Gift transaction record not found');
  if (giftTx.status === 'refunded') throw new Error('Transaction has already been refunded');

  const { sender_id: senderId, receiver_id: receiverId, coin_amount: amount, gift_id: giftId } = giftTx;
  const now = new Date().toISOString();

  return runInTransaction(db, () => {
    // 1. Fetch current balances
    const sender = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [senderId]);
    const receiver = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [receiverId]);
    if (!sender || !receiver) throw new Error('Sender or receiver account no longer exists');

    const senderBefore = Number(sender.coins_balance) || 0;
    const receiverBefore = Number(receiver.coins_balance) || 0;

    // Refund: sender gets credited, receiver gets debited
    const senderAfter = senderBefore + amount;
    const receiverAfter = Math.max(0, receiverBefore - amount);

    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [senderAfter, senderId]);
    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [receiverAfter, receiverId]);

    // Update wallets
    db.run('UPDATE coin_wallets SET balance = ?, total_spent = MAX(0, total_spent - ?), updated_at = ? WHERE user_id = ?', [senderAfter, amount, now, senderId]);
    db.run('UPDATE coin_wallets SET balance = ?, total_earned = MAX(0, total_earned - ?), updated_at = ? WHERE user_id = ?', [receiverAfter, amount, now, receiverId]);

    // Mark gift_transactions as refunded
    db.run(
      'UPDATE gift_transactions SET status = "refunded", refunded_at = ?, refund_reason = ? WHERE id = ?',
      [now, reason || 'Admin authorized refund', giftTransactionId]
    );

    // Ledger reversal entries
    const revIdSender = 'ctx_' + Date.now() + '_ref_s_' + Math.floor(Math.random() * 1000);
    const revIdReceiver = 'ctx_' + Date.now() + '_ref_r_' + Math.floor(Math.random() * 1000);

    db.run(
      `INSERT INTO coin_transactions (
        id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at
      ) VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        revIdSender,
        senderId,
        'SYSTEM_REFUND',
        senderId,
        amount,
        senderBefore,
        senderAfter,
        giftTransactionId,
        `Refund for gift ${giftId}: ${reason}`,
        JSON.stringify({ adminId, originalGiftTransactionId: giftTransactionId }),
        now,
      ]
    );

    db.run(
      `INSERT INTO coin_transactions (
        id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at
      ) VALUES (?, ?, ?, ?, 'transfer', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        revIdReceiver,
        receiverId,
        receiverId,
        'SYSTEM_REFUND',
        -amount,
        receiverBefore,
        receiverAfter,
        giftTransactionId,
        `Reversal debit for refunded gift ${giftId}: ${reason}`,
        JSON.stringify({ adminId, originalGiftTransactionId: giftTransactionId }),
        now,
      ]
    );

    // Log admin audit
    db.run(
      `INSERT INTO audit_logs (id, user_id, action, details, created_at) VALUES (?, ?, 'ADMIN_REFUND_GIFT', ?, ?)`,
      ['log_' + Date.now(), adminId, `Refunded gift tx ${giftTransactionId} (${amount} coins). Reason: ${reason}`, now]
    );

    return {
      success: true,
      giftTransactionId,
      refundedAmount: amount,
      senderBalanceAfter: senderAfter,
      receiverBalanceAfter: receiverAfter,
    };
  });
}

/**
 * Investigates suspicious activity across the coin and gift economy
 * - Rapid velocity burst (high frequency transfers in short window)
 * - Spam reward attempts
 * - Wallet balance anomalies
 */
export function getSuspiciousActivityMetrics(db: SqlJsDatabase) {
  const list: any[] = [];

  // 1. High Velocity Gifting: users who sent > 5 gifts in the last 15 minutes
  const rapidSenders = queryDbAll(
    db,
    `SELECT sender_id, COUNT(*) as cnt, SUM(coin_amount) as total_coins
     FROM gift_transactions
     WHERE created_at >= datetime('now', '-15 minutes')
     GROUP BY sender_id
     HAVING cnt >= 5
     ORDER BY cnt DESC LIMIT 10`
  );

  for (const s of rapidSenders) {
    const u = queryDbOne(db, 'SELECT username, full_name FROM users WHERE id = ?', [s.sender_id]);
    list.push({
      id: 'susp_vel_' + s.sender_id,
      userId: s.sender_id,
      userName: u ? `${u.full_name} (@${u.username})` : s.sender_id,
      severity: s.cnt >= 10 ? 'high' : 'medium',
      type: 'rapid_velocity',
      details: `High gift frequency: sent ${s.cnt} gifts totaling ${s.total_coins} coins in the last 15 minutes.`,
      detectedAt: new Date().toISOString(),
    });
  }

  // 2. High Earning Velocity: users earning near or at max daily limit
  const rules = getCoinEarningRules(db);
  const highEarners = queryDbAll(
    db,
    `SELECT user_id, COUNT(*) as events_count, SUM(coins) as earned_today
     FROM coin_earnings_ledger
     WHERE status = 'completed' AND created_at >= datetime('now', '-1 day')
     GROUP BY user_id
     HAVING earned_today >= ?
     ORDER BY earned_today DESC LIMIT 10`,
    [Math.floor(rules.dailyEarningLimit * 0.85)]
  );

  for (const h of highEarners) {
    const u = queryDbOne(db, 'SELECT username, full_name FROM users WHERE id = ?', [h.user_id]);
    list.push({
      id: 'susp_earn_' + h.user_id,
      userId: h.user_id,
      userName: u ? `${u.full_name} (@${u.username})` : h.user_id,
      severity: h.earned_today >= rules.dailyEarningLimit ? 'high' : 'low',
      type: 'limit_bypass_attempt',
      details: `Approaching or reached daily earning limit: earned ${h.earned_today} coins across ${h.events_count} events today.`,
      detectedAt: new Date().toISOString(),
    });
  }

  // 3. Check for any balance discrepancies between users.coins_balance and coin_wallets.balance
  const discrepancies = queryDbAll(
    db,
    `SELECT u.id, u.username, u.full_name, u.coins_balance, w.balance as wallet_balance
     FROM users u
     JOIN coin_wallets w ON u.id = w.user_id
     WHERE u.coins_balance != w.balance
     LIMIT 10`
  );

  for (const d of discrepancies) {
    list.push({
      id: 'susp_disc_' + d.id,
      userId: d.id,
      userName: `${d.full_name} (@${d.username})`,
      severity: 'critical',
      type: 'burst_transfer',
      details: `Ledger balance mismatch: users table reports ${d.coins_balance} coins, but coin_wallets reports ${d.wallet_balance} coins.`,
      detectedAt: new Date().toISOString(),
    });
  }

  return list;
}
