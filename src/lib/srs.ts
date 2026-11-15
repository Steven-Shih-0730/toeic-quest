// 間隔重複（CLAUDE.md 6.1）。
// 階段 1 只有首頁需要的查詢函式；答對／答錯的更新規則在階段 2 實作。

import type { WordProgress } from '../types';

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

export function dueWords(progress: WordProgress[], todayIso: string): WordProgress[] {
  return progress.filter((p) => isDue(p, todayIso));
}

export function masteredCount(progress: WordProgress[]): number {
  return progress.filter((p) => p.mastered).length;
}
