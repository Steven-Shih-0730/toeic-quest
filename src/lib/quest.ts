// 今日關卡：出題（6.2）與作答流程（6.3、6.4）。不得依賴 React。

import { nextCombo, questXp } from './scoring';
import { daysSinceWrong, dueWords } from './srs';
import type { Question, Tag, WordProgress } from '../types';

export const QUEST_SIZE = 5;
export const MAX_DUE = 2;
/** 面試官題固定在第 4 題（index 3） */
export const INTERVIEWER_INDEX = 3;

const GENERAL_TAGS: Tag[] = ['email', 'notice', 'meeting'];

export interface QuestItem {
  question: Question;
  /** 到期複習題才有；daysSinceWrong 有值表示曾答錯（在快忘清單裡） */
  review?: { daysSinceWrong?: number };
}

/** 補題優先順序：新題 → 未記住且未到期（複習日近的先）→ 已記住 */
function byFillPriority(progress: WordProgress[]) {
  const map = new Map(progress.map((p) => [p.word, p]));
  const rank = (q: Question) => {
    const p = map.get(q.word);
    if (!p) return 0;
    return p.mastered ? 2 : 1;
  };
  return (a: Question, b: Question) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 1) return map.get(a.word)!.nextReview.localeCompare(map.get(b.word)!.nextReview);
    return 0; // 同級維持題庫順序
  };
}

export function buildDailyQuest(
  bank: Question[],
  progress: WordProgress[],
  todayIso: string,
  zone: number,
): QuestItem[] {
  const zoneQs = bank.filter((q) => q.zone === zone);
  const byWord = new Map(zoneQs.map((q) => [q.word, q]));
  const used = new Set<string>();

  // 1. 到期複習題，最多 2 題
  const review: QuestItem[] = [];
  for (const p of dueWords(progress, todayIso)) {
    if (review.length >= MAX_DUE) break;
    const q = byWord.get(p.word);
    if (!q) continue;
    review.push({ question: q, review: { daysSinceWrong: daysSinceWrong(p, todayIso) } });
    used.add(q.word);
  }

  const sortFill = byFillPriority(progress);
  const notUsed = (q: Question) => !used.has(q.word);

  // 2. 面試官題（不和到期題重複）
  const interviewer = zoneQs.filter((q) => q.tag === 'interviewer' && notUsed(q)).sort(sortFill)[0];
  if (interviewer) used.add(interviewer.word);

  // 3. 一般情境題補滿
  const fillCount = QUEST_SIZE - review.length - (interviewer ? 1 : 0);
  const fill = zoneQs
    .filter((q) => GENERAL_TAGS.includes(q.tag) && notUsed(q))
    .sort(sortFill)
    .slice(0, fillCount)
    .map((q): QuestItem => ({ question: q }));

  const items = [...review, ...fill];
  if (interviewer) items.splice(Math.min(INTERVIEWER_INDEX, items.length), 0, { question: interviewer });
  return items;
}

/** 「🔁 N 天前答錯」標籤文字 */
export function reviewLabel(item: QuestItem): string | undefined {
  if (!item.review) return undefined;
  const n = item.review.daysSinceWrong;
  if (n === undefined) return '🔁 複習時間到';
  if (n <= 1) return '🔁 昨天答錯';
  return `🔁 ${n} 天前答錯`;
}

// ───────── 作答流程 ─────────

export type Outcome = 'first' | 'afterHint' | 'wrong';

export interface QuestResult {
  word: string;
  zh: string;
  outcome: Outcome;
  /** 曾答錯、這次是到期複習 */
  wasForgotten: boolean;
}

export interface QuestSession {
  items: QuestItem[];
  idx: number;
  /** ask：作答中；hint：第一次答錯、顯示提示；done：本題結束 */
  phase: 'ask' | 'hint' | 'done';
  wrongPicks: number[];
  combo: number;
  xp: number;
  lastXp: number;
  results: QuestResult[];
}

export function startSession(items: QuestItem[]): QuestSession {
  return { items, idx: 0, phase: 'ask', wrongPicks: [], combo: 0, xp: 0, lastXp: 0, results: [] };
}

export interface PickEffect {
  session: QuestSession;
  /** 要寫入間隔重複的作答紀錄（沒有就不寫） */
  record?: { word: string; correct: boolean };
  /** 這次獲得的經驗值 */
  xp: number;
}

export function pickOption(s: QuestSession, choice: number): PickEffect {
  if (s.phase === 'done' || s.wrongPicks.includes(choice)) return { session: s, xp: 0 };
  const item = s.items[s.idx];
  const q = item.question;
  const correct = choice === q.answer;
  const finish = (outcome: Outcome, combo: number, xp: number): QuestSession => ({
    ...s,
    phase: 'done',
    combo,
    xp: s.xp + xp,
    lastXp: xp,
    wrongPicks: correct ? s.wrongPicks : [...s.wrongPicks, choice],
    results: [...s.results, { word: q.word, zh: q.zh, outcome, wasForgotten: item.review?.daysSinceWrong !== undefined }],
  });

  if (s.phase === 'ask') {
    if (correct) {
      const combo = nextCombo(s.combo, true);
      const xp = questXp('first', combo);
      return { session: finish('first', combo, xp), record: { word: q.word, correct: true }, xp };
    }
    // 第一次答錯：顯示提示，並立刻記為答錯
    return {
      session: { ...s, phase: 'hint', wrongPicks: [choice], combo: 0, lastXp: 0 },
      record: { word: q.word, correct: false },
      xp: 0,
    };
  }

  // phase === 'hint'：第二次作答，結果已記為答錯，不再寫入
  if (correct) {
    const xp = questXp('afterHint', 0);
    return { session: finish('afterHint', 0, xp), xp };
  }
  return { session: finish('wrong', 0, 0), xp: 0 };
}

export function isLastQuestion(s: QuestSession): boolean {
  return s.idx >= s.items.length - 1;
}

export function nextQuestion(s: QuestSession): QuestSession {
  if (s.phase !== 'done' || isLastQuestion(s)) return s;
  return { ...s, idx: s.idx + 1, phase: 'ask', wrongPicks: [], lastXp: 0 };
}

export interface QuestSummary {
  correct: number;
  total: number;
  xp: number;
  /** 複仇成功：之前答錯、這次一次答對 */
  revenge: QuestResult[];
  /** 新加入快忘清單：這次沒有一次答對 */
  pinned: QuestResult[];
}

export function summarize(s: QuestSession): QuestSummary {
  return {
    correct: s.results.filter((r) => r.outcome !== 'wrong').length,
    total: s.items.length,
    xp: s.xp,
    revenge: s.results.filter((r) => r.wasForgotten && r.outcome === 'first'),
    pinned: s.results.filter((r) => r.outcome !== 'first'),
  };
}
