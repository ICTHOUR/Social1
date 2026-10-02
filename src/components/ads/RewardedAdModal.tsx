import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  X,
  Play,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  Volume2,
  VolumeX,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adService, AdPayload } from '../../services/adService';
import { AdRewardedChallenge } from '../../types';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed?: (coinsAwarded: number, newBalance: number) => void;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onRewardClaimed,
}) => {
  const { user, token, refreshUser, updateUser } = useAuth();
  const [adPayload, setAdPayload] = useState<AdPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<AdRewardedChallenge | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [totalSeconds, setTotalSeconds] = useState(15);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{
    coins: number;
    balance: number;
    txId: string;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load rewarded ad candidate on open
  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    async function loadRewardedAd() {
      setLoading(true);
      setError(null);
      try {
        const payload = await adService.fetchAdForPlacement('rewarded_coin_modal', { token });
        if (!payload || !payload.available) {
          setError(payload?.reason || 'No rewarded ads available right now. Please try again later.');
          setLoading(false);
          return;
        }
        setAdPayload(payload);

        // Step 1: Request Server Challenge Nonce
        if (token && payload.campaign) {
          const ch = await adService.requestRewardedChallenge(
            'rewarded_coin_modal',
            payload.campaign.id,
            token
          );
          setChallenge(ch);
          setTotalSeconds(ch.minWatchDurationSec || 15);
          setSecondsLeft(ch.minWatchDurationSec || 15);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize rewarded ad session');
      } finally {
        setLoading(false);
      }
    }

    loadRewardedAd();
  }, [isOpen, token]);

  const resetState = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setIsCompleted(false);
    setIsClaiming(false);
    setClaimedReward(null);
    setChallenge(null);
    setError(null);
  };

  const handleStartWatch = () => {
    if (!challenge) return;
    setIsPlaying(true);
    startTimeRef.current = Date.now();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // Record impression
    if (adPayload?.campaign) {
      adService.recordImpression(adPayload.campaign.id, 'rewarded_coin_modal', token);
    }

    // Countdown interval
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClaimCoins = async () => {
    if (!challenge || !token || !isCompleted) return;

    setIsClaiming(true);
    setError(null);

    try {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const res = await adService.claimRewardVerification(
        challenge.challengeToken,
        Math.max(elapsed, challenge.minWatchDurationSec),
        token
      );

      if (res.success) {
        setClaimedReward({
          coins: res.coinsAwarded,
          balance: res.newBalance,
          txId: (res as any).transactionId || 'tx_ad_reward',
        });
        if (refreshUser) {
          await refreshUser();
        }
        if (updateUser) {
          updateUser({ coinsBalance: res.newBalance });
        }
        onRewardClaimed?.(res.coinsAwarded, res.newBalance);
      }
    } catch (err: any) {
      setError(err.message || 'Server verification failed');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  const campaign = adPayload?.campaign;
  const rewardCoins = challenge?.rewardCoins || adPayload?.placement?.rewardCoins || 25;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-neutral-900/95 border border-amber-500/30 shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10">
              <Coins className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Nixo Rewarded Vault
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +{rewardCoins} Coins
                </span>
              </h3>
              <p className="text-xs text-white/50">Server-Side Verified Monetization Bridge</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin mx-auto" />
              <p className="text-sm text-white/70">Connecting to secure ad exchange...</p>
            </div>
          ) : error && !claimedReward ? (
            <div className="py-10 text-center space-y-4">
              <div className="p-3 w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Notice</h4>
                <p className="text-sm text-white/60 mt-1 max-w-sm mx-auto">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          ) : claimedReward ? (
            /* Celebration State */
            <div className="py-10 text-center space-y-5 animate-fade-in">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                <div className="relative p-4 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-2xl shadow-amber-500/40">
                  <Sparkles className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-extrabold text-white tracking-tight">
                  +{claimedReward.coins} Coins Credited!
                </h4>
                <p className="text-sm text-amber-300 font-medium">
                  Verified server-side cryptographic claim successful.
                </p>
                <p className="text-xs text-white/50 pt-1">
                  New Wallet Balance: <span className="text-white font-bold">{claimedReward.balance}</span> coins
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 text-xs text-white/60 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Tx Reference:</span>
                  <span className="text-white truncate max-w-[180px]">{claimedReward.txId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verification:</span>
                  <span className="text-emerald-400">HMAC-SHA256 Token Audited</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-500/25 active:scale-98 transition"
              >
                Done & Collect Coins
              </button>
            </div>
          ) : !isPlaying ? (
            /* Pre-Watch Overview */
            <div className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 h-48 flex items-center justify-center group">
                {campaign?.mediaUrl ? (
                  <img
                    src={campaign.mediaUrl}
                    alt={campaign.headline}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-black" />
                )}

                <button
                  onClick={handleStartWatch}
                  className="relative p-5 rounded-full bg-amber-500 text-black shadow-2xl shadow-amber-500/50 group-hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  <Play className="w-8 h-8 fill-black translate-x-0.5" />
                </button>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">{campaign?.headline || 'Sponsor Video Spotlight'}</h4>
                <p className="text-sm text-white/60 mt-1 leading-relaxed">
                  {campaign?.bodyText ||
                    'Watch this short 15-second sponsor spotlight. Nixo server-side verification ensures immediate, fraud-free coin rewards.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-white/40 block">Duration</span>
                    <span className="font-semibold text-white">{totalSeconds} Seconds</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-white/40 block">Verification</span>
                    <span className="font-semibold text-white">Server Nonce</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartWatch}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-neutral-950 font-bold text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Video to Earn +{rewardCoins} Coins</span>
              </button>
            </div>
          ) : (
            /* Active Video Stream Player with Verified Duration Countdown */
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-black border border-white/10 h-64 flex items-center justify-center">
                {campaign?.mediaType === 'video' && campaign.mediaUrl ? (
                  <video
                    ref={videoRef}
                    src={campaign.mediaUrl}
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                    onEnded={() => {
                      setIsCompleted(true);
                      if (timerRef.current) clearInterval(timerRef.current);
                      setSecondsLeft(0);
                    }}
                  />
                ) : (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-950 via-black to-amber-950">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mb-4" />
                    <h5 className="text-white font-semibold text-base">{campaign?.headline}</h5>
                    <p className="text-xs text-white/60 mt-1 max-w-xs">{campaign?.bodyText}</p>
                  </div>
                )}

                {/* Overlay Top Controls */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-semibold text-amber-400">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    {secondsLeft > 0 ? (
                      <span>Reward in {secondsLeft}s</span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Complete
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full bg-black/70 backdrop-blur-md text-white/90 hover:bg-black/90 transition"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                  <div
                    className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-white/60 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Server Cryptographic Nonce Active
                </span>
                <span>{Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100)}% watched</span>
              </div>

              {/* Action Button: Disabled until video finishes */}
              <button
                disabled={!isCompleted || isClaiming}
                onClick={handleClaimCoins}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-neutral-950 shadow-emerald-500/25 cursor-pointer animate-pulse'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
                }`}
              >
                {isClaiming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying with Nixo Server...</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Claim Verified +{rewardCoins} Coins</span>
                  </>
                ) : (
                  <span>Please watch full ad to unlock coins ({secondsLeft}s)</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
