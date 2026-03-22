import React from 'react';
import clsx from 'clsx';
import type { Warband } from './useWarband';
import styles from './warband-builder.module.css';

interface Props {
  savedWarbands: Warband[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  disableCreate: boolean;
}

export default function WarbandSidebar({ savedWarbands, activeId, onSelect, onCreate, disableCreate }: Props) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.tocHeading}>My Warbands</div>
      <ul className={styles.tocList}>
        {savedWarbands.map(wb => (
          <li key={wb.id}>
            <button
              type="button"
              className={clsx(styles.tocLink, wb.id === activeId && styles.tocLinkActive)}
              onClick={() => onSelect(wb.id)}
              title={wb.name || 'Untitled Warband'}
            >
              {wb.name || 'Untitled Warband'}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={clsx(styles.tocLink, styles.tocCreate)}
        onClick={onCreate}
        disabled={disableCreate}
        title={disableCreate ? 'Name your current warband before creating a new one' : undefined}
      >
        + New warband
      </button>
    </nav>
  );
}
