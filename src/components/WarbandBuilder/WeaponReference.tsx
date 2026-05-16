import React from 'react';
import type { Warband, CustomWeapon } from './useWarband';
import weaponsData from '@site/src/data/weapons.json';
import fightersData from '@site/src/data/fighters.json';
import weaponRulesData from '@site/src/data/weapon-rules.json';
import Tooltip from './Tooltip';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
  onAddCustomWeapon: () => void;
  onUpdateCustomWeapon: (id: string, patch: Partial<Omit<CustomWeapon, 'id'>>) => void;
  onRemoveCustomWeapon: (id: string) => void;
}

export default function WeaponReference({ warband, onAddCustomWeapon, onUpdateCustomWeapon, onRemoveCustomWeapon }: Props) {
  const allEquipment = [
    ...warband.fighters.flatMap(f => {
      const profile = fightersData.find(p => p.id === f.fighterId);
      const isBeast = profile?.race.includes('BEAST') ?? false;
      if (isBeast) return profile?.natural_weapon ? [profile.natural_weapon] : [];
      return f.equipment;
    }),
    ...warband.stash,
  ];
  const seenIds = new Set<string>();
  const weapons = allEquipment
    .filter(id => {
      const w = weaponsData.find(x => x.id === id);
      if (!w) return false;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    })
    .map(id => weaponsData.find(x => x.id === id)!);

  const customWeapons = warband.customWeapons ?? [];
  const isEmpty = weapons.length === 0 && customWeapons.length === 0;

  return (
    <div className={styles.infoPanel}>
      <div className={styles.tableWrapper}>
        <div className={`${styles.wbGrid} ${styles.weaponRefGrid}`}>
          <div className={`${styles.gridHeader} ${styles.gridHeaderSticky}`}>
            <div className={styles.hCell}>Weapon</div>
            <div className={`${styles.hCell} ${styles.hCellCenter}`}>R</div>
            <div className={`${styles.hCell} ${styles.hCellCenter}`}>A</div>
            <div className={`${styles.hCell} ${styles.hCellCenter}`}>D</div>
            <div className={styles.hCell}>Special</div>
          </div>

          {isEmpty && (
            <div className={styles.gridRow}>
              <div className={`${styles.cell} ${styles.weaponRefEmpty}`} style={{ gridColumn: '1 / -1' }}>
                No weapons equipped
              </div>
            </div>
          )}

          {weapons.map(w => (
            <div key={w.id} className={styles.gridRow}>
              <div className={styles.cell}>{w.name}</div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>{w.range}"</div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>{w.attacks}</div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>{w.hit}/{w.crit}</div>
              <div className={`${styles.cell} ${styles.cellWrap}`}>
                {w.special_rules.length ? w.special_rules.map((ruleId, i) => {
                  const rule = weaponRulesData.find(r => r.id === ruleId);
                  const label = rule?.name ?? ruleId;
                  const tip = rule?.description;
                  return (
                    <React.Fragment key={ruleId}>
                      {i > 0 && ', '}
                      {tip ? (
                        <Tooltip content={<span className="weapon-rule-tooltip-content">{tip}</span>}>
                          <span style={{ borderBottom: '1px dotted currentColor', cursor: 'help' }}>{label}</span>
                        </Tooltip>
                      ) : label}
                    </React.Fragment>
                  );
                }) : '—'}
              </div>
            </div>
          ))}

          {customWeapons.map(cw => (
            <div key={cw.id} className={`${styles.gridRow} ${styles.customWeaponRow}`}>
              <div className={styles.cell}>
                <input
                  className={styles.customWeaponInput}
                  value={cw.name}
                  onChange={e => onUpdateCustomWeapon(cw.id, { name: e.target.value })}
                  placeholder="Weapon name"
                />
              </div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>
                <input
                  className={`${styles.customWeaponInput} ${styles.customWeaponInputNarrow}`}
                  value={cw.range}
                  onChange={e => onUpdateCustomWeapon(cw.id, { range: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>
                <input
                  className={`${styles.customWeaponInput} ${styles.customWeaponInputNarrow}`}
                  value={cw.attacks}
                  onChange={e => onUpdateCustomWeapon(cw.id, { attacks: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div className={`${styles.cell} ${styles.cellCenter}`}>
                <input
                  className={`${styles.customWeaponInput} ${styles.customWeaponInputNarrow}`}
                  value={cw.hit}
                  onChange={e => onUpdateCustomWeapon(cw.id, { hit: e.target.value })}
                  placeholder="3"
                />
                <span className={styles.customWeaponSep}>/</span>
                <input
                  className={`${styles.customWeaponInput} ${styles.customWeaponInputNarrow}`}
                  value={cw.crit}
                  onChange={e => onUpdateCustomWeapon(cw.id, { crit: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className={`${styles.cell} ${styles.customWeaponSpecialCell}`}>
                <input
                  className={styles.customWeaponInput}
                  value={cw.special}
                  onChange={e => onUpdateCustomWeapon(cw.id, { special: e.target.value })}
                  placeholder="Special rules"
                />
                <button
                  className={styles.customWeaponRemove}
                  onClick={() => onRemoveCustomWeapon(cw.id)}
                  title="Remove weapon"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Add weapon row */}
          <div className={`${styles.gridRow} ${styles.addFighterRow}`}>
            <div className={`${styles.cell} ${styles.cellFull}`}>
              <button className={styles.addFighterBtn} onClick={onAddCustomWeapon}>
                Add weapon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
