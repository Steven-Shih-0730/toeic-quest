import styles from './Placeholder.module.css';

interface Props {
  note: string;
  onHome: () => void;
}

// 暫時頁面：尚未實作的畫面先顯示這裡，用來確認畫面切換正常
export default function Placeholder({ note, onHome }: Props) {
  return (
    <main className={styles.page}>
      <div className={styles.icon} aria-hidden="true">🚧</div>
      <div className={styles.title}>製作中</div>
      <div className={styles.note}>{note}</div>
      <button type="button" className={styles.btn} onClick={onHome}>
        返回首頁
      </button>
    </main>
  );
}
