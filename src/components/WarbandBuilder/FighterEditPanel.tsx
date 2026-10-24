import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { fightersData, hasTag, itemsData, statLabels, weaponsData } from './data';
import EquipmentPicker, { NaturalWeapons } from './EquipmentPicker';
import SpecialRulesCell from './SpecialRulesCell';
import ValueModal from './ValueModal';

interface Props {
  instance: FighterInstance;
  remainingGold: number;
  onSetName: (name: string) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onSendToStash: (itemIdx: number) => void;
  stash: string[];
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetCostOverride: (cost: number | null) => void;
  onClose: () => void;
}

const STAT_DEFS: { key: StatKey; label: string; suffix?: string; step?: number; min?: number; max?: number; invert?: boolean }[] = [
  { key: 'move',    label: 'Move',    suffix: '"' },
  { key: 'fight',   label: 'Fight' },
  { key: 'shoot',   label: 'Shoot' },
  { key: 'defense', label: 'Defense' },
  { key: 'health',  label: 'Health',  step: 2 },
  { key: 'bravery', label: 'Bravery', suffix: '+', min: 2, max: 6, invert: true },
];

function PanelStat({ label, value, onChange, suffix = '', step = 1, min = 1, max, invert = false, modified = false, readonly = false }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; max?: number;
  invert?: boolean; modified?: boolean; readonly?: boolean;
}) {
  function raise() { const n = value + step; onChange(max !== undefined ? Math.min(max, n) : n); }
  function lower() { onChange(Math.max(min, value - step)); }
  const inc = invert ? lower : raise;
  const dec = invert ? raise : lower;
  return (
    <div className={styles.panelStat}>
      <span className={styles.panelStatLabel}>{label}</span>
      <div className={styles.panelStatControl}>
        {!readonly && <button type="button" className={styles.panelStatBtn} onClick={dec}>−</button>}
        <span className={`${styles.panelStatValue} ${modified ? styles.statModified : ''}`}>{value}{suffix}</span>
        {!readonly && <button type="button" className={styles.panelStatBtn} onClick={inc}>+</button>}
      </div>
    </div>
  );
}

export default function FighterEditPanel({
  instance, remainingGold,
  onSetName, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onSendToStash,
  stash,
  onTakeFromStash,
  onSetStat, onSetNotes, onSetCostOverride,
  onClose,
}: Props) {
  const [pane, setPane] = useState<'equipment' | 'information'>('equipment');
  const [valueModalOpen, setValueModalOpen] = useState(false);

  const profile = fightersData.find(f => f.id === instance.fighterId);
  // The label (Armour) comes from statLabels in gameData.
  const statDefs = STAT_DEFS.map(d => (d.key === 'defense' ? { ...d, label: statLabels().defense } : d));
  if (!profile) return null;

  const isHero = profile.keywords.includes('HERO') || instance.renown >= 4;
  const isWizard = profile.keywords.includes('WIZARD');
  const isBeast = hasTag(profile, 'BEAST');
  const isThrall = hasTag(profile, 'THRALL');
  const isDaemon = hasTag(profile, 'DAEMON');
  const noEquipment = isBeast || isThrall || isDaemon;
  const noRenown = isBeast || isThrall;
  const fixedEquipment = (profile.default_equipment ?? []).map(s => s.replace('weapon:', ''));

  const allEquipment = instance.isPending
    ? instance.equipment
    : [...instance.equipment, ...instance.pendingEquipment];

  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  const equipCost = instance.equipment.reduce((sum, eid) => {
    const w = weaponsData.find(x => x.id === eid);
    if (w) return sum + w.cost;
    const item = itemsData.find(x => x.id === eid);
    return sum + (item?.cost ?? 0);
  }, 0);
  const baseCost = instance.costOverride ?? profile.cost ?? 0;
  const totalCost = baseCost + equipCost;

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

  const panel = (
    <>
      <div className={styles.editPanelOverlay} onClick={onClose} />
      <div className={styles.editPanel}>
        <div className={styles.editPanelHandle} role="button" aria-label="Close panel" onClick={onClose} />

        {/* Header */}
        <div className={styles.editPanelTop}>
          <div className={styles.editPanelType}>{profile.name}</div>
          <input
            className={styles.editPanelNameInput}
            value={instance.customName}
            onChange={e => onSetName(e.target.value)}
            placeholder="Fighter name"
            aria-label="Fighter name"
          />
          <button type="button" className={styles.editPanelCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className={`${styles.tabToggle} ${styles.editPanelTabs}`} role="tablist" aria-label="Fighter section">
            <div className={`${styles.tabToggleInner} ${styles.tabToggleFullWidth}`} data-active={pane === 'equipment' ? 'fighters' : 'information'}>
              <span className={styles.tabToggleIndicator} aria-hidden />
              <button type="button" role="tab" aria-selected={pane === 'equipment'}
                className={`${styles.tabToggleBtn} ${pane === 'equipment' ? styles.tabToggleBtnActive : ''}`}
                onClick={() => setPane('equipment')}>Equipment</button>
              <button type="button" role="tab" aria-selected={pane === 'information'}
                className={`${styles.tabToggleBtn} ${pane === 'information' ? styles.tabToggleBtnActive : ''}`}
                onClick={() => setPane('information')}>Information</button>
            </div>
          </div>
        </div>

        {/* Body — keyed by pane so each opens scrolled to the top */}
        <div key={pane} className={styles.editPanelBody}>

          {pane === 'equipment' ? (
            <>
          {/* Equipment */}
          <div className={styles.editPanelSection}>
            {noEquipment ? (
              // Beasts, thralls and daemons can't buy equipment: just show what they're born with.
              <NaturalWeapons weaponIds={fixedEquipment} />
            ) : (
              <EquipmentPicker
                allEquipment={allEquipment}
                fixedEquipment={fixedEquipment}
                purchasedEquipment={instance.isPending ? [] : instance.equipment}
                factionId={profile.faction}
                isHero={isHero}
                isWizard={isWizard}
                isBeast={isBeast}
                remainingGold={remainingGold}
                stash={stash}
                onTakeFromStash={instance.isPending ? undefined : onTakeFromStash}
                onAdd={id => {
                  if (instance.isPending) onSetEquipment([...instance.equipment, id]);
                  else onSetPendingEquipment([...instance.pendingEquipment, id]);
                }}
                onRemoveLast={id => {
                  const lastIdx = allEquipment.lastIndexOf(id);
                  if (lastIdx === -1) return;
                  if (instance.isPending) {
                    onSetEquipment(instance.equipment.filter((_, i) => i !== lastIdx));
                  } else if (lastIdx < instance.equipment.length) {
                    onSendToStash(lastIdx);
                  } else {
                    const pendingIdx = lastIdx - instance.equipment.length;
                    onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== pendingIdx));
                  }
                }}
                onStash={id => {
                  const idx = instance.equipment.lastIndexOf(id);
                  if (idx !== -1) onSendToStash(idx);
                }}
              />
            )}
          </div>

            </>
          ) : (
            <>
          {/* Characteristics */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Characteristics</div>
            <div className={styles.editPanelStatsGrid}>
              {statDefs.map(({ key, label, suffix, step, min, max, invert }) => (
                <PanelStat
                  key={key}
                  label={label}
                  value={statVal(key)}
                  onChange={v => onSetStat(key, key === 'defense' ? v - defenseBonus : v)}
                  suffix={suffix}
                  step={step}
                  min={min}
                  max={max}
                  invert={invert}
                  modified={isModified(key) || (key === 'defense' && defenseBonus > 0)}
                  readonly={isBeast}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Notes</div>
            <SpecialRulesCell notes={instance.notes ?? ''} onChange={onSetNotes} />
          </div>

          {/* Renown */}
          {!noRenown && (
            <div className={styles.editPanelSection}>
              <div className={styles.editPanelSectionTitle}>Progress</div>
              <div className={styles.editPanelProgressRow}>
                <PanelStat label="Renown" value={instance.renown} min={0} onChange={onSetRenown} />
              </div>
            </div>
          )}

          {/* Value */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Value</div>
            <div
              className={`${styles.editPanelValue} ${instance.isPending ? styles.valueCell : ''}`}
              onClick={() => instance.isPending && setValueModalOpen(true)}
            >
              <span className={instance.isPending ? styles.pendingCost : undefined}>
                {totalCost}gc
                {instance.costOverride !== null && instance.costOverride !== undefined && instance.costOverride !== (profile?.cost ?? 0) ? '*' : ''}
              </span>
              {instance.isPending && <span className={styles.editPanelValueHint}>tap to adjust base cost</span>}
            </div>
          </div>

            </>
          )}
        </div>
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
    </>
  );

  return ReactDOM.createPortal(panel, document.body);
}
