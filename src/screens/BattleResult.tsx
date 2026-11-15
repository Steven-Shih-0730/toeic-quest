import styles from './BattleResult.module.css';
import type { BattleOutcome } from './Battle';
import type { PlayerInfo } from '../lib/battle/types';

interface Props {
  me: PlayerInfo;
  outcome: BattleOutcome;
  reward: number;
  onHome: () => void;
  onRematch: () => void;
}

export default function BattleResult({ me, outcome, reward, onHome, onRematch }: Props) {
  const { myScore, oppScore, opponent, myWords } = outcome;
  const win = myScore > oppScore;
  const tie = myScore === oppScore;
  const title = win ? '🏆 你贏了！' : tie ? '🤝 平手！' : '😵 惜敗，再接再厲';

  return (
    <main className={styles.page}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.scores}>
        <div className={`${styles.card} ${styles.me}`}>
          <div className={styles.avatar}>{me.avatar}</div>
          <div className={styles.name}>{me.name}</div>
          <div className={`${styles.score} ${styles.myScore}`}>{myScore}</div>
        </div>
        <div className={`${styles.card} ${styles.opp}`}>
          <div className={styles.avatar}>{opponent.avatar}</div>
          <div className={styles.name}>{opponent.name}</div>
          <div className={`${styles.score} ${styles.oppScore}`}>{oppScore}</div>
        </div>
      </div>

      <div className={styles.reward}>
        {win ? '勝利獎勵' : '參戰獎勵'} +{reward} 經驗值
      </div>

      <section className={styles.box}>
        <h3 className={styles.boxTitle}>📌 本場出現的你的快忘字</h3>
        {myWords.map((w) => (
          <div key={w.word} className={styles.row}>
            <span>
              <b>{w.word}</b> <span className={styles.zh}>{w.zh}</span>
            </span>
            <span className={w.ok ? styles.ok : styles.bad}>{w.ok ? '✓ 這次答對' : '✗ 還要再練'}</span>
          </div>
        ))}
        {myWords.length === 0 && (
          <div className={styles.empty}>你的快忘清單是空的，這場考的都是{opponent.name}的弱點字。</div>
        )}
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.homeBtn} onClick={onHome}>
          返回首頁
        </button>
        <button type="button" className={styles.againBtn} onClick={onRematch}>
          再戰一場
        </button>
      </div>
    </main>
  );
}
