import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Server,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Terminal,
  RotateCcw,
  Sliders,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PayStationSettings {
  gatewayId: string;
  isEnabled: boolean;
  isSandbox: boolean;
  merchantId: string;
  merchantPasswordMasked: string;
  merchantSecretMasked?: string;
  baseUrl: string;
  callbackUrl: string;
  currency: string;
  timeoutMs: number;
  updatedAt?: string;
}

export const AdminPayStationControl: React.FC = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<PayStationSettings | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logs & Reconcile state
  const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'reconcile'>('config');
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [failedTxs, setFailedTxs] = useState<any[]>([]);

  // Reconcile / Refund modal state
  const [reconcileTxId, setReconcileTxId] = useState('');
  const [refundTxId, setRefundTxId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const fetchSettings = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payment-settings/paystation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load PayStation settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/payment-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentLogs(data.logs || []);
        setCallbacks(data.callbacks || []);
        setWebhooks(data.webhooks || []);
        setFailedTxs(data.failedTransactions || []);
      }
    } catch (err) {
      console.error('Failed to load payment logs:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !token) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const payload: any = {
        isEnabled: settings.isEnabled,
        isSandbox: settings.isSandbox,
        merchantId: settings.merchantId,
        callbackUrl: settings.callbackUrl,
        currency: settings.currency,
        timeoutMs: settings.timeoutMs,
      };

      if (newPassword.trim()) {
        payload.merchantPassword = newPassword.trim();
      }

      if (newSecretKey.trim()) {
        payload.merchantSecret = newSecretKey.trim();
      }

      const res = await fetch('/api/admin/payment-settings/paystation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setNewPassword('');
        setNewSecretKey('');
        setMessage({ type: 'success', text: 'PayStation configuration saved & live settings synced!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Server error saving settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!token) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/payment-settings/paystation/test-connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReconcile = async (txId: string) => {
    if (!token || !txId.trim()) return;
    try {
      const res = await fetch(`/api/admin/payments/reconcile/${encodeURIComponent(txId.trim())}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Reconciliation complete for ${txId}. Coins credited if verified.` });
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: data.error || 'Reconciliation failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Reconciliation error' });
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !refundTxId || !refundAmount) return;

    try {
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: refundTxId.trim(),
          amount: Number(refundAmount),
          reason: refundReason.trim() || 'Admin refund',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Refund of ${refundAmount} BDT processed for transaction ${refundTxId}` });
        setRefundTxId('');
        setRefundAmount('');
        setRefundReason('');
        fetchLogs();
      } else {
        setMessage({ type: 'error', text: data.error || 'Refund failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Refund processing error' });
    }
  };

  if (!settings) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        <span>Loading PayStation Gateway Engine...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/20 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">PayStation Payment Gateway</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                settings.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {settings.isEnabled ? 'Active Gateway' : 'Disabled'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                settings.isSandbox ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}>
                {settings.isSandbox ? 'Sandbox Mode' : 'Live Production Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official PayStation API Provider Integration • bKash, Nagad, Rocket & Bangladesh Banking APIs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isTesting ? 'animate-bounce text-amber-400' : ''}`} />
            {isTesting ? 'Testing Connection...' : 'Test Gateway API'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {testResult && (
        <div className="p-4 bg-slate-900/90 border border-cyan-500/20 rounded-xl text-xs space-y-2 font-mono">
          <div className="flex items-center justify-between font-bold text-cyan-400">
            <span>PayStation Server Diagnostics Result</span>
            <span className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
              {testResult.success ? 'HTTP 200 OK' : 'FAILED'}
            </span>
          </div>
          <pre className="text-[11px] text-slate-300 overflow-x-auto p-3 bg-slate-950 rounded-lg">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> Gateway Credentials & Config
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" /> Transaction & Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('reconcile')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'reconcile'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Reconciliation & Refunds
        </button>
      </div>

      {/* TAB 1: CONFIGURATION */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gateway Toggle */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Gateway Status</label>
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, isEnabled: true })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.isEnabled ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, isEnabled: false })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !settings.isEnabled ? 'bg-red-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Environment Mode</label>
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, isSandbox: true, baseUrl: 'https://sandbox.paystation.com.bd' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.isSandbox ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Sandbox (Test)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, isSandbox: false, baseUrl: 'https://api.paystation.com.bd' })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !settings.isSandbox ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Production (Live)
                </button>
              </div>
            </div>

            {/* Merchant ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Merchant ID</label>
              <input
                type="text"
                value={settings.merchantId}
                onChange={(e) => setSettings({ ...settings, merchantId: e.target.value })}
                placeholder="Enter PayStation Merchant ID"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Merchant Password {settings.merchantPasswordMasked && <span className="text-emerald-400 font-normal">(Saved)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={settings.merchantPasswordMasked ? 'Leave empty to keep saved password' : 'Enter Merchant Password'}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Merchant Secret Key {settings.merchantSecretMasked && <span className="text-emerald-400 font-normal">(Saved)</span>}
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value)}
                  placeholder={settings.merchantSecretMasked ? 'Leave empty to keep saved secret key' : 'Enter Secret Key'}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Base Endpoint URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">PayStation API Base URL</label>
              <input
                type="text"
                readOnly
                value={settings.baseUrl}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            {/* Callback Configuration */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Callback / Webhook Relative URL</label>
              <input
                type="text"
                value={settings.callbackUrl}
                onChange={(e) => setSettings({ ...settings, callbackUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Supported Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BDT">BDT (Bangladeshi Taka)</option>
                <option value="USD">USD (International Dollar)</option>
              </select>
            </div>

            {/* Timeout */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">API Timeout (ms)</label>
              <input
                type="number"
                value={settings.timeoutMs}
                onChange={(e) => setSettings({ ...settings, timeoutMs: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Saving Credentials...' : 'Save Configuration & Update Credentials'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: TRANSACTION & AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Payment Audit & Event Logs
            </h3>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Level</th>
                    <th className="p-3">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {paymentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        No payment log entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    paymentLogs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono text-[11px] text-slate-400">{log.created_at || log[7]}</td>
                        <td className="p-3 font-bold uppercase text-emerald-400">{log.gateway_id || log[2]}</td>
                        <td className="p-3 font-semibold text-slate-200">{log.action || log[4]}</td>
                        <td className="p-3 font-mono text-cyan-300">{log.transaction_id || log[1] || 'N/A'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (log.log_level || log[3]) === 'error'
                                ? 'bg-red-500/20 text-red-400'
                                : (log.log_level || log[3]) === 'warn'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {log.log_level || log[3] || 'info'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 truncate max-w-xs">{log.message || log[5]}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECONCILIATION & REFUNDS */}
      {activeTab === 'reconcile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reconcile Single Transaction */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Transaction Reconciliation</h3>
                <p className="text-xs text-slate-400">Perform server verification with PayStation API</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Invoice / Transaction ID</label>
              <input
                type="text"
                value={reconcileTxId}
                onChange={(e) => setReconcileTxId(e.target.value)}
                placeholder="PAY-1727083112-ABC"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={() => handleReconcile(reconcileTxId)}
              disabled={!reconcileTxId.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Verify & Reconcile Transaction
            </button>
          </div>

          {/* Refund Form */}
          <form onSubmit={handleRefund} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Process Refund</h3>
                <p className="text-xs text-slate-400">Issue refund back via PayStation provider</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Transaction ID</label>
              <input
                type="text"
                value={refundTxId}
                onChange={(e) => setRefundTxId(e.target.value)}
                placeholder="PAY-1727083112-ABC"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Refund Amount (BDT)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="115"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Reason</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Customer request"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!refundTxId || !refundAmount}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Issue Refund
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
