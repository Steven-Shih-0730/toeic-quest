import { useEffect, useState } from 'react';
import styles from './Quest.module.css';
import CoachHint from '../components/CoachHint';
import ComboBanner from '../components/ComboBanner';
import OptionButton from '../components/OptionButton';
import type { OptionState } from '../components/OptionButton';
import ProgressBar from '../components/ProgressBar';
import Stem from '../components/Stem';
import {
  isLastQuestion,
  nextQuestion,
  pickOption,
  reviewLabel,
  startSession,
  summarize,
} from '../lib/quest';
import type { QuestItem, QuestSummary } from '../lib/quest';
import { COMBO_THRESHOLD, XP_PER_LEVEL } from '../lib/scoring';
import type { Player, Tag } from '../types';

const TAG_LABEL: Record<Tag, string> = {
  email: '✉️ Email',
  notice: '📢 公告',
  meeting: '🗓️ 會議',
  interviewer: '💼 面試官挑戰',
  professor: '🎓 命題教授陷阱',
};

interface Props {
  items: QuestItem[];
  player: Player;
  /** 每次作答後回報：要寫入的作答紀錄與獲得的經驗值 */
  onAnswer: (record: { word: string; correct: boolean } | undefined, xp: number) => void;
  onFinish: (summary: QuestSummary) => void;
}

export default function Quest({ items, player, onAnswer, onFinish }: Props) {
  const [session, setSession] = useState(() => startSession(items));
  const [banner, setBanner] = useState<{ combo: number; key: number } | null>(null);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 1900);
    return () => window.clearTimeout(id);
  }, [banner]);

  const item = session.items[session.idx];
  const q = item.question;
  const done = session.phase === 'done';
  const outcome = done ? session.results[session.results.length - 1].outcome : undefined;
  const label = reviewLabel(item);

  const pick = (choice: number) => {
    const effect = pickOption(session, choice);
    if (effect.session === session) return;
    setSession(effect.session);
    onAnswer(effect.record, effect.xp);
    const r = effect.session;
    if (r.phase === 'done' && r.results[r.results.length - 1].outcome === 'first' && r.combo >= COMBO_THRESHOLD) {
      setBanner({ combo: r.combo, key: Date.now() });
    }
  };

  const next = () => {
    if (isLastQuestion(session)) {
      onFinish(summarize(session));
      return;
    }
    setSession(nextQuestion(session));
    setBanner(null);
    window.scrollTo(0, 0);
  };

  const optionState = (i: number): OptionState => {
    if (done && i === q.answer) return 'ok';
    if (session.wrongPicks.includes(i)) return 'bad';
    if (done) return 'dim';
    return 'idle';
  };

  const progress = (session.idx + (done ? 1 : 0)) / session.items.length;
  const pinNote = <div className={styles.pin}>📌 「{q.word}」已加入快忘清單，明天再考你</div>;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headRow}>
          <div className={styles.qNo}>
            第 {session.idx + 1} / {session.items.length} 題
          </div>
          <div className={styles.gained}>本關 +{session.xp} 經驗值</div>
        </div>
        <ProgressBar value={progress} color="var(--blue)" height={12} label="關卡進度" />
        <div className={styles.levelRow}>
          <span>Lv.{player.level}</span>
          <div className={styles.levelBar}>
            <ProgressBar value={player.xp / XP_PER_LEVEL} height={8} label="經驗值" />
          </div>
          <span>
            {player.xp} / {XP_PER_LEVEL}
          </span>
        </div>
      </div>

      <div className={styles.chips}>
        <span className={styles.chip}>{TAG_LABEL[q.tag]}</span>
        {label && <span className={styles.chipGold}>{label}</span>}
      </div>

      {q.ctx && (
        <div className={styles.ctx}>
          <div className={styles.ctxIcon} aria-hidden="true">
            💼
          </div>
          <div>
            <div className={styles.ctxTitle}>實務面試官挑戰</div>
            <div className={styles.ctxText}>{q.ctx}</div>
          </div>
        </div>
      )}

      <Stem key={q.id} stem={q.stem} filled={done ? q.options[q.answer] : undefined} />

      <div className={styles.options}>
        {q.options.map((text, i) => (
          <OptionButton
            key={`${q.id}-${i}`}
            text={text}
            letter={'ABCD'.charAt(i)}
            state={optionState(i)}
            disabled={done || session.wrongPicks.includes(i)}
            onClick={() => pick(i)}
          />
        ))}
      </div>

      {session.phase === 'hint' && (
        <CoachHint tone="hint" title="費曼教練：先別急，給你一個線索">
          <div>{q.hint}</div>
          <div className={styles.retry}>再選一次！</div>
          {pinNote}
        </CoachHint>
      )}

      {outcome === 'first' && (
        <CoachHint
          tone="ok"
          title={`✅ 答對了！+${session.lastXp} 經驗值${session.combo >= COMBO_THRESHOLD ? '（Combo × 1.25）' : ''}`}
        >
          <div>{q.explanation}</div>
        </CoachHint>
      )}

      {outcome === 'afterHint' && (
        <CoachHint tone="ok" title={`✅ 提示後答對！+${session.lastXp} 經驗值`}>
          <div>{q.explanation}</div>
          {pinNote}
        </CoachHint>
      )}

      {outcome === 'wrong' && (
        <CoachHint tone="bad" title={`正解是「${q.options[q.answer]}」`}>
          <div>費曼教練：{q.explanation}</div>
          {pinNote}
        </CoachHint>
      )}

      {done && (
        <button type="button" className={styles.next} onClick={next}>
          {isLastQuestion(session) ? '看結算 →' : '下一題 →'}
        </button>
      )}

      {banner && <ComboBanner playKey={banner.key} text={`🔥 連續答對 ${banner.combo} 題！經驗值 × 1.25`} />}
    </main>
  );
}
