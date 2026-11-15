import styles from './AdventureMap.module.css';
import { CURRENT_ZONE, ZONES } from '../data/zones';
import { BOSS_STAGE, STAGES_PER_ZONE, isBossUnlocked, isZoneCleared, nextNormalStage, stageId } from '../lib/stages';
import type { Player } from '../types';

interface Props {
  player: Player;
  todayIso: string;
  onStartDaily: () => void;
  onStartBoss: () => void;
}

type NodeKind = 'done' | 'today' | 'locked' | 'boss';

interface MapNode {
  stage: number;
  kind: NodeKind;
  icon: string;
  caption: string;
  clickable: boolean;
  bossCleared?: boolean;
  aria: string;
}

const ZONE = CURRENT_ZONE;

/** 依 CLAUDE.md 第 7 節「冒險地圖」算出目前區域每個節點的狀態 */
function buildNodes(player: Player, todayIso: string): MapNode[] {
  const cleared = player.clearedStages;
  const isCleared = (m: number) => cleared.includes(stageId(ZONE, m));
  const todayDone = player.lastActiveDate === todayIso;
  const normalStages = Array.from({ length: BOSS_STAGE - 1 }, (_, i) => i + 1);
  const next = nextNormalStage(cleared, ZONE);

  const nodes: MapNode[] = normalStages.map((m): MapNode => {
    if (isCleared(m)) {
      return { stage: m, kind: 'done', icon: '✓', caption: '', clickable: false, aria: `第 ${m} 關：已完成` };
    }
    if (m === next && !todayDone) {
      return { stage: m, kind: 'today', icon: String(m), caption: '今日', clickable: true, aria: `第 ${m} 關：今日關卡` };
    }
    return {
      stage: m,
      kind: 'locked',
      icon: '🔒',
      caption: m === next ? '明天' : '',
      clickable: false,
      aria: `第 ${m} 關：尚未開放`,
    };
  });

  const bossCleared = isZoneCleared(cleared, ZONE);
  const bossUnlocked = isBossUnlocked(cleared, ZONE);
  let bossAria = '第 10 關：命題教授 Boss 關（完成第 1～9 關後解鎖）';
  if (bossCleared) bossAria = '第 10 關：命題教授 Boss 關（已通關）';
  else if (bossUnlocked) bossAria = '第 10 關：命題教授 Boss 關';

  nodes.push({
    stage: BOSS_STAGE,
    kind: 'boss',
    icon: bossCleared ? '👑' : '🎓',
    caption: bossCleared ? '已通關' : bossUnlocked ? 'Boss' : '🔒 Boss',
    clickable: bossUnlocked,
    bossCleared,
    aria: bossAria,
  });
  return nodes;
}

export default function AdventureMap({ player, todayIso, onStartDaily, onStartBoss }: Props) {
  const nodes = buildNodes(player, todayIso);
  const zone = ZONES[ZONE - 1];
  const clearedCount = nodes.filter((n) => n.kind === 'done' || n.bossCleared).length;
  const zoneCleared = nodes[nodes.length - 1].bossCleared;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.heading}>🗺️ 冒險地圖</h2>

      <div className={styles.activeZone}>
        <div className={styles.zoneHead}>
          <span className={styles.zoneName}>
            第 {zone.no} 區　{zone.name}
          </span>
          <span className={styles.chipGold}>
            {zoneCleared ? '已通關' : `進行中 ${clearedCount} / ${STAGES_PER_ZONE}`}
          </span>
        </div>
        <div className={styles.grid}>
          {nodes.map((n) => (
            <div key={n.stage} className={styles.cell}>
              <button
                type="button"
                className={[styles.node, styles[n.kind], n.bossCleared ? styles.cleared : ''].join(' ')}
                disabled={!n.clickable}
                onClick={n.kind === 'boss' ? onStartBoss : onStartDaily}
                aria-label={n.aria}
              >
                {n.icon}
              </button>
              <div className={styles.caption}>{n.caption}</div>
            </div>
          ))}
        </div>
      </div>

      {ZONES.slice(1).map((z) => (
        <div key={z.no} className={styles.lockedZone}>
          <div className={styles.lockedHead}>
            <span>
              🔒 第 {z.no} 區　{z.name}
            </span>
            <span className={styles.soon}>即將推出</span>
          </div>
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: STAGES_PER_ZONE }, (_, i) => (
              <div key={i} className={styles.dot} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
