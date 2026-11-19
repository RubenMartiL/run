import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { SaveService } from '../../core/save/save.service';
import { CampaignService } from '../../game/campaign.service';
import { IconComponent } from '../../shared/icon';

@Component({
  selector: 'app-campaign',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './campaign.page.html',
  styleUrl: './campaign.page.css',
})
export class CampaignPage {
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  protected readonly save = inject(SaveService);
  protected readonly campaign = inject(CampaignService);

  protected readonly worlds = this.campaign.worlds;
  protected readonly coins = this.save.coins;
  protected readonly selectedWorld = signal<number | null>(null);

  constructor() {
    const next = this.campaign.firstPlayableLevel();
    this.selectedWorld.set(next.worldIndex);
  }

  protected starsFor(levelId: string): number {
    return this.save.getStars(levelId);
  }

  protected worldStars(worldIndex: number): number {
    return this.campaign.worldStars(worldIndex);
  }

  protected completedCount(worldIndex: number): number {
    return this.campaign.worldCompletedCount(worldIndex);
  }

  protected isWorldUnlocked(worldIndex: number): boolean {
    return this.campaign.isWorldUnlocked(worldIndex);
  }

  protected isLevelUnlocked(worldIndex: number, levelIndex: number): boolean {
    return this.campaign.isUnlocked(worldIndex, levelIndex);
  }

  protected toggleWorld(worldIndex: number): void {
    this.audio.unlock();
    if (!this.isWorldUnlocked(worldIndex)) {
      this.audio.play('gateBad');
      void this.haptics.impact('light');
      return;
    }
    this.audio.play('click');
    this.selectedWorld.update((current) => (current === worldIndex ? null : worldIndex));
  }

  protected playLevel(worldIndex: number, levelIndex: number, levelId: string): void {
    if (!this.isLevelUnlocked(worldIndex, levelIndex)) return;
    this.audio.unlock();
    this.audio.play('click');
    void this.haptics.impact('light');
    const world = this.worlds[worldIndex];
    void this.router.navigate(['/play', world.theme.id, levelIndex + 1]);
    void levelId;
  }

  protected back(): void {
    this.audio.play('click');
    void this.router.navigate(['/menu']);
  }

  protected progressPercent(worldIndex: number): number {
    return (this.completedCount(worldIndex) / 20) * 100;
  }
}
