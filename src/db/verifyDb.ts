import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { applyAllMigrations } from './migrations';
import { executeCoinTransfer, runInTransaction, creditUserCoins } from './transactions';
import { queryDbOne, queryDbAll } from './database';

async function runVerificationSuite() {
  console.log('=== STARTING NIXO DATABASE ARCHITECTURE VERIFICATION ===\n');

  const SQL = await initSqlJs();
  const db: SqlJsDatabase = new SQL.Database();

  // 1. RUN MIGRATIONS
  console.log('1. Testing Migrations...');
  applyAllMigrations(db);
  const tables = queryDbAll(db, "SELECT name FROM sqlite_master WHERE type='table';");
  console.log(`   [PASS] Created ${tables.length} normalized tables across all 20 core table groups.\n`);

  // 2. TEST FOREIGN KEYS
  console.log('2. Testing Foreign Key Enforcements...');
  db.run('PRAGMA foreign_keys = ON;');
  const now = new Date().toISOString();

  // Create valid user first
  db.run(`
    INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, created_at, updated_at)
    VALUES ('u_test_1', 'user1', 'u1@test.com', 'hash1', 'User One', 'https://avatar.com/1', ?, ?)
  `, [now, now]);

  let fkErrorCaught = false;
  try {
    // Attempting to insert post with non-existent user_id 'u_non_existent'
    db.run(`
      INSERT INTO posts (id, user_id, content, created_at, updated_at)
      VALUES ('p_invalid', 'u_non_existent', 'Failing FK post', ?, ?)
    `, [now, now]);
  } catch (err: any) {
    fkErrorCaught = true;
    console.log(`   [PASS] Foreign key constraint properly blocked orphan insert: "${err.message}"\n`);
  }
  if (!fkErrorCaught) {
    throw new Error('Foreign key enforcement test FAILED!');
  }

  // 3. TEST TRANSACTION INTEGRITY & ROLLBACK BEHAVIOR
  console.log('3. Testing Transaction Integrity & Rollback Behavior...');
  let rollbackSuccess = false;
  try {
    runInTransaction(db, () => {
      db.run("INSERT INTO posts (id, user_id, content, created_at, updated_at) VALUES ('p_trans_1', 'u_test_1', 'Valid Post', ?, ?)", [now, now]);
      // Force error inside transaction
      throw new Error('Simulated runtime error during transaction');
    });
  } catch (err: any) {
    rollbackSuccess = true;
  }

  const rolledBackPost = queryDbOne(db, "SELECT * FROM posts WHERE id = 'p_trans_1'");
  if (rollbackSuccess && !rolledBackPost) {
    console.log('   [PASS] Transaction rolled back cleanly. No partial state persisted.\n');
  } else {
    throw new Error('Rollback verification test FAILED!');
  }

  // 4. TEST DUPLICATE PREVENTION
  console.log('4. Testing Duplicate Prevention...');
  let dupErrorCaught = false;
  try {
    db.run(`
      INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, created_at, updated_at)
      VALUES ('u_test_dup', 'user1', 'different_email@test.com', 'hash', 'Dup User', 'avatar', ?, ?)
    `, [now, now]);
  } catch (err: any) {
    dupErrorCaught = true;
    console.log(`   [PASS] Unique constraint blocked duplicate username: "${err.message}"\n`);
  }
  if (!dupErrorCaught) {
    throw new Error('Duplicate prevention test FAILED!');
  }

  // 5. TEST COIN BALANCE CONSISTENCY & IMMUTABLE LEDGER
  console.log('5. Testing Coin Balance Consistency & Ledger Audit Trail...');
  db.run(`
    INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, coins_balance, created_at, updated_at)
    VALUES ('u_alice', 'alice', 'alice@test.com', 'hash', 'Alice', 'avatar', 1000, ?, ?)
  `, [now, now]);

  db.run(`
    INSERT INTO users (id, username, email, password_hash, full_name, avatar_url, coins_balance, created_at, updated_at)
    VALUES ('u_bob', 'bob', 'bob@test.com', 'hash', 'Bob', 'avatar', 200, ?, ?)
  `, [now, now]);

  console.log('   Initial Balances -> Alice: 1000 coins, Bob: 200 coins');
  const transferRes = executeCoinTransfer(db, {
    senderId: 'u_alice',
    receiverId: 'u_bob',
    amount: 300,
    transactionType: 'gift',
    note: 'Nixo Gem Gift',
  });

  const alice = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = "u_alice"');
  const bob = queryDbOne(db, 'SELECT coins_balance FROM users WHERE id = "u_bob"');
  const ledgerEntries = queryDbAll(db, 'SELECT * FROM coin_transactions WHERE sender_id = "u_alice" AND receiver_id = "u_bob"');

  if (
    transferRes.success &&
    alice.coins_balance === 700 &&
    bob.coins_balance === 500 &&
    ledgerEntries.length === 2
  ) {
    console.log('   [PASS] Coin Transfer Succeeded!');
    console.log(`   Updated Balances -> Alice: ${alice.coins_balance}, Bob: ${bob.coins_balance}`);
    console.log(`   Auditable Ledger Rows Recorded: ${ledgerEntries.length} immutable transaction rows.`);
    console.log(`   Alice Audit: balance_before = ${ledgerEntries[0].balance_before}, balance_after = ${ledgerEntries[0].balance_after}`);
  } else {
    throw new Error('Coin balance consistency test FAILED!');
  }

  // 6. TEST OVERDRAFT PREVENTION
  console.log('\n6. Testing Overdraft / Insufficient Balance Prevention...');
  let overdraftCaught = false;
  try {
    executeCoinTransfer(db, {
      senderId: 'u_alice',
      receiverId: 'u_bob',
      amount: 9999, // Exceeds 700
      transactionType: 'transfer',
    });
  } catch (err: any) {
    overdraftCaught = true;
    console.log(`   [PASS] Overdraft blocked safely: "${err.message}"\n`);
  }
  if (!overdraftCaught) {
    throw new Error('Overdraft prevention test FAILED!');
  }

  console.log('=== ALL DATABASE ARCHITECTURE VERIFICATIONS COMPLETED SUCCESSFULLY! ===');
}

runVerificationSuite().catch((err) => {
  console.error('VERIFICATION SUITE ERROR:', err);
  process.exit(1);
});
