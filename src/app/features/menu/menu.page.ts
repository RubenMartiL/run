import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { CampaignService } from '../../game/campaign.service';
import { MissionsService } from '../../core/retention/missions.service';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './menu.page.html',
  styleUrl: './menu.page.css',
})
export class MenuPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  protected readonly save = inject(SaveService);
  protected readonly campaign = inject(CampaignService);
  protected readonly missions = inject(MissionsService);

  protected readonly coins = this.save.coins;
  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly confirmReset = signal(false);
  protected readonly settings = computed(() => this.save.data().settings);
  protected readonly totalStars = computed(() => this.campaign.totalStars());
  protected readonly bestCrowd = computed(() => this.save.data().stats.bestCrowd);
  protected readonly nextLevel = computed(() => {
    const next = this.campaign.firstPlayableLevel();
    const world = this.campaign.worlds[next.worldIndex];
    return {
      worldId: world.theme.id,
      worldName: world.theme.name,
      worldIndex: next.worldIndex,
      levelNumber: next.levelIndex + 1,
      from: world.theme.uiFrom,
      to: world.theme.uiTo,
    };
  });
  protected readonly totalRuns = computed(() => this.save.data().stats.runs);
  protected readonly rewardReady = computed(
    () =>
      this.missions.daily().some((mission) => mission.complete && !mission.claimed) ||
      this.missions.dailyRewardAvailable() ||
      this.missions.chestAvailable() ||
      this.missions.eventComplete(),
  );

  protected play(): void {
    this.tap();
    void this.router.navigate(['/campaign']);
  }

  protected openModes(): void {
    this.tap();
    void this.router.navigate(['/modes']);
  }

  protected openShop(): void {
    this.tap();
    void this.router.navigate(['/shop']);
  }

  protected openMissions(): void {
    this.tap();
    void this.router.navigate(['/missions']);
  }

  protected continueRun(): void {
    this.tap();
    const next = this.nextLevel();
    void this.router.navigate(['/play', next.worldId, next.levelNumber]);
  }

  protected openSettings(): void {
    this.tap();
    this.settingsOpen.set(true);
  }

  protected openHelp(): void {
    this.tap();
    this.helpOpen.set(true);
  }

  protected closePanels(): void {
    this.tap();
    this.settingsOpen.set(false);
    this.helpOpen.set(false);
    this.confirmReset.set(false);
  }

  protected toggleSound(): void {
    this.audio.unlock();
    const next = !this.settings().sound;
    this.save.setSetting('sound', next);
    this.audio.setEnabled(next);
    if (next) this.audio.play('click');
  }

  protected toggleHaptics(): void {
    const next = !this.settings().haptics;
    this.save.setSetting('haptics', next);
    this.haptics.setEnabled(next);
    if (next) void this.haptics.impact('light');
    this.audio.play('click');
  }

  protected toggleMusic(): void {
    this.audio.unlock();
    const next = !this.settings().music;
    this.save.setSetting('music', next);
    this.audio.setMusicEnabled(next);
    this.audio.play('click');
  }

  protected requestReset(): void {
    if (!this.confirmReset()) {
      this.confirmReset.set(true);
      this.tap();
      return;
    }
    this.save.resetProgress();
    this.confirmReset.set(false);
    this.tap();
  }

  protected tap(): void {
    this.audio.unlock();
    this.audio.play('click');
    void this.haptics.impact('light');
  }
}
