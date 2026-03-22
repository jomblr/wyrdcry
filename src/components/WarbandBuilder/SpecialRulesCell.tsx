import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import abilitiesData from '@site/src/data/abilities.json';
import fightersData from '@site/src/data/fighters.json';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import styles from './warband-builder.module.css';

const CHARACTERISTICS = ['Strength', 'Toughness', 'Agility', 'Perception', 'Wits'];

interface Props {
  fighterId: string;
  specialRules: string[];
  onChange: (rules: string[]) => void;
}

export default function SpecialRulesCell({ fighterId, specialRules, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [focusedTagIdx, setFocusedTagIdx] = useState<number | null>(null);
  const [pos, setPos] = useState<DropdownPos | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Build dropdown options ──

  const profile = fightersData.find(f => f.id === fighterId);
  const abilityIds: string[] = (profile as any)?.faction_ability_ids ?? [];
  const abilities = abilityIds
    .map(id => abilitiesData.find(a => a.id === id))
    .filter(Boolean) as typeof abilitiesData;

  const q = query.toLowerCase();

  const filteredAbilities = abilities.filter(
    a => !specialRules.includes(a.name) && a.name.toLowerCase().includes(q),
  );
  const filteredCharacteristics = CHARACTERISTICS.filter(
    c => !specialRules.includes(c) && c.toLowerCase().includes(q),
  );

  // Flat list for keyboard nav
  const flatList: { label: string; hint?: string }[] = [
    ...filteredAbilities.map(a => ({ label: a.name, hint: a.ability_type })),
    ...filteredCharacteristics.map(c => ({ label: c })),
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

  function handleSelect(label: string) {
    if (!specialRules.includes(label)) {
      onChange([...specialRules, label]);
    }
    setQuery('');
    setHighlightIdx(-1);
    setFocusedTagIdx(null);
    inputRef.current?.focus();
    if (containerRef.current) {
      setPos(calcDropdownPos(containerRef.current.getBoundingClientRect()));
    }
  }

  function handleRemove(idx: number) {
    onChange(specialRules.filter((_, i) => i !== idx));
    if (specialRules.length <= 1) {
      setFocusedTagIdx(null);
    } else {
      setFocusedTagIdx(Math.min(idx, specialRules.length - 2));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowLeft':
        if (query === '' && specialRules.length > 0) {
          e.preventDefault();
          if (focusedTagIdx === null) setFocusedTagIdx(specialRules.length - 1);
          else if (focusedTagIdx > 0) setFocusedTagIdx(focusedTagIdx - 1);
        }
        break;
      case 'ArrowRight':
        if (focusedTagIdx !== null) {
          e.preventDefault();
          if (focusedTagIdx < specialRules.length - 1) setFocusedTagIdx(focusedTagIdx + 1);
          else setFocusedTagIdx(null);
        }
        break;
      case 'Backspace':
        if (focusedTagIdx !== null) { e.preventDefault(); handleRemove(focusedTagIdx); }
        else if (query === '' && specialRules.length > 0) { e.preventDefault(); handleRemove(specialRules.length - 1); }
        break;
      case 'Delete':
        if (focusedTagIdx !== null) { e.preventDefault(); handleRemove(focusedTagIdx); }
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
        if (target) handleSelect(target.label);
        break;
      }
      case 'Escape':
        if (focusedTagIdx !== null) setFocusedTagIdx(null);
        else { setOpen(false); setHighlightIdx(-1); }
        break;
      default:
        if (e.key.length === 1) setFocusedTagIdx(null);
        break;
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
    const close = () => { setOpen(false); setHighlightIdx(-1); };
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

  // ── Render ──

  const abilityOffset = 0;
  const characteristicOffset = filteredAbilities.length;

  function renderGroup(
    label: string,
    items: { label: string; hint?: string }[],
    offset: number,
  ) {
    if (items.length === 0) return null;
    return (
      <>
        <div className={styles.dropdownGroup}>{label}</div>
        {items.map((item, i) => {
          const idx = offset + i;
          return (
            <button
              type="button"
              key={item.label}
              className={`${styles.dropdownItem} ${highlightIdx === idx ? styles.dropdownItemHighlighted : ''}`}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleSelect(item.label); }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              <span>{item.label}</span>
              {item.hint && <span className={styles.dropdownCost}>{item.hint}</span>}
            </button>
          );
        })}
      </>
    );
  }

  const dropdown =
    open && pos
      ? ReactDOM.createPortal(
          <div ref={dropRef} className={styles.dropdown} style={dropdownStyle(pos)}>
            {renderGroup('Abilities', flatList.slice(abilityOffset, characteristicOffset), abilityOffset)}
            {renderGroup('Characteristics', flatList.slice(characteristicOffset), characteristicOffset)}
            {flatList.length === 0 && (
              <div className={styles.dropdownEmpty}>No options available</div>
            )}
          </div>,
          document.body,
        )
      : null;

  const isActive = open || focusedTagIdx !== null;

  return (
    <div
      ref={containerRef}
      className={`${styles.equipmentInput} ${isActive ? styles.equipmentInputFocused : ''}`}
      onClick={handleContainerClick}
      onBlur={e => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setFocusedTagIdx(null);
        }
      }}
    >
      {specialRules.map((rule, idx) => (
        <span
          key={`${rule}-${idx}`}
          className={`${styles.equipmentTag} ${focusedTagIdx === idx ? styles.equipmentTagFocused : ''}`}
          onClick={e => { e.stopPropagation(); setFocusedTagIdx(idx); inputRef.current?.focus(); if (!open) openDropdown(); }}
        >
          {rule}
        </span>
      ))}
      <input
        ref={inputRef}
        className={styles.equipmentTextInput}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { if (!open) openDropdown(); }}
        onKeyDown={handleKeyDown}
        placeholder={specialRules.length === 0 ? 'Add rule…' : ''}
        aria-label="Add special rule"
        aria-expanded={open}
        role="combobox"
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
}
