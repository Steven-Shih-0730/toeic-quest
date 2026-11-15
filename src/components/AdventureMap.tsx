import styles from './AdventureMap.module.css';
import { ZONES } from '../data/zones';
import {
  BOSS_STAGE,
  STAGES_PER_ZONE,
  canPlayStage,
  isZoneCleared,
  isZoneUnlocked,
  nextNormalStage,
  stageId,
} from '../lib/stages';
import type { Player } from '../types';

interface Props {
  player: Player;
  onStartStage: (zone: number, stage: number) => void;
  onStartBoss: (zone: number) => void;
}

type NodeKind = 'done' | 'next' | 'locked';

/** 冒險地圖（CLAUDE.md 第 7 節）：每個已開放區域一張卡片，Boss 隨時可以挑戰 */
export default function AdventureMap({ player, onStartStage, onStartBoss }: Props) {
  const cleared = player.clearedStages;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.heading}>🗺️ 冒險地圖</h2>

      {ZONES.map((zone) => {
        if (!isZoneUnlocked(cleared, zone.no)) {
          return (
            <div key={zone.no} className={styles.lockedZone}>
              <div className={styles.lockedHead}>
                <span>
                  🔒 第 {zone.no} 區　{zone.name}
                </span>
                <span className={styles.soon}>打倒第 {zone.no - 1} 區 Boss 解鎖</span>
              </div>
              <div className={styles.dots} aria-hidden="true">
                {Array.from({ length: STAGES_PER_ZONE }, (_, i) => (
                  <div key={i} className={styles.dot} />
                ))}
              </div>
            </div>
          );
        }

        const next = nextNormalStage(cleared, zone.no);
        const bossCleared = isZoneCleared(cleared, zone.no);
        const doneCount = Array.from({ length: STAGES_PER_ZONE }, (_, i) => i + 1).filter((m) =>
          cleared.includes(stageId(zone.no, m)),
        ).length;

        return (
          <div key={zone.no} className={`${styles.activeZone} ${bossCleared ? styles.zoneCleared : ''}`}>
            <div className={styles.zoneHead}>
              <span className={styles.zoneName}>
                第 {zone.no} 區　{zone.name}
              </span>
              <span className={styles.chipGold}>{bossCleared ? '👑 已通關' : `進行中 ${doneCount} / ${STAGES_PER_ZONE}`}</span>
            </div>

            <div className={styles.grid}>
              {Array.from({ length: BOSS_STAGE - 1 }, (_, i) => i + 1).map((m) => {
                const done = cleared.includes(stageId(zone.no, m));
                const kind: NodeKind = done ? 'done' : m === next ? 'next' : 'locked';
                const playable = canPlayStage(cleared, zone.no, m);
                return (
                  <div key={m} className={styles.cell}>
                    <button
                      type="button"
                      className={`${styles.node} ${styles[kind]}`}
                      disabled={!playable}
                      onClick={() => onStartStage(zone.no, m)}
                      aria-label={`第 ${zone.no} 區第 ${m} 關：${done ? '已完成，可重玩' : kind === 'next' ? '下一關' : '尚未開放'}`}
                    >
                      {done ? '✓' : kind === 'next' ? m : '🔒'}
                    </button>
                    <div className={styles.caption}>{kind === 'next' ? '下一關' : ''}</div>
                  </div>
                );
              })}
              <div className={styles.cell}>
                <button
                  type="button"
                  className={`${styles.node} ${styles.boss} ${bossCleared ? styles.bossCleared : ''}`}
                  onClick={() => onStartBoss(zone.no)}
                  aria-label={`第 ${zone.no} 區 Boss：命題教授${bossCleared ? '（已通關，可再戰）' : ''}`}
                >
                  {bossCleared ? '👑' : '🎓'}
                </button>
                <div className={`${styles.caption} ${styles.bossCaption}`}>Boss</div>
              </div>
            </div>

            <button type="button" className={styles.bossBtn} onClick={() => onStartBoss(zone.no)}>
              {bossCleared ? '👑 再戰命題教授' : '🎓 挑戰命題教授'}
              <span className={styles.bossBtnNote}>{bossCleared ? '徽章已收藏' : `打倒他解鎖${zone.no < 5 ? `第 ${zone.no + 1} 區` : '最終徽章'}`}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
