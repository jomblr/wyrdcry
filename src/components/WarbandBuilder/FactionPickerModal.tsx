import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import factionsData from '@site/src/data/factions.json';
import styles from './warband-builder.module.css';

interface Props {
  onConfirm: (factionId: string) => void;
  onCancel: () => void;
}

export default function FactionPickerModal({ onConfirm, onCancel }: Props) {
  const [factionId, setFactionId] = useState('');

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>Choose a Faction</div>
        <select
          className={styles.infoSelect}
          value={factionId}
          onChange={e => setFactionId(e.target.value)}
          autoFocus
        >
          <option value="" disabled>Select faction</option>
          {factionsData.filter(f => f.id !== 'hired-sword').map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <div className={styles.modalActions}>
          <button
            type="button"
            className={`button button--primary button--md ${styles.modalSaveBtn}`}
            disabled={!factionId}
            onClick={() => onConfirm(factionId)}
          >
            Create Warband
          </button>
          <button
            type="button"
            className="button button--secondary button--md"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
