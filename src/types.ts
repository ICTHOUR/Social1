export type UserRole = 'user' | 'creator' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending';

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl: string;
  coverUrl?: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;
  badge?: string; // 'VIP' | 'CREATOR' | 'VERIFIED' | 'PRO'
  coinsBalance: number;
  isVerified: boolean;
  role: UserRole;
  status: UserStatus;
  followersCount: number;
  followingCount: number;
  gender?: string | null;
  genderPrivacy?: 'public' | 'only_me';
  birthdate?: string | null;
  dobPrivacy?: 'public' | 'only_me';
  occupation?: string | null;
  workingDetails?: string | null;
  workPrivacy?: 'public' | 'only_me';
  education?: string | null;
  educationPrivacy?: 'public' | 'only_me';
  interests?: string[];
  interestsPrivacy?: 'public' | 'only_me';
  activities?: string[];
  activitiesPrivacy?: 'public' | 'only_me';
  hobbies?: string[];
  hobbiesPrivacy?: 'public' | 'only_me';
  socialLinks?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type MediaType =
  | 'none'
  | 'image'
  | 'multiple_image'
  | 'video'
  | 'audio'
  | 'text_image'
  | 'text_video'
  | 'text_audio'
  | 'link'
  | 'poll'
  | 'feeling'
  | 'location'
  | 'tagged'
  | 'hashtag'
  | 'gif'
  | 'repost'
  | 'scheduled';

export type PrivacyLevel = 'public' | 'friends' | 'followers' | 'only_me' | 'custom';
export type CommentsControl = 'allow_all' | 'friends_only' | 'disabled';

export interface TaggedUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface FeelingActivity {
  type: 'feeling' | 'celebrating' | 'listening' | 'watching' | 'reading' | 'traveling';
  label: string;
  icon?: string;
}

export interface LinkPreviewData {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface AudioPostData {
  title: string;
  artist?: string;
  audioUrl: string;
  durationSeconds: number;
  waveform?: number[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  votedUserIds?: string[];
}

export interface PollData {
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt?: string;
}

export interface Post {
  id: string;
  userId: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    badge?: string;
    isVerified: boolean;
  };
  content: string;
  mediaType: MediaType;
  mediaUrls: string[];
  pollData?: PollData;
  privacy: PrivacyLevel;
  groupId?: string;
  groupName?: string;
  pageId?: string;
  pageName?: string;
  isSponsored?: boolean;
  sponsorTitle?: string;
  sponsorTargetUrl?: string;
  feeling?: FeelingActivity;
  location?: string;
  taggedUsers?: TaggedUser[];
  hashtags?: string[];
  linkPreview?: LinkPreviewData;
  gifUrl?: string;
  audioData?: AudioPostData;
  backgroundGradient?: string;
  fontStyle?: string;
  fontSize?: string;
  commentsControl?: CommentsControl;
  scheduledFor?: string;
  repostOf?: Post;
  repostOfPostId?: string;
  reactionsCount: {
    like?: number;
    love?: number;
    haha?: number;
    wow?: number;
    sad?: number;
    angry?: number;
    celebrate?: number;
    support?: number;
    fire?: number;
    gem?: number;
    mindblown?: number;
    heartbreak?: number;
    total: number;
    [key: string]: number | undefined;
  };
  userReaction?: string;
  commentsCount: number;
  sharesCount: number;
  isBookmarked?: boolean;
  isAuthorFollowed?: boolean;
  giftsReceivedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoryMusic {
  title: string;
  artist: string;
  audioUrl?: string;
  albumArt?: string;
}

export interface StoryPollOption {
  id: string;
  text: string;
  votes: number;
}

export interface StoryPoll {
  question: string;
  options: StoryPollOption[];
  userVotedOptionId?: string;
  totalVotes: number;
}

export interface StoryLink {
  url: string;
  title: string;
}

export interface StoryMention {
  userId: string;
  username: string;
  x: number;
  y: number;
}

export interface StorySticker {
  id: string;
  type: string;
  content: string;
  x: number;
  y: number;
  scale?: number;
}

export interface StoryEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export interface StoryViewer {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  viewedAt: string;
  reaction?: string;
}

export interface Story {
  id: string;
  userId: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified?: boolean;
    badge?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  storyType?: 'image' | 'video' | 'text';
  textContent?: string;
  textStyle?: {
    font?: string;
    bgGradient?: string;
    textColor?: string;
    textAlign?: string;
  };
  music?: StoryMusic;
  stickers?: StorySticker[];
  emojis?: StoryEmoji[];
  mentions?: StoryMention[];
  poll?: StoryPoll;
  link?: StoryLink;
  privacy: 'public' | 'friends' | 'close_friends';
  caption?: string;
  expiresAt: string;
  createdAt: string;
  isViewed?: boolean;
  viewsCount?: number;
  reactionsCount?: Record<string, number>;
  userReaction?: string;
  viewers?: StoryViewer[];
}

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified?: boolean;
  };
}

export interface Reel {
  id: string;
  userId: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified: boolean;
    isFollowing?: boolean;
    badge?: string;
  };
  videoUrl: string;
  thumbnailUrl?: string;
  caption: string;
  musicTitle?: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  hashtags?: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  repostsCount?: number;
  savesCount?: number;
  giftsCount?: number;
  duration?: number;
  aspectRatio?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  createdAt: string;
}

export interface VideoCaptionCue {
  start: number;
  end: number;
  text: string;
}

export interface VideoItem {
  id: string;
  userId: string;
  title: string;
  caption: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  category: 'discovery' | 'recommended' | 'trending' | 'following' | 'tech' | 'music' | 'gaming' | 'creative';
  tags: string[];
  qualitySources?: Record<string, string>; // e.g. { "1080p": "...", "720p": "...", "480p": "..." }
  captions?: VideoCaptionCue[];
  captionsUrl?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified: boolean;
    isFollowing?: boolean;
    badge?: string;
  };
  createdAt: string;
}

export interface VideoWatchHistoryItem {
  id: string;
  videoId: string;
  video: VideoItem;
  watchTimeSeconds: number;
  lastPositionSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export type ReactionType =
  | 'like'
  | 'love'
  | 'haha'
  | 'wow'
  | 'sad'
  | 'angry'
  | 'celebrate'
  | 'support'
  | 'fire'
  | 'gem'
  | 'mindblown'
  | 'heartbreak';

export interface Comment {
  id: string;
  postId?: string;
  reelId?: string;
  userId: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    isVerified?: boolean;
    badge?: string;
  };
  parentId?: string | null;
  content: string;
  mediaUrl?: string | null;
  gifUrl?: string | null;
  isPinned?: boolean;
  isEdited?: boolean;
  reactionsCount: number;
  reactionsBreakdown?: Record<string, number>;
  userReaction?: ReactionType;
  replies?: Comment[];
  isAuthorFollowed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Reaction {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  reelId?: string;
  type: ReactionType;
  createdAt: string;
}

export interface MessageReaction {
  reaction: string;
  count: number;
  users: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
  }[];
  userReacted?: boolean;
}

export interface MessageReplyInfo {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  senderUsername?: string;
  mediaUrl?: string;
  messageType?: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  receiverId?: string;
  groupChatId?: string;
  sender?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    badge?: string;
  };
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'gif' | 'sticker' | 'coins';
  mediaUrl?: string;
  audioUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  coinAmount?: number;
  replyToId?: string;
  replyTo?: MessageReplyInfo | null;
  forwardedFromId?: string;
  isEdited?: boolean;
  editedAt?: string;
  isUnsent?: boolean;
  isRead: boolean;
  status?: 'sent' | 'delivered' | 'read';
  createdAt: string;
  reactions?: MessageReaction[];
}

export interface ConversationMember {
  userId: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt?: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface Conversation {
  id: string;
  type?: 'direct' | 'group';
  title?: string;
  avatarUrl?: string;
  createdBy?: string;
  role?: 'creator' | 'admin' | 'member';
  membersCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  partner?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    badge?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
    isBlocked?: boolean;
    blockedByMe?: boolean;
  };
  members?: ConversationMember[];
  lastMessage?: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_accept'
  | 'follow'
  | 'like'
  | 'reaction'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'share'
  | 'repost'
  | 'message'
  | 'group_activity'
  | 'page_activity'
  | 'event_activity'
  | 'gift_received'
  | 'gift'
  | 'coin_received'
  | 'coin_purchase'
  | 'withdrawal_update'
  | 'admin_announcement'
  | 'security_alert'
  | 'ad_approved'
  | 'system';

export interface NotificationMetadata {
  route?: 'home' | 'post' | 'comment' | 'profile' | 'friends' | 'messenger' | 'groups' | 'pages' | 'events' | 'wallet' | 'settings' | 'explore' | 'videos' | 'reels' | 'announcement';
  targetId?: string;
  postId?: string;
  commentId?: string;
  userId?: string;
  conversationId?: string;
  groupId?: string;
  pageId?: string;
  eventId?: string;
  transactionId?: string;
  amount?: number;
  status?: string;
  previewImage?: string;
  badge?: string;
  actionUrl?: string;
  title?: string;
  reactionType?: string;
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  senderId?: string;
  sender?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    badge?: string;
  };
  type: NotificationType;
  referenceId?: string;
  referenceType?: string;
  title?: string;
  message: string;
  imageUrl?: string;
  deepLink?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
  campaignId?: string;
  isRead: boolean;
  metadata?: NotificationMetadata;
  dedupKey?: string;
  actionUrl?: string;
  createdAt: string;
}

export type CampaignTargetType = 'individual' | 'bulk' | 'group' | 'filtered' | 'all';

export type CampaignTargetFilter =
  | 'active'
  | 'inactive'
  | 'verified'
  | 'new_users'
  | 'creators'
  | 'coin_users'
  | 'specific_group'
  | 'specific_page'
  | 'custom_selection';

export type CampaignStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  deepLink?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetType: CampaignTargetType;
  targetFilter?: CampaignTargetFilter;
  targetId?: string;
  customUserIds?: string[];
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaignLog {
  id: string;
  campaignId: string;
  userId: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  email?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  title: string;
  message: string;
  imageUrl?: string;
  deepLink?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  browserPushEnabled: boolean;
  mobilePushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  // Category preferences
  prefFriendRequest: boolean;
  prefFriendAccepted: boolean;
  prefFollow: boolean;
  prefLike: boolean;
  prefComment: boolean;
  prefReply: boolean;
  prefMention: boolean;
  prefShare: boolean;
  prefRepost: boolean;
  prefMessage: boolean;
  prefGroupActivity: boolean;
  prefPageActivity: boolean;
  prefEventActivity: boolean;
  prefGiftReceived: boolean;
  prefCoinReceived: boolean;
  prefCoinPurchase: boolean;
  prefWithdrawalUpdate: boolean;
  prefAdminAnnouncement: boolean;
  prefSecurityAlert: boolean;
}

export interface PushSubscriptionInfo {
  id: string;
  platform: 'web' | 'ios' | 'android';
  endpoint?: string;
  deviceName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface MutualFriend {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  isVerified?: boolean;
}

export interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio?: string;
    badge?: string;
    isVerified?: boolean;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  mutualCount: number;
  createdAt: string;
}

export interface FriendUserItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio?: string;
  badge?: string;
  isVerified?: boolean;
  mutualCount: number;
  friendsSince?: string;
  isFollowing?: boolean;
}

export interface SocialSuggestion {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio?: string;
  badge?: string;
  isVerified?: boolean;
  mutualCount: number;
  mutualSample: string[];
  reason: string;
  isFollowing?: boolean;
  status?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
}

export interface SocialRelationship {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  friendStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  friendRequestId?: string | null;
  isBlocked: boolean;
  isBlockedBy: boolean;
  isMuted: boolean;
  isRestricted: boolean;
  mutualCount: number;
  mutualFriendsSample: MutualFriend[];
  canSendFriendRequest: boolean;
  canFollow: boolean;
}

export interface GroupRule {
  id: string;
  groupId: string;
  title: string;
  description: string;
  ruleOrder: number;
}

export interface GroupPost {
  id: string;
  groupId: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorBadge?: string;
  authorRole?: string;
  content: string;
  mediaUrls: string[];
  isAnnouncement: boolean;
  commentsCount: number;
  createdAt: string;
}

export interface GroupComment {
  id: string;
  groupPostId: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  content: string;
  createdAt: string;
}

export interface GroupFile {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  fullName: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface GroupJoinRequest {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  status: string;
  message?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  role: 'creator' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned' | 'muted';
  mutedUntil?: string | null;
  joinedAt: string;
}

export interface Group {
  id: string;
  creatorId: string;
  creatorName?: string;
  creatorUsername?: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  privacy: 'public' | 'private';
  membersCount: number;
  memberRole?: 'creator' | 'admin' | 'moderator' | 'member' | 'guest';
  memberStatus?: 'active' | 'pending' | 'banned' | 'muted' | 'none';
  createdAt: string;
}

export interface PageRole {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  role: 'owner' | 'admin' | 'moderator' | 'editor';
  createdAt: string;
}

export interface PagePost {
  id: string;
  pageId: string;
  pageName: string;
  pageAvatar: string;
  authorName: string;
  authorUsername: string;
  content: string;
  mediaUrls: string[];
  videoUrl?: string;
  viewsCount: number;
  createdAt: string;
}

export interface PageAnalyticsData {
  followersCount: number;
  viewsCount: number;
  postsCount: number;
  videosCount: number;
  totalMessages: number;
  reachRate: string;
  engagementScore: string;
}

export interface PageMessage {
  id: string;
  pageId: string;
  userId: string;
  senderType: 'user' | 'page';
  content: string;
  createdAt: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
}

export interface Page {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerUsername?: string;
  name: string;
  slug: string;
  category: string;
  about?: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  followersCount: number;
  viewsCount?: number;
  isFollowing?: boolean;
  createdAt: string;
}

export interface EventDiscussion {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  badge?: string;
  content: string;
  createdAt: string;
}

export interface Event {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername?: string;
  title: string;
  description: string;
  coverUrl: string;
  eventType?: 'online' | 'offline';
  location: string;
  startTime: string;
  endTime?: string;
  category: string;
  attendeesCount: number;
  interestedCount?: number;
  rsvpStatus?: 'going' | 'interested' | 'none';
  hasReminder?: boolean;
  createdAt: string;
}

export interface WalletInfo {
  userId?: string;
  availableBalance: number;
  purchasedBalance?: number;
  receivedGiftBalance?: number;
  withdrawableBalance?: number;
  pendingBalance: number;
  earnedBalance: number;
  giftedBalance: number;
  withdrawnAmountCoins: number;
  withdrawnAmountBdt: number;
  equivalentBdt: number;
  conversionRateUsed?: { coins: number; bdt: number };
  coinsBalance: number;
  totalEarned: number;
  totalSpent: number;
  recentTransactions: CoinTransaction[];
}

export interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  bonusCoins: number;
  totalCoins: number;
  priceBdt: number;
  priceUsd: number;
  isActive?: boolean;
  isCustom?: boolean;
  minCustomCoins?: number;
  maxCustomCoins?: number;
  badgeText?: string;
  perUserLimit?: number;
  dailyLimit?: number;
  sortOrder?: number;
}

export interface WithdrawalRequestItem {
  id: string;
  requestCode: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  coinsAmount: number;
  grossAmountBdt: number;
  feeBdt: number;
  netPayoutBdt: number;
  conversionRateUsed: number;
  payoutMethodType: string;
  payoutAccountDetails: string;
  status: 'pending' | 'reviewing' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled';
  adminNotes?: string;
  rejectionReason?: string;
  gatewayPayoutRef?: string;
  statusHistory?: Array<{ status: string; timestamp: string; note?: string; adminId?: string; reason?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalSettingsConfig {
  id: string;
  minWithdrawalCoins: number;
  maxWithdrawalCoins: number;
  conversionRateCoins: number;
  conversionRateBdt: number;
  processingFeePercent: number;
  processingFeeFixedBdt: number;
  dailyLimitCoins: number;
  weeklyLimitCoins: number;
  verificationRequirement: 'none' | 'phone_verified' | 'kyc_verified' | 'account_age_24h';
  allowedPayoutMethods: string[];
  isWithdrawalEnabled: boolean;
  updatedAt?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  transactionId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  coinsAmount: number;
  bonusCoins: number;
  totalCoins: number;
  amountBdt: number;
  amountUsd?: number;
  currency: string;
  gatewayId: string;
  gatewayTxId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payerAccount?: string;
  failureReason?: string;
  refundReason?: string;
  refundTxId?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoinTransaction {
  id: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  receiverName?: string;
  amount: number;
  type: 'gift' | 'transfer' | 'ad_spend' | 'recharge' | 'withdrawal' | 'daily_bonus' | 'reward';
  balanceBefore?: number;
  balanceAfter?: number;
  referenceId?: string;
  sourceType?: string;
  status?: string;
  note?: string;
  metadata?: string | Record<string, any>;
  createdAt: string;
}

export interface GiftActivityItem {
  id: string;
  transactionId: string;
  direction: 'sent' | 'received';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  giftId: string;
  giftName: string;
  giftImage3d?: string;
  giftIconType?: string;
  coinAmount: number;
  postId?: string | null;
  createdAt: string;
}

export interface Gift {
  id: string;
  name: string;
  iconType: string;
  coinPrice: number;
  image3d?: string;
  animation: 'orbital_float' | 'cosmic_pulse' | 'crystal_burst' | 'golden_rain' | 'quantum_flare' | 'astral_surge' | string;
  status: 'active' | 'inactive';
  category: 'popular' | 'luxury' | 'cosmic' | 'legendary' | 'vip' | string;
  sortOrder?: number;
  description?: string;
  animationUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoinEarningRules {
  id: string;
  coinsPerPost: number;
  coinsPerPhoto?: number;
  coinsPerVideo: number;
  coinsPerStory: number;
  dailyEarningLimit: number;
  maximumDailyReward: number;
  minimumAccountAgeHours: number;
  minimumActivityRequirement: number;
  rewardCooldownSeconds: number;
  eligibleContentTypes: string[];
  antiAbuseRules: {
    minWordCount?: number;
    preventDuplicateContent?: boolean;
    maxHourlyRewards?: number;
    requireActiveStatus?: boolean;
    minContentLength?: number;
    duplicateContentBlocked?: boolean;
    maxDailyPostsEligible?: number;
    spamCooldownSeconds?: number;
  };
  updatedAt: string;
}

export interface CoinEarningLedgerItem {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  event: string;
  coins: number;
  beforeBalance: number;
  afterBalance: number;
  sourceId?: string;
  sourceType: string;
  status: string;
  antiAbuseFlags?: string;
  createdAt: string;
}

export interface GiftTransactionRecord {
  id: string;
  transactionId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatar?: string;
  giftId: string;
  giftName?: string;
  giftImage3d?: string;
  giftIconType?: string;
  coinAmount: number;
  postId?: string;
  commentId?: string;
  status: 'completed' | 'refunded';
  idempotencyKey?: string;
  refundedAt?: string;
  refundReason?: string;
  createdAt: string;
}

export interface SuspiciousActivityItem {
  id: string;
  userId: string;
  userName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'rapid_velocity' | 'duplicate_spam' | 'limit_bypass_attempt' | 'burst_transfer' | string;
  details: string;
  detail?: string;
  score?: number;
  status?: string;
  detectedAt: string;
}

export type AdProviderType = 'internal' | 'direct_sponsor' | 'web_provider' | 'admob';
export type AdFormatType = 'banner' | 'interstitial' | 'rewarded' | 'native' | 'video';
export type AdPlacementId =
  | 'feed_inline'
  | 'sidebar_right'
  | 'reels_interstitial'
  | 'story_sponsor'
  | 'explore_native'
  | 'rewarded_coin_modal'
  | 'video_preroll';

export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type AdPricingModel = 'cpm' | 'cpc' | 'cpv' | 'flat';

export interface AdTargetingConfig {
  device?: 'all' | 'mobile' | 'desktop';
  countries?: string[];
  interests?: string[];
  minAccountAgeDays?: number;
  verifiedOnly?: boolean;
}

export interface AdFrequencyCapConfig {
  perUserHourly: number;
  perUserDaily: number;
  cooldownMinutes: number;
}

export interface AdPlacement {
  id: string;
  name: string;
  description: string;
  placementType: AdFormatType;
  allowedProviders: AdProviderType[];
  isEnabled: boolean;
  refreshIntervalSec: number;
  rewardCoins: number;
  frequencyCapHourly: number;
  frequencyCapDaily: number;
  cooldownMinutes: number;
  minCpmRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  advertiserId: string;
  advertiserName: string;
  title: string;
  status: AdCampaignStatus;
  provider: AdProviderType;
  adFormat: AdFormatType;
  placements: string[];
  headline: string;
  bodyText: string;
  callToAction: string;
  destinationUrl: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'gif' | 'html';
  htmlSnippet?: string;
  admobUnitId?: string;
  pricingModel: AdPricingModel;
  bidAmountUsd: number;
  totalBudgetUsd: number;
  dailyBudgetUsd: number;
  spentBudgetUsd: number;
  startDate: string;
  endDate?: string;
  rewardCoins: number;
  targetingConfig: AdTargetingConfig;
  frequencyCap: AdFrequencyCapConfig;
  impressionsCount: number;
  clicksCount: number;
  rewardsClaimedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdPlatformSettings {
  id: string;
  admobEnabled: boolean;
  admobAndroidAppId: string;
  admobAndroidBannerUnitId: string;
  admobAndroidInterstitialUnitId: string;
  admobAndroidRewardedUnitId: string;
  admobAndroidNativeUnitId?: string;
  admobIosAppId: string;
  admobIosBannerUnitId: string;
  admobIosInterstitialUnitId: string;
  admobIosRewardedUnitId: string;
  admobIosNativeUnitId?: string;
  webAdsEnabled: boolean;
  webAdNetworkName: string;
  webHeaderScript: string;
  directSponsorsEnabled: boolean;
  internalAdsEnabled: boolean;
  globalDailyRewardCapPerUser: number;
  rewardCooldownSeconds: number;
  adBlockerDetectionMode: 'lenient' | 'notice' | 'strict';
  updatedAt: string;
}

export interface AdImpression {
  id: string;
  campaignId: string;
  placementId: string;
  provider: AdProviderType;
  userId?: string;
  sessionId?: string;
  costUsd: number;
  createdAt: string;
}

export interface AdClick {
  id: string;
  campaignId: string;
  placementId: string;
  provider: AdProviderType;
  userId?: string;
  sessionId?: string;
  costUsd: number;
  destinationUrl: string;
  createdAt: string;
}

export interface AdRewardedChallenge {
  challengeToken: string;
  campaignId: string;
  placementId: string;
  provider: AdProviderType;
  rewardCoins: number;
  minWatchDurationSec: number;
  expiresAt: string;
}

export interface AdAnalyticsReport {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    overallCtr: number;
    estimatedRevenueUsd: number;
    rewardsClaimed: number;
    totalCoinsAwarded: number;
    activeCampaignsCount: number;
    enabledPlacementsCount: number;
  };
  placementBreakdown: Array<{
    placementId: string;
    placementName: string;
    impressions: number;
    clicks: number;
    ctr: number;
    revenueUsd: number;
    rewardsClaimed: number;
  }>;
  campaignBreakdown: Array<{
    campaignId: string;
    title: string;
    advertiserName: string;
    provider: AdProviderType;
    status: AdCampaignStatus;
    impressions: number;
    clicks: number;
    ctr: number;
    spentUsd: number;
    budgetUsd: number;
  }>;
  providerDistribution: Array<{
    provider: AdProviderType;
    impressions: number;
    clicks: number;
    revenueUsd: number;
    sharePercent: number;
  }>;
  dailyTrends: Array<{
    date: string;
    impressions: number;
    clicks: number;
    revenueUsd: number;
    ctr: number;
  }>;
}

export interface Advertisement {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  description: string;
  targetUrl: string;
  imageUrl: string;
  budgetCoins: number;
  spentCoins: number;
  status: 'pending' | 'active' | 'paused' | 'completed';
  clicksCount: number;
  impressionsCount: number;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: 'post' | 'user' | 'comment' | 'group';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
}

export interface SystemConfig {
  coinToUsdRate: number; // e.g. 100 coins = $1.00
  minWithdrawalCoins: number;
  dailyBonusCoins: number;
  enableNewRegistrations: boolean;
  contentModerationStrictness: 'low' | 'medium' | 'high';
  siteName: string;
  announcementHeader?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalTransactions: number;
  totalCoinsCirculating: number;
  activeAdsCount: number;
  pendingReportsCount: number;
  dailyActiveUsers: number;
}
