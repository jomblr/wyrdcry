import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { campaignRules, factionsData } from './data';
import styles from './warband-builder.module.css';

// Not offered when creating a warband: hired swords aren't a faction you lead, and the
// experimental warbands aren't ready for the builder yet. Kept in code rather than the
// JSON so WyrdForge exports can't bring them back.
const HIDDEN_FACTIONS = new Set(['hired-sword', 'shadow-warriors', 'dwarf-treasure']);

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
            {factionsData.filter(f => !HIDDEN_FACTIONS.has(f.id)).map(f => (
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
