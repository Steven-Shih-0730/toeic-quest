import { useState } from 'react';
import styles from './App.module.css';
import TopBar from './components/TopBar';
import DemoPanel from './components/DemoPanel';
import Home from './screens/Home';
import Placeholder from './screens/Placeholder';
import { createSeed } from './data/seed';
import { formatShortDate, today } from './lib/clock';

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

export default function App() {
  // 階段 1：資料只讀 seed，尚未存檔；階段 2 會接上 storage 與「模擬隔天」
  const [todayIso] = useState(() => today());
  const [game] = useState(() => createSeed(todayIso));
  const [screen, setScreen] = useState<Screen>('home');
  const [panelOpen, setPanelOpen] = useState(false);

  const go = (next: Screen) => {
    setScreen(next);
    setPanelOpen(false);
    window.scrollTo(0, 0);
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
          <DemoPanel dateText={formatShortDate(todayIso)} onClose={() => setPanelOpen(false)} />
        )}
      </div>

      {screen === 'home' ? (
        <Home game={game} todayIso={todayIso} onNavigate={go} />
      ) : (
        <Placeholder note={PLACEHOLDER_NOTE[screen]} onHome={() => go('home')} />
      )}
    </div>
  );
}
