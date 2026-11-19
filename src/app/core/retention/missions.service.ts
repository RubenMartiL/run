import { Injectable, computed, inject } from '@angular/core';
import { SaveService } from '../../core/save/save.service';
import { localDateKey, weekKey } from '../../core/save/save.types';
import {
  ACHIEVEMENTS,
  AchievementDef,
  AchievementStat,
  DAILY_REWARDS,
  DailyReward,
  MissionDef,
  MissionMetric,
  WEEKLY_EVENT,
  buildDailyMissions,
  rollChest,
} from '../../game/data/missions';
import { hashString } from '../../game/engine/rng';

export interface MissionProgress {
  def: MissionDef;
  progress: number;
  claimed: boolean;
  complete: boolean;
}

export interface AchievementProgress {
  def: AchievementDef;
  progress: number;
  claimed: boolean;
  complete: boolean;
}

export interface RunSummary {
  coins: number;
  crowd: number;
  won: boolean;
  distance: number;
  bosses: number;
}

@Injectable({ providedIn: 'root' })
export class MissionsService {
  private readonly save = inject(SaveService);

  readonly dailyMissions = computed(() => buildDailyMissions(localDateKey()));

  readonly daily = computed<MissionProgress[]>(() => {
    const state = this.save.data().missions.daily;
    const today = localDateKey();
    const claimed = new Set(state.dateKey === today ? state.claimed : []);
    const progress = state.dateKey === today ? state.progress : {};
    return this.dailyMissions().map((def) => {
      const value = progress[def.id] ?? 0;
      return {
        def,
        progress: Math.min(value, def.target),
        claimed: claimed.has(def.id),
        complete: value >= def.target,
      };
    });
  });

  readonly achievements = computed<AchievementProgress[]>(() => {
    const claimed = new Set(this.save.data().missions.achievements.claimed);
    return ACHIEVEMENTS.map((def) => {
      const value = this.statValue(def.stat);
      return {
        def,
        progress: Math.min(value, def.target),
        claimed: claimed.has(def.id),
        complete: value >= def.target,
      };
    });
  });

  readonly totalStars = computed(() => {
    const levels = this.save.data().campaign.levels;
    return Object.values(levels).reduce((total, record) => total + record.stars, 0);
  });

  readonly eventProgress = computed(() => {
    const event = this.save.data().missions.event;
    if (event.weekKey !== weekKey()) return 0;
    return Math.min(event.progress, WEEKLY_EVENT.target);
  });

  readonly eventClaimed = computed(() => {
    const event = this.save.data().missions.event;
    return event.weekKey === weekKey() && event.claimed;
  });

  readonly eventComplete = computed(() => this.eventProgress() >= WEEKLY_EVENT.target);

  readonly dailyRewardAvailable = computed(
    () => this.save.data().dailyReward.lastClaimDate !== localDateKey(),
  );

  readonly dailyBonusAvailable = computed(() => {
    const state = this.save.data().dailyReward;
    return state.lastClaimDate === localDateKey() && state.bonusClaimedDate !== localDateKey();
  });

  readonly chestAvailable = computed(
    () => this.save.data().missions.chest.lastOpenedDate !== localDateKey(),
  );

  readonly bonusChestAvailable = computed(
    () => this.save.data().missions.chest.bonusOpenedDate !== localDateKey(),
  );

  readonly currentStreak = computed(() => this.save.data().dailyReward.streak);

  readonly todayReward = computed<DailyReward>(() => {
    const streak = this.currentStreak();
    const day = Math.max(1, Math.min(DAILY_REWARDS.length, streak || 1));
    return DAILY_REWARDS[day - 1];
  });

  readonly nextStreakPreview = computed(() => {
    const state = this.save.data().dailyReward;
    if (state.lastClaimDate === localDateKey()) return state.streak;
    if (state.lastClaimDate === this.yesterdayKey()) {
      return Math.min(DAILY_REWARDS.length, state.streak + 1);
    }
    return 1;
  });

  ensureDaily(): void {
    const today = localDateKey();
    const state = this.save.data().missions.daily;
    const currentWeek = weekKey();
    const event = this.save.data().missions.event;
    const needsDaily = state.dateKey !== today;
    const needsEvent = event.weekKey !== currentWeek;

    if (!needsDaily && !needsEvent) return;

    this.save.update((save) => ({
      ...save,
      missions: {
        ...save.missions,
        daily: needsDaily
          ? { dateKey: today, progress: {}, claimed: [] }
          : save.missions.daily,
        event: needsEvent
          ? { weekKey: currentWeek, progress: 0, claimed: false }
          : save.missions.event,
      },
    }));
  }

  recordRun(summary: RunSummary): void {
    this.ensureDaily();
    const today = localDateKey();
    const defs = buildDailyMissions(today);

    this.save.update((save) => {
      if (save.missions.daily.dateKey !== today) {
        return save;
      }
      const progress = { ...save.missions.daily.progress };
      for (const def of defs) {
        const increment = this.incrementFor(def.metric, summary);
        if (increment <= 0) continue;
        const current = progress[def.id] ?? 0;
        progress[def.id] =
          def.metric === 'crowd'
            ? Math.max(current, Math.round(increment))
            : current + Math.round(increment);
      }
      return {
        ...save,
        missions: {
          ...save.missions,
          daily: { ...save.missions.daily, progress },
        },
      };
    });

    this.save.touchEventProgress(summary.coins);
  }

  claimDaily(id: string): boolean {
    const mission = this.daily().find((entry) => entry.def.id === id);
    if (!mission || !mission.complete || mission.claimed) return false;
    const today = localDateKey();
    this.save.update((save) => {
      if (save.missions.daily.dateKey !== today) return save;
      return {
        ...save,
        wallet: {
          coins: save.wallet.coins + mission.def.rewardCoins,
          gems: save.wallet.gems + mission.def.rewardGems,
        },
        stats: {
          ...save.stats,
          coinsEarned: save.stats.coinsEarned + mission.def.rewardCoins,
        },
        missions: {
          ...save.missions,
          daily: {
            ...save.missions.daily,
            claimed: [...save.missions.daily.claimed, id],
          },
        },
      };
    });
    return true;
  }

  claimAchievement(id: string): boolean {
    const achievement = this.achievements().find((entry) => entry.def.id === id);
    if (!achievement || !achievement.complete || achievement.claimed) return false;
    this.save.update((save) => ({
      ...save,
      wallet: {
        coins: save.wallet.coins + achievement.def.rewardCoins,
        gems: save.wallet.gems + achievement.def.rewardGems,
      },
      stats: {
        ...save.stats,
        coinsEarned: save.stats.coinsEarned + achievement.def.rewardCoins,
      },
      missions: {
        ...save.missions,
        achievements: {
          claimed: [...save.missions.achievements.claimed, id],
        },
      },
    }));
    return true;
  }

  claimEvent(): boolean {
    if (!this.eventComplete() || this.eventClaimed()) return false;
    this.save.update((save) => ({
      ...save,
      wallet: {
        coins: save.wallet.coins + WEEKLY_EVENT.rewardCoins,
        gems: save.wallet.gems + WEEKLY_EVENT.rewardGems,
      },
      stats: {
        ...save.stats,
        coinsEarned: save.stats.coinsEarned + WEEKLY_EVENT.rewardCoins,
      },
      missions: {
        ...save.missions,
        event: { ...save.missions.event, claimed: true },
      },
    }));
    return true;
  }

  claimDailyReward(): DailyReward | null {
    if (!this.dailyRewardAvailable()) return null;
    const streak = this.nextStreakPreview();
    const reward = DAILY_REWARDS[Math.max(0, streak - 1)];
    const today = localDateKey();
    this.save.update((save) => ({
      ...save,
      wallet: {
        coins: save.wallet.coins + reward.coins,
        gems: save.wallet.gems + reward.gems,
      },
      stats: {
        ...save.stats,
        coinsEarned: save.stats.coinsEarned + reward.coins,
      },
      dailyReward: {
        ...save.dailyReward,
        streak,
        lastClaimDate: today,
      },
    }));
    return reward;
  }

  claimDailyBonus(): DailyReward | null {
    if (!this.dailyBonusAvailable()) return null;
    const reward = this.todayReward();
    const today = localDateKey();
    this.save.update((save) => ({
      ...save,
      wallet: {
        coins: save.wallet.coins + reward.coins,
        gems: save.wallet.gems + reward.gems,
      },
      stats: {
        ...save.stats,
        coinsEarned: save.stats.coinsEarned + reward.coins,
      },
      dailyReward: { ...save.dailyReward, bonusClaimedDate: today },
    }));
    return reward;
  }

  openChest(kind: 'free' | 'bonus'): { coins: number; gems: number } | null {
    const available = kind === 'free' ? this.chestAvailable() : this.bonusChestAvailable();
    if (!available) return null;
    const today = localDateKey();
    const reward = rollChest(hashString(`${today}-${kind}-${this.save.data().stats.runs}`));
    this.save.update((save) => ({
      ...save,
      wallet: {
        coins: save.wallet.coins + reward.coins,
        gems: save.wallet.gems + reward.gems,
      },
      stats: {
        ...save.stats,
        coinsEarned: save.stats.coinsEarned + reward.coins,
      },
      missions: {
        ...save.missions,
        chest: {
          ...save.missions.chest,
          ...(kind === 'free'
            ? { lastOpenedDate: today }
            : { bonusOpenedDate: today }),
        },
      },
    }));
    return reward;
  }

  private incrementFor(metric: MissionMetric, summary: RunSummary): number {
    switch (metric) {
      case 'coins':
        return summary.coins;
      case 'crowd':
        return summary.crowd;
      case 'wins':
        return summary.won ? 1 : 0;
      case 'runs':
        return 1;
      case 'distance':
        return summary.distance;
      case 'bosses':
        return summary.bosses;
    }
  }

  private statValue(stat: AchievementStat): number {
    if (stat === 'stars') return this.totalStars();
    return this.save.data().stats[stat] ?? 0;
  }

  private yesterdayKey(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return localDateKey(date);
  }
}
