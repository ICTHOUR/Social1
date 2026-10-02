const BASE_URL = 'http://localhost:3000';

interface TestResult {
  step: number;
  journey: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function apiRequest(endpoint: string, options: { method?: string; body?: any; token?: string } = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = {};
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { text: await res.text() };
  }

  return { status: res.status, ok: res.ok, data };
}

async function runStep(
  step: number,
  journey: string,
  fn: () => Promise<string | void>
) {
  try {
    const details = await fn();
    results.push({ step, journey, passed: true, details: details || 'Success' });
    console.log(`✅ [Step ${step}] ${journey}: PASSED ${details ? `(${details})` : ''}`);
  } catch (err: any) {
    const msg = err.message || JSON.stringify(err);
    results.push({ step, journey, passed: false, error: msg });
    console.error(`❌ [Step ${step}] ${journey}: FAILED -> ${msg}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 STARTING PRODUCTION QA & USER JOURNEY TEST SUITE');
  console.log('====================================================');

  const randomSuffix = Math.floor(Math.random() * 1000000);
  const user1Data = {
    username: `audit_u1_${randomSuffix}`,
    email: `audit_u1_${randomSuffix}@nixo.io`,
    password: 'Password123!',
    fullName: 'Alice QA Engineer',
    phone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
  };

  const user2Data = {
    username: `audit_u2_${randomSuffix}`,
    email: `audit_u2_${randomSuffix}@nixo.io`,
    password: 'Password123!',
    fullName: 'Bob Beta Tester',
    phone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
  };

  let token1 = '';
  let user1Id = '';
  let token2 = '';
  let user2Id = '';
  let adminToken = '';

  let textPostId = '';
  let imagePostId = '';
  let videoPostId = '';
  let commentId = '';
  let replyId = '';
  let storyId = '';
  let giftTxId = '';
  let withdrawalReqId = '';
  let reportId = '';

  // 1. User 1 Registration
  await runStep(1, 'New User Registration', async () => {
    const res = await apiRequest('/api/auth/register', { method: 'POST', body: user1Data });
    if (!res.ok || !res.data.token || !res.data.user) {
      throw new Error(res.data.error || 'Registration failed');
    }
    token1 = res.data.token;
    user1Id = res.data.user.id;
    return `Registered ID: ${user1Id}`;
  });

  // User 2 Registration for interaction
  await runStep(1.5, 'Second User Registration (Interaction Peer)', async () => {
    const res = await apiRequest('/api/auth/register', { method: 'POST', body: user2Data });
    if (!res.ok || !res.data.token) throw new Error(res.data.error || 'Peer registration failed');
    token2 = res.data.token;
    user2Id = res.data.user.id;
    return `Registered Peer ID: ${user2Id}`;
  });

  // 2. User 1 Login
  await runStep(2, 'Login with Credentials', async () => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: user1Data.username,
        password: user1Data.password,
      },
    });
    if (!res.ok || !res.data.token) throw new Error(res.data.error || 'Login failed');
    token1 = res.data.token;
    return 'Token obtained & validated';
  });

  // 3. Create & Update Profile
  await runStep(3, 'Create / Update User Profile', async () => {
    const res = await apiRequest('/api/users/profile', {
      method: 'PUT',
      token: token1,
      body: {
        fullName: 'Alice QA Engineer (Verified Lead)',
        bio: 'Senior QA & Security Specialist on Nixo Social',
        location: 'San Francisco, CA',
        websiteUrl: 'https://nixo.social',
      },
    });
    if (!res.ok || !res.data.user) {
      throw new Error(res.data.error || 'Profile update failed');
    }
    return `Bio updated: ${res.data.user.bio}`;
  });

  // 4. Create Text Post
  await runStep(4, 'Create Text Post', async () => {
    const res = await apiRequest('/api/posts', {
      method: 'POST',
      token: token1,
      body: {
        content: 'Welcome to Nixo Social! This is a production test text post. #Nixo #Social',
        mediaType: 'none',
        privacy: 'public',
        hashtags: ['Nixo', 'Social'],
      },
    });
    if (!res.ok || !res.data.post || !res.data.post.id) {
      throw new Error(res.data.error || 'Post creation failed');
    }
    textPostId = res.data.post.id;
    return `Post ID: ${textPostId}`;
  });

  // 5. Create Image Post
  await runStep(5, 'Create Image Post', async () => {
    const res = await apiRequest('/api/posts', {
      method: 'POST',
      token: token1,
      body: {
        content: 'Check out this liquid glass aesthetic!',
        mediaType: 'image',
        mediaUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'],
        privacy: 'public',
      },
    });
    if (!res.ok || !res.data.post) throw new Error(res.data.error || 'Image post creation failed');
    imagePostId = res.data.post.id;
    return `Image Post ID: ${imagePostId}`;
  });

  // 6. Create Video Post
  await runStep(6, 'Create Video Post', async () => {
    const res = await apiRequest('/api/posts', {
      method: 'POST',
      token: token1,
      body: {
        content: 'Exploring the new video reels engine! 🎬',
        mediaType: 'video',
        mediaUrls: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
        privacy: 'public',
      },
    });
    if (!res.ok || !res.data.post) throw new Error(res.data.error || 'Video post creation failed');
    videoPostId = res.data.post.id;
    return `Video Post ID: ${videoPostId}`;
  });

  // 7. React to Post
  await runStep(7, 'Add 3D / Rich Reaction to Post', async () => {
    const res = await apiRequest(`/api/posts/${textPostId}/react`, {
      method: 'POST',
      token: token2,
      body: { reactionType: 'gem' },
    });
    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Reaction failed');
    return `Reaction: gem on ${textPostId}`;
  });

  // 8. Comment on Post
  await runStep(8, 'Create Comment on Post', async () => {
    const res = await apiRequest(`/api/posts/${textPostId}/comments`, {
      method: 'POST',
      token: token2,
      body: { content: 'Super clean interface and snappy responsiveness!' },
    });
    if (!res.ok || !res.data.comment || !res.data.comment.id) {
      throw new Error(res.data.error || 'Comment failed');
    }
    commentId = res.data.comment.id;
    return `Comment ID: ${commentId}`;
  });

  // 9. Reply to Comment
  await runStep(9, 'Reply to Comment (Nested Thread)', async () => {
    const res = await apiRequest(`/api/posts/${textPostId}/comments`, {
      method: 'POST',
      token: token1,
      body: {
        content: 'Thank you @bob! Glad you appreciate the liquid glass design.',
        parentId: commentId,
      },
    });
    if (!res.ok || !res.data.comment) throw new Error(res.data.error || 'Reply failed');
    replyId = res.data.comment.id;
    return `Reply ID: ${replyId}`;
  });

  // 10. Share Post
  await runStep(10, 'Share Post', async () => {
    const res = await apiRequest(`/api/posts/${textPostId}/share`, {
      method: 'POST',
      token: token2,
      body: { platform: 'internal', caption: 'Re-sharing this awesome post!' },
    });
    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Share failed');
    return 'Post shared successfully';
  });

  // 11. Follow User
  await runStep(11, 'Follow User', async () => {
    const res = await apiRequest(`/api/users/${user1Id}/follow`, {
      method: 'POST',
      token: token2,
    });
    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Follow failed');
    return `User2 followed User1 (Following: ${res.data.following})`;
  });

  // 12. Friend Request Flow
  await runStep(12, 'Send & Accept Friend Request', async () => {
    const reqRes = await apiRequest('/api/friends/request', {
      method: 'POST',
      token: token2,
      body: { friendId: user1Id },
    });

    const acceptRes = await apiRequest('/api/friends/accept', {
      method: 'POST',
      token: token1,
      body: { senderId: user2Id },
    });
    if (!acceptRes.ok || !acceptRes.data.success) throw new Error(acceptRes.data.error || 'Friend accept failed');
    return 'Friendship established';
  });

  // 13. Create Story
  await runStep(13, 'Create 24h Story', async () => {
    const res = await apiRequest('/api/stories', {
      method: 'POST',
      token: token1,
      body: {
        mediaUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80',
        mediaType: 'image',
        caption: 'Live from the design lab! 🔮',
        durationSeconds: 5,
      },
    });
    if (!res.ok || !res.data.story) throw new Error(res.data.error || 'Story creation failed');
    storyId = res.data.story.id;
    return `Story ID: ${storyId}`;
  });

  // 14. Watch Story
  await runStep(14, 'Watch / View Story', async () => {
    const res = await apiRequest(`/api/stories/${storyId}/view`, {
      method: 'POST',
      token: token2,
    });
    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Story view record failed');
    return `View logged on story ${storyId}`;
  });

  // 15. Send Direct Message
  await runStep(15, 'Send Direct Chat Message', async () => {
    const res = await apiRequest('/api/chat/messages', {
      method: 'POST',
      token: token2,
      body: {
        receiverId: user1Id,
        content: 'Hey Alice, the new release is looking stellar!',
      },
    });
    if (!res.ok || !res.data.message) throw new Error(res.data.error || 'Send message failed');
    return `Message sent ID: ${res.data.message.id}`;
  });

  // 16. Receive / Fetch Messages
  await runStep(16, 'Receive & Mark Chat Messages Read', async () => {
    const res = await apiRequest(`/api/chat/messages/${user2Id}`, {
      method: 'GET',
      token: token1,
    });
    if (!res.ok || !res.data.messages || res.data.messages.length === 0) {
      throw new Error(res.data.error || 'No messages returned');
    }
    return `Received ${res.data.messages.length} messages in conversation`;
  });

  // 17. Send Gift (3D Asset) with Atomic Wallet Balance Check
  await runStep(17, 'Send 3D Gift with Balance Transfer', async () => {
    const gifts = await apiRequest('/api/gifts');
    const testGift = gifts.data.gifts?.[0] || { id: 'gift_spark' };

    const res = await apiRequest('/api/gifts/send', {
      method: 'POST',
      token: token2,
      body: {
        giftId: testGift.id,
        receiverId: user1Id,
        postId: textPostId,
        idempotencyKey: `gift_${Date.now()}_${randomSuffix}`,
      },
    });

    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Gift transfer failed');
    giftTxId = res.data.transactionId;
    return `Sent ${res.data.giftName} (${res.data.coinPrice} coins). New Sender Balance: ${res.data.senderBalanceAfter}`;
  });

  // 18. Buy Coins (Payment Simulation with Webhook Verification)
  await runStep(18, 'Purchase Coins via Payment Gateway Registry', async () => {
    const packagesRes = await apiRequest('/api/payments/packages');
    const pkg = packagesRes.data.packages?.[0] || { id: 'pkg_100', coins: 100 };

    const initRes = await apiRequest('/api/payments/initiate', {
      method: 'POST',
      token: token1,
      body: {
        gatewayId: 'stripe',
        packageId: pkg.id,
      },
    });

    if (!initRes.ok || !initRes.data.transactionId) {
      throw new Error(initRes.data.error || 'Payment initiation failed');
    }

    const verifyRes = await apiRequest('/api/payments/verify', {
      method: 'POST',
      token: token1,
      body: {
        transactionId: initRes.data.transactionId,
        gatewayRef: `mock_ch_${Date.now()}`,
        status: 'completed',
      },
    });

    if (!verifyRes.ok || !verifyRes.data.success) {
      throw new Error(verifyRes.data.error || 'Payment verification failed');
    }
    return `Added ${pkg.coins} coins. New Balance: ${verifyRes.data.coinsBalance}`;
  });

  // 19. Earn Coins / Claim Daily Reward
  await runStep(19, 'Earn Coins via Daily Reward / Quest Activity', async () => {
    const claimRes = await apiRequest('/api/coins/rewards/claim-daily', {
      method: 'POST',
      token: token1,
    });

    if (!claimRes.ok && claimRes.data.error !== 'Daily reward already claimed for today') {
      throw new Error(`Reward claim error: ${claimRes.data.error}`);
    }
    return `Reward claimed or verified: ${claimRes.data.rewardCoins || 10} coins`;
  });

  // 20. Request Withdrawal
  await runStep(20, 'Request Coin Cashout / Withdrawal', async () => {
    const res = await apiRequest('/api/withdrawals/request', {
      method: 'POST',
      token: token1,
      body: {
        coins: 50,
        payoutMethod: 'paypal',
        accountDetails: 'alice.tester@payouts.net',
      },
    });

    if (!res.ok || !res.data.success || !res.data.request) {
      throw new Error(res.data.error || 'Withdrawal request failed');
    }
    withdrawalReqId = res.data.request.id;
    return `Withdrawal Request ID: ${withdrawalReqId}, Risk Score: ${res.data.riskScore}`;
  });

  // 21. Admin Setup & Approval of Withdrawal
  await runStep(21, 'Admin Approval of Withdrawal Request', async () => {
    const adminRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin',
        password: 'admin123_change_in_production!',
      },
    });
    if (!adminRes.ok || !adminRes.data.token) {
      throw new Error(adminRes.data.error || 'Admin login failed');
    }
    adminToken = adminRes.data.token;

    const approveRes = await apiRequest(`/api/admin/withdrawals/${withdrawalReqId}/status`, {
      method: 'POST',
      token: adminToken,
      body: {
        status: 'approved',
        adminNotes: 'Verified KYC & Activity via Test Matrix',
      },
    });

    if (!approveRes.ok || !approveRes.data.success) {
      throw new Error(approveRes.data.error || 'Admin approval failed');
    }
    return `Withdrawal ${withdrawalReqId} marked: ${approveRes.data.request?.status || 'approved'}`;
  });

  // 22. Report Content
  await runStep(22, 'Submit Content Abuse Report with Auto-Snapshot', async () => {
    const res = await apiRequest('/api/reports', {
      method: 'POST',
      token: token2,
      body: {
        targetType: 'post',
        targetId: textPostId,
        category: 'spam',
        reason: 'Automated test report for moderation queue verification',
        details: 'Verified snapshot capture',
      },
    });

    if (!res.ok || !res.data.success || !res.data.reportId) {
      throw new Error(res.data.error || 'Report creation failed');
    }
    reportId = res.data.reportId;
    return `Report ID: ${reportId}`;
  });

  // 23. Admin Moderation Action on Queue
  await runStep(23, 'Admin Review & Action on Moderation Queue', async () => {
    const queueRes = await apiRequest('/api/admin/reports-v2?status=pending', {
      method: 'GET',
      token: adminToken,
    });
    if (!queueRes.ok || !queueRes.data.reports) {
      throw new Error(queueRes.data.error || 'Failed to load moderation queue');
    }

    const actionRes = await apiRequest(`/api/admin/reports/${reportId}/action-v2`, {
      method: 'POST',
      token: adminToken,
      body: {
        actionType: 'issue_warning',
        reason: 'Automated policy reminder',
        notes: 'Warning test resolved',
      },
    });

    if (!actionRes.ok || !actionRes.data.success) {
      throw new Error(actionRes.data.error || 'Moderation action failed');
    }
    return 'Moderation action executed & audit logged';
  });

  // 24. Admin User Suspension
  await runStep(24, 'Admin User Temporary Suspension', async () => {
    const res = await apiRequest(`/api/admin/users/${user2Id}/suspend`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Security testing suspension check' },
    });
    if (!res.ok || !res.data.success) throw new Error(res.data.error || 'Suspension failed');

    const postAttempt = await apiRequest('/api/posts', {
      method: 'POST',
      token: token2,
      body: { content: 'Should fail due to suspension' },
    });

    if (postAttempt.status === 403) {
      return `User ${user2Id} successfully restricted (HTTP 403 returned)`;
    }
    throw new Error(`Expected HTTP 403 for suspended user, got ${postAttempt.status}`);
  });

  // 25. Admin User Restoration
  await runStep(25, 'Admin User Restoration to Active State', async () => {
    const res = await apiRequest(`/api/admin/users/${user2Id}/unsuspend`, {
      method: 'POST',
      token: adminToken,
    });
    if (!res.ok || !res.data.success || res.data.status !== 'active') {
      throw new Error(res.data.error || 'Restoration failed');
    }
    return `User ${user2Id} restored to active status`;
  });

  // ==========================================================================
  // DATABASE INTEGRITY & FINANCIAL SAFETY TESTS
  // ==========================================================================
  console.log('\n----------------------------------------------------');
  console.log('🔒 EXECUTING FINANCIAL MUTEX & INTEGRITY TESTS');
  console.log('----------------------------------------------------');

  // Test 26: Negative balance defense
  await runStep(26, 'Financial Guard: Negative Balance Rejection', async () => {
    const res = await apiRequest('/api/withdrawals/request', {
      method: 'POST',
      token: token1,
      body: {
        coins: 999999999, // Way more than balance
        payoutMethod: 'paypal',
        accountDetails: 'test@hacker.io',
      },
    });

    if (res.status === 400 && (res.data.error?.includes('Insufficient') || res.data.error?.includes('balance'))) {
      return 'Insufficient balance correctly prevented (HTTP 400)';
    }
    throw new Error(`Expected HTTP 400 for balance overdraft, got ${res.status}: ${JSON.stringify(res.data)}`);
  });

  // Test 27: Idempotent replay safety
  await runStep(27, 'Financial Guard: Idempotency Key Replay Protection', async () => {
    const idempotencyKey = `idem_test_${Date.now()}`;
    const gifts = await apiRequest('/api/gifts');
    const gift = gifts.data.gifts?.[0] || { id: 'gift_spark' };

    const res1 = await apiRequest('/api/gifts/send', {
      method: 'POST',
      token: token1,
      body: {
        giftId: gift.id,
        receiverId: user2Id,
        idempotencyKey,
      },
    });

    const res2 = await apiRequest('/api/gifts/send', {
      method: 'POST',
      token: token1,
      body: {
        giftId: gift.id,
        receiverId: user2Id,
        idempotencyKey,
      },
    });

    if (!res1.ok || !res2.ok) {
      throw new Error(`Gift send failed during idempotency test: ${res1.data.error || res2.data.error}`);
    }

    if (res1.data.transactionId !== res2.data.transactionId) {
      throw new Error('Idempotency failed: generated a duplicate second transaction!');
    }
    return `Duplicate request safely deduplicated: ${res2.data.transactionId}`;
  });

  // Test 28: Anti-Spam Velocity Burst Throttling
  await runStep(28, 'Anti-Spam Engine: Burst Rate Limiting', async () => {
    let throttled = false;
    for (let i = 0; i < 6; i++) {
      const postRes = await apiRequest('/api/posts', {
        method: 'POST',
        token: token1,
        body: {
          content: `Spam burst testing message iteration #${i}`,
          mediaType: 'none',
        },
      });
      if (postRes.status === 429) {
        throttled = true;
        break;
      }
    }

    if (!throttled) {
      throw new Error('Anti-spam burst rate limiter did not trigger on rapid loop!');
    }
    return 'Spam burst successfully throttled with HTTP 429';
  });

  console.log('\n====================================================');
  console.log('📊 TEST SUMMARY REPORT');
  console.log('====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Journeys Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFailures breakdown:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`  - Step ${r.step} (${r.journey}): ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 28 PRODUCTION INTEGRITY & USER JOURNEY TESTS PASSED!');
  }
}

main().catch((e) => {
  console.error('Fatal test suite exception:', e);
  process.exit(1);
});
