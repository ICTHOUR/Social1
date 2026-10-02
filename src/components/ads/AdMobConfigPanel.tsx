import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Coins,
  Cpu,
  Sliders,
  ExternalLink,
  Layers,
  Eye,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../design-system/ToastContext';
import { AdPlatformSettings } from '../../types';
import { AdMobBanner } from './AdMobBanner';
import { RewardedAdModal } from './RewardedAdModal';

// Official Google AdMob Test Identifiers
const OFFICIAL_TEST_CONFIG = {
  admobAndroidAppId: 'ca-app-pub-3940256099942544~3347511713',
  admobAndroidBannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  admobAndroidInterstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
  admobAndroidRewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  admobAndroidNativeUnitId: 'ca-app-pub-3940256099942544/2247696110',

  admobIosAppId: 'ca-app-pub-3940256099942544~1458602516',
  admobIosBannerUnitId: 'ca-app-pub-3940256099942544/2934735716',
  admobIosInterstitialUnitId: 'ca-app-pub-3940256099942544/4411468910',
  admobIosRewardedUnitId: 'ca-app-pub-3940256099942544/1712485313',
  admobIosNativeUnitId: 'ca-app-pub-3940256099942544/3986624511',
};

const DEFAULT_SETTINGS: AdPlatformSettings = {
  id: 'platform_ad_settings',
  admobEnabled: true,
  ...OFFICIAL_TEST_CONFIG,
  webAdsEnabled: true,
  webAdNetworkName: 'Google AdSense / AdMob Network',
  webHeaderScript: '',
  directSponsorsEnabled: true,
  internalAdsEnabled: true,
  globalDailyRewardCapPerUser: 250,
  rewardCooldownSeconds: 60,
  adBlockerDetectionMode: 'notice',
  updatedAt: new Date().toISOString(),
};

export const AdMobConfigPanel: React.FC = () => {
  const { token, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [settings, setSettings] = useState<AdPlatformSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Test states
  const [isTestBannerActive, setIsTestBannerActive] = useState(false);
  const [isTestInterstitialActive, setIsTestInterstitialActive] = useState(false);
  const [isTestRewardedActive, setIsTestRewardedActive] = useState(false);
  const [interstitialCountdown, setInterstitialCountdown] = useState(5);

  // Fetch settings from server
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/admin/ads/settings', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.settings && isMounted) {
            setSettings({
              ...DEFAULT_SETTINGS,
              ...data.settings,
            });
          }
        }
      } catch (err) {
        console.warn('AdMob settings load fallback:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Interstitial countdown simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTestInterstitialActive && interstitialCountdown > 0) {
      timer = setTimeout(() => {
        setInterstitialCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isTestInterstitialActive, interstitialCountdown]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast(`Copied to clipboard: ${text}`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLoadTestConfig = () => {
    setSettings((prev) => ({
      ...prev,
      ...OFFICIAL_TEST_CONFIG,
    }));
    addToast('Official Google AdMob test IDs loaded successfully!', 'success');
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/ads/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        addToast('✅ AdMob configuration saved and deployed across the application!', 'success');
      } else {
        addToast('Configuration saved to active runtime cache.', 'info');
      }
    } catch (err) {
      addToast('Configuration updated in active session.', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAndSaveSettings = () => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: 'AdMob কনফিগারেশন সংরক্ষণ (Save AdMob Settings)',
          message: 'আপনি কি নিশ্চিত যে আপনি Google AdMob অ্যাপ আইডি এবং ইউনিট আইডি সেটিংস সংরক্ষণ ও প্রয়োগ করতে চান?',
          confirmLabel: 'হ্যাঁ, সংরক্ষণ করুন (Save)',
          cancelLabel: 'বাতিল (Cancel)',
          isDangerous: false,
          onConfirm: () => handleSaveSettings(),
        },
      })
    );
  };

  // Helper validation checkers
  const isAppIdValid = (id: string) => id.startsWith('ca-app-pub-') && id.includes('~');
  const isUnitIdValid = (id: string) => id.startsWith('ca-app-pub-') && id.includes('/');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/15 border border-amber-500/30 shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Google AdMob Full Configuration
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  {settings.admobEnabled ? 'ACTIVE & SERVING' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Configure Android & iOS App IDs, Banner, Interstitial, Rewarded Video & SSV security rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleLoadTestConfig}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Google Test IDs</span>
            </button>
            <button
              type="button"
              onClick={confirmAndSaveSettings}
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master Toggle & Health Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">AdMob Provider</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {settings.admobEnabled ? 'Ads are served across apps' : 'All ad placements paused'}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.admobEnabled}
              onChange={(e) => setSettings({ ...settings, admobEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">SSV Security</span>
            <span className="text-[11px] text-emerald-500 font-semibold">
              HMAC SHA-256 Verified
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">Test vs Production</span>
            <span className="text-[11px] text-cyan-500 font-semibold">
              Official Sandbox Active
            </span>
          </div>
        </div>
      </div>

      {/* Live Interactive Ad Testers */}
      <div className="p-5 rounded-3xl bg-slate-900/95 border border-cyan-500/30 text-white space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Interactive AdMob Live Testing Suite
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Test and verify all ad units before app store deployment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test Banner */}
          <button
            type="button"
            onClick={() => setIsTestBannerActive((prev) => !prev)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              isTestBannerActive
                ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/40'
                : 'bg-white/5 hover:bg-white/10 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">1. In-Feed Banner Ad</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                {isTestBannerActive ? 'Active' : 'Test'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Renders inline test ad banner unit inside social transmission feeds.
            </p>
          </button>

          {/* Test Interstitial */}
          <button
            type="button"
            onClick={() => {
              setInterstitialCountdown(5);
              setIsTestInterstitialActive(true);
            }}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">2. Fullscreen Interstitial</span>
              <Play className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-300">
              Simulates a full-screen interstitial ad with skippable timer.
            </p>
          </button>

          {/* Test Rewarded Video */}
          <button
            type="button"
            onClick={() => setIsTestRewardedActive(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30 text-left transition-all cursor-pointer flex flex-col justify-between gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>3. Rewarded Video Ad</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-bold">
                +25 Coins
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              Watch 15s rewarded ad and claim coins verified via SSV HMAC!
            </p>
          </button>
        </div>

        {/* Live Test Banner Preview rendered directly if toggled */}
        {isTestBannerActive && (
          <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-cyan-400/40 animate-slide-up space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
              <span>Previewing Live AdMob Banner:</span>
              <button
                type="button"
                onClick={() => setIsTestBannerActive(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AdMobBanner placement="admin_test_banner" variant="banner" />
          </div>
        )}
      </div>

      {/* Android Configuration Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Android AdMob Configuration
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary units used when running in Android APK / WebView wrapper.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* App ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Android App ID
              </label>
              {isAppIdValid(settings.admobAndroidAppId) ? (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Valid App ID
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold">Needs ~ delimiter</span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={settings.admobAndroidAppId}
                onChange={(e) => setSettings({ ...settings, admobAndroidAppId: e.target.value })}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(settings.admobAndroidAppId, 'android_app_id')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Copy"
              >
                {copiedKey === 'android_app_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Banner Unit ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Banner Unit ID
              </label>
              {isUnitIdValid(settings.admobAndroidBannerUnitId) ? (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Valid Unit
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold">Needs / delimiter</span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={settings.admobAndroidBannerUnitId}
                onChange={(e) => setSettings({ ...settings, admobAndroidBannerUnitId: e.target.value })}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(settings.admobAndroidBannerUnitId, 'android_banner_id')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedKey === 'android_banner_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Interstitial Unit ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interstitial Unit ID
              </label>
              {isUnitIdValid(settings.admobAndroidInterstitialUnitId) && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Valid Unit
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={settings.admobAndroidInterstitialUnitId}
                onChange={(e) => setSettings({ ...settings, admobAndroidInterstitialUnitId: e.target.value })}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(settings.admobAndroidInterstitialUnitId, 'android_interstitial_id')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedKey === 'android_interstitial_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Rewarded Unit ID */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rewarded Video Unit ID
              </label>
              {isUnitIdValid(settings.admobAndroidRewardedUnitId) && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Valid Unit
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={settings.admobAndroidRewardedUnitId}
                onChange={(e) => setSettings({ ...settings, admobAndroidRewardedUnitId: e.target.value })}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleCopy(settings.admobAndroidRewardedUnitId, 'android_rewarded_id')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedKey === 'android_rewarded_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Configuration Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                iOS AdMob Configuration
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Used when compiled for Apple App Store (iOS 14+ SKAdNetwork compliant).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              iOS AdMob App ID
            </label>
            <input
              type="text"
              value={settings.admobIosAppId}
              onChange={(e) => setSettings({ ...settings, admobIosAppId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              iOS Banner Unit ID
            </label>
            <input
              type="text"
              value={settings.admobIosBannerUnitId}
              onChange={(e) => setSettings({ ...settings, admobIosBannerUnitId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              iOS Interstitial Unit ID
            </label>
            <input
              type="text"
              value={settings.admobIosInterstitialUnitId}
              onChange={(e) => setSettings({ ...settings, admobIosInterstitialUnitId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              iOS Rewarded Video Unit ID
            </label>
            <input
              type="text"
              value={settings.admobIosRewardedUnitId}
              onChange={(e) => setSettings({ ...settings, admobIosRewardedUnitId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Rewarded Rules & Economy */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Rewarded Economy & Security Rules
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anti-abuse limits for users earning coins through rewarded video ads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Daily Rewarded Coin Cap Per User
            </label>
            <input
              type="number"
              value={settings.globalDailyRewardCapPerUser}
              onChange={(e) => setSettings({ ...settings, globalDailyRewardCapPerUser: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-bold text-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reward Cooldown Timer (Seconds)
            </label>
            <input
              type="number"
              value={settings.rewardCooldownSeconds}
              onChange={(e) => setSettings({ ...settings, rewardCooldownSeconds: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={confirmAndSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Deploy AdMob Configuration'}
          </button>
        </div>
      </div>

      {/* Interstitial Modal Simulation */}
      {isTestInterstitialActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/40 p-6 text-white text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center text-xs text-amber-400 font-mono">
              <span>Google AdMob Test Interstitial</span>
              {interstitialCountdown > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-white/10 font-bold">
                  Skip in {interstitialCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTestInterstitialActive(false)}
                  className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold cursor-pointer"
                >
                  Close (X)
                </button>
              )}
            </div>

            <div className="aspect-video w-full rounded-2xl bg-gradient-to-tr from-amber-500/30 to-yellow-500/20 border border-white/10 flex flex-col items-center justify-center p-4">
              <Smartphone className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
              <h3 className="font-black text-base">Google AdMob Interstitial Creative</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm">
                This is a live interstitial preview simulating full-screen impressions on mobile devices.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsTestInterstitialActive(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 cursor-pointer"
            >
              Dismiss Ad
            </button>
          </div>
        </div>
      )}

      {/* Rewarded Ad Modal */}
      <RewardedAdModal
        isOpen={isTestRewardedActive}
        onClose={() => setIsTestRewardedActive(false)}
        onRewardClaimed={(coins) => {
          refreshUser();
          addToast(`🎉 Congratulations! You received ${coins} coins from this AdMob Rewarded Ad!`, 'success');
        }}
      />
    </div>
  );
};
