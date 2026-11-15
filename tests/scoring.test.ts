import { describe, expect, it } from 'vitest';
import { createSeed } from '../src/data/seed';
import {
  addXp,
  battleReward,
  battleScore,
  completeDaily,
  nextCombo,
  questXp,
  refreshStreak,
} from '../src/lib/scoring';

describe('今日關卡經驗值與 Combo（6.4）', () => {
  it('一次答對 +10，提示後答對 +5（一半），答錯 0', () => {
    expect(questXp('first', 1)).toBe(10);
    expect(questXp('afterHint', 0)).toBe(5);
    expect(questXp('wrong', 0)).toBe(0);
  });

  it('連續一次答對 2 題以上 ×1.25，並用 Math.round（12.5 → 13）', () => {
    expect(questXp('first', 2)).toBe(13);
    expect(questXp('first', 5)).toBe(13);
  });

  it('Combo：一次答對 +1；提示後答對或答錯都歸零', () => {
    let c = 0;
    c = nextCombo(c, true);
    c = nextCombo(c, true);
    expect(c).toBe(2);
    c = nextCombo(c, false); // 提示後才答對，不算一次答對
    expect(c).toBe(0);
  });

  it('一整關：對、對、提示後對、對、對 = 10 + 13 + 5 + 10 + 13 = 51', () => {
    const answers: Array<'first' | 'afterHint'> = ['first', 'first', 'afterHint', 'first', 'first'];
    let combo = 0;
    let total = 0;
    for (const a of answers) {
      combo = nextCombo(combo, a === 'first');
      total += questXp(a, combo);
    }
    expect(total).toBe(51);
  });
});

describe('升級（每 300 XP）', () => {
  it('未滿 300 不升級', () => {
    expect(addXp({ level: 3, xp: 240 }, 50)).toMatchObject({ level: 3, xp: 290, levelsGained: 0 });
  });

  it('剛好滿 300 升一級，多的帶到下一級', () => {
    expect(addXp({ level: 3, xp: 240 }, 60)).toMatchObject({ level: 4, xp: 0, levelsGained: 1 });
    expect(addXp({ level: 3, xp: 240 }, 75)).toMatchObject({ level: 4, xp: 15, levelsGained: 1 });
  });

  it('一次獲得很多經驗值可以連升多級', () => {
    expect(addXp({ level: 1, xp: 0 }, 650)).toMatchObject({ level: 3, xp: 50, levelsGained: 2 });
  });
});

describe('連續天數', () => {
  const player = createSeed('2026-11-15').player; // streak 6，lastActiveDate = 11/14

  it('今天完成今日關卡 → +1，同一天再完成不再加', () => {
    const first = completeDaily(player, '2026-11-15');
    expect(first.streakUp).toBe(true);
    expect(first.player.streakDays).toBe(7);
    expect(first.player.lastActiveDate).toBe('2026-11-15');

    const again = completeDaily(first.player, '2026-11-15');
    expect(again.streakUp).toBe(false);
    expect(again.player.streakDays).toBe(7);
  });

  it('lastActiveDate 是昨天 → 不歸零', () => {
    expect(refreshStreak(player, '2026-11-15').streakDays).toBe(6);
  });

  it('lastActiveDate 早於昨天 → 歸零；之後完成關卡從 1 開始', () => {
    const p = refreshStreak(player, '2026-11-16');
    expect(p.streakDays).toBe(0);
    expect(completeDaily(player, '2026-11-16').player.streakDays).toBe(1);
  });
});

describe('對戰計分（6.6）', () => {
  it('答對得分 = ceil(剩餘秒數) × 10', () => {
    expect(battleScore(true, 7300, 1)).toBe(80);
    expect(battleScore(true, 10000, 1)).toBe(100);
    expect(battleScore(true, 1, 1)).toBe(10);
  });

  it('連續答對 2 題以上 ×1.25，Math.round', () => {
    expect(battleScore(true, 7300, 2)).toBe(100);
    expect(battleScore(true, 2500, 3)).toBe(38); // 3 × 10 × 1.25 = 37.5 → 38
  });

  it('答錯或超時 0 分', () => {
    expect(battleScore(false, 9000, 3)).toBe(0);
    expect(battleScore(true, 0, 1)).toBe(0);
    expect(battleScore(true, -200, 1)).toBe(0);
  });

  it('回報的剩餘時間超過 10 秒時以 10 秒計', () => {
    expect(battleScore(true, 15000, 1)).toBe(100);
  });

  it('勝 +30、平 +20、敗 +10', () => {
    expect(battleReward(300, 200)).toBe(30);
    expect(battleReward(200, 200)).toBe(20);
    expect(battleReward(100, 200)).toBe(10);
  });
});
