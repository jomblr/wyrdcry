import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { campaignRules, factionsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import InfoSheet from './InfoSheet';
import styles from './warband-builder.module.css';

// Hired swords aren't a faction you lead, so they're never offered. Everything else is
// driven by the faction data: `exclude: 'yes'` hides a faction, `status: 'playtest'`
// lists it under Core candidates instead of Core.
const HIDDEN_FACTIONS = new Set(['hired-sword']);

type FactionFlags = { status?: string; exclude?: string };
const flags = (f: unknown) => f as FactionFlags;

interface Props {
  onConfirm: (factionId: string, gold: number) => void;
  onCancel: () => void;
}

export default function FactionPickerModal({ onConfirm, onCancel }: Props) {
  const [factionId, setFactionId] = useState('');
  const [goldInput, setGoldInput] = useState(String(campaignRules.warband_budget));
  const [menu, setMenu] = useState<{ pos: DropdownPos; width: number; maxHeight: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const gold = Math.max(0, parseInt(goldInput, 10) || 0);
  const factions = factionsData.filter(f => !HIDDEN_FACTIONS.has(f.id) && flags(f).exclude !== 'yes');
  const groups = [
    { label: 'Core warbands', list: factions.filter(f => flags(f).status !== 'playtest') },
    { label: 'Playtest warbands', list: factions.filter(f => flags(f).status === 'playtest') },
  ].filter(g => g.list.length > 0);
  const selected = factions.find(f => f.id === factionId);

  function toggleMenu() {
    if (menu) { setMenu(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = calcDropdownPos(rect);
    // Fit the list in the space beside the field (capped), so it scrolls inside itself
    const room = pos.flipUp ? rect.top - 12 : window.innerHeight - rect.bottom - 12;
    setMenu({ pos, width: rect.width, maxHeight: Math.max(160, Math.min(320, room)) });
  }

  useEffect(() => {
    if (!menu) return;
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  return (
    <InfoSheet
      title="New Warband"
      onClose={onCancel}
      actions={
        <>
          <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`}
            disabled={!factionId}
            onClick={() => onConfirm(factionId, gold)}
          >
            Create
          </button>
        </>
      }
    >
      <div className={styles.sheetField}>
        <div className={styles.editPanelSectionTitle}>Faction</div>
        {/* Same dropdown as the add-fighter menu */}
        <button type="button" ref={btnRef} className={styles.sheetSelect} onClick={toggleMenu} aria-haspopup="listbox" aria-expanded={!!menu}>
          <span className={selected ? undefined : styles.sheetSelectPlaceholder}>{selected?.name ?? 'Select faction'}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      <div className={styles.sheetField}>
        <label className={styles.editPanelSectionTitle} htmlFor="new-warband-gold">Starting gold</label>
        <input
          id="new-warband-gold"
          type="text"
          inputMode="numeric"
          className={styles.sheetInput}
          value={goldInput}
          onChange={e => setGoldInput(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </div>

      {menu && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className={`${styles.dropdown} ${styles.dropdownMobile} ${styles.dropdownAboveSheet}`}
          style={{ ...dropdownStyle(menu.pos), width: menu.width, maxHeight: menu.maxHeight, overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
          {groups.map(g => (
            <React.Fragment key={g.label}>
              <div className={styles.dropdownGroup}>{g.label}</div>
              {g.list.map(f => (
                <button
                  type="button"
                  role="option"
                  aria-selected={f.id === factionId}
                  key={f.id}
                  className={styles.dropdownItem}
                  onClick={() => { setFactionId(f.id); setMenu(null); }}
                >
                  {f.name}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>,
        document.body,
      )}
    </InfoSheet>
  );
}
