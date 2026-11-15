// 日期工具。所有「今天」都要透過 today() 取得，方便測試與「模擬隔天」。
// 日期一律用本地時區的 ISO 字串 YYYY-MM-DD 表示。

let offsetDays = 0;

/** 設定模擬偏移天數（「模擬隔天」用）。持久化在階段 2 由 storage 處理。 */
export function setOffsetDays(n: number): void {
  offsetDays = n;
}

export function getOffsetDays(): number {
  return offsetDays;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** 從 from 到 to 相差幾天（to 較晚為正數） */
export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000); // 用 round 抵銷日光節約時間的 1 小時誤差
}

/** 今天 = 真實日期 + 模擬偏移天數 */
export function today(now: Date = new Date()): string {
  return addDays(toISODate(now), offsetDays);
}

/** 例如 "11/15（日）" */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}（${'日一二三四五六'.charAt(d.getDay())}）`;
}
