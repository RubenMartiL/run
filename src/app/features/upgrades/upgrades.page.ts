import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { ProgressionService } from '../../core/progression/progression.service';
import { UpgradeId, upgradeEffectLabel } from '../../game/data/upgrades';
import { IconComponent } from '../../shared/icon';
import { JuiceService } from '../../shared/juice.service';

@Component({
  selector: 'app-upgrades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './upgrades.page.html',
  styleUrl: './upgrades.page.css',
})
export class UpgradesPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly progression = inject(ProgressionService);
  private readonly juice = inject(JuiceService);
  protected readonly save = inject(SaveService);

  protected readonly upgrades = this.progression.upgrades;
  protected readonly coins = this.save.coins;
  protected readonly toast = signal('');
  protected readonly pips = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  protected effectLabel(id: UpgradeId, level: number): string {
    return upgradeEffectLabel(id, level);
  }

  protected buy(id: UpgradeId): void {
    const view = this.upgrades().find((entry) => entry.def.id === id);
    if (!view) return;
    if (view.maxed) {
      this.flash('Already max level');
      return;
    }
    if (!view.affordable) {
      this.flash('Not enough coins');
      this.audio.play('gateBad');
      return;
    }
    if (this.progression.buyUpgrade(id)) {
      this.flash(`${view.def.name} upgraded`);
      this.juice.celebrate(`${view.def.name.toUpperCase()} LV ${view.level + 1}`, '#a3ff4f');
      this.audio.unlock();
      this.audio.play('combo');
      void this.haptics.notify('success');
    }
  }

  protected back(): void {
    this.audio.play('click');
    void this.router.navigate(['/shop']);
  }

  private flash(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1700);
  }
}
