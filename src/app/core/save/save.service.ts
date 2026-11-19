import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  CosmeticsState,
  EquippedCosmetics,
  LEGACY_SAVE_KEYS,
  LevelRecord,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  SaveData,
  createDefaultSave,
  localDateKey,
  sanitizeSave,
  weekKey,
} from './save.types';

export type ModeId =
  | 'campaign'
  | 'endless'
  | 'timeAttack'
  | 'coinRush'
  | 'survival'
  | 'bossRush'
  | 'daily';

export interface ModeResultInput {
  mode: Exclude<ModeId, 'campaign'>;
  won: boolean;
  coins: number;
  crowd: number;
  distance: number;
  elapsed: number;
  bosses: number;
  medal?: 'gold' | 'silver' | 'bronze' | null;
}

@Injectable({ providedIn: 'root' })
export class SaveService {
  private readonly _data = signal<SaveData>(createDefaultSave());
  private readonly _ready = signal(false);
  private readonly _recovered = signal(false);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWrite: Promise<void> | null = null;

  readonly data = this._data.asReadonly();
  readonly ready = this._ready.asReadonly();
  readonly recovered = this._recovered.asReadonly();
  readonly coins = computed(() => this._data().wallet.coins);
  readonly gems = computed(() => this._data().wallet.gems);
  readonly settings = computed(() => this._data().settings);
  readonly cosmetics = computed(() => this._data().cosmetics);
  readonly upgrades = computed(() => this._data().upgrades);

  async init(): Promise<void> {
    if (this._ready()) return;
    let loaded: SaveData | null = null;
    let needsWrite = false;

    const keysToTry = [SAVE_KEY, ...LEGACY_SAVE_KEYS];
    for (const key of keysToTry) {
      try {
        const { value } = await Preferences.get({ key });
        if (!value) continue;
        loaded = sanitizeSave(JSON.parse(value));
        needsWrite = key !== SAVE_KEY;
        break;
      } catch {
        // Try the next key, then the backup slot below.
      }
    }

    if (!loaded) {
      try {
        const { value } = await Preferences.get({ key: SAVE_BACKUP_KEY });
        if (value) {
          loaded = sanitizeSave(JSON.parse(value));
          this._recovered.set(true);
        }
      } catch {
        loaded = null;
      }
      if (!loaded) needsWrite = true;
    }

    const wasMigrated = loaded !== null && loaded.version !== SAVE_VERSION;
    this._data.set(loaded ?? createDefaultSave());
    this._ready.set(true);

    if (!loaded || needsWrite || wasMigrated) {
      await this.flush();
    }
  }

  getLevelRecord(levelId: string): LevelRecord | undefined {
    return this._data().campaign.levels[levelId];
  }

  getStars(levelId: string): number {
    return this.getLevelRecord(levelId)?.stars ?? 0;
  }

  isLevelCompleted(levelId: string): boolean {
    return (this.getLevelRecord(levelId)?.stars ?? 0) > 0;
  }

  isCosmeticOwned(id: string): boolean {
    return this._data().cosmetics.owned.includes(id);
  }

  isCosmeticEquipped(category: keyof EquippedCosmetics, id: string): boolean {
    return this._data().cosmetics.equipped[category] === id;
  }

  addCoins(amount: number): void {
    if (amount <= 0) return;
    const rounded = Math.round(amount);
    this.update((save) => ({
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins + rounded },
      stats: { ...save.stats, coinsEarned: save.stats.coinsEarned + rounded },
    }));
  }

  addGems(amount: number): void {
    if (amount <= 0) return;
    const rounded = Math.round(amount);
    this.update((save) => ({
      ...save,
      wallet: { ...save.wallet, gems: save.wallet.gems + rounded },
    }));
  }

  spendCoins(amount: number): boolean {
    if (amount <= 0) return false;
    if (this._data().wallet.coins < amount) return false;
    this.update((save) => ({
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins - Math.round(amount) },
    }));
    return true;
  }

  spendGems(amount: number): boolean {
    if (amount <= 0) return false;
    if (this._data().wallet.gems < amount) return false;
    this.update((save) => ({
      ...save,
      wallet: { ...save.wallet, gems: save.wallet.gems - Math.round(amount) },
    }));
    return true;
  }

  ownCosmetic(id: string): void {
    if (this.isCosmeticOwned(id)) return;
    this.update((save) => ({
      ...save,
      cosmetics: { ...save.cosmetics, owned: [...save.cosmetics.owned, id] },
    }));
  }

  equipCosmetic(category: keyof EquippedCosmetics, id: string): void {
    this.update((save) => ({
      ...save,
      cosmetics: {
        ...save.cosmetics,
        equipped: { ...save.cosmetics.equipped, [category]: id },
      },
    }));
  }

  /** Records a finished campaign run. Returns newly earned stars. */
  recordLevelResult(input: {
    levelId: string;
    stars: number;
    crowd: number;
    won: boolean;
    coins: number;
    distance?: number;
    bosses?: number;
  }): number {
    const previous = this.getLevelRecord(input.levelId);
    const previousStars = previous?.stars ?? 0;
    const stars = input.won
      ? Math.max(previousStars, Math.min(3, Math.max(1, input.stars)))
      : previousStars;
    const earned = Math.max(0, Math.round(input.coins));

    this.update((save) => ({
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins + earned },
      campaign: {
        levels: {
          ...save.campaign.levels,
          [input.levelId]: {
            stars,
            bestCrowd: Math.max(previous?.bestCrowd ?? 0, input.crowd),
            plays: (previous?.plays ?? 0) + 1,
            completedAt: input.won ? Date.now() : (previous?.completedAt ?? 0),
          },
        },
      },
      stats: {
        ...save.stats,
        runs: save.stats.runs + 1,
        wins: save.stats.wins + (input.won ? 1 : 0),
        coinsEarned: save.stats.coinsEarned + earned,
        bestCrowd: Math.max(save.stats.bestCrowd, input.crowd),
        totalDistance: save.stats.totalDistance + Math.round(input.distance ?? 0),
        bossesDefeated: save.stats.bossesDefeated + Math.max(0, input.bosses ?? 0),
      },
    }));

    return Math.max(0, stars - previousStars);
  }

  recordModeResult(input: ModeResultInput): void {
    const earned = Math.max(0, Math.round(input.coins));
    const distance = Math.max(0, Math.round(input.distance));
    const elapsed = Math.max(0, Math.round(input.elapsed));

    this.update((save) => {
      const modes = save.modes;
      const nextModes = {
        ...modes,
        endless: { ...modes.endless },
        timeAttack: { ...modes.timeAttack },
        daily: { ...modes.daily },
        coinRush: { ...modes.coinRush },
        survival: { ...modes.survival },
        bossRush: { ...modes.bossRush },
      };

      if (input.mode === 'endless') {
        nextModes.endless = {
          bestDistance: Math.max(modes.endless.bestDistance, distance),
          bestCrowd: Math.max(modes.endless.bestCrowd, Math.round(input.crowd)),
          bestCoins: Math.max(modes.endless.bestCoins, earned),
          runs: modes.endless.runs + 1,
        };
      } else if (input.mode === 'timeAttack') {
        const best =
          input.won && elapsed > 0
            ? modes.timeAttack.bestTime === 0
              ? elapsed
              : Math.min(modes.timeAttack.bestTime, elapsed)
            : modes.timeAttack.bestTime;
        nextModes.timeAttack = {
          bestTime: best,
          runs: modes.timeAttack.runs + 1,
          goldMedals: modes.timeAttack.goldMedals + (input.medal === 'gold' ? 1 : 0),
        };
      } else if (input.mode === 'daily') {
        const today = localDateKey();
        const sameDay = modes.daily.dateKey === today;
        nextModes.daily = {
          dateKey: today,
          bestTime:
            input.won && elapsed > 0
              ? sameDay && modes.daily.bestTime > 0
                ? Math.min(modes.daily.bestTime, elapsed)
                : elapsed
              : sameDay
                ? modes.daily.bestTime
                : 0,
          clears: (sameDay ? modes.daily.clears : 0) + (input.won ? 1 : 0),
        };
      } else if (input.mode === 'coinRush') {
        nextModes.coinRush = {
          bestCoins: Math.max(modes.coinRush.bestCoins, earned),
          target: Math.max(modes.coinRush.target, input.won ? earned : 0),
          clears: modes.coinRush.clears + (input.won ? 1 : 0),
        };
      } else if (input.mode === 'survival') {
        nextModes.survival = {
          bestDistance: Math.max(modes.survival.bestDistance, distance),
          bestCrowd: Math.max(modes.survival.bestCrowd, Math.round(input.crowd)),
          runs: modes.survival.runs + 1,
        };
      } else if (input.mode === 'bossRush') {
        nextModes.bossRush = {
          bestBosses: Math.max(modes.bossRush.bestBosses, input.bosses),
          clears: modes.bossRush.clears + (input.won ? 1 : 0),
        };
      }

      return {
        ...save,
        wallet: { ...save.wallet, coins: save.wallet.coins + earned },
        modes: nextModes,
        stats: {
          ...save.stats,
          runs: save.stats.runs + 1,
          wins: save.stats.wins + (input.won ? 1 : 0),
          coinsEarned: save.stats.coinsEarned + earned,
          bestCrowd: Math.max(save.stats.bestCrowd, Math.round(input.crowd)),
          totalDistance: save.stats.totalDistance + distance,
          bossesDefeated: save.stats.bossesDefeated + Math.max(0, input.bosses),
        },
      };
    });
  }

  touchEventProgress(amount: number): void {
    if (amount <= 0) return;
    this.update((save) => {
      const currentWeek = weekKey();
      const sameWeek = save.missions.event.weekKey === currentWeek;
      return {
        ...save,
        missions: {
          ...save.missions,
          event: {
            weekKey: currentWeek,
            claimed: sameWeek ? save.missions.event.claimed : false,
            progress: (sameWeek ? save.missions.event.progress : 0) + Math.round(amount),
          },
        },
      };
    });
  }

  setSetting<K extends keyof SaveData['settings']>(key: K, value: SaveData['settings'][K]): void {
    this.update((save) => ({
      ...save,
      settings: { ...save.settings, [key]: value },
    }));
  }

  resetProgress(): void {
    this.update((save) => ({
      ...createDefaultSave(),
      wallet: save.wallet,
      settings: save.settings,
      cosmetics: save.cosmetics,
    }));
  }

  resetAll(): void {
    this.update(() => createDefaultSave());
    void this.flush();
  }

  update(mutator: (save: SaveData) => SaveData): void {
    this._data.update((current) => ({ ...mutator(current), updatedAt: Date.now() }));
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, 220);
  }

  async flush(): Promise<void> {
    if (this.pendingWrite) {
      await this.pendingWrite;
    }
    const write = async () => {
      const payload = JSON.stringify(this._data());
      try {
        const { value } = await Preferences.get({ key: SAVE_KEY });
        if (value) {
          await Preferences.set({ key: SAVE_BACKUP_KEY, value });
        }
        await Preferences.set({ key: SAVE_KEY, value: payload });
      } catch {
        // Persistence is best-effort; gameplay must keep running.
      }
    };
    this.pendingWrite = write().finally(() => {
      this.pendingWrite = null;
    });
    await this.pendingWrite;
  }
}

export type { CosmeticsState };
