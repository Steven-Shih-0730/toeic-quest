import { useEffect, useState } from 'react';
import styles from './InstallGuide.module.css';
import {
  canPromptInstall,
  decideInstallGuide,
  detectPlatform,
  isStandalone,
  onInstallStateChange,
  parseInstallHint,
  promptInstall,
  wasInstalled,
} from '../lib/install';

const DISMISS_KEY = 'toeicQuest.installDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** 首頁最上方的「加到主畫面」引導卡片（CLAUDE.md 第 7 節） */
export default function InstallGuide() {
  const [target] = useState(() =>
    decideInstallGuide({
      standalone: isStandalone(),
      hint: parseInstallHint(window.location.search),
      platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
      dismissed: readDismissed(),
    }),
  );
  const [hidden, setHidden] = useState(false);
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [done, setDone] = useState(wasInstalled);

  useEffect(
    () =>
      onInstallStateChange(() => {
        setCanPrompt(canPromptInstall());
        setDone(wasInstalled());
      }),
    [],
  );

  if (!target || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
      // 拿掉 ?install=…，回到首頁時才不會又出現
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* 忽略 */
    }
    setHidden(true);
  };

  const install = async () => {
    if (await promptInstall()) setDone(true);
  };

  return (
    <section className={styles.card} aria-label="安裝到主畫面">
      <div className={styles.head}>
        <img className={styles.icon} src="/icons/pwa-192.png" alt="" width={44} height={44} />
        <div>
          <div className={styles.title}>把多益打怪裝到主畫面</div>
          <div className={styles.sub}>全螢幕更好玩，沒有網路也能闖關</div>
        </div>
      </div>

      {done ? (
        <div className={styles.done}>✅ 安裝完成！之後從主畫面的「多益打怪」打開就可以了。</div>
      ) : target === 'android' ? (
        canPrompt ? (
          <button type="button" className={styles.installBtn} onClick={install}>
            📲 安裝到主畫面
          </button>
        ) : (
          <ol className={styles.steps}>
            <li>
              點右上角的 <b>⋮</b> 選單
            </li>
            <li>
              選「<b>安裝應用程式</b>」或「<b>加到主畫面</b>」
            </li>
            <li>
              按「<b>安裝</b>」
            </li>
          </ol>
        )
      ) : (
        <ol className={styles.steps}>
          <li>
            點下方的 <b>分享</b> 按鈕
            <span className={styles.shareIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </li>
          <li>
            往下滑，選「<b>加入主畫面</b>」
          </li>
          <li>
            按右上角的「<b>新增</b>」
          </li>
        </ol>
      )}

      {!done && (
        <button type="button" className={styles.later} onClick={dismiss}>
          之後再說
        </button>
      )}
    </section>
  );
}
