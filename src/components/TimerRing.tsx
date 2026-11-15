import styles from './TimerRing.module.css';

interface Props {
  remainingMs: number;
  totalMs: number;
}

/** 倒數計時圈 */
export default function TimerRing({ remainingMs, totalMs }: Props) {
  const ratio = Math.max(0, Math.min(1, remainingMs / totalMs));
  const secs = Math.ceil(Math.max(0, remainingMs) / 1000);
  return (
    <div
      className={`${styles.ring} ${secs <= 3 && remainingMs > 0 ? styles.urgent : ''}`}
      style={{ background: `conic-gradient(var(--ring-color) ${ratio * 360}deg, var(--chip) 0deg)` }}
      role="timer"
      aria-label={`剩餘 ${secs} 秒`}
    >
      <div className={styles.inner}>{secs}</div>
    </div>
  );
}
