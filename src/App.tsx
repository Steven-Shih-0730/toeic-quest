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
import { QUESTIONS } from './data/questions';
import { createSeed } from './data/seed';
import { CURRENT_ZONE, ZONES } from './data/zones';
import { BOT_PROFILE, BotOpponent } from './lib/battle/bot';
import { RealtimeRoom } from './lib/battle/realtime';
import { getSupabase, supabaseRoomChannel } from './lib/battle/supabaseClient';
import type { Opponent, PlayerInfo, ResumeInfo } from './lib/battle/types';
import { buildBossQuestions } from './lib/boss';
import { addDays, formatShortDate, getOffsetDays, setOffsetDays, today } from './lib/clock';
import { buildDailyQuest } from './lib/quest';
import type { QuestItem, QuestSummary } from './lib/quest';
import { BOSS_FIRST_CLEAR_XP, addXp, battleReward, completeDaily, refreshStreak } from './lib/scoring';
import { dueWords, forgetList, recordAnswer } from './lib/srs';
import { BOSS_STAGE, clearStage, isBossUnlocked, isZoneCleared, nextNormalStage, stageId, unlockBoss } from './lib/stages';
import { clearSave, loadSave, writeSave } from './lib/storage';
import type { GameState, Player, Question } from './types';

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
  won: boolean;
  bossHp: number;
  firstClear: boolean;
}

export default function App() {
  const [world, setWorld] = useState<World>(initWorld);
  const [screen, setScreen] = useState<Screen>('home');
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [quest, setQuest] = useState<{ items: QuestItem[]; key: number } | null>(null);
  const [result, setResult] = useState<{ summary: QuestSummary; streakUp: boolean } | null>(null);
  const [boss, setBoss] = useState<{ questions: Question[]; key: number } | null>(null);
  const [bossEnd, setBossEnd] = useState<BossEnd | null>(null);
  const [battle, setBattle] = useState<{
    key: number;
    me: PlayerInfo;
    createOpponent: () => Opponent;
    createFallback?: (resume: ResumeInfo) => Opponent;
    myWords: string[];
  } | null>(null);
  const [battleEnd, setBattleEnd] = useState<{ me: PlayerInfo; outcome: BattleOutcome; reward: number } | null>(null);
  const { todayIso, game } = world;
  const zone = ZONES[CURRENT_ZONE - 1];
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
    setQuest({ items: buildDailyQuest(QUESTIONS, game.progress, todayIso, CURRENT_ZONE), key: Date.now() });
    go('quest');
  };

  const finishDaily = (summary: QuestSummary) => {
    // 同一天第一次完成：連續天數 +1，並推進一關
    const { player, streakUp } = completeDaily(game.player, todayIso);
    let cleared = player.clearedStages;
    const next = nextNormalStage(cleared, CURRENT_ZONE);
    if (streakUp && next !== undefined) cleared = clearStage(cleared, stageId(CURRENT_ZONE, next));
    setWorld({ todayIso, game: { ...game, player: { ...player, clearedStages: cleared } } });
    setResult({ summary, streakUp });
    setQuest(null);
    go('result');
  };

  // ───────── Boss 關 ─────────

  const startBoss = () => {
    setBoss({ questions: buildBossQuestions(QUESTIONS, CURRENT_ZONE), key: Date.now() });
    go('boss');
  };

  const finishBoss = (won: boolean, bossHp: number) => {
    const firstClear = won && !isZoneCleared(game.player.clearedStages, CURRENT_ZONE);
    if (won) {
      let player: Player = {
        ...game.player,
        clearedStages: clearStage(game.player.clearedStages, stageId(CURRENT_ZONE, BOSS_STAGE)),
        badges: game.player.badges.includes(zone.badge) ? game.player.badges : [...game.player.badges, zone.badge],
      };
      if (firstClear) player = withXp(player, BOSS_FIRST_CLEAR_XP);
      setWorld({ todayIso, game: { ...game, player } });
    }
    setBossEnd({ won, bossHp, firstClear });
    setBoss(null);
    go('bossResult');
  };

  // ───────── 對戰 ─────────

  const myForgetWords = () => forgetList(game.progress).map((p) => p.word);

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
    setWorld((w) => ({ ...w, game: { ...w.game, player: withXp(w.game.player, reward) } }));
    setBattleEnd({ me: battle?.me ?? me, outcome, reward });
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

  const handleUnlockBoss = () => {
    setWorld({
      todayIso,
      game: { ...game, player: { ...game.player, clearedStages: unlockBoss(game.player.clearedStages, CURRENT_ZONE) } },
    });
    showToast(`已解鎖第 ${CURRENT_ZONE} 區 Boss：第 1～9 關設為完成。`, 4000);
    go('home');
  };

  return (
    <div className={styles.frame}>
      <div className={styles.header}>
        <TopBar
          title={TITLES[screen]}
          showBack={screen !== 'home'}
          onBack={() => go('home')}
          onToggleSettings={() => setPanelOpen((v) => !v)}
        />
        {panelOpen && (
          <DemoPanel
            dateText={formatShortDate(todayIso)}
            bossUnlocked={isBossUnlocked(game.player.clearedStages, CURRENT_ZONE)}
            onNextDay={handleNextDay}
            onReset={handleReset}
            onUnlockBoss={handleUnlockBoss}
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
          onStartBoss={startBoss}
          onNavigate={go}
        />
      )}
      {screen === 'quest' && quest && (
        <Quest key={quest.key} items={quest.items} player={game.player} onAnswer={applyAnswer} onFinish={finishDaily} />
      )}
      {screen === 'result' && result && (
        <Result
          summary={result.summary}
          player={game.player}
          streakUp={result.streakUp}
          onHome={() => go('home')}
          onBattle={() => go('battleLobby')}
        />
      )}
      {screen === 'boss' && boss && (
        <Boss key={boss.key} questions={boss.questions} onAnswer={(r) => applyAnswer(r, 0)} onFinish={finishBoss} />
      )}
      {screen === 'bossResult' && bossEnd && (
        <BossResult
          won={bossEnd.won}
          bossHp={bossEnd.bossHp}
          zoneNo={zone.no}
          badge={zone.badge}
          firstClear={bossEnd.firstClear}
          bonusXp={BOSS_FIRST_CLEAR_XP}
          onHome={() => go('home')}
          onRetry={startBoss}
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
          onHome={() => go('home')}
          onRematch={() => go('battleLobby')}
        />
      )}
    </div>
  );
}
