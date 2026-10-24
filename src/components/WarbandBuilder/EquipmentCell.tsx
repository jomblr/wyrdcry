import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { factionsData, itemsData, weaponRulesData, weaponsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import styles from './warband-builder.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const MELEE_SLOTS = 2;
const RANGED_SLOTS = 1;

const armourItems = () => itemsData.filter(i => i.type === 'armour');
// Light / heavy armour are mutually exclusive (shield is a melee slot, not armour)
const EXCLUSIVE_ARMOUR = ['light-armour', 'heavy-armour'];
// Single-use and miscellaneous items: no slot cost, no faction gating — every warband can buy them
const gearItems = () => itemsData.filter(i => i.type === 'single-use' || i.type === 'miscellaneous');

type Weapon = (typeof weaponsData)[number];
type ArmourItem = ReturnType<typeof armourItems>[number];
type GearItem = ReturnType<typeof gearItems>[number];

// ─── Hover tooltip ────────────────────────────────────────────────────────────

/** Weapon stats + special-rule names, shown beside the dropdown for the highlighted weapon. */
function WeaponTooltipBody({ w, reason }: { w: Weapon; reason?: string | null }) {
  const rules = w.special_rules.map(id => weaponRulesData.find(r => r.id === id)?.name ?? id);
  return (
    <div className="tooltip-breakdown faction-equip-tooltip-content">
      <strong>{w.name}</strong>
      <span>
        Range {w.range}&quot; | {w.attacks} Attacks | {w.hit}/{w.crit} Damage
      </span>
      {rules.length > 0 && <span>{rules.join(', ')}</span>}
      {reason && <span className="equip-block-reason">{reason}</span>}
    </div>
  );
}

/** Armour / Trading Post item: name (+ Rare) and its rule text. */
function ItemTooltipBody({ item, reason }: { item: { name: string; description?: string; rare?: boolean }; reason?: string | null }) {
  return (
    <div className="tooltip-breakdown faction-equip-tooltip-content">
      <strong>{item.name}{item.rare ? ' (RARE)' : ''}</strong>
      {item.description?.trim() && <span>{item.description.trim()}</span>}
      {reason && <span className="equip-block-reason">{reason}</span>}
    </div>
  );
}

// ─── Slot accounting ──────────────────────────────────────────────────────────

function usedSlots(ids: string[]): { melee: number; ranged: number } {
  let melee = 0;
  let ranged = 0;
  const seenBrace = new Set<string>();
  for (const id of ids) {
    if (id === 'shield') { melee += 1; continue; }
    const w = weaponsData.find(x => x.id === id);
    if (!w) continue;
    if (w.type === 'melee') melee += w.special_rules.includes('two-handed') ? 2 : 1;
    else if (w.type === 'ranged') {
      if (w.special_rules.includes('brace')) {
        // A brace pair (1 or 2 copies) counts as 1 ranged slot
        if (!seenBrace.has(id)) { ranged += 1; seenBrace.add(id); }
      } else {
        ranged += 1;
      }
    }
  }
  return { melee, ranged };
}

function hasArmour(ids: string[]): boolean {
  return EXCLUSIVE_ARMOUR.some(aid => ids.includes(aid));
}

// ─── Disabled checks ──────────────────────────────────────────────────────────
// Each returns why an option can't be picked (shown in the dropdown preview), or null.

function weaponBlockReason(w: Weapon, equipment: string[], slots: { melee: number; ranged: number }): string | null {
  if (w.type === 'ranged') {
    if (w.special_rules.includes('brace')) {
      const count = equipment.filter(id => id === w.id).length;
      if (count === 0) return slots.ranged >= RANGED_SLOTS ? 'Ranged weapon already equipped' : null;
      if (count === 1) return null;                        // second copy costs no extra slot
      return 'Already has a full pair';
    }
    if (equipment.includes(w.id)) return 'Already equipped';
    return slots.ranged >= RANGED_SLOTS ? 'Ranged weapon already equipped' : null;
  }
  // Melee: non-two-handed weapons CAN be equipped twice, two-handed fills both slots
  const twoHanded = w.special_rules.includes('two-handed');
  if (slots.melee + (twoHanded ? 2 : 1) <= MELEE_SLOTS) return null;
  return twoHanded && slots.melee < MELEE_SLOTS ? 'Needs both hands free' : 'Both hands are full';
}

function armourBlockReason(item: ArmourItem, equipment: string[], slots: { melee: number; ranged: number }, isWizard: boolean): string | null {
  if (isWizard) return 'Wizards can’t wear armour';
  if (item.id === 'shield') {
    if (equipment.includes('shield')) return 'Shield already equipped';
    return slots.melee + 1 > MELEE_SLOTS ? 'Both hands are full' : null;
  }
  // Light / heavy armour: mutually exclusive; can only have one
  return hasArmour(equipment) ? 'Armour already equipped' : null;
}

/** Gold check, applied after the slot rules. */
function goldBlockReason(cost: number, remainingGold: number): string | null {
  return cost > remainingGold ? `Not enough gold (${remainingGold}gc left)` : null;
}

// ─── Label lookup (weapons + items) ──────────────────────────────────────────

function labelFor(id: string): string {
  return (
    weaponsData.find(x => x.id === id)?.name ??
    itemsData.find(x => x.id === id)?.name ??
    id
  );
}

function costFor(id: string): number {
  return (
    weaponsData.find(x => x.id === id)?.cost ??
    itemsData.find(x => x.id === id)?.cost ??
    0
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const TRANSFER_MIME = 'application/x-equipment-transfer';

interface EquipDragPayload {
  sourceInstanceId: string;
  itemId: string;
  itemIdx: number;
}

// Module-level variable: readable during dragEnter/dragOver (dataTransfer is blocked then)
let activeDrag: EquipDragPayload | null = null;

interface Props {
  instanceId: string;
  equipment: string[];
  pendingStartIndex: number;
  fixedEquipment?: string[];
  stash: string[];
  factionId: string | null;
  isHero: boolean;
  isWizard: boolean;
  isBeast: boolean;
  isFighterPurchased: boolean;
  remainingGold: number;
  onAdd: (id: string) => void;
  onRemoveAtIdx: (idx: number) => void;
  onSendToStash: (itemIdx: number) => void;
  onTakeFromStash: (itemId: string) => void;
  onTransferIn: (sourceInstanceId: string, itemId: string, itemIdx: number) => void;
}

export default function EquipmentCell({ instanceId, equipment, pendingStartIndex, fixedEquipment = [], stash, factionId, isHero, isWizard, isBeast, isFighterPurchased, remainingGold, onAdd, onRemoveAtIdx, onSendToStash, onTakeFromStash, onTransferIn }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [focusedTagIdx, setFocusedTagIdx] = useState<number | null>(null);
  const [pos, setPos] = useState<DropdownPos | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const suppressScrollClose = useRef(false);
  // HTML5 drag-drop: 'none' | 'valid' | 'invalid'
  const [dragOver, setDragOver] = useState<'none' | 'valid' | 'invalid'>('none');
  const dragEnterCounter = useRef(0);

  const slots = usedSlots([...fixedEquipment, ...equipment]);

  // ── Faction eligibility ──
  // Weapons use their id directly; armour items use "item:<id>" as the key
  const factionEquipment = factionId
    ? (factionsData.find(f => f.id === factionId)?.equipment ?? {}) as Record<string, string>
    : {} as Record<string, string>;

  function factionAllows(weaponId: string): boolean {
    const rule = factionEquipment[weaponId];
    if (rule === undefined) return false;
    if (rule === 'hero') return isHero;
    return true;
  }

  function factionAllowsArmour(itemId: string): boolean {
    const rule = factionEquipment[`item:${itemId}`];
    if (rule === undefined) return false;
    if (rule === 'hero') return isHero;
    return true;
  }

  // ── Filtered lists ──
  const q = query.toLowerCase();

  // BEAST fighters: only natural-type weapons, no armour
  const baseNatural = isBeast
    ? weaponsData.filter(w => w.type === 'natural' && !equipment.includes(w.id))
    : [];

  // Non-beast: melee / ranged / armour
  const baseMelee = isBeast ? [] : weaponsData.filter(w => {
    if (w.type !== 'melee') return false;
    if (!factionAllows(w.id)) return false;
    if (w.special_rules.includes('two-handed') && equipment.includes(w.id)) return false;
    return true;
  });
  const baseRanged = isBeast ? [] : weaponsData.filter(w => {
    if (w.type !== 'ranged' || !factionAllows(w.id)) return false;
    const count = equipment.filter(id => id === w.id).length;
    if (w.special_rules.includes('brace')) return count < 2; // show until pair is complete
    return count === 0;
  });
  // Armour: faction-gated via "item:<id>" keys, unavailable to beasts/wizards
  const baseArmour = isBeast ? [] : armourItems().filter(i =>
    !equipment.includes(i.id) && factionAllowsArmour(i.id),
  );
  // Gear: no faction gating, available to every warband, unavailable to beasts
  const baseGear = isBeast ? [] : gearItems();

  const filteredNatural = q ? baseNatural.filter(w => w.name.toLowerCase().includes(q)) : baseNatural;
  const filteredMelee   = q ? baseMelee.filter(w => w.name.toLowerCase().includes(q))   : baseMelee;
  const filteredRanged  = q ? baseRanged.filter(w => w.name.toLowerCase().includes(q))  : baseRanged;
  const filteredArmour  = q ? baseArmour.filter(i => i.name.toLowerCase().includes(q))  : baseArmour;
  const filteredGear    = q ? baseGear.filter(i => i.name.toLowerCase().includes(q))    : baseGear;

  // Stash items eligible for this fighter (shown first in dropdown)
  const stashGroup: { id: string; name: string; cost: number; disabled: boolean; reason?: string | null; fromStash: true }[] =
    stash.flatMap(id => {
      const w = weaponsData.find(x => x.id === id);
      if (w) {
        if (isBeast && w.type !== 'natural') return [];
        if (!isBeast && !factionAllows(id)) return [];
        if (q && !w.name.toLowerCase().includes(q)) return [];
        const reason = weaponBlockReason(w, equipment, slots);
        return [{ id, name: w.name, cost: w.cost, disabled: !!reason, reason, fromStash: true as const }];
      }
      const item = armourItems().find(x => x.id === id);
      if (item) {
        if (isBeast || !factionAllowsArmour(id)) return [];
        if (q && !item.name.toLowerCase().includes(q)) return [];
        const reason = armourBlockReason(item, equipment, slots, isWizard);
        return [{ id, name: item.name, cost: item.cost, disabled: !!reason, reason, fromStash: true as const }];
      }
      const gear = gearItems().find(x => x.id === id);
      if (gear) {
        if (isBeast) return [];
        if (q && !gear.name.toLowerCase().includes(q)) return [];
        return [{ id, name: gear.name, cost: gear.cost, disabled: false, reason: null, fromStash: true as const }];
      }
      return [];
    });

  // Flat list for keyboard navigation (stash first, then regular)
  const flatList: { id: string; name: string; cost: number; disabled: boolean; reason?: string | null; fromStash?: true }[] = [
    ...stashGroup,
    ...filteredNatural.map(w => { const reason = weaponBlockReason(w, equipment, slots) ?? goldBlockReason(w.cost, remainingGold); return { id: w.id, name: w.name, cost: w.cost, disabled: !!reason, reason }; }),
    ...filteredMelee.map(w  => { const reason = weaponBlockReason(w, equipment, slots) ?? goldBlockReason(w.cost, remainingGold); return { id: w.id, name: w.name, cost: w.cost, disabled: !!reason, reason }; }),
    ...filteredRanged.map(w => { const reason = weaponBlockReason(w, equipment, slots) ?? goldBlockReason(w.cost, remainingGold); return { id: w.id, name: w.name, cost: w.cost, disabled: !!reason, reason }; }),
    ...filteredArmour.map(i => { const reason = armourBlockReason(i, equipment, slots, isWizard) ?? goldBlockReason(i.cost, remainingGold); return { id: i.id, name: i.name, cost: i.cost, disabled: !!reason, reason }; }),
    ...filteredGear.map(i   => { const reason = goldBlockReason(i.cost, remainingGold); return { id: i.id, name: i.name, cost: i.cost, disabled: !!reason, reason }; }),
  ];

  // ── Helpers ──

  function openDropdown() {
    if (!containerRef.current) return;
    setPos(calcDropdownPos(containerRef.current.getBoundingClientRect()));
    setOpen(true);
  }

  function handleContainerClick(e: React.MouseEvent) {
    if (dropRef.current?.contains(e.target as Node)) return;
    inputRef.current?.focus();
    if (!open) openDropdown();
  }

  function handleSelect(item: { id: string; fromStash?: true }) {
    suppressScrollClose.current = true;
    if (item.fromStash) {
      onTakeFromStash(item.id);
    } else {
      onAdd(item.id);
    }
    setQuery('');
    setHighlightIdx(-1);
    setFocusedTagIdx(null);
    inputRef.current?.focus();
    if (containerRef.current) {
      setPos(calcDropdownPos(containerRef.current.getBoundingClientRect()));
    }
    requestAnimationFrame(() => { suppressScrollClose.current = false; });
  }

  function handleTagClick(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    setFocusedTagIdx(idx);
    inputRef.current?.focus();
    if (!open) openDropdown();
  }

  function handleRemoveFocusedTag(idx: number) {
    onRemoveAtIdx(idx);
    // Keep focus on the adjacent tag, or return to input if last
    if (equipment.length <= 1) {
      setFocusedTagIdx(null);
    } else {
      setFocusedTagIdx(Math.min(idx, equipment.length - 2));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowLeft':
        // Navigate into / between tags when query is empty
        if (query === '' && equipment.length > 0) {
          e.preventDefault();
          if (focusedTagIdx === null) {
            setFocusedTagIdx(equipment.length - 1);
          } else if (focusedTagIdx > 0) {
            setFocusedTagIdx(focusedTagIdx - 1);
          }
        }
        break;

      case 'ArrowRight':
        if (focusedTagIdx !== null) {
          e.preventDefault();
          if (focusedTagIdx < equipment.length - 1) {
            setFocusedTagIdx(focusedTagIdx + 1);
          } else {
            setFocusedTagIdx(null); // back to text input
          }
        }
        break;

      case 'Backspace':
        if (focusedTagIdx !== null) {
          e.preventDefault();
          handleRemoveFocusedTag(focusedTagIdx);
        } else if (query === '' && equipment.length > 0) {
          e.preventDefault();
          onRemoveAtIdx(equipment.length - 1);
        }
        break;

      case 'Delete':
        if (focusedTagIdx !== null) {
          e.preventDefault();
          handleRemoveFocusedTag(focusedTagIdx);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        setFocusedTagIdx(null);
        if (!open) openDropdown();
        setHighlightIdx(i => Math.min(i + 1, flatList.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(i => Math.max(i - 1, -1));
        break;

      case 'Enter': {
        e.preventDefault();
        const target =
          highlightIdx >= 0 && highlightIdx < flatList.length
            ? flatList[highlightIdx]
            : flatList.length === 1 ? flatList[0] : null;
        if (target && !target.disabled) handleSelect(target);
        break;
      }

      case 'Escape':
        if (focusedTagIdx !== null) {
          setFocusedTagIdx(null);
        } else {
          setOpen(false);
          setHighlightIdx(-1);
        }
        break;

      default:
        // Any printable character clears tag focus so typing goes to input
        if (e.key.length === 1) setFocusedTagIdx(null);
        break;
    }
  }

  // ── HTML5 drag-and-drop: transfer equipment between fighters ──

  function canAcceptTransfer(itemId: string): boolean {
    const w = weaponsData.find(x => x.id === itemId);
    if (w) {
      if (isBeast) return w.type === 'natural' && !weaponBlockReason(w, equipment, slots);
      return factionAllows(itemId) && !weaponBlockReason(w, equipment, slots);
    }
    const item = armourItems().find(x => x.id === itemId);
    if (item) return !isBeast && factionAllowsArmour(itemId) && !armourBlockReason(item, equipment, slots, isWizard);
    const gear = gearItems().find(x => x.id === itemId);
    if (gear) return !isBeast;
    return false;
  }

  function handleDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes(TRANSFER_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = activeDrag && canAcceptTransfer(activeDrag.itemId) ? 'move' : 'none';
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(TRANSFER_MIME)) return;
    e.preventDefault();
    dragEnterCounter.current += 1;
    if (dragEnterCounter.current === 1) {
      // activeDrag is set; check eligibility now
      if (!activeDrag || activeDrag.sourceInstanceId === instanceId) {
        setDragOver('none');
      } else {
        setDragOver(canAcceptTransfer(activeDrag.itemId) ? 'valid' : 'invalid');
      }
    }
  }

  function handleDragLeave() {
    dragEnterCounter.current -= 1;
    if (dragEnterCounter.current <= 0) {
      dragEnterCounter.current = 0;
      setDragOver('none');
    }
  }

  function handleDrop(e: React.DragEvent) {
    dragEnterCounter.current = 0;
    setDragOver('none');
    if (!e.dataTransfer.types.includes(TRANSFER_MIME)) return;
    e.preventDefault();
    try {
      const payload = JSON.parse(e.dataTransfer.getData(TRANSFER_MIME)) as EquipDragPayload;
      if (payload.sourceInstanceId === instanceId) return;
      if (!canAcceptTransfer(payload.itemId)) return;
      onTransferIn(payload.sourceInstanceId, payload.itemId, payload.itemIdx);
    } catch {
      // malformed payload — ignore
    }
  }

  // ── Effects ──

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        !dropRef.current?.contains(e.target as Node) &&
        !containerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
        setHighlightIdx(-1);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (suppressScrollClose.current) return;
      if (e.target instanceof Node && dropRef.current?.contains(e.target)) return;
      setOpen(false);
      setHighlightIdx(-1);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useEffect(() => {
    setHighlightIdx(-1);
    if (query) setFocusedTagIdx(null);
  }, [query]);


  // ── Render helpers ──

  function renderGroup(
    label: string,
    items: { id: string; name: string; cost: number; disabled: boolean; reason?: string | null; fromStash?: true }[],
    indexOffset: number,
  ) {
    if (items.length === 0) return null;
    return (
      <>
        <div className={styles.dropdownGroup}>{label}</div>
        {items.map((item, i) => {
          const idx = indexOffset + i;
          return (
            <button
              type="button"
              key={`${item.id}-${i}`}
              className={`${styles.dropdownItem} ${highlightIdx === idx ? styles.dropdownItemHighlighted : ''}`}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); if (!item.disabled) handleSelect(item); }}
              onMouseEnter={() => setHighlightIdx(idx)}
              data-idx={idx}
              // aria-disabled, not disabled: disabled buttons get no hover events, and the
              // weapon info should still show for options you can't pick right now.
              aria-disabled={item.disabled || undefined}
            >
              <span>
                {item.name}
                {/* Same small-caps keyword style as the (HERO) tag on faction pages. */}
                {itemsData.find(i => i.id === item.id)?.rare && <> <span className="hero-only-tag">(RARE)</span></>}
              </span>
              <span className={styles.dropdownCost}>{item.cost === 0 ? 'free' : `${item.cost}gc`}</span>
            </button>
          );
        })}
      </>
    );
  }

  const stashOffset   = 0;
  const naturalOffset = stashGroup.length;
  const meleeOffset   = naturalOffset + filteredNatural.length;
  const rangedOffset  = meleeOffset   + filteredMelee.length;
  const armourOffset  = rangedOffset  + filteredRanged.length;
  const gearOffset    = armourOffset  + filteredArmour.length;

  const naturalItems    = flatList.slice(naturalOffset, meleeOffset);
  const meleeItems      = flatList.slice(meleeOffset,   rangedOffset);
  const rangedItems     = flatList.slice(rangedOffset,  armourOffset);
  const armourItemsFlat = flatList.slice(armourOffset,  gearOffset);
  const gearItemsFlat   = flatList.slice(gearOffset);

  // Info beside the dropdown for the highlighted weapon or item (mouse or arrow keys).
  // Pinned level with the dropdown's top, to its right (or left if there's no room).
  const [infoPos, setInfoPos] = useState<{ top: number; left: number } | null>(null);
  const highlighted = open && highlightIdx >= 0 ? flatList[highlightIdx] : undefined;
  const highlightedWeapon = highlighted ? weaponsData.find(w => w.id === highlighted.id) : undefined;
  const highlightedItem =
    highlighted && !highlightedWeapon ? itemsData.find(i => i.id === highlighted.id) : undefined;
  useEffect(() => {
    const drop = dropRef.current;
    const row = drop?.querySelector<HTMLElement>(`[data-idx="${highlightIdx}"]`);
    if ((!highlightedWeapon && !highlightedItem) || !drop || !row) { setInfoPos(null); return; }
    const d = drop.getBoundingClientRect();
    const width = 320; // matches the tooltip's max-width
    const fitsRight = d.right + 8 + width <= window.innerWidth;
    setInfoPos({
      top: d.top + window.scrollY, // pinned to the dropdown's top edge, not the hovered row
      left: (fitsRight ? d.right + 8 : d.left - 8 - width) + window.scrollX,
    });
  }, [highlightIdx, highlightedWeapon, highlightedItem, open]);

  const weaponInfo =
    (highlightedWeapon || highlightedItem) && infoPos
      ? ReactDOM.createPortal(
          <div className="tooltip equip-dropdown-info" style={{ top: infoPos.top, left: infoPos.left }}>
            {highlightedWeapon
              ? <WeaponTooltipBody w={highlightedWeapon} reason={highlighted?.reason} />
              : <ItemTooltipBody item={highlightedItem!} reason={highlighted?.reason} />}
          </div>,
          document.body,
        )
      : null;

  const dropdown =
    open && pos
      ? ReactDOM.createPortal(
          <div ref={dropRef} className={styles.dropdown} style={dropdownStyle(pos)}>
            {renderGroup('Stash',   stashGroup,   stashOffset)}
            {renderGroup('Natural', naturalItems, naturalOffset)}
            {renderGroup('Melee',   meleeItems,   meleeOffset)}
            {renderGroup('Ranged',  rangedItems,  rangedOffset)}
            {renderGroup('Armour',  armourItemsFlat, armourOffset)}
            {renderGroup('Trading Post', gearItemsFlat, gearOffset)}
            {flatList.length === 0 && (
              <div className={styles.dropdownEmpty}>No items available</div>
            )}
          </div>,
          document.body,
        )
      : null;

  const isActive = open || focusedTagIdx !== null;

  return (
    <div
      ref={containerRef}
      className={[
        styles.equipmentInput,
        isActive ? styles.equipmentInputFocused : '',
        dragOver === 'valid' ? styles.equipmentInputDragOver : '',
        dragOver === 'invalid' ? styles.equipmentInputDragOverInvalid : '',
      ].join(' ')}
      onClick={handleContainerClick}
      onBlur={e => {
        // Clear tag selection when focus moves outside the entire cell
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setFocusedTagIdx(null);
        }
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {fixedEquipment.map((id, idx) => (
        <span
          key={`fixed-${id}-${idx}`}
          className={`${styles.equipmentTag} ${styles.equipmentTagFixed}`}
          title={undefined}
        >
          {labelFor(id)}
        </span>
      ))}
      {equipment.map((id, idx) => {
        const isPendingTag = idx >= pendingStartIndex;
        return (
          <span
            key={`${id}-${idx}`}
            className={[
              styles.equipmentTag,
              focusedTagIdx === idx ? styles.equipmentTagFocused : '',
              isPendingTag ? styles.equipmentTagPending : '',
            ].join(' ')}
            draggable={!isPendingTag}
            onDragStart={isPendingTag ? undefined : e => {
              const payload: EquipDragPayload = { sourceInstanceId: instanceId, itemId: id, itemIdx: idx };
              activeDrag = payload;
              e.dataTransfer.setData(TRANSFER_MIME, JSON.stringify(payload));
              e.dataTransfer.effectAllowed = 'move';
              e.stopPropagation();
            }}
            onDragEnd={isPendingTag ? undefined : () => { activeDrag = null; setDragOver('none'); }}
            onClick={e => handleTagClick(e, idx)}
            title={undefined}
          >
            {labelFor(id)}{isFighterPurchased && isPendingTag ? (() => { const c = costFor(id); return c > 0 ? ` (${c}gc)` : ''; })() : ''}
          </span>
        );
      })}
      <input
        ref={inputRef}
        className={styles.equipmentTextInput}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (!open) openDropdown(); }}
        onKeyDown={handleKeyDown}
        placeholder={equipment.length === 0 ? 'Add equipment…' : ''}
        aria-label="Add equipment"
        aria-expanded={open}
        role="combobox"
        autoComplete="off"
      />
      {dropdown}
      {weaponInfo}
    </div>
  );
}
