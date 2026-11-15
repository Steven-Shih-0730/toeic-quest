import styles from './Result.module.css';
import ProgressBar from '../components/ProgressBar';
import type { QuestSummary } from '../lib/quest';
import { XP_PER_LEVEL } from '../lib/scoring';
import type { Player } from '../types';

interface Props {
  summary: QuestSummary;
  player: Player;
  streakUp: boolean;
  onHome: () => void;
  onBattle: () => void;
}

/** 寢室排行榜：本版為假資料（CLAUDE.md 第 10 節），你的分數 = 假基準 + 這關經驗值 */
const MY_WEEK_BASE = 1260;
const FRIENDS = [
  { name: '阿明', icon: '😎', xp: 1300 },
  { name: '小華', icon: '🤓', xp: 1105 },
];

export default function Result({ summary, player, streakUp, onHome, onBattle }: Props) {
  const board = [{ name: `你（${player.name}）`, icon: '🧑', xp: MY_WEEK_BASE + summary.xp, me: true }, ...FRIENDS.map((f) => ({ ...f, me: false }))].sort(
    (a, b) => b.xp - a.xp,
  );

  return (
    <main className={styles.page}>
      <h2 className={styles.title}>🎉 關卡完成！</h2>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.label}>答對題數</div>
          <div className={`${styles.value} ${styles.green}`}>
            {summary.correct} / {summary.total}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.label}>獲得經驗值</div>
          <div className={`${styles.value} ${styles.gold}`}>+{summary.xp}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.label}>連續天數</div>
          <div className={styles.value}>
            🔥 <span className={streakUp ? styles.bump : styles.streakNum}>{player.streakDays}</span>
          </div>
          <div className={styles.streakNote}>{streakUp ? '連續天數 +1！' : '今天已計入'}</div>
        </div>
      </div>

      <div className={styles.levelRow}>
        <span className={styles.levelTag}>Lv.{player.level}</span>
        <div className={styles.levelBar}>
          <ProgressBar value={player.xp / XP_PER_LEVEL} height={12} label="經驗值" />
        </div>
        <span>
          {player.xp} / {XP_PER_LEVEL}
        </span>
      </div>

      <section className={`${styles.box} ${styles.revenge}`}>
        <h3 className={styles.boxTitle}>💥 複仇成功</h3>
        {summary.revenge.map((r) => (
          <div key={r.word} className={styles.row}>
            <span>
              <b>{r.word}</b> <span className={styles.zh}>{r.zh}</span>
            </span>
            <span className={styles.rowNote}>之前答錯 → 這次答對</span>
          </div>
        ))}
        {summary.revenge.length === 0 && <div className={styles.empty}>這次沒有成功複仇的字，到期的字下次還會再出現。</div>}
      </section>

      <section className={`${styles.box} ${styles.pinned}`}>
        <h3 className={styles.boxTitle}>📌 加入快忘清單</h3>
        {summary.pinned.map((r) => (
          <div key={r.word} className={styles.row}>
            <span>
              <b>{r.word}</b> <span className={styles.zh}>{r.zh}</span>
            </span>
            <span className={styles.rowNote}>下次複習：明天</span>
          </div>
        ))}
        {summary.pinned.length === 0 && <div className={styles.empty}>全部一次答對，這次沒有新增的字！</div>}
      </section>

      <section className={styles.box}>
        <h3 className={styles.boxTitle}>🏠 寢室排行榜（本週經驗值）</h3>
        {board.map((p, i) => (
          <div key={p.name} className={`${styles.rank} ${p.me ? styles.me : ''}`}>
            <span className={styles.medal}>{['🥇', '🥈', '🥉'][i]}</span>
            <span className={styles.rankIcon}>{p.icon}</span>
            <span className={styles.rankName}>{p.name}</span>
            <span className={styles.rankXp}>{p.xp} XP</span>
          </div>
        ))}
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.homeBtn} onClick={onHome}>
          返回首頁
        </button>
        <button type="button" className={styles.battleBtn} onClick={onBattle}>
          👥 去對戰
        </button>
      </div>
    </main>
  );
}
