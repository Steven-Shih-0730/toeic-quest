import { useEffect, useState } from 'react';
import styles from './App.module.css';
import TopBar from './components/TopBar';
import DemoPanel from './components/DemoPanel';
import Home from './screens/Home';
import Placeholder from './screens/Placeholder';
import { createSeed } from './data/seed';
import { CURRENT_ZONE } from './data/zones';
import { addDays, formatShortDate, getOffsetDays, setOffsetDays, today } from './lib/clock';
import { refreshStreak } from './lib/scoring';
import { dueWords } from './lib/srs';
import { isBossUnlocked, unlockBoss } from './lib/stages';
import { clearSave, loadSave, writeSave } from './lib/storage';
import type { GameState } from './types';

export type Screen = 'home' | 'quest' | 'boss' | 'battleLobby';

const TITLES: Record<Screen, string> = {
  home: '多益打怪 TOEIC Quest',
  quest: '今日關卡',
  boss: 'Boss 關：命題教授',
  battleLobby: '雙人對戰',
};

const PLACEHOLDER_NOTE: Record<Exclude<Screen, 'home'>, string> = {
  quest: '今日關卡會在階段 3 完成。',
  boss: 'Boss 關會在階段 4 完成。',
  battleLobby: '雙人對戰會在階段 4 完成。',
};

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

export default function App() {
  const [world, setWorld] = useState<World>(initWorld);
  const [screen, setScreen] = useState<Screen>('home');
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const { todayIso, game } = world;

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

      {screen === 'home' ? (
        <Home game={game} todayIso={todayIso} toast={toast?.text ?? ''} toastKey={toast?.id ?? 0} onNavigate={go} />
      ) : (
        <Placeholder note={PLACEHOLDER_NOTE[screen]} onHome={() => go('home')} />
      )}
    </div>
  );
}
