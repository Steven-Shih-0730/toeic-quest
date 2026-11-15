import { describe, expect, it } from 'vitest';
import {
  allZonesUnlocked,
  canPlayStage,
  clearStage,
  frontierZone,
  isBossAvailable,
  isZoneCleared,
  isZoneUnlocked,
  nextNormalStage,
  stageId,
  unlockNextZone,
  unlockedZones,
} from '../src/lib/stages';

describe('關卡推進與區域開放', () => {
  it('關卡編號：第 N 區第 M 關 = (N-1)*10 + M', () => {
    expect(stageId(1, 1)).toBe(1);
    expect(stageId(1, 10)).toBe(10);
    expect(stageId(3, 4)).toBe(24);
  });

  it('初始完成 1~6 關 → 下一關是第 7 關', () => {
    expect(nextNormalStage([1, 2, 3, 4, 5, 6], 1)).toBe(7);
  });

  it('clearStage 不重複、會排序', () => {
    expect(clearStage([1, 3], 2)).toEqual([1, 2, 3]);
    expect(clearStage([1, 2], 2)).toEqual([1, 2]);
  });

  it('地圖節點：已完成可重玩、下一關可玩、後面的上鎖', () => {
    const cleared = [1, 2, 3, 4, 5, 6];
    expect(canPlayStage(cleared, 1, 3)).toBe(true); // 重玩
    expect(canPlayStage(cleared, 1, 7)).toBe(true); // 下一關
    expect(canPlayStage(cleared, 1, 8)).toBe(false);
    expect(canPlayStage(cleared, 1, 10)).toBe(false); // Boss 不算一般關卡
    expect(canPlayStage(cleared, 2, 1)).toBe(false); // 第 2 區還沒開放
  });

  it('Boss 在已開放區域隨時可以挑戰，不用先完成 1~9 關', () => {
    expect(isBossAvailable([], 1)).toBe(true);
    expect(isBossAvailable([], 2)).toBe(false);
  });

  it('打倒某區 Boss → 該區通關、下一區開放', () => {
    expect(unlockedZones([1, 2])).toEqual([1]);
    const cleared = clearStage([1, 2], stageId(1, 10));
    expect(isZoneCleared(cleared, 1)).toBe(true);
    expect(isZoneUnlocked(cleared, 2)).toBe(true);
    expect(unlockedZones(cleared)).toEqual([1, 2]);
    expect(canPlayStage(cleared, 2, 1)).toBe(true);
    expect(frontierZone(cleared)).toBe(2);
  });

  it('展示用「解鎖下一區」一次開一區，5 區都開放後不再變動', () => {
    let c: number[] = [];
    for (let i = 0; i < 4; i += 1) c = unlockNextZone(c);
    expect(unlockedZones(c)).toEqual([1, 2, 3, 4, 5]);
    expect(allZonesUnlocked(c)).toBe(true);
    expect(unlockNextZone(c)).toBe(c);
  });
});
