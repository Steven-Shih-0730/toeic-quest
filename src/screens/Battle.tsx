// 對戰畫面。只依賴 Opponent 介面（CLAUDE.md 8.0）：收事件、顯示、回報自己的作答。
// 不知道對手在本機還是連線，也不自己出題或算分。

import { useEffect, useRef, useState } from 'react';
import styles from './Battle.module.css';
import ComboBanner from '../components/ComboBanner';
import OptionButton from '../components/OptionButton';
import type { OptionState } from '../components/OptionButton';
import TimerRing from '../components/TimerRing';
import { QUESTIONS } from '../data/questions';
import { QUESTION_MS } from '../lib/battle/engine';
import type { BattleEvent, Opponent, PlayerInfo } from '../lib/battle/types';
import { COMBO_THRESHOLD } from '../lib/scoring';
import type { Question } from '../types';

export interface BattleWordLog {
  word: string;
  zh: string;
  ok: boolean;
}

export interface BattleOutcome {
  myScore: number;
  oppScore: number;
  opponent: PlayerInfo;
  /** 本場出現的「我的快忘字」 */
  myWords: BattleWordLog[];
}

interface Props {
  me: PlayerInfo;
  /** 我的快忘清單（到期的在前），給房主選題用 */
  myWords: string[];
  createOpponent: () => Opponent;
  /** 每題公布時回報我的作答結果（寫入間隔重複） */
  onRecord: (word: string, correct: boolean) => void;
  onFinish: (outcome: BattleOutcome) => void;
  onLeave: () => void;
}

const BYID = new Map(QUESTIONS.map((q) => [q.id, q]));
const SCORE_BAR_MAX = 625; // 5 題 × 125 分（10 秒 × 10 × 1.25）

interface View {
  questionIds: string[];
  sourceOf: Record<string, string>;
  index: number;
  startAt: number;
  phase: 'waiting' | 'question' | 'reveal';
  myChoice: number | null;
  oppAnswered: boolean;
  scores: Record<string, number>;
  gains: Record<string, number>;
  left: boolean;
}

const INITIAL: View = {
  questionIds: [],
  sourceOf: {},
  index: 0,
  startAt: 0,
  phase: 'waiting',
  myChoice: null,
  oppAnswered: false,
  scores: {},
  gains: {},
  left: false,
};

export default function Battle({ me, myWords, createOpponent, onRecord, onFinish, onLeave }: Props) {
  const [view, setView] = useState<View>(INITIAL);
  const [now, setNow] = useState(() => Date.now());
  const [banner, setBanner] = useState<{ combo: number; key: number } | null>(null);
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null);

  // 事件處理需要最新狀態，用 ref 保存
  const viewRef = useRef(view);
  viewRef.current = view;
  const oppRef = useRef<Opponent | null>(null);
  const comboRef = useRef(0);
  const logRef = useRef<BattleWordLog[]>([]);
  const cbRef = useRef({ onRecord, onFinish });
  cbRef.current = { onRecord, onFinish };

  useEffect(() => {
    const opp = createOpponent();
    oppRef.current = opp;
    setOpponent(opp.profile);
    comboRef.current = 0;
    logRef.current = [];

    const handle = (e: BattleEvent) => {
      const v = viewRef.current;
      switch (e.type) {
        case 'start':
          setView({ ...INITIAL, questionIds: e.questionIds, sourceOf: e.sourceOf });
          break;
        case 'question':
          setBanner(null);
          setView((prev) => ({ ...prev, index: e.index, startAt: e.startAt, phase: 'question', myChoice: null, oppAnswered: false, gains: {} }));
          break;
        case 'opponentAnswered':
          setView((prev) => (prev.index === e.index ? { ...prev, oppAnswered: true } : prev));
          break;
        case 'reveal': {
          const q = BYID.get(v.questionIds[e.index]);
          const gains: Record<string, number> = {};
          for (const id of Object.keys(e.scores)) gains[id] = e.scores[id] - (v.scores[id] ?? 0);
          const correct = !!q && v.myChoice === q.answer && (gains[me.id] ?? 0) > 0;
          comboRef.current = correct ? comboRef.current + 1 : 0;
          if (correct && comboRef.current >= COMBO_THRESHOLD) setBanner({ combo: comboRef.current, key: Date.now() });
          if (q) {
            cbRef.current.onRecord(q.word, correct);
            if (v.sourceOf[q.id] === me.id) logRef.current.push({ word: q.word, zh: q.zh, ok: correct });
          }
          setView((prev) => ({ ...prev, phase: 'reveal', scores: e.scores, gains }));
          break;
        }
        case 'end':
          cbRef.current.onFinish({
            myScore: e.scores[me.id] ?? 0,
            oppScore: e.scores[opp.profile.id] ?? 0,
            opponent: opp.profile,
            myWords: logRef.current,
          });
          break;
        case 'opponentLeft':
          setView((prev) => ({ ...prev, left: true }));
          break;
      }
    };

    const unsubscribe = opp.subscribe(handle);
    opp.start({ ...me, dueWords: myWords });
    return () => {
      unsubscribe();
      opp.dispose();
    };
    // 只在進入畫面時建立一次對手
  }, []);

  // 倒數計時
  useEffect(() => {
    if (view.phase !== 'question') return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [view.phase, view.index]);

  const q: Question | undefined = BYID.get(view.questionIds[view.index]);
  const remaining = view.phase === 'question' ? Math.max(0, view.startAt + QUESTION_MS - now) : 0;
  const oppId = opponent?.id ?? '';

  const pick = (choice: number) => {
    const v = viewRef.current;
    if (v.phase !== 'question' || v.myChoice !== null) return;
    const ms = v.startAt + QUESTION_MS - Date.now();
    if (ms <= 0) return;
    // 先更新 ref：對手若已作答，answer() 可能同步觸發 reveal，事件處理要讀到我的選擇
    const next = { ...v, myChoice: choice };
    viewRef.current = next;
    setView(next);
    oppRef.current?.answer(v.index, choice, ms);
  };

  if (!q || !opponent) {
    return (
      <main className={styles.waiting}>
        <div className={styles.spinner} aria-hidden="true" />
        <div>準備題目中…</div>
      </main>
    );
  }

  const showAnswer = view.myChoice !== null || view.phase === 'reveal';
  const optionState = (i: number): OptionState => {
    if (!showAnswer) return 'idle';
    if (i === q.answer) return 'ok';
    if (i === view.myChoice) return 'bad';
    return 'dim';
  };

  const myGain = view.gains[me.id] ?? 0;
  const oppGain = view.gains[oppId] ?? 0;
  let meStatus = view.myChoice === null ? '作答中…' : '已作答 ✓';
  let oppStatus = view.oppAnswered ? '已作答 ✓' : '思考中…';
  if (view.phase === 'reveal') {
    meStatus = myGain > 0 ? `答對 +${myGain}` : view.myChoice === null ? '逾時 +0' : '答錯 +0';
    oppStatus = oppGain > 0 ? `答對 +${oppGain}` : '答錯 +0';
  }

  const src = view.sourceOf[q.id];
  const srcLabel = src === me.id ? '出自你的快忘清單' : src === oppId ? `出自${opponent.name}的快忘清單` : '🎲 隨機題';
  const myScore = view.scores[me.id] ?? 0;
  const oppScore = view.scores[oppId] ?? 0;
  const pct = (n: number) => `${Math.min(100, (n / SCORE_BAR_MAX) * 100)}%`;

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <div className={styles.player}>
          <div className={`${styles.avatar} ${styles.me}`}>{me.avatar}</div>
          <div className={styles.pInfo}>
            <div className={styles.pName}>{me.name}</div>
            <div className={styles.pStatus}>{meStatus}</div>
          </div>
        </div>
        <TimerRing remainingMs={remaining} totalMs={QUESTION_MS} />
        <div className={`${styles.player} ${styles.right}`}>
          <div className={styles.pInfo}>
            <div className={styles.pName}>{opponent.name}</div>
            <div className={`${styles.pStatus} ${view.oppAnswered && view.phase === 'question' ? styles.answered : ''}`}>
              {oppStatus}
            </div>
          </div>
          <div className={`${styles.avatar} ${styles.opp}`}>{opponent.avatar}</div>
        </div>
      </div>

      <div className={styles.arena}>
        <div className={styles.scoreCol}>
          <div className={`${styles.score} ${styles.myScore}`}>{myScore}</div>
          <div className={styles.track}>
            <div className={`${styles.fill} ${styles.myFill}`} style={{ height: pct(myScore) }} />
          </div>
        </div>

        <div className={styles.center}>
          <div className={styles.roundRow}>
            <span className={styles.round}>
              第 {view.index + 1} / {view.questionIds.length} 題
            </span>
            <span className={styles.src}>{srcLabel}</span>
          </div>
          <div className={styles.stem}>{q.stem.replace('____', '＿＿＿＿')}</div>
          <div className={styles.options}>
            {q.options.map((text, i) => (
              <OptionButton
                key={`${q.id}-${i}`}
                text={text}
                state={optionState(i)}
                disabled={showAnswer || view.phase !== 'question'}
                onClick={() => pick(i)}
              />
            ))}
          </div>
          <div className={styles.rule}>得分＝剩餘秒數 × 10，連續答對再 × 1.25</div>
        </div>

        <div className={styles.scoreCol}>
          <div className={`${styles.score} ${styles.oppScore}`}>{oppScore}</div>
          <div className={styles.track}>
            <div className={`${styles.fill} ${styles.oppFill}`} style={{ height: pct(oppScore) }} />
          </div>
        </div>
      </div>

      {banner && <ComboBanner playKey={banner.key} text={`🔥 連續答對 ${banner.combo} 題　得分 × 1.25`} />}

      {view.left && (
        <div className={styles.overlay} role="alertdialog" aria-label="對手已離線">
          <div className={styles.dialog}>
            <div className={styles.dialogTitle}>對手已離線</div>
            <button type="button" className={styles.dialogBtn} onClick={onLeave}>
              返回首頁
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
