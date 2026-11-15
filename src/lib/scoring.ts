// 經驗值、Combo、連續天數、對戰計分（CLAUDE.md 6.4、6.6）。不得依賴 React。

import { addDays } from './clock';
import type { Player } from '../types';

export const XP_PER_LEVEL = 300;
export const XP_FIRST_TRY = 10;
export const XP_AFTER_HINT = 5;
export const COMBO_THRESHOLD = 2;
export const COMBO_MULTIPLIER = 1.25;
export const BOSS_FIRST_CLEAR_XP = 50;
export const BATTLE_SECONDS = 10;

/** 這題答完後的 Combo 數：一次就答對才 +1，否則歸零 */
export function nextCombo(prevCombo: number, firstTryCorrect: boolean): number {
  return firstTryCorrect ? prevCombo + 1 : 0;
}

export function comboMultiplier(combo: number): number {
  return combo >= COMBO_THRESHOLD ? COMBO_MULTIPLIER : 1;
}

export type QuestOutcome = 'first' | 'afterHint' | 'wrong';

/**
 * 今日關卡單題經驗值。
 * combo 是「包含這一題」的連續一次答對數（用 nextCombo 算出）。
 */
export function questXp(outcome: QuestOutcome, combo: number): number {
  if (outcome === 'first') return Math.round(XP_FIRST_TRY * comboMultiplier(combo));
  if (outcome === 'afterHint') return XP_AFTER_HINT;
  return 0;
}

/** 加經驗值；每 300 升一級，多的帶到下一級 */
export function addXp<T extends Pick<Player, 'level' | 'xp'>>(p: T, amount: number): T & { levelsGained: number } {
  let xp = p.xp + Math.max(0, amount);
  let level = p.level;
  let levelsGained = 0;
  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level += 1;
    levelsGained += 1;
  }
  return { ...p, level, xp, levelsGained };
}

/** 載入或「模擬隔天」時檢查：lastActiveDate 早於昨天就歸零 */
export function refreshStreak(player: Player, todayIso: string): Player {
  const yesterday = addDays(todayIso, -1);
  if (player.lastActiveDate < yesterday && player.streakDays !== 0) {
    return { ...player, streakDays: 0 };
  }
  return player;
}

/** 完成今日關卡：同一天只加一次 */
export function completeDaily(player: Player, todayIso: string): { player: Player; streakUp: boolean } {
  if (player.lastActiveDate === todayIso) return { player, streakUp: false };
  const base = refreshStreak(player, todayIso);
  return {
    player: { ...base, streakDays: base.streakDays + 1, lastActiveDate: todayIso },
    streakUp: true,
  };
}

/**
 * 對戰單題得分：Math.round(ceil(剩餘秒數) × 10 × Combo 加成)；答錯或超時 0 分。
 * combo 是「包含這一題」的連續答對數。
 */
export function battleScore(correct: boolean, remainingMs: number, combo: number): number {
  if (!correct || remainingMs <= 0) return 0;
  const secs = Math.ceil(Math.min(remainingMs, BATTLE_SECONDS * 1000) / 1000);
  return Math.round(secs * 10 * comboMultiplier(combo));
}

/** 對戰結束獎勵 */
export function battleReward(myScore: number, oppScore: number): number {
  if (myScore > oppScore) return 30;
  if (myScore === oppScore) return 20;
  return 10;
}
