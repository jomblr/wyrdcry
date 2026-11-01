import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import EquipmentInfoSheet from './EquipmentInfoSheet';
import { salePriceFor } from './WarbandStash';
import styles from './warband-builder.module.css';
import { factionsData, isMutatedWeapon, itemsData, weaponsData } from './data';

const armourItems = () => itemsData.filter(i => i.type === 'armour');
// Single-use and miscellaneous items: no slot cost, no faction gating — every warband can buy them
const gearItems = () => itemsData.filter(i => i.type === 'single-use' || i.type === 'miscellaneous');
const MELEE_SLOTS = 2;
const RANGED_SLOTS = 1;
const EXCLUSIVE_ARMOUR = ['light-armour', 'heavy-armour'];

/** Which slots a piece of gear fills, if any. */
function slotOf(id: string): 'melee' | 'ranged' | null {
  if (id === 'shield') return 'melee';
  const w = weaponsData.find(x => x.id === id);
  if (!w) return null;
  if (w.type === 'melee' || isMutatedWeapon(id)) return 'melee';
  return w.type === 'ranged' ? 'ranged' : null;
}

/**
 * Gear that no longer fits: a mutation's natural weapon fills a slot, so a fighter who already
 * had two melee weapons now has one too many. Every piece of gear in the overfull slot type is
 * returned, since the player chooses which to stash or sell.
 */
export function overLimitGear(naturalIds: string[], fixedIds: string[], equipmentIds: string[]): string[] {
  const { melee, ranged } = countSlots([...naturalIds, ...fixedIds, ...equipmentIds]);
  return equipmentIds.filter(id =>
    (melee > MELEE_SLOTS && slotOf(id) === 'melee') || (ranged > RANGED_SLOTS && slotOf(id) === 'ranged'));
}

function countSlots(ids: string[]): { melee: number; ranged: number } {
  let melee = 0, ranged = 0;
  const seenBrace = new Set<string>();
  for (const id of ids) {
    if (id === 'shield') { melee += 1; continue; }
    const w = weaponsData.find(x => x.id === id);
    if (!w) continue;
    // A mutation's natural weapon (Tentacles, …) takes melee slots like any melee weapon
    if (w.type === 'melee' || isMutatedWeapon(id)) melee += w.special_rules.includes('two-handed') ? 2 : 1;
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
  /** Sell one purchased copy of this item */
  onSell: (id: string) => void;
  /** Items in the warband stash this fighter can take for free (purchased fighters only). */
  stash?: string[];
  onTakeFromStash?: (id: string) => void;
  /**
   * Weapons the fighter's mutations give it, listed first in Current equipment. They can't be
   * stashed, sold or removed here, and they fill melee slots.
   */
  naturalWeapons?: string[];
}

/**
 * Sticky section heading. Pass `open` + `onToggle` to make the section foldable.
 */
export function SectionHead({ title, open, onToggle }: {
  title: React.ReactNode; open?: boolean; onToggle?: () => void;
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
    </div>
  );
}

/** Item name with a dotted underline; tapping opens its details. */
function InfoName({ id, name, natural }: { id: string; name: string; natural?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.equipInfoName} onClick={() => setOpen(true)}>{name}</button>
      {open && <EquipmentInfoSheet id={id} natural={natural} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Catalogue row: name, price and Add. */
function EquipRow({ id, name, cost, addDisabled, onAdd }: {
  id: string; name: string;
  /** Omitted for stash items, which are free */
  cost?: number;
  addDisabled: boolean; onAdd: () => void;
}) {
  return (
    <div className={`${styles.equipRow} ${addDisabled ? styles.equipPickerRowDisabled : ''}`}>
      <span className={styles.equipPickerName}><InfoName id={id} name={name} /></span>
      {/* Empty cost cell for stash items keeps the Add buttons in one column */}
      <span className={styles.equipPickerCost}>{cost !== undefined && `${cost}gc`}</span>
      <button type="button" className={`${styles.equipActionBtn} ${styles.equipActionBtnNeutral}`} onClick={onAdd} disabled={addDisabled}>
        Add
      </button>
    </div>
  );
}

/** Read-only list for fighters that can't buy equipment (beasts, thralls, daemons). */
export function NaturalWeapons({ weaponIds }: { weaponIds: string[] }) {
  const weapons = weaponIds.flatMap(id => weaponsData.filter(w => w.id === id));
  if (weapons.length === 0) return null;
  return (
    <div className={styles.equipPicker}>
      <div>
        <SectionHead title={weapons.length > 1 ? 'Natural Weapons' : 'Natural Weapon'} />
        {weapons.map((w, i) => (
          <div key={`${w.id}-${i}`} className={styles.equipRow}>
            <span className={styles.equipPickerName}><InfoName id={w.id} name={w.name} natural /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function nameOf(id: string): string {
  return weaponsData.find(w => w.id === id)?.name ?? itemsData.find(i => i.id === id)?.name ?? id;
}
function costOf(id: string): number {
  return weaponsData.find(w => w.id === id)?.cost ?? itemsData.find(i => i.id === id)?.cost ?? 0;
}

/**
 * The fighter's gear in the same rows as the catalogue below: name on the left, cost and actions
 * on the right. Unbought gear can be removed; bought gear can be stashed or sold. Duplicates share
 * a row ("Club (x2)") and each button acts on one copy.
 */
function CurrentEquipment({ naturalWeapons, fixedEquipment, allEquipment, purchasedEquipment, overLimit, onStash, onSell, onRemoveLast }: {
  /** A mutation's weapons, listed first and labelled rather than given buttons */
  naturalWeapons: string[];
  fixedEquipment: string[];
  /** Gear that no longer fits (see overLimitGear), marked so the player stashes or sells it */
  overLimit: string[];
  allEquipment: string[];
  purchasedEquipment: string[];
  onStash: (id: string) => void;
  onSell: (id: string) => void;
  onRemoveLast: (id: string) => void;
}) {
  if (naturalWeapons.length === 0 && fixedEquipment.length === 0 && allEquipment.length === 0) {
    return <div className={styles.equipEmpty}>None</div>;
  }

  // 'mutated': a mutated weapon, never bought, so no price and only Remove
  type Kind = 'natural' | 'fixed' | 'purchased' | 'pending' | 'mutated';
  const rows: { id: string; kind: Kind; count: number }[] = [];
  const add = (id: string, kind: Kind) => {
    const r = rows.find(x => x.id === id && x.kind === kind);
    if (r) r.count++; else rows.push({ id, kind, count: 1 });
  };
  naturalWeapons.forEach(id => add(id, 'natural'));
  fixedEquipment.forEach(id => add(id, 'fixed'));
  // Purchased copies come first in allEquipment; the rest are added but not yet bought.
  allEquipment.forEach((id, i) => add(id, isMutatedWeapon(id) ? 'mutated' : i < purchasedEquipment.length ? 'purchased' : 'pending'));

  return (
    <div>
      {overLimit.length > 0 && (
        <div className={styles.equipOverLimitNote}>Too many weapons for the slots: stash or sell the marked gear.</div>
      )}
      {rows.map(({ id, kind, count }) => (
        <div key={`${kind}-${id}`} className={styles.equipRow}>
          <span className={`${styles.equipPickerName} ${(kind === 'purchased' || kind === 'pending') && overLimit.includes(id) ? styles.equipOverLimit : ''}`}>
            <InfoName id={id} name={count > 1 ? `${nameOf(id)} (x${count})` : nameOf(id)} natural={kind === 'natural'} />
          </span>
          <span className={styles.equipPickerCost}>{kind === 'pending' && `${costOf(id)}gc`}</span>
          <span className={styles.equipRowActions}>
            {kind === 'natural' && <span className={styles.equipRowNote}>Natural Weapon</span>}
            {(kind === 'pending' || kind === 'mutated') && (
              <button type="button" className={`${styles.equipActionBtn} ${styles.equipActionBtnNeutral}`} onClick={() => onRemoveLast(id)}>
                Remove
              </button>
            )}
            {kind === 'purchased' && (
              <>
                <button type="button" className={`${styles.equipActionBtn} ${styles.equipActionBtnNeutral}`} onClick={() => onStash(id)}>
                  Stash
                </button>
                <button type="button" className={`${styles.equipActionBtn} ${styles.equipActionBtnNeutral}`} onClick={() => onSell(id)}>
                  Sell ({salePriceFor(costOf(id))}gc)
                </button>
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EquipmentPicker({
  allEquipment, fixedEquipment, purchasedEquipment, factionId, isHero, isWizard, isBeast, remainingGold, onAdd, onRemoveLast, onStash, onSell,
  stash = [], onTakeFromStash, naturalWeapons = [],
}: Props) {
  /** Stash copies are free, so `free` skips the gold check. */
  function affordable(cost: number, free = false) { return free || cost <= remainingGold; }
  const [tradingPostOpen, setTradingPostOpen] = useState(false);
  const [stashOpen, setStashOpen] = useState(true);
  const combinedIds = [...naturalWeapons, ...fixedEquipment, ...allEquipment];
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

  function combinedQty(id: string) { return combinedIds.filter(x => x === id).length; }

  function canAddMelee(w: (typeof weaponsData)[0], free = false): boolean {
    if (!affordable(w.cost, free)) return false;
    if (w.special_rules.includes('two-handed'))
      return !combinedIds.includes(w.id) && slots.melee + 2 <= MELEE_SLOTS;
    return combinedQty(w.id) < MELEE_SLOTS && slots.melee + 1 <= MELEE_SLOTS;
  }

  function canAddRanged(w: (typeof weaponsData)[0], free = false): boolean {
    if (!affordable(w.cost, free)) return false;
    if (w.special_rules.includes('brace')) {
      const count = combinedQty(w.id);
      if (count === 0) return slots.ranged + 1 <= RANGED_SLOTS;
      if (count === 1) return true;
      return false;
    }
    return !combinedIds.includes(w.id) && slots.ranged + 1 <= RANGED_SLOTS;
  }

  function canAddArmour(item: ReturnType<typeof armourItems>[number], free = false): boolean {
    if (isWizard) return false;
    if (item.id === 'shield')
      return !combinedIds.includes('shield') && slots.melee + 1 <= MELEE_SLOTS && affordable(item.cost, free);
    return !hasExclusiveArmour && affordable(item.cost, free);
  }

  // Gear has no slot cost and can be bought more than once
  function canAddGear(item: ReturnType<typeof gearItems>[number], free = false): boolean {
    return affordable(item.cost, free);
  }

  /** Stash items this fighter may carry (faction rules apply), with whether a slot is free. */
  const stashOptions = onTakeFromStash
    ? stash.flatMap((id, i) => {
        if (stash.indexOf(id) !== i) return []; // one row per item type
        const w = weaponsData.find(x => x.id === id);
        if (w) {
          if (!factionAllows(id)) return [];
          return [{ id, name: w.name, ok: w.type === 'ranged' ? canAddRanged(w, true) : canAddMelee(w, true) }];
        }
        const armour = armourItems().find(x => x.id === id);
        if (armour) return factionAllowsArmour(id) && !isWizard ? [{ id, name: armour.name, ok: canAddArmour(armour, true) }] : [];
        const gear = gearItems().find(x => x.id === id);
        return gear ? [{ id, name: gear.name, ok: canAddGear(gear, true) }] : [];
      })
    : [];

  const meleeWeapons = weaponsData.filter(w => w.type === 'melee' && factionAllows(w.id));
  const rangedWeapons = weaponsData.filter(w => w.type === 'ranged' && factionAllows(w.id));
  // Wizards can't wear armour, so the section is left out rather than shown greyed out
  const availableArmour = isWizard ? [] : armourItems().filter(i => factionAllowsArmour(i.id));

  if (isBeast) return null;

  const tradingPostCount = allEquipment.filter(id => gearItems().some(i => i.id === id)).length;

  return (
    <div className={styles.equipPicker}>
      {/* What the fighter has, first in the same scrolling list as everything it can get */}
      <div>
        <SectionHead title="Current equipment" />
        <CurrentEquipment
          naturalWeapons={naturalWeapons}
          fixedEquipment={fixedEquipment}
          allEquipment={allEquipment}
          purchasedEquipment={purchasedEquipment}
          overLimit={overLimitGear(naturalWeapons, fixedEquipment, allEquipment)}
          onStash={onStash}
          onSell={onSell}
          onRemoveLast={onRemoveLast}
        />
      </div>

      {stashOptions.length > 0 && (
        <div>
          <SectionHead
            title={stashOpen ? 'Warband stash' : `Warband stash (${stashOptions.length})`}
            open={stashOpen}
            onToggle={() => setStashOpen(o => !o)}
          />
          {stashOpen && stashOptions.map(o => (
            <EquipRow key={o.id} id={o.id} name={o.name} addDisabled={!o.ok} onAdd={() => onTakeFromStash!(o.id)} />
          ))}
        </div>
      )}

      {meleeWeapons.length > 0 && (
        <div>
          <SectionHead title="Melee Weapon" />
          {meleeWeapons.map(w => (
            <EquipRow
              key={w.id}
              id={w.id}
              name={w.name}
              cost={w.cost}
              addDisabled={!canAddMelee(w)}
              onAdd={() => onAdd(w.id)}
            />
          ))}
        </div>
      )}

      {rangedWeapons.length > 0 && (
        <div>
          <SectionHead title="Ranged Weapon" />
          {rangedWeapons.map(w => (
            <EquipRow
              key={w.id}
              id={w.id}
              name={w.name}
              cost={w.cost}
              addDisabled={!canAddRanged(w)}
              onAdd={() => onAdd(w.id)}
            />
          ))}
        </div>
      )}

      {availableArmour.length > 0 && (
        <div>
          <SectionHead title="Armour" />
          {availableArmour.map(item => (
            <EquipRow
              key={item.id}
              id={item.id}
              name={item.name}
              cost={item.cost}
              addDisabled={!canAddArmour(item)}
              onAdd={() => onAdd(item.id)}
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
              id={item.id}
              name={item.name}
              cost={item.cost}
              addDisabled={!canAddGear(item)}
              onAdd={() => onAdd(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
