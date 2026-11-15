// demo 用初始假資料（CLAUDE.md 第 7 節「初始假資料」）。
// 日期以傳入的 today 為基準，讓「重設 demo」在任何一天都得到一樣的情境。

import { addDays } from '../lib/clock';
import type { GameState } from '../types';

function randomId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 10);
}

export function createSeed(today: string): GameState {
  return {
    player: {
      id: randomId(),
      name: '小陳',
      level: 3,
      xp: 240,
      streakDays: 6,
      lastActiveDate: addDays(today, -1),
      clearedStages: [1, 2, 3, 4, 5, 6],
      badges: [],
      rating: 420,
    },
    // 以下歷程是示意用的假資料，只保證到期日落在規格要求的日子
    progress: [
      // 3 天前答錯，已過期 → 今天到期
      { word: 'reimburse', wrongCount: 1, correctStreak: 0, nextReview: addDays(today, -2), mastered: false, lastWrongAt: addDays(today, -3) },
      { word: 'invoice', wrongCount: 1, correctStreak: 0, nextReview: addDays(today, -2), mastered: false, lastWrongAt: addDays(today, -3) },
      // 4 天前答錯、2 天前複習答對一次 → 明天到期
      { word: 'itinerary', wrongCount: 1, correctStreak: 1, nextReview: addDays(today, 1), mastered: false, lastWrongAt: addDays(today, -4) },
      // 3 天後到期
      { word: 'deadline', wrongCount: 1, correctStreak: 1, nextReview: addDays(today, 3), mastered: false, lastWrongAt: addDays(today, -2) },
    ],
  };
}
