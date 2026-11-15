import { useEffect, useState } from 'react';
import styles from './App.module.css';
import TopBar from './components/TopBar';
import DemoPanel from './components/DemoPanel';
import Battle from './screens/Battle';
import type { BattleOutcome } from './screens/Battle';
import BattleLobby from './screens/BattleLobby';
import BattleResult from './screens/BattleResult';
import Boss from './screens/Boss';
import BossResult from './screens/BossResult';
import Home from './screens/Home';
import Quest from './screens/Quest';
import Result from './screens/Result';
import type { ResultMode } from './screens/Result';
import { QUESTIONS } from './data/questions';
import { createSeed } from './data/seed';
import { ZONES } from './data/zones';
import { BOT_PROFILE, BotOpponent } from './lib/battle/bot';
import { RealtimeRoom } from './lib/battle/realtime';
import { getSupabase, supabaseRoomChannel } from './lib/battle/supabaseClient';
import type { Opponent, PlayerInfo, ResumeInfo } from './lib/battle/types';
import { buildBossQuestions } from './lib/boss';
import { addDays, formatShortDate, getOffsetDays, setOffsetDays, today } from './lib/clock';
import { battleWordPool } from './lib/battle/engine';
import { buildDailyQuest, buildStageQuest } from './lib/quest';
import type { QuestItem, QuestSummary } from './lib/quest';
import { applyRating, ratingDelta } from './lib/rating';
import { BOSS_FIRST_CLEAR_XP, addXp, battleReward, completeDaily, refreshStreak } from './lib/scoring';
import { dueWords, recordAnswer } from './lib/srs';
import {
  BOSS_STAGE,
  ZONE_COUNT,
  allZonesUnlocked,
  clearStage,
  frontierZone,
  isZoneCleared,
  nextNormalStage,
  stageId,
  unlockNextZone,
  unlockedZones,
} from './lib/stages';
import { clearSave, loadSave, writeSave } from './lib/storage';
import type { GameState, Player, Question } from './types';

/** 正式版用 VITE_SHOW_DEMO_PANEL=false 隱藏展示用控制面板（CLAUDE.md 第 7 節） */
const SHOW_DEMO_PANEL = import.meta.env.VITE_SHOW_DEMO_PANEL !== 'false';

export type Screen =
  | 'home'
  | 'quest'
  | 'result'
  | 'boss'
  | 'bossResult'
  | 'battleLobby'
  | 'battle'
  | 'battleResult';

const TITLES: Record<Screen, string> = {
  home: '多益打怪 TOEIC Quest',
  quest: '今日關卡',
  result: '關卡結算',
  boss: 'Boss 關：命題教授',
  bossResult: 'Boss 關結果',
  battleLobby: '雙人對戰',
  battle: '雙人對戰',
  battleResult: '對戰結果',
};

function withXp(player: Player, amount: number): Player {
  const { levelsGained: _ignored, ...next } = addXp(player, amount);
  return next;
}

interface World {
  todayIso: string;
  game: GameState;
}

/** 啟動時讀存檔；沒有存檔（或無法存取）就用初始假資料 */
function initWorld(): World {
  const saved = loadSave();
  if (saved) {
    setOffsetDays(saved.offsetDays);
    const t = today();
    return { todayIso: t, game: { ...saved.game, player: refreshStreak(saved.game.player, t) } };
  }
  setOffsetDays(0);
  const t = today();
  return { todayIso: t, game: createSeed(t) };
}

interface Toast {
  text: string;
  ms: number;
  id: number;
}

interface BossEnd {
  zone: number;
  won: boolean;
  bossHp: number;
  firstClear: boolean;
}

export default function App() {
  const [world, setWorld] = useState<World>(initWorld);
  const [screen, setScreen] = useState<Screen>('home');
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // 今日關卡（zone/stage 為空）或地圖關卡
  const [quest, setQuest] = useState<{ items: QuestItem[]; key: number; zone?: number; stage?: number } | null>(null);
  const [result, setResult] = useState<{ summary: QuestSummary; mode: ResultMode } | null>(null);
  const [boss, setBoss] = useState<{ questions: Question[]; key: number; zone: number } | null>(null);
  const [bossEnd, setBossEnd] = useState<BossEnd | null>(null);
  const [battle, setBattle] = useState<{
    key: number;
    me: PlayerInfo;
    createOpponent: () => Opponent;
    createFallback?: (resume: ResumeInfo) => Opponent;
    myWords: string[];
  } | null>(null);
  const [battleEnd, setBattleEnd] = useState<{
    me: PlayerInfo;
    outcome: BattleOutcome;
    reward: number;
    rating: { before: number; after: number };
  } | null>(null);
  const { todayIso, game } = world;
  const me: PlayerInfo = { id: game.player.id, name: game.player.name, level: game.player.level, avatar: '🧑' };

  // 狀態有變就存檔（storage 內部已處理無法存取的情況）
  useEffect(() => {
    writeSave({ version: 1, offsetDays: getOffsetDays(), game: world.game });
  }, [world]);

  // toast 時間到自動消失
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.ms);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = (text: string, ms: number) => setToast({ text, ms, id: Date.now() });

  const go = (next: Screen) => {
    setScreen(next);
    setPanelOpen(false);
    window.scrollTo(0, 0);
  };

  /** 寫入一筆作答紀錄與經驗值（今日關卡、Boss、對戰共用） */
  const applyAnswer = (record: { word: string; correct: boolean } | undefined, xp: number) => {
    setWorld((w) => ({
      ...w,
      game: {
        progress: record ? recordAnswer(w.game.progress, record.word, record.correct, w.todayIso) : w.game.progress,
        player: xp > 0 ? withXp(w.game.player, xp) : w.game.player,
      },
    }));
  };

  // ───────── 今日關卡 ─────────

  const startDaily = () => {
    setQuest({
      items: buildDailyQuest(QUESTIONS, game.progress, todayIso, unlockedZones(game.player.clearedStages)),
      key: Date.now(),
    });
    go('quest');
  };

  const startStage = (zone: number, stage: number) => {
    setQuest({ items: buildStageQuest(QUESTIONS, game.progress, todayIso, zone), key: Date.now(), zone, stage });
    go('quest');
  };

  const finishQuest = (summary: QuestSummary) => {
    if (quest?.zone !== undefined && quest.stage !== undefined) {
      // 地圖關卡：作答完就通過，不影響連續天數
      const { zone, stage } = quest;
      const cleared = clearStage(game.player.clearedStages, stageId(zone, stage));
      setWorld({ todayIso, game: { ...game, player: { ...game.player, clearedStages: cleared } } });
      setResult({ summary, mode: { kind: 'stage', zone, stage, nextStage: nextNormalStage(cleared, zone) } });
    } else {
      // 今日關卡：同一天第一次完成，連續天數 +1；不推進地圖
      const { player, streakUp } = completeDaily(game.player, todayIso);
      setWorld({ todayIso, game: { ...game, player } });
      setResult({ summary, mode: { kind: 'daily', streakUp } });
    }
    setQuest(null);
    go('result');
  };

  // ───────── Boss 關 ─────────

  const startBoss = (zone: number) => {
    setBoss({ questions: buildBossQuestions(QUESTIONS, zone), key: Date.now(), zone });
    go('boss');
  };

  const finishBoss = (won: boolean, bossHp: number) => {
    const zone = boss?.zone ?? 1;
    const zoneInfo = ZONES[zone - 1];
    const firstClear = won && !isZoneCleared(game.player.clearedStages, zone);
    if (won) {
      let player: Player = {
        ...game.player,
        clearedStages: clearStage(game.player.clearedStages, stageId(zone, BOSS_STAGE)),
        badges: game.player.badges.includes(zoneInfo.badge) ? game.player.badges : [...game.player.badges, zoneInfo.badge],
      };
      if (firstClear) player = withXp(player, BOSS_FIRST_CLEAR_XP);
      setWorld({ todayIso, game: { ...game, player } });
    }
    setBossEnd({ zone, won, bossHp, firstClear });
    setBoss(null);
    go('bossResult');
  };

  // ───────── 對戰 ─────────

  // 對戰用的快忘字：到期優先、同組隨機（CLAUDE.md 6.6）
  const myForgetWords = () => battleWordPool(game.progress, todayIso);

  const startBotBattle = () => {
    setBattle({
      key: Date.now(),
      me,
      createOpponent: () => new BotOpponent({ bank: QUESTIONS }),
      myWords: myForgetWords(),
    });
    go('battle');
  };

  /** 建立或加入連線房間；沒有設定 Supabase 時回傳 null */
  const openRoom = (code: string, isHost: boolean): RealtimeRoom | null => {
    const sb = getSupabase();
    if (!sb) return null;
    // 同一個瀏覽器開兩個分頁時 player.id 相同，連線用的 id 加上隨機尾碼
    const roomMe: PlayerInfo = { ...me, id: `${me.id}-${Math.random().toString(36).slice(2, 6)}` };
    return new RealtimeRoom(supabaseRoomChannel(sb, code, roomMe.id), code, roomMe, isHost, QUESTIONS, myForgetWords());
  };

  const startRoomBattle = (room: RealtimeRoom) => {
    setBattle({
      key: Date.now(),
      me: room.snapshot.me,
      createOpponent: () => room.createOpponent(),
      // 對手斷線：機器人沿用原對手的 id 接手，分數接得上
      createFallback: (resume) =>
        new BotOpponent({
          bank: QUESTIONS,
          profile: { ...BOT_PROFILE, id: resume.opponentId, name: `${BOT_PROFILE.name}（代打）` },
          resume,
        }),
      myWords: myForgetWords(),
    });
    go('battle');
  };

  const finishBattle = (outcome: BattleOutcome) => {
    const reward = battleReward(outcome.myScore, outcome.oppScore);
    const before = applyRating(game.player.rating, 0);
    const after = applyRating(game.player.rating, ratingDelta(outcome.myScore, outcome.oppScore));
    setWorld((w) => ({ ...w, game: { ...w.game, player: { ...withXp(w.game.player, reward), rating: after } } }));
    setBattleEnd({ me: battle?.me ?? me, outcome, reward, rating: { before, after } });
    setBattle(null);
    go('battleResult');
  };

  const setName = (name: string) => {
    setWorld({ todayIso, game: { ...game, player: { ...game.player, name, nameConfirmed: true } } });
  };

  // ───────── 展示用控制面板 ─────────

  const handleNextDay = () => {
    setOffsetDays(getOffsetDays() + 1);
    const t = today();
    const broke = game.player.lastActiveDate < addDays(t, -1);
    const due = dueWords(game.progress, t).map((p) => p.word);
    let text = `⏭ 新的一天 ${formatShortDate(t)}。`;
    text += due.length ? `到期的字：${due.join('、')}，會優先出現在今日關卡。` : '今天沒有到期的快忘字。';
    text += broke ? '昨天沒有闖關，連續天數歸零。' : '完成今日關卡，連續天數就會 +1。';
    setWorld({ todayIso: t, game: { ...game, player: refreshStreak(game.player, t) } });
    showToast(text, 6000);
    go('home');
  };

  const handleReset = () => {
    clearSave();
    setOffsetDays(0);
    const t = today();
    setWorld({ todayIso: t, game: createSeed(t) });
    showToast('已重設 demo：小陳 Lv.3、連續 6 天、預設快忘清單。', 4000);
    go('home');
  };

  const handleUnlockNextZone = () => {
    const cleared = unlockNextZone(game.player.clearedStages);
    setWorld({ todayIso, game: { ...game, player: { ...game.player, clearedStages: cleared } } });
    const z = frontierZone(cleared);
    showToast(`已解鎖第 ${z} 區「${ZONES[z - 1].name}」。`, 4000);
    go('home');
  };

  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <TopBar
          title={
            screen === 'quest' && quest?.zone !== undefined
              ? `第 ${quest.zone} 區 第 ${quest.stage} 關`
              : screen === 'boss' && boss
                ? `第 ${boss.zone} 區 Boss：命題教授`
                : TITLES[screen]
          }
          showBack={screen !== 'home'}
          onBack={() => go('home')}
          onToggleSettings={SHOW_DEMO_PANEL ? () => setPanelOpen((v) => !v) : undefined}
        />
        {SHOW_DEMO_PANEL && panelOpen && (
          <DemoPanel
            dateText={formatShortDate(todayIso)}
            allUnlocked={allZonesUnlocked(game.player.clearedStages)}
            onNextDay={handleNextDay}
            onReset={handleReset}
            onUnlockNextZone={handleUnlockNextZone}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>

      {screen === 'home' && (
        <Home
          game={game}
          todayIso={todayIso}
          toast={toast?.text ?? ''}
          toastKey={toast?.id ?? 0}
          onStartDaily={startDaily}
          onStartStage={startStage}
          onStartBoss={startBoss}
          onNavigate={go}
        />
      )}
      {screen === 'quest' && quest && (
        <Quest key={quest.key} items={quest.items} player={game.player} onAnswer={applyAnswer} onFinish={finishQuest} />
      )}
      {screen === 'result' && result && (
        <Result
          summary={result.summary}
          player={game.player}
          mode={result.mode}
          onHome={() => go('home')}
          onBattle={() => go('battleLobby')}
          onNextStage={() => {
            if (result.mode.kind === 'stage' && result.mode.nextStage !== undefined) {
              startStage(result.mode.zone, result.mode.nextStage);
            }
          }}
        />
      )}
      {screen === 'boss' && boss && (
        <Boss key={boss.key} questions={boss.questions} onAnswer={(r) => applyAnswer(r, 0)} onFinish={finishBoss} />
      )}
      {screen === 'bossResult' && bossEnd && (
        <BossResult
          won={bossEnd.won}
          bossHp={bossEnd.bossHp}
          zoneNo={bossEnd.zone}
          badge={ZONES[bossEnd.zone - 1].badge}
          firstClear={bossEnd.firstClear}
          bonusXp={BOSS_FIRST_CLEAR_XP}
          unlocked={
            bossEnd.won && bossEnd.zone < ZONE_COUNT ? { no: bossEnd.zone + 1, name: ZONES[bossEnd.zone].name } : undefined
          }
          onHome={() => go('home')}
          onRetry={() => startBoss(bossEnd.zone)}
        />
      )}
      {screen === 'battleLobby' && (
        <BattleLobby
          player={game.player}
          onSetName={setName}
          onEditName={() => setWorld({ todayIso, game: { ...game, player: { ...game.player, nameConfirmed: false } } })}
          onQuickMatch={startBotBattle}
          realtimeAvailable={getSupabase() !== null}
          openRoom={openRoom}
          onRoomStart={startRoomBattle}
        />
      )}
      {screen === 'battle' && battle && (
        <Battle
          key={battle.key}
          me={battle.me}
          myWords={battle.myWords}
          createOpponent={battle.createOpponent}
          createFallback={battle.createFallback}
          onRecord={(word, correct) => applyAnswer({ word, correct }, 0)}
          onFinish={finishBattle}
          onLeave={() => go('home')}
        />
      )}
      {screen === 'battleResult' && battleEnd && (
        <BattleResult
          me={battleEnd.me}
          outcome={battleEnd.outcome}
          reward={battleEnd.reward}
          rating={battleEnd.rating}
          onHome={() => go('home')}
          onRematch={() => go('battleLobby')}
        />
      )}
    </div>
  );
}
