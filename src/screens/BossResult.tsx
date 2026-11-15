import styles from './BossResult.module.css';

interface Props {
  won: boolean;
  bossHp: number;
  zoneNo: number;
  badge: string;
  firstClear: boolean;
  bonusXp: number;
  /** 打倒後解鎖的下一區（第 5 區沒有） */
  unlocked?: { no: number; name: string };
  onHome: () => void;
  onRetry: () => void;
}

export default function BossResult({ won, bossHp, zoneNo, badge, firstClear, bonusXp, unlocked, onHome, onRetry }: Props) {
  return (
    <main className={styles.page}>
      {won ? (
        <>
          <div className={styles.medal} aria-hidden="true">
            🏅
          </div>
          <h2 className={styles.titleWin}>第 {zoneNo} 區通關！</h2>
          <p className={styles.line}>命題教授被你打倒了。「……看來你真的分得清楚。」</p>
          <div className={styles.box}>
            <div className={styles.badge}>獎勵徽章：{badge}</div>
            <div className={styles.reward}>
              {firstClear ? `首次通關獎勵 +${bonusXp} 經驗值` : '徽章已收藏（首次通關才有經驗值獎勵）'}
            </div>
          </div>
          {unlocked && (
            <div className={styles.unlock}>
              🔓 第 {unlocked.no} 區「{unlocked.name}」已解鎖！
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.prof} aria-hidden="true">
            🎓
          </div>
          <h2 className={styles.title}>差一點！</h2>
          <p className={styles.line}>命題教授還剩 {bossHp} 格血。「易混淆字，回去再想想。」</p>
          <div className={`${styles.box} ${styles.muted}`}>答錯的字已加入快忘清單，複習後再來挑戰。</div>
        </>
      )}
      <div className={styles.actions}>
        <button type="button" className={styles.homeBtn} onClick={onHome}>
          返回首頁
        </button>
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          再戰教授
        </button>
      </div>
    </main>
  );
}
