import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './warband-builder.module.css';
import { factionsData, itemsData, weaponRulesData, weaponsData } from './data';

const armourItems = () => itemsData.filter(i => i.type === 'armour');
// Single-use and miscellaneous items: no slot cost, no faction gating — every warband can buy them
const gearItems = () => itemsData.filter(i => i.type === 'single-use' || i.type === 'miscellaneous');
const MELEE_SLOTS = 2;
const RANGED_SLOTS = 1;
const EXCLUSIVE_ARMOUR = ['light-armour', 'heavy-armour'];

function countSlots(ids: string[]): { melee: number; ranged: number } {
  let melee = 0, ranged = 0;
  const seenBrace = new Set<string>();
  for (const id of ids) {
    if (id === 'shield') { melee += 1; continue; }
    const w = weaponsData.find(x => x.id === id);
    if (!w) continue;
    if (w.type === 'melee') melee += w.special_rules.includes('two-handed') ? 2 : 1;
    else if (w.type === 'ranged') {
      if (w.special_rules.includes('brace')) {
        if (!seenBrace.has(id)) { ranged += 1; seenBrace.add(id); }
      } else {
        ranged += 1;
      }
    }
  }
  return { melee, ranged };
}

interface Props {
  /** Editable equipment only (purchased + pending, not fixed) */
  allEquipment: string[];
  /** Fixed/default equipment — counts toward slots but can't be removed */
  fixedEquipment: string[];
  /** Already-purchased equipment (subset of allEquipment); these weapons get a Stash button */
  purchasedEquipment: string[];
  factionId: string | null;
  isHero: boolean;
  isWizard: boolean;
  isBeast: boolean;
  remainingGold: number;
  onAdd: (id: string) => void;
  onRemoveLast: (id: string) => void;
  /** Send one purchased copy of this item to the warband stash */
  onStash: (id: string) => void;
}

interface WeaponStats { range: string; attacks: string; damage: string; rules: string[] }

/** Characteristics as in the weapon reference table: R, A, D (hit/crit) and special rules. */
function weaponStats(w: (typeof weaponsData)[number]): WeaponStats {
  return {
    range: `${w.range}"`,
    attacks: String(w.attacks),
    damage: `${w.hit}/${w.crit}`,
    rules: w.special_rules.map(id => weaponRulesData.find(r => r.id === id)?.name ?? id),
  };
}

/**
 * Sticky section heading; weapon sections also get the R / A / D column labels.
 * Pass `open` + `onToggle` to make the section foldable.
 */
function SectionHead({ title, weaponColumns, open, onToggle }: {
  title: React.ReactNode; weaponColumns?: boolean; open?: boolean; onToggle?: () => void;
}) {
  return (
    <div className={styles.equipHead}>
      {onToggle ? (
        <button
          type="button"
          className={`${styles.editPanelSectionTitle} ${styles.equipHeadToggle}`}
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {title}
        </button>
      ) : (
        <div className={styles.editPanelSectionTitle}>{title}</div>
      )}
      {weaponColumns && (
        <div className={`${styles.equipRow} ${styles.equipRowWeapon} ${styles.equipColumns}`}>
          <span>Weapon</span>
          <span className={styles.equipStat}>R</span>
          <span className={styles.equipStat}>A</span>
          <span className={styles.equipStat}>D</span>
          <span className={styles.equipPickerCost}>Cost</span>
        </div>
      )}
    </div>
  );
}

function EquipRow({ name, weapon, cost, qty, addDisabled, onAdd, onRemove, onStash }: {
  name: string; weapon?: WeaponStats; cost: number; qty: number;
  addDisabled: boolean; onAdd: () => void; onRemove: () => void;
  /** Set for purchased equipment: replaces the stepper with a Stash button */
  onStash?: () => void;
}) {
  return (
    <div className={`${styles.equipRow} ${weapon ? styles.equipRowWeapon : ''} ${addDisabled && qty === 0 ? styles.equipPickerRowDisabled : ''}`}>
      <span className={styles.equipPickerName}>
        {name}
        {weapon && weapon.rules.length > 0 && (
          <span className={styles.equipRules}>
            {weapon.rules.map(rule => <span key={rule}>{rule}</span>)}
          </span>
        )}
      </span>
      {weapon && (
        <>
          <span className={styles.equipStat}>{weapon.range}</span>
          <span className={styles.equipStat}>{weapon.attacks}</span>
          <span className={styles.equipStat}>{weapon.damage}</span>
        </>
      )}
      <span className={styles.equipPickerCost}>{`${cost}gc`}</span>
      {onStash ? (
        <button type="button" className={`${styles.panelStatControl} ${styles.equipStepper} ${styles.equipStashBtn}`} onClick={onStash}>
          Stash
        </button>
      ) : (
        <div className={`${styles.panelStatControl} ${styles.equipStepper}`}>
          <button type="button" className={styles.panelStatBtn} onClick={onRemove} disabled={qty === 0}>−</button>
          <span className={styles.panelStatValue}>{qty}</span>
          <button type="button" className={styles.panelStatBtn} onClick={onAdd} disabled={addDisabled}>+</button>
        </div>
      )}
    </div>
  );
}

export default function EquipmentPicker({
  allEquipment, fixedEquipment, purchasedEquipment, factionId, isHero, isWizard, isBeast, remainingGold, onAdd, onRemoveLast, onStash,
}: Props) {
  const [tradingPostOpen, setTradingPostOpen] = useState(false);
  const combinedIds = [...fixedEquipment, ...allEquipment];
  const slots = countSlots(combinedIds);
  const hasExclusiveArmour = EXCLUSIVE_ARMOUR.some(a => combinedIds.includes(a));

  const factionEquip = factionId
    ? (factionsData.find(f => f.id === factionId)?.equipment ?? {}) as Record<string, string>
    : {} as Record<string, string>;

  function factionAllows(id: string): boolean {
    const rule = factionEquip[id];
    if (!rule) return false;
    return rule === 'hero' ? isHero : true;
  }
  function factionAllowsArmour(id: string): boolean {
    const rule = factionEquip[`item:${id}`];
    if (!rule) return false;
    return rule === 'hero' ? isHero : true;
  }

  function editableQty(id: string) { return allEquipment.filter(x => x === id).length; }
  /** Stash button once a weapon is purchased; while a copy is still pending, keep the stepper so it can be undone. */
  function stashHandler(id: string): (() => void) | undefined {
    const purchased = purchasedEquipment.filter(x => x === id).length;
    return purchased > 0 && purchased === editableQty(id) ? () => onStash(id) : undefined;
  }
  function combinedQty(id: string) { return combinedIds.filter(x => x === id).length; }

  function canAddMelee(w: (typeof weaponsData)[0]): boolean {
    if (w.cost > remainingGold) return false;
    if (w.special_rules.includes('two-handed'))
      return !combinedIds.includes(w.id) && slots.melee + 2 <= MELEE_SLOTS;
    return combinedQty(w.id) < MELEE_SLOTS && slots.melee + 1 <= MELEE_SLOTS;
  }

  function canAddRanged(w: (typeof weaponsData)[0]): boolean {
    if (w.cost > remainingGold) return false;
    if (w.special_rules.includes('brace')) {
      const count = combinedQty(w.id);
      if (count === 0) return slots.ranged + 1 <= RANGED_SLOTS;
      if (count === 1) return true;
      return false;
    }
    return !combinedIds.includes(w.id) && slots.ranged + 1 <= RANGED_SLOTS;
  }

  function canAddArmour(item: ReturnType<typeof armourItems>[number]): boolean {
    if (isWizard) return false;
    if (item.id === 'shield')
      return !combinedIds.includes('shield') && slots.melee + 1 <= MELEE_SLOTS;
    return !hasExclusiveArmour && item.cost <= remainingGold;
  }

  // Gear has no slot cost and can be bought more than once
  function canAddGear(item: ReturnType<typeof gearItems>[number]): boolean {
    return item.cost <= remainingGold;
  }

  const meleeWeapons = weaponsData.filter(w => w.type === 'melee' && factionAllows(w.id));
  const rangedWeapons = weaponsData.filter(w => w.type === 'ranged' && factionAllows(w.id));
  const availableArmour = armourItems().filter(i => factionAllowsArmour(i.id));

  if (isBeast) return null;

  const tradingPostCount = allEquipment.filter(id => gearItems().some(i => i.id === id)).length;

  return (
    <div className={styles.equipPicker}>
      {meleeWeapons.length > 0 && (
        <div>
          <SectionHead title={<>Melee Weapon ({slots.melee}/{MELEE_SLOTS})</>} weaponColumns />
          {meleeWeapons.map(w => (
            <EquipRow
              key={w.id}
              name={w.name}
              weapon={weaponStats(w)}
              cost={w.cost}
              qty={editableQty(w.id)}
              addDisabled={!canAddMelee(w)}
              onAdd={() => onAdd(w.id)}
              onRemove={() => onRemoveLast(w.id)}
              onStash={stashHandler(w.id)}
            />
          ))}
        </div>
      )}

      {rangedWeapons.length > 0 && (
        <div>
          <SectionHead title={<>Ranged Weapon ({slots.ranged}/{RANGED_SLOTS})</>} weaponColumns />
          {rangedWeapons.map(w => (
            <EquipRow
              key={w.id}
              name={w.name}
              weapon={weaponStats(w)}
              cost={w.cost}
              qty={editableQty(w.id)}
              addDisabled={!canAddRanged(w)}
              onAdd={() => onAdd(w.id)}
              onRemove={() => onRemoveLast(w.id)}
              onStash={stashHandler(w.id)}
            />
          ))}
        </div>
      )}

      {availableArmour.length > 0 && (
        <div>
          <SectionHead title={<>Armour ({combinedIds.some(id => armourItems().find(a => a.id === id)) ? 1 : 0}/1)</>} />
          {availableArmour.map(item => (
            <EquipRow
              key={item.id}
              name={item.name}
              cost={item.cost}
              qty={editableQty(item.id)}
              addDisabled={!canAddArmour(item)}
              onAdd={() => onAdd(item.id)}
              onRemove={() => onRemoveLast(item.id)}
            />
          ))}
        </div>
      )}

      {gearItems().length > 0 && (
        <div>
          <SectionHead
            title={tradingPostCount > 0 && !tradingPostOpen ? `Trading Post (${tradingPostCount})` : 'Trading Post'}
            open={tradingPostOpen}
            onToggle={() => setTradingPostOpen(o => !o)}
          />
          {tradingPostOpen && gearItems().map(item => (
            <EquipRow
              key={item.id}
              name={item.name}
              cost={item.cost}
              qty={editableQty(item.id)}
              addDisabled={!canAddGear(item)}
              onAdd={() => onAdd(item.id)}
              onRemove={() => onRemoveLast(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
