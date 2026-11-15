// 隨機工具。rng 可以傳入固定序列，方便測試。不得依賴 React。

export type Rng = () => number;

/** Fisher–Yates 洗牌，回傳新陣列 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 隨機取 n 個（不重複） */
export function sample<T>(items: readonly T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(items, rng).slice(0, n);
}
