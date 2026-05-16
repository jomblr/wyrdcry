import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './warband-builder.module.css';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';

interface Props {
  fighterName: string;
  baseCost: number;
  equipment: string[];
  onCostChange: (cost: number | null) => void;
  onClose: () => void;
}

function equipmentCost(id: string): number {
  return weaponsData.find(w => w.id === id)?.cost ?? itemsData.find(i => i.id === id)?.cost ?? 0;
}

function equipmentName(id: string): string {
  return weaponsData.find(w => w.id === id)?.name ?? itemsData.find(i => i.id === id)?.name ?? id;
}

export default function ValueModal({ fighterName, baseCost, equipment, onCostChange, onClose }: Props) {
  const [draft, setDraft] = useState(String(baseCost));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSave() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0) {
      onCostChange(n);
      onClose();
    } else {
      setDraft(String(baseCost));
    }
  }

  const lineItems: { label: string; cost: number; free?: boolean }[] = equipment.map((id, idx) => {
    const isFirstDagger = id === 'dagger' && equipment.indexOf('dagger') === idx;
    return { label: equipmentName(id), cost: isFirstDagger ? 0 : equipmentCost(id), free: isFirstDagger };
  });

  const equipTotal = lineItems.reduce((s, li) => s + li.cost, 0);
  const parsedBase = parseInt(draft, 10);
  const baseForTotal = isNaN(parsedBase) ? baseCost : parsedBase;
  const total = baseForTotal + equipTotal;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onMouseDown={onClose}>
      <div className={styles.modalBox} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{fighterName}</div>

        <div className={styles.modalRow}>
          <span className={styles.modalLabel}>Fighter cost</span>
          <span className={styles.modalCostCell}>
            <input
              ref={inputRef}
              className={styles.modalCostInput}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
            <span className={styles.modalGc}>gc</span>
          </span>
        </div>

        {lineItems.length > 0 && (
          <>
            <div className={styles.modalDivider} />
            {lineItems.map((li, i) => (
              <div key={i} className={styles.modalRow}>
                <span className={styles.modalLabel}>{li.label}</span>
                <span className={styles.modalCostCell}>
                  <span className={`${styles.modalCostValue} ${li.free ? styles.modalFree : ''}`}>
                    {li.free ? 'free' : `${li.cost}gc`}
                  </span>
                </span>
              </div>
            ))}
          </>
        )}

        <div className={styles.modalDivider} />
        <div className={`${styles.modalRow} ${styles.modalTotalRow}`}>
          <span className={styles.modalLabel}>Total</span>
          <span className={styles.modalCostCell}>
            <span className={styles.modalCostValue}>{total}gc</span>
          </span>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.modalSaveBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
