export const SAVE_VERSION = 2;
export const SAVE_KEY = 'gate-runner.save';
export const SAVE_BACKUP_KEY = 'gate-runner.save.backup';
export const LEGACY_SAVE_KEYS = ['gate-runner.save.v1'];

export interface LevelRecord {
  stars: number;
  bestCrowd: number;
  plays: number;
  completedAt: number;
}

export interface EndlessRecord {
  bestDistance: number;
  bestCrowd: number;
  bestCoins: number;
  runs: number;
}

export interface TimeAttackRecord {
  bestTime: number;
  runs: number;
  goldMedals: number;
}

export interface CoinRushRecord {
  bestCoins: number;
  target: number;
  clears: number;
}

export interface SurvivalRecord {
  bestDistance: number;
  bestCrowd: number;
  runs: number;
}

export interface BossRushRecord {
  bestBosses: number;
  clears: number;
}

export interface DailyChallengeRecord {
  bestTime: number;
  dateKey: string;
  clears: number;
}

export interface ModeRecords {
  endless: EndlessRecord;
  timeAttack: TimeAttackRecord;
  daily: DailyChallengeRecord;
  coinRush: CoinRushRecord;
  survival: SurvivalRecord;
  bossRush: BossRushRecord;
}

export interface UpgradeLevels {
  startingCrowd: number;
  coinBonus: number;
  gateBonus: number;
  luckyReward: number;
}

export interface EquippedCosmetics {
  crowd: string;
  hat: string;
  trail: string;
  victory: string;
}

export interface CosmeticsState {
  owned: string[];
  equipped: EquippedCosmetics;
}

export interface DailyMissionsState {
  dateKey: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface DailyRewardState {
  streak: number;
  lastClaimDate: string;
  bonusClaimedDate: string;
}

export interface ChestState {
  lastOpenedDate: string;
  bonusOpenedDate: string;
}

export interface MissionsState {
  daily: DailyMissionsState;
  achievements: {
    claimed: string[];
  };
  event: {
    progress: number;
    claimed: boolean;
    weekKey: string;
  };
  chest: ChestState;
}

export interface SaveData {
  version: number;
  createdAt: number;
  updatedAt: number;
  wallet: {
    coins: number;
    gems: number;
  };
  campaign: {
    levels: Record<string, LevelRecord>;
  };
  modes: ModeRecords;
  upgrades: UpgradeLevels;
  cosmetics: CosmeticsState;
  missions: MissionsState;
  dailyReward: DailyRewardState;
  settings: {
    sound: boolean;
    music: boolean;
    haptics: boolean;
  };
  stats: {
    runs: number;
    wins: number;
    coinsEarned: number;
    bestCrowd: number;
    totalDistance: number;
    bossesDefeated: number;
  };
}

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  crowd: 'crowd-classic',
  hat: 'hat-none',
  trail: 'trail-none',
  victory: 'victory-confetti',
};

export const DEFAULT_OWNED = [
  'crowd-classic',
  'hat-none',
  'trail-none',
  'victory-confetti',
];

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekKey(date = new Date()): string {
  const first = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - first.getTime()) / 86_400_000);
  return `${date.getFullYear()}-W${Math.floor(days / 7)}`;
}

export function createDefaultSave(now = Date.now()): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    wallet: { coins: 150, gems: 0 },
    campaign: { levels: {} },
    modes: {
      endless: { bestDistance: 0, bestCrowd: 0, bestCoins: 0, runs: 0 },
      timeAttack: { bestTime: 0, runs: 0, goldMedals: 0 },
      daily: { bestTime: 0, dateKey: '', clears: 0 },
      coinRush: { bestCoins: 0, target: 0, clears: 0 },
      survival: { bestDistance: 0, bestCrowd: 0, runs: 0 },
      bossRush: { bestBosses: 0, clears: 0 },
    },
    upgrades: { startingCrowd: 0, coinBonus: 0, gateBonus: 0, luckyReward: 0 },
    cosmetics: {
      owned: [...DEFAULT_OWNED],
      equipped: { ...DEFAULT_EQUIPPED },
    },
    missions: {
      daily: { dateKey: '', progress: {}, claimed: [] },
      achievements: { claimed: [] },
      event: { progress: 0, claimed: false, weekKey: '' },
      chest: { lastOpenedDate: '', bonusOpenedDate: '' },
    },
    dailyReward: { streak: 0, lastClaimDate: '', bonusClaimedDate: '' },
    settings: { sound: true, music: true, haptics: true },
    stats: {
      runs: 0,
      wins: 0,
      coinsEarned: 0,
      bestCrowd: 0,
      totalDistance: 0,
      bossesDefeated: 0,
    },
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= 40 ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeLevels(value: unknown): Record<string, LevelRecord> {
  const source = asRecord(value);
  const result: Record<string, LevelRecord> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (typeof key !== 'string' || key.length > 40) continue;
    const record = asRecord(raw);
    if (typeof record['stars'] !== 'number') continue;
    result[key] = {
      stars: clampInt(record['stars'], 0, 3, 0),
      bestCrowd: clampInt(record['bestCrowd'], 0, 1_000_000, 0),
      plays: clampInt(record['plays'], 0, 1_000_000, 1),
      completedAt: clampInt(record['completedAt'], 0, Number.MAX_SAFE_INTEGER, 0),
    };
  }
  return result;
}

function sanitizeModes(value: unknown, fallback: ModeRecords): ModeRecords {
  const source = asRecord(value);
  const endless = asRecord(source['endless']);
  const timeAttack = asRecord(source['timeAttack']);
  const daily = asRecord(source['daily']);
  const coinRush = asRecord(source['coinRush']);
  const survival = asRecord(source['survival']);
  const bossRush = asRecord(source['bossRush']);
  return {
    endless: {
      bestDistance: clampInt(endless['bestDistance'], 0, 10_000_000, 0),
      bestCrowd: clampInt(endless['bestCrowd'], 0, 1_000_000, 0),
      bestCoins: clampInt(endless['bestCoins'], 0, 1_000_000, 0),
      runs: clampInt(endless['runs'], 0, 1_000_000, 0),
    },
    timeAttack: {
      bestTime: clampInt(timeAttack['bestTime'], 0, 3600, 0),
      runs: clampInt(timeAttack['runs'], 0, 1_000_000, 0),
      goldMedals: clampInt(timeAttack['goldMedals'], 0, 1_000_000, 0),
    },
    daily: {
      bestTime: clampInt(daily['bestTime'], 0, 3600, 0),
      dateKey: asString(daily['dateKey'], ''),
      clears: clampInt(daily['clears'], 0, 1_000_000, 0),
    },
    coinRush: {
      bestCoins: clampInt(coinRush['bestCoins'], 0, 1_000_000, 0),
      target: clampInt(coinRush['target'], 0, 100_000, 0),
      clears: clampInt(coinRush['clears'], 0, 1_000_000, 0),
    },
    survival: {
      bestDistance: clampInt(survival['bestDistance'], 0, 10_000_000, 0),
      bestCrowd: clampInt(survival['bestCrowd'], 0, 1_000_000, 0),
      runs: clampInt(survival['runs'], 0, 1_000_000, 0),
    },
    bossRush: {
      bestBosses: clampInt(bossRush['bestBosses'], 0, 100, 0),
      clears: clampInt(bossRush['clears'], 0, 1_000_000, 0),
    },
  };
  void fallback;
}

function sanitizeStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || item.length > 60 || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= max) break;
  }
  return result;
}

function sanitizeProgress(value: unknown): Record<string, number> {
  const source = asRecord(value);
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (key.length > 60) continue;
    result[key] = clampInt(raw, 0, 10_000_000, 0);
  }
  return result;
}

export function sanitizeSave(raw: unknown): SaveData {
  const fallback = createDefaultSave();
  const source = asRecord(raw);
  const wallet = asRecord(source['wallet']);
  const campaign = asRecord(source['campaign']);
  const settings = asRecord(source['settings']);
  const stats = asRecord(source['stats']);
  const upgrades = asRecord(source['upgrades']);
  const cosmetics = asRecord(source['cosmetics']);
  const equipped = asRecord(cosmetics['equipped']);
  const missions = asRecord(source['missions']);
  const daily = asRecord(missions['daily']);
  const achievements = asRecord(missions['achievements']);
  const event = asRecord(missions['event']);
  const chest = asRecord(missions['chest']);
  const dailyReward = asRecord(source['dailyReward']);

  return {
    version: SAVE_VERSION,
    createdAt: clampInt(source['createdAt'], 0, Number.MAX_SAFE_INTEGER, fallback.createdAt),
    updatedAt: clampInt(source['updatedAt'], 0, Number.MAX_SAFE_INTEGER, fallback.updatedAt),
    wallet: {
      coins: clampInt(wallet['coins'], 0, 9_999_999, fallback.wallet.coins),
      gems: clampInt(wallet['gems'], 0, 9_999_999, fallback.wallet.gems),
    },
    campaign: { levels: sanitizeLevels(campaign['levels']) },
    modes: sanitizeModes(source['modes'], fallback.modes),
    upgrades: {
      startingCrowd: clampInt(upgrades['startingCrowd'], 0, 10, 0),
      coinBonus: clampInt(upgrades['coinBonus'], 0, 10, 0),
      gateBonus: clampInt(upgrades['gateBonus'], 0, 10, 0),
      luckyReward: clampInt(upgrades['luckyReward'], 0, 10, 0),
    },
    cosmetics: {
      owned: Array.from(
        new Set([...DEFAULT_OWNED, ...sanitizeStringList(cosmetics['owned'], 100)]),
      ),
      equipped: {
        crowd: asString(equipped['crowd'], DEFAULT_EQUIPPED.crowd),
        hat: asString(equipped['hat'], DEFAULT_EQUIPPED.hat),
        trail: asString(equipped['trail'], DEFAULT_EQUIPPED.trail),
        victory: asString(equipped['victory'], DEFAULT_EQUIPPED.victory),
      },
    },
    missions: {
      daily: {
        dateKey: asString(daily['dateKey'], ''),
        progress: sanitizeProgress(daily['progress']),
        claimed: sanitizeStringList(daily['claimed'], 50),
      },
      achievements: { claimed: sanitizeStringList(achievements['claimed'], 200) },
      event: {
        progress: clampInt(event['progress'], 0, 10_000_000, 0),
        claimed: asBool(event['claimed'], false),
        weekKey: asString(event['weekKey'], ''),
      },
      chest: {
        lastOpenedDate: asString(chest['lastOpenedDate'], ''),
        bonusOpenedDate: asString(chest['bonusOpenedDate'], ''),
      },
    },
    dailyReward: {
      streak: clampInt(dailyReward['streak'], 0, 7, 0),
      lastClaimDate: asString(dailyReward['lastClaimDate'], ''),
      bonusClaimedDate: asString(dailyReward['bonusClaimedDate'], ''),
    },
    settings: {
      sound: asBool(settings['sound'], fallback.settings.sound),
      music: asBool(settings['music'], fallback.settings.music),
      haptics: asBool(settings['haptics'], fallback.settings.haptics),
    },
    stats: {
      runs: clampInt(stats['runs'], 0, 9_999_999, 0),
      wins: clampInt(stats['wins'], 0, 9_999_999, 0),
      coinsEarned: clampInt(stats['coinsEarned'], 0, 999_999_999, 0),
      bestCrowd: clampInt(stats['bestCrowd'], 0, 1_000_000, 0),
      totalDistance: clampInt(stats['totalDistance'], 0, 999_999_999, 0),
      bossesDefeated: clampInt(stats['bossesDefeated'], 0, 999_999, 0),
    },
  };
}
