import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './warband-builder.module.css';
import fightersData from '@site/src/data/fighters.json';
import { compareFightersByCostThenName } from '@site/src/components/wiki/factionUtils';
import type { FighterInstance } from './useWarband';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';

interface Props {
  factionId: string | null;
  currentFighters: FighterInstance[];
  atFighterLimit: boolean;
  remainingGold: number;
  onAdd: (fighterId: string, name: string) => void;
}

export default function AddFighterRow({ factionId, currentFighters, atFighterLimit, remainingGold, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const factionFighters = fightersData.filter(f => f.faction === factionId);
  const heroes = factionFighters.filter(f => f.keywords.includes('HERO')).sort(compareFightersByCostThenName);
  const henchmen = factionFighters
    .filter(f => !f.keywords.includes('HERO'))
    .sort(compareFightersByCostThenName);

  function countInRoster(fighterId: string) {
    return currentFighters.filter(f => f.fighterId === fighterId).length;
  }

  function isAtLimit(fighter: (typeof fightersData)[0]) {
    if (!('limit' in fighter) || fighter.limit == null) return false;
    return countInRoster(fighter.id) >= fighter.limit;
  }

  function canAfford(fighter: (typeof fightersData)[0]) {
    return fighter.cost <= remainingGold;
  }

  function limitLabel(fighter: (typeof fightersData)[0]) {
    if (!('limit' in fighter) || fighter.limit == null) return null;
    return `${countInRoster(fighter.id)} / ${fighter.limit}`;
  }

  function handleToggle() {
    if (open) { setOpen(false); return; }
    if (btnRef.current) {
      setPos(calcDropdownPos(btnRef.current.getBoundingClientRect()));
    }
    setOpen(true);
  }

  function handleSelect(fighter: (typeof fightersData)[0]) {
    setOpen(false);
    onAdd(fighter.id, 'New Fighter');
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const dropdown =
    open && pos
      ? ReactDOM.createPortal(
          <div ref={dropdownRef} className={styles.dropdown} style={dropdownStyle(pos)}>
            {heroes.length > 0 && (
              <>
                <div className={styles.dropdownGroup}>Heroes</div>
                {heroes.map(f => (
                  <button
                    key={f.id}
                    className={styles.dropdownItem}
                    disabled={isAtLimit(f) || !canAfford(f)}
                    onClick={() => handleSelect(f)}
                  >
                    <span>{f.name}{limitLabel(f) ? ` (${limitLabel(f)})` : ''}</span>
                    <span className={styles.dropdownCost}>{f.cost}gc</span>
                  </button>
                ))}
              </>
            )}
            {henchmen.length > 0 && (
              <>
                <div className={styles.dropdownGroup}>Henchmen</div>
                {henchmen.map(f => (
                  <button
                    key={f.id}
                    className={styles.dropdownItem}
                    disabled={isAtLimit(f) || !canAfford(f)}
                    onClick={() => handleSelect(f)}
                  >
                    <span>{f.name}{limitLabel(f) ? ` (${limitLabel(f)})` : ''}</span>
                    <span className={styles.dropdownCost}>{f.cost}gc</span>
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`${styles.gridRow} ${styles.addFighterRow}`}>
      <div className={`${styles.cell} ${styles.cellFull}`}>
        <button
          ref={btnRef}
          className={styles.addFighterBtn}
          onClick={handleToggle}
          disabled={!factionId || atFighterLimit}
          title={atFighterLimit ? 'Warband is at maximum size — remove a fighter to add another' : undefined}
        >
          Add fighter <span>▾</span>
        </button>
        {dropdown}
      </div>
    </div>
  );
}
