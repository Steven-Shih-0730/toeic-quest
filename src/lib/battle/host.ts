// 房主控場（CLAUDE.md 8.1 第 4~6 步）：用 engine 推進流程、管理計時器。
// 機器人與真人連線的房主共用這支。不得依賴 React。

import {
  QUESTION_MS,
  REVEAL_MS,
  advance,
  allAnswered,
  beginQuestion,
  createEngine,
  revealQuestion,
  submitAnswer,
} from './engine';
import type { Answer, EngineState } from './engine';
import type { BattleEvent, BattleMsg } from './types';
import type { Question } from '../../types';

export interface HostOptions {
  bank: Question[];
  /** [我, 對手] */
  playerIds: [string, string];
  questionIds: string[];
  sourceOf: Record<string, string>;
  now?: () => number;
  /** 送出 start 後，隔多久開始第 1 題（連線時讓對方畫面先準備好） */
  firstDelayMs?: number;
  resume?: {
    index: number;
    scores: Record<string, number>;
    /** 這題已經開始：沿用開始時間與已收到的作答 */
    inProgress?: { startAt: number; answers: Record<string, Answer> };
  };
  /** 給本機畫面的事件 */
  onEvent: (e: BattleEvent) => void;
  /** 要廣播給對方的訊息（連線用；機器人不需要） */
  onBroadcast?: (m: BattleMsg) => void;
  /** 新的一題開始（機器人用來排定自己的作答） */
  onQuestionStart?: (index: number, question: Question, startAt: number) => void;
}

export class HostRunner {
  private readonly o: HostOptions & { now: () => number };
  private readonly byId: Map<string, Question>;
  private state: EngineState;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private disposed = false;

  constructor(options: HostOptions) {
    this.o = { ...options, now: options.now ?? Date.now };
    this.byId = new Map(options.bank.map((q) => [q.id, q]));
    this.state = createEngine(options.playerIds, options.questionIds, options.resume);
  }

  start(): void {
    const { questionIds, sourceOf, resume } = this.o;
    this.send({ type: 'start', questionIds, sourceOf });
    if (this.state.index >= questionIds.length) {
      this.finish();
      return;
    }
    if (resume?.inProgress) {
      this.resumeQuestion(resume.inProgress.startAt, resume.inProgress.answers);
      return;
    }
    const delay = this.o.firstDelayMs ?? 0;
    if (delay > 0) this.later(() => this.runQuestion(), delay);
    else this.runQuestion();
  }

  /** 收到作答（我或對手） */
  submit(playerId: string, index: number, answer: Answer): void {
    if (this.disposed) return;
    const before = this.state;
    this.state = submitAnswer(this.state, playerId, index, answer);
    if (this.state === before) return;
    if (playerId !== this.o.playerIds[0]) this.o.onEvent({ type: 'opponentAnswered', index });
    this.maybeReveal();
  }

  get snapshot(): EngineState {
    return this.state;
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimers();
  }

  // ───────── 內部 ─────────

  /** 同時給本機畫面與對方（如果有） */
  private send(m: BattleMsg & { type: 'start' | 'question' | 'reveal' | 'end' }) {
    if (this.disposed) return;
    this.o.onBroadcast?.(m);
    this.o.onEvent(m);
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private current(): Question {
    return this.byId.get(this.state.questionIds[this.state.index])!;
  }

  private runQuestion() {
    if (this.disposed) return;
    this.state = beginQuestion(this.state, this.o.now());
    const { index, startAt } = this.state;
    this.send({ type: 'question', index, startAt });
    this.o.onQuestionStart?.(index, this.current(), startAt);
    this.later(() => this.reveal(), QUESTION_MS);
  }

  private resumeQuestion(startAt: number, answers: Record<string, Answer>) {
    this.state = beginQuestion(this.state, startAt);
    for (const [id, a] of Object.entries(answers)) this.state = submitAnswer(this.state, id, this.state.index, a);
    this.send({ type: 'question', index: this.state.index, startAt });
    this.later(() => this.reveal(), Math.max(0, startAt + QUESTION_MS - this.o.now()));
    this.maybeReveal();
  }

  private maybeReveal() {
    if (this.state.phase === 'question' && allAnswered(this.state)) this.reveal();
  }

  private reveal() {
    if (this.disposed || this.state.phase !== 'question') return;
    this.clearTimers();
    this.state = revealQuestion(this.state, this.current());
    this.send({ type: 'reveal', index: this.state.index, scores: { ...this.state.scores } });
    this.later(() => {
      this.state = advance(this.state);
      if (this.state.phase === 'ended') this.finish();
      else this.runQuestion();
    }, REVEAL_MS);
  }

  private finish() {
    this.state = { ...this.state, phase: 'ended' };
    this.send({ type: 'end', scores: { ...this.state.scores } });
  }
}
