import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { campaignRules, factionsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import InfoSheet from './InfoSheet';
import styles from './warband-builder.module.css';

// Not offered when creating a warband: hired swords aren't a faction you lead, and the
// experimental warbands aren't ready for the builder yet. Kept in code rather than the
// JSON so WyrdForge exports can't bring them back.
const HIDDEN_FACTIONS = new Set(['hired-sword', 'shadow-warriors', 'dwarf-treasure']);

interface Props {
  onConfirm: (factionId: string, gold: number) => void;
  onCancel: () => void;
}

export default function FactionPickerModal({ onConfirm, onCancel }: Props) {
  const [factionId, setFactionId] = useState('');
  const [goldInput, setGoldInput] = useState(String(campaignRules.warband_budget));
  const [menu, setMenu] = useState<{ pos: DropdownPos; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const gold = Math.max(0, parseInt(goldInput, 10) || 0);
  const factions = factionsData.filter(f => !HIDDEN_FACTIONS.has(f.id));
  const selected = factions.find(f => f.id === factionId);

  function toggleMenu() {
    if (menu) { setMenu(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setMenu({ pos: calcDropdownPos(rect), width: rect.width });
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
          style={{ ...dropdownStyle(menu.pos), width: menu.width }}
        >
          {factions.map(f => (
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
        </div>,
        document.body,
      )}
    </InfoSheet>
  );
}
