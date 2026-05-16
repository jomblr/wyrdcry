import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import factionsData from '@site/src/data/factions.json';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import styles from './warband-builder.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const MELEE_SLOTS = 2;
const RANGED_SLOTS = 1;

// Only armour-type items are equippable (skip single-use, familiar, etc.)
const armourItems = itemsData.filter(i => i.type === 'armour');
// Light / heavy armour are mutually exclusive (shield is a melee slot, not armour)
const EXCLUSIVE_ARMOUR = ['light-armour', 'heavy-armour'];

type Weapon = (typeof weaponsData)[number];
type ArmourItem = (typeof armourItems)[number];

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

function weaponDisabled(w: Weapon, equipment: string[], slots: { melee: number; ranged: number }): boolean {
  if (w.type === 'ranged') {
    if (w.special_rules.includes('brace')) {
      const count = equipment.filter(id => id === w.id).length;
      if (count === 0) return slots.ranged >= RANGED_SLOTS; // needs a free slot
      if (count === 1) return false;                        // second copy costs no extra slot
      return true;                                          // already a full pair
    }
    return equipment.includes(w.id) || slots.ranged >= RANGED_SLOTS;
  }
  // Melee: non-two-handed weapons CAN be equipped twice, two-handed fills both slots
  const cost = w.special_rules.includes('two-handed') ? 2 : 1;
  return slots.melee + cost > MELEE_SLOTS;
}

function armourDisabled(item: ArmourItem, equipment: string[], slots: { melee: number; ranged: number }, isWizard: boolean): boolean {
  if (isWizard) return true; // wizards cannot wear any armour
  if (item.id === 'shield') {
    return equipment.includes('shield') || slots.melee + 1 > MELEE_SLOTS;
  }
  // Light / heavy armour: mutually exclusive; can only have one
  return hasArmour(equipment);
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
  fixedEquipment?: string[];
  stash: string[];
  factionId: string | null;
  isHero: boolean;
  isWizard: boolean;
  isBeast: boolean;
  remainingGold: number;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSendToStash: (itemIdx: number) => void;
  onTakeFromStash: (itemId: string) => void;
  onTransferIn: (sourceInstanceId: string, itemId: string, itemIdx: number) => void;
}

export default function EquipmentCell({ instanceId, equipment, fixedEquipment = [], stash, factionId, isHero, isWizard, isBeast, remainingGold, onAdd, onRemove, onSendToStash, onTakeFromStash, onTransferIn }: Props) {
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
  const baseArmour = isBeast ? [] : armourItems.filter(i =>
    !equipment.includes(i.id) && factionAllowsArmour(i.id),
  );

  const filteredNatural = q ? baseNatural.filter(w => w.name.toLowerCase().includes(q)) : baseNatural;
  const filteredMelee   = q ? baseMelee.filter(w => w.name.toLowerCase().includes(q))   : baseMelee;
  const filteredRanged  = q ? baseRanged.filter(w => w.name.toLowerCase().includes(q))  : baseRanged;
  const filteredArmour  = q ? baseArmour.filter(i => i.name.toLowerCase().includes(q))  : baseArmour;

  // Stash items eligible for this fighter (shown first in dropdown)
  const stashGroup: { id: string; name: string; cost: number; disabled: boolean; fromStash: true }[] =
    stash.flatMap(id => {
      const w = weaponsData.find(x => x.id === id);
      if (w) {
        if (isBeast && w.type !== 'natural') return [];
        if (!isBeast && !factionAllows(id)) return [];
        if (q && !w.name.toLowerCase().includes(q)) return [];
        return [{ id, name: w.name, cost: w.cost, disabled: weaponDisabled(w, equipment, slots), fromStash: true as const }];
      }
      const item = armourItems.find(x => x.id === id);
      if (item) {
        if (isBeast || !factionAllowsArmour(id)) return [];
        if (q && !item.name.toLowerCase().includes(q)) return [];
        return [{ id, name: item.name, cost: item.cost, disabled: armourDisabled(item, equipment, slots, isWizard), fromStash: true as const }];
      }
      return [];
    });

  // Flat list for keyboard navigation (stash first, then regular)
  const flatList: { id: string; name: string; cost: number; disabled: boolean; fromStash?: true }[] = [
    ...stashGroup,
    ...filteredNatural.map(w => ({ id: w.id, name: w.name, cost: w.cost, disabled: weaponDisabled(w, equipment, slots) || false })),
    ...filteredMelee.map(w  => ({ id: w.id,  name: w.name,  cost: w.id === 'dagger' && !equipment.includes('dagger') ? 0 : w.cost, disabled: weaponDisabled(w, equipment, slots) || false })),
    ...filteredRanged.map(w => ({ id: w.id,  name: w.name,  cost: w.cost, disabled: weaponDisabled(w, equipment, slots) || false })),
    ...filteredArmour.map(i => ({ id: i.id,  name: i.name,  cost: i.cost, disabled: armourDisabled(i, equipment, slots, isWizard) })),
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
    if (e.ctrlKey || e.metaKey) {
      onSendToStash(idx);
      return;
    }
    setFocusedTagIdx(idx);
    inputRef.current?.focus();
    if (!open) openDropdown();
  }

  function handleRemoveFocusedTag(idx: number) {
    onRemove(equipment[idx]);
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
          onRemove(equipment[equipment.length - 1]);
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
      if (isBeast) return w.type === 'natural' && !weaponDisabled(w, equipment, slots);
      return factionAllows(itemId) && !weaponDisabled(w, equipment, slots);
    }
    const item = armourItems.find(x => x.id === itemId);
    if (item) return !isBeast && factionAllowsArmour(itemId) && !armourDisabled(item, equipment, slots, isWizard);
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
    items: { id: string; name: string; cost: number; disabled: boolean; fromStash?: true }[],
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
              disabled={item.disabled}
            >
              <span>{item.name}</span>
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

  const naturalItems    = flatList.slice(naturalOffset, meleeOffset);
  const meleeItems      = flatList.slice(meleeOffset,   rangedOffset);
  const rangedItems     = flatList.slice(rangedOffset,  armourOffset);
  const armourItemsFlat = flatList.slice(armourOffset);

  const dropdown =
    open && pos
      ? ReactDOM.createPortal(
          <div ref={dropRef} className={styles.dropdown} style={dropdownStyle(pos)}>
            {renderGroup('Stash',   stashGroup,   stashOffset)}
            {renderGroup('Natural', naturalItems, naturalOffset)}
            {renderGroup('Melee',   meleeItems,   meleeOffset)}
            {renderGroup('Ranged',  rangedItems,  rangedOffset)}
            {renderGroup('Armour',  armourItemsFlat, armourOffset)}
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
          title="Exclusive weapon — cannot be removed"
        >
          {labelFor(id)}
        </span>
      ))}
      {equipment.map((id, idx) => (
        <span
          key={`${id}-${idx}`}
          className={`${styles.equipmentTag} ${focusedTagIdx === idx ? styles.equipmentTagFocused : ''}`}
          draggable
          onDragStart={e => {
            const payload: EquipDragPayload = { sourceInstanceId: instanceId, itemId: id, itemIdx: idx };
            activeDrag = payload;
            e.dataTransfer.setData(TRANSFER_MIME, JSON.stringify(payload));
            e.dataTransfer.effectAllowed = 'move';
            e.stopPropagation();
          }}
          onDragEnd={() => { activeDrag = null; setDragOver('none'); }}
          onClick={e => handleTagClick(e, idx)}
          title="Ctrl+click to stash · Drag to another fighter · Click to select then Delete"
        >
          {labelFor(id)}
        </span>
      ))}
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
    </div>
  );
}
