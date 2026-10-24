import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { fightersData, hasTag, itemsData, weaponsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import EquipmentCell from './EquipmentCell';
import SpecialRulesCell from './SpecialRulesCell';
import ValueModal from './ValueModal';
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
  onTransferEquipment: (fromInstanceId: string, itemId: string, itemIdx: number) => void;
  onSendToStash: (itemIdx: number) => void;
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetCostOverride: (cost: number | null) => void;
}

export default function FighterRow({ instance, stash, remainingGold, onSetName, onSetRenown, onSetEquipment, onSetPendingEquipment, onRemove, onDuplicate, canDuplicate, onTransferEquipment, onSendToStash, onTakeFromStash, onSetStat, onSetNotes, onSetCostOverride }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
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
  const isBeast = profile ? hasTag(profile, 'BEAST') : false;
  const isThrall = profile ? hasTag(profile, 'THRALL') : false;
  const isDaemon = profile ? hasTag(profile, 'DAEMON') : false;
  const noEquipment = isBeast || isThrall || isDaemon;
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
        <FighterKeywords race={profile.race} keywords={profile.keywords} />
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
            equipment={allEquipment}
            pendingStartIndex={pendingStartIndex}
            fixedEquipment={fixedEquipment}
            stash={stash}
            factionId={profile.faction}
            isHero={isHero}
            isWizard={isWizard}
            isBeast={isBeast}
            isFighterPurchased={!instance.isPending}
            remainingGold={remainingGold}
            onAdd={id => {
              if (instance.isPending) {
                onSetEquipment([...instance.equipment, id]);
              } else {
                onSetPendingEquipment([...instance.pendingEquipment, id]);
              }
            }}
            onRemoveAtIdx={idx => {
              if (instance.isPending) {
                onSetEquipment(instance.equipment.filter((_, i) => i !== idx));
              } else if (idx < instance.equipment.length) {
                onSendToStash(idx);
              } else {
                onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== (idx - instance.equipment.length)));
              }
            }}
            onSendToStash={mergedIdx => {
              if (instance.isPending) {
                onSetEquipment(instance.equipment.filter((_, i) => i !== mergedIdx));
              } else if (mergedIdx < instance.equipment.length) {
                onSendToStash(mergedIdx);
              } else {
                onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== (mergedIdx - instance.equipment.length)));
              }
            }}
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

      {/* Renown */}
      <div className={`${styles.cell} ${styles.cellCenter} ${noRenown ? styles.lockedCell : ''}`}>
        {noRenown ? '—' : (
          <StatSpinner value={instance.renown} min={0} onChange={onSetRenown} />
        )}
      </div>

      {/* Value — clickable to edit base cost before purchase */}
      <div
        className={`${styles.cell} ${styles.cellCenter} ${instance.isPending ? styles.valueCell : ''}`}
        onClick={() => instance.isPending && setValueModalOpen(true)}
      >
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
      </div>
    </div>
  );
}
