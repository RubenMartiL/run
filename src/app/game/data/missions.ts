import { Rng, hashString } from '../engine/rng';

export type MissionMetric = 'coins' | 'crowd' | 'wins' | 'runs' | 'distance' | 'bosses';

export interface MissionDef {
  id: string;
  metric: MissionMetric;
  title: string;
  hint: string;
  target: number;
  rewardCoins: number;
  rewardGems: number;
}

export const DAILY_POOL: MissionDef[] = [
  {
    id: 'daily-coins-120',
    metric: 'coins',
    title: 'Collect 120 coins',
    hint: 'Any mode counts.',
    target: 120,
    rewardCoins: 80,
    rewardGems: 0,
  },
  {
    id: 'daily-runs-2',
    metric: 'runs',
    title: 'Finish 2 runs',
    hint: 'Campaign or any mode.',
    target: 2,
    rewardCoins: 60,
    rewardGems: 0,
  },
  {
    id: 'daily-wins-1',
    metric: 'wins',
    title: 'Win 1 level',
    hint: 'Beat a level or a mode target.',
    target: 1,
    rewardCoins: 70,
    rewardGems: 0,
  },
  {
    id: 'daily-crowd-80',
    metric: 'crowd',
    title: 'Reach a crowd of 80',
    hint: 'Stack those multiplier gates.',
    target: 80,
    rewardCoins: 90,
    rewardGems: 1,
  },
  {
    id: 'daily-distance-3000',
    metric: 'distance',
    title: 'Run 3,000 distance',
    hint: 'Endless and Survival are great for this.',
    target: 3000,
    rewardCoins: 80,
    rewardGems: 0,
  },
  {
    id: 'daily-bosses-1',
    metric: 'bosses',
    title: 'Defeat 1 boss',
    hint: 'Boss levels are at 5, 15 and 20.',
    target: 1,
    rewardCoins: 120,
    rewardGems: 1,
  },
  {
    id: 'daily-coins-250',
    metric: 'coins',
    title: 'Collect 250 coins',
    hint: 'Coin gates and Coin Rush add up fast.',
    target: 250,
    rewardCoins: 140,
    rewardGems: 1,
  },
  {
    id: 'daily-wins-3',
    metric: 'wins',
    title: 'Win 3 runs',
    hint: 'String together a streak.',
    target: 3,
    rewardCoins: 160,
    rewardGems: 2,
  },
];

export function buildDailyMissions(dateKey: string): MissionDef[] {
  const rng = new Rng(hashString(`daily-missions-${dateKey}`) || 7);
  const pool = [...DAILY_POOL];
  const picked: MissionDef[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const index = Math.floor(rng.next() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export interface DailyReward {
  day: number;
  coins: number;
  gems: number;
}

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 50, gems: 0 },
  { day: 2, coins: 75, gems: 0 },
  { day: 3, coins: 100, gems: 0 },
  { day: 4, coins: 150, gems: 0 },
  { day: 5, coins: 200, gems: 1 },
  { day: 6, coins: 300, gems: 2 },
  { day: 7, coins: 450, gems: 5 },
];

export type AchievementStat =
  | 'runs'
  | 'wins'
  | 'coinsEarned'
  | 'bestCrowd'
  | 'totalDistance'
  | 'bossesDefeated'
  | 'stars';

export interface AchievementDef {
  id: string;
  title: string;
  hint: string;
  stat: AchievementStat;
  target: number;
  rewardCoins: number;
  rewardGems: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-steps', title: 'First Steps', hint: 'Finish your first run.', stat: 'runs', target: 1, rewardCoins: 50, rewardGems: 0 },
  { id: 'getting-started', title: 'Getting Started', hint: 'Finish 10 runs.', stat: 'runs', target: 10, rewardCoins: 120, rewardGems: 1 },
  { id: 'dedicated', title: 'Dedicated Runner', hint: 'Finish 50 runs.', stat: 'runs', target: 50, rewardCoins: 400, rewardGems: 3 },
  { id: 'first-win', title: 'First Victory', hint: 'Win a single run.', stat: 'wins', target: 1, rewardCoins: 60, rewardGems: 0 },
  { id: 'winner', title: 'Serial Winner', hint: 'Win 25 runs.', stat: 'wins', target: 25, rewardCoins: 350, rewardGems: 2 },
  { id: 'crowd-100', title: 'Crowd Control', hint: 'Reach a crowd of 100.', stat: 'bestCrowd', target: 100, rewardCoins: 150, rewardGems: 1 },
  { id: 'crowd-1000', title: 'Mega Crowd', hint: 'Reach a crowd of 1,000.', stat: 'bestCrowd', target: 1000, rewardCoins: 500, rewardGems: 5 },
  { id: 'coins-1000', title: 'Coin Collector', hint: 'Earn 1,000 coins lifetime.', stat: 'coinsEarned', target: 1000, rewardCoins: 100, rewardGems: 0 },
  { id: 'coins-10000', title: 'Coin Tycoon', hint: 'Earn 10,000 coins lifetime.', stat: 'coinsEarned', target: 10000, rewardCoins: 600, rewardGems: 5 },
  { id: 'distance-10000', title: 'Long Haul', hint: 'Run 10,000 total distance.', stat: 'totalDistance', target: 10000, rewardCoins: 250, rewardGems: 2 },
  { id: 'boss-slayer', title: 'Boss Slayer', hint: 'Defeat 5 bosses.', stat: 'bossesDefeated', target: 5, rewardCoins: 300, rewardGems: 2 },
  { id: 'star-hunter', title: 'Star Hunter', hint: 'Collect 30 campaign stars.', stat: 'stars', target: 30, rewardCoins: 350, rewardGems: 3 },
  { id: 'star-legend', title: 'Star Legend', hint: 'Collect 120 campaign stars.', stat: 'stars', target: 120, rewardCoins: 900, rewardGems: 8 },
];

export interface WeeklyEvent {
  id: string;
  title: string;
  hint: string;
  metric: MissionMetric;
  target: number;
  rewardCoins: number;
  rewardGems: number;
}

export const WEEKLY_EVENT: WeeklyEvent = {
  id: 'coin-carnival',
  title: 'Coin Carnival',
  hint: 'Collect 600 coins this week to unlock the event chest.',
  metric: 'coins',
  target: 600,
  rewardCoins: 500,
  rewardGems: 6,
};

export const CHEST_REWARDS = [
  { coins: 30, gems: 0 },
  { coins: 45, gems: 0 },
  { coins: 60, gems: 0 },
  { coins: 80, gems: 0 },
  { coins: 100, gems: 1 },
  { coins: 130, gems: 2 },
];

export function rollChest(seed: number): { coins: number; gems: number } {
  const index = seed % CHEST_REWARDS.length;
  return CHEST_REWARDS[index];
}
