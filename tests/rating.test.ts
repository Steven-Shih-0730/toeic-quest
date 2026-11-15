import { describe, expect, it } from 'vitest';
import { FAKE_PLAYERS } from '../src/data/leaderboard';
import { LEADERBOARD_SIZE, RATING_START, applyRating, buildLeaderboard, ratingDelta } from '../src/lib/rating';
import { sample, shuffle } from '../src/lib/random';

describe('對戰積分（6.7）', () => {
  it('勝 +30、平 +10、敗 −10', () => {
    expect(ratingDelta(300, 200)).toBe(30);
    expect(ratingDelta(200, 200)).toBe(10);
    expect(ratingDelta(100, 200)).toBe(-10);
  });

  it('沒有積分時從 420 起算，最低 0', () => {
    expect(applyRating(undefined, 0)).toBe(RATING_START);
    expect(applyRating(undefined, 30)).toBe(450);
    expect(applyRating(5, -10)).toBe(0);
  });
});

describe('對戰排行榜', () => {
  const me = { name: '小陳', avatar: '🧑', rating: RATING_START };

  it('前 10 名依積分排序，捏造玩家至少 15 位', () => {
    expect(FAKE_PLAYERS.length).toBeGreaterThanOrEqual(15);
    const { top } = buildLeaderboard(FAKE_PLAYERS, me);
    expect(top).toHaveLength(LEADERBOARD_SIZE);
    expect(top.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let i = 1; i < top.length; i += 1) expect(top[i - 1].rating).toBeGreaterThanOrEqual(top[i].rating);
  });

  it('初始 420 分不在前 10 名（第 12 名），連贏 2 場就擠進前 10', () => {
    expect(buildLeaderboard(FAKE_PLAYERS, me).mine.rank).toBe(12);
    const after2 = buildLeaderboard(FAKE_PLAYERS, { ...me, rating: applyRating(applyRating(RATING_START, 30), 30) });
    expect(after2.mine.rank).toBeLessThanOrEqual(10);
    expect(after2.top.some((r) => r.me)).toBe(true);
  });

  it('同分時自己排前面', () => {
    const { mine } = buildLeaderboard([{ name: 'A', avatar: '🐱', rating: 500 }], { ...me, rating: 500 });
    expect(mine.rank).toBe(1);
  });
});

describe('隨機工具', () => {
  it('shuffle 不改變元素、不改原陣列', () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a, () => 0.3);
    expect([...b].sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });

  it('sample 取 n 個不重複', () => {
    const s = sample(['a', 'b', 'c', 'd', 'e'], 3);
    expect(s).toHaveLength(3);
    expect(new Set(s).size).toBe(3);
  });
});
