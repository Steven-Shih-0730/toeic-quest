import styles from './DemoPanel.module.css';

interface Props {
  dateText: string;
  onClose: () => void;
}

// 展示用控制面板。「模擬隔天」「重設 demo」「解鎖本區 Boss」在階段 2 接上功能。
export default function DemoPanel({ dateText, onClose }: Props) {
  return (
    <div className={styles.panel} role="dialog" aria-label="展示用控制面板">
      <div className={styles.heading}>展示用控制面板</div>
      <div className={styles.date}>Demo 日期：{dateText}</div>
      <button type="button" className={styles.primary}>⏭ 模擬隔天</button>
      <button type="button" className={styles.danger}>🔄 重設 demo</button>
      <button type="button" className={styles.secondary}>🔓 解鎖本區 Boss</button>
      <button type="button" className={styles.close} onClick={onClose}>關閉</button>
      <div className={styles.note}>（前三個按鈕的功能於階段 2 接上）</div>
    </div>
  );
}
