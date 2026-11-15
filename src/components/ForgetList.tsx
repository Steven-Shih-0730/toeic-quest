import styles from './ForgetList.module.css';
import { findByWord } from '../data/questions';
import { daysBetween } from '../lib/clock';
import { forgetList, isDue } from '../lib/srs';
import type { WordProgress } from '../types';

interface Props {
  progress: WordProgress[];
  todayIso: string;
}

function dueLabel(nextReview: string, todayIso: string): string {
  const d = daysBetween(todayIso, nextReview);
  if (d <= 0) return '今天';
  if (d === 1) return '明天';
  return `${d} 天後`;
}

export default function ForgetList({ progress, todayIso }: Props) {
  const rows = forgetList(progress);
  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>📌 快忘清單</h2>
      <div className={styles.sub}>答錯的字會排進來，到期那天優先出題。</div>
      {rows.map((p) => (
        <div key={p.word} className={styles.row}>
          <div className={styles.word}>
            <div className={styles.en}>{p.word}</div>
            <div className={styles.zh}>{findByWord(p.word)?.zh ?? ''}</div>
          </div>
          <span className={isDue(p, todayIso) ? styles.chipGold : styles.chip}>
            {dueLabel(p.nextReview, todayIso)}
          </span>
        </div>
      ))}
      {rows.length === 0 && <div className={styles.empty}>🎉 清單清空了！答錯的字會自動加進來。</div>}
    </section>
  );
}
