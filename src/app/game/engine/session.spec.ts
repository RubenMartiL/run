import { vi } from 'vitest';
import { AudioService } from '../../core/audio/audio.service';
import { HapticsService } from '../../core/haptics/haptics.service';
import { getLevelByKey } from '../data/levels';
import { WORLD_THEMES } from '../data/worlds';
import { buildModeLevel } from '../data/modes';
import { applyGateOp } from '../gates';
import { GameSession, RunResult } from './session';

/**
 * Headless integration test for the gameplay simulation. Rendering is stubbed
 * out so the fixed-step loop, gate resolution, collisions and battle resolution
 * run without a real browser.
 */
describe('GameSession simulation', () => {
  beforeAll(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as CanvasRenderingContext2D,
    );
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe(): void {}
      disconnect(): void {}
    };
    globalThis.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = () => undefined;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  function runLevel(levelId: string): { result: RunResult | null; session: GameSession } {
    const parsed = levelId.match(/^(.+)-(\d+)$/);
    const worldId = parsed?.[1] ?? 'green-city';
    const levelNumber = Number(parsed?.[2] ?? 1);
    const script = getLevelByKey(worldId, levelNumber);
    const theme = WORLD_THEMES.find((entry) => entry.id === worldId);
    if (!script || !theme) throw new Error(`Missing level ${levelId}`);

    const canvas = document.createElement('canvas');
    let result: RunResult | null = null;

    const session = new GameSession(
      canvas,
      script,
      theme,
      new AudioService(),
      new HapticsService(),
      {
        onSnapshot: () => undefined,
        onEnd: (value) => {
          result = value;
        },
        onAutoPause: () => undefined,
      },
    );

    const driver = session as unknown as { update: (dt: number) => void };
    for (let i = 0; i < 9000 && !result; i++) {
      driver.update(1 / 60);
    }
    return { result, session };
  }

  it('finishes an early level without runtime errors', () => {
    const { result, session } = runLevel('green-city-1');
    session.destroy();
    expect(result).toBeTruthy();
    expect(result!.won).toBe(true);
    expect(result!.stars).toBeGreaterThanOrEqual(1);
    expect(result!.crowd).toBeGreaterThanOrEqual(0);
    expect(result!.coins).toBeGreaterThan(0);
    expect(Number.isFinite(result!.durationMs)).toBe(true);
  });

  it('resolves a boss level and stays within crowd limits', () => {
    const { result, session } = runLevel('green-city-5');
    session.destroy();
    expect(result).toBeTruthy();
    expect(result!.boss).toBe(true);
    expect(result!.crowdAtFinish).toBeGreaterThanOrEqual(0);
    expect(result!.stars).toBeGreaterThanOrEqual(0);
    expect(result!.stars).toBeLessThanOrEqual(3);
  });

  it('resolves the campaign finale', () => {
    const { result, session } = runLevel('kingdom-20');
    session.destroy();
    expect(result).toBeTruthy();
    expect(Number.isFinite(result!.coins)).toBe(true);
    expect(result!.coins).toBeGreaterThanOrEqual(0);
  });

  it('completes a time attack course with a medal', () => {
    const level = buildModeLevel('timeAttack');
    const theme = WORLD_THEMES.find((entry) => entry.id === level.worldId);
    if (!theme) throw new Error('Theme missing');

    const canvas = document.createElement('canvas');
    let result: RunResult | null = null;
    const session = new GameSession(
      canvas,
      level,
      theme,
      new AudioService(),
      new HapticsService(),
      {
        onSnapshot: () => undefined,
        onEnd: (value) => {
          result = value;
        },
        onAutoPause: () => undefined,
      },
    );

    const driver = session as unknown as {
      update: (dt: number) => void;
      distance: number;
      crowdCount: number;
      targetX: number;
    };

    for (let i = 0; i < 6000 && !result; i++) {
      const nextGate = level.gates.find((gate) => gate.y > driver.distance + 120);
      if (nextGate) {
        const left = applyGateOp(driver.crowdCount, nextGate.left);
        const right = applyGateOp(driver.crowdCount, nextGate.right);
        driver.targetX = left >= right ? 300 : 700;
      }
      driver.update(1 / 60);
    }
    session.destroy();

    expect(result).toBeTruthy();
    expect(result!.mode).toBe('timeAttack');
    expect(result!.won).toBe(true);
    expect(result!.medal).toBeTruthy();
    expect(result!.elapsed).toBeLessThan(60);
    expect(result!.coins).toBeGreaterThan(0);
  });

  it('does not auto-finish an endless run', () => {
    const level = buildModeLevel('endless', { seed: 2024 });
    const theme = WORLD_THEMES.find((entry) => entry.id === level.worldId);
    if (!theme) throw new Error('Theme missing');
    const canvas = document.createElement('canvas');
    let result: RunResult | null = null;
    const session = new GameSession(
      canvas,
      level,
      theme,
      new AudioService(),
      new HapticsService(),
      {
        onSnapshot: () => undefined,
        onEnd: (value) => {
          result = value;
        },
        onAutoPause: () => undefined,
      },
    );
    const driver = session as unknown as { update: (dt: number) => void; distance: number };
    for (let i = 0; i < 600 && !result; i++) {
      const driverFull = session as unknown as {
        update: (dt: number) => void;
        distance: number;
        crowdCount: number;
        targetX: number;
      };
      const nextGate = level.gates.find((gate) => gate.y > driverFull.distance + 120);
      if (nextGate) {
        const left = applyGateOp(driverFull.crowdCount, nextGate.left);
        const right = applyGateOp(driverFull.crowdCount, nextGate.right);
        driverFull.targetX = left >= right ? 300 : 700;
      }
      driver.update(1 / 60);
    }
    expect(result).toBeNull();
    expect(driver.distance).toBeGreaterThan(2000);
    session.destroy();
  });
});
