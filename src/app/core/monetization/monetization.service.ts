import { Injectable, signal } from '@angular/core';

export type RewardedPlacement =
  | 'doubleCoins'
  | 'continue'
  | 'doubleEndless'
  | 'extraDaily'
  | 'extraChest'
  | 'cosmeticTrial';

export interface AdOverlayState {
  kind: 'rewarded' | 'interstitial' | 'purchase';
  title: string;
  subtitle: string;
}

export interface GemProduct {
  id: string;
  gems: number;
  price: string;
  label: string;
  bonus?: number;
}

/**
 * Monetization seam. Gameplay and UI only talk to this service; the browser
 * implementation below is a deterministic mock. A native AdMob/IAP adapter can
 * be dropped in behind these methods without touching features.
 */
export const AD_CONFIG = {
  interstitialEveryRuns: 3,
  interstitialMinGapMs: 120_000,
  rewardedCooldownMs: 60_000,
  mockRewardedMs: 1500,
  mockInterstitialMs: 1200,
  mockPurchaseMs: 900,
};

export const GEM_PRODUCTS: GemProduct[] = [
  { id: 'gems-50', gems: 50, price: '$1.99', label: 'Pocket Gems' },
  { id: 'gems-150', gems: 150, price: '$4.99', label: 'Gem Pouch', bonus: 15 },
  { id: 'gems-400', gems: 400, price: '$9.99', label: 'Gem Chest', bonus: 60 },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable({ providedIn: 'root' })
export class MonetizationService {
  readonly overlay = signal<AdOverlayState | null>(null);

  private runsSinceInterstitial = 0;
  private lastInterstitialAt = 0;
  private lastRewardedAt = 0;
  private busy = false;

  readonly products = GEM_PRODUCTS;

  rewardedPlacementLabel(placement: RewardedPlacement): string {
    switch (placement) {
      case 'doubleCoins':
        return 'Double your coins';
      case 'continue':
        return 'Continue this run';
      case 'doubleEndless':
        return 'Double your run reward';
      case 'extraDaily':
        return 'Claim a bonus daily reward';
      case 'extraChest':
        return 'Open a bonus chest';
      case 'cosmeticTrial':
        return 'Try a cosmetic';
    }
  }

  async showRewarded(placement: RewardedPlacement): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    this.overlay.set({
      kind: 'rewarded',
      title: 'REWARD AD',
      subtitle: this.rewardedPlacementLabel(placement),
    });
    await delay(AD_CONFIG.mockRewardedMs);
    this.overlay.set(null);
    this.lastRewardedAt = Date.now();
    this.busy = false;
    return true;
  }

  /** Call once when a run result is confirmed. */
  trackRunCompleted(): void {
    this.runsSinceInterstitial++;
  }

  canShowInterstitial(): boolean {
    if (Date.now() - this.lastRewardedAt < AD_CONFIG.rewardedCooldownMs) return false;
    if (this.runsSinceInterstitial < AD_CONFIG.interstitialEveryRuns) return false;
    if (Date.now() - this.lastInterstitialAt < AD_CONFIG.interstitialMinGapMs) return false;
    return true;
  }

  async maybeShowInterstitial(): Promise<void> {
    if (!this.canShowInterstitial() || this.busy) return;
    this.busy = true;
    this.overlay.set({
      kind: 'interstitial',
      title: 'SPONSOR BREAK',
      subtitle: 'Your next run is loading',
    });
    await delay(AD_CONFIG.mockInterstitialMs);
    this.overlay.set(null);
    this.lastInterstitialAt = Date.now();
    this.runsSinceInterstitial = 0;
    this.busy = false;
  }

  async purchase(productId: string): Promise<boolean> {
    if (this.busy) return false;
    const product = GEM_PRODUCTS.find((entry) => entry.id === productId);
    if (!product) return false;
    this.busy = true;
    this.overlay.set({
      kind: 'purchase',
      title: 'PROCESSING PURCHASE',
      subtitle: `${product.gems + (product.bonus ?? 0)} gems`,
    });
    await delay(AD_CONFIG.mockPurchaseMs);
    this.overlay.set(null);
    this.busy = false;
    return true;
  }

  gemAmount(productId: string): number {
    const product = GEM_PRODUCTS.find((entry) => entry.id === productId);
    return product ? product.gems + (product.bonus ?? 0) : 0;
  }
}
