import styles from './Footer.module.css';

/** 作者頁尾（首頁與三個結果頁共用，CLAUDE.md 第 7 節）。 */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      Made by 施定宇 (Steven Shih)・
      <a href="https://github.com/Steven-Shih-0730/toeic-quest" target="_blank" rel="noopener noreferrer">
        GitHub
      </a>
    </footer>
  );
}
