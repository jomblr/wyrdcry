import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical, Pencil } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import fightersData from '@site/src/data/fighters.json';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import FighterEditPanel from './FighterEditPanel';

interface Props {
  instance: FighterInstance;
  stash: string[];
  remainingGold: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetName: (name: string) => void;
  onSetXp: (xp: number) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canDuplicate: boolean;
  onTransferEquipment: (fromInstanceId: string, itemId: string, itemIdx: number) => void;
  onSendToStash: (itemIdx: number) => void;
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetCostOverride: (cost: number | null) => void;
}

const STAT_KEYS: { key: StatKey; label: string; suffix?: string }[] = [
  { key: 'move',    label: 'M', suffix: '"' },
  { key: 'fight',   label: 'F' },
  { key: 'shoot',   label: 'S' },
  { key: 'defense', label: 'D' },
  { key: 'health',  label: 'H' },
  { key: 'bravery', label: 'B', suffix: '+' },
];

export default function FighterCard({
  instance, stash, remainingGold,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
  onSetName, onSetXp, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onRemove, onDuplicate, canDuplicate,
  onTransferEquipment, onSendToStash, onTakeFromStash,
  onSetStat, onSetNotes, onSetCostOverride,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = fightersData.find(f => f.id === instance.fighterId);
  if (!profile) return null;

  const isBeast = profile.race.includes('BEAST');
  const isThrall = profile.race.includes('THRALL');
  const isDaemon = profile.race.includes('DAEMON');
  const noXpRenown = isBeast || isThrall;

  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  function statVal(key: StatKey): number {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined ? override : base) + (key === 'defense' ? defenseBonus : 0);
  }

  function isModified(key: StatKey): boolean {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined && override !== base) || (key === 'defense' && defenseBonus > 0);
  }

  const allEquipment = instance.isPending
    ? instance.equipment
    : [...instance.equipment, ...instance.pendingEquipment];

  const equipCost = instance.equipment.reduce((sum, eid, idx) => {
    if (eid === 'dagger' && instance.equipment.indexOf(eid) === idx) return sum;
    const w = weaponsData.find(x => x.id === eid);
    if (w) return sum + w.cost;
    const item = itemsData.find(x => x.id === eid);
    return sum + (item?.cost ?? 0);
  }, 0);
  const baseCost = instance.costOverride ?? profile.cost ?? 0;
  const totalCost = baseCost + equipCost;

  function handleMenuToggle() {
    if (menuOpen) { setMenuOpen(false); setConfirmDelete(false); return; }
    if (btnRef.current) setPos(calcDropdownPos(btnRef.current.getBoundingClientRect(), { alignRight: true }));
    setMenuOpen(true);
  }

  function handleMenuClose() { setMenuOpen(false); setConfirmDelete(false); }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setMenuOpen(false); setConfirmDelete(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => { setMenuOpen(false); setConfirmDelete(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [menuOpen]);

  const menu = menuOpen && pos
    ? ReactDOM.createPortal(
        <div ref={menuRef} className={styles.dropdown} style={dropdownStyle(pos, true)}>
          {confirmDelete ? (
            <div className={styles.dropdownConfirm}>
              <span className={styles.dropdownConfirmLabel}>Remove fighter?</span>
              <div className={styles.dropdownConfirmActions}>
                <button type="button" className={`button button--danger button--md ${styles.dropdownConfirmYes}`} onClick={() => { handleMenuClose(); onRemove(); }}>Yes</button>
                <button type="button" className={`button button--secondary button--md ${styles.dropdownConfirmNo}`} onClick={handleMenuClose}>No</button>
              </div>
            </div>
          ) : (
            <>
              {canMoveUp && <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); onMoveUp(); }}>Move up</button>}
              {canMoveDown && <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); onMoveDown(); }}>Move down</button>}
              {(canMoveUp || canMoveDown) && <div className={styles.dropdownSep} />}
              <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onDuplicate(); }} disabled={!canDuplicate}>Duplicate fighter</button>
              <button type="button" className={styles.dropdownItem} onClick={() => setConfirmDelete(true)}>Remove fighter</button>
            </>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`${styles.fighterCard} ${instance.isPending ? styles.fighterCardPending : ''}`}>

      {/* Header */}
      <div className={styles.fighterCardHeader}>
        <div className={styles.fighterCardNameBlock}>
          <span className={styles.fighterCardName}>{instance.customName || <span className={styles.fighterCardNameEmpty}>Unnamed</span>}</span>
          <span className={styles.fighterType}>{profile.name}</span>
        </div>
        <button type="button" className={styles.editBtn} onClick={() => setEditOpen(true)} aria-label="Edit fighter">
          <Pencil size={15} />
        </button>
        <button type="button" ref={btnRef} className={styles.ellipsisBtn} onClick={handleMenuToggle} aria-label="Fighter options">
          <EllipsisVertical size={16} />
        </button>
      </div>

      {/* Stats table — static values */}
      <div className={styles.tableWrapper}>
        <div className={`${styles.wbGrid} ${styles.fighterCardStatsGrid}`}>
          <div className={styles.gridHeader}>
            {STAT_KEYS.map(({ label }) => (
              <div key={label} className={`${styles.hCell} ${styles.hCellCenter}`}>{label}</div>
            ))}
          </div>
          <div className={`${styles.gridRow} ${styles.gridRowNoHover}`}>
            {STAT_KEYS.map(({ key, suffix }) => (
              <div key={key} className={`${styles.cell} ${styles.cellCenter}`}>
                <span className={isModified(key) ? styles.statModified : undefined}>
                  {statVal(key)}{suffix}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equipment — static tags */}
      {allEquipment.length > 0 && (
        <div className={styles.fighterCardEquipList}>
          {allEquipment.map((eid, idx) => {
            const isPending = !instance.isPending && idx >= instance.equipment.length;
            const w = weaponsData.find(x => x.id === eid);
            const item = itemsData.find(x => x.id === eid);
            const name = w?.name ?? item?.name ?? eid;
            return (
              <span
                key={`${eid}-${idx}`}
                className={`${styles.equipmentTag} ${isPending ? styles.equipmentTagPending : ''}`}
              >
                {name}
              </span>
            );
          })}
        </div>
      )}

      {/* Notes — static text */}
      {instance.notes?.trim() && (
        <p className={styles.fighterCardNotes}>{instance.notes}</p>
      )}

      {/* Footer */}
      <div className={styles.fighterCardFooter}>
        {!noXpRenown && (
          <>
            <div className={styles.fighterCardFooterItem}>
              <span className={styles.fighterCardFooterLabel}>XP</span>
              <span>{instance.xp}</span>
            </div>
            <div className={styles.fighterCardFooterItem}>
              <span className={styles.fighterCardFooterLabel}>R</span>
              <span>{instance.renown}</span>
            </div>
          </>
        )}
        <div className={`${styles.fighterCardFooterItem} ${styles.fighterCardFooterValue}`}>
          <span className={instance.isPending ? styles.pendingCost : undefined}>{totalCost}gc</span>
        </div>
      </div>

      {menu}

      {editOpen && (
        <FighterEditPanel
          instance={instance}
          stash={stash}
          remainingGold={remainingGold}
          onSetName={onSetName}
          onSetXp={onSetXp}
          onSetRenown={onSetRenown}
          onSetEquipment={onSetEquipment}
          onSetPendingEquipment={onSetPendingEquipment}
          onTransferEquipment={onTransferEquipment}
          onSendToStash={onSendToStash}
          onTakeFromStash={onTakeFromStash}
          onSetStat={onSetStat}
          onSetNotes={onSetNotes}
          onSetCostOverride={onSetCostOverride}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
