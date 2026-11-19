import { CAMPAIGN, ALL_LEVELS, getLevelByKey, getNextLevel } from './levels';
import { applyGateOp } from '../gates';

describe('campaign data', () => {
  it('contains 10 worlds with 20 levels each', () => {
    expect(CAMPAIGN).toHaveLength(10);
    for (const world of CAMPAIGN) {
      expect(world.levels).toHaveLength(20);
    }
    expect(ALL_LEVELS).toHaveLength(200);
  });

  it('uses unique level ids', () => {
    const ids = new Set(ALL_LEVELS.map((level) => level.id));
    expect(ids.size).toBe(200);
  });

  it('authored star thresholds are ascending and positive', () => {
    for (const level of ALL_LEVELS) {
      expect(level.stars.one).toBeGreaterThan(0);
      expect(level.stars.two).toBeGreaterThan(level.stars.one);
      expect(level.stars.three).toBeGreaterThan(level.stars.two);
    }
  });

  it('places gates before the finish and inside the track', () => {
    for (const level of ALL_LEVELS) {
      expect(level.gates.length).toBeGreaterThanOrEqual(4);
      for (const gate of level.gates) {
        expect(gate.y).toBeGreaterThan(500);
        expect(gate.y).toBeLessThan(level.trackLength - 200);
        expect(gate.left).toBeTruthy();
        expect(gate.right).toBeTruthy();
      }
    }
  });

  it('keeps coins and obstacles on the road', () => {
    for (const level of ALL_LEVELS) {
      for (const coin of level.coins) {
        expect(coin.x).toBeGreaterThanOrEqual(100);
        expect(coin.x).toBeLessThanOrEqual(900);
      }
      for (const obstacle of level.obstacles) {
        expect(obstacle.x).toBeGreaterThanOrEqual(100);
        expect(obstacle.x).toBeLessThanOrEqual(900);
        expect(obstacle.damage).toBeGreaterThanOrEqual(5);
        expect(obstacle.damage).toBeLessThanOrEqual(60);
      }
    }
  });

  it('has three boss levels per world', () => {
    for (const world of CAMPAIGN) {
      const bosses = world.levels.filter((level) => level.hasBoss);
      expect(bosses.map((level) => level.index)).toEqual([4, 14, 19]);
    }
  });

  it('resolves campaign levels by world key and supports next-level chaining', () => {
    const first = getLevelByKey('green-city', 1);
    expect(first?.id).toBe('green-city-1');
    const next = first ? getNextLevel(first) : undefined;
    expect(next?.id).toBe('green-city-2');
    const finale = getLevelByKey('kingdom', 20);
    expect(finale?.hasBoss).toBe(true);
    expect(finale ? getNextLevel(finale) : undefined).toBeUndefined();
    expect(getLevelByKey('green-city', 21)).toBeUndefined();
  });

  it('scales difficulty across the campaign', () => {
    const level1 = getLevelByKey('green-city', 1);
    const level20 = getLevelByKey('kingdom', 20);
    expect(level1).toBeTruthy();
    expect(level20).toBeTruthy();
    expect(level20!.difficulty).toBeGreaterThan(level1!.difficulty);
    expect(level20!.finish.power).toBeGreaterThan(level1!.finish.power);
  });

  it('is winnable with optimal gate choices', () => {
    for (const level of ALL_LEVELS) {
      let crowd = level.startingCrowd;
      for (const gate of level.gates) {
        crowd = Math.max(
          applyGateOp(crowd, gate.left),
          applyGateOp(crowd, gate.right),
        );
      }
      expect(crowd).toBeGreaterThan(level.finish.power);
      expect(level.stars.three).toBeLessThanOrEqual(crowd);
    }
  });

  it('uses every hazard type and includes barrier finishes', () => {
    const kinds = new Set<string>(
      ALL_LEVELS.flatMap((level) => level.obstacles.map((o) => o.kind)),
    );
    for (const kind of ['hammer', 'saw', 'slider', 'spikes', 'barrier', 'gap', 'ball', 'crusher', 'number']) {
      expect(kinds.has(kind)).toBe(true);
    }
    const barriers = ALL_LEVELS.filter((level) => level.finish.kind === 'barrier');
    expect(barriers.length).toBeGreaterThan(0);
    for (const level of barriers) {
      expect(level.finish.power).toBeGreaterThan(0);
    }
  });
});
