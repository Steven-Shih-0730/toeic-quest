// 資料模型，對應 CLAUDE.md 第 5 節

export type Tag = 'email' | 'notice' | 'meeting' | 'interviewer' | 'professor';

export interface Question {
  id: string;
  word: string;
  zh: string;
  zone: number;
  tag: Tag;
  /** 英文題目句，空格一律以 ____ 表示 */
  stem: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  hint: string;
  explanation: string;
  /** 面試官情境文字（只有 interviewer 題有） */
  ctx?: string;
}

export interface WordProgress {
  word: string;
  wrongCount: number;
  correctStreak: number;
  /** ISO 日期 YYYY-MM-DD */
  nextReview: string;
  mastered: boolean;
  lastWrongAt?: string;
}

export interface Player {
  id: string;
  name: string;
  /** 是否已在對戰大廳確認過暱稱 */
  nameConfirmed?: boolean;
  level: number;
  /** 目前等級內的經驗值，0~299 */
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  /** 關卡編號 1~50，第 N 區第 M 關 = (N-1)*10 + M */
  clearedStages: number[];
  badges: string[];
}

export interface GameState {
  player: Player;
  progress: WordProgress[];
}
