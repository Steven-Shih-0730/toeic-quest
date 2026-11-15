import styles from './Home.module.css';
import type { Screen } from '../App';
import AdventureMap from '../components/AdventureMap';
import ForgetList from '../components/ForgetList';
import ProgressBar from '../components/ProgressBar';
import { formatShortDate } from '../lib/clock';
import { dueWords, masteredCount } from '../lib/srs';
import type { GameState } from '../types';

const XP_PER_LEVEL = 300; // CLAUDE.md 6.4；階段 2 會移到 lib/scoring.ts

interface Props {
  game: GameState;
  todayIso: string;
  onNavigate: (screen: Screen) => void;
}

function dailyNote(game: GameState, todayIso: string): string {
  if (game.player.lastActiveDate === todayIso) return '今天已完成，可再練一次';
  const due = dueWords(game.progress, todayIso).length;
  if (due > 0) return `${due} 個快忘字到期`;
  return '5 題・約 3 分鐘';
}

export default function Home({ game, todayIso, onNavigate }: Props) {
  const { player, progress } = game;

  return (
    <main className={styles.page}>
      <section className={styles.playerCard}>
        <div className={styles.playerRow}>
          <div className={styles.avatar} aria-hidden="true">🧑</div>
          <div className={styles.playerInfo}>
            <div className={styles.name}>{player.name}</div>
            <div className={styles.date}>{formatShortDate(todayIso)}</div>
          </div>
          <div className={styles.level}>Lv.{player.level}</div>
        </div>
        <div className={styles.xpBlock}>
          <ProgressBar value={player.xp / XP_PER_LEVEL} label="經驗值" />
          <div className={styles.xpText}>
            經驗值 {player.xp} / {XP_PER_LEVEL}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>連續天數</div>
            <div className={styles.statValue}>🔥 {player.streakDays} 天</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>已記住</div>
            <div className={styles.statValue}>📚 {masteredCount(progress)} 字</div>
          </div>
        </div>
      </section>

      <AdventureMap
        player={player}
        todayIso={todayIso}
        onStartDaily={() => onNavigate('quest')}
        onStartBoss={() => onNavigate('boss')}
      />

      <div className={styles.actions}>
        <button type="button" className={styles.dailyBtn} onClick={() => onNavigate('quest')}>
          <span>⚔️ 今日關卡</span>
          <span className={styles.btnNote}>{dailyNote(game, todayIso)}</span>
        </button>
        <button type="button" className={styles.battleBtn} onClick={() => onNavigate('battleLobby')}>
          <span>👥 雙人對戰</span>
          <span className={styles.btnNote}>互考彼此的快忘字</span>
        </button>
      </div>

      <ForgetList progress={progress} todayIso={todayIso} />
    </main>
  );
}
