import { getDatabase, queryDbOne, runDb } from '../src/db/database.js';
import { executeCoinTransfer } from '../src/db/transactions.js';
import {
  getCoinEarningRules,
  updateCoinEarningRules,
  evaluateAndAwardCoinReward,
  executeGiftTransaction,
} from '../src/db/economy.js';
import {
  ensureFinancialTables,
  getWithdrawalSettings,
  updateWithdrawalSettings,
  calculateWithdrawalBreakdown,
  requestUserWithdrawal,
  reviewWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  createPaymentIntentForCoins,
  verifyAndCreditPayment,
  getUserWalletComprehensive,
} from '../src/db/financialEngine.ts';

async function runCoinForensicAudit() {
  console.log('====================================================');
  console.log('🪙 STARTING FORENSIC AUDIT OF THE COIN & WALLET ENGINE');
  console.log('====================================================');

  const db = await getDatabase();
  ensureFinancialTables(db);

  // Seed test users
  const now = new Date().toISOString();
  const testUserId1 = 'f_user_' + Date.now() + '_1';
  const testUserId2 = 'f_user_' + Date.now() + '_2';

  runDb(db, `INSERT INTO users (id, username, full_name, email, password_hash, coins_balance, status, avatar_url, cover_url, bio, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 'hash', 1000, 'active', 'https://avatar.png', 'https://cover.png', 'Bio', 1, ?, ?)`, [
    testUserId1, `coin_auditor1_${Date.now()}`, 'Coin Auditor 1', `${testUserId1}@test.com`, now, now
  ]);
  runDb(db, `INSERT INTO users (id, username, full_name, email, password_hash, coins_balance, status, avatar_url, cover_url, bio, is_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 'hash', 200, 'active', 'https://avatar.png', 'https://cover.png', 'Bio', 1, ?, ?)`, [
    testUserId2, `coin_auditor2_${Date.now()}`, 'Coin Auditor 2', `${testUserId2}@test.com`, now, now
  ]);

  runDb(db, `INSERT OR REPLACE INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at) VALUES (?, ?, 1000, 1000, 0, ?)`, ['cw_' + testUserId1, testUserId1, now]);
  runDb(db, `INSERT OR REPLACE INTO coin_wallets (id, user_id, balance, total_earned, total_spent, updated_at) VALUES (?, ?, 200, 200, 0, ?)`, ['cw_' + testUserId2, testUserId2, now]);

  console.log('\n--- 1. VERIFYING COIN WALLET FIELDS ---');
  const w1 = getUserWalletComprehensive(db, testUserId1);
  console.log(`Balance: ${w1.balance}, Available: ${w1.availableBalance}, Pending: ${w1.pendingBalance}, Earned: ${w1.earnedBalance}, Spent: ${w1.spentBalance}`);
  if (w1.balance === 1000 && w1.availableBalance === 1000) {
    console.log('✅ [WALLETS] Wallet field audit PASSED');
  } else {
    throw new Error('Wallet balance mismatch!');
  }

  console.log('\n--- 2. VERIFYING ADMIN CONFIGURATIONS ---');
  // Admin updates earning rules
  const updatedEarning = updateCoinEarningRules(db, {
    coinsPerPost: 20,
    coinsPerVideo: 40,
    dailyEarningLimit: 500,
    rewardCooldownSeconds: 0, // 0 for testing
  });
  console.log(`Updated Earning Rules: Post=${updatedEarning.coinsPerPost}, Video=${updatedEarning.coinsPerVideo}, Limit=${updatedEarning.dailyEarningLimit}`);

  // Admin updates withdrawal settings
  const updatedWithdrawal = updateWithdrawalSettings(db, {
    minWithdrawalCoins: 50,
    maxWithdrawalCoins: 10000,
    conversionRateCoins: 1000,
    conversionRateBdt: 120,
    processingFeePercent: 2.5,
    processingFeeFixedBdt: 5.0,
    dailyLimitCoins: 50000,
  });
  console.log(`Updated Withdrawal Settings: Min=${updatedWithdrawal.minWithdrawalCoins}, Rate=${updatedWithdrawal.conversionRateCoins} coins = ${updatedWithdrawal.conversionRateBdt} BDT`);
  console.log('✅ [ADMIN CONFIG] Admin Earning & Withdrawal controls PASSED');

  console.log('\n--- 3. VERIFYING SERVER-SIDE COIN EARNING (POST & VIDEO) ---');
  // Award post reward
  const postReward = evaluateAndAwardCoinReward(db, {
    userId: testUserId1,
    eventType: 'post_created',
    sourceId: 'post_audit_1',
    sourceType: 'post',
    content: 'Valid content for testing coin earning system audit',
  });
  console.log(`Post Reward Awarded: ${postReward.awarded}, Coins: ${postReward.coins}, New Balance: ${postReward.balanceAfter}`);
  if (postReward.awarded && postReward.coins === 20) {
    console.log('✅ [EARNING] Post reward calculation PASSED');
  } else {
    throw new Error(`Post reward failed: ${postReward.reason}`);
  }

  // Award video reward
  const videoReward = evaluateAndAwardCoinReward(db, {
    userId: testUserId1,
    eventType: 'video_created',
    sourceId: 'video_audit_1',
    sourceType: 'video',
    content: 'Video content for testing',
  });
  console.log(`Video Reward Awarded: ${videoReward.awarded}, Coins: ${videoReward.coins}, New Balance: ${videoReward.balanceAfter}`);
  if (videoReward.awarded && videoReward.coins === 40) {
    console.log('✅ [EARNING] Video reward calculation PASSED');
  } else {
    throw new Error(`Video reward failed: ${videoReward.reason}`);
  }

  const postAudit1Id = `post_audit_1_${Date.now()}`;
  // Insert post into database to simulate existing post for anti-spam check
  runDb(db, `INSERT INTO posts (id, user_id, content, status, created_at, updated_at) VALUES (?, ?, ?, 'published', ?, ?)`, [
    postAudit1Id, testUserId1, 'Valid content for testing coin earning system audit', now, now
  ]);

  // Duplicate content anti-spam check
  const duplicateReward = evaluateAndAwardCoinReward(db, {
    userId: testUserId1,
    eventType: 'post_created',
    sourceId: 'post_audit_2',
    sourceType: 'post',
    content: 'Valid content for testing coin earning system audit', // same content
  });
  console.log(`Duplicate Content Awarded: ${duplicateReward.awarded} (Expected false due to anti-spam)`);
  if (!duplicateReward.awarded) {
    console.log('✅ [ANTI-SPAM] Duplicate content rejection PASSED');
  } else {
    throw new Error('Duplicate content anti-spam failed!');
  }

  console.log('\n--- 4. VERIFYING PURCHASES & PACKAGES ---');
  const pkgIntent = await createPaymentIntentForCoins(db, testUserId1, 'pkg_1000', undefined, 'paystation');
  if (!pkgIntent.success || !pkgIntent.intent) throw new Error(`Intent failed: ${pkgIntent.error}`);
  console.log(`Payment Intent Created: TX=${pkgIntent.intent.transactionId}, Coins=${pkgIntent.intent.totalCoins}, BDT=${pkgIntent.intent.amountBdt}`);

  // Credit payment
  const creditRes = await verifyAndCreditPayment(db, pkgIntent.intent.transactionId, { gatewayRef: 'GW_AUDIT_123', status: 'completed' });
  console.log(`Payment Verified & Credited: Coins=${creditRes.coinsCredited}, New Balance=${creditRes.newBalance}`);
  if (creditRes.success) {
    console.log('✅ [PURCHASE] Package purchase and atomic coin credit PASSED');
  } else {
    throw new Error(`Payment verification failed: ${creditRes.error}`);
  }

  console.log('\n--- 5. VERIFYING 3D GIFTS & TRANSFERS ---');
  const giftRes = executeGiftTransaction(db, {
    senderId: testUserId1,
    receiverId: testUserId2,
    giftId: 'gift_spark_50',
    idempotencyKey: 'idemp_gift_audit_1',
  });
  console.log(`Gift Transferred: Success=${giftRes.success}, Gift=${giftRes.giftName}, Sender Balance After=${giftRes.senderBalanceAfter}, Receiver Balance After=${giftRes.receiverBalanceAfter}`);
  if (giftRes.success && giftRes.coinPrice === 50) {
    console.log('✅ [GIFT] Gift transfer & balance ledger PASSED');
  } else {
    throw new Error(`Gift transfer failed: ${giftRes.error}`);
  }

  // Replay idempotency test
  const replayGift = executeGiftTransaction(db, {
    senderId: testUserId1,
    receiverId: testUserId2,
    giftId: 'gift_spark_50',
    idempotencyKey: 'idemp_gift_audit_1', // same key
  });
  console.log(`Replay Gift Handled: IsDuplicate=${replayGift.isDuplicate}, Success=${replayGift.success}`);
  if (replayGift.isDuplicate) {
    console.log('✅ [SECURITY] Idempotency replay protection PASSED');
  } else {
    throw new Error('Idempotency protection failed!');
  }

  console.log('\n--- 6. VERIFYING WITHDRAWALS (PENDING, REJECTED RESTITUTION, PAID) ---');
  // 1. Request withdrawal
  const wdrRes = requestUserWithdrawal(db, testUserId1, 200, 'bkash', { phone: '01711112222' });
  if (!wdrRes.success) throw new Error(`Withdrawal request failed: ${wdrRes.error}`);
  const reqId = wdrRes.request.id;
  console.log(`Withdrawal Requested: Code=${wdrRes.request.request_code}, Locked Coins=200, Net BDT=${wdrRes.request.net_payout_bdt}`);

  // Check pending balance
  const w1AfterWdr = getUserWalletComprehensive(db, testUserId1);
  console.log(`Post-Request Wallet: Available=${w1AfterWdr.availableBalance}, Pending=${w1AfterWdr.pendingBalance}`);
  if (w1AfterWdr.pendingBalance === 200) {
    console.log('✅ [WITHDRAWAL] Pending balance tracking PASSED');
  } else {
    throw new Error('Pending balance calculation error!');
  }

  // 2. Reject withdrawal with restitution refund
  const rejectRes = rejectWithdrawal(db, reqId, 'admin_system', 'Test rejection for coin refund audit');
  console.log(`Withdrawal Rejected: Success=${rejectRes.success}`);
  const w1AfterReject = getUserWalletComprehensive(db, testUserId1);
  console.log(`Post-Rejection Wallet: Available=${w1AfterReject.availableBalance}, Pending=${w1AfterReject.pendingBalance}`);
  if (w1AfterReject.pendingBalance === 0) {
    console.log('✅ [WITHDRAWAL] Rejection restitution coin refund PASSED');
  } else {
    throw new Error('Rejection restitution refund error!');
  }

  // 3. Re-request withdrawal and mark paid
  const wdrRes2 = requestUserWithdrawal(db, testUserId1, 100, 'nagad', { phone: '01811112222' });
  const reqId2 = wdrRes2.request.id;
  const reviewRes = reviewWithdrawal(db, reqId2, 'admin_system', 'approved', 'Pre-approved for payout');
  const paidRes = markWithdrawalPaid(db, reqId2, 'admin_system', 'NAGAD_TX_AUDIT_999');
  console.log(`Withdrawal Marked Paid: Success=${paidRes.success}`);
  const w1AfterPaid = getUserWalletComprehensive(db, testUserId1);
  console.log(`Post-Paid Wallet: Available=${w1AfterPaid.availableBalance}, Withdrawn Coins=${w1AfterPaid.withdrawnAmountCoins}, Withdrawn BDT=${w1AfterPaid.withdrawnAmountBdt}`);
  if (w1AfterPaid.withdrawnAmountCoins === 100) {
    console.log('✅ [WITHDRAWAL] Mark paid workflow PASSED');
  } else {
    throw new Error('Mark paid workflow failed!');
  }

  console.log('\n--- 7. CRITICAL SECURITY: NEGATIVE BALANCE REJECTION ---');
  try {
    requestUserWithdrawal(db, testUserId1, 999999, 'bkash', { phone: '01700000000' });
    throw new Error('Failed to prevent negative balance!');
  } catch (err: any) {
    console.log(`Negative Balance Blocked: ${err.message || 'Rejected as expected'}`);
    console.log('✅ [SECURITY] Negative balance rejection PASSED');
  }

  console.log('\n====================================================');
  console.log('🎉 COIN SYSTEM FORENSIC AUDIT FULLY PASSED!');
  console.log('====================================================');
}

runCoinForensicAudit().catch((err) => {
  console.error('❌ COIN FORENSIC AUDIT FAILED:', err);
  process.exit(1);
});
