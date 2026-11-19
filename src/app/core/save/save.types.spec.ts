import { SAVE_VERSION, createDefaultSave, sanitizeSave } from './save.types';

describe('save sanitisation', () => {
  it('returns a valid default save for garbage input', () => {
    const save = sanitizeSave(null);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.wallet).toEqual(createDefaultSave().wallet);
    expect(save.settings).toEqual(createDefaultSave().settings);
  });

  it('falls back to defaults without throwing on hostile data', () => {
    const save = sanitizeSave({ wallet: { coins: Number.NaN }, campaign: 'nope' });
    expect(save.version).toBe(SAVE_VERSION);
    expect(Number.isFinite(save.wallet.coins)).toBe(true);
    expect(save.wallet.coins).toBeGreaterThanOrEqual(0);
    expect(save.campaign.levels).toEqual({});
  });

  it('clamps out-of-range values', () => {
    const save = sanitizeSave({
      wallet: { coins: -50, gems: 1e12 },
      stats: { bestCrowd: 1e12 },
    });
    expect(save.wallet.coins).toBe(0);
    expect(save.wallet.gems).toBeLessThanOrEqual(9_999_999);
    expect(save.stats.bestCrowd).toBeLessThanOrEqual(1_000_000);
  });

  it('keeps valid level records and drops malformed ones', () => {
    const save = sanitizeSave({
      campaign: {
        levels: {
          'green-city-1': { stars: 9, bestCrowd: 120, plays: 2, completedAt: 10 },
          broken: { bestCrowd: 5 },
        },
      },
    });
    expect(save.campaign.levels['green-city-1'].stars).toBe(3);
    expect(save.campaign.levels['broken']).toBeUndefined();
  });

  it('migrates a v1 save into every v2 system', () => {
    const save = sanitizeSave({
      version: 1,
      wallet: { coins: 500, gems: 4 },
      campaign: {
        levels: { 'green-city-1': { stars: 3, bestCrowd: 80, plays: 4, completedAt: 99 } },
      },
      settings: { sound: false, music: true, haptics: true },
      stats: { runs: 12, wins: 8, coinsEarned: 900, bestCrowd: 80 },
    });
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.wallet.coins).toBe(500);
    expect(save.campaign.levels['green-city-1'].stars).toBe(3);
    expect(save.settings.sound).toBe(false);
    expect(save.upgrades.startingCrowd).toBe(0);
    expect(save.modes.endless.bestDistance).toBe(0);
    expect(save.cosmetics.owned.length).toBeGreaterThan(0);
    expect(save.missions.daily.claimed).toEqual([]);
    expect(save.stats.totalDistance).toBe(0);
  });

  it('sanitises v2 systems and clamps upgrade levels', () => {
    const save = sanitizeSave({
      upgrades: { startingCrowd: 99, coinBonus: -5, gateBonus: 4.7, luckyReward: 2 },
      cosmetics: {
        owned: ['crowd-gold', 'crowd-gold', 42],
        equipped: { crowd: 'crowd-gold', hat: null },
      },
      modes: { endless: { bestDistance: 1e12, bestCoins: -2 } },
    });
    expect(save.upgrades.startingCrowd).toBe(10);
    expect(save.upgrades.coinBonus).toBe(0);
    expect(save.upgrades.gateBonus).toBe(5);
    expect(save.cosmetics.owned).toContain('crowd-gold');
    expect(save.cosmetics.owned.filter((id) => id === 'crowd-gold')).toHaveLength(1);
    expect(save.cosmetics.equipped.crowd).toBe('crowd-gold');
    expect(save.cosmetics.equipped.hat).toBe('hat-none');
    expect(save.modes.endless.bestDistance).toBe(1_000_0000);
    expect(save.modes.endless.bestCoins).toBe(0);
  });
});
