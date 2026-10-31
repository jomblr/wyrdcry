import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { EllipsisVertical } from 'lucide-react';
import type { FighterInstance, StatKey } from './useWarband';
import styles from './warband-builder.module.css';
import { abilityStatChanges, currentKeywords, fighterAbilityIds, fightersData, hasTag, isHeroNow, isMutatedWeapon, itemsData, needsStartingAbility, statLabels, weaponsData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import FighterEditPanel from './FighterEditPanel';
import InfoSheet from './InfoSheet';
import EquipmentInfoSheet from './EquipmentInfoSheet';
import FighterAbilities, { fighterAbilities, PickAbilityPrompt } from './FighterAbilities';

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
  onSetTalents: (talents: string[]) => void;
  onSetCostOverride: (cost: number | null) => void;
  /** Other fighters' names, so a random name in the edit panel avoids them */
  otherNames: string[];
  /** Play mode: details only — no renaming, menu, stash or sell */
  readOnly?: boolean;
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
  onSetStat, onSetNotes, onSetTalents, onSetCostOverride, otherNames,
  readOnly = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<false | 'equipment' | 'talents' | 'information'>(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [info, setInfo] = useState<{ id: string; natural?: boolean } | null>(null);
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
  const isHero = isHeroNow(profile, instance);

  const defenseBonus = instance.equipment.reduce((sum, eid) => {
    const item = itemsData.find(x => x.id === eid);
    if (item?.effect?.characteristic === 'defense') return sum + (item.effect.bonus ?? 0);
    return sum;
  }, 0);

  // Changes from abilities the fighter has (Daemonic Chitin, injuries, …)
  const abilityDelta = (key: StatKey) =>
    abilityStatChanges(fighterAbilityIds(profile!, instance), key).reduce((sum, c) => sum + c.value, 0);

  function statVal(key: StatKey): number {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined ? override : base) + (key === 'defense' ? defenseBonus : 0) + abilityDelta(key);
  }

  function isModified(key: StatKey): boolean {
    const base = profile![key as keyof typeof profile] as number;
    const override = instance.statOverrides?.[key];
    return (override !== undefined && override !== base) || (key === 'defense' && defenseBonus > 0) || abilityDelta(key) !== 0;
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
          <button type="button" className={styles.dropdownItem} onClick={() => { handleMenuClose(); setEditOpen((isBeast || isThrall || isDaemon) && !hasTag(profile, 'MUTANT') ? 'information' : 'equipment'); }}>Edit fighter</button>
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

  const canEquip = !(isBeast || isThrall || isDaemon);
  // Gear that comes with the profile (hired swords) — not in instance.equipment, can't be sold.
  const fixedIds = canEquip ? (profile.default_equipment ?? []).map(s => s.replace(/^(weapon|item):/, '')) : [];

  // Equipment as one comma list, duplicates folded into "Sword (x2)"; unbought items marked pending.
  const equipGroups: { id: string; name: string; count: number; pending: boolean; fixed: boolean }[] = [];
  function addToGroups(eid: string, pending: boolean, fixed: boolean) {
    const name = weaponsData.find(x => x.id === eid)?.name ?? itemsData.find(x => x.id === eid)?.name ?? eid;
    const g = equipGroups.find(x => x.id === eid && x.pending === pending && x.fixed === fixed);
    if (g) g.count++; else equipGroups.push({ id: eid, name, count: 1, pending, fixed });
  }
  fixedIds.forEach(eid => addToGroups(eid, false, true));
  allEquipment.forEach((eid, idx) => addToGroups(eid, !instance.isPending && idx >= instance.equipment.length, false));

  // Beasts, thralls and daemons can't buy equipment; show the weapons they're born with instead.
  const naturalWeapons = canEquip
    ? []
    : (profile.default_equipment ?? [])
        .map(id => weaponsData.find(w => w.id === id.replace('weapon:', '')))
        .filter((w): w is NonNullable<typeof w> => !!w);

  // Locked for battle: a fighter with no melee weapon (nothing, only ranged, or only armour) fights unarmed.
  const hasMeleeWeapon = [...fixedIds, ...allEquipment, ...naturalWeapons.map(w => w.id)]
    .some(id => ['melee', 'mutated'].includes(weaponsData.find(w => w.id === id)?.type ?? ''));
  const unarmed = readOnly && !hasMeleeWeapon ? weaponsData.find(w => w.id === 'unarmed') : undefined;

  function equipCostOf(id: string): number {
    return weaponsData.find(x => x.id === id)?.cost ?? itemsData.find(x => x.id === id)?.cost ?? 0;
  }

  // Profile abilities, then talents, injuries and mutations taken in the campaign
  const abilities = fighterAbilities(fighterAbilityIds(profile, instance));
  // Not in play mode, where the panel can't be opened
  const pickAbility = !readOnly && needsStartingAbility(profile, instance);

  // Read-only: stashing and selling live in the edit panel, so a tap to read can't lose gear.
  const infoSheet = info ? <EquipmentInfoSheet id={info.id} natural={info.natural} onClose={() => setInfo(null)} /> : null;

  // Race then role keywords; the faction keyword is shared by the whole warband, so it's left out.
  const keywordTokens = currentKeywords(profile, instance);

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
          {/* Tap to rename, like the warband name */}
          <input
            className={`${styles.fighterCardName} ${styles.fighterCardNameInput}`}
            value={instance.customName}
            onChange={e => onSetName(e.target.value)}
            placeholder="Unnamed"
            aria-label="Fighter name"
            readOnly={readOnly}
          />
        </div>
        <div className={styles.fighterCardMeta}>
          {!noRenown && <span>{instance.renown} Renown</span>}
          <span className={instance.isPending ? styles.pendingCost : undefined}>{totalCost}gc</span>
        </div>
        {!readOnly && (
          <button type="button" ref={btnRef} className={styles.ellipsisBtn} onClick={handleMenuToggle} aria-label="Fighter options">
            <EllipsisVertical size={16} />
          </button>
        )}
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

      {(equipGroups.length > 0 || unarmed || (canEquip && !readOnly)) && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>Equipment</div>
          <div className={styles.fighterCardTags}>
            {equipGroups.map(g => {
              // Unbought: new gear on a bought fighter, or any (non-fixed) gear on an unbought one
              // (mutated weapons are never bought, so never shown as unbought or priced)
              const unbought = !isMutatedWeapon(g.id) && (g.pending || (instance.isPending && !g.fixed));
              return (
                <button
                  type="button"
                  key={`${g.id}-${g.pending}-${g.fixed}`}
                  className={`${styles.equipmentTag} ${styles.fighterCardTag} ${unbought ? styles.equipmentTagPending : ''}`}
                  onClick={() => setInfo({ id: g.id })}
                >
                  {g.name}{g.count > 1 && ` (x${g.count})`}
                  {unbought && ` (${equipCostOf(g.id) * g.count}gc)`}
                </button>
              );
            })}
            {unarmed && (
              <button
                type="button"
                className={`${styles.equipmentTag} ${styles.fighterCardTag}`}
                onClick={() => setInfo({ id: unarmed.id, natural: true })}
              >
                {unarmed.name}
              </button>
            )}
            {equipGroups.length === 0 && canEquip && !readOnly && (
              <button
                type="button"
                className={`${styles.equipmentTag} ${styles.fighterCardTag} ${styles.fighterCardTagAdd}`}
                onClick={() => setEditOpen('equipment')}
              >
                + Add equipment
              </button>
            )}
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
                onClick={() => setInfo({ id: w.id, natural: true })}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {(abilities.length > 0 || pickAbility) && (
        <div className={styles.fighterCardSection}>
          <div className={styles.fighterCardSectionTitle}>Special rules</div>
          {abilities.length > 0 && <FighterAbilities abilities={abilities} tagClassName={styles.fighterCardTag} />}
          {pickAbility && <div className={styles.fighterCardTags}><PickAbilityPrompt card onClick={() => setEditOpen('talents')} /></div>}
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
          initialPane={editOpen}
          instance={instance}
          remainingGold={remainingGold}
          onSetName={onSetName}
          onSetRenown={onSetRenown}
          onSetEquipment={onSetEquipment}
          onSetPendingEquipment={onSetPendingEquipment}
          onSendToStash={onSendToStash}
          onSell={onSell}
          stash={stash}
          onTakeFromStash={onTakeFromStash}
          onSetStat={onSetStat}
          onSetNotes={onSetNotes}
          onSetCostOverride={onSetCostOverride}
          onSetTalents={onSetTalents}
          otherNames={otherNames}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
