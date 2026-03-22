import React, { useRef } from 'react';
import clsx from 'clsx';
import type { Warband } from './useWarband';
import styles from './warband-builder.module.css';

interface Props {
  savedWarbands: Warband[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
  disableCreate: boolean;
}

export default function WarbandSidebar({ savedWarbands, activeId, onSelect, onCreate, onImport, disableCreate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <nav className={styles.sidebar}>
      <div className={styles.tocHeading}>My Warbands</div>
      <ul className={styles.tocList}>
        {savedWarbands.map(wb => (
          <li key={wb.id}>
            <a
              href="#"
              className={clsx(styles.tocLink, wb.id === activeId && styles.tocLinkActive)}
              onClick={e => { e.preventDefault(); onSelect(wb.id); }}
              title={wb.name || 'Untitled Warband'}
            >
              {wb.name || 'Untitled Warband'}
            </a>
          </li>
        ))}
      </ul>
      <div className={styles.sidebarActions}>
        <button
          type="button"
          className="button button--primary button--md"
          onClick={onCreate}
          disabled={disableCreate}
          title={disableCreate ? 'Name your current warband before creating a new one' : undefined}
        >
          Create new warband
        </button>
        <button
          type="button"
          className="button button--secondary button--md"
          onClick={() => fileRef.current?.click()}
        >
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
    </nav>
  );
}
