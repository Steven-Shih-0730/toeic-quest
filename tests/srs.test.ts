import { afterEach, describe, expect, it } from 'vitest';
import { createSeed } from '../src/data/seed';
import { setOffsetDays, today } from '../src/lib/clock';
import { applyAnswer, daysSinceWrong, dueWords, forgetList, isDue, recordAnswer } from '../src/lib/srs';
import type { WordProgress } from '../src/types';

const D = '2026-11-15';

afterEach(() => setOffsetDays(0));

describe('applyAnswer：6.1 間隔重複規則', () => {
  it('答錯 → correctStreak 歸零、隔天複習、記下答錯日、進快忘清單', () => {
    const p = applyAnswer(undefined, 'invoice', false, D);
    expect(p).toMatchObject({ word: 'invoice', wrongCount: 1, correctStreak: 0, nextReview: '2026-11-16', mastered: false, lastWrongAt: D });
    expect(forgetList([p])).toHaveLength(1);
  });

  it('答錯後連續答對 1 / 2 / 3 次 → 3 天後、7 天後、已記住', () => {
    let p = applyAnswer(undefined, 'invoice', false, '2026-11-15');

    p = applyAnswer(p, 'invoice', true, '2026-11-16');
    expect(p.correctStreak).toBe(1);
    expect(p.nextReview).toBe('2026-11-19');
    expect(p.mastered).toBe(false);

    p = applyAnswer(p, 'invoice', true, '2026-11-19');
    expect(p.correctStreak).toBe(2);
    expect(p.nextReview).toBe('2026-11-26');
    expect(p.mastered).toBe(false);

    p = applyAnswer(p, 'invoice', true, '2026-11-26');
    expect(p.correctStreak).toBe(3);
    expect(p.mastered).toBe(true);
    expect(forgetList([p])).toEqual([]);
    expect(p.wrongCount).toBe(1); // 答錯紀錄保留
  });

  it('連續答對中途答錯 → correctStreak 歸零，重新從隔天開始', () => {
    let p = applyAnswer(undefined, 'agenda', false, '2026-11-15');
    p = applyAnswer(p, 'agenda', true, '2026-11-16');
    p = applyAnswer(p, 'agenda', true, '2026-11-19');
    p = applyAnswer(p, 'agenda', false, '2026-11-26');
    expect(p).toMatchObject({ wrongCount: 2, correctStreak: 0, nextReview: '2026-11-27', mastered: false, lastWrongAt: '2026-11-26' });
  });

  it('新字第一次就答對 → correctStreak 1、3 天後到期，但不在快忘清單', () => {
    const p = applyAnswer(undefined, 'budget', true, D);
    expect(p).toMatchObject({ wrongCount: 0, correctStreak: 1, nextReview: '2026-11-18', mastered: false });
    expect(p.lastWrongAt).toBeUndefined();
    expect(forgetList([p])).toEqual([]);
    expect(isDue(p, '2026-11-18')).toBe(true);
  });

  it('已記住的字又答錯 → 取消已記住，回到快忘清單', () => {
    const mastered: WordProgress = { word: 'lend', wrongCount: 1, correctStreak: 3, nextReview: D, mastered: true };
    const p = applyAnswer(mastered, 'lend', false, D);
    expect(p.mastered).toBe(false);
    expect(forgetList([p]).map((x) => x.word)).toEqual(['lend']);
  });

  it('不會修改傳入的物件', () => {
    const prev: WordProgress = { word: 'lend', wrongCount: 1, correctStreak: 0, nextReview: D, mastered: false };
    const snapshot = { ...prev };
    applyAnswer(prev, 'lend', true, D);
    expect(prev).toEqual(snapshot);
  });
});

describe('recordAnswer', () => {
  it('沒有紀錄就新增，有紀錄就更新，其他字不動', () => {
    const start = createSeed(D).progress;
    const added = recordAnswer(start, 'budget', true, D);
    expect(added).toHaveLength(start.length + 1);

    const updated = recordAnswer(start, 'reimburse', true, D);
    expect(updated).toHaveLength(start.length);
    expect(updated.find((p) => p.word === 'reimburse')?.correctStreak).toBe(1);
    expect(updated.find((p) => p.word === 'invoice')).toBe(start.find((p) => p.word === 'invoice'));
  });
});

describe('到期判斷與「模擬隔天」', () => {
  it('nextReview <= 今天 且未記住才算到期', () => {
    const base: WordProgress = { word: 'x', wrongCount: 1, correctStreak: 0, nextReview: '2026-11-16', mastered: false };
    expect(isDue(base, '2026-11-15')).toBe(false);
    expect(isDue(base, '2026-11-16')).toBe(true);
    expect(isDue(base, '2026-11-20')).toBe(true);
    expect(isDue({ ...base, mastered: true }, '2026-11-20')).toBe(false);
  });

  it('模擬隔天後，到期清單會改變', () => {
    const now = new Date(2026, 10, 15, 9);
    const { progress } = createSeed(today(now));

    expect(dueWords(progress, today(now)).map((p) => p.word)).toEqual(['reimburse', 'invoice']);

    setOffsetDays(1); // 模擬隔天
    expect(today(now)).toBe('2026-11-16');
    expect(dueWords(progress, today(now)).map((p) => p.word)).toEqual(['reimburse', 'invoice', 'itinerary']);

    setOffsetDays(3);
    expect(dueWords(progress, today(now)).map((p) => p.word)).toEqual(['reimburse', 'invoice', 'itinerary', 'deadline']);
  });

  it('daysSinceWrong 算出「N 天前答錯」', () => {
    const { progress } = createSeed(D);
    expect(daysSinceWrong(progress[0], D)).toBe(3);
    expect(daysSinceWrong({ word: 'x', wrongCount: 0, correctStreak: 1, nextReview: D, mastered: false }, D)).toBeUndefined();
  });
});
