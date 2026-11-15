import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { BOT_PROFILE, BOT_WORD_COUNT, BotOpponent, botWords } from '../src/lib/battle/bot';
import {
  QUESTION_MS,
  REVEAL_MS,
  advance,
  battleWordPool,
  beginQuestion,
  createEngine,
  pickBattleQuestions,
  revealQuestion,
  submitAnswer,
} from '../src/lib/battle/engine';
import type { BattleEvent } from '../src/lib/battle/types';
import type { WordProgress } from '../src/types';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
const wordOf = (id: string) => byId.get(id)!.word;
const ME = { id: 'me', name: '小陳', level: 3, avatar: '🧑' };

describe('pickBattleQuestions：選題與隨機性（6.6）', () => {
  const pick = (myWords: string[], oppWords: string[], rng?: () => number) =>
    pickBattleQuestions({ bank: QUESTIONS, me: { id: 'me', words: myWords }, opponent: { id: 'bot', words: oppWords }, rng });

  it('我的字最多 3 題、對手的字補到 5 題，來源標示正確', () => {
    const r = pick(['reimburse', 'invoice', 'itinerary', 'deadline'], ['postpone', 'warranty', 'agenda']);
    const bySource = (src: string) => r.questionIds.filter((id) => r.sourceOf[id] === src).map(wordOf).sort();
    expect(bySource('me')).toEqual(['invoice', 'itinerary', 'reimburse']);
    expect(bySource('bot')).toEqual(['postpone', 'warranty']);
  });

  it('我的清單不夠時由對手的字補上；雙方重複的字只出一次', () => {
    const r = pick(['postpone'], ['postpone', 'agenda', 'venue', 'minutes', 'audit']);
    expect(new Set(r.questionIds).size).toBe(5);
    expect(r.sourceOf[QUESTIONS.find((q) => q.word === 'postpone')!.id]).toBe('me');
    expect(r.questionIds.filter((id) => r.sourceOf[id] === 'bot')).toHaveLength(4);
  });

  it('兩邊都不夠 5 題時，從整個題庫隨機補（沒有來源標示）', () => {
    const r = pick([], ['agenda'], () => 0);
    expect(r.questionIds).toHaveLength(5);
    expect(new Set(r.questionIds).size).toBe(5);
    expect(Object.keys(r.sourceOf)).toHaveLength(1);
  });

  it('出題順序會打亂：同樣的清單打 30 場，至少出現 5 種不同順序', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 30; i += 1) orders.add(pick(['reimburse', 'invoice', 'itinerary'], ['postpone', 'warranty']).questionIds.join());
    expect(orders.size).toBeGreaterThanOrEqual(5);
  });

  it('隨機補題來自整個題庫（5 個區域都有機會）', () => {
    const zones = new Set<number>();
    for (let i = 0; i < 40; i += 1) pick([], []).questionIds.forEach((id) => zones.add(byId.get(id)!.zone));
    expect(zones.size).toBe(5);
  });

  it('機器人每場隨機抽 8 個字，而且不會抽到我清單裡的字', () => {
    const a = botWords(QUESTIONS, Math.random, ['reimburse']);
    expect(a).toHaveLength(BOT_WORD_COUNT);
    expect(new Set(a).size).toBe(BOT_WORD_COUNT);
    expect(a).not.toContain('reimburse');
    const seen = new Set<string>();
    for (let i = 0; i < 10; i += 1) botWords(QUESTIONS).forEach((w) => seen.add(w));
    expect(seen.size).toBeGreaterThan(BOT_WORD_COUNT * 3);
  });
});

describe('battleWordPool：我的快忘字順序', () => {
  it('只取快忘清單；到期的字一定排在未到期的前面', () => {
    const progress: WordProgress[] = [
      { word: 'budget', wrongCount: 0, correctStreak: 1, nextReview: '2026-11-10', mastered: false }, // 沒答錯過，不算快忘字
      { word: 'agenda', wrongCount: 1, correctStreak: 1, nextReview: '2026-11-20', mastered: false },
      { word: 'reimburse', wrongCount: 1, correctStreak: 0, nextReview: '2026-11-14', mastered: false },
      { word: 'invoice', wrongCount: 2, correctStreak: 0, nextReview: '2026-11-15', mastered: false },
      { word: 'lend', wrongCount: 1, correctStreak: 3, nextReview: '2026-11-01', mastered: true },
    ];
    for (let i = 0; i < 10; i += 1) {
      const pool = battleWordPool(progress, '2026-11-15');
      expect(pool).toHaveLength(3);
      expect(pool.slice(0, 2).sort()).toEqual(['invoice', 'reimburse']);
      expect(pool[2]).toBe('agenda');
    }
  });
});

describe('engine：作答與計分（6.6）', () => {
  const q = QUESTIONS[0];
  const ids = ['me', 'bot'];

  it('答對得分 = ceil(剩餘秒數) × 10；答錯 0 分；Combo ×1.25', () => {
    let s = beginQuestion(createEngine(ids, [q.id, q.id]), 0);
    s = submitAnswer(s, 'me', 0, { choice: q.answer, remainingMs: 7300 });
    s = submitAnswer(s, 'bot', 0, { choice: (q.answer + 1) % 4, remainingMs: 9000 });
    s = revealQuestion(s, q);
    expect(s.scores).toEqual({ me: 80, bot: 0 });

    s = beginQuestion(advance(s), 0);
    s = submitAnswer(s, 'me', 1, { choice: q.answer, remainingMs: 7300 });
    s = revealQuestion(s, q); // bot 超時
    expect(s.scores).toEqual({ me: 80 + 100, bot: 0 });
    expect(s.combos).toEqual({ me: 2, bot: 0 });
  });

  it('不是目前這題、重複作答、陌生玩家都會被忽略', () => {
    let s = beginQuestion(createEngine(ids, [q.id]), 0);
    s = submitAnswer(s, 'me', 0, { choice: q.answer, remainingMs: 5000 });
    expect(submitAnswer(s, 'me', 0, { choice: 0, remainingMs: 9999 })).toBe(s);
    expect(submitAnswer(s, 'bot', 3, { choice: 0, remainingMs: 1 })).toBe(s);
    expect(submitAnswer(s, 'stranger', 0, { choice: 0, remainingMs: 1 })).toBe(s);
  });

  it('可以從第 N 題、目前分數接手', () => {
    const s = createEngine(ids, [q.id, q.id, q.id], { index: 2, scores: { me: 120, bot: 90 } });
    expect(s.index).toBe(2);
    expect(s.scores).toEqual({ me: 120, bot: 90 });
  });
});

describe('BotOpponent：機器人對手', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(rng: () => number) {
    const bot = new BotOpponent({ bank: QUESTIONS, rng, now: () => Date.now() });
    const events: BattleEvent[] = [];
    bot.subscribe((e) => events.push(e));
    bot.start({ ...ME, dueWords: ['reimburse', 'invoice'] });
    return { bot, events };
  }

  it('開始後送出 start 與第 1 題；題目來源標示正確', () => {
    const { events } = setup(() => 0.5);
    expect(events[0].type).toBe('start');
    expect(events[1]).toMatchObject({ type: 'question', index: 0 });
    const start = events[0] as Extract<BattleEvent, { type: 'start' }>;
    expect(start.sourceOf[start.questionIds[0]]).toBe('me');
    expect(start.sourceOf[start.questionIds[1]]).toBe(BOT_PROFILE.id);
  });

  it('機器人在 2~6 秒內作答（rng=0 → 2 秒、答對）', () => {
    const { events } = setup(() => 0);
    vi.advanceTimersByTime(1999);
    expect(events.some((e) => e.type === 'opponentAnswered')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(events.at(-1)).toEqual({ type: 'opponentAnswered', index: 0 });
  });

  it('rng 接近 1 → 6 秒才作答、而且答錯（超過 70%）', () => {
    const { bot, events } = setup(() => 0.99);
    bot.answer(0, 0, 9000);
    vi.advanceTimersByTime(5900);
    expect(events.some((e) => e.type === 'opponentAnswered')).toBe(false);
    vi.advanceTimersByTime(100);
    const reveal = events.find((e) => e.type === 'reveal') as Extract<BattleEvent, { type: 'reveal' }>;
    expect(reveal.scores[BOT_PROFILE.id]).toBe(0);
  });

  it('雙方都作答就立即公布；公布 2 秒後下一題', () => {
    const { bot, events } = setup(() => 0); // 機器人 2 秒答對
    const start = events[0] as Extract<BattleEvent, { type: 'start' }>;
    const q0 = byId.get(start.questionIds[0])!;
    vi.advanceTimersByTime(2000);
    bot.answer(0, q0.answer, QUESTION_MS - 2500);
    const reveal = events.at(-1) as Extract<BattleEvent, { type: 'reveal' }>;
    expect(reveal).toMatchObject({ type: 'reveal', index: 0 });
    expect(reveal.scores).toEqual({ me: 80, [BOT_PROFILE.id]: 80 });
    vi.advanceTimersByTime(REVEAL_MS - 1);
    expect(events.at(-1)?.type).toBe('reveal');
    vi.advanceTimersByTime(1);
    expect(events.at(-1)).toMatchObject({ type: 'question', index: 1 });
  });

  it('我沒作答時，10 秒到會公布（我 0 分）', () => {
    const { events } = setup(() => 0);
    vi.advanceTimersByTime(QUESTION_MS);
    const reveal = events.find((e) => e.type === 'reveal') as Extract<BattleEvent, { type: 'reveal' }>;
    expect(reveal.scores.me).toBe(0);
  });

  it('可以完整打完 5 題並送出 end', () => {
    const { events } = setup(() => 0.3);
    vi.advanceTimersByTime(5 * (QUESTION_MS + REVEAL_MS));
    expect(events.filter((e) => e.type === 'question')).toHaveLength(5);
    expect(events.filter((e) => e.type === 'reveal')).toHaveLength(5);
    expect(events.at(-1)?.type).toBe('end');
  });

  it('答對率約 70%（1000 題統計）', () => {
    let correct = 0;
    const N = 1000;
    for (let i = 0; i < N; i += 1) {
      const bot = new BotOpponent({ bank: QUESTIONS });
      let score = -1;
      bot.subscribe((e) => {
        if (e.type === 'reveal') score = e.scores[BOT_PROFILE.id];
      });
      bot.start({ ...ME, dueWords: [] });
      bot.answer(0, 0, 1);
      vi.advanceTimersByTime(6000);
      if (score > 0) correct += 1;
      bot.dispose();
    }
    expect(correct / N).toBeGreaterThan(0.64);
    expect(correct / N).toBeLessThan(0.76);
  });

  it('從進行中的對戰接手：從指定題號開始、沿用分數', () => {
    const questionIds = QUESTIONS.slice(0, 5).map((q) => q.id);
    const bot = new BotOpponent({
      bank: QUESTIONS,
      rng: () => 0,
      resume: { questionIds, sourceOf: {}, index: 3, scores: { me: 150, [BOT_PROFILE.id]: 70 } },
    });
    const events: BattleEvent[] = [];
    bot.subscribe((e) => events.push(e));
    bot.start({ ...ME, dueWords: [] });
    expect(events[1]).toMatchObject({ type: 'question', index: 3 });
    vi.advanceTimersByTime(2 * (QUESTION_MS + REVEAL_MS));
    const end = events.at(-1) as Extract<BattleEvent, { type: 'end' }>;
    expect(end.type).toBe('end');
    expect(end.scores.me).toBe(150);
    expect(end.scores[BOT_PROFILE.id]).toBeGreaterThan(70);
  });

  it('接手進行中的題目：沿用我的作答，原對手這題 0 分，下一題起由機器人作答', () => {
    const questionIds = QUESTIONS.slice(0, 5).map((q) => q.id);
    const q2 = QUESTIONS[2];
    const startAt = Date.now() - 3000; // 這題已經過 3 秒
    const bot = new BotOpponent({
      bank: QUESTIONS,
      profile: { ...BOT_PROFILE, id: 'old-opp' },
      rng: () => 0, // 2 秒、答對
      resume: {
        questionIds,
        sourceOf: {},
        index: 2,
        scores: { me: 100, 'old-opp': 90 },
        inProgress: { startAt, myAnswer: { choice: q2.answer, remainingMs: 6500 } },
      },
    });
    const events: BattleEvent[] = [];
    bot.subscribe((e) => events.push(e));
    bot.start({ ...ME, dueWords: [] });

    // 我已作答、原對手視為答錯 → 立即公布
    expect(events.map((e) => e.type)).toEqual(['start', 'question', 'reveal']);
    expect(events[1]).toEqual({ type: 'question', index: 2, startAt });
    expect((events[2] as Extract<BattleEvent, { type: 'reveal' }>).scores).toEqual({ me: 170, 'old-opp': 90 });

    vi.advanceTimersByTime(REVEAL_MS + 2000);
    expect(events.some((e) => e.type === 'opponentAnswered' && e.index === 3)).toBe(true);
  });

  it('dispose 後不再送出任何事件', () => {
    const { bot, events } = setup(() => 0);
    const n = events.length;
    bot.dispose();
    vi.advanceTimersByTime(60_000);
    expect(events).toHaveLength(n);
  });
});
