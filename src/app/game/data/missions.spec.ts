import {
  ACHIEVEMENTS,
  DAILY_POOL,
  DAILY_REWARDS,
  WEEKLY_EVENT,
  buildDailyMissions,
  rollChest,
} from './missions';

describe('mission content', () => {
  it('builds three unique daily missions deterministically', () => {
    const first = buildDailyMissions('2026-05-01');
    const second = buildDailyMissions('2026-05-01');
    expect(first).toHaveLength(3);
    expect(new Set(first.map((mission) => mission.id)).size).toBe(3);
    expect(first.map((mission) => mission.id)).toEqual(second.map((mission) => mission.id));
  });

  it('changes missions on a different day', () => {
    const ids = new Set(
      ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04'].map((date) =>
        buildDailyMissions(date)
          .map((mission) => mission.id)
          .join(','),
      ),
    );
    expect(ids.size).toBeGreaterThan(1);
  });

  it('has a complete 7-day reward table', () => {
    expect(DAILY_REWARDS).toHaveLength(7);
    for (let i = 1; i < DAILY_REWARDS.length; i++) {
      expect(DAILY_REWARDS[i].coins).toBeGreaterThanOrEqual(DAILY_REWARDS[i - 1].coins);
    }
  });

  it('has configurable achievements and a weekly event', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(WEEKLY_EVENT.target).toBeGreaterThan(0);
    expect(DAILY_POOL.length).toBeGreaterThanOrEqual(6);
  });

  it('rolls deterministic chest rewards inside the configured table', () => {
    const reward = rollChest(123);
    expect(reward.coins).toBeGreaterThan(0);
    expect(rollChest(123)).toEqual(reward);
  });
});
