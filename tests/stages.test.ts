import { describe, expect, it } from 'vitest';
import { clearStage, isBossUnlocked, isZoneCleared, nextNormalStage, stageId, unlockBoss } from '../src/lib/stages';

describe('關卡推進', () => {
  it('關卡編號：第 N 區第 M 關 = (N-1)*10 + M', () => {
    expect(stageId(1, 1)).toBe(1);
    expect(stageId(1, 10)).toBe(10);
    expect(stageId(3, 4)).toBe(24);
  });

  it('初始完成 1~6 關 → 下一關是第 7 關，Boss 未解鎖', () => {
    const cleared = [1, 2, 3, 4, 5, 6];
    expect(nextNormalStage(cleared, 1)).toBe(7);
    expect(isBossUnlocked(cleared, 1)).toBe(false);
  });

  it('clearStage 不重複、會排序', () => {
    expect(clearStage([1, 3], 2)).toEqual([1, 2, 3]);
    expect(clearStage([1, 2], 2)).toEqual([1, 2]);
  });

  it('「解鎖本區 Boss」把 1~9 關設為完成，Boss 解鎖但尚未通關', () => {
    const cleared = unlockBoss([1, 2, 3, 4, 5, 6], 1);
    expect(cleared).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(nextNormalStage(cleared, 1)).toBeUndefined();
    expect(isBossUnlocked(cleared, 1)).toBe(true);
    expect(isZoneCleared(cleared, 1)).toBe(false);
    expect(isZoneCleared(clearStage(cleared, 10), 1)).toBe(true);
  });
});
