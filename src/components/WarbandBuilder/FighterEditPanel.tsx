import React, { useEffect, useId, useState } from 'react';
import ReactDOM from 'react-dom';
import { Dices, X } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { fightersData, hasTag, isMutatedWeapon, itemsData, statLabels, weaponsData } from './data';
import EquipmentPicker, { NaturalWeapons } from './EquipmentPicker';
import TalentPicker from './TalentPicker';
import SpecialRulesCell from './SpecialRulesCell';
import { newFighterName } from './names';
import { salePriceFor } from './WarbandStash';

interface Props {
  instance: FighterInstance;
  remainingGold: number;
  onSetName: (name: string) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onSendToStash: (itemIdx: number) => void;
  onSell: (itemIdx: number, salePrice: number) => void;
  stash: string[];
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetCostOverride: (cost: number | null) => void;
  onSetTalents: (talents: string[]) => void;
  onClose: () => void;
  /** Which pane opens first */
  initialPane?: 'equipment' | 'information';
  /** Other fighters' names, so a random name avoids them */
  otherNames: string[];
}

const STAT_DEFS: { key: StatKey; label: string; suffix?: string; step?: number; min?: number; max?: number; invert?: boolean }[] = [
  { key: 'move',    label: 'Move',    suffix: '"' },
  { key: 'fight',   label: 'Fight' },
  { key: 'shoot',   label: 'Shoot' },
  { key: 'defense', label: 'Defense' },
  { key: 'health',  label: 'Health',  step: 2 },
  { key: 'bravery', label: 'Bravery', suffix: '+', min: 2, max: 6, invert: true },
];

export function PanelStat({ label, value, onChange, suffix = '', step = 1, min = 1, max, invert = false, modified = false, readonly = false }: {
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
      {/* Locked stats keep their buttons, disabled, so every box has the same layout */}
      <div className={`${styles.panelStatControl} ${readonly ? styles.panelStatControlDisabled : ''}`}>
        <button type="button" className={styles.panelStatBtn} onClick={dec} disabled={readonly} aria-label={`Lower ${label}`}>−</button>
        <span className={`${styles.panelStatValue} ${modified ? styles.statModified : ''}`}>{value}{suffix}</span>
        <button type="button" className={styles.panelStatBtn} onClick={inc} disabled={readonly} aria-label={`Raise ${label}`}>+</button>
      </div>
    </div>
  );
}

/** Typed-in cost in the same box as the steppers, no buttons. Saves on Enter or when leaving the field. */
function CostField({ label, value, locked, onCommit }: { label: string; value: number; locked: boolean; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const id = useId();
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0 && n !== value) onCommit(n);
    else setDraft(String(value));
  }

  return (
    <div className={styles.panelStat}>
      <label className={styles.panelStatLabel} htmlFor={id}>{label}</label>
      <div className={`${styles.panelStatControl} ${styles.panelCostControl} ${locked ? styles.panelStatControlDisabled : ''}`}>
        <input
          id={id}
          className={`${styles.panelStatValue} ${styles.panelCostInput}`}
          type="text"
          inputMode="numeric"
          value={draft}
          // Digits only, so `ch` (width of "0") fits the number exactly and "gc" sits right after it
          style={{ width: `${Math.max(draft.length, 1)}ch` }}
          disabled={locked}
          onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        <span className={styles.panelStatValue}>gc</span>
      </div>
    </div>
  );
}

export default function FighterEditPanel({
  instance, remainingGold,
  onSetName, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onSendToStash,
  onSell,
  stash,
  onTakeFromStash,
  onSetStat, onSetNotes, onSetCostOverride, onSetTalents,
  onClose,
  initialPane = 'equipment',
  otherNames,
}: Props) {
  const [pane, setPane] = useState<'equipment' | 'talents' | 'information'>(initialPane);

  const profile = fightersData.find(f => f.id === instance.fighterId);
  // The label (Armour) comes from statLabels in gameData.
  const statDefs = STAT_DEFS.map(d => (d.key === 'defense' ? { ...d, label: statLabels().defense } : d));
  if (!profile) return null;

  const isHero = profile.keywords.includes('HERO') || instance.renown >= 4;
  const isWizard = profile.keywords.includes('WIZARD');
  const isBeast = hasTag(profile, 'BEAST');
  const isThrall = hasTag(profile, 'THRALL');
  const isDaemon = hasTag(profile, 'DAEMON');
  const isMutant = hasTag(profile, 'MUTANT');
  const profileRules = profile.faction_ability_ids ?? [];
  // Special rules tab for fighters with rules of their own, or that can take heroic talents and
  // injuries (heroes) or mutations (MUTANTs)
  const tabs: { id: 'equipment' | 'talents' | 'information'; label: string }[] = [
    { id: 'equipment', label: 'Equipment' },
    ...(profileRules.length > 0 || isHero || isMutant ? [{ id: 'talents' as const, label: 'Special rules' }] : []),
    { id: 'information', label: 'Information' },
  ];
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

  const baseCost = instance.costOverride ?? profile.cost ?? 0;

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

  // Bought gear waits in pendingEquipment until Purchase; a mutated weapon isn't bought, so it
  // goes straight onto the fighter
  const onAddItem = (id: string) => {
    if (instance.isPending || isMutatedWeapon(id)) onSetEquipment([...instance.equipment, id]);
    else onSetPendingEquipment([...instance.pendingEquipment, id]);
  };
  const onRemoveLastItem = (id: string) => {
    const lastIdx = allEquipment.lastIndexOf(id);
    if (lastIdx === -1) return;
    if (isMutatedWeapon(id) && lastIdx < instance.equipment.length) {
      // Not stashed: a mutation can't be handed to another fighter
      onSetEquipment(instance.equipment.filter((_, i) => i !== lastIdx));
    } else if (instance.isPending) {
      onSetEquipment(instance.equipment.filter((_, i) => i !== lastIdx));
    } else if (lastIdx < instance.equipment.length) {
      onSendToStash(lastIdx);
    } else {
      const pendingIdx = lastIdx - instance.equipment.length;
      onSetPendingEquipment(instance.pendingEquipment.filter((_, i) => i !== pendingIdx));
    }
  };
  const onStashItem = (id: string) => {
    const idx = instance.equipment.lastIndexOf(id);
    if (idx !== -1) onSendToStash(idx);
  };
  const onSellItem = (id: string) => {
    const idx = instance.equipment.lastIndexOf(id);
    const cost = weaponsData.find(w => w.id === id)?.cost ?? itemsData.find(i => i.id === id)?.cost ?? 0;
    if (idx !== -1) onSell(idx, salePriceFor(cost));
  };

  const panel = (
    <>
      <div className={styles.editPanelOverlay} onClick={onClose} />
      <div className={styles.editPanel}>
        {/* Header */}
        <div className={styles.editPanelTop}>
          <div className={styles.editPanelType}>{profile.name}</div>
          <div className={styles.editPanelNameRow}>
            {/* Beasts and thralls keep their profile name, so there's nothing to reroll */}
            {!isBeast && !isThrall && (
              <button
                type="button"
                className={styles.editPanelNameRandom}
                onClick={() => onSetName(newFighterName(profile, [...otherNames, instance.customName]))}
                aria-label="Random name"
                title="Random name"
              >
                <Dices size={18} />
              </button>
            )}
            <input
              className={styles.editPanelNameInput}
              value={instance.customName}
              onChange={e => onSetName(e.target.value)}
              placeholder="Fighter name"
              aria-label="Fighter name"
            />
          </div>
          <button type="button" className={styles.editPanelCloseBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className={`${styles.tabToggle} ${styles.editPanelTabs}`} role="tablist" aria-label="Fighter section">
            <div
              className={`${styles.tabToggleInner} ${styles.tabToggleFullWidth}`}
              style={{ '--tab-count': tabs.length, '--tab-index': Math.max(0, tabs.findIndex(t => t.id === pane)) } as React.CSSProperties}
            >
              <span className={styles.tabToggleIndicator} aria-hidden />
              {tabs.map(t => (
                <button key={t.id} type="button" role="tab" aria-selected={pane === t.id}
                  className={`${styles.tabToggleBtn} ${pane === t.id ? styles.tabToggleBtnActive : ''}`}
                  onClick={() => setPane(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Body — keyed by pane so each opens scrolled to the top */}
        <div key={pane} className={styles.editPanelBody}>

          {pane === 'talents' ? (
            <div className={styles.editPanelSection}>
              <TalentPicker profileRules={profileRules} talents={instance.talents ?? []} isHero={isHero} isMutant={isMutant} onChange={onSetTalents} />
            </div>
          ) : pane === 'equipment' ? (
            <>
          {/* Equipment */}
          <div className={styles.editPanelSection}>
            {noEquipment ? (
              // Beasts, thralls and daemons can't buy equipment: just show what they're born with.
              // MUTANTs among them (the Possessed) can still grow the mutated weapons.
              <>
                {!isMutant && <NaturalWeapons weaponIds={fixedEquipment} />}
                {isMutant && (
                  <EquipmentPicker
                    mutatedOnly
                    naturalWeapons={fixedEquipment}
                    allEquipment={allEquipment}
                    fixedEquipment={[]}
                    purchasedEquipment={instance.isPending ? [] : instance.equipment}
                    factionId={profile.faction}
                    isHero={isHero}
                    isWizard={isWizard}
                    isBeast={false}
                    remainingGold={remainingGold}
                    onAdd={onAddItem}
                    onRemoveLast={onRemoveLastItem}
                    onStash={onStashItem}
                    onSell={onSellItem}
                  />
                )}
              </>
            ) : (
              <EquipmentPicker
                isMutant={isMutant}
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
                onAdd={onAddItem}
                onRemoveLast={onRemoveLastItem}
                onStash={onStashItem}
                onSell={onSellItem}
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
                  // Armour comes from the profile plus armour items, so it isn't set by hand
                  readonly={isBeast || key === 'defense'}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelSectionTitle}>Notes</div>
            <SpecialRulesCell notes={instance.notes ?? ''} onChange={onSetNotes} />
          </div>

          {/* Renown and recruitment cost side by side, in the Characteristics grid. The cost
              can only change before the fighter is bought. */}
          <div className={styles.editPanelSection}>
            <div className={styles.editPanelStatsGrid}>
              {!noRenown && <PanelStat label="Renown" value={instance.renown} min={0} onChange={onSetRenown} />}
              <CostField label="Recruitment cost" value={baseCost} locked={!instance.isPending} onCommit={onSetCostOverride} />
            </div>
          </div>

            </>
          )}
        </div>

        <div className={styles.infoSheetActions}>
          <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`} onClick={onClose}>
            Done
          </button>
        </div>
      </div>

    </>
  );

  return ReactDOM.createPortal(panel, document.body);
}
