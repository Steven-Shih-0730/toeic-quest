import { describe, expect, it } from 'vitest';
import { QUESTIONS, findByWord } from '../src/data/questions';
import { createSeed } from '../src/data/seed';
import { dueWords, forgetList, isDue, masteredCount } from '../src/lib/srs';

const TODAY = '2026-11-15';

describe('首頁查詢函式（srs 的唯讀部分）', () => {
  const { progress } = createSeed(TODAY);

  it('初始快忘清單依到期日排序：reimburse、invoice 今天，itinerary 明天，deadline 3 天後', () => {
    const list = forgetList(progress);
    expect(list.map((p) => p.word)).toEqual(['reimburse', 'invoice', 'itinerary', 'deadline']);
    expect(list.map((p) => p.nextReview)).toEqual(['2026-11-13', '2026-11-13', '2026-11-16', '2026-11-18']);
  });

  it('今天到期的是 reimburse、invoice', () => {
    expect(dueWords(progress, TODAY).map((p) => p.word)).toEqual(['reimburse', 'invoice']);
  });

  it('隔天 itinerary 也到期', () => {
    expect(dueWords(progress, '2026-11-16').map((p) => p.word)).toContain('itinerary');
  });

  it('已記住的字不算到期，也不在快忘清單', () => {
    const p = { word: 'budget', wrongCount: 2, correctStreak: 3, nextReview: '2026-11-01', mastered: true };
    expect(isDue(p, TODAY)).toBe(false);
    expect(forgetList([p])).toEqual([]);
    expect(masteredCount([p])).toBe(1);
  });

  it('沒答錯過的字（wrongCount = 0）不在快忘清單', () => {
    const p = { word: 'budget', wrongCount: 0, correctStreak: 1, nextReview: '2026-11-18', mastered: false };
    expect(forgetList([p])).toEqual([]);
  });

  it('初始已記住 0 字', () => {
    expect(masteredCount(progress)).toBe(0);
  });
});

describe('題庫格式', () => {
  it('共 25 題：一般 15、面試官 4、命題教授 6', () => {
    expect(QUESTIONS).toHaveLength(25);
    const general = QUESTIONS.filter((q) => ['email', 'notice', 'meeting'].includes(q.tag));
    expect(general).toHaveLength(15);
    expect(QUESTIONS.filter((q) => q.tag === 'interviewer')).toHaveLength(4);
    expect(QUESTIONS.filter((q) => q.tag === 'professor')).toHaveLength(6);
  });

  it('每題 id、word 唯一，題目恰好一個 ____，正解選項就是目標字的變化形', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    expect(new Set(QUESTIONS.map((q) => q.word)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) {
      expect(q.stem.split('____')).toHaveLength(2);
      expect(q.options[q.answer].toLowerCase().startsWith(q.word.slice(0, 5))).toBe(true);
    }
  });

  it('面試官題都有情境文字', () => {
    for (const q of QUESTIONS.filter((x) => x.tag === 'interviewer')) {
      expect(q.ctx).toBeTruthy();
    }
  });

  it('seed 裡的字都查得到中文字義', () => {
    for (const p of createSeed(TODAY).progress) {
      expect(findByWord(p.word)?.zh).toBeTruthy();
    }
  });
});
