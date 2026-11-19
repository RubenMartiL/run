import { MODE_DEFS, bossRushTotal, buildModeLevel } from './modes';

describe('mode level generation', () => {
  it('exposes five standard modes', () => {
    expect(MODE_DEFS.map((mode) => mode.id)).toEqual([
      'endless',
      'timeAttack',
      'coinRush',
      'survival',
      'bossRush',
    ]);
  });

  it('builds an endless track without a finish', () => {
    const level = buildModeLevel('endless', { seed: 42 });
    expect(level.mode).toBe('endless');
    expect(level.rules?.endless).toBe(true);
    expect(level.trackLength).toBeGreaterThan(100_000);
    expect(level.gates.length).toBeGreaterThan(100);
    expect(level.finish.power).toBe(0);
  });

  it('builds survival with only harmful or neutral gates', () => {
    const level = buildModeLevel('survival', { seed: 77 });
    for (const gate of level.gates) {
      expect(['sub', 'div', 'shield']).toContain(gate.left.kind);
      expect(['sub', 'div', 'shield']).toContain(gate.right.kind);
    }
    expect(level.obstacles.length).toBeGreaterThan(50);
  });

  it('builds a coin rush with a target and timer', () => {
    const level = buildModeLevel('coinRush', { seed: 9 });
    expect(level.rules?.coinTarget).toBe(60);
    expect(level.rules?.timeLimit).toBe(45);
    expect(level.rules?.endless).toBe(true);
    expect(level.coins.length).toBeGreaterThan(100);
  });

  it('builds a competitive fixed time attack course', () => {
    const level = buildModeLevel('timeAttack');
    expect(level.rules?.finishAction).toBe('finish');
    expect(level.rules?.competitive).toBe(true);
    expect(level.rules?.medalTimes?.gold).toBeLessThan(level.rules?.medalTimes?.silver ?? 0);
    expect(level.rules?.medalTimes?.silver).toBeLessThan(level.rules?.medalTimes?.bronze ?? 0);
    expect(level.trackLength).toBeGreaterThan(5000);
  });

  it('generates a deterministic daily challenge', () => {
    const first = buildModeLevel('daily');
    const second = buildModeLevel('daily');
    expect(first.id).toBe(second.id);
    expect(first.gates.map((gate) => gate.y)).toEqual(second.gates.map((gate) => gate.y));
    expect(first.rules?.competitive).toBe(true);
  });

  it('scales boss rush encounters and reports the chain length', () => {
    const first = buildModeLevel('bossRush', { bossIndex: 0, startingCrowd: 60 });
    const second = buildModeLevel('bossRush', { bossIndex: 1, startingCrowd: 60 });
    expect(bossRushTotal()).toBe(3);
    expect(first.rules?.bossTotal).toBe(3);
    expect(second.rules?.bossIndex).toBe(1);
    expect(second.finish.power).toBeGreaterThan(first.finish.power);
    expect(first.hasBoss).toBe(true);
  });
});
