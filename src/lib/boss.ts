// Boss 關（CLAUDE.md 6.5）。不得依賴 React。

import { shuffle } from './random';
import type { Question } from '../types';

export const BOSS_HP = 3;
export const PLAYER_LIVES = 3;
export const BOSS_QUESTION_COUNT = 5;

/** 從該區的命題教授陷阱題隨機抽 5 題 */
export function buildBossQuestions(bank: Question[], zone: number, rng: () => number = Math.random): Question[] {
  const traps = bank.filter((q) => q.zone === zone && q.tag === 'professor');
  return shuffle(traps, rng).slice(0, BOSS_QUESTION_COUNT);
}

export interface BossSession {
  questions: Question[];
  idx: number;
  bossHp: number;
  lives: number;
  /** 本題選了哪個選項；null 表示還沒作答 */
  picked: number | null;
  results: Array<{ word: string; zh: string; correct: boolean }>;
}

export function startBoss(questions: Question[]): BossSession {
  return { questions, idx: 0, bossHp: BOSS_HP, lives: PLAYER_LIVES, picked: null, results: [] };
}

export function isBossOver(s: BossSession): boolean {
  return s.bossHp <= 0 || s.lives <= 0 || (s.picked !== null && s.idx >= s.questions.length - 1);
}

export function bossWon(s: BossSession): boolean {
  return s.bossHp <= 0;
}

/** Boss 關沒有提示：選一次就定案。回傳要寫入間隔重複的紀錄。 */
export function pickBoss(s: BossSession, choice: number): { session: BossSession; record?: { word: string; correct: boolean } } {
  if (s.picked !== null || s.bossHp <= 0 || s.lives <= 0) return { session: s };
  const q = s.questions[s.idx];
  const correct = choice === q.answer;
  return {
    session: {
      ...s,
      picked: choice,
      bossHp: correct ? s.bossHp - 1 : s.bossHp,
      lives: correct ? s.lives : s.lives - 1,
      results: [...s.results, { word: q.word, zh: q.zh, correct }],
    },
    record: { word: q.word, correct },
  };
}

export function nextBoss(s: BossSession): BossSession {
  if (s.picked === null || isBossOver(s)) return s;
  return { ...s, idx: s.idx + 1, picked: null };
}
