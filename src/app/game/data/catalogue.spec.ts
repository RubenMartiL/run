import { COSMETICS, COSMETIC_CATEGORIES, cosmeticById, skinFromIds } from './cosmetics';
import { NEUTRAL_MODIFIERS, UPGRADES, modifiersFromUpgrades, upgradeEffectLabel, upgradePrice } from './upgrades';

describe('cosmetics catalogue', () => {
  it('ships at least 20 cosmetics across every category', () => {
    expect(COSMETICS.length).toBeGreaterThanOrEqual(20);
    for (const category of COSMETIC_CATEGORIES) {
      expect(COSMETICS.some((item) => item.category === category.id)).toBe(true);
    }
    expect(new Set(COSMETICS.map((item) => item.id)).size).toBe(COSMETICS.length);
  });

  it('has a free default for each category', () => {
    for (const category of COSMETIC_CATEGORIES) {
      const free = COSMETICS.find(
        (item) => item.category === category.id && item.priceCoins === 0 && item.priceGems === 0,
      );
      expect(free).toBeTruthy();
    }
  });

  it('builds a render-ready skin from equipped ids', () => {
    const skin = skinFromIds({
      crowd: 'crowd-gold',
      hat: 'hat-crown',
      trail: 'trail-flame',
      victory: 'victory-coins',
    });
    expect(skin.primary).toBe('#ffd447');
    expect(skin.hat).toBe('crown');
    expect(skin.trail).toBe('flame');
    expect(skin.victory).toBe('coins');
  });

  it('falls back gracefully for unknown ids', () => {
    const skin = skinFromIds({
      crowd: 'missing',
      hat: 'missing',
      trail: 'missing',
      victory: 'missing',
    });
    expect(skin.primary).toBeTruthy();
    expect(cosmeticById('missing')).toBeUndefined();
  });
});

describe('upgrades', () => {
  it('defines four upgrades with rising prices', () => {
    expect(UPGRADES).toHaveLength(4);
    for (const def of UPGRADES) {
      expect(upgradePrice(def.id, 1)).toBeGreaterThan(upgradePrice(def.id, 0));
      expect(upgradeEffectLabel(def.id, 2)).toBeTruthy();
      expect(def.maxLevel).toBeGreaterThan(0);
    }
  });

  it('converts levels into run modifiers', () => {
    const modifiers = modifiersFromUpgrades({
      startingCrowd: 3,
      coinBonus: 2,
      gateBonus: 1,
      luckyReward: 2,
    });
    expect(modifiers.startingCrowdBonus).toBe(6);
    expect(modifiers.coinMultiplier).toBeCloseTo(1.1);
    expect(modifiers.gateBonus).toBeCloseTo(0.03);
    expect(modifiers.rewardBonus).toBeCloseTo(0.12);
    expect(NEUTRAL_MODIFIERS.coinMultiplier).toBe(1);
  });
});
