import type { ReactNode } from 'react';
import styles from './CoachHint.module.css';

interface Props {
  tone: 'hint' | 'ok' | 'bad';
  title: string;
  children?: ReactNode;
}

/** 費曼教練的提示／答對／答錯說明框 */
export default function CoachHint({ tone, title, children }: Props) {
  return (
    <div className={`${styles.box} ${styles[tone]}`} role="status">
      {tone !== 'ok' && (
        <div className={styles.face} aria-hidden="true">
          💡
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </div>
  );
}
