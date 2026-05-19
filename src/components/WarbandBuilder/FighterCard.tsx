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
import StatSpinner from './StatSpinner';
import ValueModal from './ValueModal';
import Tooltip from './Tooltip';

interface Props {
  instance: FighterInstance;
  stash: string[];
  remainingGold: number;
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

const STATS: { key: StatKey; label: string; suffix?: string; step?: number; min?: number; max?: number; invert?: boolean }[] = [
  { key: 'move',    label: 'M', suffix: '"' },
  { key: 'fight',   label: 'F' },
  { key: 'shoot',   label: 'S' },
  { key: 'defense', label: 'D' },
  { key: 'health',  label: 'H', step: 2 },
  { key: 'bravery', label: 'B', suffix: '+', min: 2, max: 6, invert: true },
];

export default function FighterCard({
  instance, stash, remainingGold,
  onSetName, onSetXp, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onRemove, onDuplicate, canDuplicate,
  onTransferEquipment, onSendToStash, onTakeFromStash,
  onSetStat, onSetNotes, onSetCostOverride,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: instance.instanceId });

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 1 : undefined,
    position: 'relative',
  };

  const profile = fightersData.find(f => f.id === instance.fighterId);
  if (!profile) return null;

  const typeLabel = profile.name;
  const isHero = profile.keywords.includes('HERO') || instance.renown >= 4;
  const isWizard = profile.keywords.includes('WIZARD');
  const isBeast = profile.race.includes('BEAST');
  const isThrall = profile.race.includes('THRALL');
  const isDaemon = profile.race.includes('DAEMON');
  const noEquipment = isBeast || isThrall || isDaemon;
  const noXpRenown = isBeast || isThrall;
  const fixedEquipment = (profile.default_equipment ?? []).map(s => s.replace('weapon:', ''));

  const pendingStartIndex = instance.isPending ? 0 : instance.equipment.length;
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

  function buildCostBreakdown(): string | undefined {
    const lines: string[] = [`Fighter: ${baseCost}gc`];
    instance.equipment.forEach((eid, idx) => {
      if (eid === 'dagger' && instance.equipment.indexOf(eid) === idx) return;
      const w = weaponsData.find(x => x.id === eid);
      const item = itemsData.find(x => x.id === eid);
      const name = w?.name ?? item?.name ?? eid;
      const cost = w?.cost ?? item?.cost ?? 0;
      if (cost > 0) lines.push(`${name}: ${cost}gc`);
    });
    lines.push(`Total: ${totalCost}gc`);
    return lines.join('\n');
  }

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
    if (menuOpen) { setMenuOpen(false); setConfirmDelete(false); return; }
    if (btnRef.current) {
      setPos(calcDropdownPos(btnRef.current.getBoundingClientRect(), { alignRight: true }));
    }
    setMenuOpen(true);
  }

  function handleMenuClose() { setMenuOpen(false); setConfirmDelete(false); }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) { setMenuOpen(false); setConfirmDelete(false); }
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

  const menu = menuOpen && pos
    ? ReactDOM.createPortal(
        <div ref={menuRef} className={styles.dropdown} style={dropdownStyle(pos, true)}>
          {confirmDelete ? (
            <div className={styles.dropdownConfirm}>
              <span className={styles.dropdownConfirmLabel}>Remove fighter?</span>
              <div className={styles.dropdownConfirmActions}>
                <button
                  type="button"
                  className={`button button--danger button--md ${styles.dropdownConfirmYes}`}
                  onClick={() => { handleMenuClose(); onRemove(); }}
                >Yes</button>
                <button type="button" className={`button button--secondary button--md ${styles.dropdownConfirmNo}`} onClick={handleMenuClose}>No</button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onDuplicate(); }} disabled={!canDuplicate}>
                Duplicate fighter
              </button>
              <button type="button" className={styles.dropdownItem} onClick={() => setConfirmDelete(true)}>
                Remove fighter
              </button>
            </>
          )}
        </div>,
        document.body,
      )
    : null;

  const costBreakdown = buildCostBreakdown();
  const costSpan = (
    <span className={instance.isPending ? styles.pendingCost : undefined}>
      {totalCost}gc{instance.costOverride !== null && instance.costOverride !== undefined && instance.costOverride !== (profile?.cost ?? 0) ? '*' : ''}
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      className={`${styles.fighterCard} ${instance.isPending ? styles.fighterCardPending : ''}`}
      style={dragStyle}
    >
      {/* Header */}
      <div className={styles.fighterCardHeader}>
        <button type="button" className={styles.fighterCardDragHandle} {...attributes} {...listeners} aria-label="Drag to reorder">
          <GripVertical size={14} />
        </button>
        <div className={styles.fighterCardNameBlock}>
          <input
            className={styles.nameInput}
            value={instance.customName}
            onChange={e => onSetName(e.target.value)}
            aria-label="Fighter name"
          />
          <span className={styles.fighterType}>{typeLabel}</span>
        </div>
        <button type="button" ref={btnRef} className={styles.ellipsisBtn} onClick={handleToggle} aria-label="Fighter options">
          <EllipsisVertical size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className={styles.fighterCardStats}>
        {STATS.map(({ key, label, suffix, step, min, max, invert }) => (
          <div key={key} className={styles.fighterCardStat}>
            <span className={styles.fighterCardStatLabel}>{label}</span>
            <StatSpinner
              value={statVal(key)}
              modified={isModified(key) || (key === 'defense' && defenseBonus > 0)}
              suffix={suffix}
              step={step}
              min={min}
              max={max}
              invert={invert}
              breakdown={buildTooltip(key)}
              onChange={v => onSetStat(key, key === 'defense' ? v - defenseBonus : v)}
              readonly={isBeast}
            />
          </div>
        ))}
      </div>

      {/* Equipment */}
      {noEquipment ? (
        fixedEquipment.length > 0 && (
          <div className={styles.cellIndent}>
            {fixedEquipment.map((id, idx) => (
              <span key={`${id}-${idx}`} className={`${styles.equipmentTag} ${styles.equipmentTagFixed}`}>
                {weaponsData.find(w => w.id === id)?.name ?? id}
              </span>
            ))}
          </div>
        )
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
            if (instance.isPending) onSetEquipment([...instance.equipment, id]);
            else onSetPendingEquipment([...instance.pendingEquipment, id]);
          }}
          onRemoveAtIdx={idx => {
            if (instance.isPending) onSetEquipment(instance.equipment.filter((_, i) => i !== idx));
            else if (idx < instance.equipment.length) onSendToStash(idx);
            else onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== (idx - instance.equipment.length)));
          }}
          onSendToStash={mergedIdx => {
            if (instance.isPending) onSetEquipment(instance.equipment.filter((_, i) => i !== mergedIdx));
            else if (mergedIdx < instance.equipment.length) onSendToStash(mergedIdx);
            else onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== (mergedIdx - instance.equipment.length)));
          }}
          onTakeFromStash={onTakeFromStash}
          onTransferIn={(sourceId, itemId, itemIdx) => onTransferEquipment(sourceId, itemId, itemIdx)}
        />
      )}

      {/* Notes */}
      <SpecialRulesCell notes={instance.notes ?? ''} onChange={onSetNotes} />

      {/* Footer: XP / Renown / Value */}
      <div className={styles.fighterCardFooter}>
        {!noXpRenown && (
          <>
            <div className={styles.fighterCardFooterItem}>
              <span className={styles.fighterCardFooterLabel}>XP</span>
              <StatSpinner value={instance.xp} min={0} onChange={onSetXp} />
            </div>
            <div className={styles.fighterCardFooterItem}>
              <span className={styles.fighterCardFooterLabel}>R</span>
              <StatSpinner value={instance.renown} min={0} onChange={onSetRenown} />
            </div>
          </>
        )}
        <div className={`${styles.fighterCardFooterItem} ${styles.fighterCardFooterValue} ${instance.isPending ? styles.valueCell : ''}`}
          onClick={() => instance.isPending && setValueModalOpen(true)}
        >
          <span className={styles.fighterCardFooterLabel}>Value</span>
          {costBreakdown ? (
            <Tooltip content={
              <div className="tooltip-breakdown">
                {costBreakdown.split('\n').map((line, i) => <span key={i}>{line}</span>)}
              </div>
            }>
              {costSpan}
            </Tooltip>
          ) : costSpan}
        </div>
      </div>

      {menu}
      {valueModalOpen && (
        <ValueModal
          fighterName={instance.customName || profile?.name || 'Fighter'}
          baseCost={baseCost}
          equipment={instance.equipment}
          onCostChange={cost => onSetCostOverride(cost)}
          onClose={() => setValueModalOpen(false)}
        />
      )}
    </div>
  );
}
