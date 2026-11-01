import React, { useState } from 'react';
import { isMutatedWeapon, itemsData, weaponsData } from './data';
import EquipmentInfoSheet from './EquipmentInfoSheet';
import { overLimitGear } from './EquipmentPicker';
import styles from './warband-builder.module.css';

function labelFor(id: string): string {
  return weaponsData.find(x => x.id === id)?.name ?? itemsData.find(x => x.id === id)?.name ?? id;
}

function costFor(id: string): number {
  return weaponsData.find(x => x.id === id)?.cost ?? itemsData.find(x => x.id === id)?.cost ?? 0;
}

interface Props {
  /** Bought copies first, then unbought ones from pendingStartIndex on */
  equipment: string[];
  pendingStartIndex: number;
  /** Gear that comes with the profile (hired swords' gear, or natural weapons) */
  fixedEquipment?: string[];
  /** The fixed gear is natural weapons (beasts, thralls, daemons) */
  fixedAreNatural?: boolean;
  /** Natural weapons from the fighter's mutations (Tentacles, …), shown after the fixed gear */
  grantedWeapons?: string[];
  /** Opens the panel's Equipment tab; without it an empty cell says "No equipment" */
  onAdd?: () => void;
}

/** Desktop table: the fighter's equipment as read-only tags. Tapping one shows its details. */
export default function EquipmentCell({ equipment, pendingStartIndex, fixedEquipment = [], fixedAreNatural = false, grantedWeapons = [], onAdd }: Props) {
  const [info, setInfo] = useState<{ id: string; natural: boolean } | null>(null);

  // Duplicates fold into one tag, "Club (x2)", as on mobile; bought and unbought copies stay separate.
  const fixedGroups: { id: string; count: number }[] = [];
  fixedEquipment.forEach(id => {
    const g = fixedGroups.find(x => x.id === id);
    if (g) g.count++; else fixedGroups.push({ id, count: 1 });
  });
  const groups: { id: string; count: number; pending: boolean }[] = [];
  equipment.forEach((id, idx) => {
    // Mutated weapons are never bought, so never shown as unbought
    const pending = idx >= pendingStartIndex && !isMutatedWeapon(id);
    const g = groups.find(x => x.id === id && x.pending === pending);
    if (g) g.count++; else groups.push({ id, count: 1, pending });
  });

  // Gear pushed out of its slot by a mutation's weapon; not for fighters that can't buy gear
  const overLimit = fixedAreNatural ? [] : overLimitGear(grantedWeapons, fixedEquipment, equipment);

  const open = (id: string, natural = false) => (e: React.MouseEvent) => { e.stopPropagation(); setInfo({ id, natural }); };

  return (
    <div className={styles.equipmentTags}>
      {/* Same tags as other weapons, as on the mobile card */}
      {fixedGroups.map(({ id, count }) => (
        <button type="button" key={`fixed-${id}`} className={styles.equipmentTag} onClick={open(id, fixedAreNatural)}>
          {labelFor(id)}{count > 1 && ` (x${count})`}
        </button>
      ))}
      {/* An older save may also hold the same weapon in its equipment: show it once */}
      {grantedWeapons.filter(id => !equipment.includes(id)).map(id => (
        <button type="button" key={`granted-${id}`} className={styles.equipmentTag} onClick={open(id, true)}>
          {labelFor(id)}
        </button>
      ))}
      {groups.map(({ id, count, pending }) => (
        <button
          type="button"
          key={`${id}-${pending}`}
          className={`${styles.equipmentTag} ${pending ? styles.equipmentTagPending : ''} ${overLimit.includes(id) ? styles.equipmentTagOverLimit : ''}`}
          onClick={open(id)}
        >
          {labelFor(id)}{count > 1 && ` (x${count})`}
          {pending && costFor(id) > 0 && ` (${costFor(id) * count}gc)`}
        </button>
      ))}
      {equipment.length === 0 && fixedEquipment.length === 0 && grantedWeapons.length === 0 && (onAdd ? (
        <button
          type="button"
          className={`${styles.lockedCell} ${styles.emptyCellPrompt}`}
          onClick={e => { e.stopPropagation(); onAdd(); }}
        >
          Add equipment
        </button>
      ) : <span className={styles.lockedCell}>No equipment</span>)}
      {info && <EquipmentInfoSheet id={info.id} natural={info.natural} onClose={() => setInfo(null)} />}
    </div>
  );
}
