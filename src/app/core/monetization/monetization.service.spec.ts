import { vi } from 'vitest';
import { AD_CONFIG, GEM_PRODUCTS, MonetizationService } from './monetization.service';

describe('monetization service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves rewarded ads after the configured mock delay', async () => {
    const service = new MonetizationService();
    const pending = service.showRewarded('doubleCoins');
    expect(service.overlay()?.kind).toBe('rewarded');
    await vi.advanceTimersByTimeAsync(AD_CONFIG.mockRewardedMs + 10);
    await expect(pending).resolves.toBe(true);
    expect(service.overlay()).toBeNull();
  });

  it('shows interstitials only after the run cap and cooldown', async () => {
    const service = new MonetizationService();
    expect(service.canShowInterstitial()).toBe(false);
    for (let i = 0; i < AD_CONFIG.interstitialEveryRuns; i++) {
      service.trackRunCompleted();
    }
    expect(service.canShowInterstitial()).toBe(true);
    const pending = service.maybeShowInterstitial();
    await vi.advanceTimersByTimeAsync(AD_CONFIG.mockInterstitialMs + 10);
    await pending;
    expect(service.canShowInterstitial()).toBe(false);
    expect(service.overlay()).toBeNull();
  });

  it('never shows an interstitial right after a rewarded ad', () => {
    const service = new MonetizationService();
    for (let i = 0; i < AD_CONFIG.interstitialEveryRuns; i++) {
      service.trackRunCompleted();
    }
    const pending = service.showRewarded('doubleCoins');
    vi.advanceTimersByTime(AD_CONFIG.mockRewardedMs + 10);
    return pending.then(() => {
      expect(service.canShowInterstitial()).toBe(false);
    });
  });

  it('exposes gem products and computes granted gems', () => {
    const service = new MonetizationService();
    expect(GEM_PRODUCTS.length).toBeGreaterThanOrEqual(3);
    const product = GEM_PRODUCTS[1];
    expect(service.gemAmount(product.id)).toBe(product.gems + (product.bonus ?? 0));
  });
});
