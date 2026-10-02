import {
  AdPlacement,
  AdCampaign,
  AdPlatformSettings,
  AdProviderType,
  AdFormatType,
  AdRewardedChallenge,
} from '../types';

export interface AdPayload {
  available: boolean;
  campaign?: AdCampaign | null;
  placement: {
    id: string;
    name: string;
    placementType: AdFormatType;
    rewardCoins: number;
    refreshIntervalSec: number;
  };
  provider: AdProviderType;
  admobConfig?: {
    appId: string;
    unitId?: string;
    bannerUnitId?: string;
    interstitialUnitId?: string;
    rewardedUnitId?: string;
  };
  reason?: string;
}

export interface AdServiceContext {
  token?: string | null;
  device?: 'mobile' | 'desktop' | 'tablet';
  isVerified?: boolean;
}

export interface IAdProviderAdapter {
  readonly providerType: AdProviderType;
  isSupported(): boolean;
  renderAd(payload: AdPayload): React.ReactNode | null;
}

class AdService {
  private static instance: AdService;
  private impressionsDebounceMap: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Fetch an ad candidate for a specific placement slot.
   */
  public async fetchAdForPlacement(placementId: string, context?: AdServiceContext): Promise<AdPayload | null> {
    try {
      const headers: Record<string, string> = {};
      if (context?.token) {
        headers['Authorization'] = `Bearer ${context.token}`;
      }

      const params = new URLSearchParams({
        placement: placementId,
        device: context?.device || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      });

      const res = await fetch(`/api/ads/serve?${params.toString()}`, { headers });
      if (!res.ok) return null;
      const data: AdPayload = await res.json();
      return data.available ? data : null;
    } catch (err) {
      console.warn(`[AdService] Failed to fetch ad for placement "${placementId}":`, err);
      return null;
    }
  }

  /**
   * Track ad impression with client-side deduplication.
   */
  public async recordImpression(
    campaignId: string,
    placementId: string,
    token?: string | null
  ): Promise<boolean> {
    const key = `${campaignId}:${placementId}`;
    const lastTracked = this.impressionsDebounceMap.get(key);
    const now = Date.now();

    // Prevent duplicate calls within 5 seconds for the same ad in current session
    if (lastTracked && now - lastTracked < 5000) {
      return false;
    }
    this.impressionsDebounceMap.set(key, now);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/ads/track/impression', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignId,
          placementId,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        }),
      });
      return true;
    } catch (err) {
      console.warn('[AdService] Impression tracking error:', err);
      return false;
    }
  }

  /**
   * Track ad click and retrieve verified destination.
   */
  public async recordClick(
    campaignId: string,
    placementId: string,
    token?: string | null
  ): Promise<string | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/ads/track/click', {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId, placementId }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.destinationUrl || null;
    } catch (err) {
      console.warn('[AdService] Click tracking error:', err);
      return null;
    }
  }

  /**
   * Secure Rewarded Ad Step 1: Request challenge token from server.
   */
  public async requestRewardedChallenge(
    placementId: string,
    campaignId: string,
    token: string
  ): Promise<AdRewardedChallenge> {
    const res = await fetch('/api/ads/rewarded/challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ placementId, campaignId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to issue reward challenge' }));
      throw new Error(err.error || 'Failed to start rewarded video session');
    }

    const data = await res.json();
    return data.challenge;
  }

  /**
   * Secure Rewarded Ad Step 2: Server-side validation and coin claim.
   * CRITICAL: Never award coins merely because frontend says an ad was watched!
   */
  public async claimRewardVerification(
    challengeToken: string,
    watchDurationSec: number,
    token: string,
    providerSignature?: string
  ): Promise<{ success: boolean; coinsAwarded: number; newBalance: number; message: string }> {
    const res = await fetch('/api/ads/rewarded/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        challengeToken,
        watchDurationSec,
        providerSignature,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server verification failed' }));
      throw new Error(err.error || 'Reward verification failed');
    }

    return await res.json();
  }

  /**
   * Mobile AdMob Bridge Detection
   */
  public isMobileAdMobBridgeAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      (Boolean((window as any).AndroidAdMob) ||
        Boolean((window as any).webkit?.messageHandlers?.AdMob) ||
        Boolean((window as any).Capacitor?.Plugins?.AdMob))
    );
  }
}

export const adService = AdService.getInstance();
