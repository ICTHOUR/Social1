import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Globe,
  UserCheck,
  Share2,
  FileText,
  Coins,
  Gift,
  CreditCard,
  MessageSquare,
  Radio,
  Bell,
  ShieldAlert,
  Loader2,
  Check,
  Save,
  AlertTriangle,
} from 'lucide-react';

type SettingsCategory =
  | 'general'
  | 'registration'
  | 'social'
  | 'content'
  | 'coin'
  | 'gift'
  | 'payment'
  | 'sms'
  | 'advertisement'
  | 'notifications'
  | 'security';

export const AdminGlobalSettings: React.FC = () => {
  const { token } = useAuth();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load system settings');
        }
        const data = await res.json();
        if (data.success) {
          setSettings(data.settings);
        } else {
          throw new Error(data.error || 'Unknown settings error');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to system settings database');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleInputChange = (category: SettingsCategory, key: string, value: any) => {
    if (!settings) return;
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleNestedInputChange = (category: SettingsCategory, parentKey: string, key: string, value: any) => {
    if (!settings) return;
    setSettings((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...prev[category][parentKey],
          [key]: value,
        },
      },
    }));
  };

  const handleSaveCategory = async (category: SettingsCategory) => {
    if (!token || !settings) return;
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/admin/settings/${category}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings[category]),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings category');
      }

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`System settings for ${category.toUpperCase()} updated successfully!`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAndSaveCategory = (category: SettingsCategory) => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: `সিস্টেম সেটিংস সংরক্ষণ (${category.toUpperCase()})`,
          message: `আপনি কি নিশ্চিত যে আপনি ${category.toUpperCase()} ক্যাটাগরির গ্লোবাল সেটিংস সংরক্ষণ ও প্রয়োগ করতে চান?`,
          confirmLabel: 'হ্যাঁ, সংরক্ষণ করুন (Save)',
          cancelLabel: 'বাতিল (Cancel)',
          isDangerous: category === 'security',
          onConfirm: () => handleSaveCategory(category),
        },
      })
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading system configurations securely...</p>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-white font-bold text-base">Configuration Error</h3>
        <p className="text-xs text-slate-400">{error}</p>
      </div>
    );
  }

  const menuItems = [
    { id: 'general', label: 'General Site Config', icon: Globe, color: 'text-sky-400' },
    { id: 'registration', label: 'Registration & Verification', icon: UserCheck, color: 'text-emerald-400' },
    { id: 'social', label: 'Social & Interaction', icon: Share2, color: 'text-violet-400' },
    { id: 'content', label: 'Content & Upload limits', icon: FileText, color: 'text-cyan-400' },
    { id: 'coin', label: 'Coin Economy Config', icon: Coins, color: 'text-amber-400' },
    { id: 'gift', label: '3D Gift Catalog & Anim', icon: Gift, color: 'text-pink-400' },
    { id: 'payment', label: 'Stripe & PayPal Merchant', icon: CreditCard, color: 'text-blue-400' },
    { id: 'sms', label: 'Bulk SMS Credentials', icon: MessageSquare, color: 'text-teal-400' },
    { id: 'advertisement', label: 'AdMob & Ad Campaigns', icon: Radio, color: 'text-orange-400' },
    { id: 'notifications', label: 'Central Push & Mail Channels', icon: Bell, color: 'text-indigo-400' },
    { id: 'security', label: 'Rate-Limits & Maintenance', icon: ShieldAlert, color: 'text-red-400' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-display font-extrabold text-white tracking-wide">
          Centralized Global Platform Settings
        </h2>
        <p className="text-xs text-slate-400">
          Set sitewide rule-engines, limits, third-party api tokens, payment payouts, and maintenance flags safely.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COMPACT TABS */}
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCategory(item.id);
                  setError(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-md'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border border-transparent hover:border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT CATEGORY EDIT PANEL */}
        <div className="lg:col-span-3 liquid-glass-surface p-6 rounded-3xl border border-white/10 space-y-6">
          <div className="border-b border-white/15 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white capitalize">
                {activeCategory} Configurations
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Update values below and click Save Category to write system settings.
              </p>
            </div>
            <button
              onClick={() => confirmAndSaveCategory(activeCategory)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/15 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Category</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* 1. GENERAL SITE CONFIGS */}
            {activeCategory === 'general' && settings?.general && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site Title / Name</label>
                  <input
                    type="text"
                    value={settings.general.siteName || ''}
                    onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description Meta Tag</label>
                  <input
                    type="text"
                    value={settings.general.description || ''}
                    onChange={(e) => handleInputChange('general', 'description', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site Logo URL</label>
                  <input
                    type="text"
                    value={settings.general.logo || ''}
                    onChange={(e) => handleInputChange('general', 'logo', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Favicon URL</label>
                  <input
                    type="text"
                    value={settings.general.favicon || ''}
                    onChange={(e) => handleInputChange('general', 'favicon', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Default Language</label>
                  <input
                    type="text"
                    value={settings.general.language || ''}
                    onChange={(e) => handleInputChange('general', 'language', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Default Timezone</label>
                  <input
                    type="text"
                    value={settings.general.timezone || ''}
                    onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Base System Currency</label>
                  <input
                    type="text"
                    value={settings.general.currency || ''}
                    onChange={(e) => handleInputChange('general', 'currency', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>
            )}

            {/* 2. REGISTRATION CONFIGS */}
            {activeCategory === 'registration' && settings?.registration && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Enable Registrations</h4>
                      <p className="text-[10px] text-slate-400">Allow new user sign ups to the platform</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.registration.registrationEnabled}
                      onChange={(e) => handleInputChange('registration', 'registrationEnabled', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Mandatory Verification</h4>
                      <p className="text-[10px] text-slate-400">Require code verification on sign up</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.registration.verificationRequired}
                      onChange={(e) => handleInputChange('registration', 'verificationRequired', e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">Username Integrity Rules</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Length</label>
                      <input
                        type="number"
                        value={settings.registration.usernameRules?.minLength || 3}
                        onChange={(e) => handleNestedInputChange('registration', 'usernameRules', 'minLength', parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Length</label>
                      <input
                        type="number"
                        value={settings.registration.usernameRules?.maxLength || 20}
                        onChange={(e) => handleNestedInputChange('registration', 'usernameRules', 'maxLength', parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Special Chars</label>
                      <input
                        type="checkbox"
                        checked={settings.registration.usernameRules?.allowSpecialChars}
                        onChange={(e) => handleNestedInputChange('registration', 'usernameRules', 'allowSpecialChars', e.target.checked)}
                        className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">Age Regulations</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Minimum Age Allowed to Sign Up</label>
                    <input
                      type="number"
                      value={settings.registration.ageRules?.minAgeRequired || 13}
                      onChange={(e) => handleNestedInputChange('registration', 'ageRules', 'minAgeRequired', parseInt(e.target.value, 10))}
                      className="w-24 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. SOCIAL CONFIGS */}
            {activeCategory === 'social' && settings?.social && (
              <div className="space-y-4">
                <p className="text-[11px] text-cyan-300 font-bold bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                  Toggle interactive social features of Nixo platform in real-time.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.social).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                      <div>
                        <h4 className="text-xs font-bold text-white capitalize">{key.replace(/([A-Z])/g, ' $1')} Feature</h4>
                        <p className="text-[10px] text-slate-400">Toggle active permissions for {key}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleInputChange('social', key, e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CONTENT & UPLOAD LIMITS */}
            {activeCategory === 'content' && settings?.content && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Media Upload Limit (Images / MB)</label>
                  <input
                    type="number"
                    value={settings.content.imageSizeLimitMb || 10}
                    onChange={(e) => handleInputChange('content', 'imageSizeLimitMb', parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Media Upload Limit (Video / MB)</label>
                  <input
                    type="number"
                    value={settings.content.videoSizeLimitMb || 50}
                    onChange={(e) => handleInputChange('content', 'videoSizeLimitMb', parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Files Per Post</label>
                  <input
                    type="number"
                    value={settings.content.uploadLimits?.maxFilesPerPost || 6}
                    onChange={(e) => handleNestedInputChange('content', 'uploadLimits', 'maxFilesPerPost', parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 mt-5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Automated Moderation</h4>
                    <p className="text-[10px] text-slate-400">Scrape bad words / spam recursively</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.content.moderationEnabled}
                    onChange={(e) => handleInputChange('content', 'moderationEnabled', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 5. COIN ECONOMY */}
            {activeCategory === 'coin' && settings?.coin && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Earning Features Enabled</h4>
                      <p className="text-[10px] text-slate-400">Allow users to earn points/coins by posts & activities</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.coin.earningEnabled}
                      onChange={(e) => handleInputChange('coin', 'earningEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Withdrawal Functionality</h4>
                      <p className="text-[10px] text-slate-400">Allow users to request payout transfers for accumulated coins</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.coin.withdrawalEnabled}
                      onChange={(e) => handleInputChange('coin', 'withdrawalEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Daily Coin Limit</label>
                    <input
                      type="number"
                      value={settings.coin.dailyLimit || 500}
                      onChange={(e) => handleInputChange('coin', 'dailyLimit', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Conversion rate (1 USD = ? Coins)</label>
                    <input
                      type="number"
                      value={settings.coin.conversionRateUsdToCoin || 100}
                      onChange={(e) => handleInputChange('coin', 'conversionRateUsdToCoin', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Payout processing fee (%)</label>
                    <input
                      type="number"
                      value={settings.coin.processingFeePercentage || 2}
                      onChange={(e) => handleInputChange('coin', 'processingFeePercentage', parseFloat(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. GIFT CATALOG */}
            {activeCategory === 'gift' && settings?.gift && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Gift Status Active</h4>
                      <p className="text-[10px] text-slate-400">Enable tipping and 3D visual gifts inside channels</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.gift.statusActive}
                      onChange={(e) => handleInputChange('gift', 'statusActive', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Animations Enabled</h4>
                      <p className="text-[10px] text-slate-400">Play interactive particles animations on receiving</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.gift.animationsEnabled}
                      onChange={(e) => handleInputChange('gift', 'animationsEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-pink-400">Active Gift Catalog</h4>
                  <div className="space-y-2">
                    {settings.gift.catalog?.map((g: any, index: number) => (
                      <div key={g.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{g.icon}</span>
                          <div>
                            <span className="font-bold text-white">{g.name}</span>
                            <p className="text-[10px] text-slate-400 capitalize">Animation: {g.animation}</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-400">{g.priceCoins} Coins</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. PAYMENTS GATEWAYS */}
            {activeCategory === 'payment' && settings?.payment && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Primary Payment Provider</label>
                    <select
                      value={settings.payment.provider || 'stripe'}
                      onChange={(e) => handleInputChange('payment', 'provider', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="stripe">Stripe Checkout</option>
                      <option value="paypal">PayPal</option>
                      <option value="bkash">bKash Merchant</option>
                      <option value="nagad">Nagad API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">API Environment mode</label>
                    <select
                      value={settings.payment.testLiveMode || 'test'}
                      onChange={(e) => handleInputChange('payment', 'testLiveMode', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="test">Sandbox / Testing / Dry-Run</option>
                      <option value="live">Live / Production Merchant</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">Secure Merchant API Credentials</h4>
                  <p className="text-[10px] text-slate-400 italic">Credentials will be masked and secured. They are processed purely server-side.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Stripe Publishable Key</label>
                      <input
                        type="text"
                        value={settings.payment.credentials?.stripePublicKey || ''}
                        onChange={(e) => handleNestedInputChange('payment', 'credentials', 'stripePublicKey', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Stripe Secret Key (Masked)</label>
                      <input
                        type="password"
                        value={settings.payment.credentials?.stripeSecretKey || ''}
                        onChange={(e) => handleNestedInputChange('payment', 'credentials', 'stripeSecretKey', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        placeholder="••••••••••••••••••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. BULK SMS BRIDGES */}
            {activeCategory === 'sms' && settings?.sms && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">SMS Gateway Provider</label>
                  <select
                    value={settings.sms.provider || 'twilio'}
                    onChange={(e) => handleInputChange('sms', 'provider', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="twilio">Twilio Global API</option>
                    <option value="bulksmsbd">BulkSMSBD Bangladesh Server</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-teal-400">Gateway API Access</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account SID / API Key</label>
                      <input
                        type="text"
                        value={settings.sms.credentials?.twilioAccountSid || ''}
                        onChange={(e) => handleNestedInputChange('sms', 'credentials', 'twilioAccountSid', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Auth Token (Masked)</label>
                      <input
                        type="password"
                        value={settings.sms.credentials?.twilioAuthToken || ''}
                        onChange={(e) => handleNestedInputChange('sms', 'credentials', 'twilioAuthToken', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        placeholder="••••••••••••••••••••••••••••••••"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Approved Sender ID / Alpha Number</label>
                    <input
                      type="text"
                      value={settings.sms.senderId || ''}
                      onChange={(e) => handleInputChange('sms', 'senderId', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 9. ADVERTISEMENTS & ADMOB */}
            {activeCategory === 'advertisement' && settings?.advertisement && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Enable Web AdPlacements</h4>
                      <p className="text-[10px] text-slate-400">Serve sponsor cards in feed and sidebar</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.advertisement.webAdsEnabled}
                      onChange={(e) => handleInputChange('advertisement', 'webAdsEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                    <div>
                      <h4 className="text-xs font-bold text-white">Rewarded Video Ads</h4>
                      <p className="text-[10px] text-slate-400">Award coins on successful video watches</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.advertisement.rewardedAdsEnabled}
                      onChange={(e) => handleInputChange('advertisement', 'rewardedAdsEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-orange-400">AdMob Configurations</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Banner Ad Unit ID</label>
                      <input
                        type="text"
                        value={settings.advertisement.admobConfiguration?.bannerAdUnitId || ''}
                        onChange={(e) => handleNestedInputChange('advertisement', 'admobConfiguration', 'bannerAdUnitId', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Rewarded Ad Unit ID</label>
                      <input
                        type="text"
                        value={settings.advertisement.admobConfiguration?.rewardedAdUnitId || ''}
                        onChange={(e) => handleNestedInputChange('advertisement', 'admobConfiguration', 'rewardedAdUnitId', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 10. NOTIFICATION MATRIX */}
            {activeCategory === 'notifications' && settings?.notifications && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-bold bg-slate-900 border border-white/5 p-3 rounded-xl">
                  Control which notification channels are open to the dispatcher engine.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.notifications).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-white/5">
                      <div>
                        <h4 className="text-xs font-bold text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-[10px] text-slate-400">Toggle active permission for this medium</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => handleInputChange('notifications', key, e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. SECURITY & MAINTENANCE */}
            {activeCategory === 'security' && settings?.security && (
              <div className="space-y-4">
                <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 animate-bounce" />
                      <span>SITEPASS MAINTENANCE MODE</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-md">
                      If active, all regular user features and APIs will be blocked showing a translucent maintenance screen. ONLY Admins will be allowed to use and load.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.security.maintenanceMode}
                    onChange={(e) => handleInputChange('security', 'maintenanceMode', e.target.checked)}
                    className="w-5 h-5 rounded accent-red-500 cursor-pointer text-red-600 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rate Limit (Max Requests Per Window)</label>
                    <input
                      type="number"
                      value={settings.security.rateLimitRequests || 100}
                      onChange={(e) => handleInputChange('security', 'rateLimitRequests', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rate Limit Window (Minutes)</label>
                    <input
                      type="number"
                      value={settings.security.rateLimitWindowMinutes || 15}
                      onChange={(e) => handleInputChange('security', 'rateLimitWindowMinutes', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Session Expiration Duration (Hours)</label>
                    <input
                      type="number"
                      value={settings.security.sessionDurationHours || 72}
                      onChange={(e) => handleInputChange('security', 'sessionDurationHours', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Login Attempts Allowed</label>
                    <input
                      type="number"
                      value={settings.security.maxLoginAttempts || 5}
                      onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">2-Factor Authentication (2FA) Setup</label>
                  <select
                    value={settings.security.twoFaArchitecture || 'disabled'}
                    onChange={(e) => handleInputChange('security', 'twoFaArchitecture', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="disabled">Disabled (Single-Factor Secure Password)</option>
                    <option value="email">OTP via Verified Email ID</option>
                    <option value="sms">OTP via BulkSMSBD Phone Link</option>
                    <option value="authenticator">Google Authenticator (TOTP Standard)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
