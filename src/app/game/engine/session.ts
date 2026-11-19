import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { WorldTheme } from '../data/worlds';
import { applyGateOp, MAX_CROWD } from '../gates';
import { CrowdSkin, skinFromIds } from '../data/cosmetics';
import { NEUTRAL_MODIFIERS, RunModifiers } from '../data/upgrades';
import { GameMode, LevelScript, ModeRules, FinishKind } from '../types';
import { GameRenderer } from './renderer';
import { obstacleMotion } from './obstacle-motion';
import {
  BattleView,
  CoinView,
  GamePhase,
  GameView,
  GateView,
  ObstacleView,
  ParticleView,
  PopupView,
} from './view';

const STEP = 1 / 60;
const BASE_SPEED = 340;
const GATE_WIDTH = 356;
const GATE_HEIGHT = 118;
const CROWD_RADIUS_BASE = 30;
const MAX_PARTICLES = 260;
const CROWD_Y_OFFSET = 26;
const TIME_PENALTY = 2;

export type Medal = 'gold' | 'silver' | 'bronze';

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  crowd: number;
  coins: number;
  progress: number;
  shield: number;
  magnet: number;
  turbo: number;
  time: number;
  timer: number;
  timeLimit: number;
  coinTarget: number;
  distance: number;
  bossIndex: number;
  bossTotal: number;
  combo: number;
  comboTimer: number;
  coinEvent: number;
  battle: {
    kind: 'battle' | 'boss' | 'barrier';
    label: string;
    playerRatio: number;
    enemyRatio: number;
  } | null;
}

export interface RunResult {
  won: boolean;
  reason: string;
  levelId: string;
  mode: GameMode;
  crowd: number;
  crowdAtFinish: number;
  stars: number;
  coins: number;
  distance: number;
  elapsed: number;
  medal: Medal | null;
  coinTarget: number;
  bosses: number;
  boss: boolean;
  durationMs: number;
}

export interface RunOptions {
  modifiers?: RunModifiers;
  skin?: CrowdSkin;
  startingCrowdOverride?: number;
  carryCoins?: number;
}

export interface SessionCallbacks {
  onSnapshot: (snapshot: HudSnapshot) => void;
  onEnd: (result: RunResult) => void;
  onAutoPause: () => void;
}

const DEFAULT_SKIN: CrowdSkin = skinFromIds({
  crowd: 'crowd-classic',
  hat: 'hat-none',
  trail: 'trail-none',
  victory: 'victory-confetti',
});

let entityId = 1;

/**
 * Runs one level or mode. Owns the fixed-step loop, input, entity simulation
 * and canvas rendering lifecycle. The Angular layer only consumes throttled
 * snapshots, keeping change detection out of the render loop.
 */
export class GameSession implements GameView {
  readonly theme: WorldTheme;
  readonly mode: GameMode;
  phase: GamePhase = 'running';
  time = 0;
  timer = 0;
  timeLimit: number;
  coinTarget: number;
  distance = 0;
  finishY: number;
  finishKind: FinishKind;
  bossName?: string;
  skin: CrowdSkin;

  crowdCount: number;
  crowdX = 500;
  crowdPop = 0;
  crowdAtFinish = 0;

  gates: GateView[] = [];
  obstacles: ObstacleView[] = [];
  coins: CoinView[] = [];
  particles: ParticleView[] = [];
  popups: PopupView[] = [];
  battle: BattleView | null = null;

  shieldCharges = 0;
  magnetTime = 0;
  turboTime = 0;
  shakeX = 0;
  shakeY = 0;
  runCoins = 0;
  combo = 0;
  comboTimer = 0;
  flashAlpha = 0;
  flashColor = '#ffffff';
  coinEvent = 0;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly level: LevelScript;
  private readonly rules: ModeRules | undefined;
  private readonly audio: AudioService;
  private readonly haptics: HapticsService;
  private readonly callbacks: SessionCallbacks;
  private readonly renderer = new GameRenderer();
  private readonly modifiers: RunModifiers;
  private readonly carryCoins: number;
  private readonly finishAction: 'battle' | 'finish';

  private targetX = 500;
  private dragging = false;
  private lastPointerX = 0;
  private invulnTime = 0;
  private hitObstacles = new Set<number>();
  private snapTimer = 0;
  private resultTimer = -1;
  private ended = false;
  private shakeMagnitude = 0;
  private viewportWidth = 360;
  private viewportHeight = 640;
  private dpr = 1;
  private prevCross = 0;
  private resolvedLines: boolean[] = [];
  private lineCount = 0;
  private lastCoinSound = 0;
  private coinAccumulator = 0;
  private attackTimer = 0;
  private startTimestamp = 0;
  private phaseBeforePause: GamePhase = 'running';

  private raf = 0;
  private running = false;
  private lastTs = 0;
  private accumulator = 0;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private audioUnlocked = false;
  private reason = '';

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelScript,
    theme: WorldTheme,
    audio: AudioService,
    haptics: HapticsService,
    callbacks: SessionCallbacks,
    options: RunOptions = {},
  ) {
    this.canvas = canvas;
    this.level = level;
    this.theme = theme;
    this.audio = audio;
    this.haptics = haptics;
    this.callbacks = callbacks;
    this.mode = level.mode;
    this.rules = level.rules;
    this.modifiers = options.modifiers ?? NEUTRAL_MODIFIERS;
    this.skin = options.skin ?? DEFAULT_SKIN;
    this.carryCoins = Math.max(0, Math.round(options.carryCoins ?? 0));
    this.finishAction = this.rules?.finishAction ?? 'battle';
    this.timeLimit = Math.max(0, this.rules?.timeLimit ?? 0);
    this.coinTarget = Math.max(0, this.rules?.coinTarget ?? 0);
    this.crowdCount = Math.max(
      1,
      Math.min(
        MAX_CROWD,
        options.startingCrowdOverride ??
          level.startingCrowd + this.modifiers.startingCrowdBonus,
      ),
    );
    this.finishY = level.trackLength;
    this.finishKind = level.finish.kind;
    this.bossName = level.finish.name;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;

    this.buildEntities();
    this.measure();
    this.observeResize();
    this.attachInput();
    this.startTimestamp = performance.now();
    this.emitSnapshot(true);
    this.startLoop();
  }

  private buildEntities(): void {
    const leftX = 300;
    const rightX = 700;
    this.lineCount = this.level.gates.length;
    this.resolvedLines = new Array(this.lineCount).fill(false);

    this.level.gates.forEach((pair, lineIndex) => {
      this.gates.push({
        id: entityId++,
        lineIndex,
        side: 'left',
        x: leftX,
        y: pair.y,
        width: GATE_WIDTH,
        height: GATE_HEIGHT,
        op: pair.left,
        used: false,
        flash: 0,
        pulse: 0,
      });
      this.gates.push({
        id: entityId++,
        lineIndex,
        side: 'right',
        x: rightX,
        y: pair.y,
        width: GATE_WIDTH,
        height: GATE_HEIGHT,
        op: pair.right,
        used: false,
        flash: 0,
        pulse: 0,
      });
    });

    this.obstacles = this.level.obstacles.map((spec) => ({
      id: entityId++,
      kind: spec.kind,
      x: spec.x,
      y: spec.y,
      size: spec.size,
      speed: spec.speed,
      phase: spec.phase,
      hitFlash: 0,
      required: spec.required ?? 0,
    }));

    this.coins = this.level.coins.map((spec) => ({
      id: entityId++,
      x: spec.x,
      y: spec.y,
      taken: false,
      magnetized: false,
    }));
  }

  // ---------------------------------------------------------------- lifecycle

  startLoop(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTs = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (timestamp: number): void => {
    if (!this.running || this.disposed) return;
    const raw = (timestamp - this.lastTs) / 1000;
    this.lastTs = timestamp;
    const delta = Math.min(0.1, Math.max(0, raw));
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 5) {
      this.update(STEP);
      this.accumulator -= STEP;
      steps++;
    }
    if (steps === 5) this.accumulator = 0;
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  pause(): void {
    if (this.phase !== 'running' && this.phase !== 'battle') return;
    this.phaseBeforePause = this.phase;
    this.phase = 'paused';
    this.dragging = false;
    this.stopLoop();
    this.emitSnapshot(true);
  }

  resume(): void {
    if (this.phase !== 'paused' || this.disposed) return;
    this.phase = this.phaseBeforePause;
    this.emitSnapshot(true);
    this.startLoop();
  }

  /** Second chance after a defeat. Returns false when reviving is not allowed. */
  revive(crowd = 24): boolean {
    if (this.phase !== 'lost' || this.disposed) return false;
    this.phase = 'running';
    this.ended = false;
    this.resultTimer = -1;
    this.battle = null;
    this.reason = '';
    this.crowdCount = Math.max(1, Math.min(MAX_CROWD, Math.round(crowd)));
    this.crowdAtFinish = 0;
    this.invulnTime = 1.6;
    this.crowdPop = 1;
    this.distance = Math.max(0, this.distance - 160);
    this.prevCross = this.distance + 55;
    if (this.timeLimit > 0) {
      this.timer = Math.min(this.timer, Math.max(0, this.timeLimit - 10));
    }
    this.startLoop();
    this.emitSnapshot(true);
    return true;
  }

  destroy(): void {
    this.disposed = true;
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.detachInput();
  }

  // ------------------------------------------------------------------- input

  private attachInput(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private detachInput(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.phase !== 'running' && this.phase !== 'battle') return;
    if (!this.audioUnlocked) {
      this.audioUnlocked = true;
      this.audio.unlock();
    }
    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.burst(this.crowdX, this.distance + 40, '#ffffff', 8, 110);
    void this.haptics.impact('light');
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a progressive enhancement.
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || this.phase !== 'running') return;
    const scale = this.viewportWidth > 0 ? this.viewportWidth / 1000 : 0.36;
    const worldDelta = (event.clientX - this.lastPointerX) / scale;
    this.lastPointerX = event.clientX;
    this.targetX = Math.min(825, Math.max(175, this.targetX + worldDelta));
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.dragging = false;
    try {
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore.
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.phase !== 'running') return;
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      this.targetX = Math.min(825, Math.max(175, this.targetX - 60));
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
      this.targetX = Math.min(825, Math.max(175, this.targetX + 60));
    }
  };

  private onVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') return;
    if (this.phase === 'running' || this.phase === 'battle') {
      this.pause();
      this.callbacks.onAutoPause();
    }
  };

  // ------------------------------------------------------------------ resize

  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', this.measure);
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.canvas);
  }

  private measure = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
    const width = Math.round(rect.width * this.dpr);
    const height = Math.round(rect.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (!this.running) this.draw();
  };

  // ------------------------------------------------------------------ update

  private update(dt: number): void {
    this.time += dt;
    this.invulnTime = Math.max(0, this.invulnTime - dt);
    this.magnetTime = Math.max(0, this.magnetTime - dt);
    this.turboTime = Math.max(0, this.turboTime - dt);
    this.crowdPop = Math.max(0, this.crowdPop - dt * 3.2);
    this.shakeMagnitude = Math.max(0, this.shakeMagnitude - dt * 26);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.6);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.shakeX = (Math.random() * 2 - 1) * this.shakeMagnitude;
    this.shakeY = (Math.random() * 2 - 1) * this.shakeMagnitude;

    this.updateParticles(dt);
    this.updatePopups(dt);

    for (const gate of this.gates) {
      gate.flash = Math.max(0, gate.flash - dt * 2.4);
      gate.pulse = Math.max(0, gate.pulse - dt * 2);
    }
    for (const obstacle of this.obstacles) {
      obstacle.hitFlash = Math.max(0, obstacle.hitFlash - dt * 3);
    }

    if (this.phase === 'running') {
      this.updateRun(dt);
    } else if (this.phase === 'battle') {
      this.updateBattle(dt);
    } else if (this.phase === 'won' || this.phase === 'lost') {
      if (this.resultTimer > 0) {
        this.resultTimer -= dt;
        if (this.resultTimer <= 0) this.finishResult();
      }
    }

    this.snapTimer += dt;
    if (this.snapTimer >= 0.09) {
      this.snapTimer = 0;
      this.emitSnapshot();
    }
  }

  private updateRun(dt: number): void {
    if (this.timeLimit > 0) {
      this.timer += dt;
      if (this.timer >= this.timeLimit) {
        if (this.coinTarget > 0 && this.runCoins >= this.coinTarget) {
          this.win('Coin target reached');
        } else {
          this.lose('Time up');
        }
        return;
      }
    }

    const speed = BASE_SPEED * (this.turboTime > 0 ? 1.42 : 1);
    this.distance += speed * dt;

    const smoothing = Math.min(1, dt * 15);
    this.crowdX += (this.targetX - this.crowdX) * smoothing;

    this.checkGateCrossings();
    this.updateCoins(dt);
    this.checkObstacleHits();

    if (this.coinTarget > 0 && this.runCoins >= this.coinTarget) {
      this.win('Coin target reached');
      return;
    }

    if (this.crowdCount <= 0) {
      this.crowdCount = 0;
      this.lose('Your crowd was wiped out');
      return;
    }

    if (this.rules?.endless) return;

    if (this.distance >= this.finishY - 260) {
      if (this.finishAction === 'finish') {
        this.distance = this.finishY - 120;
        this.win(this.mode === 'daily' ? 'Daily challenge cleared' : 'Course complete');
      } else {
        this.startBattle();
      }
    }
  }

  private checkGateCrossings(): void {
    const cross = this.distance + 55;
    for (let line = 0; line < this.lineCount; line++) {
      if (this.resolvedLines[line]) continue;
      const pairY = this.level.gates[line]?.y;
      if (pairY === undefined) continue;
      if (this.prevCross < pairY && cross >= pairY) {
        this.resolvedLines[line] = true;
        const lineGates = this.gates.filter((gate) => gate.lineIndex === line);
        if (lineGates.length === 0) continue;
        lineGates.forEach((gate) => (gate.used = true));
        let chosen = lineGates[0];
        for (const gate of lineGates) {
          if (Math.abs(this.crowdX - gate.x) < Math.abs(this.crowdX - chosen.x)) {
            chosen = gate;
          }
        }
        this.applyGate(chosen);
      }
    }
    this.prevCross = cross;
  }

  private applyGate(gate: GateView): void {
    const op = gate.op;
    gate.flash = 1;
    const crowdY = this.distance + 110;

    if (op.kind === 'coins') {
      const value = Math.max(1, Math.round(op.value * this.modifiers.coinMultiplier));
      this.addRunCoins(value);
      this.coinEvent++;
      this.flash('#ffd447', 0.12);
      this.shockwave(gate.x, gate.y, '#ffd447', 70);
      for (let i = 0; i < 6; i++) {
        this.coinSpark(gate.x + Math.random() * 80 - 40, gate.y);
      }
      this.popup(gate.x, crowdY, `+${value} COINS`, '#ffd447', 44);
      this.burst(gate.x, gate.y, '#ffd447', 22, 170);
      this.audio.play('coin');
      this.haptics.impact('light');
      return;
    }

    if (op.kind === 'shield') {
      this.shieldCharges = Math.max(this.shieldCharges, 1);
      this.registerCombo('#8be9ff');
      this.flash('#8be9ff', 0.18);
      this.shockwave(gate.x, gate.y, '#8be9ff', 80);
      this.popup(gate.x, crowdY, 'SHIELD!', '#8be9ff', 46);
      this.burst(gate.x, gate.y, '#8be9ff', 22, 170);
      this.audio.play('shield');
      this.haptics.impact('light');
      return;
    }

    if (op.kind === 'magnet') {
      this.magnetTime = 8;
      this.registerCombo('#7df9ff');
      this.flash('#7df9ff', 0.18);
      this.shockwave(gate.x, gate.y, '#7df9ff', 80);
      this.popup(gate.x, crowdY, 'MAGNET!', '#7df9ff', 46);
      this.burst(gate.x, gate.y, '#7df9ff', 22, 170);
      this.audio.play('power');
      this.haptics.impact('light');
      return;
    }

    if (op.kind === 'turbo') {
      this.turboTime = 5;
      this.registerCombo('#ffcf4d');
      this.flash('#ffcf4d', 0.2);
      this.shockwave(gate.x, gate.y, '#ffcf4d', 90);
      this.popup(gate.x, crowdY, 'TURBO!', '#ffcf4d', 46);
      this.burst(gate.x, gate.y, '#ffcf4d', 24, 190);
      this.audio.play('power');
      this.haptics.impact('light');
      return;
    }

    const before = this.crowdCount;
    let next = applyGateOp(before, op);
    const positiveMath = op.kind === 'add' || op.kind === 'mul' || op.kind === 'percent';
    if (positiveMath && next > before && this.modifiers.gateBonus > 0) {
      next = Math.min(MAX_CROWD, Math.round(next * (1 + this.modifiers.gateBonus)));
    }
    this.crowdCount = next;
    const delta = this.crowdCount - before;
    const good = delta >= 0;
    if (good) {
      this.registerCombo('#b6ff6b');
      this.flash(op.kind === 'mul' ? '#ffffff' : '#b6ff6b', op.kind === 'mul' ? 0.24 : 0.16);
      this.shockwave(gate.x, gate.y, '#b6ff6b', op.kind === 'mul' ? 130 : 90);
      const intensity = Math.min(1, Math.log10(Math.abs(delta) + 2) / 2.6);
      this.starBurst(gate.x, gate.y, '#eaffb0', 8 + Math.round(intensity * 18));
      this.shakeMagnitude = Math.max(
        this.shakeMagnitude,
        op.kind === 'mul' ? 3 + op.value * 1.6 : 2.5,
      );
      if (op.kind === 'mul') {
        this.spawnConfetti(op.value >= 3 ? 22 : 12);
      }
    } else {
      this.combo = 0;
      this.comboTimer = 0;
      this.flash('#ff5d5d', 0.26);
      this.shockwave(gate.x, gate.y, '#ff5d5d', 100);
      this.shakeMagnitude = Math.max(this.shakeMagnitude, 7);
    }
    this.popup(
      gate.x,
      crowdY,
      good && delta > 0 ? `+${delta}` : `${delta}`,
      good ? '#c9ff9a' : '#ffb3b3',
      Math.min(64, 40 + Math.log10(Math.abs(delta) + 2) * 10),
    );
    this.burst(gate.x, gate.y, good ? '#b6ff6b' : '#ff8d8d', 20, 170);
    this.crowdPop = 1;
    this.audio.play(good ? 'gateGood' : 'gateBad');
    this.haptics.impact(good ? 'light' : 'medium');
  }

  private updateCoins(dt: number): void {
    const crowdY = this.distance + CROWD_Y_OFFSET;
    for (const coin of this.coins) {
      if (coin.taken) continue;
      const dx = coin.x - this.crowdX;
      const dy = coin.y - crowdY;
      const distSq = dx * dx + dy * dy;

      if (this.magnetTime > 0 && distSq < 420 * 420) {
        coin.magnetized = true;
        const pull = Math.min(1, dt * 7);
        coin.x -= dx * pull;
        coin.y -= dy * pull;
      }

      if (distSq < 85 * 85) {
        coin.taken = true;
        this.addRunCoins(this.modifiers.coinMultiplier);
        this.coinEvent++;
        this.coinSpark(coin.x, coin.y);
        this.burst(coin.x, coin.y, '#ffd447', 5, 100);
        if (this.coinEvent % 10 === 0) {
          this.flash('#ffd447', 0.06);
          this.shockwave(coin.x, coin.y, '#ffe98a', 55);
        }
        const now = this.time;
        if (now - this.lastCoinSound > 0.05) {
          this.lastCoinSound = now;
          this.audio.play('coin');
        }
      }
    }
  }

  /** Applies the coin multiplier without losing fractional values. */
  private addRunCoins(amount: number): void {
    this.coinAccumulator += Math.max(0, amount);
    const whole = Math.floor(this.coinAccumulator);
    if (whole <= 0) return;
    this.coinAccumulator -= whole;
    this.runCoins += whole;
  }

  private checkObstacleHits(): void {
    if (this.invulnTime > 0) return;
    const crowdY = this.distance + CROWD_Y_OFFSET;
    const radius = this.crowdRadius();

    for (const obstacle of this.obstacles) {
      if (this.hitObstacles.has(obstacle.id)) continue;
      if (Math.abs(obstacle.y - crowdY) > 220) continue;
      const motion = obstacleMotion(
        obstacle.kind,
        obstacle.x,
        obstacle.y,
        obstacle.size,
        obstacle.speed,
        obstacle.phase,
        this.time,
      );
      const halfW = motion.w / 2 + radius * 0.55;
      const halfH = motion.h / 2 + radius * 0.55;
      if (Math.abs(this.crowdX - motion.x) < halfW && Math.abs(crowdY - motion.y) < halfH) {
        this.hitObstacle(obstacle);
        break;
      }
    }
  }

  private hitObstacle(obstacle: ObstacleView): void {
    obstacle.hitFlash = 1;
    this.hitObstacles.add(obstacle.id);
    this.combo = 0;
    this.comboTimer = 0;
    this.flash('#ff4d4d', 0.3);
    this.shockwave(obstacle.x, obstacle.y, '#ff6b6b', 110);

    if (this.shieldCharges > 0) {
      this.shieldCharges--;
      this.invulnTime = 0.7;
      this.burst(this.crowdX, this.distance + 40, '#8be9ff', 22, 200);
      this.popup(this.crowdX, this.distance + 120, 'BLOCKED', '#8be9ff', 44);
      this.shakeMagnitude = Math.max(this.shakeMagnitude, 5);
      this.audio.play('shield');
      this.haptics.impact('medium');
      return;
    }

    const index = this.obstacles.indexOf(obstacle);
    const spec = this.level.obstacles[index];

    if (
      obstacle.kind === 'number' &&
      obstacle.required > 0 &&
      this.crowdCount >= obstacle.required
    ) {
      this.invulnTime = 0.5;
      this.popup(
        this.crowdX,
        this.distance + 120,
        `${obstacle.required} PASSED`,
        '#c9ff9a',
        38,
      );
      this.burst(this.crowdX, this.distance + 50, '#b6ff6b', 10, 120);
      this.audio.play('gateGood');
      return;
    }

    const percent = spec ? spec.damage : 14;
    const damage = Math.min(
      this.crowdCount,
      Math.max(1, Math.round((this.crowdCount * percent) / 100)),
    );
    this.crowdCount = Math.max(0, this.crowdCount - damage);
    this.invulnTime = 0.85;
    this.crowdPop = 0.8;
    this.shakeMagnitude = Math.max(this.shakeMagnitude, 9);
    this.burst(this.crowdX, this.distance + 50, '#ff7a6b', 24, 230);
    this.popup(this.crowdX, this.distance + 130, `-${damage}`, '#ffb3b3', 48);
    this.audio.play('hit');
    this.haptics.impact('heavy');

    if (this.timeLimit > 0) {
      this.timer = Math.min(this.timeLimit, this.timer + TIME_PENALTY);
      this.popup(this.crowdX, this.distance + 200, `TIME +${TIME_PENALTY}s`, '#ffb3b3', 38);
    }
  }

  private crowdRadius(): number {
    return Math.min(118, CROWD_RADIUS_BASE + Math.sqrt(this.crowdCount) * 9);
  }

  private startBattle(): void {
    if (this.phase !== 'running') return;
    this.crowdAtFinish = this.crowdCount;
    this.phase = 'battle';
    this.distance = this.finishY - 240;
    this.targetX = 500;
    this.battle = {
      active: true,
      kind: this.finishKind,
      name: this.bossName,
      enemyCount: Math.max(1, Math.round(this.level.finish.power)),
      enemyHp: Math.max(1, Math.round(this.level.finish.power)),
      enemyMaxHp: Math.max(1, Math.round(this.level.finish.power)),
      playerHp: Math.max(1, this.crowdCount),
      playerMaxHp: Math.max(1, this.crowdCount),
      elapsed: 0,
      hitFlash: 0,
    };
    this.shakeMagnitude = 8;
    this.flash('#ffffff', 0.22);
    this.shockwave(500, this.finishY, '#ffffff', 160);
    this.audio.play('battle');
    this.haptics.impact('medium');
    this.emitSnapshot(true);
  }

  private updateBattle(dt: number): void {
    const battle = this.battle;
    if (!battle) return;

    battle.elapsed += dt;
    const playerDps = battle.playerMaxHp / 2.7;
    const enemyDps = battle.enemyMaxHp / 3.05;

    battle.enemyHp = Math.max(0, battle.enemyHp - playerDps * dt);
    battle.hitFlash = Math.max(0, battle.hitFlash - dt * 4);
    if (battle.kind !== 'barrier') {
      battle.playerHp = Math.max(0, battle.playerHp - enemyDps * dt);
      this.crowdCount = Math.max(0, Math.round(battle.playerHp));
    }

    this.attackTimer += dt;
    if (this.attackTimer >= 0.22) {
      this.attackTimer = 0;
      battle.hitFlash = 1;
      this.shakeMagnitude = Math.max(this.shakeMagnitude, 3.5);
      const enemyY = this.finishY + 120;
      this.burst(this.crowdX + (Math.random() * 80 - 40), this.distance + 130, '#b6ff6b', 6, 130);
      this.burst(500 + (Math.random() * 140 - 70), enemyY - 40, '#ff7a6b', 6, 140);
      this.shockwave(500 + (Math.random() * 100 - 50), enemyY - 20, '#ffd447', 36);
      if (this.time - this.lastCoinSound > 0.3) {
        this.lastCoinSound = this.time;
        this.popup(500 + (Math.random() * 120 - 60), enemyY + 20, 'HIT!', '#ffe98a', 30);
      }
    }

    if (battle.enemyHp <= 0) {
      battle.active = false;
      this.win(battle.kind === 'barrier' ? 'Barrier smashed!' : 'Victory!');
    } else if (battle.playerHp <= 0) {
      battle.active = false;
      this.lose('The enemy crowd overwhelmed you');
    }
  }

  private win(reason = 'Victory!'): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.crowdAtFinish = Math.max(this.crowdAtFinish, this.crowdCount);
    this.phase = 'won';
    this.reason = reason;
    this.resultTimer = 1.05;
    this.crowdCount = Math.max(1, this.crowdCount);
    this.shakeMagnitude = 7;
    this.flash('#ffd447', 0.4);
    this.shockwave(this.crowdX, this.distance + 40, '#ffe98a', 220);
    this.starBurst(this.crowdX, this.distance + 60, '#fff3b0', 28);
    this.audio.play('win');
    this.haptics.notify('success');
    this.spawnConfetti(90);
    this.emitSnapshot(true);
  }

  private lose(reason: string): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.phase = 'lost';
    this.reason = reason;
    this.resultTimer = 0.75;
    this.combo = 0;
    this.flash('#ff4d4d', 0.3);
    this.audio.play('lose');
    this.haptics.notify('error');
    this.emitSnapshot(true);
  }

  private finishResult(): void {
    if (this.ended) return;
    this.ended = true;
    const won = this.phase === 'won';
    const stars =
      won && this.mode === 'campaign'
        ? this.crowdAtFinish >= this.level.stars.three
          ? 3
          : this.crowdAtFinish >= this.level.stars.two
            ? 2
            : 1
        : 0;

    const reward = won
      ? Math.round(this.level.rewardCoins * (1 + this.modifiers.rewardBonus))
      : 0;
    const distanceBonus =
      this.mode === 'endless' || this.mode === 'survival'
        ? Math.floor(this.distance / 300)
        : 0;
    const coins = this.runCoins + this.carryCoins + reward + distanceBonus + stars * 5;

    let bosses = 0;
    if (this.mode === 'bossRush') {
      bosses = (this.rules?.bossIndex ?? 0) + (won ? 1 : 0);
    } else if (this.mode === 'campaign' && won && this.finishKind === 'boss') {
      bosses = 1;
    }

    const result: RunResult = {
      won,
      reason: won ? this.reason || 'Victory!' : this.reason || 'Defeat',
      levelId: this.level.id,
      mode: this.mode,
      crowd: this.crowdCount,
      crowdAtFinish: this.crowdAtFinish,
      stars,
      coins,
      distance: Math.round(this.distance),
      elapsed: Math.round(this.timer * 10) / 10,
      medal: this.medalFor(won),
      coinTarget: this.coinTarget,
      bosses,
      boss: this.finishKind === 'boss',
      durationMs: performance.now() - this.startTimestamp,
    };
    this.callbacks.onEnd(result);
  }

  private medalFor(won: boolean): Medal | null {
    if (!won) return null;
    const times = this.rules?.medalTimes;
    if (!times) return null;
    if (this.timer <= times.gold) return 'gold';
    if (this.timer <= times.silver) return 'silver';
    if (this.timer <= times.bronze) return 'bronze';
    return null;
  }

  // ------------------------------------------------------------- HUD bridge

  emitSnapshot(force = false): void {
    if (!force && this.phase === 'paused') return;
    const progress = this.level.rules?.endless
      ? Math.min(1, this.distance / 10_000)
      : Math.min(1, Math.max(0, this.distance / Math.max(1, this.finishY - 260)));
    const battle = this.battle;
    this.callbacks.onSnapshot({
      phase: this.phase,
      mode: this.mode,
      crowd: this.crowdCount,
      coins: this.runCoins + this.carryCoins,
      progress,
      shield: this.shieldCharges,
      magnet: this.magnetTime,
      turbo: this.turboTime,
      time: this.time,
      timer: Math.round(this.timer * 10) / 10,
      timeLimit: this.timeLimit,
      coinTarget: this.coinTarget,
      distance: Math.round(this.distance),
      bossIndex: this.rules?.bossIndex ?? 0,
      bossTotal: this.rules?.bossTotal ?? 0,
      combo: this.combo,
      comboTimer: this.comboTimer,
      coinEvent: this.coinEvent,
      battle: battle
        ? {
            kind: battle.kind,
            label:
              battle.name ??
              (battle.kind === 'boss'
                ? 'BOSS'
                : battle.kind === 'barrier'
                  ? 'BARRIER'
                  : 'ENEMY CROWD'),
            playerRatio: battle.playerMaxHp > 0 ? battle.playerHp / battle.playerMaxHp : 0,
            enemyRatio: battle.enemyMaxHp > 0 ? battle.enemyHp / battle.enemyMaxHp : 0,
          }
        : null,
    });
  }

  // ------------------------------------------------------------- particles

  private flash(color: string, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  private registerCombo(color: string): void {
    this.combo++;
    this.comboTimer = 2.4;
    if (this.combo >= 3 && (this.combo === 3 || this.combo % 3 === 0)) {
      const crowdY = this.distance + 170;
      this.popup(
        this.crowdX,
        crowdY,
        `COMBO x${this.combo}`,
        color,
        Math.min(78, 44 + this.combo * 2),
      );
      this.shockwave(this.crowdX, this.distance + 50, color, 110);
      this.starBurst(this.crowdX, this.distance + 70, color, 10);
      this.audio.play('combo');
      this.haptics.impact('medium');
      this.shakeMagnitude = Math.max(this.shakeMagnitude, 3);
    }
  }

  private coinSpark(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: x + (Math.random() * 26 - 13),
        y,
        vx: (Math.random() * 2 - 1) * 60,
        vy: 90 + Math.random() * 110,
        life: 0.55,
        maxLife: 0.55,
        size: 7 + Math.random() * 4,
        growth: -6,
        color: '#ffd447',
        gravity: -60,
        rotation: 0,
        spin: 4,
        shape: 'coin',
      });
    }
  }

  private shockwave(x: number, y: number, color: string, size: number): void {    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.5,
      maxLife: 0.5,
      size: Math.max(6, size * 0.18),
      growth: size * 2.6,
      color,
      gravity: 0,
      rotation: 0,
      spin: 0,
      shape: 'ring',
    });
  }

  private starBurst(x: number, y: number, color: string, count: number): void {    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const velocity = 90 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.7 + Math.random() * 0.5,
        maxLife: 1.2,
        size: 5 + Math.random() * 8,
        growth: -6,
        color,
        gravity: -140,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        shape: 'star',
      });
    }
  }

  private burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 40,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 3 + Math.random() * 5,
        growth: 0,
        color,
        gravity: -320,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.6 ? 'spark' : 'dot',
      });
    }
  }

  private spawnConfetti(count: number): void {
    const palettes: Record<string, string[]> = {
      confetti: ['#ffd447', '#ff7a6b', '#8be9ff', '#b6ff6b', '#c9a7ff', '#ffffff'],
      fireworks: ['#ff7a6b', '#ffd447', '#ff9c4f', '#ffffff', '#ff5fa8'],
      rainbow: ['#ff5f5f', '#ffb45f', '#ffe45f', '#7dff8a', '#5fd8ff', '#a78bfa'],
      coins: ['#ffd447', '#ffe98a', '#e8a300', '#fff3b0'],
    };
    const colors = palettes[this.skin.victory] ?? palettes['confetti'];
    const fireworks = this.skin.victory === 'fireworks';
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: Math.random() * 1000,
        y: this.distance + 200 + Math.random() * 200,
        vx: (Math.random() * 2 - 1) * (fireworks ? 360 : 160),
        vy: -(fireworks ? 200 + Math.random() * 300 : 140 + Math.random() * 260),
        life: 1.6 + Math.random() * 1.2,
        maxLife: 2.8,
        size: fireworks ? 4 + Math.random() * 5 : 6 + Math.random() * 8,
        growth: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: fireworks ? -80 : -40,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
        shape: fireworks ? 'spark' : 'confetti',
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size = Math.max(0, p.size + p.growth * dt);
      p.rotation += p.spin * dt;
    }
  }

  private popup(x: number, y: number, text: string, color: string, size: number): void {
    if (this.popups.length > 18) this.popups.shift();
    this.popups.push({ x, y, text, color, life: 1.1, maxLife: 1.1, size });
  }

  private updatePopups(dt: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.life -= dt;
      popup.y += dt * 90;
      if (popup.life <= 0) this.popups.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- render

  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.renderer.render(ctx, this.viewportWidth, this.viewportHeight, this);
  }
}
