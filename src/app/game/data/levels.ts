import { applyGateOp } from '../gates';
import {
  CampaignWorld,
  CoinSpec,
  FinishSpec,
  GateOp,
  GatePairSpec,
  LevelScript,
  ObstacleKind,
  ObstacleSpec,
  StarThresholds,
} from '../types';
import { WORLD_THEMES } from './worlds';
import { Rng } from '../engine/rng';

const SIGNATURE_OBSTACLE: Record<string, ObstacleKind> = {
  'green-city': 'hammer',
  'desert-dash': 'slider',
  'frost-peak': 'saw',
  'jungle-jam': 'spikes',
  'candy-land': 'barrier',
  'lava-land': 'crusher',
  'neon-city': 'slider',
  'pirate-island': 'gap',
  'space-run': 'ball',
  kingdom: 'number',
};

const BOSS_NAMES: Record<string, [string, string, string]> = {
  'green-city': ['Hammer Captain', 'The Warden', 'Verdant Titan'],
  'desert-dash': ['Sand Slammer', 'Dune Breaker', 'Sun Pharaoh'],
  'frost-peak': ['Saw Sentry', 'Glacier Guard', 'Frost Colossus'],
  'jungle-jam': ['Trap Chief', 'Vine Warden', 'Jungle Behemoth'],
  'candy-land': ['Gumdrop Boss', 'Sugar Smasher', 'Candy Queen'],
  'lava-land': ['Cinder Brute', 'Magma Marshal', 'Lava Monarch'],
  'neon-city': ['Grid Runner', 'Neon Enforcer', 'Chrome Overlord'],
  'pirate-island': ['Deck Brute', 'Anchor Boss', 'Pirate King'],
  'space-run': ['Orbit Guard', 'Nova Captain', 'Galaxy Emperor'],
  kingdom: ['Royal Guard', 'Crown Champion', 'The Last King'],
};

const SPECIAL_KINDS: GateOp['kind'][] = ['shield', 'magnet', 'turbo', 'coins'];

function scaledAdd(worldIndex: number, tier: number): number {
  const levelBoost = 1 + Math.floor(tier / 7) * 0.45;
  const worldBoost = 1 + worldIndex * 0.16;
  return Math.max(5, Math.round((10 * levelBoost * worldBoost) / 5) * 5);
}

function positiveGate(rng: Rng, tier: number, worldIndex: number): GateOp {
  const roll = rng.next();
  if (tier >= 3 && roll < 0.16) {
    const kind = rng.pick(SPECIAL_KINDS);
    return { kind, value: kind === 'coins' ? 20 + worldIndex * 5 + tier : 1 };
  }
  if (tier >= 2 && roll < 0.38) {
    return { kind: 'mul', value: tier >= 8 && rng.chance(0.45) ? 3 : 2 };
  }
  if (roll < 0.58) {
    return { kind: 'percent', value: rng.pick([25, 50, 75]) };
  }
  return { kind: 'add', value: scaledAdd(worldIndex, tier) };
}

function negativeGate(rng: Rng, tier: number, worldIndex: number): GateOp {
  if (rng.chance(tier >= 8 ? 0.35 : 0.18)) {
    return { kind: 'div', value: tier >= 12 && rng.chance(0.3) ? 3 : 2 };
  }
  return {
    kind: 'sub',
    value: Math.max(5, Math.round((scaledAdd(worldIndex, tier) * rng.range(0.8, 1.6)) / 5) * 5),
  };
}

function makeGatePair(rng: Rng, tier: number, worldIndex: number): GatePairSpec {
  let left: GateOp;
  let right: GateOp;

  if (tier <= 1) {
    left = { kind: 'add', value: scaledAdd(worldIndex, tier) };
    right = { kind: 'add', value: scaledAdd(worldIndex, tier) * (tier === 0 ? 2 : 1) };
    if (tier === 1) right = { kind: 'mul', value: 2 };
  } else {
    left = positiveGate(rng, tier, worldIndex);
    if (rng.chance(0.52)) {
      right = positiveGate(rng, tier, worldIndex);
      // Avoid boring identical choices.
      if (right.kind === left.kind && right.value === left.value) {
        right = { kind: 'add', value: scaledAdd(worldIndex, tier) * 2 };
      }
    } else {
      right = negativeGate(rng, tier, worldIndex);
    }
  }

  if (rng.chance(0.5)) {
    return { y: 0, left: right, right: left };
  }
  return { y: 0, left, right };
}

function buildObstacles(
  rng: Rng,
  tier: number,
  themeId: string,
  gates: GatePairSpec[],
  trackLength: number,
): ObstacleSpec[] {
  const signature = SIGNATURE_OBSTACLE[themeId] ?? 'hammer';
  const count = tier === 0 ? 1 : Math.min(7, 1 + Math.floor(tier / 3));
  const obstacles: ObstacleSpec[] = [];
  const gateYs = gates.map((gate) => gate.y);

  let attempts = 0;
  while (obstacles.length < count && attempts < 200) {
    attempts++;
    const y = rng.range(720, trackLength - 950);
    if (gateYs.some((gateY) => Math.abs(gateY - y) < 280)) continue;
    if (obstacles.some((obstacle) => Math.abs(obstacle.y - y) < 320)) continue;

    const roll = rng.next();
    let kind: ObstacleKind;
    if (roll < 0.5) kind = signature;
    else if (roll < 0.75) kind = rng.pick<ObstacleKind>(['hammer', 'slider', 'saw']);
    else if (tier >= 6) {
      kind = rng.pick<ObstacleKind>(['spikes', 'barrier', 'gap', 'ball', 'crusher', 'number']);
    } else {
      kind = rng.pick<ObstacleKind>(['spikes', 'barrier']);
    }

    const lane = rng.pick([0, 1, 2]);
    const x = 300 + lane * 200;
    const size = kind === 'spikes' ? rng.range(170, 240) : rng.range(150, 200);
    obstacles.push({
      kind,
      y,
      x: x + rng.range(-24, 24),
      size,
      damage: Math.round((0.1 + tier * 0.011 + (kind === 'spikes' ? 0.03 : kind === 'gap' ? 0.18 : 0)) * 100),
      speed: rng.range(0.8, 1.4) * (1 + tier * 0.025),
      phase: rng.range(0, Math.PI * 2),
      required: kind === 'number' ? Math.round(12 + tier * 4) : undefined,
    });
  }
  return obstacles;
}

function buildCoins(
  rng: Rng,
  gates: GatePairSpec[],
  obstacles: ObstacleSpec[],
  trackLength: number,
): CoinSpec[] {
  const coins: CoinSpec[] = [];
  const clusters = rng.int(3, 5);
  for (let cluster = 0; cluster < clusters; cluster++) {
    const gate = gates[Math.min(gates.length - 1, cluster)];
    const y = gate ? gate.y - rng.range(200, 320) : rng.range(700, trackLength - 900);
    const lane = rng.chance(0.5) ? 300 : 700;
    const blocked = obstacles.some(
      (obstacle) => Math.abs(obstacle.y - y) < 150 && Math.abs(obstacle.x - lane) < 180,
    );
    if (blocked) continue;
    const count = rng.int(3, 5);
    for (let i = 0; i < count; i++) {
      coins.push({ x: lane + (i - (count - 1) / 2) * 46, y: y + i * 56 });
    }
  }
  return coins;
}

function estimateBestCrowd(startingCrowd: number, gates: GatePairSpec[]): number {
  let crowd = startingCrowd;
  for (const gate of gates) {
    const left = applyGateOp(crowd, gate.left);
    const right = applyGateOp(crowd, gate.right);
    crowd = Math.max(left, right);
  }
  return Math.max(1, crowd);
}

function buildStars(expected: number, enemyPower: number): StarThresholds {
  const three = Math.max(2, Math.round(expected * 0.9));
  const two = Math.max(1, Math.round(expected * 0.62));
  const one = Math.max(1, Math.round(enemyPower * 0.55));
  return {
    one: Math.min(one, two - 1) || 1,
    two: Math.max(two, one + 1),
    three: Math.max(three, two + 1),
  };
}

function buildFinish(
  rng: Rng,
  tier: number,
  themeId: string,
  expected: number,
): FinishSpec {
  const isMiniBoss = tier === 4;
  const isBoss = tier === 14;
  const isFinale = tier === 19;

  let ratio = 0.48 + tier * 0.018;
  let kind: FinishSpec['kind'] = 'battle';
  let name: string | undefined;

  const names = BOSS_NAMES[themeId];
  if (isMiniBoss) {
    ratio = 0.62;
    kind = 'boss';
    name = names?.[0];
  } else if (isBoss) {
    ratio = 0.84;
    kind = 'boss';
    name = names?.[1];
  } else if (isFinale) {
    ratio = 0.96;
    kind = 'boss';
    name = names?.[2];
  } else if (tier === 9 || tier === 17) {
    ratio = 0.55;
    kind = 'barrier';
    name = 'CROWD BARRIER';
  }

  return {
    kind,
    power: Math.max(4, Math.round(expected * ratio + rng.range(-1, 1))),
    name,
  };
}

function buildLevel(worldIndex: number, tier: number): LevelScript {
  const theme = WORLD_THEMES[worldIndex];
  const seed = worldIndex * 100_003 + tier * 7919 + 17;
  const rng = new Rng(seed);

  const trackLength = 3900 + tier * 95 + worldIndex * 70;
  const startingCrowd = 10 + Math.floor(worldIndex / 2) * 2;
  const gateLines = Math.min(10, 4 + Math.floor(tier / 2.6));

  const gates: GatePairSpec[] = [];
  const firstGateY = 980;
  const lastGateY = trackLength - (tier >= 4 ? 1250 : 1050);
  for (let i = 0; i < gateLines; i++) {
    const t = gateLines === 1 ? 0 : i / (gateLines - 1);
    const pair = makeGatePair(rng, tier, worldIndex);
    gates.push({ ...pair, y: Math.round(firstGateY + (lastGateY - firstGateY) * t) });
  }
  gates.sort((a, b) => a.y - b.y);

  const obstacles = buildObstacles(rng, tier, theme.id, gates, trackLength);
  const coins = buildCoins(rng, gates, obstacles, trackLength);
  const expected = estimateBestCrowd(startingCrowd, gates);
  const finish = buildFinish(rng, tier, theme.id, expected);
  const rewardCoins = 20 + tier * 3 + worldIndex * 6 + (finish.kind === 'boss' ? 35 : 0);

  return {
    id: `${theme.id}-${tier + 1}`,
    worldId: theme.id,
    worldIndex,
    index: tier,
    name: finish.kind === 'boss' && finish.name ? finish.name : `Level ${tier + 1}`,
    mode: 'campaign',
    trackLength,
    startingCrowd,
    gates,
    obstacles,
    coins,
    finish,
    stars: buildStars(expected, finish.power),
    rewardCoins,
    difficulty: Math.round((tier / 19) * 100),
    hasBoss: finish.kind === 'boss',
  };
}

export const CAMPAIGN: CampaignWorld[] = WORLD_THEMES.map((theme, worldIndex) => ({
  theme,
  levels: Array.from({ length: 20 }, (_, tier) => buildLevel(worldIndex, tier)),
}));

export const ALL_LEVELS: LevelScript[] = CAMPAIGN.flatMap((world) => world.levels);

export function getLevelByKey(worldId: string, levelNumber: number): LevelScript | undefined {
  const world = CAMPAIGN.find((entry) => entry.theme.id === worldId);
  if (!world || !Number.isFinite(levelNumber)) return undefined;
  return world.levels[levelNumber - 1];
}

export function getLevelById(levelId: string): LevelScript | undefined {
  return ALL_LEVELS.find((level) => level.id === levelId);
}

export function getNextLevel(level: LevelScript): LevelScript | undefined {
  if (level.index < 19) {
    return CAMPAIGN[level.worldIndex]?.levels[level.index + 1];
  }
  return CAMPAIGN[level.worldIndex + 1]?.levels[0];
}
