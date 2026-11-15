// 對戰的共用型別（CLAUDE.md 8.0）。機器人與真人連線都實作 Opponent，Battle 畫面只依賴這裡。

export interface PlayerInfo {
  id: string;
  name: string;
  level: number;
  avatar: string;
}

/** 與 CLAUDE.md 8.2 的訊息一一對應 */
export type BattleEvent =
  | { type: 'start'; questionIds: string[]; sourceOf: Record<string, string> }
  | { type: 'question'; index: number; startAt: number }
  | { type: 'opponentAnswered'; index: number }
  | { type: 'reveal'; index: number; scores: Record<string, number> }
  | { type: 'end'; scores: Record<string, number> }
  | { type: 'opponentLeft' };

export type BattleListener = (e: BattleEvent) => void;

export interface Opponent {
  readonly profile: PlayerInfo;
  /** 開始對戰；呼叫前請先 subscribe */
  start(me: PlayerInfo & { dueWords: string[] }): void;
  /** 回報我的作答；remainingMs 由作答者自己計算 */
  answer(index: number, choice: number, remainingMs: number): void;
  /** 訂閱事件，回傳取消訂閱的函式 */
  subscribe(listener: BattleListener): () => void;
  /** 清掉計時器、斷開連線 */
  dispose(): void;
}
