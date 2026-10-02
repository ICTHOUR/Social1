import crypto from 'crypto';
import {
  ISmsProvider,
  SmsDeliveryStatus,
  SmsOptions,
  SmsProviderConfig,
  SmsSendResult,
  SmsStatus,
} from './types.js';

/**
 * Bulk SMS BD Official Provider Implementation
 * Handles single SMS, bulk SMS, balance check, and delivery status check according to BulkSMSBD API specs.
 */
export class BulkSmsBdProvider implements ISmsProvider {
  readonly id = 'bulksmsbd';
  readonly name = 'Bulk SMS BD (বাল্ক এসএমএস বিডি)';

  private config: SmsProviderConfig;

  constructor(customConfig?: Partial<SmsProviderConfig>) {
    this.config = {
      gatewayId: 'bulksmsbd',
      name: 'Bulk SMS BD Provider',
      apiKey: process.env.BULKSMSBD_API_KEY || 'demo_bulksmsbd_api_key_883921',
      senderId: process.env.BULKSMSBD_SENDER_ID || 'NixoBD',
      apiUrl: process.env.BULKSMSBD_API_URL || 'http://bulksmsbd.net/api/smsapi',
      isEnabled: true,
      isTestMode: process.env.BULKSMSBD_TEST_MODE === 'true' || true, // default test mode ON for safety
      timeoutMs: 15000,
      rateLimitPerMinute: 60,
      ...customConfig,
    };
  }

  get isTestMode(): boolean {
    return this.config.isTestMode;
  }

  public updateConfig(config: Partial<SmsProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): Omit<SmsProviderConfig, 'apiKey'> & { apiKeyMasked: string } {
    return {
      gatewayId: this.config.gatewayId,
      name: this.config.name,
      senderId: this.config.senderId,
      apiUrl: this.config.apiUrl,
      isEnabled: this.config.isEnabled,
      isTestMode: this.config.isTestMode,
      timeoutMs: this.config.timeoutMs,
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      apiKeyMasked: this.config.apiKey ? '••••••••' + this.config.apiKey.slice(-4) : '',
    };
  }

  /**
   * Helper to normalize Bangladeshi phone numbers to standard 13-digit format (8801XXXXXXXXX)
   */
  public sanitizePhoneNumber(phone: string): string {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.startsWith('01') && clean.length === 11) {
      clean = '88' + clean;
    } else if (clean.startsWith('8801') && clean.length === 13) {
      // already standard
    } else if (clean.length === 10 && clean.startsWith('1')) {
      clean = '880' + clean;
    }
    return clean;
  }

  /**
   * Send Single SMS
   */
  async sendSingleSms(options: SmsOptions): Promise<SmsSendResult> {
    if (!this.config.isEnabled) {
      return {
        success: false,
        status: 'rejected',
        error: 'Bulk SMS BD provider is currently disabled by admin.',
      };
    }

    const recipientNum = this.sanitizePhoneNumber(options.recipient);
    if (!recipientNum || recipientNum.length < 11) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid Bangladeshi phone number format: ${options.recipient}`,
      };
    }

    // In TEST / SIMULATION MODE
    if (this.config.isTestMode) {
      const mockMsgId = `BSMSBD-TEST-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      return {
        success: true,
        providerMessageId: mockMsgId,
        status: 'delivered',
        responseCode: '1000',
        responseRaw: {
          response_code: 1000,
          message: 'SMS Submitted Successfully (Test Mode)',
          success_message: 'Message Sent Successfully',
          tx_id: mockMsgId,
          test_mode: true,
          recipient: recipientNum,
        },
      };
    }

    // LIVE PRODUCTION REQUEST TO BULK SMS BD
    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        senderid: this.config.senderId,
        number: recipientNum,
        message: options.message,
        type: options.type === 'unicode' ? 'unicode' : 'text',
      });

      const requestUrl = `${this.config.apiUrl}?${params.toString()}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(this.config.timeoutMs || 15000),
      });

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const resData = await response.json().catch(() => null);

      // BulkSMSBD API response standard:
      // Code 1000 = Success, 1002 = Empty Number, 1003 = Invalid Number, 1006 = Balance Insufficient, 1007 = Invalid API Key, 1008 = Sender ID Not Approved
      const responseCode = String(resData?.response_code || resData?.code || '0');
      const isSuccess = responseCode === '1000' || resData?.status === 'success' || resData?.success_message !== undefined;

      const providerMsgId = resData?.tx_id || resData?.message_id || resData?.sms_id || `BSMSBD-${Date.now()}`;

      if (isSuccess) {
        return {
          success: true,
          providerMessageId: String(providerMsgId),
          status: 'sent', // Will be confirmed as delivered via delivery report lookup
          responseCode,
          responseRaw: resData,
        };
      } else {
        return {
          success: false,
          status: 'failed',
          responseCode,
          responseRaw: resData,
          error: resData?.error_message || resData?.message || `Provider returned error code ${responseCode}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        error: err.message || 'Network timeout or connection failure to Bulk SMS BD API',
      };
    }
  }

  /**
   * Send Bulk SMS to multiple recipients
   */
  async sendBulkSms(recipients: string[], message: string, options?: Partial<SmsOptions>): Promise<SmsSendResult[]> {
    if (!this.config.isEnabled) {
      return recipients.map(() => ({
        success: false,
        status: 'rejected',
        error: 'Bulk SMS BD provider is currently disabled.',
      }));
    }

    const sanitizedRecipients = recipients.map((r) => this.sanitizePhoneNumber(r)).filter(Boolean);

    // TEST MODE
    if (this.config.isTestMode) {
      return sanitizedRecipients.map((num) => {
        const mockId = `BSMSBD-BULK-TEST-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        return {
          success: true,
          providerMessageId: mockId,
          status: 'delivered',
          responseCode: '1000',
          responseRaw: { test_mode: true, recipient: num },
        };
      });
    }

    // Live mode: BulkSMSBD supports comma separated numbers up to batch limit
    const results: SmsSendResult[] = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < sanitizedRecipients.length; i += BATCH_SIZE) {
      const batch = sanitizedRecipients.slice(i, i + BATCH_SIZE);
      const commaSeparatedNumbers = batch.join(',');

      try {
        const params = new URLSearchParams({
          api_key: this.config.apiKey,
          senderid: this.config.senderId,
          number: commaSeparatedNumbers,
          message: message,
          type: options?.type === 'unicode' ? 'unicode' : 'text',
        });

        const bulkUrl = this.config.apiUrl.includes('smsapimany')
          ? `${this.config.apiUrl}?${params.toString()}`
          : `http://bulksmsbd.net/api/smsapi?${params.toString()}`;

        const response = await fetch(bulkUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(this.config.timeoutMs || 15000),
        });

        const resData = await response.json().catch(() => null);
        const responseCode = String(resData?.response_code || '0');
        const isSuccess = responseCode === '1000' || resData?.status === 'success';

        batch.forEach((num) => {
          results.push({
            success: isSuccess,
            providerMessageId: resData?.tx_id ? `${resData.tx_id}-${num}` : `BSMSBD-${Date.now()}-${num}`,
            status: isSuccess ? 'sent' : 'failed',
            responseCode,
            responseRaw: resData,
            error: isSuccess ? undefined : resData?.error_message || resData?.message || 'Bulk SMS send failed',
          });
        });
      } catch (err: any) {
        batch.forEach(() => {
          results.push({
            success: false,
            status: 'failed',
            error: err.message || 'Batch network error',
          });
        });
      }
    }

    return results;
  }

  /**
   * Check Delivery Status for a message ID
   */
  async getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    if (this.config.isTestMode || providerMessageId.startsWith('BSMSBD-TEST')) {
      return {
        providerMessageId,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
      };
    }

    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        sms_id: providerMessageId,
      });

      const res = await fetch(`http://bulksmsbd.net/api/getDeliveryReport?${params.toString()}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        const dlrStatus = String(data?.status || data?.dlr_status || '').toLowerCase();

        let finalStatus: SmsStatus = 'sent';
        if (dlrStatus.includes('deliver') || dlrStatus === '1000' || dlrStatus === 'success') {
          finalStatus = 'delivered';
        } else if (dlrStatus.includes('fail') || dlrStatus.includes('reject')) {
          finalStatus = 'failed';
        }

        return {
          providerMessageId,
          status: finalStatus,
          deliveredAt: finalStatus === 'delivered' ? new Date().toISOString() : undefined,
          rawResponse: data,
        };
      }
    } catch (e: any) {
      console.warn('BulkSMSBD delivery report check error:', e.message);
    }

    return {
      providerMessageId,
      status: 'sent',
    };
  }

  /**
   * Check SMS Balance
   */
  async getBalance(): Promise<{ success: boolean; balance?: number; currency?: string; raw?: any }> {
    if (this.config.isTestMode) {
      return {
        success: true,
        balance: 99999,
        currency: 'SMS Credits (Test Mode)',
        raw: { is_test_mode: true, balance: 99999 },
      };
    }

    try {
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
      });

      const res = await fetch(`http://bulksmsbd.net/api/getBalanceApi?${params.toString()}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        const balanceVal = Number(data?.balance || data?.sms_balance || 0);
        return {
          success: true,
          balance: balanceVal,
          currency: 'SMS Credits',
          raw: data,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        raw: { error: err.message },
      };
    }

    return { success: false };
  }
}
