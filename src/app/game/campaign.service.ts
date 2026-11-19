import { Injectable, inject } from '@angular/core';
import { SaveService } from '../core/save/save.service';
import { CAMPAIGN, getLevelByKey } from './data/levels';
import { LevelScript } from './types';
import { WorldTheme } from './data/worlds';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly save = inject(SaveService);

  readonly worlds = CAMPAIGN;

  getLevel(worldId: string, levelNumber: number): LevelScript | undefined {
    return getLevelByKey(worldId, levelNumber);
  }

  getWorld(worldId: string): { theme: WorldTheme; levels: LevelScript[] } | undefined {
    return this.worlds.find((world) => world.theme.id === worldId);
  }

  isUnlocked(worldIndex: number, levelIndex: number): boolean {
    if (worldIndex === 0 && levelIndex === 0) return true;
    const world = this.worlds[worldIndex];
    if (!world) return false;
    const previous =
      levelIndex > 0
        ? world.levels[levelIndex - 1]
        : this.worlds[worldIndex - 1]?.levels[19];
    return previous ? this.save.isLevelCompleted(previous.id) : false;
  }

  isWorldUnlocked(worldIndex: number): boolean {
    return this.isUnlocked(worldIndex, 0);
  }

  worldStars(worldIndex: number): number {
    const world = this.worlds[worldIndex];
    if (!world) return 0;
    return world.levels.reduce((total, level) => total + this.save.getStars(level.id), 0);
  }

  worldCompletedCount(worldIndex: number): number {
    const world = this.worlds[worldIndex];
    if (!world) return 0;
    return world.levels.filter((level) => this.save.isLevelCompleted(level.id)).length;
  }

  /** First level the player has not finished yet, used by the "next" and "continue" buttons. */
  firstPlayableLevel(): { worldIndex: number; levelIndex: number } {
    for (let worldIndex = 0; worldIndex < this.worlds.length; worldIndex++) {
      const world = this.worlds[worldIndex];
      for (let levelIndex = 0; levelIndex < world.levels.length; levelIndex++) {
        if (!this.save.isLevelCompleted(world.levels[levelIndex].id)) {
          return { worldIndex, levelIndex };
        }
      }
    }
    return { worldIndex: this.worlds.length - 1, levelIndex: 19 };
  }

  totalStars(): number {
    return this.worlds.reduce((total, world, index) => total + this.worldStars(index), 0);
  }
}
