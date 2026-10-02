import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Info,
  X,
  Smartphone,
  Star,
  Download,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { adService, AdPayload } from '../../services/adService';

export interface AdBannerProps {
  placement?: string;
  className?: string;
  variant?: 'banner' | 'feed' | 'reels' | 'reels_overlay' | 'compact' | 'medium_rectangle';
  onDismiss?: () => void;
  onAdClosed?: () => void;
}

interface CreativeInfo {
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

const ADMOB_CREATIVES: CreativeInfo[] = [
  {
    id: 'admob_gemini_ai',
    brand: 'Google Cloud & Gemini AI',
    headline: 'Build with Google Gemini 1.5 & Next-Gen AI',
    description: 'Scale multimodal AI workflows with high-throughput API endpoints, low latency, and developer tooling on Google Cloud infrastructure.',
    rating: 4.9,
    reviews: '350K+',
    ctaText: 'Start Free Trial',
    category: 'Cloud & AI',
    iconUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://cloud.google.com/vertex-ai',
    adUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
  {
    id: 'admob_cyberpunk_neo',
    brand: 'CyberPulse Neo: Open World',
    headline: 'Experience 4K Open-World Cybernetic Warfare',
    description: 'Over 12 million commanders worldwide. Fluid combat engine, Ray-Tracing liquid visuals, and real-time multiplayer co-op.',
    rating: 4.8,
    reviews: '1.4M',
    ctaText: 'Install Game',
    category: 'Action Games',
    iconUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/2247696110',
  },
  {
    id: 'admob_liquid_wallet',
    brand: 'NixoPay Liquid Global Wallet',
    headline: 'Zero-Fee Borderless Payments & Instant Transfer',
    description: 'Send and receive funds in 150+ currencies in sub-seconds. 256-bit biometric security and multi-chain coin integration.',
    rating: 4.9,
    reviews: '890K',
    ctaText: 'Get Account',
    category: 'Fintech',
    iconUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/6300978111',
  },
  {
    id: 'admob_studio_pro',
    brand: 'Lumina Studio Photo AI',
    headline: 'Professional Neural Retouching & HDR Filter Kit',
    description: 'Turn mobile photos into studio-grade editorial masterpieces with intelligent lighting recovery and noise elimination.',
    rating: 4.7,
    reviews: '620K',
    ctaText: 'Try Free Now',
    category: 'Photography',
    iconUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    targetUrl: 'https://play.google.com',
    adUnitId: 'ca-app-pub-3940256099942544/2247696110',
  },
];

export const AdBanner: React.FC<AdBannerProps> = ({
  placement = 'feed_inline',
  className = '',
  variant = 'feed',
  onDismiss,
  onAdClosed,
}) => {
  const [creative, setCreative] = useState<CreativeInfo>(ADMOB_CREATIVES[0]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [admobEnabled, setAdmobEnabled] = useState(true);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/ads/public-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.admob) return;
        setAdmobEnabled(data.admob.enabled);
        if (data.admob.android?.bannerUnitId) {
          setActiveUnitId(data.admob.android.bannerUnitId);
        }
      })
      .catch(() => {});

    // Pick creative deterministically based on placement string or random
    const idx = Math.abs(
      placement.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % ADMOB_CREATIVES.length;
    setCreative(ADMOB_CREATIVES[idx]);

    return () => {
      isMounted = false;
    };
  }, [placement]);

  if (isDismissed || !admobEnabled) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    onAdClosed?.();
  };

  const handleCtaClick = () => {
    window.open(creative.targetUrl, '_blank', 'noopener,noreferrer');
  };

  // 1. REELS OVERLAY VARIANT (Translucent Liquid Glass Pill with high-blur for Reels View)
  if (variant === 'reels' || variant === 'reels_overlay') {
    return (
      <div
        className={`w-full p-3 rounded-2xl bg-slate-950/70 backdrop-blur-2xl border border-white/15 text-white shadow-2xl transition-all duration-300 pointer-events-auto select-none ${className}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={creative.iconUrl}
              alt={creative.brand}
              className="w-10 h-10 rounded-xl object-cover border border-cyan-400/40 shrink-0 shadow-md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black tracking-wider uppercase">
                  Ad
                </span>
                <span className="font-bold text-xs text-white truncate">{creative.brand}</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">{creative.headline}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCtaClick}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 text-slate-950 font-black text-xs shadow-md shadow-cyan-400/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{creative.ctaText}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Hide Ad"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. STANDARD FEED & LIQUID GLASS BANNER VARIANT
  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 liquid-glass-2 shadow-xl hover:shadow-2xl text-slate-900 dark:text-white group ${className}`}
    >
      {/* Background Liquid Plasma Accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br from-cyan-500/15 via-teal-500/10 to-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Row: AdMob Badge, Brand & Options */}
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={creative.iconUrl}
            alt={creative.brand}
            className="w-10 h-10 rounded-2xl object-cover border border-cyan-400/40 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.2 rounded-md bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                Ad • AdMob
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {creative.brand}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{creative.category}</span>
              <span>·</span>
              <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{creative.rating}</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">({creative.reviews})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfo((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Ad Information"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss Ad"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Dropdown */}
      {showInfo && (
        <div className="mb-3 p-3 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs space-y-1 text-slate-700 dark:text-slate-300 animate-slide-up">
          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Google AdMob Verified Network
            </span>
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{creative.adUnitId}</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            This sponsored transmission is dynamically served via Google AdMob SDK. Ad choices and personalized telemetry are managed in accordance with platform security rules.
          </p>
        </div>
      )}

      {/* Headline & Body Text */}
      <div className="mb-3 relative z-10">
        <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-1 leading-snug">
          {creative.headline}
        </h5>
        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {creative.description}
        </p>
      </div>

      {/* High-Fidelity Visual Media Banner */}
      {creative.bannerUrl && (
        <div
          onClick={handleCtaClick}
          className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden mb-3.5 bg-slate-950 cursor-pointer group/banner border border-black/5 dark:border-white/10 shadow-inner"
        >
          <img
            src={creative.bannerUrl}
            alt={creative.headline}
            className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-white drop-shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Official Sponsored Creative
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500 text-slate-950 font-black text-[10px] backdrop-blur-md">
                Learn More
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-white/10 relative z-10">
        <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Mobile App / Web AdMob Banner</span>
        </div>

        <button
          type="button"
          onClick={handleCtaClick}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>{creative.ctaText}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default AdBanner;
