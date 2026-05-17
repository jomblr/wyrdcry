import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import factionsData from '@site/src/data/factions.json';
import campaignRules from '@site/src/data/campaign-rules.json';
import styles from './warband-builder.module.css';

interface Props {
  onConfirm: (factionId: string, gold: number) => void;
  onCancel: () => void;
}

export default function FactionPickerModal({ onConfirm, onCancel }: Props) {
  const [factionId, setFactionId] = useState('');
  const [goldInput, setGoldInput] = useState(String(campaignRules.warband_budget));

  const gold = Math.max(0, parseInt(goldInput, 10) || 0);

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>New Warband</div>

        <div className={styles.modalField}>
          <label className={styles.modalFieldLabel} htmlFor="new-warband-faction">Faction</label>
          <select
            id="new-warband-faction"
            className={`${styles.infoSelect} ${!factionId ? styles.infoSelectEmpty : ''}`}
            value={factionId}
            onChange={e => setFactionId(e.target.value)}
            autoFocus
          >
            <option value="" disabled>Select faction</option>
            {factionsData.filter(f => f.id !== 'hired-sword').map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalFieldLabel} htmlFor="new-warband-gold">Starting gold</label>
          <input
            id="new-warband-gold"
            type="text"
            inputMode="numeric"
            className={styles.infoInput}
            value={goldInput}
            onChange={e => setGoldInput(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={`button button--primary button--md ${styles.modalSaveBtn}`}
            disabled={!factionId}
            onClick={() => onConfirm(factionId, gold)}
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
