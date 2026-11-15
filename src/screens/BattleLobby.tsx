import { useEffect, useRef, useState } from 'react';
import styles from './BattleLobby.module.css';
import RoomView from './RoomView';
import { BOT_PROFILE } from '../lib/battle/bot';
import { isValidRoomCode, randomRoomCode } from '../lib/battle/realtime';
import type { RealtimeRoom } from '../lib/battle/realtime';
import type { Player } from '../types';

interface Props {
  player: Player;
  onSetName: (name: string) => void;
  /** 重新顯示暱稱輸入框 */
  onEditName: () => void;
  /** 快速配對成功，開始跟機器人對戰 */
  onQuickMatch: () => void;
  /** 是否已設定 Supabase 連線 */
  realtimeAvailable: boolean;
  /** 建立或加入房間（isHost = 建立房間的人） */
  openRoom: (code: string, isHost: boolean) => RealtimeRoom | null;
  /** 房間裡雙方都準備好，進入對戰 */
  onRoomStart: (room: RealtimeRoom) => void;
}

const NAME_MAX = 10;

export default function BattleLobby({
  player,
  onSetName,
  onEditName,
  onQuickMatch,
  realtimeAvailable,
  openRoom,
  onRoomStart,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'searching' | 'found'>('idle');
  const [nameDraft, setNameDraft] = useState(player.name);
  const [room, setRoom] = useState<RealtimeRoom | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const timers = useRef<number[]>([]);
  const roomRef = useRef<RealtimeRoom | null>(null);
  const roomStartedRef = useRef(false);
  roomRef.current = room;

  // 離開大廳時，還沒開始對戰的房間要斷線
  useEffect(
    () => () => {
      if (roomRef.current && !roomStartedRef.current) roomRef.current.leave();
    },
    [],
  );

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const quickMatch = () => {
    setPhase('searching');
    timers.current.push(window.setTimeout(() => setPhase('found'), 2000));
    timers.current.push(window.setTimeout(onQuickMatch, 4000));
  };

  const cancel = () => {
    clearTimers();
    setPhase('idle');
  };

  const enterRoom = (code: string, isHost: boolean) => {
    const r = openRoom(code, isHost);
    if (r) setRoom(r);
  };

  const leaveRoom = () => {
    room?.leave();
    setRoom(null);
  };

  const saveName = () => {
    const name = nameDraft.trim().slice(0, NAME_MAX);
    if (name) onSetName(name);
  };

  if (!player.nameConfirmed) {
    return (
      <main className={styles.center}>
        <form
          className={styles.nameCard}
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <div className={styles.bigIcon} aria-hidden="true">
            🧑
          </div>
          <h2 className={styles.title}>先取個暱稱吧</h2>
          <p className={styles.sub}>對手會看到這個名字。</p>
          <input
            className={styles.input}
            value={nameDraft}
            maxLength={NAME_MAX}
            onChange={(e) => setNameDraft(e.target.value)}
            aria-label="暱稱"
            autoFocus
          />
          <button type="submit" className={styles.primary} disabled={!nameDraft.trim()}>
            確定
          </button>
        </form>
      </main>
    );
  }

  if (room) {
    return (
      <RoomView
        room={room}
        onStart={(r) => {
          roomStartedRef.current = true;
          onRoomStart(r);
        }}
        onLeave={leaveRoom}
      />
    );
  }

  if (phase !== 'idle') {
    return (
      <main className={styles.center}>
        {phase === 'searching' ? (
          <>
            <div className={styles.spinner} aria-hidden="true" />
            <h2 className={styles.title}>配對中…</h2>
            <p className={styles.sub}>正在尋找程度相近的對手</p>
          </>
        ) : (
          <>
            <div className={styles.vs}>
              <div className={styles.side}>
                <div className={`${styles.avatar} ${styles.me}`}>🧑</div>
                <div className={styles.who}>
                  {player.name} Lv.{player.level}
                </div>
              </div>
              <div className={styles.vsText}>VS</div>
              <div className={styles.side}>
                <div className={`${styles.avatar} ${styles.opp}`}>{BOT_PROFILE.avatar}</div>
                <div className={styles.who}>
                  {BOT_PROFILE.name} Lv.{BOT_PROFILE.level}
                </div>
              </div>
            </div>
            <h2 className={styles.title}>
              找到對手：{BOT_PROFILE.name} Lv.{BOT_PROFILE.level}
            </h2>
            <p className={styles.sub}>題目來自你們兩人的快忘清單，即將開始…</p>
          </>
        )}
        <button type="button" className={styles.ghost} onClick={cancel}>
          取消配對
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden="true">
          ⚔️
        </div>
        <h2 className={styles.title}>互考彼此的快忘字</h2>
        <p className={styles.sub}>5 題、每題 10 秒，答得越快分數越高。題目優先從雙方的快忘清單抽。</p>
      </section>

      <button type="button" className={styles.matchBtn} onClick={quickMatch}>
        <span>⚡ 快速配對</span>
        <span className={styles.btnNote}>跟程度相近的對手打一場</span>
      </button>

      <div className={styles.roomRow}>
        <button
          type="button"
          className={styles.roomBtn}
          disabled={!realtimeAvailable}
          onClick={() => enterRoom(randomRoomCode(), true)}
        >
          🏠 建立房間
        </button>
        <button
          type="button"
          className={styles.roomBtn}
          disabled={!realtimeAvailable}
          onClick={() => setJoinOpen((v) => !v)}
        >
          🔑 輸入房號加入
        </button>
      </div>
      {!realtimeAvailable && <p className={styles.soon}>尚未設定連線</p>}
      {realtimeAvailable && joinOpen && (
        <form
          className={styles.joinRow}
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidRoomCode(codeDraft)) enterRoom(codeDraft, false);
          }}
        >
          <input
            className={styles.codeInput}
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="4 位數房號"
            aria-label="房號"
            autoFocus
          />
          <button type="submit" className={styles.joinBtn} disabled={!isValidRoomCode(codeDraft)}>
            加入
          </button>
        </form>
      )}

      <button type="button" className={styles.renameBtn} onClick={onEditName}>
        目前暱稱：{player.name}（修改）
      </button>
    </main>
  );
}
