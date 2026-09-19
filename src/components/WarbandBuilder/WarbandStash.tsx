import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
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
  const [menu, setMenu] = useState<{ idx: number; pos: DropdownPos } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const focusAfterChange = useRef<number | null>(null);

  function toggleMenu(idx: number, el: HTMLButtonElement) {
    if (menu?.idx === idx) { setMenu(null); return; }
    setMenu({ idx, pos: calcDropdownPos(el.getBoundingClientRect()) });
  }

  /** Closes the menu and puts focus back where it was opened from */
  function closeMenu(idx: number) {
    setMenu(null);
    btnRefs.current[idx]?.focus();
  }

  /** An item leaving the stash takes its button with it — focus the one that moves up */
  function closeAfterAction(idx: number) {
    setMenu(null);
    focusAfterChange.current = idx;
  }

  useEffect(() => {
    if (!menu) return;
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRefs.current[menu.idx]?.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(menu.idx); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  useEffect(() => {
    const idx = focusAfterChange.current;
    if (idx === null) return;
    focusAfterChange.current = null;
    btnRefs.current[Math.min(idx, stash.length - 1)]?.focus();
  }, [stash]);

  const salePrice = menu ? Math.floor(costFor(stash[menu.idx]) / 2) : 0;

  return (
    <div className={`${styles.infoPanel} ${styles.stashPanel}`}>
      <h3 className={styles.stashTitle}>Warband Stash</h3>
      <div className={styles.stashItems}>
        {stash.length === 0 && (
          <span className={styles.stashEmpty}>The stash is empty</span>
        )}
        {stash.map((id, idx) => (
          <button
            key={`${id}-${idx}`}
            type="button"
            ref={el => { if (el) btnRefs.current[idx] = el; else delete btnRefs.current[idx]; }}
            className={`${styles.equipmentTag} ${styles.stashItemTag}`}
            aria-expanded={menu?.idx === idx}
            onClick={e => toggleMenu(idx, e.currentTarget)}
          >
            {labelFor(id)}
          </button>
        ))}
      </div>
      {menu && ReactDOM.createPortal(
        <div ref={menuRef} className={styles.dropdown} style={dropdownStyle(menu.pos)}>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => { const { idx } = menu; closeAfterAction(idx); onSell(idx, salePrice); }}
          >
            Sell<span className={styles.dropdownCost}>{salePrice}gc</span>
          </button>
          <button
            type="button"
            className={styles.dropdownItem}
            onClick={() => { const { idx } = menu; closeAfterAction(idx); onRemove(idx); }}
          >
            Remove
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
