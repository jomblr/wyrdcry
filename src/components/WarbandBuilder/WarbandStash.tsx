import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import styles from './warband-builder.module.css';

interface Props {
  stash: string[];
  onRemove: (itemIdx: number) => void;
  onSell: (itemIdx: number, salePrice: number) => void;
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

export default function WarbandStash({ stash, onRemove, onSell }: Props) {
  const [modHeld, setModHeld] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number; text: string } | null>(null);
  const hoveredRef = useRef<{ idx: number; x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setModHeld(true);
        if (hoveredRef.current) setCursor(hoveredRef.current);
      }
    };
    const up = (e: KeyboardEvent) => { if (!e.ctrlKey && !e.metaKey) { setModHeld(false); setCursor(null); } };
    const blur = () => { setModHeld(false); setCursor(null); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return (
    <div className={`${styles.infoPanel} ${styles.stashPanel}`}>
      <h3 className={styles.stashTitle}>Warband Stash <span className={styles.stashItemHint}>(Ctrl/Cmd click to sell)</span></h3>
      <div className={styles.stashItems}>
        {stash.length === 0 && (
          <span className={styles.stashEmpty}>The stash is empty</span>
        )}
        {stash.map((id, idx) => {
          const salePrice = Math.floor(costFor(id) / 2);
          const label = `Sell for ${salePrice}gc`;
          return (
            <span
              key={`${id}-${idx}`}
              className={`${styles.equipmentTag} ${styles.stashItemTag}`}
              onMouseEnter={e => {
                hoveredRef.current = { idx, x: e.clientX, y: e.clientY, text: label };
                if (modHeld) setCursor(hoveredRef.current);
              }}
              onMouseMove={e => {
                hoveredRef.current = { idx, x: e.clientX, y: e.clientY, text: label };
                if (modHeld) setCursor(hoveredRef.current);
              }}
              onMouseLeave={() => { hoveredRef.current = null; setCursor(null); }}
              onClick={e => {
                if (e.ctrlKey || e.metaKey) { setCursor(null); onSell(idx, salePrice); }
              }}
            >
              {labelFor(id)}
            </span>
          );
        })}
      </div>
      {cursor && modHeld && ReactDOM.createPortal(
        <div className={styles.cursorLabel} style={{ left: cursor.x + 12, top: cursor.y + 16 }}>
          {cursor.text}
        </div>,
        document.body,
      )}
    </div>
  );
}
