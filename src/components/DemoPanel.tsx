import styles from './DemoPanel.module.css';

interface Props {
  dateText: string;
  /** 5 區都已開放 */
  allUnlocked: boolean;
  onNextDay: () => void;
  onReset: () => void;
  onUnlockNextZone: () => void;
  onClose: () => void;
}

// 展示用控制面板（CLAUDE.md 第 7 節）。正式版在階段 6 用 VITE_SHOW_DEMO_PANEL 隱藏。
export default function DemoPanel({ dateText, allUnlocked, onNextDay, onReset, onUnlockNextZone, onClose }: Props) {
  return (
    <div className={styles.panel} role="dialog" aria-label="展示用控制面板">
      <div className={styles.heading}>展示用控制面板</div>
      <div className={styles.date}>Demo 日期：{dateText}</div>
      <button type="button" className={styles.primary} onClick={onNextDay}>
        ⏭ 模擬隔天
      </button>
      <button type="button" className={styles.danger} onClick={onReset}>
        🔄 重設 demo
      </button>
      <button type="button" className={styles.secondary} onClick={onUnlockNextZone} disabled={allUnlocked}>
        {allUnlocked ? '✅ 5 區都已開放' : '🔓 解鎖下一區'}
      </button>
      <button type="button" className={styles.close} onClick={onClose}>
        關閉
      </button>
    </div>
  );
}
