// 關卡推進（CLAUDE.md 6.2、6.5）。關卡編號 1~50，第 N 區第 M 關 = (N-1)*10 + M。不得依賴 React。

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

export function isBossUnlocked(cleared: number[], zone: number): boolean {
  return nextNormalStage(cleared, zone) === undefined;
}

export function isZoneCleared(cleared: number[], zone: number): boolean {
  return cleared.includes(stageId(zone, BOSS_STAGE));
}

/** 把某個關卡加入已完成清單（不重複、排序） */
export function clearStage(cleared: number[], id: number): number[] {
  return cleared.includes(id) ? cleared : [...cleared, id].sort((a, b) => a - b);
}

/** 展示用：把該區第 1~9 關設為完成 */
export function unlockBoss(cleared: number[], zone: number): number[] {
  let next = cleared;
  for (let m = 1; m < BOSS_STAGE; m += 1) next = clearStage(next, stageId(zone, m));
  return next;
}
