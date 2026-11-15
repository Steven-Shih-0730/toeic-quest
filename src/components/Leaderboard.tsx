import styles from './Leaderboard.module.css';
import { FAKE_PLAYERS } from '../data/leaderboard';
import { RATING_START, buildLeaderboard } from '../lib/rating';
import type { Player } from '../types';

interface Props {
  player: Player;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** 對戰排行榜：單一總榜前 10 名（CLAUDE.md 6.7，捏造玩家＋自己） */
export default function Leaderboard({ player }: Props) {
  const { top, mine } = buildLeaderboard(FAKE_PLAYERS, {
    name: player.name,
    avatar: '🧑',
    rating: player.rating ?? RATING_START,
  });

  return (
    <section className={styles.card} aria-label="對戰排行榜">
      <div className={styles.head}>
        <h2 className={styles.title}>🏆 對戰排行榜</h2>
        <span className={styles.sub}>前 10 名・勝 +30／平 +10／敗 −10</span>
      </div>
      <ol className={styles.list}>
        {top.map((r) => (
          <li key={`${r.rank}-${r.name}`} className={`${styles.row} ${r.me ? styles.me : ''}`}>
            <span className={styles.rank}>{MEDALS[r.rank - 1] ?? r.rank}</span>
            <span className={styles.avatar}>{r.avatar}</span>
            <span className={styles.name}>
              {r.name}
              {r.me && <span className={styles.youTag}>你</span>}
            </span>
            <span className={styles.rating}>{r.rating}</span>
          </li>
        ))}
      </ol>
      {mine.rank > top.length && (
        <div className={`${styles.row} ${styles.me} ${styles.outside}`}>
          <span className={styles.rank}>{mine.rank}</span>
          <span className={styles.avatar}>{mine.avatar}</span>
          <span className={styles.name}>
            {mine.name}
            <span className={styles.youTag}>你</span>
          </span>
          <span className={styles.rating}>{mine.rating}</span>
        </div>
      )}
      {mine.rank > top.length && (
        <p className={styles.hint}>再拿 {top[top.length - 1].rating - mine.rating + 1} 分就能擠進前 10 名！</p>
      )}
    </section>
  );
}
