import styles from './ComboBanner.module.css';

interface Props {
  text: string;
  /** 換 key 會重播動畫 */
  playKey: number;
}

/** 從左滑入、停留、再滑出的 Combo 橫幅 */
export default function ComboBanner({ text, playKey }: Props) {
  return (
    <div key={playKey} className={styles.banner} role="status">
      {text}
    </div>
  );
}
