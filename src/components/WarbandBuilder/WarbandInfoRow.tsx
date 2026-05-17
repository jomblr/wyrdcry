import React from 'react';
import StatSpinner from './StatSpinner';
import type { Warband } from './useWarband';
import { calcReputation, calcStanding, calcValue } from './useWarband';
import styles from './warband-builder.module.css';
import factionsData from '@site/src/data/factions.json';
import fightersData from '@site/src/data/fighters.json';

interface Props {
  warband: Warband;
  onSetName: (name: string) => void;
  onSetFavour: (favour: number) => void;
}

export default function WarbandInfoRow({ warband, onSetName, onSetFavour }: Props) {
  const reputation = calcReputation(warband);
  const standing = calcStanding(reputation);
  const value = calcValue(warband, fightersData);
  const selectedFaction = factionsData.find(f => f.id === warband.factionId);
  const fighterCount = warband.fighters.length;
  const maxFighters = selectedFaction?.warband_size ?? null;
  const locked = !warband.factionId;

  return (
    <div className={styles.tableScrollOuter}>
    <div className={styles.tableWrapper}>
      <div className={`${styles.wbGrid} ${styles.infoGrid}`}>
        {/* Header */}
        <div className={styles.gridHeader}>
          <div className={styles.hCell}>Warband Name</div>
          <div className={styles.hCell}>Faction</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Favour</div>
          <div className={styles.hCell}>Standing</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Reputation</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Fighters</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Total Value</div>
        </div>

        {/* Data row */}
        <div className={styles.gridRow}>
          {/* Warband Name */}
          <div className={`${styles.cell} ${locked ? styles.lockedCell : ''}`}>
            <input
              className={styles.infoInput}
              type="text"
              placeholder="Warband name"
              value={warband.name}
              onChange={e => onSetName(e.target.value)}
              disabled={locked}
            />
          </div>

          {/* Faction — read-only */}
          <div className={styles.cell}>
            {selectedFaction ? selectedFaction.name : <span className={styles.lockedCell}>—</span>}
          </div>

          {/* Favour */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : (
              <StatSpinner value={warband.favour} min={0} onChange={onSetFavour} />
            )}
          </div>

          {/* Standing */}
          <div className={`${styles.cell} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : standing}
          </div>

          {/* Reputation */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : reputation}
          </div>

          {/* Fighters */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : maxFighters ? `${fighterCount} / ${maxFighters}` : fighterCount}
          </div>

          {/* Value */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : `${value}gc`}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
