import { applyGateOp } from '../gates';
import { Rng, hashString } from '../engine/rng';
import {
  CoinSpec,
  GateOp,
  GatePairSpec,
  GameMode,
  LevelScript,
  ModeRules,
  ObstacleSpec,
  StarThresholds,
} from '../types';
import { WORLD_THEMES, WorldTheme } from './worlds';

export interface ModeDefinition {
  id: Exclude<GameMode, 'campaign' | 'daily'>;
  name: string;
  tagline: string;
  description: string;
  icon: 'bolt' | 'target' | 'coin' | 'shield' | 'crown';
  accent: string;
  scoreLabel: string;
}

export const MODE_DEFS: ModeDefinition[] = [
  {
    id: 'endless',
    name: 'Endless',
    tagline: 'How far can the crowd go?',
    description: 'An infinite-feeling track that gets harder the further you run.',
    icon: 'bolt',
    accent: '#5b8cff',
    scoreLabel: 'DISTANCE',
  },
  {
    id: 'timeAttack',
    name: 'Time Attack',
    tagline: 'Beat the clock, not the boss',
    description: 'A fixed course, a hard deadline and medal times. Upgrades are disabled.',
    icon: 'target',
    accent: '#8cf03a',
    scoreLabel: 'BEST TIME',
  },
  {
    id: 'coinRush',
    name: 'Coin Rush',
    tagline: 'Fill your pockets',
    description: 'Collect as many coins as possible before the timer runs out.',
    icon: 'coin',
    accent: '#ffd447',
    scoreLabel: 'BEST COINS',
  },
  {
    id: 'survival',
    name: 'Survival',
    tagline: 'No helping hands',
    description: 'Only harmful gates and dense hazards. Survive as long as you can.',
    icon: 'shield',
    accent: '#ff7a6b',
    scoreLabel: 'DISTANCE',
  },
  {
    id: 'bossRush',
    name: 'Boss Rush',
    tagline: 'Three bosses, one crowd',
    description: 'Defeat consecutive bosses. Your surviving crowd carries into the next fight.',
    icon: 'crown',
    accent: '#a78bfa',
    scoreLabel: 'BOSSES',
  },
];

const DEFAULT_STARS: StarThresholds = { one: 1, two: 5, three: 10 };

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function gatePair(rng: Rng, tier: number, survival: boolean): GatePairSpec {
  if (survival) {
    const left: GateOp = rng.chance(0.18)
      ? { kind: 'shield', value: 1 }
      : rng.chance(0.3)
        ? { kind: 'div', value: 2 }
        : { kind: 'sub', value: Math.round((10 + tier * 3) / 5) * 5 };
    const right: GateOp = rng.chance(0.55)
      ? { kind: 'sub', value: Math.round((14 + tier * 3) / 5) * 5 }
      : { kind: 'div', value: rng.chance(0.25) ? 3 : 2 };
    return { y: 0, left, right };
  }

  const positive: GateOp[] = [
    { kind: 'add', value: Math.round((15 + tier * 4) / 5) * 5 },
    { kind: 'add', value: Math.round((25 + tier * 6) / 5) * 5 },
    { kind: 'mul', value: tier > 8 && rng.chance(0.35) ? 3 : 2 },
    { kind: 'percent', value: rng.pick([25, 50, 75]) },
    { kind: rng.pick(['shield', 'magnet', 'turbo'] as const), value: 1 },
  ];
  const negative: GateOp[] = [
    { kind: 'sub', value: Math.round((10 + tier * 3) / 5) * 5 },
    { kind: 'div', value: rng.chance(0.25) ? 3 : 2 },
  ];

  const left = rng.pick(positive);
  const right = rng.chance(0.45) ? rng.pick(positive) : rng.pick(negative);
  if (right.kind === left.kind && right.value === left.value) {
    return { y: 0, left, right: { kind: 'add', value: Math.round((20 + tier * 5) / 5) * 5 } };
  }
  return rng.chance(0.5) ? { y: 0, left: right, right: left } : { y: 0, left, right };
}

function makeGates(rng: Rng, count: number, spacing: number, startY: number, survival: boolean): GatePairSpec[] {
  const gates: GatePairSpec[] = [];
  for (let i = 0; i < count; i++) {
    const tier = Math.floor(i * 1.4);
    gates.push({ ...gatePair(rng, tier, survival), y: Math.round(startY + i * spacing) });
  }
  return gates;
}

function makeObstacles(
  rng: Rng,
  count: number,
  minY: number,
  maxY: number,
  survival: boolean,
): ObstacleSpec[] {
  const kinds = survival
    ? (['saw', 'spikes', 'hammer', 'slider', 'barrier', 'gap', 'ball', 'crusher'] as const)
    : (['hammer', 'slider', 'saw', 'spikes', 'barrier', 'ball', 'crusher', 'gap', 'number'] as const);
  const result: ObstacleSpec[] = [];
  for (let i = 0; i < count; i++) {
    const span = maxY - minY;
    const y = Math.round(minY + (span * (i + 0.5)) / count + rng.range(-80, 80));
    const kind = rng.pick(kinds);
    result.push({
      kind,
      y: clamp(y, 700, maxY),
      x: rng.pick([300, 500, 700]) + rng.range(-20, 20),
      size: rng.range(150, 210),
      damage: Math.round(
        (kind === 'gap' ? 26 : survival ? 14 : 10) + rng.range(0, 8),
      ),
      speed: rng.range(0.85, 1.5),
      phase: rng.range(0, Math.PI * 2),
      required: kind === 'number' ? 25 : undefined,
    });
  }
  return result;
}

function clusterCoins(
  rng: Rng,
  clusters: number,
  minY: number,
  maxY: number,
  perCluster: number,
): CoinSpec[] {
  const coins: CoinSpec[] = [];
  for (let i = 0; i < clusters; i++) {
    const y = minY + ((maxY - minY) * (i + 0.5)) / clusters;
    const lane = rng.pick([300, 500, 700]);
    for (let j = 0; j < perCluster; j++) {
      coins.push({
        x: lane + (j - (perCluster - 1) / 2) * 44,
        y: Math.round(y + j * 52),
      });
    }
  }
  return coins;
}

function expectedCrowd(starting: number, gates: GatePairSpec[]): number {
  let crowd = starting;
  for (const gate of gates) {
    crowd = Math.max(applyGateOp(crowd, gate.left), applyGateOp(crowd, gate.right));
  }
  return Math.max(1, crowd);
}

function pickTheme(rng: Rng): { theme: WorldTheme; worldIndex: number } {
  const worldIndex = rng.int(0, WORLD_THEMES.length - 1);
  return { theme: WORLD_THEMES[worldIndex], worldIndex };
}

function baseLevel(
  theme: WorldTheme,
  worldIndex: number,
  mode: GameMode,
  name: string,
  seed: number,
): Omit<LevelScript, 'gates' | 'obstacles' | 'coins' | 'finish' | 'rules'> {
  return {
    id: `mode-${mode}-${seed}`,
    worldId: theme.id,
    worldIndex,
    index: 0,
    name,
    mode,
    trackLength: 0,
    startingCrowd: 12,
    stars: DEFAULT_STARS,
    rewardCoins: 0,
    difficulty: 50,
    hasBoss: false,
  };
}

export function buildModeLevel(
  mode: Exclude<GameMode, 'campaign'>,
  options: { seed?: number; startingCrowd?: number; bossIndex?: number } = {},
): LevelScript {
  const seed = options.seed ?? Math.floor(Math.random() * 2_000_000_000);
  const rng = new Rng(seed || 1);
  const { theme, worldIndex } = pickTheme(rng);

  if (mode === 'timeAttack') {
    const fixedRng = new Rng(424242);
    const { theme: fixedTheme, worldIndex: fixedIndex } = pickTheme(new Rng(9001));
    const trackLength = 6600;
    const gates = makeGates(fixedRng, 7, 760, 900, false);
    const obstacles = makeObstacles(fixedRng, 4, 900, trackLength - 900, false);
    const coins = clusterCoins(fixedRng, 6, 800, trackLength - 700, 4);
    const rules: ModeRules = {
      mode: 'timeAttack',
      timeLimit: 60,
      score: 'time',
      finishAction: 'finish',
      medalTimes: { gold: 21, silver: 26, bronze: 34 },
      competitive: true,
    };
    return {
      ...baseLevel(fixedTheme, fixedIndex, 'timeAttack', 'Time Attack', seed),
      trackLength,
      startingCrowd: 20,
      gates,
      obstacles,
      coins,
      finish: { kind: 'battle', power: 0 },
      rules,
      rewardCoins: 40,
      difficulty: 60,
    };
  }

  if (mode === 'daily') {
    const dateKey = localDate();
    const fixedRng = new Rng(hashString(`daily-${dateKey}`));
    const { theme: dailyTheme, worldIndex: dailyIndex } = pickTheme(
      new Rng(hashString(`theme-${dateKey}`)),
    );
    const trackLength = 7200;
    const gates = makeGates(fixedRng, 8, 720, 880, false);
    const obstacles = makeObstacles(fixedRng, 6, 880, trackLength - 900, false);
    const coins = clusterCoins(fixedRng, 7, 760, trackLength - 700, 4);
    return {
      ...baseLevel(dailyTheme, dailyIndex, 'daily', 'Daily Challenge', dateKey.length),
      id: `daily-${dateKey}`,
      trackLength,
      startingCrowd: 15,
      gates,
      obstacles,
      coins,
      finish: { kind: 'battle', power: 0 },
      rules: {
        mode: 'daily',
        timeLimit: 70,
        score: 'time',
        finishAction: 'finish',
        medalTimes: { gold: 24, silver: 30, bronze: 40 },
        competitive: true,
      },
      rewardCoins: 60,
      difficulty: 70,
    };
  }

  if (mode === 'bossRush') {
    const bossIndex = options.bossIndex ?? 0;
    const startCrowd = Math.max(12, Math.round(options.startingCrowd ?? 12));
    const bossRng = new Rng(hashString(`boss-rush-${bossIndex}`));
    const trackLength = 2400;
    const gates = makeGates(bossRng, 3, 520, 760, false);
    const obstacles = makeObstacles(bossRng, bossIndex === 0 ? 1 : 2, 700, trackLength - 700, false);
    const coins = clusterCoins(bossRng, 2, 700, trackLength - 600, 3);
    const expected = expectedCrowd(startCrowd, gates);
    const power = Math.max(8, Math.round(expected * (0.62 + bossIndex * 0.1)));
    return {
      ...baseLevel(theme, worldIndex, 'bossRush', `Boss ${bossIndex + 1}`, seed),
      trackLength,
      startingCrowd: startCrowd,
      gates,
      obstacles,
      coins,
      finish: { kind: 'boss', power, name: `Boss ${bossIndex + 1}` },
      rules: { mode: 'bossRush', score: 'bosses', bossIndex, bossTotal: 3 },
      rewardCoins: 0,
      difficulty: 50 + bossIndex * 20,
      hasBoss: true,
    };
  }

  const endless = mode === 'endless';
  const survival = mode === 'survival';
  const trackLength = endless ? 120_000 : survival ? 120_000 : 60_000;
  const gateCount = endless ? 180 : survival ? 160 : 90;
  const gates = makeGates(rng, gateCount, 520, 900, survival);
  const obstacles = makeObstacles(
    rng,
    endless ? 90 : survival ? 110 : 45,
    850,
    trackLength - 800,
    survival,
  );
  const coins = survival
    ? clusterCoins(rng, 12, 900, trackLength - 900, 3)
    : clusterCoins(rng, endless ? 60 : 55, 800, trackLength - 700, endless ? 3 : 5);

  const rules: ModeRules = {
    mode,
    endless: true,
    score: mode === 'coinRush' ? 'coins' : 'distance',
    coinTarget: mode === 'coinRush' ? 60 : undefined,
    timeLimit: mode === 'coinRush' ? 45 : undefined,
  };

  return {
    ...baseLevel(theme, worldIndex, mode, modeName(mode), seed),
    trackLength,
    startingCrowd: 12,
    gates,
    obstacles,
    coins,
    finish: { kind: 'battle', power: 0 },
    rules,
    rewardCoins: 0,
    difficulty: survival ? 80 : 50,
  };
}

function modeName(mode: GameMode): string {
  switch (mode) {
    case 'endless':
      return 'Endless';
    case 'coinRush':
      return 'Coin Rush';
    case 'survival':
      return 'Survival';
    default:
      return 'Run';
  }
}

export function bossRushTotal(): number {
  return 3;
}
