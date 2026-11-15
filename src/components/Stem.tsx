import styles from './Stem.module.css';

interface Props {
  stem: string;
  /** 有值時把答案填進空格 */
  filled?: string;
}

/** 題目句：把 ____ 顯示成底線空格 */
export default function Stem({ stem, filled }: Props) {
  const [before, after] = stem.split('____');
  return (
    <div className={styles.stem}>
      {before}
      <span className={filled ? styles.filled : styles.blank} aria-label={filled ? undefined : '空格'}>
        {filled ?? ' '}
      </span>
      {after}
    </div>
  );
}
