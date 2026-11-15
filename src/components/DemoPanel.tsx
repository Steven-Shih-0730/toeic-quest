import styles from './DemoPanel.module.css';

interface Props {
  dateText: string;
  bossUnlocked: boolean;
  onNextDay: () => void;
  onReset: () => void;
  onUnlockBoss: () => void;
  onClose: () => void;
}

// 展示用控制面板（CLAUDE.md 第 7 節）。正式版在階段 6 用 VITE_SHOW_DEMO_PANEL 隱藏。
export default function DemoPanel({ dateText, bossUnlocked, onNextDay, onReset, onUnlockBoss, onClose }: Props) {
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
      <button type="button" className={styles.secondary} onClick={onUnlockBoss} disabled={bossUnlocked}>
        {bossUnlocked ? '✅ 本區 Boss 已解鎖' : '🔓 解鎖本區 Boss'}
      </button>
      <button type="button" className={styles.close} onClick={onClose}>
        關閉
      </button>
    </div>
  );
}
