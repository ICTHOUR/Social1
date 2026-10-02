import crypto from 'crypto';
import {
  IPaymentGatewayProvider,
  PaymentGatewayId,
  PaymentIntentOptions,
  PaymentIntentResult,
  VerificationResult,
  RefundResult,
} from './types.js';

/**
 * 1. bKash Payment Gateway Provider
 * Implements bKash Tokenized/URL Checkout architecture
 */
export class BKashPaymentProvider implements IPaymentGatewayProvider {
  readonly id: PaymentGatewayId = 'bkash';
  readonly name = 'bKash Direct (বিকাশ)';
  readonly logoUrl = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=80&q=80';
  readonly supportedCurrencies = ['BDT'];
  readonly isSandbox = true;

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const paymentID = `BKASH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      gatewayTransactionId: paymentID,
      paymentUrl: `/api/payments/checkout-redirect?gateway=bkash&tx=${paymentID}&amount=${options.amountBdt}`,
      clientSecret: `bkash_secret_${crypto.randomBytes(16).toString('hex')}`,
      status: 'requires_action',
      instructions: `Complete payment of ${options.amountBdt.toFixed(2)} BDT via bKash App or Dial *247#`,
      rawResponse: {
        paymentID,
        createTime: new Date().toISOString(),
        orgLogo: this.logoUrl,
        transactionStatus: 'Initiated',
        amount: options.amountBdt.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: options.transactionId,
      },
    };
  }

  async verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult> {
    // If payer account provided or simulation
    const payerAccount = payload?.payerAccount || '017' + Math.floor(10000000 + Math.random() * 90000000);
    const amountPaid = payload?.amount ? Number(payload.amount) : 0;

    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid,
      currency: 'BDT',
      payerAccount,
      gatewayFee: Number((amountPaid * 0.015).toFixed(2)), // 1.5% bKash merchant fee
      rawResponse: {
        paymentID: gatewayTransactionId,
        trxID: `TRX${Date.now()}`,
        transactionStatus: 'Completed',
        amount: amountPaid,
        currency: 'BDT',
        customerMsisdn: payerAccount,
        paymentExecuteTime: new Date().toISOString(),
      },
    };
  }

  async handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult> {
    const gatewayTransactionId = payload?.paymentID || payload?.transactionId;
    return this.verifyPayment(gatewayTransactionId, payload);
  }

  async processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult> {
    const refundTrxId = `BKASH-REF-${Date.now()}`;
    return {
      isRefunded: true,
      refundTransactionId: refundTrxId,
      refundedAmount: amount,
      status: 'completed',
      rawResponse: { refundTrxId, originalTrxId: gatewayTransactionId, reason },
    };
  }

  async reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult> {
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid: 0,
      currency: 'BDT',
    };
  }
}

/**
 * 2. Nagad Payment Gateway Provider
 * Implements Nagad Payment Gateway Architecture
 */
export class NagadPaymentProvider implements IPaymentGatewayProvider {
  readonly id: PaymentGatewayId = 'nagad';
  readonly name = 'Nagad (নগদ)';
  readonly logoUrl = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=80&q=80';
  readonly supportedCurrencies = ['BDT'];
  readonly isSandbox = true;

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const paymentRefId = `NAGAD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      gatewayTransactionId: paymentRefId,
      paymentUrl: `/api/payments/checkout-redirect?gateway=nagad&tx=${paymentRefId}&amount=${options.amountBdt}`,
      status: 'requires_action',
      instructions: `Complete payment of ${options.amountBdt.toFixed(2)} BDT via Nagad Wallet`,
      rawResponse: {
        paymentReferenceId: paymentRefId,
        callbackUrl: options.callbackUrl,
        status: 'Success',
      },
    };
  }

  async verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult> {
    const payerAccount = payload?.payerAccount || '018' + Math.floor(10000000 + Math.random() * 90000000);
    const amountPaid = payload?.amount ? Number(payload.amount) : 0;

    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid,
      currency: 'BDT',
      payerAccount,
      gatewayFee: Number((amountPaid * 0.012).toFixed(2)), // 1.2% Nagad fee
      rawResponse: {
        paymentRefId: gatewayTransactionId,
        status: 'Success',
        issuerPaymentDateTime: new Date().toISOString(),
      },
    };
  }

  async handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult> {
    return this.verifyPayment(payload?.payment_ref_id || payload?.gatewayTransactionId, payload);
  }

  async processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      isRefunded: true,
      refundTransactionId: `NAGAD-REF-${Date.now()}`,
      refundedAmount: amount,
      status: 'completed',
    };
  }

  async reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult> {
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid: 0,
      currency: 'BDT',
    };
  }
}

/**
 * 3. Rocket (DBBL) Payment Gateway Provider
 */
export class RocketPaymentProvider implements IPaymentGatewayProvider {
  readonly id: PaymentGatewayId = 'rocket';
  readonly name = 'DBBL Rocket (রকেট)';
  readonly supportedCurrencies = ['BDT'];
  readonly isSandbox = true;

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const rocketTxId = `ROCKET-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    return {
      gatewayTransactionId: rocketTxId,
      paymentUrl: `/api/payments/checkout-redirect?gateway=rocket&tx=${rocketTxId}&amount=${options.amountBdt}`,
      status: 'requires_action',
      instructions: `Complete payment of ${options.amountBdt.toFixed(2)} BDT with Dutch-Bangla Rocket mobile banking`,
    };
  }

  async verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult> {
    const amountPaid = payload?.amount ? Number(payload.amount) : 0;
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid,
      currency: 'BDT',
      payerAccount: payload?.payerAccount || '019' + Math.floor(10000000 + Math.random() * 90000000),
      gatewayFee: Number((amountPaid * 0.015).toFixed(2)),
    };
  }

  async handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult> {
    return this.verifyPayment(payload?.txId || payload?.gatewayTransactionId, payload);
  }

  async processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      isRefunded: true,
      refundTransactionId: `ROCKET-REF-${Date.now()}`,
      refundedAmount: amount,
      status: 'completed',
    };
  }

  async reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult> {
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid: 0,
      currency: 'BDT',
    };
  }
}

/**
 * 4. SSLCommerz Payment Gateway Provider
 * Unified aggregator for VISA/Mastercard/Amex, Mobile Banking, Internet Banking in Bangladesh
 */
export class SSLCommerzPaymentProvider implements IPaymentGatewayProvider {
  readonly id: PaymentGatewayId = 'sslcommerz';
  readonly name = 'SSLCommerz (Cards & Net Banking)';
  readonly supportedCurrencies = ['BDT', 'USD'];
  readonly isSandbox = true;

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const sessionKey = `SSLCZ-SESSION-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return {
      gatewayTransactionId: sessionKey,
      paymentUrl: `/api/payments/checkout-redirect?gateway=sslcommerz&tx=${sessionKey}&amount=${options.amountBdt}`,
      status: 'requires_action',
      instructions: `Pay via Visa, Mastercard, NexusPay, or Online Banking`,
    };
  }

  async verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult> {
    const amountPaid = payload?.amount ? Number(payload.amount) : 0;
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid,
      currency: 'BDT',
      payerAccount: payload?.card_brand ? `${payload.card_brand} ****${payload.card_last4 || '8821'}` : 'VISA Card',
      gatewayFee: Number((amountPaid * 0.025).toFixed(2)),
    };
  }

  async handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult> {
    return this.verifyPayment(payload?.val_id || payload?.gatewayTransactionId, payload);
  }

  async processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      isRefunded: true,
      refundTransactionId: `SSLCZ-REF-${Date.now()}`,
      refundedAmount: amount,
      status: 'completed',
    };
  }

  async reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult> {
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid: 0,
      currency: 'BDT',
    };
  }
}

/**
 * 5. Stripe / International Card Provider
 */
export class StripePaymentProvider implements IPaymentGatewayProvider {
  readonly id: PaymentGatewayId = 'stripe';
  readonly name = 'International Card (Stripe)';
  readonly supportedCurrencies = ['USD', 'BDT'];
  readonly isSandbox = true;

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const piId = `pi_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    return {
      gatewayTransactionId: piId,
      clientSecret: `${piId}_secret_${crypto.randomBytes(12).toString('hex')}`,
      status: 'requires_action',
      instructions: 'Enter International Credit / Debit Card Details',
    };
  }

  async verifyPayment(gatewayTransactionId: string, payload?: any): Promise<VerificationResult> {
    const amountPaid = payload?.amount ? Number(payload.amount) : 0;
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid,
      currency: 'USD',
      payerAccount: 'Card ****4242',
      gatewayFee: Number((amountPaid * 0.029 + 0.3).toFixed(2)),
    };
  }

  async handleWebhook(headers: Record<string, string>, payload: any): Promise<VerificationResult> {
    return this.verifyPayment(payload?.data?.object?.id || payload?.gatewayTransactionId, payload);
  }

  async processRefund(gatewayTransactionId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      isRefunded: true,
      refundTransactionId: `re_${Date.now()}`,
      refundedAmount: amount,
      status: 'completed',
    };
  }

  async reconcileTransaction(gatewayTransactionId: string): Promise<VerificationResult> {
    return {
      isValid: true,
      status: 'completed',
      gatewayTransactionId,
      amountPaid: 0,
      currency: 'USD',
    };
  }
}

import { PayStationPaymentProvider } from './PayStationProvider.js';

/**
 * 6. Central Payment Gateway Registry
 * Manages provider registration, dispatching, and lookup.
 */
export class PaymentGatewayRegistry {
  private static instance: PaymentGatewayRegistry;
  private providers: Map<PaymentGatewayId, IPaymentGatewayProvider> = new Map();

  private constructor() {
    this.registerProvider(new PayStationPaymentProvider());
    this.registerProvider(new BKashPaymentProvider());
    this.registerProvider(new NagadPaymentProvider());
    this.registerProvider(new RocketPaymentProvider());
    this.registerProvider(new SSLCommerzPaymentProvider());
    this.registerProvider(new StripePaymentProvider());
  }

  public static getInstance(): PaymentGatewayRegistry {
    if (!PaymentGatewayRegistry.instance) {
      PaymentGatewayRegistry.instance = new PaymentGatewayRegistry();
    }
    return PaymentGatewayRegistry.instance;
  }

  public registerProvider(provider: IPaymentGatewayProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: PaymentGatewayId): IPaymentGatewayProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Unsupported or unconfigured payment gateway: ${id}`);
    }
    return provider;
  }

  public getAllProviders(): Array<{
    id: PaymentGatewayId;
    name: string;
    logoUrl?: string;
    supportedCurrencies: string[];
    isSandbox: boolean;
  }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      logoUrl: p.logoUrl,
      supportedCurrencies: p.supportedCurrencies,
      isSandbox: p.isSandbox,
    }));
  }
}
