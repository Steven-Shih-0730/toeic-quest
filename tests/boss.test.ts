import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { BOSS_QUESTION_COUNT, buildBossQuestions, bossWon, isBossOver, nextBoss, pickBoss, startBoss } from '../src/lib/boss';
import type { BossSession } from '../src/lib/boss';

const qs = buildBossQuestions(QUESTIONS, 1, () => 0.42);
const right = (s: BossSession) => pickBoss(s, s.questions[s.idx].answer);
const wrong = (s: BossSession) => pickBoss(s, (s.questions[s.idx].answer + 1) % 4);

/** 依序作答，回傳最後的 session */
function play(seq: Array<'R' | 'W'>): BossSession {
  let s = startBoss(qs);
  seq.forEach((step, i) => {
    s = (step === 'R' ? right(s) : wrong(s)).session;
    if (i < seq.length - 1) s = nextBoss(s);
  });
  return s;
}

describe('Boss 關（6.5）', () => {
  it('從 6 題陷阱題抽 5 題、不重複、都是 professor', () => {
    expect(qs).toHaveLength(BOSS_QUESTION_COUNT);
    expect(new Set(qs.map((q) => q.id)).size).toBe(5);
    expect(qs.every((q) => q.tag === 'professor')).toBe(true);
  });

  it('答對扣教授一格血，答錯扣自己一條命；每題都回傳作答紀錄', () => {
    const s0 = startBoss(qs);
    const r1 = right(s0);
    expect(r1.session).toMatchObject({ bossHp: 2, lives: 3 });
    expect(r1.record).toEqual({ word: qs[0].word, correct: true });
    const r2 = wrong(nextBoss(r1.session));
    expect(r2.session).toMatchObject({ bossHp: 2, lives: 2 });
    expect(r2.record).toEqual({ word: qs[1].word, correct: false });
  });

  it('沒有提示：選過一次就定案，再點不會改變', () => {
    const s = wrong(startBoss(qs)).session;
    expect(right(s).session).toBe(s);
  });

  it('先答對 3 題就獲勝，立即結束', () => {
    const s = play(['R', 'W', 'R', 'R']);
    expect(isBossOver(s)).toBe(true);
    expect(bossWon(s)).toBe(true);
    expect(nextBoss(s)).toBe(s);
  });

  it('先答錯 3 題就失敗，立即結束', () => {
    const s = play(['W', 'R', 'W', 'W']);
    expect(isBossOver(s)).toBe(true);
    expect(bossWon(s)).toBe(false);
    expect(s.bossHp).toBe(2);
  });

  it('5 題內一定分出勝負', () => {
    const s = play(['R', 'W', 'R', 'W', 'R']);
    expect(isBossOver(s)).toBe(true);
    expect(bossWon(s)).toBe(true);
  });
});
