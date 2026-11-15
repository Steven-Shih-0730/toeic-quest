import styles from './Home.module.css';
import type { Screen } from '../App';
import AdventureMap from '../components/AdventureMap';
import ForgetList from '../components/ForgetList';
import InstallGuide from '../components/InstallGuide';
import ProgressBar from '../components/ProgressBar';
import { formatShortDate } from '../lib/clock';
import { XP_PER_LEVEL } from '../lib/scoring';
import { dueWords, masteredCount } from '../lib/srs';
import type { GameState } from '../types';

interface Props {
  game: GameState;
  todayIso: string;
  /** 齒輪面板操作後的提示文字，空字串表示不顯示 */
  toast: string;
  toastKey: number;
  onStartDaily: () => void;
  onStartStage: (zone: number, stage: number) => void;
  onStartBoss: (zone: number) => void;
  onNavigate: (screen: Screen) => void;
}

function dailyNote(game: GameState, todayIso: string): string {
  if (game.player.lastActiveDate === todayIso) return '今天已完成，可再練一次';
  const due = dueWords(game.progress, todayIso).length;
  if (due > 0) return `${due} 個快忘字到期`;
  return '5 題・約 3 分鐘';
}

export default function Home({ game, todayIso, toast, toastKey, onStartDaily, onStartStage, onStartBoss, onNavigate }: Props) {
  const { player, progress } = game;

  return (
    <main className={styles.page}>
      {toast && (
        <div key={toastKey} className={styles.toast} role="status">
          {toast}
        </div>
      )}
      <InstallGuide />

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

      <div className={styles.actions}>
        <button type="button" className={styles.dailyBtn} onClick={onStartDaily}>
          <span>⚔️ 今日關卡</span>
          <span className={styles.btnNote}>{dailyNote(game, todayIso)}</span>
        </button>
        <button type="button" className={styles.battleBtn} onClick={() => onNavigate('battleLobby')}>
          <span>👥 雙人對戰</span>
          <span className={styles.btnNote}>互考彼此的快忘字</span>
        </button>
      </div>

      <AdventureMap player={player} onStartStage={onStartStage} onStartBoss={onStartBoss} />

      <ForgetList progress={progress} todayIso={todayIso} />
    </main>
  );
}
