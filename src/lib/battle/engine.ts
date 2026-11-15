// 房主規則（CLAUDE.md 6.6、8.1）：選題、作答、計分。純函式、不碰計時器，機器人與真人房主共用。

import { shuffle } from '../random';
import type { Rng } from '../random';
import { BATTLE_SECONDS, battleScore, nextCombo } from '../scoring';
import { forgetList, isDue } from '../srs';
import type { Question, WordProgress } from '../../types';

export const QUESTION_MS = BATTLE_SECONDS * 1000;
export const REVEAL_MS = 2000;
export const BATTLE_SIZE = 5;
export const MAX_MY_WORDS = 3;

// ───────── 選題 ─────────

/**
 * 對戰用的快忘字順序：整份快忘清單，到期的字優先，但同一組內隨機（CLAUDE.md 6.6）。
 * 每位玩家在自己的裝置上算好，連線時放在 ready 訊息裡送給房主。
 */
export function battleWordPool(progress: WordProgress[], todayIso: string, rng: Rng = Math.random): string[] {
  const list = forgetList(progress);
  const due = list.filter((p) => isDue(p, todayIso)).map((p) => p.word);
  const later = list.filter((p) => !isDue(p, todayIso)).map((p) => p.word);
  return [...shuffle(due, rng), ...shuffle(later, rng)];
}

export interface PickInput {
  bank: Question[];
  me: { id: string; words: string[] };
  opponent: { id: string; words: string[] };
  rng?: Rng;
}

/**
 * 選 5 題：我的字最多 3 題（依 words 的順序），對手的字補到 5 題，
 * 兩邊不夠時從整個題庫隨機補；最後打亂出題順序。
 */
export function pickBattleQuestions({ bank, me, opponent, rng = Math.random }: PickInput): {
  questionIds: string[];
  sourceOf: Record<string, string>;
} {
  const byWord = new Map(bank.map((q) => [q.word, q]));
  const used = new Set<string>();
  const sourceOf: Record<string, string> = {};
  const picked: Question[] = [];
  const take = (q: Question, src?: string) => {
    picked.push(q);
    used.add(q.id);
    if (src) sourceOf[q.id] = src;
  };

  for (const w of me.words) {
    if (picked.length >= MAX_MY_WORDS) break;
    const q = byWord.get(w);
    if (q && !used.has(q.id)) take(q, me.id);
  }
  for (const w of opponent.words) {
    if (picked.length >= BATTLE_SIZE) break;
    const q = byWord.get(w);
    if (q && !used.has(q.id)) take(q, opponent.id);
  }
  for (const q of shuffle(bank.filter((x) => !used.has(x.id)), rng)) {
    if (picked.length >= BATTLE_SIZE) break;
    take(q);
  }
  return { questionIds: shuffle(picked, rng).map((q) => q.id), sourceOf };
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
