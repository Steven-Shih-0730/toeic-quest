// 對戰積分與排行榜（CLAUDE.md 6.7）。不得依賴 React。

export const RATING_START = 420;
export const LEADERBOARD_SIZE = 10;

/** 勝 +30、平手 +10、落敗 −10 */
export function ratingDelta(myScore: number, oppScore: number): number {
  if (myScore > oppScore) return 30;
  if (myScore === oppScore) return 10;
  return -10;
}

/** 套用積分變化，最低 0 */
export function applyRating(rating: number | undefined, delta: number): number {
  return Math.max(0, (rating ?? RATING_START) + delta);
}

export interface RankRow {
  rank: number;
  name: string;
  avatar: string;
  rating: number;
  me: boolean;
}

/**
 * 捏造玩家加上自己，依積分排序（同分時自己排前面）。
 * 回傳前 10 名，以及自己的名次（不在前 10 名時給榜單下方顯示）。
 */
export function buildLeaderboard(
  others: { name: string; avatar: string; rating: number }[],
  me: { name: string; avatar: string; rating: number },
): { top: RankRow[]; mine: RankRow } {
  const rows = [
    { ...me, me: true },
    ...others.map((o) => ({ ...o, me: false })),
  ].sort((a, b) => b.rating - a.rating || Number(b.me) - Number(a.me));
  const ranked: RankRow[] = rows.map((r, i) => ({ rank: i + 1, ...r }));
  return { top: ranked.slice(0, LEADERBOARD_SIZE), mine: ranked.find((r) => r.me)! };
}
