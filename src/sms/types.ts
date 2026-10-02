export type SmsStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected';

export type SmsTargetAudienceType =
  | 'all_users'
  | 'active_users'
  | 'suspended_users'
  | 'specific_users'
  | 'group_members'
  | 'custom_numbers';

export interface SmsProviderConfig {
  gatewayId: string;
  name: string;
  apiKey: string;
  apiKeyMasked?: string;
  senderId: string;
  apiUrl: string;
  isEnabled: boolean;
  isTestMode: boolean;
  timeoutMs: number;
  rateLimitPerMinute: number;
}

export interface SmsOptions {
  recipient: string; // phone number e.g. 8801700000000 or +8801...
  message: string;
  type?: 'plain' | 'unicode' | 'otp' | 'transactional';
  referenceId?: string; // internal message ID or campaign ID
}

export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  status: SmsStatus;
  responseCode?: string;
  responseRaw?: any;
  error?: string;
}

export interface SmsDeliveryStatus {
  providerMessageId: string;
  status: SmsStatus;
  deliveredAt?: string;
  errorDetails?: string;
  rawResponse?: any;
}

export interface ISmsProvider {
  readonly id: string;
  readonly name: string;
  get isTestMode(): boolean;
  
  sendSingleSms(options: SmsOptions): Promise<SmsSendResult>;
  sendBulkSms(recipients: string[], message: string, options?: Partial<SmsOptions>): Promise<SmsSendResult[]>;
  getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus>;
  getBalance(): Promise<{ success: boolean; balance?: number; currency?: string; raw?: any }>;
  
  updateConfig(config: Partial<SmsProviderConfig>): void;
  getConfig(): Omit<SmsProviderConfig, 'apiKey'> & { apiKeyMasked: string };
}

export interface SmsTemplate {
  id: string;
  name: string;
  category: 'otp' | 'welcome' | 'transactional' | 'announcement' | 'alert' | 'custom';
  content: string; // May include placeholders like {user_name}, {otp_code}, {amount}, {app_name}
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmsCampaign {
  id: string;
  title: string;
  audienceType: SmsTargetAudienceType;
  targetFilterJson?: string;
  templateId?: string;
  messageContent: string;
  status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SmsMessageRecord {
  id: string;
  campaignId?: string;
  userId?: string;
  userName?: string;
  phoneNumber: string;
  message: string;
  smsType: string;
  status: SmsStatus;
  providerName: string;
  providerMsgId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}
