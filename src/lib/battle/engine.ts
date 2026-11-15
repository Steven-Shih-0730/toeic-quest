// 房主規則（CLAUDE.md 6.6、8.1）：選題、作答、計分。純函式、不碰計時器，機器人與真人房主共用。

import { BATTLE_SECONDS, battleScore, nextCombo } from '../scoring';
import type { Question } from '../../types';

export const QUESTION_MS = BATTLE_SECONDS * 1000;
export const REVEAL_MS = 2000;
export const BATTLE_SIZE = 5;
export const MAX_MY_WORDS = 3;

// ───────── 選題 ─────────

export interface PickInput {
  bank: Question[];
  me: { id: string; words: string[] };
  opponent: { id: string; words: string[] };
  rng?: () => number;
}

/**
 * 第 1、3、5 題優先放我的字（最多 3 題），其餘放對手的字；不夠時從題庫隨機補。
 * words 請依優先順序排好（到期的在前）。
 */
export function pickBattleQuestions({ bank, me, opponent, rng = Math.random }: PickInput): {
  questionIds: string[];
  sourceOf: Record<string, string>;
} {
  const byWord = new Map(bank.map((q) => [q.word, q]));
  const used = new Set<string>();
  const toQs = (words: string[]) =>
    words.map((w) => byWord.get(w)).filter((q): q is Question => !!q);

  const mine = toQs(me.words).slice(0, MAX_MY_WORDS);
  mine.forEach((q) => used.add(q.id));
  const theirs = toQs(opponent.words).filter((q) => !used.has(q.id));

  const questionIds: string[] = [];
  const sourceOf: Record<string, string> = {};
  let a = 0;
  let b = 0;
  while (questionIds.length < BATTLE_SIZE && (a < mine.length || b < theirs.length)) {
    const wantMine = questionIds.length % 2 === 0;
    let q: Question | undefined;
    let src = '';
    if ((wantMine && a < mine.length) || b >= theirs.length) {
      q = mine[a++];
      src = me.id;
    } else {
      q = theirs[b++];
      src = opponent.id;
    }
    if (q) {
      questionIds.push(q.id);
      sourceOf[q.id] = src;
      used.add(q.id);
    }
  }

  const rest = bank.filter((q) => !used.has(q.id));
  while (questionIds.length < BATTLE_SIZE && rest.length) {
    const [q] = rest.splice(Math.floor(rng() * rest.length), 1);
    questionIds.push(q.id);
  }
  return { questionIds, sourceOf };
}

// ───────── 進行 ─────────

export interface Answer {
  choice: number;
  remainingMs: number;
}

export interface EngineState {
  playerIds: string[];
  questionIds: string[];
  index: number;
  phase: 'idle' | 'question' | 'reveal' | 'ended';
  startAt: number;
  answers: Record<string, Answer | undefined>;
  scores: Record<string, number>;
  combos: Record<string, number>;
}

export function createEngine(
  playerIds: string[],
  questionIds: string[],
  resume?: { index: number; scores: Record<string, number> },
): EngineState {
  const scores: Record<string, number> = {};
  const combos: Record<string, number> = {};
  for (const id of playerIds) {
    scores[id] = resume?.scores[id] ?? 0;
    combos[id] = 0;
  }
  return { playerIds, questionIds, index: resume?.index ?? 0, phase: 'idle', startAt: 0, answers: {}, scores, combos };
}

/** 開始目前這一題 */
export function beginQuestion(s: EngineState, now: number): EngineState {
  return { ...s, phase: 'question', startAt: now, answers: {} };
}

/** 收到某位玩家的作答；不是目前這題、或重複作答就忽略 */
export function submitAnswer(s: EngineState, playerId: string, index: number, answer: Answer): EngineState {
  if (s.phase !== 'question' || index !== s.index || s.answers[playerId] || !s.playerIds.includes(playerId)) return s;
  return { ...s, answers: { ...s.answers, [playerId]: answer } };
}

export function allAnswered(s: EngineState): boolean {
  return s.playerIds.every((id) => s.answers[id]);
}

/** 公布這一題：計算每位玩家的得分（答錯或沒作答 0 分、Combo 歸零） */
export function revealQuestion(s: EngineState, question: Question): EngineState {
  if (s.phase !== 'question') return s;
  const scores = { ...s.scores };
  const combos = { ...s.combos };
  for (const id of s.playerIds) {
    const a = s.answers[id];
    const correct = !!a && a.choice === question.answer && a.remainingMs > 0;
    combos[id] = nextCombo(combos[id], correct);
    scores[id] += battleScore(correct, a?.remainingMs ?? 0, combos[id]);
  }
  return { ...s, phase: 'reveal', scores, combos };
}

export function isLastBattleQuestion(s: EngineState): boolean {
  return s.index >= s.questionIds.length - 1;
}

/** 進到下一題（回到 idle，等呼叫 beginQuestion）；最後一題則結束 */
export function advance(s: EngineState): EngineState {
  if (isLastBattleQuestion(s)) return { ...s, phase: 'ended' };
  return { ...s, index: s.index + 1, phase: 'idle', answers: {} };
}
