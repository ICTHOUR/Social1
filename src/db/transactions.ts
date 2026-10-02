import { Database as SqlJsDatabase } from 'sql.js';
import { queryDbOne, runDb, saveDbSync, beginTransaction, commitTransaction, rollbackTransaction } from './database.js';

export interface CoinTransactionResult {
  success: boolean;
  transactionId?: string;
  senderBalanceAfter?: number;
  receiverBalanceAfter?: number;
  error?: string;
}

/**
  * Executes a transaction safely using SQL.js BEGIN/COMMIT/ROLLBACK semantics.
  */
export function runInTransaction<T>(
  db: SqlJsDatabase,
  action: () => T
): T {
  try {
    beginTransaction(db);
    const result = action();
    commitTransaction(db);
    return result;
  } catch (err) {
    rollbackTransaction(db);
    throw err;
  }
}

/**
  * Immutable, transaction-safe coin transfer and ledger recording.
  * Every single coin modification MUST pass through this helper.
  */
export function executeCoinTransfer(
  db: SqlJsDatabase,
  params: {
    senderId: string;
    receiverId: string;
    amount: number;
    transactionType: 'gift' | 'transfer' | 'reward' | 'purchase' | 'withdrawal';
    referenceId?: string;
    note?: string;
    metadata?: Record<string, any>;
  }
): CoinTransactionResult {
  const { senderId, receiverId, amount, transactionType, referenceId, note, metadata } = params;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be greater than zero' };
  }

  return runInTransaction(db, () => {
    // 1. Fetch Sender Wallet or User Record
    const sender = queryDbOne(db, 'SELECT id, coins_balance FROM users WHERE id = ?', [senderId]);
    if (!sender) {
      throw new Error(`Sender user ${senderId} not found`);
    }

    const senderBalanceBefore = sender.coins_balance || 0;
    if (senderBalanceBefore < amount) {
      throw new Error(`Insufficient coin balance. Current: ${senderBalanceBefore}, Required: ${amount}`);
    }

    // 2. Fetch Receiver Wallet or User Record
    const receiver = queryDbOne(db, 'SELECT id, coins_balance FROM users WHERE id = ?', [receiverId]);
    if (!receiver) {
      throw new Error(`Receiver user ${receiverId} not found`);
    }
    const receiverBalanceBefore = receiver.coins_balance || 0;

    // 3. Compute New Balances
    const senderBalanceAfter = senderBalanceBefore - amount;
    const receiverBalanceAfter = receiverBalanceBefore + amount;

    // 4. Update Users Table
    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [senderBalanceAfter, senderId]);
    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [receiverBalanceAfter, receiverId]);

    // 5. Sync / Update coin_wallets Table for both
    db.run(
      `INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_spent = total_spent + ?, updated_at = ?`,
      [
        'cw_' + senderId, senderId, senderBalanceAfter, amount, new Date().toISOString(),
        senderBalanceAfter, amount, new Date().toISOString()
      ]
    );

    db.run(
      `INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_earned = total_earned + ?, updated_at = ?`,
      [
        'cw_' + receiverId, receiverId, receiverBalanceAfter, amount, new Date().toISOString(),
        receiverBalanceAfter, amount, new Date().toISOString()
      ]
    );

    // 6. Record Immutable Audit Ledger Entries
    const txIdSender = 'ctx_' + Date.now() + '_s_' + Math.floor(Math.random() * 10000);
    const txIdReceiver = 'ctx_' + Date.now() + '_r_' + Math.floor(Math.random() * 10000);
    const now = new Date().toISOString();
    const metaStr = JSON.stringify(metadata || {});

    // Sender ledger entry (debit)
    db.run(
      `INSERT INTO coin_transactions 
       (id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        txIdSender, senderId, senderId, receiverId, transactionType, -amount,
        senderBalanceBefore, senderBalanceAfter, referenceId || null, note || `Transferred ${amount} coins to ${receiverId}`, metaStr, now
      ]
    );

    // Receiver ledger entry (credit)
    db.run(
      `INSERT INTO coin_transactions 
       (id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [
        txIdReceiver, receiverId, senderId, receiverId, transactionType, amount,
        receiverBalanceBefore, receiverBalanceAfter, referenceId || null, note || `Received ${amount} coins from ${senderId}`, metaStr, now
      ]
    );

    return {
      success: true,
      transactionId: txIdSender,
      senderBalanceAfter,
      receiverBalanceAfter,
    };
  });
}

/**
  * Credit coins into user balance (e.g. Package Purchase or Reward)
  */
export function creditUserCoins(
  db: SqlJsDatabase,
  userId: string,
  amount: number,
  type: string,
  referenceId?: string,
  note?: string
): CoinTransactionResult {
  if (amount <= 0) return { success: false, error: 'Credit amount must be positive' };

  return runInTransaction(db, () => {
    const user = queryDbOne(db, 'SELECT id, coins_balance FROM users WHERE id = ?', [userId]);
    if (!user) throw new Error(`User ${userId} not found`);

    const balanceBefore = user.coins_balance || 0;
    const balanceAfter = balanceBefore + amount;

    db.run('UPDATE users SET coins_balance = ? WHERE id = ?', [balanceAfter, userId]);

    db.run(
      `INSERT INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET balance = ?, total_earned = total_earned + ?, updated_at = ?`,
      [
        'cw_' + userId, userId, balanceAfter, amount, new Date().toISOString(),
        balanceAfter, amount, new Date().toISOString()
      ]
    );

    const txId = 'ctx_' + Date.now() + '_c_' + Math.floor(Math.random() * 10000);
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO coin_transactions 
       (id, user_id, sender_id, receiver_id, transaction_type, amount, balance_before, balance_after, reference_id, status, note, metadata, created_at)
       VALUES (?, ?, 'SYSTEM', ?, ?, ?, ?, ?, ?, 'completed', ?, '{}', ?)`,
      [txId, userId, userId, type, amount, balanceBefore, balanceAfter, referenceId || null, note || `Credited ${amount} coins`, now]
    );

    return {
      success: true,
      transactionId: txId,
      senderBalanceAfter: balanceAfter,
    };
  });
}
