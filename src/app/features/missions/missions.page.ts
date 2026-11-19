import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { MissionsService } from '../../core/retention/missions.service';
import { MonetizationService } from '../../core/monetization/monetization.service';
import { DAILY_REWARDS, WEEKLY_EVENT } from '../../game/data/missions';
import { IconComponent } from '../../shared/icon';
import { JuiceService } from '../../shared/juice.service';

@Component({
  selector: 'app-missions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './missions.page.html',
  styleUrl: './missions.page.css',
})
export class MissionsPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly ads = inject(MonetizationService);
  private readonly juice = inject(JuiceService);
  protected readonly save = inject(SaveService);
  protected readonly missions = inject(MissionsService);

  protected readonly tab = signal<'daily' | 'rewards' | 'achievements'>('daily');
  protected readonly toast = signal('');
  protected readonly coins = this.save.coins;
  protected readonly gems = this.save.gems;
  protected readonly daily = this.missions.daily;
  protected readonly achievements = this.missions.achievements;
  protected readonly dailyRewards = DAILY_REWARDS;
  protected readonly weeklyEvent = WEEKLY_EVENT;
  protected readonly streak = this.missions.currentStreak;
  protected readonly nextStreak = this.missions.nextStreakPreview;
  protected readonly dailyRewardAvailable = this.missions.dailyRewardAvailable;
  protected readonly dailyBonusAvailable = this.missions.dailyBonusAvailable;
  protected readonly chestAvailable = this.missions.chestAvailable;
  protected readonly bonusChestAvailable = this.missions.bonusChestAvailable;
  protected readonly eventProgress = this.missions.eventProgress;
  protected readonly eventComplete = this.missions.eventComplete;
  protected readonly eventClaimed = this.missions.eventClaimed;
  protected readonly completedDailies = computed(
    () => this.daily().filter((entry) => entry.complete && !entry.claimed).length,
  );

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.missions.ensureDaily();
  }

  protected setTab(tab: 'daily' | 'rewards' | 'achievements'): void {
    this.tap();
    this.tab.set(tab);
  }

  protected progressPercent(progress: number, target: number): number {
    return Math.min(100, Math.round((progress / Math.max(1, target)) * 100));
  }

  protected claimDaily(id: string): void {
    const mission = this.daily().find((entry) => entry.def.id === id);
    if (this.missions.claimDaily(id)) {
      this.flash('Daily mission reward claimed');
      this.juice.celebrate(`+${mission?.def.rewardCoins ?? 0} COINS`);
      this.audio.play('combo');
      void this.haptics.notify('success');
    }
  }

  protected claimAchievement(id: string): void {
    const achievement = this.achievements().find((entry) => entry.def.id === id);
    if (this.missions.claimAchievement(id)) {
      this.flash('Achievement reward claimed');
      this.juice.celebrate(`+${achievement?.def.rewardCoins ?? 0} COINS`, '#ffd447');
      this.audio.play('combo');
      void this.haptics.notify('success');
    }
  }

  protected claimReward(): void {
    const reward = this.missions.claimDailyReward();
    if (!reward) return;
    this.flash(`Day ${this.streak()} claimed · +${reward.coins} coins`);
    this.juice.celebrate(`DAY ${this.streak()} · +${reward.coins} COINS`, '#ffe98a');
    this.audio.play('win');
    void this.haptics.notify('success');
  }

  protected async claimBonus(): Promise<void> {
    const granted = await this.ads.showRewarded('extraDaily');
    if (!granted) return;
    const reward = this.missions.claimDailyBonus();
    if (reward) {
      this.flash(`Bonus reward · +${reward.coins} coins`);
      this.juice.celebrate(`BONUS · +${reward.coins} COINS`, '#ffd447');
      this.audio.play('power');
    }
  }

  protected openChest(kind: 'free' | 'bonus'): void {
    const reward = this.missions.openChest(kind);
    if (!reward) return;
    this.flash(`Chest opened · +${reward.coins} coins${reward.gems > 0 ? ` · +${reward.gems} gems` : ''}`);
    this.juice.celebrate(
      `CHEST · +${reward.coins} COINS${reward.gems > 0 ? ` · +${reward.gems} GEMS` : ''}`,
      kind === 'free' ? '#ffd447' : '#c9a7ff',
    );
    this.audio.play('power');
    void this.haptics.notify('success');
  }

  protected async openBonusChest(): Promise<void> {
    const granted = await this.ads.showRewarded('extraChest');
    if (!granted) return;
    this.openChest('bonus');
  }

  protected claimEvent(): void {
    if (this.missions.claimEvent()) {
      this.flash('Event reward claimed');
      this.juice.celebrate(
        `EVENT · +${WEEKLY_EVENT.rewardCoins} COINS · +${WEEKLY_EVENT.rewardGems} GEMS`,
        '#ffd447',
      );
      this.audio.play('win');
      void this.haptics.notify('success');
    }
  }

  protected back(): void {
    this.tap();
    void this.router.navigate(['/menu']);
  }

  private flash(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1900);
  }

  private tap(): void {
    this.audio.unlock();
    this.audio.play('click');
    void this.haptics.impact('light');
  }
}
