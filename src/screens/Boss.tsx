import { useState } from 'react';
import styles from './Boss.module.css';
import CoachHint from '../components/CoachHint';
import OptionButton from '../components/OptionButton';
import type { OptionState } from '../components/OptionButton';
import Stem from '../components/Stem';
import { BOSS_HP, PLAYER_LIVES, bossWon, isBossOver, nextBoss, pickBoss, startBoss } from '../lib/boss';
import type { Question } from '../types';

interface Props {
  questions: Question[];
  onAnswer: (record: { word: string; correct: boolean }) => void;
  onFinish: (won: boolean, bossHp: number) => void;
}

export default function Boss({ questions, onAnswer, onFinish }: Props) {
  const [s, setS] = useState(() => startBoss(questions));
  const q = s.questions[s.idx];
  const answered = s.picked !== null;
  const correct = answered && s.picked === q.answer;
  const over = isBossOver(s);

  const pick = (choice: number) => {
    const r = pickBoss(s, choice);
    if (r.session === s) return;
    setS(r.session);
    if (r.record) onAnswer(r.record);
  };

  const next = () => {
    if (over) {
      onFinish(bossWon(s), s.bossHp);
      return;
    }
    setS(nextBoss(s));
    window.scrollTo(0, 0);
  };

  const optionState = (i: number): OptionState => {
    if (!answered) return 'idle';
    if (i === q.answer) return 'ok';
    if (i === s.picked) return 'bad';
    return 'dim';
  };

  return (
    <main className={styles.page}>
      <section className={styles.bossCard}>
        <div className={styles.bossRow}>
          <div className={styles.avatar} aria-hidden="true">
            🎓
          </div>
          <div className={styles.bossInfo}>
            <div className={styles.bossName}>
              命題教授　<span className={styles.qNo}>陷阱題 {s.idx + 1} / {s.questions.length}</span>
            </div>
            <div className={styles.meter} aria-label={`教授血量 ${s.bossHp} / ${BOSS_HP}`}>
              <span className={styles.meterLabel}>血量</span>
              {Array.from({ length: BOSS_HP }, (_, i) => (
                <div key={i} className={`${styles.hp} ${i < s.bossHp ? styles.hpFull : ''}`} />
              ))}
            </div>
            <div className={styles.meter} aria-label={`我的生命 ${s.lives} / ${PLAYER_LIVES}`}>
              <span className={styles.meterLabel}>我的命</span>
              {Array.from({ length: PLAYER_LIVES }, (_, i) => (
                <span key={i} className={styles.heart}>
                  {i < s.lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.quote}>「長得像的字，才是真正的考題。答對一題，扣我一格血。」</div>
      </section>

      <div>
        <span className={styles.chip}>🎓 命題教授陷阱</span>
      </div>

      <Stem key={q.id} stem={q.stem} filled={answered ? q.options[q.answer] : undefined} />

      <div className={styles.options}>
        {q.options.map((text, i) => (
          <OptionButton
            key={`${q.id}-${i}`}
            text={text}
            letter={'ABCD'.charAt(i)}
            state={optionState(i)}
            disabled={answered}
            onClick={() => pick(i)}
          />
        ))}
      </div>

      {answered && correct && (
        <CoachHint tone="ok" title="✅ 命中！命題教授 −1 格血">
          <div>{q.explanation}</div>
        </CoachHint>
      )}
      {answered && !correct && (
        <CoachHint tone="bad" title={`正解是「${q.options[q.answer]}」　你 −1 條命`}>
          <div>費曼教練：{q.explanation}</div>
          <div className={styles.pin}>📌 「{q.word}」已加入快忘清單，明天再考你</div>
        </CoachHint>
      )}

      {answered && (
        <button type="button" className={styles.next} onClick={next}>
          {over ? '看結果 →' : '下一題 →'}
        </button>
      )}
    </main>
  );
}
