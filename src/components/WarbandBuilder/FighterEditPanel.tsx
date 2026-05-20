import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import fightersData from '@site/src/data/fighters.json';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import EquipmentPicker from './EquipmentPicker';
import SpecialRulesCell from './SpecialRulesCell';
import ValueModal from './ValueModal';

interface Props {
  instance: FighterInstance;
  remainingGold: number;
  onSetName: (name: string) => void;
  onSetXp: (xp: number) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onSendToStash: (itemIdx: number) => void;
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
  onSetName, onSetXp, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onSendToStash,
  onSetStat, onSetNotes, onSetCostOverride,
  onClose,
}: Props) {
  const [valueModalOpen, setValueModalOpen] = useState(false);

  const profile = fightersData.find(f => f.id === instance.fighterId);
  if (!profile) return null;

  const isHero = profile.keywords.includes('HERO') || instance.renown >= 4;
  const isWizard = profile.keywords.includes('WIZARD');
  const isBeast = profile.race.includes('BEAST');
  const isThrall = profile.race.includes('THRALL');
  const isDaemon = profile.race.includes('DAEMON');
  const noEquipment = isBeast || isThrall || isDaemon;
  const noXpRenown = isBeast || isThrall;
  const fixedEquipment = (profile.default_equipment ?? []).map(s => s.replace('weapon:', ''));

  const allEquipment = instance.isPending
    ? instance.equipment
    : [...instance.equipment, ...instance.pendingEquipment];

  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  const equipCost = instance.equipment.reduce((sum, eid, idx) => {
    if (eid === 'dagger' && instance.equipment.indexOf(eid) === idx) return sum;
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
        </div>

        {/* Body */}
        <div className={styles.editPanelBody}>

          {/* Characteristics */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Characteristics</div>
            <div className={styles.editPanelStatsGrid}>
              {STAT_DEFS.map(({ key, label, suffix, step, min, max, invert }) => (
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

          {/* Equipment */}
          <div className={styles.editPanelSection}>
            {noEquipment ? (
              fixedEquipment.length > 0 ? (
                <>
                  <div className={styles.editPanelSectionTitle}>Equipment</div>
                  <div className={styles.editPanelFixedEquip}>
                    {fixedEquipment.map((id, idx) => (
                      <span key={`${id}-${idx}`} className={`${styles.equipmentTag} ${styles.equipmentTagFixed}`}>
                        {weaponsData.find(w => w.id === id)?.name ?? id}
                      </span>
                    ))}
                  </div>
                </>
              ) : null
            ) : (
              <EquipmentPicker
                allEquipment={allEquipment}
                fixedEquipment={fixedEquipment}
                factionId={profile.faction}
                isHero={isHero}
                isWizard={isWizard}
                isBeast={isBeast}
                remainingGold={remainingGold}
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
              />
            )}
          </div>

          {/* Notes */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Notes</div>
            <SpecialRulesCell notes={instance.notes ?? ''} onChange={onSetNotes} />
          </div>

          {/* XP / Renown */}
          {!noXpRenown && (
            <div className={styles.editPanelSection}>
              <div className={styles.editPanelSectionTitle}>Progress</div>
              <div className={styles.editPanelProgressRow}>
                <PanelStat label="XP" value={instance.xp} min={0} onChange={onSetXp} />
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
