import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { BOT_DUE_WORDS, BOT_PROFILE, BotOpponent } from '../src/lib/battle/bot';
import {
  QUESTION_MS,
  REVEAL_MS,
  advance,
  beginQuestion,
  createEngine,
  pickBattleQuestions,
  revealQuestion,
  submitAnswer,
} from '../src/lib/battle/engine';
import type { BattleEvent } from '../src/lib/battle/types';

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
const wordOf = (id: string) => byId.get(id)!.word;
const ME = { id: 'me', name: '小陳', level: 3, avatar: '🧑' };

describe('pickBattleQuestions：選題', () => {
  it('第 1、3、5 題放我的字（最多 3 題），第 2、4 題放對手的字，並標示來源', () => {
    const r = pickBattleQuestions({
      bank: QUESTIONS,
      me: { id: 'me', words: ['reimburse', 'invoice', 'itinerary', 'deadline'] },
      opponent: { id: 'bot', words: BOT_DUE_WORDS },
    });
    expect(r.questionIds.map(wordOf)).toEqual(['reimburse', 'postpone', 'invoice', 'warranty', 'itinerary']);
    expect(r.questionIds.map((id) => r.sourceOf[id])).toEqual(['me', 'bot', 'me', 'bot', 'me']);
  });

  it('我的清單不夠時由對手的字補上', () => {
    const r = pickBattleQuestions({
      bank: QUESTIONS,
      me: { id: 'me', words: ['reimburse'] },
      opponent: { id: 'bot', words: BOT_DUE_WORDS },
    });
    expect(r.questionIds.map(wordOf)).toEqual(['reimburse', 'postpone', 'warranty', 'negotiate', 'agenda']);
  });

  it('雙方清單重複的字只出一次', () => {
    const r = pickBattleQuestions({
      bank: QUESTIONS,
      me: { id: 'me', words: ['postpone'] },
      opponent: { id: 'bot', words: ['postpone', 'agenda'] },
      rng: () => 0,
    });
    expect(new Set(r.questionIds).size).toBe(5);
    expect(r.sourceOf[r.questionIds[0]]).toBe('me');
  });

  it('兩邊都不夠 5 題時，從題庫隨機補（沒有來源標示）', () => {
    const r = pickBattleQuestions({ bank: QUESTIONS, me: { id: 'me', words: [] }, opponent: { id: 'bot', words: ['agenda'] }, rng: () => 0 });
    expect(r.questionIds).toHaveLength(5);
    expect(new Set(r.questionIds).size).toBe(5);
    expect(Object.keys(r.sourceOf)).toHaveLength(1);
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

  it('dispose 後不再送出任何事件', () => {
    const { bot, events } = setup(() => 0);
    const n = events.length;
    bot.dispose();
    vi.advanceTimersByTime(60_000);
    expect(events).toHaveLength(n);
  });
});
