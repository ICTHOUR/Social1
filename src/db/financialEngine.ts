import crypto from 'crypto';
import { Database } from 'sql.js';
import { queryDbAll, queryDbOne, runDb, saveDbSync } from './database.js';
import { PaymentGatewayRegistry } from '../payments/PaymentGatewayRegistry.js';
import { PaymentGatewayId } from '../payments/types.js';

export interface WithdrawalSettings {
  id: string;
  minWithdrawalCoins: number;
  maxWithdrawalCoins: number;
  conversionRateCoins: number; // e.g. 1000 coins
  conversionRateBdt: number;   // e.g. 120.00 BDT
  processingFeePercent: number; // e.g. 2.5%
  processingFeeFixedBdt: number; // e.g. 5.00 BDT
  dailyLimitCoins: number;
  weeklyLimitCoins: number;
  verificationRequirement: 'none' | 'phone_verified' | 'kyc_verified' | 'account_age_24h';
  allowedPayoutMethods: string[];
  isWithdrawalEnabled: boolean;
  updatedAt: string;
}

export interface CoinPackageItem {
  id: string;
  name: string;
  coinAmount: number;
  bonusCoins: number;
  priceBdt: number;
  priceUsd: number;
  isActive: boolean;
  isCustom: boolean;
  minCustomCoins?: number;
  maxCustomCoins?: number;
  perUserLimit: number;
  dailyLimit: number;
  sortOrder: number;
  badgeText?: string;
  createdAt: string;
  updatedAt: string;
}

// Decimal-safe helper for currency calculation
export function toDecimalSafe(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Initialize tables if needed
export function ensureFinancialTables(db: Database) {
  // 1. Withdrawal System Settings
  runDb(db, `
    CREATE TABLE IF NOT EXISTS withdrawal_system_settings (
      id TEXT PRIMARY KEY,
      min_withdrawal_coins INTEGER DEFAULT 10,
      max_withdrawal_coins INTEGER DEFAULT 50000,
      conversion_rate_coins INTEGER DEFAULT 1000,
      conversion_rate_bdt DECIMAL(10,2) DEFAULT 120.00,
      processing_fee_percent DECIMAL(5,2) DEFAULT 2.50,
      processing_fee_fixed_bdt DECIMAL(10,2) DEFAULT 5.00,
      daily_limit_coins INTEGER DEFAULT 25000,
      weekly_limit_coins INTEGER DEFAULT 100000,
      verification_requirement TEXT DEFAULT 'none',
      allowed_payout_methods TEXT DEFAULT '["bkash", "nagad", "rocket", "upay", "bank_transfer", "paypal", "stripe", "crypto"]',
      is_withdrawal_enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure default withdrawal settings row exists
  const existingSettings = queryDbOne(db, 'SELECT id, min_withdrawal_coins FROM withdrawal_system_settings WHERE id = "global"');
  if (!existingSettings) {
    runDb(db, `
      INSERT INTO withdrawal_system_settings (
        id, min_withdrawal_coins, max_withdrawal_coins, conversion_rate_coins, conversion_rate_bdt,
        processing_fee_percent, processing_fee_fixed_bdt, daily_limit_coins, weekly_limit_coins,
        verification_requirement, allowed_payout_methods, is_withdrawal_enabled, updated_at
      ) VALUES (
        'global', 10, 50000, 1000, 120.00,
        2.50, 5.00, 25000, 100000,
        'none', '["bkash", "nagad", "rocket", "upay", "bank_transfer", "paypal", "stripe", "crypto"]', 1, '${new Date().toISOString()}'
      );
    `);
  } else if (existingSettings.min_withdrawal_coins > 10) {
    runDb(db, `
      UPDATE withdrawal_system_settings SET
        min_withdrawal_coins = 10,
        allowed_payout_methods = '["bkash", "nagad", "rocket", "upay", "bank_transfer", "paypal", "stripe", "crypto"]'
      WHERE id = 'global';
    `);
  }

  // 2. Comprehensive Withdrawal Requests Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS withdrawal_requests_v2 (
      id TEXT PRIMARY KEY,
      request_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      coins_amount INTEGER NOT NULL,
      gross_amount_bdt DECIMAL(12,2) NOT NULL,
      fee_bdt DECIMAL(12,2) NOT NULL,
      net_payout_bdt DECIMAL(12,2) NOT NULL,
      conversion_rate_used DECIMAL(12,4) NOT NULL,
      payout_method_type TEXT NOT NULL,
      payout_account_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      rejection_reason TEXT,
      gateway_payout_ref TEXT,
      processed_by_admin_id TEXT,
      status_history TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Payment Transactions Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_transactions_v2 (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      package_id TEXT,
      coins_amount INTEGER NOT NULL,
      bonus_coins INTEGER DEFAULT 0,
      total_coins INTEGER NOT NULL,
      amount_bdt DECIMAL(12,2) NOT NULL,
      amount_usd DECIMAL(12,2) NOT NULL,
      currency TEXT DEFAULT 'BDT',
      gateway_id TEXT NOT NULL,
      gateway_tx_id TEXT,
      status TEXT DEFAULT 'pending',
      payer_account TEXT,
      failure_reason TEXT,
      refund_reason TEXT,
      refund_tx_id TEXT,
      reconciled_at TEXT,
      reconciled_by TEXT,
      metadata TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Alias table/view for payment_transactions
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency TEXT DEFAULT 'BDT',
      status TEXT DEFAULT 'pending',
      gateway_id TEXT NOT NULL,
      gateway_tx_id TEXT,
      provider_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Payment Callbacks Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_callbacks (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      gateway_id TEXT NOT NULL,
      status TEXT NOT NULL,
      payer_account TEXT,
      payload_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Payment Webhooks Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id TEXT PRIMARY KEY,
      gateway_id TEXT NOT NULL,
      event_type TEXT DEFAULT 'payment_update',
      payload_json TEXT,
      headers_json TEXT,
      processed_status TEXT DEFAULT 'processed',
      created_at TEXT NOT NULL
    );
  `);

  // Payment Logs Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_logs (
      id TEXT PRIMARY KEY,
      transaction_id TEXT,
      gateway_id TEXT NOT NULL,
      log_level TEXT DEFAULT 'info',
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Payment Refunds Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_refunds (
      id TEXT PRIMARY KEY,
      refund_transaction_id TEXT UNIQUE NOT NULL,
      original_transaction_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency TEXT DEFAULT 'BDT',
      status TEXT DEFAULT 'completed',
      reason TEXT,
      processed_by TEXT DEFAULT 'system',
      provider_response_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Payment Gateway Settings Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS payment_gateway_settings (
      gateway_id TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 1,
      is_sandbox INTEGER DEFAULT 1,
      merchant_id TEXT,
      merchant_password TEXT,
      merchant_secret TEXT,
      base_url TEXT,
      callback_url TEXT,
      currency TEXT DEFAULT 'BDT',
      timeout_ms INTEGER DEFAULT 30000,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed PayStation default settings if empty
  const existingPaystationSettings = queryDbOne(db, 'SELECT gateway_id FROM payment_gateway_settings WHERE gateway_id = "paystation"');
  if (!existingPaystationSettings) {
    const nowStr = new Date().toISOString();
    runDb(
      db,
      `INSERT INTO payment_gateway_settings (
        gateway_id, is_enabled, is_sandbox, merchant_id, merchant_password, merchant_secret, base_url, callback_url, currency, timeout_ms, updated_at
      ) VALUES ('paystation', 1, 1, 'DEMO_MERCHANT_101', 'DEMO_SECRET_PASS_999', 'ps_secret_demo_key', 'https://sandbox.paystation.com.bd', '/api/payments/paystation/callback', 'BDT', 30000, ?)`,
      [nowStr]
    );
  }

  // 4. Enhanced Coin Packages Table
  runDb(db, `
    CREATE TABLE IF NOT EXISTS coin_packages_v2 (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      coin_amount INTEGER NOT NULL,
      bonus_coins INTEGER DEFAULT 0,
      price_bdt DECIMAL(10,2) NOT NULL,
      price_usd DECIMAL(10,2) NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_custom INTEGER DEFAULT 0,
      min_custom_coins INTEGER DEFAULT 100,
      max_custom_coins INTEGER DEFAULT 50000,
      per_user_limit INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 1,
      badge_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default packages if empty
  const pkgCount = queryDbOne(db, 'SELECT COUNT(*) as count FROM coin_packages_v2');
  if (!pkgCount || pkgCount.count === 0) {
    const defaultPkgs = [
      { id: 'pkg_100', name: 'Starter Spark', coinAmount: 100, bonusCoins: 0, priceBdt: 12.00, priceUsd: 0.99, sortOrder: 1, badgeText: 'Starter' },
      { id: 'pkg_500', name: 'Bronze Booster', coinAmount: 500, bonusCoins: 25, priceBdt: 59.00, priceUsd: 4.99, sortOrder: 2, badgeText: '+5% Bonus' },
      { id: 'pkg_1000', name: 'Silver Surge', coinAmount: 1000, bonusCoins: 100, priceBdt: 115.00, priceUsd: 9.99, sortOrder: 3, badgeText: 'Popular (+10%)' },
      { id: 'pkg_5000', name: 'Golden Treasure', coinAmount: 5000, bonusCoins: 750, priceBdt: 549.00, priceUsd: 49.99, sortOrder: 4, badgeText: 'Best Value (+15%)' },
      { id: 'pkg_custom', name: 'Custom Creator Pack', coinAmount: 0, bonusCoins: 0, priceBdt: 0, priceUsd: 0, isCustom: 1, sortOrder: 5, badgeText: 'Flexible Amount' },
    ];

    const now = new Date().toISOString();
    for (const p of defaultPkgs) {
      runDb(db, `
        INSERT INTO coin_packages_v2 (
          id, name, coin_amount, bonus_coins, price_bdt, price_usd, is_active, is_custom,
          min_custom_coins, max_custom_coins, per_user_limit, daily_limit, sort_order, badge_text,
          created_at, updated_at
        ) VALUES (
          '${p.id}', '${p.name}', ${p.coinAmount}, ${p.bonusCoins}, ${p.priceBdt}, ${p.priceUsd}, 1, ${p.isCustom ? 1 : 0},
          100, 50000, 0, 0, ${p.sortOrder}, '${p.badgeText || ''}', '${now}', '${now}'
        );
      `);
    }
  }

  saveDbSync();
}

// -------------------------------------------------------------
// WITHDRAWAL SETTINGS & RATE CALCULATIONS
// -------------------------------------------------------------

export function getWithdrawalSettings(db: Database): WithdrawalSettings {
  ensureFinancialTables(db);
  const row = queryDbOne(db, 'SELECT * FROM withdrawal_system_settings WHERE id = "global"');
  if (!row) {
    return {
      id: 'global',
      minWithdrawalCoins: 10,
      maxWithdrawalCoins: 50000,
      conversionRateCoins: 1000,
      conversionRateBdt: 120.00,
      processingFeePercent: 2.50,
      processingFeeFixedBdt: 5.00,
      dailyLimitCoins: 25000,
      weeklyLimitCoins: 100000,
      verificationRequirement: 'none',
      allowedPayoutMethods: ['bkash', 'nagad', 'rocket', 'upay', 'bank_transfer', 'paypal', 'stripe', 'crypto'],
      isWithdrawalEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  let methods: string[] = [];
  try {
    methods = JSON.parse(row.allowed_payout_methods);
  } catch {
    methods = ['bkash', 'nagad', 'rocket', 'upay', 'bank_transfer', 'paypal', 'stripe', 'crypto'];
  }

  return {
    id: row.id,
    minWithdrawalCoins: row.min_withdrawal_coins,
    maxWithdrawalCoins: row.max_withdrawal_coins,
    conversionRateCoins: row.conversion_rate_coins,
    conversionRateBdt: Number(row.conversion_rate_bdt),
    processingFeePercent: Number(row.processing_fee_percent),
    processingFeeFixedBdt: Number(row.processing_fee_fixed_bdt),
    dailyLimitCoins: row.daily_limit_coins,
    weeklyLimitCoins: row.weekly_limit_coins,
    verificationRequirement: row.verification_requirement,
    allowedPayoutMethods: methods,
    isWithdrawalEnabled: Boolean(row.is_withdrawal_enabled),
    updatedAt: row.updated_at,
  };
}

export function updateWithdrawalSettings(db: Database, updates: Partial<WithdrawalSettings>): WithdrawalSettings {
  const current = getWithdrawalSettings(db);
  const updated: WithdrawalSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.run(`
    UPDATE withdrawal_system_settings SET
      min_withdrawal_coins = ${Math.floor(updated.minWithdrawalCoins)},
      max_withdrawal_coins = ${Math.floor(updated.maxWithdrawalCoins)},
      conversion_rate_coins = ${Math.floor(updated.conversionRateCoins)},
      conversion_rate_bdt = ${toDecimalSafe(updated.conversionRateBdt)},
      processing_fee_percent = ${toDecimalSafe(updated.processingFeePercent)},
      processing_fee_fixed_bdt = ${toDecimalSafe(updated.processingFeeFixedBdt)},
      daily_limit_coins = ${Math.floor(updated.dailyLimitCoins)},
      weekly_limit_coins = ${Math.floor(updated.weeklyLimitCoins)},
      verification_requirement = '${updated.verificationRequirement}',
      allowed_payout_methods = '${JSON.stringify(updated.allowedPayoutMethods)}',
      is_withdrawal_enabled = ${updated.isWithdrawalEnabled ? 1 : 0},
      updated_at = '${updated.updatedAt}'
    WHERE id = 'global';
  `);

  saveDbSync();
  return updated;
}

/**
 * Calculates conversion server-side:
 * conversion: conversionRateCoins coins = conversionRateBdt BDT
 * fee: (gross * processingFeePercent / 100) + processingFeeFixedBdt
 */
export function calculateWithdrawalBreakdown(settings: WithdrawalSettings, coins: number): {
  coins: number;
  ratePerCoin: number;
  grossAmountBdt: number;
  feeBdt: number;
  netPayoutBdt: number;
} {
  const ratePerCoin = settings.conversionRateBdt / settings.conversionRateCoins;
  const grossAmountBdt = toDecimalSafe(coins * ratePerCoin);
  const percentageFee = toDecimalSafe((grossAmountBdt * settings.processingFeePercent) / 100);
  const totalFeeBdt = toDecimalSafe(percentageFee + settings.processingFeeFixedBdt);
  const netPayoutBdt = toDecimalSafe(Math.max(0, grossAmountBdt - totalFeeBdt));

  return {
    coins,
    ratePerCoin,
    grossAmountBdt,
    feeBdt: totalFeeBdt,
    netPayoutBdt,
  };
}

// -------------------------------------------------------------
// USER WITHDRAWAL OPERATIONS (TRANSACTION-SAFE)
// -------------------------------------------------------------

export function requestUserWithdrawal(
  db: Database,
  userId: string,
  coins: number,
  payoutMethodType: string,
  payoutAccountDetails: any
): { success: boolean; request?: any; error?: string } {
  ensureFinancialTables(db);
  const settings = getWithdrawalSettings(db);

  if (!settings.isWithdrawalEnabled) {
    return { success: false, error: 'Withdrawals are currently disabled by platform administration.' };
  }

  // 1. Validate coins boundaries
  if (coins < settings.minWithdrawalCoins) {
    return { success: false, error: `Minimum withdrawal is ${settings.minWithdrawalCoins} coins.` };
  }

  // 2. Check user wallet balance
  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
  if (!wallet || wallet.balance < coins) {
    return { success: false, error: `Insufficient coin balance. You have ${wallet?.balance || 0} coins.` };
  }

  if (coins > settings.maxWithdrawalCoins) {
    return { success: false, error: `Maximum withdrawal is ${settings.maxWithdrawalCoins} coins per request.` };
  }

  // 3. Validate payout method
  if (!settings.allowedPayoutMethods.includes(payoutMethodType.toLowerCase())) {
    return { success: false, error: `Payout method '${payoutMethodType}' is not currently accepted.` };
  }

  // 4. Check Daily Limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dailyUsage = queryDbOne(
    db,
    `SELECT SUM(coins_amount) as total FROM withdrawal_requests_v2
     WHERE user_id = ? AND status NOT IN ('rejected', 'cancelled') AND created_at >= ?`,
    [userId, oneDayAgo]
  );
  const currentDailyTotal = (dailyUsage?.total || 0) + coins;
  if (currentDailyTotal > settings.dailyLimitCoins) {
    return {
      success: false,
      error: `Daily withdrawal limit exceeded (${settings.dailyLimitCoins} coins/day). You have used ${dailyUsage?.total || 0} coins in past 24h.`,
    };
  }

  // 5. Check Weekly Limit
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weeklyUsage = queryDbOne(
    db,
    `SELECT SUM(coins_amount) as total FROM withdrawal_requests_v2
     WHERE user_id = ? AND status NOT IN ('rejected', 'cancelled') AND created_at >= ?`,
    [userId, sevenDaysAgo]
  );
  const currentWeeklyTotal = (weeklyUsage?.total || 0) + coins;
  if (currentWeeklyTotal > settings.weeklyLimitCoins) {
    return {
      success: false,
      error: `Weekly withdrawal limit exceeded (${settings.weeklyLimitCoins} coins/week).`,
    };
  }

  // 6. Check Verification Requirement
  if (settings.verificationRequirement !== 'none') {
    const user = queryDbOne(db, 'SELECT created_at, phone, is_verified FROM users WHERE id = ?', [userId]);
    if (settings.verificationRequirement === 'phone_verified' && !user?.phone) {
      return { success: false, error: 'Phone verification is required before initiating a withdrawal.' };
    }
    if (settings.verificationRequirement === 'kyc_verified' && !user?.is_verified) {
      return { success: false, error: 'Identity KYC verification is required before initiating a withdrawal.' };
    }
    if (settings.verificationRequirement === 'account_age_24h') {
      const accountCreated = new Date(user?.created_at || 0).getTime();
      if (Date.now() - accountCreated < 24 * 60 * 60 * 1000) {
        return { success: false, error: 'Account must be at least 24 hours old to request a withdrawal.' };
      }
    }
  }

  // 7. Calculate exact server-side financial figures
  const breakdown = calculateWithdrawalBreakdown(settings, coins);

  // 8. ATOMIC BALANCE LOCK: Deduct coins from wallet immediately to prevent double spending
  const balanceBefore = wallet.balance;
  const balanceAfter = balanceBefore - coins;

  const now = new Date().toISOString();
  const reqId = `WREQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const requestCode = `WD-${Math.floor(100000 + Math.random() * 900000)}`;

  // Deduct coins atomically from received_gift_balance and earned_balance first
  const currentWallet = queryDbOne(db, 'SELECT received_gift_balance, earned_balance FROM coin_wallets WHERE user_id = ?', [userId]);
  const giftBal = Number(currentWallet?.received_gift_balance) || 0;
  const deductFromGift = Math.min(giftBal, coins);
  const deductFromEarned = coins - deductFromGift;

  runDb(
    db,
    `UPDATE coin_wallets SET 
      balance = balance - ?, 
      received_gift_balance = MAX(0, received_gift_balance - ?),
      earned_balance = MAX(0, earned_balance - ?),
      updated_at = ? 
     WHERE user_id = ? AND balance >= ?`,
    [
      coins,
      deductFromGift,
      deductFromEarned,
      now,
      userId,
      coins,
    ]
  );

  // Record ledger entry
  const txId = `CTX-WDR-${Date.now()}`;
  runDb(
    db,
    `INSERT INTO coin_transactions (
      id, user_id, transaction_type, amount, balance_before, balance_after,
      reference_id, status, note, metadata, created_at
    ) VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      txId,
      userId,
      coins,
      balanceBefore,
      balanceAfter,
      reqId,
      `Withdrawal Request ${requestCode} (${breakdown.netPayoutBdt} BDT via ${payoutMethodType.toUpperCase()})`,
      JSON.stringify({ requestCode, breakdown, payoutMethodType }),
      now,
    ]
  );

  // Insert withdrawal request
  const initialHistory = JSON.stringify([
    { status: 'pending', timestamp: now, note: 'Withdrawal requested by user.' },
  ]);

  runDb(
    db,
    `INSERT INTO withdrawal_requests_v2 (
      id, request_code, user_id, coins_amount, gross_amount_bdt, fee_bdt,
      net_payout_bdt, conversion_rate_used, payout_method_type, payout_account_details,
      status, status_history, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      reqId,
      requestCode,
      userId,
      coins,
      breakdown.grossAmountBdt,
      breakdown.feeBdt,
      breakdown.netPayoutBdt,
      breakdown.ratePerCoin,
      payoutMethodType.toLowerCase(),
      typeof payoutAccountDetails === 'string' ? payoutAccountDetails : JSON.stringify(payoutAccountDetails),
      initialHistory,
      now,
      now,
    ]
  );

  saveDbSync();

  const createdRequest = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ?', [reqId]);
  return { success: true, request: createdRequest };
}

// User cancels pending withdrawal request
export function cancelUserWithdrawal(
  db: Database,
  reqId: string,
  userId: string
): { success: boolean; error?: string } {
  ensureFinancialTables(db);
  const req = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ? AND user_id = ?', [reqId, userId]);
  if (!req) return { success: false, error: 'Withdrawal request not found.' };

  if (req.status !== 'pending') {
    return { success: false, error: `Cannot cancel a withdrawal request that is already in '${req.status}' status.` };
  }

  const now = new Date().toISOString();

  // Atomically refund locked coins back to user
  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
  const balanceBefore = wallet?.balance || 0;
  const balanceAfter = balanceBefore + req.coins_amount;

  runDb(db, 'UPDATE coin_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?', [
    req.coins_amount,
    now,
    userId,
  ]);

  // Record refund in ledger
  runDb(
    db,
    `INSERT INTO coin_transactions (
      id, user_id, transaction_type, amount, balance_before, balance_after,
      reference_id, status, note, created_at
    ) VALUES (?, ?, 'reward', ?, ?, ?, ?, 'completed', ?, ?)`,
    [
      `CTX-WDR-CAN-${Date.now()}`,
      userId,
      req.coins_amount,
      balanceBefore,
      balanceAfter,
      reqId,
      `Restitution: Cancelled withdrawal request ${req.request_code}`,
      now,
    ]
  );

  // Update status history
  let history = [];
  try {
    history = JSON.parse(req.status_history || '[]');
  } catch {}
  history.push({ status: 'cancelled', timestamp: now, note: 'Cancelled by user.' });

  runDb(db, `UPDATE withdrawal_requests_v2 SET status = 'cancelled', status_history = ?, updated_at = ? WHERE id = ?`, [
    JSON.stringify(history),
    now,
    reqId,
  ]);

  saveDbSync();
  return { success: true };
}

// -------------------------------------------------------------
// ADMIN WITHDRAWAL WORKFLOW (REVIEW, APPROVE, REJECT, MARK PAID)
// -------------------------------------------------------------

export function reviewWithdrawal(
  db: Database,
  reqId: string,
  adminId: string,
  newStatus: 'reviewing' | 'approved' | 'processing',
  adminNote?: string
): { success: boolean; error?: string; request?: any } {
  ensureFinancialTables(db);
  const req = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ? OR request_code = ?', [reqId, reqId]);
  if (!req) return { success: false, error: 'Withdrawal request not found.' };

  if (['paid', 'rejected', 'cancelled'].includes(req.status)) {
    return { success: false, error: `Cannot change status of a request that is already ${req.status}.` };
  }

  const now = new Date().toISOString();
  let history = [];
  try {
    history = JSON.parse(req.status_history || '[]');
  } catch {}
  history.push({
    status: newStatus,
    timestamp: now,
    adminId,
    note: adminNote || `Status updated to ${newStatus} by admin.`,
  });

  const updatedNotes = adminNote
    ? `${req.admin_notes || ''}\n[${now}] Admin: ${adminNote}`.trim()
    : req.admin_notes;

  runDb(
    db,
    `UPDATE withdrawal_requests_v2 SET
      status = ?,
      admin_notes = ?,
      processed_by_admin_id = ?,
      status_history = ?,
      updated_at = ?
     WHERE id = ?`,
    [newStatus, updatedNotes, adminId, JSON.stringify(history), now, req.id]
  );

  saveDbSync();
  const updated = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ?', [req.id]);
  return { success: true, request: updated };
}

export function rejectWithdrawal(
  db: Database,
  reqId: string,
  adminId: string,
  rejectionReason: string
): { success: boolean; error?: string } {
  ensureFinancialTables(db);
  const req = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ?', [reqId]);
  if (!req) return { success: false, error: 'Withdrawal request not found.' };

  if (['paid', 'rejected', 'cancelled'].includes(req.status)) {
    return { success: false, error: `Cannot reject request that is already ${req.status}.` };
  }

  if (!rejectionReason || !rejectionReason.trim()) {
    return { success: false, error: 'Rejection reason is mandatory for financial audit compliance.' };
  }

  const now = new Date().toISOString();

  // 1. ATOMIC RESTITUTION: Refund locked coins back to the user
  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [req.user_id]);
  const balanceBefore = wallet?.balance || 0;
  const balanceAfter = balanceBefore + req.coins_amount;

  runDb(db, 'UPDATE coin_wallets SET balance = balance + ?, updated_at = ? WHERE user_id = ?', [
    req.coins_amount,
    now,
    req.user_id,
  ]);

  // 2. Record ledger entry
  runDb(
    db,
    `INSERT INTO coin_transactions (
      id, user_id, transaction_type, amount, balance_before, balance_after,
      reference_id, status, note, created_at
    ) VALUES (?, ?, 'reward', ?, ?, ?, ?, 'completed', ?, ?)`,
    [
      `CTX-WDR-REJ-${Date.now()}`,
      req.user_id,
      req.coins_amount,
      balanceBefore,
      balanceAfter,
      reqId,
      `Restitution: Rejected withdrawal ${req.request_code} (Reason: ${rejectionReason})`,
      now,
    ]
  );

  // 3. Update status history
  let history = [];
  try {
    history = JSON.parse(req.status_history || '[]');
  } catch {}
  history.push({
    status: 'rejected',
    timestamp: now,
    adminId,
    reason: rejectionReason,
  });

  runDb(
    db,
    `UPDATE withdrawal_requests_v2 SET
      status = 'rejected',
      rejection_reason = ?,
      processed_by_admin_id = ?,
      status_history = ?,
      updated_at = ?
     WHERE id = ?`,
    [rejectionReason, adminId, JSON.stringify(history), now, reqId]
  );

  // Record Admin Audit Log
  runDb(
    db,
    `INSERT INTO audit_logs (id, user_id, action, details, created_at)
     VALUES (?, ?, 'reject_withdrawal', ?, ?)`,
    [
      `AUD-${Date.now()}`,
      adminId,
      `Rejected withdrawal request ${req.request_code} of ${req.coins_amount} coins (${req.net_payout_bdt} BDT) for user ${req.user_id}. Reason: ${rejectionReason}`,
      now,
    ]
  );

  saveDbSync();
  return { success: true };
}

export function markWithdrawalPaid(
  db: Database,
  reqId: string,
  adminId: string,
  gatewayPayoutRef: string,
  adminNote?: string
): { success: boolean; error?: string } {
  ensureFinancialTables(db);
  const req = queryDbOne(db, 'SELECT * FROM withdrawal_requests_v2 WHERE id = ?', [reqId]);
  if (!req) return { success: false, error: 'Withdrawal request not found.' };

  if (req.status === 'paid') {
    return { success: false, error: 'Withdrawal has already been marked as paid.' };
  }
  if (['rejected', 'cancelled'].includes(req.status)) {
    return { success: false, error: `Cannot mark a ${req.status} request as paid.` };
  }

  if (!gatewayPayoutRef || !gatewayPayoutRef.trim()) {
    return { success: false, error: 'Gateway payout reference / Transaction ID is required.' };
  }

  const now = new Date().toISOString();

  // Update status history
  let history = [];
  try {
    history = JSON.parse(req.status_history || '[]');
  } catch {}
  history.push({
    status: 'paid',
    timestamp: now,
    adminId,
    gatewayPayoutRef,
    note: adminNote || 'Marked as paid and funds successfully disbursed.',
  });

  runDb(
    db,
    `UPDATE withdrawal_requests_v2 SET
      status = 'paid',
      gateway_payout_ref = ?,
      processed_by_admin_id = ?,
      status_history = ?,
      updated_at = ?
     WHERE id = ?`,
    [gatewayPayoutRef, adminId, JSON.stringify(history), now, reqId]
  );

  // Record Cash Payout Transaction for financial accounting
  runDb(
    db,
    `INSERT INTO payout_transactions (
      id, user_id, amount_usd, fee_usd, status, reference_code, created_at
    ) VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
    [
      `PO-${Date.now()}`,
      req.user_id,
      req.net_payout_bdt, // Stored as BDT amount
      req.fee_bdt,
      gatewayPayoutRef,
      now,
    ]
  );

  // Record Audit Log
  runDb(
    db,
    `INSERT INTO audit_logs (id, user_id, action, details, created_at)
     VALUES (?, ?, 'mark_withdrawal_paid', ?, ?)`,
    [
      `AUD-${Date.now()}`,
      adminId,
      `Marked withdrawal ${req.request_code} as PAID (${req.net_payout_bdt} BDT via ${req.payout_method_type}). Gateway Ref: ${gatewayPayoutRef}`,
      now,
    ]
  );

  saveDbSync();
  return { success: true };
}

// -------------------------------------------------------------
// COIN PURCHASE & PAYMENT INTENT WORKFLOW
// -------------------------------------------------------------

export async function createPaymentIntentForCoins(
  db: Database,
  userId: string,
  packageId: string,
  customCoinAmount?: number,
  gatewayId: PaymentGatewayId = 'paystation',
  customerDetails?: { name?: string; phone?: string; email?: string }
): Promise<{ success: boolean; intent?: any; error?: string }> {
  ensureFinancialTables(db);

  let coinsAmount = 0;
  let bonusCoins = 0;
  let priceBdt = 0;
  let priceUsd = 0;

  if (packageId === 'custom' || packageId === 'pkg_custom') {
    if (!customCoinAmount || customCoinAmount < 100 || customCoinAmount > 100000) {
      return { success: false, error: 'Custom package coin amount must be between 100 and 100,000 coins.' };
    }
    // Dynamic price calculation based on withdrawal settings conversion rate
    const settings = getWithdrawalSettings(db);
    const ratePerCoin = settings.conversionRateBdt / settings.conversionRateCoins;
    coinsAmount = Math.floor(customCoinAmount);
    // Custom packages offer 5% bonus if > 2000 coins
    bonusCoins = coinsAmount >= 2000 ? Math.floor(coinsAmount * 0.05) : 0;
    priceBdt = toDecimalSafe(coinsAmount * ratePerCoin * 1.05); // slight margin
    priceUsd = toDecimalSafe(priceBdt / 120);
  } else {
    // Strictly fetch pre-configured package from database! NEVER TRUST CLIENT PRICE!
    const pkg = queryDbOne(db, 'SELECT * FROM coin_packages_v2 WHERE id = ? AND is_active = 1', [packageId]);
    if (!pkg) {
      return { success: false, error: 'Requested coin package is invalid or currently unavailable.' };
    }
    coinsAmount = pkg.coin_amount;
    bonusCoins = pkg.bonus_coins;
    priceBdt = Number(pkg.price_bdt);
    priceUsd = Number(pkg.price_usd);
  }

  const totalCoins = coinsAmount + bonusCoins;
  const transactionId = `PAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  // Record initial pending payment in database
  runDb(
    db,
    `INSERT INTO payment_transactions_v2 (
      id, transaction_id, user_id, package_id, coins_amount, bonus_coins, total_coins,
      amount_bdt, amount_usd, currency, gateway_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'BDT', ?, 'pending', ?, ?)`,
    [
      `PTX-${Date.now()}`,
      transactionId,
      userId,
      packageId,
      coinsAmount,
      bonusCoins,
      totalCoins,
      priceBdt,
      priceUsd,
      gatewayId,
      now,
      now,
    ]
  );

  // Sync to payment_transactions table for unified schema
  runDb(
    db,
    `INSERT INTO payment_transactions (
      id, transaction_id, user_id, amount, currency, status, gateway_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'BDT', 'pending', ?, ?, ?)`,
    [
      `PTX-${Date.now()}`,
      transactionId,
      userId,
      priceBdt,
      gatewayId,
      now,
      now,
    ]
  );

  logPaymentEvent(db, transactionId, gatewayId, 'info', 'initialization', `Created payment intent for ${totalCoins} coins (${priceBdt} BDT)`);
  saveDbSync();

  // Invoke Gateway Provider Abstraction
  try {
    const provider = PaymentGatewayRegistry.getInstance().getProvider(gatewayId);
    const user = queryDbOne(db, 'SELECT full_name, email, phone FROM users WHERE id = ?', [userId]);

    const targetCallback = gatewayId === 'paystation'
      ? `/api/payments/paystation/callback`
      : `/api/payments/callback/${gatewayId}`;

    const intentResult = await provider.createPaymentIntent({
      transactionId,
      userId,
      packageId,
      coinAmount: coinsAmount,
      bonusCoins,
      amountBdt: priceBdt,
      amountUsd: priceUsd,
      currency: 'BDT',
      customerName: customerDetails?.name || user?.full_name || 'Nixo Member',
      customerPhone: customerDetails?.phone || user?.phone || '01700000000',
      customerEmail: customerDetails?.email || user?.email || `${userId}@nixo.social`,
      callbackUrl: targetCallback,
      cancelUrl: `/api/payments/cancel/${gatewayId}`,
    });

    return {
      success: true,
      intent: {
        transactionId,
        packageId,
        coinsAmount,
        bonusCoins,
        totalCoins,
        amountBdt: priceBdt,
        currency: 'BDT',
        gatewayId,
        providerName: provider.name,
        paymentUrl: intentResult.paymentUrl,
        clientSecret: intentResult.clientSecret,
        status: intentResult.status,
        instructions: intentResult.instructions,
        rawResponse: intentResult.rawResponse,
      },
    };
  } catch (err: any) {
    logPaymentEvent(db, transactionId, gatewayId, 'error', 'initialization_failed', err.message || 'Provider initialization error');
    return { success: false, error: err.message || 'Payment provider error' };
  }
}

/**
 * Verifies payment, credits coins atomically, and records immutable ledgers.
 */
export async function verifyAndCreditPayment(
  db: Database,
  transactionId: string,
  payload?: any
): Promise<{ success: boolean; coinsCredited?: number; newBalance?: number; error?: string }> {
  ensureFinancialTables(db);
  const tx = queryDbOne(db, 'SELECT * FROM payment_transactions_v2 WHERE transaction_id = ?', [transactionId]);
  if (!tx) return { success: false, error: 'Payment transaction record not found.' };

  if (tx.status === 'completed') {
    const w = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [tx.user_id]);
    return { success: true, coinsCredited: tx.total_coins, newBalance: w?.balance || 0 };
  }

  // Verify through provider
  const provider = PaymentGatewayRegistry.getInstance().getProvider(tx.gateway_id as PaymentGatewayId);
  const verification = await provider.verifyPayment(tx.gateway_tx_id || transactionId, {
    ...payload,
    amount: tx.amount_bdt,
  });

  const now = new Date().toISOString();

  if (!verification.isValid || verification.status !== 'completed') {
    runDb(
      db,
      `UPDATE payment_transactions_v2 SET
        status = 'failed',
        failure_reason = ?,
        updated_at = ?
       WHERE transaction_id = ?`,
      [verification.failureReason || 'Gateway verification failed or payment was rejected.', now, transactionId]
    );
    saveDbSync();
    return { success: false, error: verification.failureReason || 'Payment verification failed.' };
  }

  // ATOMIC COIN CREDITING
  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [tx.user_id]);
  const balanceBefore = wallet?.balance || 0;
  const balanceAfter = balanceBefore + tx.total_coins;

  runDb(
    db,
    `UPDATE coin_wallets SET
      balance = balance + ?,
      purchased_balance = purchased_balance + ?,
      total_earned = total_earned + ?,
      updated_at = ?
     WHERE user_id = ?`,
    [tx.total_coins, tx.total_coins, tx.total_coins, now, tx.user_id]
  );

  // Immutable Coin Transaction Ledger
  runDb(
    db,
    `INSERT INTO coin_transactions (
      id, user_id, transaction_type, amount, balance_before, balance_after,
      reference_id, status, note, metadata, created_at
    ) VALUES (?, ?, 'recharge', ?, ?, ?, ?, 'completed', ?, ?, ?)`,
    [
      `CTX-BUY-${Date.now()}`,
      tx.user_id,
      tx.total_coins,
      balanceBefore,
      balanceAfter,
      transactionId,
      `Purchased ${tx.coins_amount} Coins (+${tx.bonus_coins} Bonus) via ${tx.gateway_id.toUpperCase()}`,
      JSON.stringify({ transactionId, gatewayId: tx.gateway_id, payerAccount: verification.payerAccount }),
      now,
    ]
  );

  // Update payment transaction to completed
  runDb(
    db,
    `UPDATE payment_transactions_v2 SET
      status = 'completed',
      gateway_tx_id = ?,
      payer_account = ?,
      updated_at = ?
     WHERE transaction_id = ?`,
    [verification.gatewayTransactionId, verification.payerAccount || 'Verified Payer', now, transactionId]
  );

  runDb(
    db,
    `UPDATE payment_transactions SET
      status = 'completed',
      gateway_tx_id = ?,
      provider_response = ?,
      updated_at = ?
     WHERE transaction_id = ?`,
    [verification.gatewayTransactionId, JSON.stringify(verification.rawResponse || {}), now, transactionId]
  );

  // Update original coin_purchases table for backwards compatibility
  runDb(
    db,
    `INSERT INTO coin_purchases (
      id, user_id, package_id, amount_coins, price_usd, payment_method, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
    [
      `CP-${Date.now()}`,
      tx.user_id,
      tx.package_id || 'custom',
      tx.total_coins,
      tx.amount_usd,
      tx.gateway_id,
      now,
    ]
  );

  logPaymentEvent(db, transactionId, tx.gateway_id, 'info', 'verification_success', `Successfully verified payment and credited ${tx.total_coins} coins to user ${tx.user_id}`);

  saveDbSync();
  return { success: true, coinsCredited: tx.total_coins, newBalance: balanceAfter };
}

// -------------------------------------------------------------
// USER WALLET SUMMARY (ALL 6 USER REQUIREMENTS)
// -------------------------------------------------------------

export function getUserWalletComprehensive(db: Database, userId: string): {
  balance: number;
  availableBalance: number;
  purchasedBalance: number;
  earnedBalance: number;
  receivedGiftBalance: number;
  withdrawableBalance: number;
  pendingBalance: number;
  spentBalance: number;
  giftedBalance: number;
  withdrawnAmountCoins: number;
  withdrawnAmountBdt: number;
  equivalentBdt: number;
  conversionRateUsed: { coins: number; bdt: number };
  recentTransactions: any[];
} {
  ensureFinancialTables(db);
  const settings = getWithdrawalSettings(db);

  // 1. Available Balances
  const wallet = queryDbOne(db, 'SELECT balance, purchased_balance, earned_balance, received_gift_balance, total_earned, total_spent FROM coin_wallets WHERE user_id = ?', [
    userId,
  ]);
  const availableBalance = wallet?.balance || 0;
  const purchasedBalance = wallet?.purchased_balance || 0;
  const receivedGiftBalance = wallet?.received_gift_balance || 0;
  const earnedBalance = wallet?.earned_balance || (availableBalance - purchasedBalance - receivedGiftBalance);
  const withdrawableBalance = Math.max(0, earnedBalance + receivedGiftBalance);
  const totalSpent = wallet?.total_spent || 0;

  // 2. Pending Balance (coins currently locked in pending/reviewing/approved/processing withdrawals)
  const pendingRows = queryDbOne(
    db,
    `SELECT SUM(coins_amount) as pending_coins, SUM(net_payout_bdt) as pending_bdt
     FROM withdrawal_requests_v2
     WHERE user_id = ? AND status IN ('pending', 'reviewing', 'approved', 'processing')`,
    [userId]
  );
  const pendingBalance = pendingRows?.pending_coins || 0;

  // 3. Earned Balance (gifts received + content rewards)
  const giftsReceived = queryDbOne(
    db,
    `SELECT SUM(amount) as total FROM coin_transactions
     WHERE user_id = ? AND transaction_type = 'gift' AND (receiver_id = ? OR note LIKE '%Gift received%')`,
    [userId, userId]
  );
  const contentRewards = queryDbOne(
    db,
    `SELECT SUM(amount) as total FROM coin_transactions
     WHERE user_id = ? AND transaction_type = 'reward'`,
    [userId]
  );
  const lifetimeEarned = (giftsReceived?.total || 0) + (contentRewards?.total || 0);

  // 4. Gifted Balance (coins sent out to creators)
  const giftsSent = queryDbOne(
    db,
    `SELECT SUM(amount) as total FROM coin_transactions
     WHERE user_id = ? AND transaction_type = 'gift' AND sender_id = ?`,
    [userId, userId]
  );
  const giftedBalance = giftsSent?.total || 0;
  const spentBalance = totalSpent > 0 ? totalSpent : giftedBalance;

  // 5. Withdrawn Amount (paid withdrawals)
  const paidWithdrawals = queryDbOne(
    db,
    `SELECT SUM(coins_amount) as total_coins, SUM(net_payout_bdt) as total_bdt
     FROM withdrawal_requests_v2
     WHERE user_id = ? AND status = 'paid'`,
    [userId]
  );
  const withdrawnAmountCoins = paidWithdrawals?.total_coins || 0;
  const withdrawnAmountBdt = toDecimalSafe(paidWithdrawals?.total_bdt || 0);

  // 6. Equivalent BDT calculation
  const ratePerCoin = settings.conversionRateBdt / settings.conversionRateCoins;
  const equivalentBdt = toDecimalSafe(availableBalance * ratePerCoin);

  // 7. Recent Transactions Ledger
  const recentTransactions = queryDbAll(
    db,
    `SELECT * FROM coin_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    [userId]
  );

  return {
    balance: availableBalance,
    availableBalance,
    purchasedBalance,
    earnedBalance,
    receivedGiftBalance,
    withdrawableBalance,
    pendingBalance,
    spentBalance,
    giftedBalance,
    withdrawnAmountCoins,
    withdrawnAmountBdt,
    equivalentBdt,
    conversionRateUsed: {
      coins: settings.conversionRateCoins,
      bdt: settings.conversionRateBdt,
    },
    recentTransactions,
  };
}

// -------------------------------------------------------------
// PAYMENT AUDIT LOGGING, CALLBACK, WEBHOOK & REFUND HELPERS
// -------------------------------------------------------------

export function logPaymentEvent(
  db: Database,
  transactionId: string | null,
  gatewayId: string,
  logLevel: 'info' | 'warn' | 'error',
  action: string,
  message: string,
  details?: any
) {
  ensureFinancialTables(db);
  const now = new Date().toISOString();
  const id = `PLOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  runDb(
    db,
    `INSERT INTO payment_logs (id, transaction_id, gateway_id, log_level, action, message, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, transactionId, gatewayId, logLevel, action, message, details ? JSON.stringify(details) : null, now]
  );
  saveDbSync();
}

export function recordPaymentCallback(
  db: Database,
  transactionId: string,
  gatewayId: string,
  status: string,
  payerAccount?: string,
  payloadJson?: any,
  ipAddress?: string
) {
  ensureFinancialTables(db);
  const now = new Date().toISOString();
  const id = `PCB-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  runDb(
    db,
    `INSERT INTO payment_callbacks (id, transaction_id, gateway_id, status, payer_account, payload_json, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, transactionId, gatewayId, status, payerAccount || null, payloadJson ? JSON.stringify(payloadJson) : null, ipAddress || null, now]
  );
  saveDbSync();
}

export function recordPaymentWebhook(
  db: Database,
  gatewayId: string,
  eventType: string,
  payloadJson: any,
  headersJson?: any
) {
  ensureFinancialTables(db);
  const now = new Date().toISOString();
  const id = `PWH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  runDb(
    db,
    `INSERT INTO payment_webhooks (id, gateway_id, event_type, payload_json, headers_json, processed_status, created_at)
     VALUES (?, ?, ?, ?, ?, 'processed', ?)`,
    [id, gatewayId, eventType, JSON.stringify(payloadJson), headersJson ? JSON.stringify(headersJson) : null, now]
  );
  saveDbSync();
}

export function recordPaymentRefund(
  db: Database,
  refundTrxId: string,
  originalTxId: string,
  userId: string,
  amount: number,
  currency: string = 'BDT',
  status: string = 'completed',
  reason?: string,
  processedBy: string = 'admin',
  providerResponse?: any
) {
  ensureFinancialTables(db);
  const now = new Date().toISOString();
  const id = `PRF-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  runDb(
    db,
    `INSERT INTO payment_refunds (id, refund_transaction_id, original_transaction_id, user_id, amount, currency, status, reason, processed_by, provider_response_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, refundTrxId, originalTxId, userId, amount, currency, status, reason || null, processedBy, providerResponse ? JSON.stringify(providerResponse) : null, now]
  );

  // Update payment_transactions_v2 record
  runDb(
    db,
    `UPDATE payment_transactions_v2 SET status = 'refunded', refund_tx_id = ?, refund_reason = ?, updated_at = ? WHERE transaction_id = ?`,
    [refundTrxId, reason || null, now, originalTxId]
  );

  saveDbSync();
}

export function getPayStationSettings(db: Database) {
  ensureFinancialTables(db);
  const row = queryDbOne(db, 'SELECT * FROM payment_gateway_settings WHERE gateway_id = "paystation"');
  if (!row) {
    return {
      gatewayId: 'paystation',
      isEnabled: true,
      isSandbox: true,
      merchantId: process.env.PAYSTATION_MERCHANT_ID || 'DEMO_MERCHANT_101',
      merchantPasswordMasked: '••••••••',
      baseUrl: 'https://sandbox.paystation.com.bd',
      callbackUrl: '/api/payments/paystation/callback',
      currency: 'BDT',
      timeoutMs: 30000,
    };
  }

  return {
    gatewayId: 'paystation',
    isEnabled: Boolean(row.is_enabled),
    isSandbox: Boolean(row.is_sandbox),
    merchantId: row.merchant_id || 'DEMO_MERCHANT_101',
    merchantPasswordMasked: row.merchant_password ? '••••••••' : '',
    merchantSecretMasked: row.merchant_secret ? '••••••••' : '',
    baseUrl: row.base_url || (row.is_sandbox ? 'https://sandbox.paystation.com.bd' : 'https://api.paystation.com.bd'),
    callbackUrl: row.callback_url || '/api/payments/paystation/callback',
    currency: row.currency || 'BDT',
    timeoutMs: row.timeout_ms || 30000,
    updatedAt: row.updated_at,
  };
}

export function updatePayStationSettings(db: Database, settings: {
  isEnabled?: boolean;
  isSandbox?: boolean;
  merchantId?: string;
  merchantPassword?: string;
  merchantSecret?: string;
  callbackUrl?: string;
  currency?: string;
  timeoutMs?: number;
}) {
  ensureFinancialTables(db);
  const now = new Date().toISOString();
  const current = queryDbOne(db, 'SELECT * FROM payment_gateway_settings WHERE gateway_id = "paystation"');

  const isEnabled = settings.isEnabled !== undefined ? (settings.isEnabled ? 1 : 0) : (current ? current.is_enabled : 1);
  const isSandbox = settings.isSandbox !== undefined ? (settings.isSandbox ? 1 : 0) : (current ? current.is_sandbox : 1);
  const merchantId = settings.merchantId !== undefined ? settings.merchantId : (current?.merchant_id || 'DEMO_MERCHANT_101');
  
  // If merchantPassword passed as masked string '••••••••', keep existing password
  let merchantPassword = current?.merchant_password || 'DEMO_SECRET_PASS_999';
  if (settings.merchantPassword && settings.merchantPassword !== '••••••••') {
    merchantPassword = settings.merchantPassword;
  }

  const merchantSecret = settings.merchantSecret || current?.merchant_secret || 'ps_secret_demo_key';
  const baseUrl = isSandbox ? 'https://sandbox.paystation.com.bd' : 'https://api.paystation.com.bd';
  const callbackUrl = settings.callbackUrl || current?.callback_url || '/api/payments/paystation/callback';
  const currency = settings.currency || current?.currency || 'BDT';
  const timeoutMs = settings.timeoutMs || current?.timeout_ms || 30000;

  runDb(
    db,
    `INSERT INTO payment_gateway_settings (
      gateway_id, is_enabled, is_sandbox, merchant_id, merchant_password, merchant_secret, base_url, callback_url, currency, timeout_ms, updated_at
    ) VALUES ('paystation', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gateway_id) DO UPDATE SET
      is_enabled = ?, is_sandbox = ?, merchant_id = ?, merchant_password = ?, merchant_secret = ?, base_url = ?, callback_url = ?, currency = ?, timeout_ms = ?, updated_at = ?`,
    [
      isEnabled, isSandbox, merchantId, merchantPassword, merchantSecret, baseUrl, callbackUrl, currency, timeoutMs, now,
      isEnabled, isSandbox, merchantId, merchantPassword, merchantSecret, baseUrl, callbackUrl, currency, timeoutMs, now
    ]
  );

  saveDbSync();
  return getPayStationSettings(db);
}

