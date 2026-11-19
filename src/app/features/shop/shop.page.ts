import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { MonetizationService } from '../../core/monetization/monetization.service';
import { ProgressionService } from '../../core/progression/progression.service';
import {
  COSMETIC_CATEGORIES,
  COSMETICS,
  CosmeticCategory,
  CosmeticDef,
} from '../../game/data/cosmetics';
import { IconComponent } from '../../shared/icon';
import { JuiceService } from '../../shared/juice.service';

@Component({
  selector: 'app-shop',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.css',
})
export class ShopPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly progression = inject(ProgressionService);
  private readonly ads = inject(MonetizationService);
  private readonly juice = inject(JuiceService);
  protected readonly save = inject(SaveService);

  protected readonly categories = COSMETIC_CATEGORIES;
  protected readonly tab = signal<'cosmetics' | 'gems'>('cosmetics');
  protected readonly category = signal<CosmeticCategory>('crowd');
  protected readonly toast = signal('');
  protected readonly coins = this.save.coins;
  protected readonly gems = this.save.gems;
  protected readonly products = this.ads.products;

  protected readonly items = computed(() =>
    COSMETICS.filter((item) => item.category === this.category()),
  );

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected setTab(tab: 'cosmetics' | 'gems'): void {
    this.tap();
    this.tab.set(tab);
  }

  protected setCategory(category: CosmeticCategory): void {
    this.tap();
    this.category.set(category);
  }

  protected isOwned(def: CosmeticDef): boolean {
    return this.save.isCosmeticOwned(def.id);
  }

  protected isEquipped(def: CosmeticDef): boolean {
    return this.save.isCosmeticEquipped(def.category, def.id);
  }

  protected priceLabel(def: CosmeticDef): string {
    if (def.priceGems > 0) return `${def.priceGems} gems`;
    return `${def.priceCoins} coins`;
  }

  protected action(def: CosmeticDef): void {
    if (this.isEquipped(def)) return;
    if (this.isOwned(def)) {
      this.progression.equipCosmetic(def.id);
      this.flash(`${def.name} equipped`);
      this.tap();
      return;
    }
    if (!this.progression.canAfford(def)) {
      this.flash('Not enough currency');
      this.audio.play('gateBad');
      return;
    }
    if (this.progression.acquireCosmetic(def.id)) {
      this.flash(`${def.name} unlocked and equipped`);
      this.juice.celebrate(`${def.name.toUpperCase()} UNLOCKED`, def.primary);
      this.audio.play('combo');
      void this.haptics.notify('success');
    } else {
      this.flash('Purchase failed');
      this.audio.play('gateBad');
    }
  }

  protected async trialItem(def: CosmeticDef): Promise<void> {
    this.tap();
    const granted = await this.ads.showRewarded('cosmeticTrial');
    if (!granted) return;
    if (this.progression.startTrial(def.id)) {
      this.flash(`${def.name} trial equipped for this session`);
      this.juice.celebrate('TRIAL ACTIVE', def.primary);
      this.audio.play('power');
    }
  }

  protected async buyGems(productId: string): Promise<void> {
    this.tap();
    const ok = await this.ads.purchase(productId);
    if (!ok) return;
    const amount = this.ads.gemAmount(productId);
    this.save.addGems(amount);
    this.flash(`+${amount} gems added`);
    this.juice.celebrate(`+${amount} GEMS`, '#c9a7ff');
    this.audio.play('combo');
    void this.haptics.notify('success');
  }

  protected openUpgrades(): void {
    this.tap();
    void this.router.navigate(['/upgrades']);
  }

  protected back(): void {
    this.tap();
    void this.router.navigate(['/menu']);
  }

  private flash(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1800);
  }

  private tap(): void {
    this.audio.unlock();
    this.audio.play('click');
    void this.haptics.impact('light');
  }
}
