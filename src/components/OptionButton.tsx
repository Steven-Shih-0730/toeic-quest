import styles from './OptionButton.module.css';

export type OptionState = 'idle' | 'ok' | 'bad' | 'dim';

interface Props {
  text: string;
  letter?: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

/** 選項按鈕：答對變綠＋彈跳、答錯變紅＋抖動、其他變淡 */
export default function OptionButton({ text, letter, state, disabled, onClick }: Props) {
  return (
    <button type="button" className={`${styles.opt} ${styles[state]}`} disabled={disabled} onClick={onClick}>
      {letter && <span className={styles.letter}>{letter}</span>}
      <span>{text}</span>
    </button>
  );
}
