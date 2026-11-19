import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { localDateKey } from '../../core/save/save.types';
import { MODE_DEFS } from '../../game/data/modes';
import { MissionsService } from '../../core/retention/missions.service';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-modes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './modes.page.html',
  styleUrl: './modes.page.css',
})
export class ModesPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  protected readonly save = inject(SaveService);
  protected readonly missions = inject(MissionsService);

  protected readonly modes = MODE_DEFS;
  protected readonly coins = this.save.coins;
  protected readonly gems = this.save.gems;
  protected readonly today = localDateKey();
  protected readonly records = computed(() => this.save.data().modes);

  protected bestValue(mode: (typeof MODE_DEFS)[number]['id']): string {
    const modes = this.records();
    switch (mode) {
      case 'endless':
        return modes.endless.bestDistance > 0
          ? `${(modes.endless.bestDistance / 1000).toFixed(2)}k`
          : '—';
      case 'timeAttack':
        return modes.timeAttack.bestTime > 0 ? `${modes.timeAttack.bestTime}s` : '—';
      case 'coinRush':
        return modes.coinRush.bestCoins > 0 ? `${modes.coinRush.bestCoins}` : '—';
      case 'survival':
        return modes.survival.bestDistance > 0
          ? `${(modes.survival.bestDistance / 1000).toFixed(2)}k`
          : '—';
      case 'bossRush':
        return modes.bossRush.bestBosses > 0 ? `${modes.bossRush.bestBosses}/3` : '—';
    }
  }

  protected dailyBest(): string {
    const daily = this.records().daily;
    if (daily.dateKey !== this.today || daily.bestTime === 0) return 'Not cleared';
    return `${daily.bestTime}s best today`;
  }

  protected playMode(modeId: string): void {
    this.audio.unlock();
    this.audio.play('click');
    void this.haptics.impact('light');
    void this.router.navigate(['/mode', modeId]);
  }

  protected back(): void {
    this.audio.play('click');
    void this.router.navigate(['/menu']);
  }
}
