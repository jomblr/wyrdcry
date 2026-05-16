import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Warband } from './useWarband';
import factionsData from '@site/src/data/factions.json';
import styles from './warband-builder.module.css';

interface Props {
  warbands: Warband[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
}

export default function WarbandList({ warbands, onSelect, onCreate, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.warbandListShell}>
      <img src="/img/warrior.png" className={styles.warbandListWarrior} aria-hidden />
      <div className={styles.warbandListInner}>
        <h2 className={styles.warbandListHeading}>My Warbands</h2>

        <div className={styles.warbandListActions}>
          <button type="button" className="button button--primary button--md" onClick={onCreate}>
            Create new warband
          </button>
          <button type="button" className="button button--secondary button--md" onClick={() => fileRef.current?.click()}>
            Import warband
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { onImport(file); e.target.value = ''; }
            }}
          />
        </div>

        {warbands.length === 0 ? (
          <p className={styles.warbandListEmpty}>No warbands yet. Create one to get started.</p>
        ) : (
          <ul className={styles.warbandListItems}>
            {warbands.map(wb => (
              <li key={wb.id}>
                <button
                  type="button"
                  className={styles.warbandListRow}
                  onClick={() => onSelect(wb.id)}
                >
                  <span className={styles.warbandListMeta}>
                    <span className={styles.warbandListName}>{wb.name || 'Untitled Warband'}</span>
                    <span className={styles.warbandListFaction}>
                      {wb.factionId ? (factionsData.find(f => f.id === wb.factionId)?.name ?? wb.factionId) : 'No faction'}
                    </span>
                  </span>
                  <ArrowRight size={16} className={styles.warbandListArrow} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
