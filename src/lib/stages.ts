// 關卡推進與區域開放（CLAUDE.md 6.2、6.5）。關卡編號 1~50，第 N 區第 M 關 = (N-1)*10 + M。不得依賴 React。

export const ZONE_COUNT = 5;
export const STAGES_PER_ZONE = 10;
export const BOSS_STAGE = STAGES_PER_ZONE;

export function stageId(zone: number, stage: number): number {
  return (zone - 1) * STAGES_PER_ZONE + stage;
}

/** 該區第一個還沒完成的一般關卡（1~9）；全部完成回傳 undefined */
export function nextNormalStage(cleared: number[], zone: number): number | undefined {
  for (let m = 1; m < BOSS_STAGE; m += 1) {
    if (!cleared.includes(stageId(zone, m))) return m;
  }
  return undefined;
}

/** 該區 Boss 已通關 */
export function isZoneCleared(cleared: number[], zone: number): boolean {
  return cleared.includes(stageId(zone, BOSS_STAGE));
}

/** 第 1 區永遠開放；其他區要前一區 Boss 通關 */
export function isZoneUnlocked(cleared: number[], zone: number): boolean {
  return zone === 1 || isZoneCleared(cleared, zone - 1);
}

export function unlockedZones(cleared: number[]): number[] {
  return Array.from({ length: ZONE_COUNT }, (_, i) => i + 1).filter((z) => isZoneUnlocked(cleared, z));
}

/** 最前面（編號最大）的已開放區域 */
export function frontierZone(cleared: number[]): number {
  const zones = unlockedZones(cleared);
  return zones[zones.length - 1];
}

/** Boss 在已開放的區域隨時可以挑戰 */
export function isBossAvailable(cleared: number[], zone: number): boolean {
  return isZoneUnlocked(cleared, zone);
}

/** 地圖節點能不能點：已完成的可重玩、下一關可玩，其餘上鎖 */
export function canPlayStage(cleared: number[], zone: number, stage: number): boolean {
  if (!isZoneUnlocked(cleared, zone) || stage < 1 || stage >= BOSS_STAGE) return false;
  return cleared.includes(stageId(zone, stage)) || nextNormalStage(cleared, zone) === stage;
}

/** 把某個關卡加入已完成清單（不重複、排序） */
export function clearStage(cleared: number[], id: number): number[] {
  return cleared.includes(id) ? cleared : [...cleared, id].sort((a, b) => a - b);
}

/** 展示用「解鎖下一區」：把目前最前面的區域設為 Boss 已通關；5 區都開放時不變 */
export function unlockNextZone(cleared: number[]): number[] {
  const z = frontierZone(cleared);
  if (z >= ZONE_COUNT) return cleared;
  return clearStage(cleared, stageId(z, BOSS_STAGE));
}

export function allZonesUnlocked(cleared: number[]): boolean {
  return isZoneUnlocked(cleared, ZONE_COUNT);
}
