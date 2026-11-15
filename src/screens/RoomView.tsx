import { useEffect, useRef, useState } from 'react';
import styles from './BattleLobby.module.css';
import type { RealtimeRoom, RoomSnapshot } from '../lib/battle/realtime';

interface Props {
  room: RealtimeRoom;
  onStart: (room: RealtimeRoom) => void;
  onLeave: () => void;
}

/** 連線房間：顯示房號、雙方狀態與「準備」按鈕；雙方都準備好就開始 */
export default function RoomView({ room, onStart, onLeave }: Props) {
  const [snap, setSnap] = useState<RoomSnapshot>(room.snapshot);
  const startedRef = useRef(false);

  useEffect(() => {
    const off = room.onChange(setSnap);
    if (room.snapshot.status === 'connecting') void room.join();
    return off;
  }, [room]);

  useEffect(() => {
    if (snap.status === 'lobby' && room.bothReady && !startedRef.current) {
      startedRef.current = true;
      onStart(room);
    }
  }, [snap, room, onStart]);

  if (snap.status === 'connecting') {
    return (
      <main className={styles.center}>
        <div className={styles.spinner} aria-hidden="true" />
        <h2 className={styles.title}>連線中…</h2>
        <button type="button" className={styles.ghost} onClick={onLeave}>
          取消
        </button>
      </main>
    );
  }

  if (snap.status === 'full' || snap.status === 'error' || snap.status === 'closed') {
    return (
      <main className={styles.center}>
        <div className={styles.bigIcon} aria-hidden="true">
          {snap.status === 'full' ? '🚪' : '⚠️'}
        </div>
        <h2 className={styles.title}>{snap.status === 'full' ? '房間已滿' : '連線失敗'}</h2>
        <p className={styles.sub}>
          {snap.status === 'full' ? `房號 ${snap.code} 已經有兩位玩家了。` : '請檢查網路後再試一次。'}
        </p>
        <button type="button" className={styles.ghost} onClick={onLeave}>
          返回大廳
        </button>
      </main>
    );
  }

  const { me, opponent, isHost, hostPresent, meReady, oppReady } = snap;
  let hint = '';
  if (!opponent) hint = isHost ? '把房號告訴朋友，等待對手加入…' : hostPresent ? '' : '等待房主…（確認房號是否正確）';
  else if (!meReady) hint = '兩人都按「準備」就開始！';
  else if (!oppReady) hint = `等待 ${opponent.name} 準備…`;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.sub}>{isHost ? '你建立的房間' : '你加入的房間'}</div>
        <div className={styles.code} aria-label={`房號 ${snap.code}`}>
          {snap.code}
        </div>
        {hint && <p className={styles.sub}>{hint}</p>}
      </section>

      <div className={styles.members}>
        <div className={`${styles.member} ${styles.memberMe}`}>
          <div className={styles.memberAvatar}>{me.avatar}</div>
          <div className={styles.memberName}>
            {me.name} Lv.{me.level}
            {isHost && <span className={styles.hostTag}>房主</span>}
          </div>
          <div className={meReady ? styles.readyOn : styles.readyOff}>{meReady ? '已準備 ✓' : '未準備'}</div>
        </div>
        <div className={`${styles.member} ${opponent ? styles.memberOpp : styles.memberEmpty}`}>
          <div className={styles.memberAvatar}>{opponent ? opponent.avatar : '❔'}</div>
          <div className={styles.memberName}>
            {opponent ? `${opponent.name} Lv.${opponent.level}` : '等待加入…'}
            {opponent && !isHost && <span className={styles.hostTag}>房主</span>}
          </div>
          {opponent && <div className={oppReady ? styles.readyOn : styles.readyOff}>{oppReady ? '已準備 ✓' : '未準備'}</div>}
        </div>
      </div>

      <button
        type="button"
        className={styles.matchBtn}
        disabled={!opponent || meReady}
        onClick={() => room.setReady()}
      >
        {meReady ? '已準備，等待對手…' : '✋ 準備'}
      </button>

      <button type="button" className={styles.ghost} onClick={onLeave}>
        離開房間
      </button>
    </main>
  );
}
