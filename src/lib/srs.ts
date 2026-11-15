// 間隔重複（CLAUDE.md 6.1）。不得依賴 React。

import { addDays, daysBetween } from './clock';
import type { WordProgress } from '../types';

/** 連續答對幾次算已記住 */
export const MASTER_STREAK = 3;

/** 第 N 次連續答對後，幾天後再複習（N = 1、2） */
const INTERVAL_AFTER_STREAK: Record<number, number> = { 1: 3, 2: 7 };

/** 答錯後幾天再複習 */
const INTERVAL_AFTER_WRONG = 1;

function blank(word: string, todayIso: string): WordProgress {
  return { word, wrongCount: 0, correctStreak: 0, nextReview: todayIso, mastered: false };
}

/**
 * 依 6.1 的規則更新一個字的進度，回傳新物件（不修改原本的）。
 * prev 為 undefined 表示第一次作答這個字。
 */
export function applyAnswer(
  prev: WordProgress | undefined,
  word: string,
  correct: boolean,
  todayIso: string,
): WordProgress {
  const p = prev ? { ...prev } : blank(word, todayIso);

  if (!correct) {
    return {
      ...p,
      wrongCount: p.wrongCount + 1,
      correctStreak: 0,
      nextReview: addDays(todayIso, INTERVAL_AFTER_WRONG),
      mastered: false,
      lastWrongAt: todayIso,
    };
  }

  const streak = p.correctStreak + 1;
  if (p.mastered || streak >= MASTER_STREAK) {
    return { ...p, correctStreak: streak, mastered: true };
  }
  return { ...p, correctStreak: streak, nextReview: addDays(todayIso, INTERVAL_AFTER_STREAK[streak]) };
}

/** 對整份進度清單記錄一次作答，回傳新清單 */
export function recordAnswer(
  progress: WordProgress[],
  word: string,
  correct: boolean,
  todayIso: string,
): WordProgress[] {
  const idx = progress.findIndex((p) => p.word === word);
  const next = applyAnswer(idx >= 0 ? progress[idx] : undefined, word, correct, todayIso);
  if (idx < 0) return [...progress, next];
  return progress.map((p, i) => (i === idx ? next : p));
}

/** 今天到期 = nextReview <= 今天 且尚未記住（ISO 日期字串可直接比大小） */
export function isDue(p: WordProgress, todayIso: string): boolean {
  return !p.mastered && p.nextReview <= todayIso;
}

/** 快忘清單 = 答錯過且尚未記住的字，依下次複習日排序 */
export function forgetList(progress: WordProgress[]): WordProgress[] {
  return progress
    .filter((p) => p.wrongCount > 0 && !p.mastered)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

/** 今天到期的字，依下次複習日排序（最久沒複習的在前） */
export function dueWords(progress: WordProgress[], todayIso: string): WordProgress[] {
  return progress
    .filter((p) => isDue(p, todayIso))
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function masteredCount(progress: WordProgress[]): number {
  return progress.filter((p) => p.mastered).length;
}

/** 距離上次答錯幾天（用在「🔁 N 天前答錯」）；沒答錯過回傳 undefined */
export function daysSinceWrong(p: WordProgress, todayIso: string): number | undefined {
  return p.lastWrongAt ? daysBetween(p.lastWrongAt, todayIso) : undefined;
}
