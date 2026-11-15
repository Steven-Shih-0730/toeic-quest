// PWA 安裝引導（CLAUDE.md 第 7 節）。不得依賴 React。

export type InstallPlatform = 'ios' | 'android' | 'other';

/** 依 userAgent 判斷平台；iPadOS 會偽裝成 Mac，用觸控點數補判斷 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

/** 讀網址的 ?install=android|ios（QR code 帶的參數） */
export function parseInstallHint(search: string): Exclude<InstallPlatform, 'other'> | null {
  const v = new URLSearchParams(search).get('install');
  return v === 'android' || v === 'ios' ? v : null;
}

/** 要不要顯示安裝卡片、顯示哪個平台 */
export function decideInstallGuide(opts: {
  standalone: boolean;
  hint: Exclude<InstallPlatform, 'other'> | null;
  platform: InstallPlatform;
  dismissed: boolean;
}): Exclude<InstallPlatform, 'other'> | null {
  if (opts.standalone) return null;
  if (opts.hint) return opts.hint;
  if (opts.dismissed || opts.platform === 'other') return null;
  return opts.platform;
}

// ───────── Android 的 beforeinstallprompt ─────────

/** Chrome 的安裝事件（標準型別還沒有收錄） */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** 要在 React 掛載前呼叫，才不會錯過瀏覽器很早就送出的事件 */
export function captureInstallPrompt(target: Window = window): void {
  target.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // 不要讓瀏覽器自己跳小橫幅，改由我們的按鈕觸發
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  target.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

export function wasInstalled(): boolean {
  return installed;
}

export function onInstallStateChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 跳出系統安裝視窗；回傳使用者是否接受 */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  deferred = null; // 每個事件只能 prompt 一次
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

/** 是否已經從主畫面以 App 模式打開 */
export function isStandalone(target: Window = window): boolean {
  try {
    if (target.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* 忽略 */
  }
  return (target.navigator as Navigator & { standalone?: boolean }).standalone === true;
}
