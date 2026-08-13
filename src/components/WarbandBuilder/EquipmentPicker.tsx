import React from 'react';
import styles from './warband-builder.module.css';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import factionsData from '@site/src/data/factions.json';

const armourItems = itemsData.filter(i => i.type === 'armour');
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
  factionId: string | null;
  isHero: boolean;
  isWizard: boolean;
  isBeast: boolean;
  remainingGold: number;
  onAdd: (id: string) => void;
  onRemoveLast: (id: string) => void;
}

function EquipRow({ name, cost, qty, addDisabled, onAdd, onRemove }: {
  name: string; cost: number; qty: number;
  addDisabled: boolean; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className={`${styles.equipPickerRow} ${addDisabled && qty === 0 ? styles.equipPickerRowDisabled : ''}`}>
      <span className={styles.equipPickerName}>{name}</span>
      <span className={styles.equipPickerCost}>{`${cost}gc`}</span>
      <div className={styles.panelStatControl}>
        <button type="button" className={styles.panelStatBtn} onClick={onRemove} disabled={qty === 0}>−</button>
        <span className={styles.panelStatValue}>{qty}</span>
        <button type="button" className={styles.panelStatBtn} onClick={onAdd} disabled={addDisabled}>+</button>
      </div>
    </div>
  );
}

export default function EquipmentPicker({
  allEquipment, fixedEquipment, factionId, isHero, isWizard, isBeast, remainingGold, onAdd, onRemoveLast,
}: Props) {
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

  function canAddArmour(item: (typeof armourItems)[0]): boolean {
    if (isWizard) return false;
    if (item.id === 'shield')
      return !combinedIds.includes('shield') && slots.melee + 1 <= MELEE_SLOTS;
    return !hasExclusiveArmour && item.cost <= remainingGold;
  }

  const meleeWeapons = weaponsData.filter(w => w.type === 'melee' && factionAllows(w.id));
  const rangedWeapons = weaponsData.filter(w => w.type === 'ranged' && factionAllows(w.id));
  const availableArmour = armourItems.filter(i => factionAllowsArmour(i.id));

  if (isBeast) return null;

  return (
    <div className={styles.equipPicker}>
      {meleeWeapons.length > 0 && (
        <div>
          <div className={styles.editPanelSectionTitle}>
            Melee Weapon ({slots.melee}/{MELEE_SLOTS})
          </div>
          {meleeWeapons.map(w => (
            <EquipRow
              key={w.id}
              name={w.name}
              cost={w.cost}
              qty={editableQty(w.id)}
              addDisabled={!canAddMelee(w)}
              onAdd={() => onAdd(w.id)}
              onRemove={() => onRemoveLast(w.id)}
            />
          ))}
        </div>
      )}

      {rangedWeapons.length > 0 && (
        <div>
          <div className={styles.editPanelSectionTitle}>
            Ranged Weapon ({slots.ranged}/{RANGED_SLOTS})
          </div>
          {rangedWeapons.map(w => (
            <EquipRow
              key={w.id}
              name={w.name}
              cost={w.cost}
              qty={editableQty(w.id)}
              addDisabled={!canAddRanged(w)}
              onAdd={() => onAdd(w.id)}
              onRemove={() => onRemoveLast(w.id)}
            />
          ))}
        </div>
      )}

      {availableArmour.length > 0 && (
        <div>
          <div className={styles.editPanelSectionTitle}>
            Armour ({combinedIds.some(id => armourItems.find(a => a.id === id)) ? 1 : 0}/1)
          </div>
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
    </div>
  );
}
