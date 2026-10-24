import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { abilitiesData, fightersData, hasTag, itemsData, statLabels, weaponsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import FighterEditPanel from './FighterEditPanel';
import InfoSheet from './InfoSheet';
import EquipmentInfoSheet from './EquipmentInfoSheet';
import { salePriceFor } from './WarbandStash';
import ReactMarkdown from 'react-markdown';

interface Props {
  instance: FighterInstance;
  remainingGold: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetName: (name: string) => void;
  onSetRenown: (renown: number) => void;
  onSetEquipment: (equipment: string[]) => void;
  onSetPendingEquipment: (equipment: string[]) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  canDuplicate: boolean;
  onSendToStash: (itemIdx: number) => void;
  onSell: (itemIdx: number, salePrice: number) => void;
  stash: string[];
  /** The warband has no leader yet */
  canMakeLeader: boolean;
  onMakeLeader: () => void;
  onTakeFromStash: (itemId: string) => void;
  onSetStat: (stat: StatKey, value: number) => void;
  onSetNotes: (notes: string) => void;
  onSetCostOverride: (cost: number | null) => void;
}

const STAT_KEYS: { key: StatKey; label: string; suffix?: string }[] = [
  { key: 'move',    label: 'Move', suffix: '"' },
  { key: 'fight',   label: 'Fight' },
  { key: 'shoot',   label: 'Shoot' },
  { key: 'defense', label: 'Armour' },
  { key: 'health',  label: 'Health' },
  { key: 'bravery', label: 'Bravery', suffix: '+' },
];

export default function FighterCard({
  instance, remainingGold,
  canMoveUp, canMoveDown, onMoveUp, onMoveDown,
  onSetName, onSetRenown,
  onSetEquipment, onSetPendingEquipment,
  onRemove, onDuplicate, canDuplicate,
  onSendToStash, onSell, stash, onTakeFromStash, canMakeLeader, onMakeLeader,
  onSetStat, onSetNotes, onSetCostOverride,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [info, setInfo] = useState<{ kind: 'equip'; id: string; pending: boolean; natural?: boolean } | { kind: 'ability'; id: string } | null>(null);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = fightersData.find(f => f.id === instance.fighterId);
  // The label (Armour) comes from statLabels in gameData.
  const statKeys = STAT_KEYS.map(d => (d.key === 'defense' ? { ...d, label: statLabels().defense } : d));
  if (!profile) return null;

  const isBeast = hasTag(profile, 'BEAST');
  const isThrall = hasTag(profile, 'THRALL');
  const isDaemon = hasTag(profile, 'DAEMON');
  const noRenown = isBeast || isThrall;
  const isHero = hasTag(profile, 'HERO');

  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  function statVal(key: StatKey): number {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined ? override : base) + (key === 'defense' ? defenseBonus : 0);
  }

  function isModified(key: StatKey): boolean {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined && override !== base) || (key === 'defense' && defenseBonus > 0);
  }

  const allEquipment = instance.isPending
    ? instance.equipment
    : [...instance.equipment, ...instance.pendingEquipment];

  const equipCost = instance.equipment.reduce((sum, eid) => {
    const w = weaponsData.find(x => x.id === eid);
    if (w) return sum + w.cost;
    const item = itemsData.find(x => x.id === eid);
    return sum + (item?.cost ?? 0);
  }, 0);
  const baseCost = instance.costOverride ?? profile.cost ?? 0;
  const totalCost = baseCost + equipCost;

  function handleMenuToggle() {
    if (menuOpen) { setMenuOpen(false); return; }
    if (btnRef.current) setPos(calcDropdownPos(btnRef.current.getBoundingClientRect(), { alignRight: true }));
    setMenuOpen(true);
  }

  function handleMenuClose() { setMenuOpen(false); }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => { setMenuOpen(false); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [menuOpen]);

  const menu = menuOpen && pos
    ? ReactDOM.createPortal(
        <div ref={menuRef} className={`${styles.dropdown} ${styles.dropdownMobile}`} style={dropdownStyle(pos, true)}>
          <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); setEditOpen(true); }}>Edit fighter</button>
          {canMakeLeader && isHero && (
            <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); onMakeLeader(); }}>Make leader</button>
          )}
          <div className={styles.dropdownSep} />
          {canMoveUp && <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); onMoveUp(); }}>Move up</button>}
          {canMoveDown && <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); onMoveDown(); }}>Move down</button>}
          {(canMoveUp || canMoveDown) && <div className={styles.dropdownSep} />}
          <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); onDuplicate(); }} disabled={!canDuplicate}>Duplicate fighter</button>
          <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); setConfirmRemove(true); }}>Remove fighter</button>
        </div>,
        document.body,
      )
    : null;

  // Equipment as one comma list, duplicates folded into "Sword (x2)"; unbought items marked pending.
  const equipGroups: { id: string; name: string; count: number; pending: boolean }[] = [];
  allEquipment.forEach((eid, idx) => {
    const pending = !instance.isPending && idx >= instance.equipment.length;
    const name = weaponsData.find(x => x.id === eid)?.name ?? itemsData.find(x => x.id === eid)?.name ?? eid;
    const g = equipGroups.find(x => x.id === eid && x.pending === pending);
    if (g) g.count++; else equipGroups.push({ id: eid, name, count: 1, pending });
  });

  // Beasts, thralls and daemons can't buy equipment; show the weapons they're born with instead.
  const naturalWeapons = (isBeast || isThrall || isDaemon)
    ? (profile.default_equipment ?? [])
        .map(id => weaponsData.find(w => w.id === id.replace('weapon:', '')))
        .filter((w): w is NonNullable<typeof w> => !!w)
    : [];

  const abilities = (profile.faction_ability_ids ?? [])
    .map(id => abilitiesData.find(a => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a);

  function abilityLabel(a: (typeof abilities)[0]): string {
    return a.ability_type && a.ability_type !== 'trait'
      ? `[${a.ability_type[0].toUpperCase()}${a.ability_type.slice(1)}] ${a.name}`
      : a.name;
  }

  let infoSheet: React.ReactNode = null;
  if (info?.kind === 'ability') {
    const a = abilities.find(x => x.id === info.id);
    if (a) {
      infoSheet = (
        <InfoSheet
          title={a.name}
          subtitle={a.ability_type && a.ability_type !== 'trait' ? `${a.ability_type} ability` : 'Trait'}
          onClose={() => setInfo(null)}
        >
          <ReactMarkdown>{a.description}</ReactMarkdown>
        </InfoSheet>
      );
    }
  } else if (info?.kind === 'equip') {
    const w = weaponsData.find(x => x.id === info.id);
    const item = itemsData.find(x => x.id === info.id);
    const cost = w?.cost ?? item?.cost ?? 0;
    const salePrice = salePriceFor(cost);
    // Only bought, non-natural gear can be sold or stashed.
    const ownedIdx = info.natural || info.pending ? -1 : instance.equipment.lastIndexOf(info.id);
    const close = () => setInfo(null);
    infoSheet = (
      <EquipmentInfoSheet
        id={info.id}
        natural={info.natural}
        pending={info.pending}
        onClose={close}
        actions={ownedIdx !== -1 ? (
          <>
            <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={() => { onSendToStash(ownedIdx); close(); }}>
              Stash
            </button>
            <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`} onClick={() => { onSell(ownedIdx, salePrice); close(); }}>
              Sell for {salePrice}gc
            </button>
          </>
        ) : undefined}
      />
    );
  }

  // Race then role keywords; the faction keyword is shared by the whole warband, so it's left out.
  const keywordTokens = Array.from(new Set([...profile.race, ...profile.keywords, ...(instance.isLeader ? ['LEADER'] : [])]));

  return (
    // Unbought fighters aren't tinted; their gold cost (pendingCost) marks them as pending.
    <div className={styles.fighterCard}>

      {/* Header */}
      <div className={styles.fighterCardHeader}>
        <div className={styles.fighterCardNameBlock}>
          {/* Type as a small label above the name; beasts that kept their profile name show it once. */}
          {instance.customName !== profile.name && (
            <span className={styles.fighterCardType}>{profile.name}</span>
          )}
          <span className={styles.fighterCardName}>
            {instance.customName || <span className={styles.fighterCardNameEmpty}>Unnamed</span>}
          </span>
        </div>
        <div className={styles.fighterCardMeta}>
          {!noRenown && <span>{instance.renown} Renown</span>}
          <span className={instance.isPending ? styles.pendingCost : undefined}>{totalCost}gc</span>
        </div>
        <button type="button" ref={btnRef} className={styles.ellipsisBtn} onClick={handleMenuToggle} aria-label="Fighter options">
          <EllipsisVertical size={16} />
        </button>
      </div>

      {/* Stats — same dark cards as the warband header */}
      <div className={styles.statCards}>
        {statKeys.map(({ key, label, suffix }) => (
          <div key={key} className={styles.statCard}>
            <div className={styles.statCardLabel}>{label}</div>
            <div className={`${styles.statCardValue} ${isModified(key) ? styles.statModified : ''}`}>
              {statVal(key)}{suffix}
            </div>
          </div>
        ))}
      </div>

      {equipGroups.length > 0 && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>Equipment</div>
          <div className={styles.fighterCardTags}>
            {equipGroups.map(g => (
              <button
                type="button"
                key={`${g.id}-${g.pending}`}
                className={`${styles.equipmentTag} ${styles.fighterCardTag} ${g.pending ? styles.equipmentTagPending : ''}`}
                onClick={() => setInfo({ kind: 'equip', id: g.id, pending: g.pending || instance.isPending })}
              >
                {g.name}{g.count > 1 && ` (x${g.count})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {naturalWeapons.length > 0 && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>
            {naturalWeapons.length > 1 ? 'Natural Weapons' : 'Natural Weapon'}
          </div>
          <div className={styles.fighterCardTags}>
            {naturalWeapons.map((w, i) => (
              <button
                type="button"
                key={`${w.id}-${i}`}
                className={`${styles.equipmentTag} ${styles.fighterCardTag}`}
                onClick={() => setInfo({ kind: 'equip', id: w.id, pending: false, natural: true })}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {abilities.length > 0 && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>Abilities</div>
          <div className={styles.fighterCardTags}>
            {abilities.map(a => (
              <button
                type="button"
                key={a.id}
                className={`${styles.equipmentTag} ${styles.fighterCardTag}`}
                onClick={() => setInfo({ kind: 'ability', id: a.id })}
              >
                {abilityLabel(a)}
              </button>
            ))}
          </div>
        </div>
      )}

      {instance.notes?.trim() && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>Notes</div>
          <div className={styles.fighterCardNotes}>{instance.notes}</div>
        </div>
      )}

      {keywordTokens.length > 0 && (
        <div className={styles.fighterCardFooter}>
          {keywordTokens.map((k, i) => (
            <React.Fragment key={k}>
              {i > 0 && <span className={styles.fighterCardKeywordSep}>·</span>}
              <span>{k}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {menu}
      {infoSheet}
      {confirmRemove && (
        <InfoSheet
          title={instance.customName || profile.name}
          subtitle="Remove fighter"
          onClose={() => setConfirmRemove(false)}
          actions={
            <>
              <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={() => setConfirmRemove(false)}>
                Cancel
              </button>
              <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`} onClick={() => { setConfirmRemove(false); onRemove(); }}>
                Remove
              </button>
            </>
          }
        >
          Remove this fighter from the warband? This can't be undone.
        </InfoSheet>
      )}

      {editOpen && (
        <FighterEditPanel
          instance={instance}
          remainingGold={remainingGold}
          onSetName={onSetName}
          onSetRenown={onSetRenown}
          onSetEquipment={onSetEquipment}
          onSetPendingEquipment={onSetPendingEquipment}
          onSendToStash={onSendToStash}
          stash={stash}
          onTakeFromStash={onTakeFromStash}
          onSetStat={onSetStat}
          onSetNotes={onSetNotes}
          onSetCostOverride={onSetCostOverride}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
