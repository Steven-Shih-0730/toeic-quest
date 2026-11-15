// localStorage 讀寫。所有存取都包在 try/catch：無痕模式、停用儲存或額度滿了，程式照常運作（只是不會存檔）。
// 不得依賴 React。

import type { GameState } from '../types';

export const STORAGE_KEY = 'toeicQuest.v1';

export interface SaveData {
  version: 1;
  /** 「模擬隔天」累計的偏移天數 */
  offsetDays: number;
  game: GameState;
}

/** 只用到這三個方法，方便測試時換成假的 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // 有些瀏覽器光是讀取 localStorage 就會丟錯
  }
}

function isSaveData(x: unknown): x is SaveData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Partial<SaveData>;
  return (
    d.version === 1 &&
    typeof d.offsetDays === 'number' &&
    !!d.game &&
    typeof d.game.player === 'object' &&
    d.game.player !== null &&
    Array.isArray(d.game.progress) &&
    Array.isArray(d.game.player.clearedStages)
  );
}

/** 讀檔；沒有存檔、格式不對或無法存取都回傳 null */
export function loadSave(store: KeyValueStore | null = defaultStore()): SaveData | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!isSaveData(data)) return null;
    // 舊存檔可能沒有 badges
    if (!Array.isArray(data.game.player.badges)) data.game.player.badges = [];
    return data;
  } catch {
    return null;
  }
}

/** 存檔；成功回傳 true */
export function writeSave(data: SaveData, store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store: KeyValueStore | null = defaultStore()): void {
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* 忽略 */
  }
}
