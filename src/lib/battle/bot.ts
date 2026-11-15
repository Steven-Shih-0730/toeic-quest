// 機器人對手：在本機當房主（HostRunner），並模擬阿明作答（CLAUDE.md 6.6）。不得依賴 React。

import { QUESTION_MS, pickBattleQuestions } from './engine';
import { HostRunner } from './host';
import { sample } from '../random';
import type { BattleEvent, BattleListener, Opponent, PlayerInfo, ResumeInfo } from './types';
import type { Question } from '../../types';

export const BOT_PROFILE: PlayerInfo = { id: 'bot-aming', name: '阿明', level: 4, avatar: '😎' };

/** 阿明的快忘清單：每場從題庫隨機抽 8 個字（CLAUDE.md 6.6） */
export const BOT_WORD_COUNT = 8;

export function botWords(bank: Question[], rng: () => number = Math.random, exclude: string[] = []): string[] {
  return sample(
    bank.map((q) => q.word).filter((w) => !exclude.includes(w)),
    BOT_WORD_COUNT,
    rng,
  );
}

export interface BotOptions {
  bank: Question[];
  profile?: PlayerInfo;
  accuracy?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  rng?: () => number;
  now?: () => number;
  /** 從進行中的對戰接手（對手斷線改打機器人） */
  resume?: Omit<ResumeInfo, 'opponentId'>;
}

export class BotOpponent implements Opponent {
  readonly profile: PlayerInfo;
  private readonly opts: BotOptions;
  private listeners = new Set<BattleListener>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private host: HostRunner | null = null;
  private meId = '';
  private disposed = false;

  constructor(options: BotOptions) {
    this.profile = options.profile ?? BOT_PROFILE;
    this.opts = options;
  }

  subscribe(listener: BattleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(me: PlayerInfo & { dueWords: string[] }): void {
    if (this.host || this.disposed) return;
    this.meId = me.id;
    const { bank, resume, rng = Math.random, now } = this.opts;
    const picked =
      resume ??
      pickBattleQuestions({
        bank,
        me: { id: me.id, words: me.dueWords },
        opponent: { id: this.profile.id, words: botWords(bank, rng, me.dueWords) },
        rng,
      });

    // 接手進行中的題目：原對手這題以 0 分計（視為答錯）
    const inProgress = resume?.inProgress && {
      startAt: resume.inProgress.startAt,
      answers: {
        [this.profile.id]: { choice: -1, remainingMs: 0 },
        ...(resume.inProgress.myAnswer ? { [me.id]: resume.inProgress.myAnswer } : {}),
      },
    };

    this.host = new HostRunner({
      bank,
      playerIds: [me.id, this.profile.id],
      questionIds: picked.questionIds,
      sourceOf: picked.sourceOf,
      now,
      resume: resume && { index: resume.index, scores: resume.scores, inProgress },
      onEvent: (e) => this.emit(e),
      onQuestionStart: (index, q) => this.scheduleAnswer(index, q),
    });
    this.host.start();
  }

  answer(index: number, choice: number, remainingMs: number): void {
    this.host?.submit(this.meId, index, { choice, remainingMs });
  }

  dispose(): void {
    this.disposed = true;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.host?.dispose();
    this.listeners.clear();
  }

  /** 阿明在 2~6 秒內作答，70% 答對 */
  private scheduleAnswer(index: number, q: Question) {
    const { rng = Math.random, accuracy = 0.7, minDelayMs = 2000, maxDelayMs = 6000 } = this.opts;
    const delay = minDelayMs + rng() * (maxDelayMs - minDelayMs);
    const correct = rng() < accuracy;
    const wrongs = [0, 1, 2, 3].filter((i) => i !== q.answer);
    const choice = correct ? q.answer : wrongs[Math.floor(rng() * wrongs.length)];
    this.timers.push(
      setTimeout(() => this.host?.submit(this.profile.id, index, { choice, remainingMs: QUESTION_MS - delay }), delay),
    );
  }

  private emit(e: BattleEvent) {
    if (this.disposed) return;
    for (const l of [...this.listeners]) l(e);
  }
}
