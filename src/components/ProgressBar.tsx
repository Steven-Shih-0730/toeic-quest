import styles from './ProgressBar.module.css';

interface Props {
  /** 0~1 */
  value: number;
  color?: string;
  height?: number;
  label?: string;
}

export default function ProgressBar({ value, color = 'var(--gold)', height = 14, label }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={styles.track}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
