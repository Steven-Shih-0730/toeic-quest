import { describe, expect, it } from 'vitest';

// CLAUDE.md 第 9 節：lib/ 裡的邏輯不得依賴 React
const libSources = import.meta.glob('../src/lib/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

// CLAUDE.md 8.0：Battle 畫面只依賴 Opponent 介面，不能寫死機器人
const battleScreen = import.meta.glob('../src/screens/Battle.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

describe('架構規範', () => {
  it('找得到 lib 檔案', () => {
    expect(Object.keys(libSources).length).toBeGreaterThanOrEqual(8);
  });

  it.each(Object.entries(libSources))('%s 沒有 import React', (_file, source) => {
    expect(source).not.toMatch(/from\s+['"]react(-dom)?(\/[^'"]*)?['"]/);
  });

  it('Battle.tsx 沒有引用機器人（bot.ts、BotOpponent、BOT_）', () => {
    const source = Object.values(battleScreen)[0];
    expect(source).toBeTruthy();
    expect(source).not.toMatch(/battle\/bot|BotOpponent|BOT_|機器人|阿明/);
  });
});
