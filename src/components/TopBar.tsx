import styles from './TopBar.module.css';

interface Props {
  title: string;
  showBack: boolean;
  onBack: () => void;
  onToggleSettings: () => void;
}

export default function TopBar({ title, showBack, onBack, onToggleSettings }: Props) {
  return (
    <header className={styles.bar}>
      {showBack && (
        <button type="button" className={styles.back} onClick={onBack}>
          ← 首頁
        </button>
      )}
      <h1 className={styles.title}>{title}</h1>
      <button type="button" className={styles.gear} onClick={onToggleSettings} aria-label="展示用控制面板">
        ⚙️
      </button>
    </header>
  );
}
