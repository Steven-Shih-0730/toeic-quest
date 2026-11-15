import { describe, expect, it } from 'vitest';
import { createSeed } from '../src/data/seed';
import { STORAGE_KEY, clearSave, loadSave, writeSave } from '../src/lib/storage';
import type { KeyValueStore, SaveData } from '../src/lib/storage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError: access denied');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError: access denied');
  },
};

const sample: SaveData = { version: 1, offsetDays: 2, game: createSeed('2026-11-15') };

describe('storage', () => {
  it('存檔後可以讀回一樣的資料', () => {
    const store = memoryStore();
    expect(writeSave(sample, store)).toBe(true);
    expect(loadSave(store)).toEqual(sample);
  });

  it('沒有存檔時回傳 null', () => {
    expect(loadSave(memoryStore())).toBeNull();
  });

  it('clearSave 會刪掉存檔', () => {
    const store = memoryStore();
    writeSave(sample, store);
    clearSave(store);
    expect(loadSave(store)).toBeNull();
  });

  it('localStorage 無法使用（每個方法都丟錯）時不會壞掉', () => {
    expect(() => loadSave(throwingStore)).not.toThrow();
    expect(loadSave(throwingStore)).toBeNull();
    expect(() => writeSave(sample, throwingStore)).not.toThrow();
    expect(writeSave(sample, throwingStore)).toBe(false);
    expect(() => clearSave(throwingStore)).not.toThrow();
  });

  it('完全沒有 localStorage（null）時不會壞掉', () => {
    expect(loadSave(null)).toBeNull();
    expect(writeSave(sample, null)).toBe(false);
    expect(() => clearSave(null)).not.toThrow();
  });

  it('在沒有 localStorage 的環境用預設參數也不會壞掉', () => {
    // Vitest 跑在 node 環境，全域沒有 localStorage
    expect(() => loadSave()).not.toThrow();
    expect(() => writeSave(sample)).not.toThrow();
  });

  it('存檔內容壞掉或格式不對時回傳 null', () => {
    const store = memoryStore();
    store.data.set(STORAGE_KEY, '{這不是 JSON');
    expect(loadSave(store)).toBeNull();

    store.data.set(STORAGE_KEY, JSON.stringify({ version: 1, offsetDays: 0, game: { player: null, progress: [] } }));
    expect(loadSave(store)).toBeNull();

    store.data.set(STORAGE_KEY, JSON.stringify({ ...sample, version: 99 }));
    expect(loadSave(store)).toBeNull();
  });

  it('舊存檔沒有 badges 時補成空陣列', () => {
    const store = memoryStore();
    const old = JSON.parse(JSON.stringify(sample));
    delete old.game.player.badges;
    store.data.set(STORAGE_KEY, JSON.stringify(old));
    expect(loadSave(store)?.game.player.badges).toEqual([]);
  });
});
