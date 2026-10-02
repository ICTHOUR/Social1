import React, { useState, useEffect } from 'react';
import {
  Key,
  CreditCard,
  Radio,
  Mail,
  HardDrive,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  Sliders,
  Smartphone,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminCmsCredentialsControl: React.FC = () => {
  const { token } = useAuth();
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCredentials = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || {});
      }
    } catch (e) {
      console.error('Failed to load credentials:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [token]);

  const handleChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccessMessage('');
    try {
      const res = await fetch('/api/admin/system/credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ credentials }),
      });
      if (res.ok) {
        setSuccessMessage('System credentials & API keys saved successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const confirmAndSave = () => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: 'ক্রেডেনশিয়াল সংরক্ষণ নিশ্চিতকরণ (Save Credentials)',
          message: 'আপনি কি নিশ্চিত যে আপনি এই গেটওয়ে ও API ক্রেডেনশিয়াল আপডেট সংরক্ষণ করতে চান?',
          confirmLabel: 'হ্যাঁ, সংরক্ষণ করুন (Save)',
          cancelLabel: 'বাতিল (Cancel)',
          isDangerous: false,
          onConfirm: () => handleSave(),
        },
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-purple-500/30 bg-slate-900/60 shadow-2xl">
        <div>
          <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            <span>Gateway Credentials & API Key Control Center</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Configure mobile wallet merchant IDs, payment gateway secrets, AdMob placement keys, SMTP servers, and system flags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {showSecrets ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{showSecrets ? 'Hide Secrets' : 'Reveal Credentials'}</span>
          </button>

          <button
            onClick={confirmAndSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/20"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Configurations</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>Loading secure credential vault...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. BKASH & BANGLADESH MOBILE FINANCIAL GATEWAYS */}
          <div className="glass-card rounded-3xl p-5 border border-pink-500/20 space-y-4">
            <h3 className="font-display font-extrabold text-pink-300 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
              <Smartphone className="w-4 h-4 text-pink-400" />
              <span>bKash, Nagad, Rocket, Upay Merchant Credentials</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">bKash App Key</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.bkash_app_key || ''}
                  onChange={(e) => handleChange('bkash_app_key', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">bKash App Secret</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.bkash_app_secret || ''}
                  onChange={(e) => handleChange('bkash_app_secret', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">bKash Merchant ID / Phone</label>
                  <input
                    type="text"
                    value={credentials.bkash_merchant_number || ''}
                    onChange={(e) => handleChange('bkash_merchant_number', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nagad Merchant ID</label>
                  <input
                    type="text"
                    value={credentials.nagad_merchant_id || ''}
                    onChange={(e) => handleChange('nagad_merchant_id', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Rocket Merchant Code</label>
                  <input
                    type="text"
                    value={credentials.rocket_merchant_id || ''}
                    onChange={(e) => handleChange('rocket_merchant_id', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Upay Merchant Code</label>
                  <input
                    type="text"
                    value={credentials.upay_merchant_id || ''}
                    onChange={(e) => handleChange('upay_merchant_id', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. INTERNATIONAL STRIPE & PAYPAL GATEWAYS */}
          <div className="glass-card rounded-3xl p-5 border border-indigo-500/20 space-y-4">
            <h3 className="font-display font-extrabold text-indigo-300 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              <span>Stripe & PayPal Live Credentials</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Stripe Publishable Key</label>
                <input
                  type="text"
                  value={credentials.stripe_publishable_key || ''}
                  onChange={(e) => handleChange('stripe_publishable_key', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Stripe Secret Key</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.stripe_secret_key || ''}
                  onChange={(e) => handleChange('stripe_secret_key', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">PayPal Client ID</label>
                <input
                  type="text"
                  value={credentials.paypal_client_id || ''}
                  onChange={(e) => handleChange('paypal_client_id', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">PayPal Client Secret</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.paypal_client_secret || ''}
                  onChange={(e) => handleChange('paypal_client_secret', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. ADMOB & WEB AD NETWORKS */}
          <div className="glass-card rounded-3xl p-5 border border-amber-500/20 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display font-extrabold text-amber-300 text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Google AdMob Full Credentials & Units</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCredentials((prev) => ({
                    ...prev,
                    admob_enabled: '1',
                    admob_android_app_id: 'ca-app-pub-3940256099942544~3347511713',
                    admob_android_banner_unit_id: 'ca-app-pub-3940256099942544/6300978111',
                    admob_android_interstitial_unit_id: 'ca-app-pub-3940256099942544/1033173712',
                    admob_android_rewarded_unit_id: 'ca-app-pub-3940256099942544/5224354917',
                    admob_android_native_unit_id: 'ca-app-pub-3940256099942544/2247696110',
                    admob_ios_app_id: 'ca-app-pub-3940256099942544~1458602516',
                    admob_ios_banner_unit_id: 'ca-app-pub-3940256099942544/2934735716',
                    admob_ios_interstitial_unit_id: 'ca-app-pub-3940256099942544/4411468910',
                    admob_ios_rewarded_unit_id: 'ca-app-pub-3940256099942544/1712485313',
                    admob_ios_native_unit_id: 'ca-app-pub-3940256099942544/3986624511',
                  }));
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] border border-amber-500/40 cursor-pointer"
              >
                Load Test IDs
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">AdMob Master Toggle</label>
                <select
                  value={credentials.admob_enabled || '1'}
                  onChange={(e) => handleChange('admob_enabled', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="1">Enabled (Active & Serving Ads)</option>
                  <option value="0">Disabled (Pause All Ads)</option>
                </select>
              </div>

              {/* Android Units */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400 block uppercase">Android Units</span>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">Android App ID</label>
                  <input
                    type="text"
                    value={credentials.admob_android_app_id || ''}
                    onChange={(e) => handleChange('admob_android_app_id', e.target.value)}
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Banner Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_android_banner_unit_id || ''}
                      onChange={(e) => handleChange('admob_android_banner_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Interstitial Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_android_interstitial_unit_id || ''}
                      onChange={(e) => handleChange('admob_android_interstitial_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Rewarded Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_android_rewarded_unit_id || ''}
                      onChange={(e) => handleChange('admob_android_rewarded_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Native Ad Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_android_native_unit_id || ''}
                      onChange={(e) => handleChange('admob_android_native_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* iOS Units */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-indigo-400 block uppercase">iOS Units</span>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">iOS App ID</label>
                  <input
                    type="text"
                    value={credentials.admob_ios_app_id || ''}
                    onChange={(e) => handleChange('admob_ios_app_id', e.target.value)}
                    placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Banner Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_ios_banner_unit_id || ''}
                      onChange={(e) => handleChange('admob_ios_banner_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Interstitial Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_ios_interstitial_unit_id || ''}
                      onChange={(e) => handleChange('admob_ios_interstitial_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Rewarded Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_ios_rewarded_unit_id || ''}
                      onChange={(e) => handleChange('admob_ios_rewarded_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Native Ad Unit ID</label>
                    <input
                      type="text"
                      value={credentials.admob_ios_native_unit_id || ''}
                      onChange={(e) => handleChange('admob_ios_native_unit_id', e.target.value)}
                      placeholder="ca-app-pub-XXXX/XXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Web Banner Script Tag</label>
                <textarea
                  value={credentials.web_ad_script || ''}
                  onChange={(e) => handleChange('web_ad_script', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* 4. PAYSTATION PAYMENT GATEWAY CREDENTIALS */}
          <div className="glass-card rounded-3xl p-5 border border-emerald-500/20 space-y-4">
            <h3 className="font-display font-extrabold text-emerald-300 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>PayStation Official Payment Gateway</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Environment Mode</label>
                  <select
                    value={credentials.paystation_mode || 'sandbox'}
                    onChange={(e) => handleChange('paystation_mode', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live Production</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Gateway Status</label>
                  <select
                    value={credentials.paystation_enabled || '1'}
                    onChange={(e) => handleChange('paystation_enabled', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="1">Enabled (Active)</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">PayStation Merchant ID</label>
                <input
                  type="text"
                  value={credentials.paystation_merchant_id || ''}
                  onChange={(e) => handleChange('paystation_merchant_id', e.target.value)}
                  placeholder="e.g. DEMO_MERCHANT_101"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Merchant Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.paystation_password || ''}
                  onChange={(e) => handleChange('paystation_password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Merchant Secret Key</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.paystation_secret_key || ''}
                  onChange={(e) => handleChange('paystation_secret_key', e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 5. BULKSMS BD GATEWAY CREDENTIALS */}
          <div className="glass-card rounded-3xl p-5 border border-blue-500/20 space-y-4">
            <h3 className="font-display font-extrabold text-blue-300 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>Bulk SMS BD Gateway & OTP Dispatch</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Environment Mode</label>
                  <select
                    value={credentials.bulksmsbd_mode || 'test'}
                    onChange={(e) => handleChange('bulksmsbd_mode', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="test">Test / Sandbox Mode</option>
                    <option value="live">Live Production</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">SMS Engine Status</label>
                  <select
                    value={credentials.bulksmsbd_enabled || '1'}
                    onChange={(e) => handleChange('bulksmsbd_enabled', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="1">Enabled (Active)</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">BulkSMS BD API Key</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={credentials.bulksmsbd_api_key || ''}
                  onChange={(e) => handleChange('bulksmsbd_api_key', e.target.value)}
                  placeholder="Enter BulkSMS BD API Key"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Sender ID / Masking</label>
                  <input
                    type="text"
                    value={credentials.bulksmsbd_sender_id || ''}
                    onChange={(e) => handleChange('bulksmsbd_sender_id', e.target.value)}
                    placeholder="e.g. 8809617... or NixoBD"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Rate Limit (Per Min)</label>
                  <input
                    type="number"
                    value={credentials.bulksmsbd_rate_limit || '60'}
                    onChange={(e) => handleChange('bulksmsbd_rate_limit', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">API Endpoint URL</label>
                <input
                  type="text"
                  value={credentials.bulksmsbd_api_url || 'http://bulksmsbd.net/api/smsapi'}
                  onChange={(e) => handleChange('bulksmsbd_api_url', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-blue-300 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* 6. SYSTEM FLAGS & MAINTENANCE */}
          <div className="glass-card rounded-3xl p-5 border border-cyan-500/20 space-y-4">
            <h3 className="font-display font-extrabold text-cyan-300 text-sm flex items-center gap-2 border-b border-white/10 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Platform Toggles & Maintenance Controls</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Platform Brand Title</label>
                <input
                  type="text"
                  value={credentials.platform_title || ''}
                  onChange={(e) => handleChange('platform_title', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Maintenance Mode</label>
                  <select
                    value={credentials.maintenance_mode || '0'}
                    onChange={(e) => handleChange('maintenance_mode', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="0">Disabled (Online)</option>
                    <option value="1">Enabled (System Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">New Registrations</label>
                  <select
                    value={credentials.new_registration_enabled || '1'}
                    onChange={(e) => handleChange('new_registration_enabled', e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="1">Allowed</option>
                    <option value="0">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Welcome Signup Bonus Coins</label>
                <input
                  type="number"
                  value={credentials.default_user_coins || '100'}
                  onChange={(e) => handleChange('default_user_coins', e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
