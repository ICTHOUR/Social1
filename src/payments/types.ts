/**
 * Financial System - Payment Gateway Provider Abstraction
 * Supports Bangladesh-friendly gateways (bKash, Nagad, Rocket, SSLCommerz) and International fallback.
 */

export type PaymentGatewayId = 'paystation' | 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'stripe' | 'sandbox';

export type PaymentTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface PaymentIntentOptions {
  transactionId: string;
  userId: string;
  packageId?: string;
  coinAmount: number;
  bonusCoins: number;
  amountBdt: number;
  amountUsd?: number;
  currency: 'BDT' | 'USD';
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  callbackUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntentResult {
  gatewayTransactionId: string;
  paymentUrl?: string; // Redirect URL for hosted checkout
  clientSecret?: string;
  status: 'pending' | 'requires_action' | 'completed' | 'failed';
  instructions?: string;
  rawResponse?: any;
}

export interface VerificationResult {
  isValid: boolean;
  status: PaymentTransactionStatus;
  gatewayTransactionId: string;
  amountPaid: number;
  currency: string;
  payerAccount?: string;
  gatewayFee?: number;
  failureReason?: string;
  rawResponse?: any;
}

export interface RefundResult {
  isRefunded: boolean;
  refundTransactionId: string;
  refundedAmount: number;
  status: 'completed' | 'pending' | 'failed';
  failureReason?: string;
  rawResponse?: any;
}

export interface IPaymentGatewayProvider {
  readonly id: PaymentGatewayId;
  readonly name: string;
  readonly logoUrl?: string;
  readonly supportedCurrencies: string[];
  readonly isSandbox: boolean;

  /**
   * Initializes a payment intent with the external gateway
   */
  createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult>;

  /**
   * Verifies the payment transaction status with the gateway
   */
  verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult>;

  /**
   * Handles inbound webhook payload from the gateway
   */
  handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult>;

  /**
   * Processes a refund back through the gateway
   */
  processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult>;

  /**
   * Reconciles transaction status against gateway records
   */
  reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult>;
}
