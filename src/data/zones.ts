// 冒險地圖的 5 個區域（CLAUDE.md 第 5 節）。本版只有第 1 區有題庫。

export interface Zone {
  no: number;
  name: string;
  badge: string;
  available: boolean;
}

export const ZONES: Zone[] = [
  { no: 1, name: '報銷與財務', badge: '報銷與財務達人', available: true },
  { no: 2, name: '會議與行程', badge: '會議與行程達人', available: false },
  { no: 3, name: '人事與招募', badge: '人事與招募達人', available: false },
  { no: 4, name: '客戶與行銷', badge: '客戶與行銷達人', available: false },
  { no: 5, name: '出差與旅遊', badge: '出差與旅遊達人', available: false },
];

/** 本版玩家所在的區域 */
export const CURRENT_ZONE = 1;
