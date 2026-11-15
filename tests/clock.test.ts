import { afterEach, describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatShortDate,
  getOffsetDays,
  parseISODate,
  setOffsetDays,
  toISODate,
  today,
} from '../src/lib/clock';

afterEach(() => setOffsetDays(0));

describe('clock', () => {
  it('toISODate 用本地時區輸出 YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 10, 15, 23, 59))).toBe('2026-11-15');
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parseISODate 與 toISODate 互為反函式', () => {
    expect(toISODate(parseISODate('2026-02-28'))).toBe('2026-02-28');
  });

  it('addDays 可以跨月、跨年，也可以往回推', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-15', -3)).toBe('2026-11-12');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('daysBetween 回傳相差天數，較晚為正數', () => {
    expect(daysBetween('2026-11-15', '2026-11-18')).toBe(3);
    expect(daysBetween('2026-11-15', '2026-11-12')).toBe(-3);
    expect(daysBetween('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('today() = 真實日期 + 模擬偏移天數', () => {
    const now = new Date(2026, 10, 15, 9, 0);
    expect(today(now)).toBe('2026-11-15');
    setOffsetDays(1);
    expect(getOffsetDays()).toBe(1);
    expect(today(now)).toBe('2026-11-16');
    setOffsetDays(17);
    expect(today(now)).toBe('2026-12-02');
  });

  it('formatShortDate 顯示月/日與星期', () => {
    expect(formatShortDate('2026-11-15')).toBe('11/15（日）');
    expect(formatShortDate('2026-11-16')).toBe('11/16（一）');
  });
});
