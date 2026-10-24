import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { itemsData, weaponsData } from './data';
import styles from './warband-builder.module.css';
import useIsMobile from './useIsMobile';
import EquipmentInfoSheet from './EquipmentInfoSheet';

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

/**
 * Sale price: half the listed price, rounded down to a multiple of 5gc, but never less
 * than 5gc (so a 25gc item sells for 10gc and a 5gc dagger still sells for 5gc).
 * Items that cost nothing sell for nothing.
 */
export function salePriceFor(cost: number): number {
  if (cost <= 0) return 0;
  return Math.max(5, Math.floor(cost / 2 / 5) * 5);
}

export default function WarbandStash({ stash, onRemove, onSell }: Props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileStash stash={stash} onSell={onSell} />;
  return <DesktopStash stash={stash} onRemove={onRemove} onSell={onSell} />;
}

/** Mobile: tags like the fighter cards; tapping one opens its details with Sell. */
function MobileStash({ stash, onSell }: Pick<Props, 'stash' | 'onSell'>) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const openId = openIdx !== null ? stash[openIdx] : undefined;
  const close = () => setOpenIdx(null);

  return (
    <div className={`${styles.infoPanel} ${styles.stashPanel}`}>
      <h3 className={styles.stashTitle}>Warband Stash</h3>
      <div className={styles.fighterCardTags}>
        {stash.length === 0 && <span className={styles.stashEmpty}>The stash is empty</span>}
        {stash.map((id, idx) => (
          <button
            type="button"
            key={`${id}-${idx}`}
            className={`${styles.equipmentTag} ${styles.fighterCardTag}`}
            onClick={() => setOpenIdx(idx)}
          >
            {labelFor(id)}
          </button>
        ))}
      </div>
      {openId !== undefined && openIdx !== null && (
        <EquipmentInfoSheet
          id={openId}
          onClose={close}
          actions={
            <>
              {/* Already stashed */}
              <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} disabled>
                Stash
              </button>
              <button
                type="button"
                className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`}
                onClick={() => { onSell(openIdx, salePriceFor(costFor(openId))); close(); }}
              >
                Sell for {salePriceFor(costFor(openId))}gc
              </button>
            </>
          }
        />
      )}
    </div>
  );
}

function DesktopStash({ stash, onSell }: Props) {
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
          const salePrice = salePriceFor(costFor(id));
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
