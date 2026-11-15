import { describe, expect, it } from 'vitest';

// CLAUDE.md 第 9 節：lib/ 裡的邏輯不得依賴 React
const libSources = import.meta.glob('../src/lib/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

describe('架構規範', () => {
  it('找得到 lib 檔案', () => {
    expect(Object.keys(libSources).length).toBeGreaterThanOrEqual(5);
  });

  it.each(Object.entries(libSources))('%s 沒有 import React', (_file, source) => {
    expect(source).not.toMatch(/from\s+['"]react(-dom)?(\/[^'"]*)?['"]/);
  });
});
