import { Injectable, computed, inject, signal } from '@angular/core';
import { SaveService } from '../save/save.service';
import { EquippedCosmetics } from '../save/save.types';
import { UPGRADES, UpgradeDef, UpgradeId, modifiersFromUpgrades, upgradePrice } from '../../game/data/upgrades';
import { CosmeticDef, cosmeticById, skinFromIds } from '../../game/data/cosmetics';
import { RunOptions } from '../../game/engine/session';
import { LevelScript } from '../../game/types';

export interface UpgradeView {
  def: UpgradeDef;
  level: number;
  price: number;
  maxed: boolean;
  affordable: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private readonly save = inject(SaveService);

  readonly upgrades = computed<UpgradeView[]>(() => {
    const levels = this.save.data().upgrades;
    const coins = this.save.data().wallet.coins;
    return UPGRADES.map((def) => {
      const level = levels[def.id] ?? 0;
      const price = upgradePrice(def.id, level);
      return {
        def,
        level,
        price,
        maxed: level >= def.maxLevel,
        affordable: coins >= price,
      };
    });
  });

  readonly skin = computed(() => {
    const equipped = this.save.data().cosmetics.equipped;
    const trial = this._trial();
    const merged = { ...equipped };
    for (const [category, id] of Object.entries(trial)) {
      if (id) merged[category as keyof EquippedCosmetics] = id;
    }
    return skinFromIds(merged);
  });

  readonly trialActive = computed(() => Object.keys(this._trial()).length > 0);

  private readonly _trial = signal<Partial<EquippedCosmetics>>({});

  readonly modifiers = computed(() => modifiersFromUpgrades(this.save.data().upgrades));

  buyUpgrade(id: UpgradeId): boolean {
    const view = this.upgrades().find((entry) => entry.def.id === id);
    if (!view || view.maxed) return false;
    if (!this.save.spendCoins(view.price)) return false;
    this.save.update((save) => ({
      ...save,
      upgrades: { ...save.upgrades, [id]: (save.upgrades[id] ?? 0) + 1 },
    }));
    return true;
  }

  acquireCosmetic(id: string): boolean {
    if (this.save.isCosmeticOwned(id)) {
      this.equipCosmetic(id);
      return true;
    }
    const def = cosmeticById(id);
    if (!def) return false;
    if (def.priceCoins > 0 && !this.save.spendCoins(def.priceCoins)) return false;
    if (def.priceGems > 0 && !this.save.spendGems(def.priceGems)) return false;
    this.save.ownCosmetic(id);
    this.save.equipCosmetic(def.category, id);
    return true;
  }

  equipCosmetic(id: string): boolean {
    const def = cosmeticById(id);
    if (!def || !this.save.isCosmeticOwned(id)) return false;
    this.save.equipCosmetic(def.category, id);
    return true;
  }

  /** Rewarded-ad cosmetic trial. Session-scoped, never persisted as owned. */
  startTrial(id: string): boolean {
    const def = cosmeticById(id);
    if (!def) return false;
    this._trial.update((current) => ({ ...current, [def.category]: id }));
    return true;
  }

  canAfford(def: CosmeticDef): boolean {
    const wallet = this.save.data().wallet;
    return wallet.coins >= def.priceCoins && wallet.gems >= def.priceGems;
  }

  runOptions(level: LevelScript): RunOptions {
    if (level.rules?.competitive) {
      return { skin: this.skin(), modifiers: undefined };
    }
    return { skin: this.skin(), modifiers: this.modifiers() };
  }

  /** Upgrade levels are frozen during competitive modes. */
  competitive(level: LevelScript): boolean {
    return Boolean(level.rules?.competitive);
  }
}
