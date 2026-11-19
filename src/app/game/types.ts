export const PLAYFIELD_WIDTH = 1000;
export const ROAD_LEFT = 100;
export const ROAD_RIGHT = 900;
export const CROWD_MIN_X = 175;
export const CROWD_MAX_X = 825;

export type GateKind =
  | 'add'
  | 'mul'
  | 'sub'
  | 'div'
  | 'percent'
  | 'shield'
  | 'magnet'
  | 'turbo'
  | 'coins';

export interface GateOp {
  kind: GateKind;
  value: number;
}

export type ObstacleKind =
  | 'hammer'
  | 'saw'
  | 'slider'
  | 'spikes'
  | 'barrier'
  | 'gap'
  | 'ball'
  | 'crusher'
  | 'number';

export interface GatePairSpec {
  y: number;
  left: GateOp;
  right: GateOp;
}

export interface ObstacleSpec {
  kind: ObstacleKind;
  y: number;
  x: number;
  size: number;
  damage: number;
  speed: number;
  phase: number;
  required?: number;
}

export interface CoinSpec {
  x: number;
  y: number;
}

export type FinishKind = 'battle' | 'boss' | 'barrier';

export interface FinishSpec {
  kind: FinishKind;
  power: number;
  name?: string;
}

export interface StarThresholds {
  one: number;
  two: number;
  three: number;
}

export type GameMode =
  | 'campaign'
  | 'endless'
  | 'timeAttack'
  | 'coinRush'
  | 'survival'
  | 'bossRush'
  | 'daily';

export interface ModeRules {
  mode: GameMode;
  /** Seconds available. 0/undefined means untimed. */
  timeLimit?: number;
  coinTarget?: number;
  /** Endless tracks have no finish trigger and end on crowd loss. */
  endless?: boolean;
  score?: 'distance' | 'time' | 'coins' | 'bosses';
  finishAction?: 'battle' | 'finish';
  medalTimes?: { gold: number; silver: number; bronze: number };
  competitive?: boolean;
  bossIndex?: number;
  bossTotal?: number;
}

export interface LevelScript {
  id: string;
  worldId: string;
  worldIndex: number;
  index: number;
  name: string;
  mode: GameMode;
  rules?: ModeRules;
  trackLength: number;
  startingCrowd: number;
  gates: GatePairSpec[];
  obstacles: ObstacleSpec[];
  coins: CoinSpec[];
  finish: FinishSpec;
  stars: StarThresholds;
  rewardCoins: number;
  difficulty: number;
  hasBoss: boolean;
}

export interface CampaignWorld {
  theme: import('./data/worlds').WorldTheme;
  levels: LevelScript[];
}
