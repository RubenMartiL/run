import { GateOp, ObstacleKind, GameMode, FinishKind } from '../types';
import { WorldTheme } from '../data/worlds';
import { CrowdSkin } from '../data/cosmetics';

export type GamePhase = 'running' | 'battle' | 'paused' | 'won' | 'lost';

export interface GateView {
  id: number;
  lineIndex: number;
  side: 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
  op: GateOp;
  used: boolean;
  flash: number;
  pulse: number;
}

export interface ObstacleView {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  hitFlash: number;
  required: number;
}

export interface CoinView {
  id: number;
  x: number;
  y: number;
  taken: boolean;
  magnetized: boolean;
}

export interface ParticleView {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  growth: number;
  color: string;
  gravity: number;
  rotation: number;
  spin: number;
  shape: 'dot' | 'spark' | 'confetti' | 'ring' | 'star' | 'coin';
}

export interface PopupView {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface BattleView {
  active: boolean;
  kind: 'battle' | 'boss' | 'barrier';
  name?: string;
  enemyCount: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  elapsed: number;
  hitFlash: number;
}

export interface GameView {
  theme: WorldTheme;
  mode: GameMode;
  phase: GamePhase;
  time: number;
  timer: number;
  timeLimit: number;
  distance: number;
  finishY: number;
  finishKind: FinishKind;
  bossName?: string;
  skin: CrowdSkin;
  crowdCount: number;
  crowdX: number;
  crowdPop: number;
  crowdAtFinish: number;
  gates: GateView[];
  obstacles: ObstacleView[];
  coins: CoinView[];
  particles: ParticleView[];
  popups: PopupView[];
  battle: BattleView | null;
  shieldCharges: number;
  magnetTime: number;
  turboTime: number;
  shakeX: number;
  shakeY: number;
  runCoins: number;
  combo: number;
  comboTimer: number;
  flashAlpha: number;
  flashColor: string;
  coinEvent: number;
}
