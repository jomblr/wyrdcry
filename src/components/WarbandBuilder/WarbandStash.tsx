import React from 'react';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import styles from './warband-builder.module.css';

interface Props {
  stash: string[];
  onRemove: (itemIdx: number) => void;
}

function labelFor(id: string): string {
  return (
    weaponsData.find(x => x.id === id)?.name ??
    itemsData.find(x => x.id === id)?.name ??
    id
  );
}

function costFor(id: string): number {
  return (
    weaponsData.find(x => x.id === id)?.cost ??
    itemsData.find(x => x.id === id)?.cost ??
    0
  );
}

export default function WarbandStash({ stash, onRemove }: Props) {
  return (
    <div className={`${styles.infoPanel} ${styles.stashPanel}`}>
      <h3 className={styles.stashTitle}>Warband Stash</h3>
      <div className={styles.stashItems}>
        {stash.length === 0 && (
          <span className={styles.stashEmpty}>Stash is empty</span>
        )}
        {stash.map((id, idx) => (
          <span key={`${id}-${idx}`} className={styles.stashTag}>
            <span className={styles.stashTagName}>{labelFor(id)}</span>
            <span className={styles.stashTagCost}>{costFor(id)}gc</span>
            <button
              type="button"
              className={styles.stashTagRemove}
              onClick={() => onRemove(idx)}
              title="Remove from stash"
              aria-label={`Remove ${labelFor(id)} from stash`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
