import React, { useState } from 'react';
import {
  ExternalLink,
  Info,
  X,
  Smartphone,
  Star,
  Download,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export interface AdMobBannerProps {
  placement?: string;
  className?: string;
  variant?: 'banner' | 'medium_rectangle' | 'compact' | 'reels_overlay' | 'interstitial' | 'native';
  onDismiss?: () => void;
  onAdClosed?: () => void;
}

interface DemoAdCreative {
  id: string;
  brand: string;
  headline: string;
  description: string;
  rating: number;
  reviews: string;
  ctaText: string;
  category: string;
  iconUrl: string;
  bannerUrl?: string;
  targetUrl: string;
  adUnitId: string;
}

const DEMO_CREATIVES: DemoAdCreative[] = [
  {
    id: 'admob_creative_1',
    brand: 'Google Cloud Platform',
    headline: 'Build with Next-Gen Gemini AI Models',
    description: 'Scale intelligence with high-throughput multimodal AI APIs on Google Cloud enterprise infrastructure.',
    rating: 4.8,
    reviews: '240K+',
    ctaText: 'Start Free Trial',
    category: 'Developer Tools',
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://cloud.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
  {
    id: 'admob_creative_2',
    brand: 'CyberPulse Neo RPG',
    headline: 'Experience 4K Open-World Cyber Warfare',
    description: 'Join over 10 million operatives worldwide. Real-time tactical battles, high-fidelity graphics & liquid neon visuals.',
    rating: 4.9,
    reviews: '1.2M',
    ctaText: 'Install Now',
    category: 'Action Games',
    iconUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/2247696110',
  },
  {
    id: 'admob_creative_3',
    brand: 'FinWave Liquid Wallet',
    headline: 'Zero-Fee Global Multi-Currency Payments',
    description: 'Send money instantly across 140+ countries. 256-bit encryption & instant currency exchange with real-time tracking.',
    rating: 4.7,
    reviews: '850K',
    ctaText: 'Get App',
    category: 'Finance',
    iconUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
  {
    id: 'admob_creative_4',
    brand: 'FitNova Pro Trainer',
    headline: 'AI-Powered Personalized Daily Workouts',
    description: 'Transform your fitness with adaptive coaching algorithms, nutrition plans, and wearable sync.',
    rating: 4.8,
    reviews: '520K',
    ctaText: 'Try for Free',
    category: 'Health & Fitness',
    iconUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/2247696110',
  },
];

export const AdMobBanner: React.FC<AdMobBannerProps> = ({
  placement = 'feed_inline',
  className = '',
  variant = 'banner',
  onDismiss,
  onAdClosed,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [creativeIndex] = useState(() => Math.floor(Math.random() * DEMO_CREATIVES.length));
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [configuredUnitId, setConfiguredUnitId] = useState<string | null>(null);
  const [admobGloballyEnabled, setAdmobGloballyEnabled] = useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/ads/public-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.admob) return;
        setAdmobGloballyEnabled(data.admob.enabled);
        const android = data.admob.android;
        if (android) {
          if (variant === 'interstitial' && android.interstitialUnitId) {
            setConfiguredUnitId(android.interstitialUnitId);
          } else if (variant === 'native' && android.nativeUnitId) {
            setConfiguredUnitId(android.nativeUnitId);
          } else if (android.bannerUnitId) {
            setConfiguredUnitId(android.bannerUnitId);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [variant]);

  React.useEffect(() => {
    if (variant !== 'interstitial') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [variant]);

  if (dismissed || !admobGloballyEnabled) return null;

  const creative = DEMO_CREATIVES[creativeIndex] || DEMO_CREATIVES[0];
  const activeAdUnitId = configuredUnitId || creative.adUnitId;

  const handleAction = () => {
    window.open(creative.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    setDismissed(true);
    onDismiss?.();
    onAdClosed?.();
  };

  // 0. FULLSCREEN INTERSTITIAL ADMOB VARIANT
  if (variant === 'interstitial') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-300">
        <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-amber-500/40 shadow-[0_0_80px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top Bar with Skip Countdown */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/15 via-black/40 to-transparent border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Smartphone className="w-3 h-3" /> AdMob · Fullscreen Ad
              </span>
              <span className="text-xs text-amber-200/90 font-medium">
                {creative.brand}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {canSkip ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white text-white hover:text-black font-extrabold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Skip Ad</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                  <span>Ad in {countdown}s</span>
                </span>
              )}
            </div>
          </div>

          {/* Media / Video Showcase */}
          <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] bg-black/80 overflow-hidden group">
            {creative.bannerUrl && (
              <img
                src={creative.bannerUrl}
                alt={creative.headline}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex flex-col justify-end p-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold backdrop-blur-md w-fit mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Google AdMob Verified Campaign</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md">
                {creative.headline}
              </h3>
            </div>
          </div>

          {/* Bottom Card & CTA */}
          <div className="p-4 sm:p-5 bg-slate-900/95 border-t border-white/10 space-y-3.5 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={creative.iconUrl}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover border border-white/15 shadow-md shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white truncate">{creative.brand}</span>
                  <span className="text-[10px] text-amber-400 font-semibold">★ {creative.rating}</span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                  {creative.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleAction}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{creative.ctaText}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                title="Ad Info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. REELS OVERLAY VARIANT (Ultra-sleek floating glass pill inside Reels / Feels)
  if (variant === 'reels_overlay') {
    return (
      <div
        className={`w-full max-w-[340px] sm:max-w-sm rounded-2xl bg-black/65 hover:bg-black/75 backdrop-blur-xl border border-amber-400/40 p-2 sm:p-2.5 shadow-2xl text-white select-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <Smartphone className="w-2.5 h-2.5" /> Ad · AdMob
            </span>
            <span className="text-[10px] text-amber-200/90 font-medium truncate max-w-[130px]">
              {creative.brand}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="p-1 rounded-md text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Ad details"
            >
              <Info className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                onDismiss?.();
              }}
              className="p-1 rounded-md text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Hide Ad"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <img
            src={creative.iconUrl}
            alt={creative.brand}
            className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0 shadow-sm"
          />

          <div className="flex-1 min-w-0 pr-1">
            <h5 className="font-bold text-xs text-white leading-tight truncate">
              {creative.headline}
            </h5>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-300 mt-0.5">
              <div className="flex items-center text-amber-400">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span className="font-bold ml-0.5">{creative.rating}</span>
              </div>
              <span>·</span>
              <span className="truncate">{creative.category}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1"
          >
            <span>{creative.ctaText}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Info Modal */}
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-amber-500/30 p-4 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-bold text-xs text-amber-400">Google AdMob Test Unit</span>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This is a verified Google AdMob Demo Banner. Integration supports live App ID & Ad Unit ID rendering on Web, Android & iOS platforms.
              </p>
              <div className="text-[10px] font-mono text-cyan-400 bg-black/40 p-2 rounded-lg break-all">
                Unit ID: {creative.adUnitId}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. COMPACT / HORIZONTAL LEADERBOARD / SIDEBAR BANNER
  if (variant === 'compact') {
    return (
      <div
        className={`w-full rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-3 shadow-lg flex items-center justify-between gap-3 text-slate-900 dark:text-white transition-all duration-300 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={creative.iconUrl}
              alt={creative.brand}
              className="w-11 h-11 rounded-xl object-cover border border-black/10 dark:border-white/10 shadow-xs"
            />
            <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[8px] uppercase">
              Ad
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {creative.headline}
              </h5>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {creative.brand} · {creative.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            {creative.ctaText}
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            title="Hide Ad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. STANDARD IN-FEED ADMOB BANNER (Used every 2-3 posts in SocialFeed)
  return (
    <div
      className={`w-full rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-amber-500/30 dark:border-amber-500/30 shadow-xl overflow-hidden text-slate-900 dark:text-white transition-all duration-300 hover:border-amber-400/50 ${className}`}
    >
      {/* Ad Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-xs">
            <Smartphone className="w-3 h-3" /> AdMob by Google
          </span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
            Sponsored · {creative.brand}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            title="AdMob Ad Info"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            title="Dismiss Ad"
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info Disclosure */}
      {showInfo && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>Ad Unit: <code className="font-mono">{activeAdUnitId}</code> ({placement})</span>
          <span className="font-bold">Verified AdMob Unit</span>
        </div>
      )}

      {/* Ad Creative Body */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {creative.bannerUrl && (
          <div
            onClick={handleAction}
            className="relative rounded-2xl overflow-hidden h-40 sm:h-48 bg-black/20 border border-black/5 dark:border-white/10 cursor-pointer group"
          >
            <img
              src={creative.bannerUrl}
              alt={creative.headline}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured AdMob Sponsored Highlight</span>
              </div>
            </div>
          </div>
        )}

        {/* Content details and CTA */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={creative.iconUrl}
              alt={creative.brand}
              className="w-12 h-12 rounded-2xl object-cover border border-black/10 dark:border-white/15 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {creative.headline}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                {creative.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <div className="flex items-center text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="ml-1">{creative.rating}</span>
                </div>
                <span>·</span>
                <span>{creative.reviews} downloads</span>
                <span>·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{creative.category}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{creative.ctaText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
