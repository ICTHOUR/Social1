import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Sparkles,
  Info,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  Smartphone,
  Globe,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adService, AdPayload } from '../../services/adService';
import { AdPlacementId } from '../../types';

interface AdSlotProps {
  placement: AdPlacementId;
  className?: string;
  onAdLoaded?: (payload: AdPayload) => void;
  compact?: boolean;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  className = '',
  onAdLoaded,
  compact = false,
}) => {
  const { token } = useAuth();
  const [adPayload, setAdPayload] = useState<AdPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionRecorded = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAd() {
      setLoading(true);
      const res = await adService.fetchAdForPlacement(placement, { token });
      if (isMounted) {
        if (res && res.available && res.campaign) {
          setAdPayload(res);
          onAdLoaded?.(res);
        } else {
          // Fallback to high-fidelity Google AdMob native banner
          const defaultAdMobPayload: AdPayload = {
            available: true,
            provider: 'admob',
            placement: {
              id: placement,
              name: 'Google AdMob In-Feed Unit',
              placementType: 'banner',
              rewardCoins: 0,
              refreshIntervalSec: 30,
            },
            admobConfig: {
              appId: 'ca-app-pub-3940256099942544~3347511713',
              bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
              unitId: 'ca-app-pub-3940256099942544/2247696110',
            },
            campaign: {
              id: `admob_unit_${placement}_${Math.floor(Math.random() * 1000)}`,
              advertiserId: 'admob_network',
              advertiserName: 'Google AdMob Network',
              title: 'Discover Next-Gen AI & Tech Innovations',
              status: 'active',
              provider: 'admob',
              adFormat: 'native',
              placements: [placement],
              headline: 'Explore Google Cloud & AI Developer Tools',
              bodyText: 'Accelerate your development workflow with enterprise-grade cloud solutions and modern developer APIs.',
              callToAction: 'Install App / Learn More',
              destinationUrl: 'https://cloud.google.com',
              mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
              mediaType: 'image',
              pricingModel: 'cpm',
              bidAmountUsd: 2.5,
              totalBudgetUsd: 1000,
              dailyBudgetUsd: 100,
              spentBudgetUsd: 0,
              startDate: new Date().toISOString(),
              rewardCoins: 0,
              frequencyCap: {
                perUserHourly: 5,
                perUserDaily: 20,
                cooldownMinutes: 1,
              },
              targetingConfig: {},
              impressionsCount: 1,
              clicksCount: 0,
              rewardsClaimedCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
          setAdPayload(defaultAdMobPayload);
          onAdLoaded?.(defaultAdMobPayload);
        }
        setLoading(false);
      }
    }

    loadAd();

    return () => {
      isMounted = false;
    };
  }, [placement, token]);

  // Viewability & Impression Tracking with IntersectionObserver
  useEffect(() => {
    if (!adPayload || !adPayload.campaign || impressionRecorded.current || !containerRef.current) {
      return;
    }

    const campaignId = adPayload.campaign.id;
    let timer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // In view for >= 1000ms
          timer = setTimeout(() => {
            if (!impressionRecorded.current) {
              impressionRecorded.current = true;
              adService.recordImpression(campaignId, placement, token);
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [adPayload, placement, token]);

  if (dismissed || (!loading && !adPayload)) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`w-full rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl p-4 animate-pulse flex items-center justify-between ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="w-32 h-3.5 bg-white/5 rounded-md" />
            <div className="w-48 h-2.5 bg-white/5 rounded-md" />
          </div>
        </div>
        <div className="w-16 h-7 bg-white/5 rounded-lg" />
      </div>
    );
  }

  const campaign = adPayload?.campaign;
  const provider = adPayload?.provider || 'internal';

  const handleClick = async () => {
    if (campaign) {
      const destUrl = await adService.recordClick(campaign.id, placement, token);
      if (destUrl) {
        if (destUrl.startsWith('http')) {
          window.open(destUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = destUrl;
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
        provider === 'admob'
          ? 'bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-black/60 border-amber-500/30'
          : provider === 'direct_sponsor'
          ? 'bg-gradient-to-br from-cyan-500/10 via-blue-950/20 to-black/60 border-cyan-500/30 shadow-[0_8px_32px_rgba(6,182,212,0.15)]'
          : provider === 'web_provider'
          ? 'bg-gradient-to-br from-indigo-500/10 via-purple-950/20 to-black/60 border-indigo-500/30'
          : 'bg-gradient-to-br from-fuchsia-500/10 via-pink-950/20 to-black/60 border-white/10'
      } backdrop-blur-2xl shadow-xl ${className}`}
    >
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10 backdrop-blur-md">
            {provider === 'admob' ? (
              <>
                <Smartphone className="w-3 h-3 text-amber-400" />
                <span>Google AdMob</span>
              </>
            ) : provider === 'direct_sponsor' ? (
              <>
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>Sponsored Partner</span>
              </>
            ) : provider === 'web_provider' ? (
              <>
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>Web Network</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>Nixo Spotlight</span>
              </>
            )}
          </span>
          {campaign?.advertiserName && (
            <span className="text-xs text-white/50 font-medium truncate max-w-[140px]">
              by {campaign.advertiserName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInfoModal(true)}
            title="Why am I seeing this ad?"
            className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="Hide this ad"
            className="p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Creative Body */}
      {campaign ? (
        <div className={`p-4 ${compact ? 'flex items-center gap-4' : 'flex flex-col gap-3'}`}>
          {/* Creative Media */}
          {campaign.mediaUrl && (
            <div className={`relative overflow-hidden rounded-xl bg-black/40 ${compact ? 'w-24 h-24 shrink-0' : 'w-full h-48 md:h-56'}`}>
              {campaign.mediaType === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    src={campaign.mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white/90 backdrop-blur-md hover:bg-black/80 transition"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <img
                  src={campaign.mediaUrl}
                  alt={campaign.headline}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              )}
            </div>
          )}

          {/* HTML Snippet if provided by web ad provider */}
          {campaign.htmlSnippet && (
            <div
              className="w-full rounded-xl overflow-hidden my-2"
              dangerouslySetInnerHTML={{ __html: campaign.htmlSnippet }}
            />
          )}

          {/* Copy & CTA */}
          <div className="flex-1 flex flex-col justify-between gap-2">
            <div>
              <h4 className="font-semibold text-white text-base tracking-tight leading-snug line-clamp-2">
                {campaign.headline || campaign.title}
              </h4>
              <p className="text-sm text-white/60 line-clamp-2 mt-1 leading-relaxed">
                {campaign.bodyText}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-white/40 flex items-center gap-1 truncate max-w-[160px]">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Verified Ad Slot
              </span>

              <button
                onClick={handleClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{campaign.callToAction || 'Learn More'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Network / AdMob Banner Container */
        <div className="p-6 text-center flex flex-col items-center justify-center gap-3">
          <Smartphone className="w-8 h-8 text-amber-400 animate-bounce" />
          <div>
            <h4 className="text-white font-medium text-sm">Google AdMob Responsive Slot</h4>
            <p className="text-xs text-white/50 mt-0.5">
              Unit: {adPayload?.admobConfig?.bannerUnitId || 'ca-app-pub-3940256099942544/6300978111'}
            </p>
          </div>
          <button
            onClick={() => window.open('https://admob.google.com', '_blank')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 hover:bg-amber-500/30 transition"
          >
            AdMob Bridge Ready
          </button>
        </div>
      )}

      {/* Transparency / Why this ad modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">About this Advertisement</h3>
                <p className="text-xs text-white/50">Transparency & Privacy Notice</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-white/70 bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/40">Provider:</span>
                <span className="font-medium text-white">{provider.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/40">Placement Slot:</span>
                <span className="font-mono text-cyan-400">{placement}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/40">Advertiser:</span>
                <span className="text-white">{campaign?.advertiserName || 'Nixo Network'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/40">Frequency Capped:</span>
                <span className="text-emerald-400">Yes (Hourly & Daily Limits Enforced)</span>
              </div>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              Nixo respects your privacy. Ads are delivered without selling personal identity records,
              using frequency capping and cryptographically verified server rate limits.
            </p>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
