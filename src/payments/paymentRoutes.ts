import { Express, Request, Response } from 'express';
import { Database } from 'sql.js';
import {
  createPaymentIntentForCoins,
  verifyAndCreditPayment,
  logPaymentEvent,
  recordPaymentCallback,
  recordPaymentWebhook,
  recordPaymentRefund,
  getPayStationSettings,
  updatePayStationSettings,
} from '../db/financialEngine.js';
import { PaymentGatewayRegistry } from './PaymentGatewayRegistry.js';
import { PayStationPaymentProvider } from './PayStationProvider.js';
import { PaymentGatewayId } from './types.js';

export function registerPaymentRoutes(app: Express, db: Database, io?: any) {
  // Middleware helper to extract authenticated user
  const getUserFromReq = (req: Request) => (req as any).user;

  // -------------------------------------------------------------
  // 1. PAYMENT INITIALIZATION / REQUEST
  // -------------------------------------------------------------
  app.post('/api/payments/intent', async (req: Request, res: Response) => {
    try {
      const user = getUserFromReq(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication required to initiate payment' });
      }

      const { packageId, customAmount, gatewayId = 'paystation', customerDetails } = req.body;
      const targetGateway = (gatewayId as PaymentGatewayId) || 'paystation';

      const result = await createPaymentIntentForCoins(
        db,
        user.id,
        packageId || 'pkg_1000',
        customAmount ? Number(customAmount) : undefined,
        targetGateway,
        customerDetails
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to initialize payment' });
      }

      res.json(result);
    } catch (err: any) {
      console.error('Payment intent error:', err);
      res.status(500).json({ error: err.message || 'Server error initializing payment' });
    }
  });

  // -------------------------------------------------------------
  // 2. CHECKOUT REDIRECT / SIMULATOR ROUTE
  // -------------------------------------------------------------
  app.get('/api/payments/checkout-redirect', (req: Request, res: Response) => {
    const gateway = (req.query.gateway as string) || 'paystation';
    const tx = (req.query.tx as string) || '';
    const amount = (req.query.amount as string) || '0';

    // HTML Checkout Page for Hosted Gateway simulation
    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PayStation Payment Checkout Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen p-4">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                PS
              </div>
              <div>
                <h1 class="text-lg font-bold text-white">PayStation Gateway</h1>
                <p class="text-xs text-slate-400">Secure Payment Checkout Portal</p>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Verified SSL</span>
          </div>

          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">Invoice Number:</span>
              <span class="font-mono text-emerald-400 font-semibold">${tx}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-400">Gateway Provider:</span>
              <span class="font-medium text-white uppercase">${gateway}</span>
            </div>
            <div class="flex justify-between text-base border-t border-slate-800/80 pt-2 font-bold">
              <span class="text-slate-200">Total Payable Amount:</span>
              <span class="text-emerald-400">৳${amount} BDT</span>
            </div>
          </div>

          <div class="space-y-3">
            <label class="block text-xs font-semibold text-slate-400">SELECT PAYMENT METHOD</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" class="p-3 bg-pink-600/20 border border-pink-500/30 rounded-xl text-pink-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-pink-600/30">
                bKash Mobile
              </button>
              <button type="button" class="p-3 bg-orange-600/20 border border-orange-500/30 rounded-xl text-orange-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-orange-600/30">
                Nagad Wallet
              </button>
              <button type="button" class="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-600/30">
                DBBL Rocket
              </button>
              <button type="button" class="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-600/30">
                Credit/Debit Card
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <form action="/api/payments/paystation/callback" method="GET" class="space-y-2">
              <input type="hidden" name="invoice_number" value="${tx}">
              <input type="hidden" name="trx_id" value="PS-TRX-${tx}">
              <input type="hidden" name="status" value="success">
              <input type="hidden" name="amount" value="${amount}">
              <button type="submit" class="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20">
                Complete Payment (৳${amount} BDT)
              </button>
            </form>

            <form action="/api/payments/paystation/callback" method="GET">
              <input type="hidden" name="invoice_number" value="${tx}">
              <input type="hidden" name="status" value="cancelled">
              <button type="submit" class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-all">
                Cancel Transaction
              </button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });

  // -------------------------------------------------------------
  // 3. PAYMENT CALLBACK HANDLING (Success / Failure / Cancel)
  // -------------------------------------------------------------
  const handleGatewayCallback = async (req: Request, res: Response) => {
    const gatewayId = req.params.gateway || 'paystation';
    const payload = { ...req.query, ...req.body };
    const invoiceNumber = (payload.invoice_number || payload.invoice_no || payload.tx || payload.transactionId) as string;
    const statusStr = (payload.status || 'success').toString().toLowerCase();

    // Log & Record Callback Event
    logPaymentEvent(db, invoiceNumber || null, gatewayId, 'info', 'callback', `Received callback for invoice ${invoiceNumber} with status ${statusStr}`, payload);
    if (invoiceNumber) {
      recordPaymentCallback(db, invoiceNumber, gatewayId, statusStr, payload.payer_account || payload.cust_phone, payload, req.ip);
    }

    if (!invoiceNumber) {
      return res.status(400).send('Missing invoice_number parameter in callback.');
    }

    // Cancellation check
    if (statusStr === 'cancelled' || statusStr === 'canceled' || statusStr === 'cancel') {
      logPaymentEvent(db, invoiceNumber, gatewayId, 'warn', 'cancellation', `User cancelled transaction ${invoiceNumber}`);
      return res.redirect(`/?payment_status=cancelled&tx=${invoiceNumber}`);
    }

    // FAILURE check
    if (statusStr === 'failed' || statusStr === 'failure') {
      logPaymentEvent(db, invoiceNumber, gatewayId, 'error', 'failed_callback', `Transaction ${invoiceNumber} marked failed by gateway`);
      return res.redirect(`/?payment_status=failed&tx=${invoiceNumber}`);
    }

    // CRITICAL SECURITY: SERVER-TO-SERVER VERIFICATION BEFORE CREDITING COINS!
    try {
      const verification = await verifyAndCreditPayment(db, invoiceNumber, payload);

      if (verification.success) {
        if (io) {
          // Emit socket event if active
          io.emit('payment_completed', {
            transactionId: invoiceNumber,
            coinsCredited: verification.coinsCredited,
            newBalance: verification.newBalance,
          });
        }
        return res.redirect(`/?payment_status=success&tx=${invoiceNumber}&coins=${verification.coinsCredited || 0}`);
      } else {
        return res.redirect(`/?payment_status=failed&tx=${invoiceNumber}&reason=${encodeURIComponent(verification.error || 'Verification failed')}`);
      }
    } catch (err: any) {
      logPaymentEvent(db, invoiceNumber, gatewayId, 'error', 'callback_exception', err.message || 'Exception during callback processing');
      return res.redirect(`/?payment_status=failed&tx=${invoiceNumber}&reason=server_error`);
    }
  };

  app.get('/api/payments/paystation/callback', handleGatewayCallback);
  app.post('/api/payments/paystation/callback', handleGatewayCallback);
  app.get('/api/payments/callback/:gateway', handleGatewayCallback);
  app.post('/api/payments/callback/:gateway', handleGatewayCallback);

  // -------------------------------------------------------------
  // 4. WEBHOOK HANDLING (IPN - Instant Payment Notification)
  // -------------------------------------------------------------
  const handleGatewayWebhook = async (req: Request, res: Response) => {
    const gatewayId = req.params.gateway || 'paystation';
    const payload = req.body || {};
    const headers = (req.headers || {}) as Record<string, string>;

    const invoiceNumber = payload.invoice_number || payload.invoice_no || payload.transaction_id || payload.tx;

    logPaymentEvent(db, invoiceNumber || null, gatewayId, 'info', 'webhook', `Inbound webhook received for invoice ${invoiceNumber}`, payload);
    recordPaymentWebhook(db, gatewayId, 'ipn_received', payload, headers);

    if (!invoiceNumber) {
      return res.status(400).json({ error: 'Missing invoice_number in webhook payload' });
    }

    try {
      const result = await verifyAndCreditPayment(db, invoiceNumber, payload);
      res.json({ success: true, processed: true, result });
    } catch (err: any) {
      logPaymentEvent(db, invoiceNumber, gatewayId, 'error', 'webhook_error', err.message || 'Webhook processing error');
      res.status(500).json({ error: err.message || 'Webhook processing error' });
    }
  };

  app.post('/api/payments/paystation/webhook', handleGatewayWebhook);
  app.post('/api/payments/webhook/:gateway', handleGatewayWebhook);

  // -------------------------------------------------------------
  // 5. MANUAL VERIFICATION API
  // -------------------------------------------------------------
  app.post('/api/payments/verify', async (req: Request, res: Response) => {
    const { transactionId, payload } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required' });
    }

    try {
      const result = await verifyAndCreditPayment(db, transactionId, payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Verification failed' });
    }
  });

  // -------------------------------------------------------------
  // 6. ADMIN PAYMENT SETTINGS & PAYSTATION CONFIGURATION
  // -------------------------------------------------------------
  app.get('/api/admin/payment-settings/paystation', (req: Request, res: Response) => {
    try {
      const settings = getPayStationSettings(db);
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch PayStation settings' });
    }
  });

  app.put('/api/admin/payment-settings/paystation', (req: Request, res: Response) => {
    try {
      const {
        isEnabled,
        isSandbox,
        merchantId,
        merchantPassword,
        merchantSecret,
        callbackUrl,
        currency,
        timeoutMs,
      } = req.body;

      const updatedSettings = updatePayStationSettings(db, {
        isEnabled,
        isSandbox,
        merchantId,
        merchantPassword,
        merchantSecret,
        callbackUrl,
        currency,
        timeoutMs: timeoutMs ? Number(timeoutMs) : undefined,
      });

      // Update active instance in registry
      try {
        const provider = PaymentGatewayRegistry.getInstance().getProvider('paystation') as PayStationPaymentProvider;
        if (provider) {
          provider.updateConfig({
            merchantId,
            password: merchantPassword && merchantPassword !== '••••••••' ? merchantPassword : undefined,
            secretKey: merchantSecret,
            isSandbox,
            callbackUrl,
            isEnabled,
          });
        }
      } catch (e) {
        console.warn('Could not update live provider instance:', e);
      }

      logPaymentEvent(db, null, 'paystation', 'info', 'admin_config_update', 'Updated PayStation configuration settings');
      res.json({ success: true, settings: updatedSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update PayStation settings' });
    }
  });

  app.post('/api/admin/payment-settings/paystation/test-connection', async (req: Request, res: Response) => {
    try {
      const settings = getPayStationSettings(db);
      const provider = PaymentGatewayRegistry.getInstance().getProvider('paystation') as PayStationPaymentProvider;

      const testResult = await provider.verifyPayment(`TEST-PING-${Date.now()}`);
      res.json({
        success: true,
        message: 'PayStation connection test completed successfully!',
        gatewayInfo: provider.getConfig(),
        testResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'PayStation connection test failed' });
    }
  });

  // -------------------------------------------------------------
  // 7. ADMIN TRANSACTION LOGS & RECONCILIATION & REFUNDS
  // -------------------------------------------------------------
  app.get('/api/admin/payment-logs', (req: Request, res: Response) => {
    try {
      const logs = (db as any).exec ? (db as any).exec(`SELECT * FROM payment_logs ORDER BY created_at DESC LIMIT 100`) : [];
      const callbacks = (db as any).exec ? (db as any).exec(`SELECT * FROM payment_callbacks ORDER BY created_at DESC LIMIT 50`) : [];
      const webhooks = (db as any).exec ? (db as any).exec(`SELECT * FROM payment_webhooks ORDER BY created_at DESC LIMIT 50`) : [];
      const failedTxs = (db as any).exec ? (db as any).exec(`SELECT * FROM payment_transactions_v2 WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 50`) : [];

      res.json({
        logs: logs[0]?.values || [],
        callbacks: callbacks[0]?.values || [],
        webhooks: webhooks[0]?.values || [],
        failedTransactions: failedTxs[0]?.values || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to query payment logs' });
    }
  });

  app.post('/api/admin/payments/reconcile/:txId', async (req: Request, res: Response) => {
    const txId = req.params.txId;
    try {
      const result = await verifyAndCreditPayment(db, txId);
      logPaymentEvent(db, txId, 'system', 'info', 'reconciliation', `Admin requested manual reconciliation for ${txId}`, result);
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Reconciliation failed' });
    }
  });

  app.post('/api/admin/payments/refund', async (req: Request, res: Response) => {
    const { transactionId, amount, reason } = req.body;
    if (!transactionId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'transactionId and positive refund amount are required' });
    }

    try {
      const tx = (db as any).exec ? (db as any).exec(`SELECT * FROM payment_transactions_v2 WHERE transaction_id = '${transactionId}'`)[0]?.values[0] : null;
      const gatewayId = (tx ? tx[12] : 'paystation') as PaymentGatewayId;

      const provider = PaymentGatewayRegistry.getInstance().getProvider(gatewayId);
      const refundRes = await provider.processRefund(transactionId, Number(amount), reason || 'Admin authorized refund');

      if (refundRes.isRefunded) {
        recordPaymentRefund(
          db,
          refundRes.refundTransactionId,
          transactionId,
          tx ? tx[2] : 'system',
          Number(amount),
          'BDT',
          'completed',
          reason,
          'admin',
          refundRes.rawResponse
        );
        logPaymentEvent(db, transactionId, gatewayId, 'info', 'refund_success', `Refund of ${amount} BDT completed for transaction ${transactionId}`, refundRes);
        res.json({ success: true, refund: refundRes });
      } else {
        res.status(400).json({ error: refundRes.failureReason || 'Refund request was rejected by gateway' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Refund processing failed' });
    }
  });
}
