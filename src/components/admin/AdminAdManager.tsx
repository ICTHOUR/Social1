import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  MousePointer,
  Eye,
  Coins,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Globe,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Layers,
  BarChart2,
  X,
  ExternalLink,
  Sliders,
  Check,
  Activity,
  Terminal,
  Lock,
  Code,
  Copy,
  Cpu,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AdPlacement,
  AdCampaign,
  AdPlatformSettings,
  AdAnalyticsReport,
  AdProviderType,
  AdFormatType,
} from '../../types';

interface HealthCheckData {
  status: 'configured' | 'incomplete' | 'disabled' | 'test_mode';
  enabled: boolean;
  usesTestMode: boolean;
  details: {
    android: {
      appId: string;
      appIdValid: boolean;
      bannerUnitId: string;
      interstitialUnitId: string;
      rewardedUnitId: string;
      nativeUnitId?: string;
      unitsConfigured: boolean;
    };
    ios: {
      appId: string;
      appIdValid: boolean;
      bannerUnitId: string;
      interstitialUnitId: string;
      rewardedUnitId: string;
      nativeUnitId?: string;
      unitsConfigured: boolean;
    };
    security: {
      ssvCryptographicHmacActive: boolean;
      serverVerificationEnforced: boolean;
      clientSideClaimsTrusted: boolean;
      globalDailyRewardCapPerUser: number;
      rewardCooldownSeconds: number;
      rewardDailyCapConfigured: boolean;
      cooldownConfigured: boolean;
    };
    wrapperStatus: {
      mobileBridgeAvailable: boolean;
      wrapperNote: string;
    };
  };
  diagnostics: Array<{
    id: string;
    label: string;
    passed: boolean;
    message: string;
  }>;
}

export const AdminAdManager: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'placements' | 'admob_hub' | 'web_settings'>('overview');

  const [report, setReport] = useState<AdAnalyticsReport | null>(null);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [platformSettings, setPlatformSettings] = useState<AdPlatformSettings | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheckData | null>(null);

  const [loading, setLoading] = useState(true);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');

  // Modals
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);

  // Code snippet toggle for mobile wrapper integration
  const [selectedLanguage, setSelectedLanguage] = useState<'android' | 'ios' | 'capacitor'>('android');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [repRes, placRes, campRes, setRes, healthRes] = await Promise.all([
        fetch('/api/admin/ads/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ads/placements', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ads/campaigns', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ads/settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/ads/admob/health-check', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (repRes.ok) setReport(await repRes.json());
      if (placRes.ok) setPlacements((await placRes.json()).placements || []);
      if (campRes.ok) setCampaigns((await campRes.json()).campaigns || []);
      if (setRes.ok) setPlatformSettings((await setRes.json()).settings);
      if (healthRes.ok) setHealthCheck(await healthRes.json());
    } catch (err: any) {
      console.error('Failed to load ad manager data:', err);
      setErrorMsg('Failed to load ad data');
    } finally {
      setLoading(false);
    }
  };

  const runAdMobDiagnostic = async () => {
    if (!token) return;
    setRunningHealthCheck(true);
    try {
      const res = await fetch('/api/admin/ads/admob/health-check', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHealthCheck(data);
        showNotification('AdMob diagnostic suite executed successfully!');
      }
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setRunningHealthCheck(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Toggle Placement Status
  const handleTogglePlacement = async (placement: AdPlacement) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/ads/placements/${placement.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: !placement.isEnabled }),
      });
      if (res.ok) {
        showNotification(`Placement "${placement.name}" ${!placement.isEnabled ? 'enabled' : 'disabled'}`);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Campaign Status
  const handleToggleCampaignStatus = async (campaign: AdCampaign) => {
    if (!token) return;
    const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        showNotification(`Campaign marked as ${nextStatus}`);
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!token || !confirm('Are you sure you want to permanently delete this ad campaign?')) return;
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showNotification('Campaign deleted successfully');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !platformSettings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ads/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(platformSettings),
      });
      if (res.ok) {
        showNotification('Ad settings updated successfully!');
        fetchAllData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update ad settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.advertiserName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || c.provider === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'configured':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Configured
          </span>
        );
      case 'test_mode':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5" />
            Test Mode Active
          </span>
        );
      case 'incomplete':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-lg shadow-rose-500/10">
            <XCircle className="w-3.5 h-3.5" />
            Incomplete Setup
          </span>
        );
      case 'disabled':
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-800 text-white/50 border border-white/10 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Disabled
          </span>
        );
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const androidCodeSnippet = `// Kotlin / Java WebView AdMob Bridge Implementation for Android Wrapper
class AdMobJSBridge(private val context: Context, private val webView: WebView) {
    @JavascriptInterface
    fun showRewardedAd(challengeToken: String, rewardAmount: Int) {
        val rewardedAd = RewardedAd(context, "${platformSettings?.admobAndroidRewardedUnitId || 'ca-app-pub-3940256099942544/5224354917'}")
        rewardedAd.loadAd(AdRequest.Builder().build()) {
            rewardedAd.show { reward ->
                // Callback to Web Frontend via JS Nonce Token Validation
                webView.post {
                    webView.evaluateJavascript("window.onAdMobRewardCompleted('\${challengeToken}')", null)
                }
            }
        }
    }
}`;

  const iosCodeSnippet = `// Swift WKScriptMessageHandler Implementation for iOS Wrapper
class AdMobScriptHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "AdMobBridge", let body = message.body as? [String: Any],
           let token = body["challengeToken"] as? String {
            GADRewardedAd.load(withAdUnitID: "${platformSettings?.admobIosRewardedUnitId || 'ca-app-pub-3940256099942544/1712485313'}", request: GADRequest()) { ad, error in
                ad?.present(fromRootViewController: currentVC) {
                    webView.evaluateJavaScript("window.onAdMobRewardCompleted('\(token)')")
                }
            }
        }
    }
}`;

  const capacitorCodeSnippet = `// TypeScript / Capacitor AdMob Community Plugin Setup
import { AdMob, RewardItem } from '@capacitor-community/admob';

export async function showMobileRewardedAd(challengeToken: string): Promise<boolean> {
  await AdMob.prepareRewardVideoAd({
    adId: '${platformSettings?.admobAndroidRewardedUnitId || 'ca-app-pub-3940256099942544/5224354917'}',
    isTesting: ${platformSettings?.admobAndroidAppId.includes('3940256099942544') ? 'true' : 'false'},
  });
  
  return new Promise((resolve) => {
    AdMob.addListener('onRewardVideoRewardCode', (reward: RewardItem) => {
      resolve(true);
    });
    AdMob.showRewardVideoAd();
  });
}`;

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-cyan-500/15 border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-neutral-950 font-black shadow-lg shadow-amber-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Nixo Advertising & AdMob Engine
              </h2>
              <p className="text-xs text-white/60">
                Separated Web & Mobile Advertising Hub with Cryptographically Enforced Server-Side Verification.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            title="Refresh All Data"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingCampaign(null);
              setShowCreateCampaignModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Ad Campaign</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5 animate-slide-up">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-x-auto">
        {[
          { id: 'overview', label: 'Reporting & Analytics', icon: BarChart2 },
          { id: 'campaigns', label: 'Campaigns', icon: Layers },
          { id: 'placements', label: 'Placements & Frequency', icon: Sliders },
          { id: 'admob_hub', label: 'Mobile AdMob Hub & Health', icon: Smartphone, highlight: true },
          { id: 'web_settings', label: 'Web Ads Settings', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? tab.highlight
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 text-white border border-cyan-500/30 shadow-md'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.highlight && !isActive ? 'text-amber-400' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REPORTING & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
              <div className="p-2 w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 mb-3 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/50 font-medium">Total Impressions</span>
              <div className="text-2xl font-black text-white mt-1">
                {(report?.summary.totalImpressions || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
                Tracked across Web & Mobile
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
              <div className="p-2 w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-3 flex items-center justify-center">
                <MousePointer className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/50 font-medium">Total Clicks</span>
              <div className="text-2xl font-black text-white mt-1">
                {(report?.summary.totalClicks || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-cyan-400 font-semibold mt-1 block">
                Overall CTR: {report?.summary.overallCtr || 0}%
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
              <div className="p-2 w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/50 font-medium">Estimated Revenue</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ${(report?.summary.estimatedRevenueUsd || 0).toFixed(2)}
              </div>
              <span className="text-[11px] text-white/40 block mt-1">Direct Sponsors + Networks</span>
            </div>

            <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
              <div className="p-2 w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-3 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/50 font-medium">Rewarded Coins Claimed</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {(report?.summary.totalCoinsAwarded || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-amber-300/80 font-medium block mt-1">
                {report?.summary.rewardsClaimed || 0} claims verified via SSV
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Provider Share
                </h3>
                <span className="text-xs text-white/40">Real-time</span>
              </div>

              <div className="space-y-3 pt-2">
                {(report?.providerDistribution || []).map((prov) => (
                  <div key={prov.provider} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white capitalize flex items-center gap-1.5">
                        {prov.provider === 'admob' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
                        {prov.provider === 'direct_sponsor' && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                        {prov.provider === 'web_provider' && <Globe className="w-3.5 h-3.5 text-indigo-400" />}
                        {prov.provider === 'internal' && <Sparkles className="w-3.5 h-3.5 text-pink-400" />}
                        {prov.provider?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span className="text-white/60">
                        {prov.impressions.toLocaleString()} imps ({prov.sharePercent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prov.provider === 'admob'
                            ? 'bg-amber-400'
                            : prov.provider === 'direct_sponsor'
                            ? 'bg-cyan-400'
                            : prov.provider === 'web_provider'
                            ? 'bg-indigo-400'
                            : 'bg-pink-400'
                        }`}
                        style={{ width: `${prov.sharePercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Impression Velocity & Engagement Trend
                </h3>
                <span className="text-xs text-white/40">Last 14 Days</span>
              </div>

              <div className="h-44 flex items-end gap-2 pt-4 px-2">
                {(report?.dailyTrends || []).map((day) => {
                  const maxImps = Math.max(...(report?.dailyTrends.map((d) => d.impressions) || [1]), 100);
                  const heightPercent = Math.max(15, (day.impressions / maxImps) * 100);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 border border-white/10 text-[10px] text-white p-1.5 rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-xl">
                        {day.date}: {day.impressions} imps | {day.clicks} clks (${day.revenueUsd.toFixed(2)})
                      </div>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-600/30 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 transition-all cursor-pointer"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[9px] text-white/40 font-mono mt-1">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN MANAGER */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns or advertisers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
              </select>

              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="all">All Providers</option>
                <option value="internal">Internal</option>
                <option value="direct_sponsor">Direct Sponsor</option>
                <option value="web_provider">Web Provider</option>
                <option value="admob">Google AdMob</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          camp.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-neutral-800 text-white/50 border-white/10'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/70 border border-white/10">
                        {camp.provider}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white line-clamp-1">{camp.title}</h4>
                    <p className="text-xs text-white/50">Advertiser: {camp.advertiserName}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleCampaignStatus(camp)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                    >
                      {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCampaign(camp);
                        setShowCreateCampaignModal(true);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white/[0.02] p-3 rounded-2xl border border-white/5 text-xs text-center">
                  <div>
                    <span className="text-white/40 block text-[10px]">Impressions</span>
                    <span className="font-bold text-white">{camp.impressionsCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Clicks / CTR</span>
                    <span className="font-bold text-cyan-400">
                      {camp.clicksCount} ({camp.impressionsCount > 0 ? ((camp.clicksCount / camp.impressionsCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Budget Spent</span>
                    <span className="font-bold text-emerald-400">
                      ${camp.spentBudgetUsd.toFixed(2)} / ${camp.totalBudgetUsd.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PLACEMENTS & SLOTS */}
      {activeTab === 'placements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placements.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase">
                        {p.placementType}
                      </span>
                      <span className="text-xs text-white/40 font-mono">{p.id}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{p.name}</h4>
                    <p className="text-xs text-white/60 leading-relaxed">{p.description}</p>
                  </div>

                  <button
                    onClick={() => handleTogglePlacement(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      p.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-white/40 border border-white/10'
                    }`}
                  >
                    {p.isEnabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{p.isEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-white/40 block text-[10px]">Allowed Providers:</span>
                    <span className="font-medium text-white truncate block">
                      {p.allowedProviders.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Frequency Limits:</span>
                    <span className="font-medium text-cyan-300">
                      {p.frequencyCapHourly}/hr, {p.frequencyCapDaily}/day
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Rewarded Coins:</span>
                    <span className="font-bold text-amber-400">
                      {p.rewardCoins > 0 ? `+${p.rewardCoins} coins` : 'None (Organic)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px]">Cooldown Window:</span>
                    <span className="font-medium text-white">{p.cooldownMinutes} minutes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DEDICATED MOBILE ADMOB HUB & INTEGRATION DIAGNOSTICS */}
      {activeTab === 'admob_hub' && platformSettings && (
        <div className="space-y-6">
          {/* Top Status Banner & Diagnostics Trigger */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-yellow-950/20 to-black/80 border border-amber-500/30 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">Google AdMob Configuration Hub</h3>
                    {getStatusBadge(healthCheck?.status)}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    Mobile Native App Wrapper Integration (Android, iOS & Cross-Platform Bridge)
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={runAdMobDiagnostic}
              disabled={runningHealthCheck}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Activity className={`w-4 h-4 ${runningHealthCheck ? 'animate-spin' : ''}`} />
              <span>{runningHealthCheck ? 'Running Diagnostic...' : 'Run Integration Health Check'}</span>
            </button>
          </div>

          {/* Integration Health Diagnostic Suite */}
          {healthCheck && (
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Integration Health Inspection Suite
                  </h4>
                </div>
                <span className="text-xs text-white/40 font-mono">
                  Verified by Server Engine
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {healthCheck.diagnostics.map((diag) => (
                  <div
                    key={diag.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                      diag.passed
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{diag.label}</span>
                      {diag.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">{diag.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AdMob Configuration Form */}
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    AdMob App & Unit IDs
                  </h4>
                  <p className="text-xs text-white/50">
                    Replace test IDs with production AdMob unit identifiers when publishing mobile apps.
                  </p>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={platformSettings.admobEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, admobEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-amber-500"
                  />
                  <span className="text-xs font-bold text-white">AdMob Provider Enabled</span>
                </label>
              </div>

              {/* Android Units */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Android Native Configuration
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Android AdMob App ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobAndroidAppId}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, admobAndroidAppId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Android Banner Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobAndroidBannerUnitId}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, admobAndroidBannerUnitId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Android Interstitial Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobAndroidInterstitialUnitId}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          admobAndroidInterstitialUnitId: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Android Rewarded Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobAndroidRewardedUnitId}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          admobAndroidRewardedUnitId: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">Android Native Ad Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobAndroidNativeUnitId || ''}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          admobAndroidNativeUnitId: e.target.value,
                        })
                      }
                      placeholder="ca-app-pub-3940256099942544/2247696110"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* iOS Units */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  iOS Native Configuration
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">iOS AdMob App ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobIosAppId}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, admobIosAppId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">iOS Banner Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobIosBannerUnitId}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, admobIosBannerUnitId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">iOS Interstitial Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobIosInterstitialUnitId}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          admobIosInterstitialUnitId: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">iOS Rewarded Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobIosRewardedUnitId}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, admobIosRewardedUnitId: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">iOS Native Ad Unit ID</label>
                    <input
                      type="text"
                      value={platformSettings.admobIosNativeUnitId || ''}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          admobIosNativeUnitId: e.target.value,
                        })
                      }
                      placeholder="ca-app-pub-3940256099942544/3986624511"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rewarded Rules */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  Rewarded Coins Security Rules
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">
                      Daily Rewarded Coin Cap Per User
                    </label>
                    <input
                      type="number"
                      value={platformSettings.globalDailyRewardCapPerUser}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          globalDailyRewardCapPerUser: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:border-amber-400 focus:outline-none font-bold text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1 font-medium">
                      Reward Cooldown Window (Seconds)
                    </label>
                    <input
                      type="number"
                      value={platformSettings.rewardCooldownSeconds}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          rewardCooldownSeconds: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save AdMob Settings'}
                </button>
              </div>
            </div>
          </form>

          {/* Server-Side Verification SSV Security Vault */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-black to-neutral-950 border border-indigo-500/30 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  Server-Side Verification (SSV) Vault & Anti-Fraud Engine
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active & Enforced
                  </span>
                </h4>
                <p className="text-xs text-white/50">
                  Client claims without cryptographic server challenge nonces are unconditionally blocked.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-semibold text-indigo-300 block">Step 1: Nonce Issuance</span>
                <p className="text-white/60 leading-relaxed text-[11px]">
                  When a user launches a rewarded ad session, the backend generates an HMAC token linked to user ID, placement, and timestamp.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-semibold text-indigo-300 block">Step 2: Watch Duration Gate</span>
                <p className="text-white/60 leading-relaxed text-[11px]">
                  The server requires a minimum 15-second watch duration before accepting a reward claim token for verification.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-semibold text-indigo-300 block">Step 3: Atomic Credit</span>
                <p className="text-white/60 leading-relaxed text-[11px]">
                  Daily user limits and cooldown intervals are verified before writing coin updates into the database ledger.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Wrapper Developer Integration Guide */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Mobile App Wrapper Connection Guide
                </h4>
                <p className="text-xs text-white/50">
                  Embed this bridge code into your mobile wrapper (Android WebView, iOS Swift, or Capacitor).
                </p>
              </div>

              {/* Language Picker */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                {(['android', 'ios', 'capacitor'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      selectedLanguage === lang
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed">
                {selectedLanguage === 'android' && androidCodeSnippet}
                {selectedLanguage === 'ios' && iosCodeSnippet}
                {selectedLanguage === 'capacitor' && capacitorCodeSnippet}
              </pre>

              <button
                onClick={() =>
                  copyCodeToClipboard(
                    selectedLanguage === 'android'
                      ? androidCodeSnippet
                      : selectedLanguage === 'ios'
                      ? iosCodeSnippet
                      : capacitorCodeSnippet
                  )
                }
                className="absolute top-3 right-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? 'Copied' : 'Copy Snippet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WEB ADVERTISING SETTINGS */}
      {activeTab === 'web_settings' && platformSettings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-cyan-500/30 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Web Advertising Provider Settings</h3>
                  <p className="text-xs text-white/50">
                    Open web networks, responsive tags, direct sponsors, and internal ads.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.webAdsEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, webAdsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-cyan-500"
                  />
                  <span>Web Ads</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.directSponsorsEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, directSponsorsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-cyan-500"
                  />
                  <span>Direct Sponsors</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.internalAdsEnabled}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, internalAdsEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-cyan-500"
                  />
                  <span>Internal Ads</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-white/60 mb-1 font-medium">Web Ad Network Display Name</label>
                <input
                  type="text"
                  value={platformSettings.webAdNetworkName}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, webAdNetworkName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white/60 mb-1 font-medium">Ad-Blocker Policy</label>
                <select
                  value={platformSettings.adBlockerDetectionMode}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      adBlockerDetectionMode: e.target.value as any,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="lenient">Lenient (Passive fallbacks)</option>
                  <option value="notice">Notice (Support creator banner)</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white/60 mb-1 text-xs font-medium">Header Script Tag / Web Ad Code</label>
              <textarea
                rows={4}
                value={platformSettings.webHeaderScript || ''}
                onChange={(e) =>
                  setPlatformSettings({ ...platformSettings, webHeaderScript: e.target.value })
                }
                placeholder='<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" async></script>'
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 font-bold text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Web Advertising Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {showCreateCampaignModal && (
        <CampaignFormModal
          campaign={editingCampaign}
          placements={placements}
          onClose={() => setShowCreateCampaignModal(false)}
          onSaved={() => {
            setShowCreateCampaignModal(false);
            fetchAllData();
            showNotification('Campaign saved successfully!');
          }}
        />
      )}
    </div>
  );
};

// Subcomponent: Campaign Form Modal
interface CampaignFormModalProps {
  campaign: AdCampaign | null;
  placements: AdPlacement[];
  onClose: () => void;
  onSaved: () => void;
}

const CampaignFormModal: React.FC<CampaignFormModalProps> = ({
  campaign,
  placements,
  onClose,
  onSaved,
}) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState<Partial<AdCampaign>>({
    title: campaign?.title || '',
    advertiserName: campaign?.advertiserName || '',
    status: campaign?.status || 'active',
    provider: campaign?.provider || 'direct_sponsor',
    adFormat: campaign?.adFormat || 'native',
    placements: campaign?.placements || ['feed_inline'],
    headline: campaign?.headline || '',
    bodyText: campaign?.bodyText || '',
    callToAction: campaign?.callToAction || 'Learn More',
    destinationUrl: campaign?.destinationUrl || '',
    mediaUrl: campaign?.mediaUrl || '',
    mediaType: campaign?.mediaType || 'image',
    htmlSnippet: campaign?.htmlSnippet || '',
    admobUnitId: campaign?.admobUnitId || '',
    pricingModel: campaign?.pricingModel || 'cpm',
    bidAmountUsd: campaign?.bidAmountUsd ?? 3.5,
    totalBudgetUsd: campaign?.totalBudgetUsd ?? 500.0,
    dailyBudgetUsd: campaign?.dailyBudgetUsd ?? 50.0,
    startDate: campaign?.startDate || new Date().toISOString().slice(0, 10),
    rewardCoins: campaign?.rewardCoins ?? 0,
    targetingConfig: campaign?.targetingConfig || { device: 'all' },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);

    try {
      const url = campaign ? `/api/admin/ads/campaigns/${campaign.id}` : '/api/admin/ads/campaigns';
      const method = campaign ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save campaign');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error saving campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-bold text-white">
            {campaign ? 'Edit Campaign' : 'Create New Ad Campaign'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-white/40 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 mb-1 font-medium">Campaign Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Summer Tech Sale 2026"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-1 font-medium">Advertiser Name</label>
              <input
                type="text"
                required
                value={formData.advertiserName}
                onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                placeholder="Nixo Partners Inc"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-white/60 mb-1 font-medium">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as AdProviderType })}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white focus:outline-none"
              >
                <option value="direct_sponsor">Direct Sponsor</option>
                <option value="web_provider">Web Network</option>
                <option value="internal">Internal Spotlight</option>
                <option value="admob">Google AdMob</option>
              </select>
            </div>
            <div>
              <label className="block text-white/60 mb-1 font-medium">Ad Format</label>
              <select
                value={formData.adFormat}
                onChange={(e) => setFormData({ ...formData, adFormat: e.target.value as AdFormatType })}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white focus:outline-none"
              >
                <option value="native">Native Card</option>
                <option value="banner">Banner</option>
                <option value="interstitial">Interstitial Fullscreen</option>
                <option value="rewarded">Rewarded Video</option>
              </select>
            </div>
            <div>
              <label className="block text-white/60 mb-1 font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-white focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-white/60 mb-1 font-medium">Headline</label>
            <input
              type="text"
              required
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              placeholder="Upgrade Your Digital Identity"
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white/60 mb-1 font-medium">Body Description</label>
            <textarea
              rows={2}
              required
              value={formData.bodyText}
              onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
              placeholder="Experience next-generation decentralized social network featuring verified coin rewards."
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 mb-1 font-medium">Destination URL</label>
              <input
                type="url"
                required
                value={formData.destinationUrl}
                onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                placeholder="https://example.com/landing"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-1 font-medium">Call to Action Text</label>
              <input
                type="text"
                value={formData.callToAction}
                onChange={(e) => setFormData({ ...formData, callToAction: e.target.value })}
                placeholder="Explore Now"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 mb-1 font-medium">Media URL (Image or Video)</label>
              <input
                type="text"
                value={formData.mediaUrl || ''}
                onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white/60 mb-1 font-medium">Rewarded Coins Award (if applicable)</label>
              <input
                type="number"
                value={formData.rewardCoins}
                onChange={(e) => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition shadow-lg shadow-cyan-500/25"
            >
              {saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
