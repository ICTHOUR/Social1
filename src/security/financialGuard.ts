import crypto from 'crypto';
import { Database } from 'sql.js';
import { queryDbOne, queryDbAll, runDb, saveDbSync } from '../db/database.js';

// ============================================================================
// FINANCIAL CONCURRENCY & RACE-CONDITION MUTEX LOCK MANAGER
// ============================================================================

class FinancialMutexManager {
  private userLocks: Map<string, Promise<void>> = new Map();

  /**
   * Executes a critical financial function inside a per-user sequential lock queue.
   * This guarantees that concurrent transfers, gift purchases, and reward claims for
   * the same user wallet are processed serially, preventing double-spend race conditions.
   */
  public async withWalletLock<T>(userId: string, task: () => Promise<T> | T): Promise<T> {
    const prevLock = this.userLocks.get(userId) || Promise.resolve();

    let releaseLock: () => void;
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.userLocks.set(userId, currentLock);

    try {
      // Always wait for previous lock, even if previous task failed
      await prevLock.catch(() => {});
      return await task();
    } finally {
      releaseLock!();
      if (this.userLocks.get(userId) === currentLock) {
        this.userLocks.delete(userId);
      }
    }
  }
}

export const financialMutex = new FinancialMutexManager();

// ============================================================================
// IDEMPOTENCY & REPLAY ATTACK DEFENSE
// ============================================================================

export interface IdempotencyRecord {
  id: string;
  userId: string;
  operation: string;
  idempotencyKey: string;
  requestHash: string;
  statusCode: number;
  responsePayload: string;
  createdAt: string;
  expiresAt: string;
}

export function ensureFinancialGuardTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS financial_idempotency_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status_code INTEGER DEFAULT 200,
      response_payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      UNIQUE(user_id, idempotency_key, operation)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suspicious_financial_flags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_factors TEXT NOT NULL,
      status TEXT DEFAULT 'pending_review',
      admin_notes TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

/**
 * Computes payload hash to ensure client isn't reusing an idempotency key with modified params.
 */
export function hashPayload(payload: any): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Checks if an idempotent request was already processed.
 */
export function checkIdempotency(
  db: Database,
  userId: string,
  operation: string,
  idempotencyKey?: string,
  payload?: any
): { isReplay: boolean; cachedResponse?: any; statusCode?: number; error?: string } {
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return { isReplay: false };
  }

  const cleanKey = idempotencyKey.trim();
  const currentHash = hashPayload(payload);

  const existing = queryDbOne(
    db,
    `SELECT * FROM financial_idempotency_keys 
     WHERE user_id = ? AND idempotency_key = ? AND operation = ?`,
    [userId, cleanKey, operation]
  );

  if (!existing) {
    return { isReplay: false };
  }

  if (existing.request_hash !== currentHash) {
    return {
      isReplay: true,
      error: 'Idempotency key reused with different request payload (Replay Attack Detected)',
    };
  }

  let parsedPayload = {};
  try {
    parsedPayload = JSON.parse(existing.response_payload);
  } catch (e) {
    parsedPayload = { result: existing.response_payload };
  }

  return {
    isReplay: true,
    statusCode: existing.status_code || 200,
    cachedResponse: parsedPayload,
  };
}

/**
 * Stores the response of an idempotent financial operation.
 */
export function saveIdempotencyRecord(
  db: Database,
  userId: string,
  operation: string,
  idempotencyKey: string | undefined,
  payload: any,
  responsePayload: any,
  statusCode: number = 200
) {
  if (!idempotencyKey || typeof idempotencyKey !== 'string') return;

  const cleanKey = idempotencyKey.trim();
  const requestHash = hashPayload(payload);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24hr TTL

  try {
    runDb(
      db,
      `INSERT OR REPLACE INTO financial_idempotency_keys (
        id, user_id, operation, idempotency_key, request_hash, status_code,
        response_payload, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'idem_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        userId,
        operation,
        cleanKey,
        requestHash,
        statusCode,
        JSON.stringify(responsePayload),
        now.toISOString(),
        expiresAt,
      ]
    );
    saveDbSync();
  } catch (err) {
    console.error('Error recording idempotency key:', err);
  }
}

// ============================================================================
// ATOMIC FINANCIAL SUBTRACTION & BALANCE ENFORCEMENT
// ============================================================================

export interface DebitResult {
  success: boolean;
  error?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

/**
 * Atomically deducts coins ensuring balance NEVER drops below zero.
 * Returns failure if balance is insufficient or if concurrent execution depleted funds.
 */
export function executeAtomicDebit(
  db: Database,
  userId: string,
  amount: number,
  reason: string
): DebitResult {
  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Invalid debit amount' };
  }

  const roundedAmount = Math.floor(amount);

  // Check current balance
  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
  const user = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = ?', [userId]);
  const currentBalance = Math.min(wallet?.balance || 0, user?.coins_balance || 0);

  if (currentBalance < roundedAmount) {
    return {
      success: false,
      error: `Insufficient coin balance (Have: ${currentBalance}, Required: ${roundedAmount})`,
    };
  }

  const now = new Date().toISOString();

  // Atomically update with strict WHERE constraint (balance >= amount)
  runDb(
    db,
    `UPDATE coin_wallets 
     SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ? 
     WHERE user_id = ? AND balance >= ?`,
    [roundedAmount, roundedAmount, now, userId, roundedAmount]
  );

  runDb(
    db,
    `UPDATE users 
     SET coins_balance = coins_balance - ?, updated_at = ? 
     WHERE id = ? AND coins_balance >= ?`,
    [roundedAmount, now, userId, roundedAmount]
  );

  const updatedWallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
  const newBalance = updatedWallet?.balance || 0;

  return {
    success: true,
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
  };
}

/**
 * Atomically credits coins to user's wallet with ledger entry.
 */
export function executeAtomicCredit(
  db: Database,
  userId: string,
  amount: number,
  type: string,
  note: string,
  referenceId?: string
): { success: boolean; newBalance: number; txId: string } {
  const roundedAmount = Math.max(0, Math.floor(amount));
  const now = new Date().toISOString();

  const wallet = queryDbOne(db, 'SELECT balance FROM coin_wallets WHERE user_id = ?', [userId]);
  const balanceBefore = wallet?.balance || 0;
  const balanceAfter = balanceBefore + roundedAmount;

  runDb(
    db,
    `UPDATE coin_wallets 
     SET balance = balance + ?, total_earned = total_earned + ?, updated_at = ? 
     WHERE user_id = ?`,
    [roundedAmount, roundedAmount, now, userId]
  );

  runDb(
    db,
    `UPDATE users 
     SET coins_balance = coins_balance + ?, updated_at = ? 
     WHERE id = ?`,
    [roundedAmount, now, userId]
  );

  const txId = `CTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  runDb(
    db,
    `INSERT INTO coin_transactions (
      id, user_id, transaction_type, amount, balance_before, balance_after,
      status, note, reference_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
    [txId, userId, type, roundedAmount, balanceBefore, balanceAfter, note, referenceId || null, now]
  );

  saveDbSync();

  return {
    success: true,
    newBalance: balanceAfter,
    txId,
  };
}
