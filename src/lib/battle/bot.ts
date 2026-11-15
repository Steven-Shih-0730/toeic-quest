// 機器人對手：在本機當房主跑 engine，並模擬阿明作答（CLAUDE.md 6.6）。不得依賴 React。

import {
  QUESTION_MS,
  REVEAL_MS,
  advance,
  allAnswered,
  beginQuestion,
  createEngine,
  pickBattleQuestions,
  revealQuestion,
  submitAnswer,
} from './engine';
import type { EngineState } from './engine';
import type { BattleEvent, BattleListener, Opponent, PlayerInfo } from './types';
import type { Question } from '../../types';

export const BOT_PROFILE: PlayerInfo = { id: 'bot-aming', name: '阿明', level: 4, avatar: '😎' };

/** 阿明的快忘清單（固定） */
export const BOT_DUE_WORDS = ['postpone', 'warranty', 'negotiate', 'agenda', 'shipment', 'approve', 'renovation', 'attendee'];

export interface BotOptions {
  bank: Question[];
  profile?: PlayerInfo;
  accuracy?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  rng?: () => number;
  now?: () => number;
  /** 從進行中的對戰接手（斷線改打機器人）：從 index 這題開始，沿用分數 */
  resume?: { questionIds: string[]; sourceOf: Record<string, string>; index: number; scores: Record<string, number> };
}

export class BotOpponent implements Opponent {
  readonly profile: PlayerInfo;
  private readonly bank: Map<string, Question>;
  private readonly opts: Required<Omit<BotOptions, 'resume' | 'profile' | 'bank'>> & Pick<BotOptions, 'resume'>;
  private readonly allQuestions: Question[];
  private listeners = new Set<BattleListener>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private state: EngineState | null = null;
  private meId = '';
  private disposed = false;

  constructor(options: BotOptions) {
    this.profile = options.profile ?? BOT_PROFILE;
    this.allQuestions = options.bank;
    this.bank = new Map(options.bank.map((q) => [q.id, q]));
    this.opts = {
      accuracy: options.accuracy ?? 0.7,
      minDelayMs: options.minDelayMs ?? 2000,
      maxDelayMs: options.maxDelayMs ?? 6000,
      rng: options.rng ?? Math.random,
      now: options.now ?? Date.now,
      resume: options.resume,
    };
  }

  subscribe(listener: BattleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(me: PlayerInfo & { dueWords: string[] }): void {
    if (this.state || this.disposed) return;
    this.meId = me.id;
    const resume = this.opts.resume;
    const picked = resume ?? pickBattleQuestions({
      bank: this.allQuestions,
      me: { id: me.id, words: me.dueWords },
      opponent: { id: this.profile.id, words: BOT_DUE_WORDS },
      rng: this.opts.rng,
    });
    this.state = createEngine([me.id, this.profile.id], picked.questionIds, resume && { index: resume.index, scores: resume.scores });
    this.emit({ type: 'start', questionIds: picked.questionIds, sourceOf: picked.sourceOf });
    this.runQuestion();
  }

  answer(index: number, choice: number, remainingMs: number): void {
    if (!this.state) return;
    this.state = submitAnswer(this.state, this.meId, index, { choice, remainingMs });
    this.maybeReveal();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimers();
    this.listeners.clear();
  }

  // ───────── 內部流程 ─────────

  private emit(e: BattleEvent) {
    if (this.disposed) return;
    for (const l of [...this.listeners]) l(e);
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private current(): Question {
    return this.bank.get(this.state!.questionIds[this.state!.index])!;
  }

  private runQuestion() {
    if (!this.state || this.disposed) return;
    this.state = beginQuestion(this.state, this.opts.now());
    const index = this.state.index;
    this.emit({ type: 'question', index, startAt: this.state.startAt });

    // 阿明在 2~6 秒內作答，70% 答對
    const { minDelayMs, maxDelayMs, rng, accuracy } = this.opts;
    const delay = minDelayMs + rng() * (maxDelayMs - minDelayMs);
    const q = this.current();
    const correct = rng() < accuracy;
    const wrongs = [0, 1, 2, 3].filter((i) => i !== q.answer);
    const choice = correct ? q.answer : wrongs[Math.floor(rng() * wrongs.length)];
    this.later(() => {
      if (!this.state) return;
      this.state = submitAnswer(this.state, this.profile.id, index, { choice, remainingMs: QUESTION_MS - delay });
      this.emit({ type: 'opponentAnswered', index });
      this.maybeReveal();
    }, delay);

    // 時間到就公布
    this.later(() => this.reveal(), QUESTION_MS);
  }

  private maybeReveal() {
    if (this.state && this.state.phase === 'question' && allAnswered(this.state)) this.reveal();
  }

  private reveal() {
    if (!this.state || this.state.phase !== 'question') return;
    this.clearTimers();
    this.state = revealQuestion(this.state, this.current());
    this.emit({ type: 'reveal', index: this.state.index, scores: { ...this.state.scores } });
    this.later(() => {
      if (!this.state) return;
      this.state = advance(this.state);
      if (this.state.phase === 'ended') this.emit({ type: 'end', scores: { ...this.state.scores } });
      else this.runQuestion();
    }, REVEAL_MS);
  }
}
