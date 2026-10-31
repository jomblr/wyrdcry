import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { abilityStatChanges, currentKeywords, fighterAbilityIds, fightersData, hasTag, itemsData, weaponsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import EquipmentCell from './EquipmentCell';
import FighterAbilities, { fighterAbilities } from './FighterAbilities';
import FighterEditPanel from './FighterEditPanel';
import InfoSheet from './InfoSheet';
import StatSpinner from './StatSpinner';
import Tooltip from './Tooltip';
import FighterKeywords from './FighterKeywords';

interface Props {
  instance: FighterInstance;
  stash: string[];
  remainingGold: number;
  onSetName: (name: string) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canDuplicate: boolean;
  onSendToStash: (itemIdx: number) => void;
  onSell: (itemIdx: number, salePrice: number) => void;
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetTalents: (talents: string[]) => void;
  onSetCostOverride: (cost: number | null) => void;
  /** Other fighters' names, so a random name in the edit panel avoids them */
  otherNames: string[];
}

export default function FighterRow({ instance, stash, remainingGold, onSetName, onSetRenown, onSetEquipment, onSetPendingEquipment, onRemove, onDuplicate, canDuplicate, onSendToStash, onSell, onTakeFromStash, onSetStat, onSetNotes, onSetTalents, onSetCostOverride, otherNames }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editOpen, setEditOpen] = useState<false | 'equipment' | 'information'>(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const isBeast = profile ? hasTag(profile, 'BEAST') : false;
  const isThrall = profile ? hasTag(profile, 'THRALL') : false;
  const isDaemon = profile ? hasTag(profile, 'DAEMON') : false;
  const noEquipment = isBeast || isThrall || isDaemon;
  // The edit panel opens on Equipment unless there's nothing to equip (MUTANT daemons can grow weapons)
  const firstPane = noEquipment && !(profile && hasTag(profile, 'MUTANT')) ? 'information' : 'equipment';
  const noRenown = isBeast || isThrall;
  const fixedEquipment = (profile?.default_equipment ?? []).map(s => s.replace('weapon:', ''));

  // Pending: all equipment on a pending fighter is pending; on a purchased fighter,
  // only pendingEquipment is pending. Merge for display, track where pending starts.
  const pendingStartIndex = instance.isPending ? 0 : instance.equipment.length;
  const allEquipment = instance.isPending
    ? instance.equipment
    : [...instance.equipment, ...instance.pendingEquipment];

  const equipCost = instance.equipment.reduce((sum, eid) => {
    const w = weaponsData.find(x => x.id === eid);
    if (w) return sum + w.cost;
    const item = itemsData.find(x => x.id === eid);
    return sum + (item?.cost ?? 0);
  }, 0);
  const baseCost = instance.costOverride ?? profile?.cost ?? 0;
  const totalCost = baseCost + equipCost;

  function buildCostBreakdown(): string | undefined {
    const lines: string[] = [`Fighter: ${baseCost}gc`];
    instance.equipment.forEach(eid => {
      const w = weaponsData.find(x => x.id === eid);
      const item = itemsData.find(x => x.id === eid);
      const name = w?.name ?? item?.name ?? eid;
      const cost = w?.cost ?? item?.cost ?? 0;
      if (cost > 0) lines.push(`${name}: ${cost}gc`);
    });
    lines.push(`Total: ${totalCost}gc`);
    return lines.join('\n');
  }

  // Auto-apply defense bonus from equipped armour / shield
  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  // Changes from abilities the fighter has (Daemonic Chitin, injuries, …)
  const abilityIds = fighterAbilityIds(profile, instance);
  const abilityDelta = (key: StatKey) => abilityStatChanges(abilityIds, key).reduce((sum, c) => sum + c.value, 0);

  // Helper: resolved stat value (override ?? base) + any auto bonus
  function statVal(key: StatKey): number {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined ? override : base) + (key === 'defense' ? defenseBonus : 0) + abilityDelta(key);
  }
  function isModified(key: StatKey): boolean {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined && override !== base) || abilityDelta(key) !== 0;
  }

  function buildTooltip(key: StatKey): string | undefined {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    const bonus = key === 'defense' ? defenseBonus : 0;
    const hasManual = override !== undefined && override !== base;
    const hasBonus = bonus > 0;
    const abilityChanges = abilityStatChanges(abilityIds, key);
    if (!hasManual && !hasBonus && abilityChanges.length === 0) return undefined;
    const manualDelta = hasManual ? override! - base : 0;
    const lines: string[] = [`Base: ${base}`];
    if (manualDelta !== 0) lines.push(`Modifier: ${manualDelta > 0 ? '+' : ''}${manualDelta}`);
    if (hasBonus) {
      instance.equipment.forEach(eid => {
        const item = itemsData.find(x => x.id === eid);
        if (item?.effect?.characteristic === 'defense') {
          lines.push(`${item.name}: +${(item.effect as { bonus: number }).bonus}`);
        }
      });
    }
    abilityChanges.forEach(c => lines.push(`${c.name}: ${c.value > 0 ? '+' : ''}${c.value}`));
    lines.push(`Total: ${statVal(key)}`);
    return lines.join('\n');
  }

  function handleToggle() {
    if (menuOpen) { setMenuOpen(false); return; }
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
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
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

  if (!profile) return null;

  // Profile abilities, then talents, injuries and mutations taken in the campaign
  const abilities = fighterAbilities(fighterAbilityIds(profile, instance));

  const menu =
    menuOpen && pos
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            className={styles.dropdown}
            style={dropdownStyle(pos, true)}
          >
              <>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => { setMenuOpen(false); setEditOpen(firstPane); }}
                >
                  Edit fighter
                </button>
                <div className={styles.dropdownSep} />
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={handleDuplicate}
                  disabled={!canDuplicate}
                >
                  Duplicate fighter
                </button>
                <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); setConfirmRemove(true); }}>
                  Remove fighter
                </button>
              </>
          </div>,
          document.body,
        )
      : null;

  const openPanel = () => setEditOpen(firstPane);

  // All edits happen in the panel; a click anywhere on the row opens it. Clicks inside portals
  // (menu, info sheets, the panel itself) still bubble here through React, so only count clicks
  // whose target is really inside the row.
  function handleRowClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.target as Node)) return;
    openPanel();
  }

  return (
    <div ref={setNodeRef} className={`${styles.gridRow} ${styles.gridRowClickable}`} style={dragStyle} onClick={handleRowClick}>
      {/* Drag handle */}
      <div className={`${styles.cell} ${styles.cellCenter} ${styles.dragHandleCell} ${styles.noPrint}`}>
        <button
          type="button"
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Fighter name + type */}
      <div className={`${styles.cell} ${styles.fighterNameCell}`}>
        <div className={styles.fighterNameRow}>
          <span className={styles.nameInput}>{instance.customName}</span>
        </div>
        <span className={styles.fighterType}>{typeLabel}</span>
        <FighterKeywords keywords={currentKeywords(profile, instance)} />
      </div>

      {/* Stats — read-only here (edited in the panel); the tooltip still explains modifiers */}
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('move')} modified={isModified('move')} suffix='"'
          breakdown={buildTooltip('move')} onChange={v => onSetStat('move', v)} readonly />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('fight')} modified={isModified('fight')}
          breakdown={buildTooltip('fight')} onChange={v => onSetStat('fight', v)} readonly />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('shoot')} modified={isModified('shoot')}
          breakdown={buildTooltip('shoot')} onChange={v => onSetStat('shoot', v)} readonly />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner
          value={statVal('defense')}
          modified={isModified('defense') || defenseBonus > 0}
          breakdown={buildTooltip('defense')}
          onChange={v => onSetStat('defense', v - defenseBonus)}
          readonly
        />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('health')} modified={isModified('health')} step={2}
          breakdown={buildTooltip('health')} onChange={v => onSetStat('health', v)} readonly />
      </div>
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        <StatSpinner value={statVal('bravery')} modified={isModified('bravery')} suffix='+'
          min={2} max={6} invert breakdown={buildTooltip('bravery')}
          onChange={v => onSetStat('bravery', v)} readonly />
      </div>

      {/* Equipment */}
      <div className={styles.cell}>
        {/* For beasts, thralls and daemons the fixed weapons are natural ones */}
        <EquipmentCell
          equipment={allEquipment}
          pendingStartIndex={pendingStartIndex}
          fixedEquipment={fixedEquipment}
          fixedAreNatural={noEquipment}
        />
      </div>

      {/* Special rules — abilities as tags; notes (edited in the fighter panel) below so they still print */}
      <div className={`${styles.cell} ${styles.specialRulesCell}`}>
        {abilities.length > 0 && <FighterAbilities abilities={abilities} />}
        {instance.notes?.trim() && <div className={styles.fighterCardNotes}>{instance.notes}</div>}
        {abilities.length === 0 && !instance.notes?.trim() && <span className={styles.lockedCell}>—</span>}
      </div>

      {/* Renown */}
      <div className={`${styles.cell} ${styles.cellCenter} ${noRenown ? styles.lockedCell : ''}`}>
        {noRenown ? '—' : (
          <StatSpinner value={instance.renown} min={0} onChange={onSetRenown} readonly />
        )}
      </div>

      {/* Value — the base cost is adjusted in the fighter edit panel */}
      <div className={`${styles.cell} ${styles.cellCenter}`}>
        {(() => {
          const costBreakdown = buildCostBreakdown();
          const costSpan = (
            <span className={instance.isPending ? styles.pendingCost : undefined}>
              {totalCost}gc{instance.costOverride !== null && instance.costOverride !== undefined && instance.costOverride !== (profile?.cost ?? 0) ? '*' : ''}
            </span>
          );
          if (!costBreakdown) return costSpan;
          return (
            <Tooltip content={
              <div className="tooltip-breakdown">
                {costBreakdown.split('\n').map((line, i) => <span key={i}>{line}</span>)}
              </div>
            }>
              {costSpan}
            </Tooltip>
          );
        })()}
      </div>

      {/* Ellipsis menu */}
      <div className={`${styles.cell} ${styles.cellCenter} ${styles.noPrint}`}>
        <button
          type="button"
          ref={btnRef}
          className={styles.ellipsisBtn}
          onClick={e => { e.stopPropagation(); handleToggle(); }}
          aria-label="Fighter options"
        >
          <EllipsisVertical size={16} />
        </button>
        {menu}
        {confirmRemove && (
          <InfoSheet
            title={instance.customName || profile.name}
            subtitle="Remove fighter"
            onClose={() => setConfirmRemove(false)}
            actions={
              <>
                <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={() => setConfirmRemove(false)}>
                  Cancel
                </button>
                <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`} onClick={() => { setConfirmRemove(false); onRemove(); }}>
                  Remove
                </button>
              </>
            }
          >
            Remove this fighter from the warband? This can't be undone.
          </InfoSheet>
        )}
        {editOpen && (
          <FighterEditPanel
            initialPane={editOpen}
            instance={instance}
            remainingGold={remainingGold}
            onSetName={onSetName}
            onSetRenown={onSetRenown}
            onSetEquipment={onSetEquipment}
            onSetPendingEquipment={onSetPendingEquipment}
            onSendToStash={onSendToStash}
            onSell={onSell}
            stash={stash}
            onTakeFromStash={onTakeFromStash}
            onSetStat={onSetStat}
            onSetNotes={onSetNotes}
            onSetCostOverride={onSetCostOverride}
            onSetTalents={onSetTalents}
            otherNames={otherNames}
            onClose={() => setEditOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
