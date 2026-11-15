// 真人連線對戰（CLAUDE.md 8.1、8.2）。只用 Broadcast 與 Presence，不建資料表、不做登入。
// 房主（建立房間的人）用 HostRunner 出題與計分；加入者只轉送房主的訊息。不得依賴 React。

import { pickBattleQuestions } from './engine';
import { HostRunner } from './host';
import type { BattleEvent, BattleListener, BattleMsg, Opponent, PlayerInfo } from './types';
import type { Question } from '../../types';

export const ROOM_CAPACITY = 2;
/** 送出 start 後等多久開始第 1 題，讓對方畫面先準備好 */
export const FIRST_QUESTION_DELAY_MS = 1500;

export interface PresenceMember extends PlayerInfo {
  host: boolean;
  joinedAt: number;
}

/** 房間 channel 的最小介面（實作在 supabaseClient.ts；測試用假的） */
export interface RoomChannel {
  onMessage(cb: (m: BattleMsg) => void): void;
  /** Presence 同步時給完整成員名單 */
  onMembers(cb: (members: PresenceMember[]) => void): void;
  subscribe(): Promise<boolean>;
  track(member: PresenceMember): Promise<void>;
  send(m: BattleMsg): void;
  close(): void;
}

export function randomRoomCode(rng: () => number = Math.random): string {
  return String(Math.floor(rng() * 10000)).padStart(4, '0');
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

export interface RoomSnapshot {
  code: string;
  isHost: boolean;
  status: 'connecting' | 'lobby' | 'full' | 'error' | 'closed';
  me: PlayerInfo;
  opponent?: PlayerInfo;
  /** 加入者：房主在不在 */
  hostPresent: boolean;
  meReady: boolean;
  oppReady: boolean;
}

export class RealtimeRoom {
  private snap: RoomSnapshot;
  private listeners = new Set<(s: RoomSnapshot) => void>();
  private oppDueWords: string[] = [];
  private myDueWords: string[] = [];
  private opponentObj: RealtimeOpponent | null = null;
  /** 對戰畫面建立前收到的對戰訊息（例如房主比較快送出 start） */
  private pending: BattleMsg[] = [];
  private joinedAt = 0;

  constructor(
    private readonly channel: RoomChannel,
    readonly code: string,
    me: PlayerInfo,
    isHost: boolean,
    private readonly bank: Question[],
    /** 我的快忘清單（到期的在前），按「準備」時送出 */
    dueWords: string[] = [],
    private readonly now: () => number = Date.now,
  ) {
    this.myDueWords = dueWords;
    this.snap = { code, isHost, status: 'connecting', me, hostPresent: isHost, meReady: false, oppReady: false };
  }

  get snapshot(): RoomSnapshot {
    return this.snap;
  }

  get bothReady(): boolean {
    return this.snap.meReady && this.snap.oppReady && !!this.snap.opponent;
  }

  onChange(cb: (s: RoomSnapshot) => void): () => void {
    this.listeners.add(cb);
    cb(this.snap);
    return () => this.listeners.delete(cb);
  }

  async join(): Promise<RoomSnapshot['status']> {
    this.channel.onMessage((m) => this.handleMessage(m));
    this.channel.onMembers((members) => this.handleMembers(members));
    const ok = await this.channel.subscribe();
    if (!ok) {
      this.update({ status: 'error' });
      return 'error';
    }
    this.joinedAt = this.now();
    await this.channel.track({ ...this.snap.me, host: this.snap.isHost, joinedAt: this.joinedAt });
    if (this.snap.status === 'connecting') this.update({ status: 'lobby' });
    return this.snap.status;
  }

  /** 按「準備」：送出自己的快忘清單 */
  setReady(): void {
    this.update({ meReady: true });
    this.sendReady();
  }

  /** 雙方都準備好後，給 Battle 畫面用的 Opponent（建立後就開始收對戰訊息） */
  createOpponent(): Opponent {
    if (!this.opponentObj) {
      this.opponentObj = new RealtimeOpponent(this);
      const pending = this.pending;
      this.pending = [];
      pending.forEach((m) => this.opponentObj!.handleMessage(m));
    }
    return this.opponentObj;
  }

  leave(): void {
    if (this.snap.status === 'closed') return;
    this.channel.close();
    this.update({ status: 'closed' });
    this.listeners.clear();
  }

  // ───────── 給 RealtimeOpponent 用 ─────────

  /** @internal */
  get internals() {
    return {
      bank: this.bank,
      now: this.now,
      send: (m: BattleMsg) => this.channel.send(m),
      myDueWords: this.myDueWords,
      oppDueWords: this.oppDueWords,
    };
  }

  // ───────── 內部 ─────────

  private update(patch: Partial<RoomSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const l of [...this.listeners]) l(this.snap);
  }

  private sendReady() {
    const { me } = this.snap;
    this.channel.send({ type: 'ready', playerId: me.id, name: me.name, level: me.level, dueWords: this.myDueWords });
  }

  private handleMembers(members: PresenceMember[]) {
    if (this.snap.status === 'closed') return;
    const { me } = this.snap;
    // 依加入時間排序，前 2 位是房間成員；第 3 位以後顯示「房間已滿」並離開
    const sorted = [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
    const seated = sorted.slice(0, ROOM_CAPACITY);
    if (sorted.some((m) => m.id === me.id) && !seated.some((m) => m.id === me.id)) {
      this.channel.close();
      this.update({ status: 'full' });
      return;
    }

    const other = seated.find((m) => m.id !== me.id);
    const prev = this.snap.opponent;
    const opponent = other ? { id: other.id, name: other.name, level: other.level, avatar: other.avatar } : undefined;
    const hostPresent = this.snap.isHost || seated.some((m) => m.host);

    if (prev && !opponent) {
      // 對手離開
      this.oppDueWords = [];
      this.update({ opponent: undefined, oppReady: false, hostPresent });
      this.opponentObj?.handleOpponentLeft();
      return;
    }
    this.update({ opponent, hostPresent });
    // 新對手進來時，如果我已經準備好，再送一次 ready（對方可能錯過）
    if (opponent && (!prev || prev.id !== opponent.id) && this.snap.meReady) this.sendReady();
  }

  private handleMessage(m: BattleMsg) {
    if (m.type === 'ready') {
      if (m.playerId === this.snap.me.id) return;
      this.oppDueWords = m.dueWords;
      if (!this.snap.oppReady) this.update({ oppReady: true });
      return;
    }
    if (this.opponentObj) this.opponentObj.handleMessage(m);
    else this.pending.push(m);
  }
}

/**
 * 給 Battle 畫面用的 Opponent。
 * 房主：跑 HostRunner，對手的 answer 從 channel 收；加入者：把房主的訊息轉成 BattleEvent。
 * 在 Battle 訂閱前收到的事件會先暫存，訂閱時補送。
 */
export class RealtimeOpponent implements Opponent {
  readonly profile: PlayerInfo;
  private listeners = new Set<BattleListener>();
  private buffer: BattleEvent[] = [];
  private host: HostRunner | null = null;
  private meId: string;
  private disposed = false;
  private left = false;
  private disposeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly room: RealtimeRoom) {
    const s = room.snapshot;
    if (!s.opponent) throw new Error('對手尚未加入');
    this.profile = s.opponent;
    this.meId = s.me.id;
  }

  subscribe(listener: BattleListener): () => void {
    if (this.disposeTimer) {
      // 卸載後馬上又掛載（React StrictMode）：取消斷線，沿用同一條連線
      clearTimeout(this.disposeTimer);
      this.disposeTimer = null;
    }
    this.listeners.add(listener);
    const pending = this.buffer;
    this.buffer = [];
    pending.forEach((e) => listener(e));
    return () => this.listeners.delete(listener);
  }

  start(me: PlayerInfo & { dueWords: string[] }): void {
    if (this.disposed || this.host || !this.room.snapshot.isHost) return; // 加入者等房主的 start
    const { bank, now, send, oppDueWords } = this.room.internals;
    const picked = pickBattleQuestions({
      bank,
      me: { id: me.id, words: me.dueWords },
      opponent: { id: this.profile.id, words: oppDueWords },
    });
    this.host = new HostRunner({
      bank,
      playerIds: [me.id, this.profile.id],
      questionIds: picked.questionIds,
      sourceOf: picked.sourceOf,
      now,
      firstDelayMs: FIRST_QUESTION_DELAY_MS,
      onEvent: (e) => this.emit(e),
      onBroadcast: send,
    });
    this.host.start();
  }

  answer(index: number, choice: number, remainingMs: number): void {
    if (this.disposed || this.left) return;
    const msg: BattleMsg = { type: 'answer', playerId: this.meId, index, choice, remainingMs };
    this.room.internals.send(msg); // 讓對方看到「已作答」；房主的分數以 reveal 為準
    this.host?.submit(this.meId, index, { choice, remainingMs });
  }

  /** 延到下一個 tick 才真正斷線；期間若重新 subscribe 就取消 */
  dispose(): void {
    if (this.disposed || this.disposeTimer) return;
    this.disposeTimer = setTimeout(() => {
      this.disposeTimer = null;
      this.disposed = true;
      this.host?.dispose();
      this.listeners.clear();
      this.room.leave();
    }, 0);
  }

  /** @internal 由 RealtimeRoom 轉送 */
  handleMessage(m: BattleMsg): void {
    if (this.disposed || this.left) return;
    if (m.type === 'answer') {
      if (m.playerId === this.meId) return;
      if (this.host) this.host.submit(m.playerId, m.index, { choice: m.choice, remainingMs: m.remainingMs });
      else this.emit({ type: 'opponentAnswered', index: m.index });
      return;
    }
    if (this.host || m.type === 'ready') return; // 房主自己產生事件，不吃別人的控場訊息
    this.emit(m);
  }

  /** @internal 對手斷線（Presence leave） */
  handleOpponentLeft(): void {
    if (this.disposed || this.left) return;
    this.left = true;
    this.host?.dispose();
    this.emit({ type: 'opponentLeft' });
  }

  private emit(e: BattleEvent) {
    if (this.disposed) return;
    if (this.listeners.size === 0) {
      this.buffer.push(e);
      return;
    }
    for (const l of [...this.listeners]) l(e);
  }
}
