import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import fightersData from '@site/src/data/fighters.json';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import EquipmentCell from './EquipmentCell';
import SpecialRulesCell from './SpecialRulesCell';
import ValueModal from './ValueModal';
import StatSpinner from './StatSpinner';
import Tooltip from './Tooltip';

interface Props {
  instance: FighterInstance;
  stash: string[];
  remainingGold: number;
  onSetName: (name: string) => void;
  onSetXp: (xp: number) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
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

export default function FighterRow({ instance, stash, remainingGold, onSetName, onSetXp, onSetRenown, onSetEquipment, onRemove, onDuplicate, canDuplicate, onTransferEquipment, onSendToStash, onTakeFromStash, onSetStat, onSetNotes, onSetCostOverride }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [equipMultiline, setEquipMultiline] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const equipCellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cell = equipCellRef.current;
    if (!cell) return;
    const check = () => {
      const inner = cell.firstElementChild as HTMLElement | null;
      if (!inner) return;
      setEquipMultiline(inner.clientHeight > 48);
    };
    const observer = new ResizeObserver(check);
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.instanceId });

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: 'relative',
  };

  const profile = fightersData.find(f => f.id === instance.fighterId);
  const typeLabel = profile?.name ?? '';
  const isHero = (profile?.keywords.includes('HERO') ?? false) || instance.renown >= 4;
  const isWizard = profile?.keywords.includes('WIZARD') ?? false;
  const isBeast = profile?.race.includes('BEAST') ?? false;
  const isThrall = profile?.race.includes('THRALL') ?? false;
  const isDaemon = profile?.race.includes('DAEMON') ?? false;
  const noEquipment = isBeast || isThrall || isDaemon;
  const noXpRenown = isBeast || isThrall;
  const fixedEquipment = (profile?.default_equipment ?? []).map(s => s.replace('weapon:', ''));

  const equipCost = instance.equipment.reduce((sum, eid, idx) => {
    if (eid === 'dagger' && instance.equipment.indexOf(eid) === idx) return sum; // first dagger is free
    const w = weaponsData.find(x => x.id === eid);
    if (w) return sum + w.cost;
    const item = itemsData.find(x => x.id === eid);
    return sum + (item?.cost ?? 0);
  }, 0);
  const baseCost = instance.costOverride ?? profile?.cost ?? 0;
  const totalCost = baseCost + equipCost;

  // Auto-apply defense bonus from equipped armour / shield
  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  // Helper: resolved stat value (override ?? base) + any auto bonus
  function statVal(key: StatKey): number {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined ? override : base) + (key === 'defense' ? defenseBonus : 0);
  }
  function isModified(key: StatKey): boolean {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return override !== undefined && override !== base;
  }

  function buildTooltip(key: StatKey): string | undefined {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    const bonus = key === 'defense' ? defenseBonus : 0;
    const hasManual = override !== undefined && override !== base;
    const hasBonus = bonus > 0;
    if (!hasManual && !hasBonus) return undefined;
    const lines: string[] = [`Base: ${base}`];
    if (hasManual) {
      const delta = override! - base;
      lines.push(`Manual: ${delta > 0 ? '+' : ''}${delta}`);
    }
    if (hasBonus) {
      instance.equipment.forEach(eid => {
        const item = itemsData.find(x => x.id === eid);
        if (item?.effect?.characteristic === 'defense') {
          lines.push(`${item.name}: +${(item.effect as { bonus: number }).bonus}`);
        }
      });
    }
    lines.push(`Total: ${statVal(key)}`);
    return lines.join('\n');
  }

  function handleToggle() {
    if (menuOpen) { setMenuOpen(false); setConfirmDelete(false); return; }
    if (btnRef.current) {
      setPos(calcDropdownPos(btnRef.current.getBoundingClientRect(), { alignRight: true }));
    }
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setConfirmDelete(false);
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
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menuOpen]);

  function handleDuplicate() {
    setMenuOpen(false);
    onDuplicate();
  }

  function handleMenuClose() {
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  if (!profile) return null;

  const menu =
    menuOpen && pos
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            className={styles.dropdown}
            style={dropdownStyle(pos, true)}
          >
            {confirmDelete ? (
              <div className={styles.dropdownConfirm}>
                <span className={styles.dropdownConfirmLabel}>Delete fighter?</span>
                <div className={styles.dropdownConfirmActions}>
                  <button
                    type="button"
                    className={`button button--danger button--md ${styles.dropdownConfirmYes}`}
                    onClick={() => {
                      handleMenuClose();
                      onRemove();
                    }}
                  >
                    Yes
                  </button>
                  <button type="button" className={`button button--secondary button--md ${styles.dropdownConfirmNo}`} onClick={handleMenuClose}>
                    No
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleDuplicate}
                  disabled={!canDuplicate}
                >
                  Duplicate fighter
                </button>
                <button type="button" className={styles.dropdownItem} onClick={() => setConfirmDelete(true)}>
                  Delete fighter
                </button>
              </>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={setNodeRef} className={styles.gridRow} style={dragStyle}>
      {/* Drag handle */}
      <div className={`${styles.cell} ${styles.cellCenter} ${styles.dragHandleCell}`}>
        <button
          type="button"
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Fighter name + type */}
      <div className={`${styles.cell} ${styles.fighterNameCell}`}>
        <div className={styles.fighterNameRow}>
          <input
            className={styles.nameInput}
            value={instance.customName}
            onChange={e => onSetName(e.target.value)}
            aria-label="Fighter name"
          />
        </div>
        <span className={styles.fighterType}>{typeLabel}</span>
      </div>

      {/* Stats — click/scroll spinners */}
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('move')} modified={isModified('move')} suffix='"'
          breakdown={buildTooltip('move')} onChange={v => onSetStat('move', v)} readonly={isBeast} />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('fight')} modified={isModified('fight')}
          breakdown={buildTooltip('fight')} onChange={v => onSetStat('fight', v)} readonly={isBeast} />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('shoot')} modified={isModified('shoot')}
          breakdown={buildTooltip('shoot')} onChange={v => onSetStat('shoot', v)} readonly={isBeast} />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner
          value={statVal('defense')}
          modified={isModified('defense') || defenseBonus > 0}
          breakdown={buildTooltip('defense')}
          onChange={v => onSetStat('defense', v - defenseBonus)}
          readonly={isBeast}
        />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('health')} modified={isModified('health')} step={2}
          breakdown={buildTooltip('health')} onChange={v => onSetStat('health', v)} readonly={isBeast} />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('bravery')} modified={isModified('bravery')} suffix='+'
          min={2} max={6} invert breakdown={buildTooltip('bravery')}
          onChange={v => onSetStat('bravery', v)} readonly={isBeast} />
      </div>

      {/* Equipment */}
      <div ref={equipCellRef} className={`${styles.cell} ${equipMultiline ? styles.cellTop : ''}`}>
        {noEquipment ? (
          fixedEquipment.length > 0
            ? <div className={styles.cellIndent}>{fixedEquipment.map((id, idx) => (
                <span key={`${id}-${idx}`} className={`${styles.equipmentTag} ${styles.equipmentTagFixed}`}>
                  {weaponsData.find(w => w.id === id)?.name ?? id}
                </span>
              ))}</div>
            : <span className={`${styles.lockedCell} ${styles.cellIndent}`}>—</span>
        ) : (
          <EquipmentCell
            instanceId={instance.instanceId}
            equipment={instance.equipment}
            fixedEquipment={fixedEquipment}
            stash={stash}
            factionId={profile.faction}
            isHero={isHero}
            isWizard={isWizard}
            isBeast={isBeast}
            remainingGold={remainingGold}
            onAdd={weaponId => onSetEquipment([...instance.equipment, weaponId])}
            onRemove={weaponId => onSetEquipment(instance.equipment.filter(id => id !== weaponId))}
            onSendToStash={onSendToStash}
            onTakeFromStash={onTakeFromStash}
            onTransferIn={(sourceId, itemId, itemIdx) => onTransferEquipment(sourceId, itemId, itemIdx)}
          />
        )}
      </div>

      {/* Notes */}
      <div className={styles.cell}>
        <SpecialRulesCell
          notes={instance.notes ?? ''}
          onChange={onSetNotes}
        />
      </div>

      {/* XP */}
      <div className={`${styles.cell} ${styles.cellCenter} ${noXpRenown ? styles.lockedCell : ''}`}>
        {noXpRenown ? '—' : (
          <StatSpinner value={instance.xp} min={0} onChange={onSetXp} />
        )}
      </div>

      {/* Renown */}
      <div className={`${styles.cell} ${styles.cellCenter} ${noXpRenown ? styles.lockedCell : ''}`}>
        {noXpRenown ? '—' : (
          <StatSpinner value={instance.renown} min={0} onChange={onSetRenown} />
        )}
      </div>

      {/* Value — clickable to edit base cost and see breakdown */}
      <div
        className={`${styles.cell} ${styles.cellCenter} ${styles.valueCell}`}
        onClick={() => setValueModalOpen(true)}
        title="Click to edit"
      >
        <span>{totalCost}gc{instance.costOverride !== null && instance.costOverride !== undefined && instance.costOverride !== (profile?.cost ?? 0) ? '*' : ''}</span>
      </div>
      {valueModalOpen && (
        <ValueModal
          fighterName={instance.customName || profile?.name || 'Fighter'}
          baseCost={baseCost}
          equipment={instance.equipment}
          onCostChange={cost => onSetCostOverride(cost)}
          onClose={() => setValueModalOpen(false)}
        />
      )}

      {/* Ellipsis menu */}
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <button
          type="button"
          ref={btnRef}
          className={styles.ellipsisBtn}
          onClick={handleToggle}
          aria-label="Fighter options"
        >
          <EllipsisVertical size={16} />
        </button>
        {menu}
      </div>
    </div>
  );
}
