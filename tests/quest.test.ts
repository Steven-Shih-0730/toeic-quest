import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { createSeed } from '../src/data/seed';
import {
  INTERVIEWER_INDEX,
  QUEST_SIZE,
  buildDailyQuest,
  nextQuestion,
  pickOption,
  reviewLabel,
  startSession,
  summarize,
} from '../src/lib/quest';
import type { QuestItem } from '../src/lib/quest';
import { applyAnswer } from '../src/lib/srs';
import type { WordProgress } from '../src/types';

const D = '2026-11-15';
const words = (items: QuestItem[]) => items.map((i) => i.question.word);

describe('buildDailyQuest：出題（6.2）', () => {
  const seed = createSeed(D);
  const items = buildDailyQuest(QUESTIONS, seed.progress, D, 1);

  it('固定 5 題、不重複', () => {
    expect(items).toHaveLength(QUEST_SIZE);
    expect(new Set(words(items)).size).toBe(QUEST_SIZE);
  });

  it('先放到期的複習字，並標示「🔁 3 天前答錯」', () => {
    expect(words(items).slice(0, 2)).toEqual(['reimburse', 'invoice']);
    expect(reviewLabel(items[0])).toBe('🔁 3 天前答錯');
  });

  it('第 4 題是面試官題，且至少 1 題面試官題', () => {
    expect(items[INTERVIEWER_INDEX].question.tag).toBe('interviewer');
  });

  it('其餘是一般情境題的新題，沒有教授陷阱題', () => {
    const rest = items.filter((_, i) => i >= 2 && i !== INTERVIEWER_INDEX);
    for (const it of rest) {
      expect(['email', 'notice', 'meeting']).toContain(it.question.tag);
      expect(seed.progress.some((p) => p.word === it.question.word)).toBe(false);
      expect(it.review).toBeUndefined();
    }
  });

  it('到期字超過 2 個時只取 2 個（最久沒複習的先）', () => {
    const many = buildDailyQuest(QUESTIONS, seed.progress, '2026-11-20', 1);
    expect(many.filter((i) => i.review)).toHaveLength(2);
    expect(words(many).slice(0, 2)).toEqual(['reimburse', 'invoice']);
  });

  it('到期字剛好是面試官題時，第 4 題換另一題面試官題', () => {
    const progress: WordProgress[] = [applyAnswer(undefined, 'apologize', false, '2026-11-14')];
    const q = buildDailyQuest(QUESTIONS, progress, D, 1);
    expect(words(q)[0]).toBe('apologize');
    expect(q[INTERVIEWER_INDEX].question.tag).toBe('interviewer');
    expect(q[INTERVIEWER_INDEX].question.word).not.toBe('apologize');
  });

  it('從沒答錯過的到期字標示「🔁 複習時間到」；昨天答錯標示「🔁 昨天答錯」', () => {
    const neverWrong = applyAnswer(undefined, 'budget', true, '2026-11-12'); // 11/15 到期
    const wrongYesterday = applyAnswer(undefined, 'agenda', false, '2026-11-14');
    const q = buildDailyQuest(QUESTIONS, [wrongYesterday, neverWrong], D, 1);
    expect(reviewLabel(q[0])).toBe('🔁 昨天答錯');
    expect(reviewLabel(q[1])).toBe('🔁 複習時間到');
  });

  it('新題用完時：先補未記住且未到期（複習日近的先），再補已記住的字', () => {
    const general = QUESTIONS.filter((q) => ['email', 'notice', 'meeting'].includes(q.tag));
    // 全部一般題都有進度：前 13 個已記住，最後 2 個未記住、分別 5 天後與 2 天後到期
    const progress: WordProgress[] = general.map((q, i) => ({
      word: q.word,
      wrongCount: 0,
      correctStreak: i < 13 ? 3 : 1,
      nextReview: i === 13 ? '2026-11-20' : '2026-11-17',
      mastered: i < 13,
    }));
    const q = buildDailyQuest(QUESTIONS, progress, D, 1);
    const fill = q.filter((_, i) => i !== INTERVIEWER_INDEX).map((i) => i.question.word);
    expect(fill[0]).toBe(general[14].word); // 2 天後到期
    expect(fill[1]).toBe(general[13].word); // 5 天後到期
    expect(fill.slice(2).every((w) => progress.find((p) => p.word === w)?.mastered)).toBe(true);
    expect(q).toHaveLength(QUEST_SIZE);
  });
});

describe('作答流程：蘇格拉底式提示（6.3）與經驗值（6.4）', () => {
  const items = buildDailyQuest(QUESTIONS, createSeed(D).progress, D, 1);
  const answerOf = (s: ReturnType<typeof startSession>) => s.items[s.idx].question.answer;
  const wrongOf = (s: ReturnType<typeof startSession>, n = 0) =>
    [0, 1, 2, 3].filter((i) => i !== answerOf(s))[n];

  it('一次答對：+10 XP、記為答對、本題結束', () => {
    const s = startSession(items);
    const e = pickOption(s, answerOf(s));
    expect(e.xp).toBe(10);
    expect(e.record).toEqual({ word: 'reimburse', correct: true });
    expect(e.session.phase).toBe('done');
  });

  it('第一次答錯：顯示提示、立刻記為答錯、不公布答案', () => {
    const s = startSession(items);
    const e = pickOption(s, wrongOf(s));
    expect(e.session.phase).toBe('hint');
    expect(e.record).toEqual({ word: 'reimburse', correct: false });
    expect(e.xp).toBe(0);
  });

  it('提示後答對：+5 XP，不再寫入紀錄（已記為答錯）', () => {
    let s = startSession(items);
    s = pickOption(s, wrongOf(s)).session;
    const e = pickOption(s, answerOf(s));
    expect(e.xp).toBe(5);
    expect(e.record).toBeUndefined();
    expect(e.session.results[0].outcome).toBe('afterHint');
  });

  it('第二次答錯：公布答案，0 XP', () => {
    let s = startSession(items);
    s = pickOption(s, wrongOf(s, 0)).session;
    const e = pickOption(s, wrongOf(s, 1));
    expect(e.session.phase).toBe('done');
    expect(e.session.results[0].outcome).toBe('wrong');
    expect(e.xp).toBe(0);
  });

  it('重複點已經選錯的選項不會有反應', () => {
    let s = startSession(items);
    s = pickOption(s, wrongOf(s)).session;
    const e = pickOption(s, wrongOf(s));
    expect(e.session).toBe(s);
  });

  it('連續一次答對：第 2 題起 ×1.25（13 XP）；提示後答對會中斷 Combo', () => {
    let s = startSession(items);
    let e = pickOption(s, answerOf(s));
    s = nextQuestion(e.session);
    e = pickOption(s, answerOf(s));
    expect(e.xp).toBe(13);
    expect(e.session.combo).toBe(2);

    s = nextQuestion(e.session);
    s = pickOption(s, wrongOf(s)).session;
    e = pickOption(s, answerOf(s));
    expect(e.session.combo).toBe(0);

    s = nextQuestion(e.session);
    e = pickOption(s, answerOf(s));
    expect(e.xp).toBe(10);
  });

  it('結算：答對數、XP、複仇成功、新加入快忘清單', () => {
    let s = startSession(items);
    const plan: Array<'first' | 'hint' | 'wrong'> = ['first', 'wrong', 'first', 'hint', 'first'];
    plan.forEach((p, i) => {
      if (p === 'first') s = pickOption(s, answerOf(s)).session;
      if (p === 'hint') {
        s = pickOption(s, wrongOf(s)).session;
        s = pickOption(s, answerOf(s)).session;
      }
      if (p === 'wrong') {
        s = pickOption(s, wrongOf(s, 0)).session;
        s = pickOption(s, wrongOf(s, 1)).session;
      }
      if (i < plan.length - 1) s = nextQuestion(s);
    });
    const sum = summarize(s);
    expect(sum.correct).toBe(4);
    expect(sum.total).toBe(5);
    expect(sum.xp).toBe(10 + 0 + 10 + 5 + 10);
    expect(sum.revenge.map((r) => r.word)).toEqual(['reimburse']); // invoice 答錯，沒複仇成功
    expect(sum.pinned.map((r) => r.word)).toEqual(['invoice', words(items)[3]]);
  });
});
