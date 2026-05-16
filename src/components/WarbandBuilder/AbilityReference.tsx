import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ThemeClassNames } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Warband, CustomAbility } from './useWarband';
import fightersData from '@site/src/data/fighters.json';
import abilitiesData from '@site/src/data/abilities.json';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
  onAddCustomAbility: () => void;
  onUpdateCustomAbility: (id: string, patch: Partial<Omit<CustomAbility, 'id'>>) => void;
  onRemoveCustomAbility: (id: string) => void;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AbilityReference({ warband, onAddCustomAbility, onUpdateCustomAbility, onRemoveCustomAbility }: Props) {
  const customAbilities = warband.customAbilities ?? [];

  const abilityMap = new Map<string, string[]>();
  for (const fi of warband.fighters) {
    const profile = fightersData.find(f => f.id === fi.fighterId);
    if (!profile) continue;
    const typeName = profile.name;
    for (const abilityId of profile.faction_ability_ids) {
      const existing = abilityMap.get(abilityId);
      if (existing) {
        if (!existing.includes(typeName)) existing.push(typeName);
      } else {
        abilityMap.set(abilityId, [typeName]);
      }
    }
  }

  const abilityRows = Array.from(abilityMap.entries()).map(([abilityId, fighters]) => {
    const ability = abilitiesData.find(a => a.id === abilityId);
    return {
      id: abilityId,
      fighters: fighters.join(', '),
      label: ability ? `**[${capitalize(ability.ability_type)}] ${ability.name}:** ${ability.description}` : abilityId,
    };
  });

  const isEmpty = abilityRows.length === 0 && customAbilities.length === 0;

  return (
    <div className={styles.infoPanel}>
      <div className={styles.tableWrapper}>
        <div className={`${styles.wbGrid} ${styles.abilityRefGrid}`}>
          <div className={`${styles.gridHeader} ${styles.gridHeaderSticky}`}>
            <div className={styles.hCell}>Fighter</div>
            <div className={styles.hCell}>Talent</div>
          </div>

          {isEmpty && (
            <div className={styles.gridRow}>
              <div className={`${styles.cell} ${styles.weaponRefEmpty}`} style={{ gridColumn: '1 / -1' }}>
                No talents
              </div>
            </div>
          )}

          {abilityRows.map(row => (
            <div key={row.id} className={styles.gridRow}>
              <div className={`${styles.cell} ${styles.cellWrap}`}>{row.fighters}</div>
              <div className={`${styles.cell} ${styles.abilityCellStatic}`}>
                <div className={clsx('fighter-abilities', 'ability-ref-entry', ThemeClassNames.docs.docMarkdown, 'markdown')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ p: ({ children }) => <>{children}</> }}>
                    {row.label}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {customAbilities.map(ab => (
            <div key={ab.id} className={`${styles.gridRow} ${styles.customWeaponRow}`}>
              <div className={`${styles.cell} ${styles.cellWrap}`}>
                <input
                  className={styles.customWeaponInput}
                  value={ab.fighter}
                  onChange={e => onUpdateCustomAbility(ab.id, { fighter: e.target.value })}
                  placeholder="Fighter name"
                />
              </div>
              <div className={`${styles.cell} ${styles.abilityCell}`}>
                <textarea
                  className={styles.abilityTextarea}
                  value={ab.ability}
                  ref={el => {
                    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                  }}
                  onChange={e => {
                    onUpdateCustomAbility(ab.id, { ability: e.target.value });
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                  placeholder="Talent description"
                  rows={1}
                />
                <button
                  className={styles.customWeaponRemove}
                  onClick={() => onRemoveCustomAbility(ab.id)}
                  title="Remove talent"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <div className={`${styles.gridRow} ${styles.addFighterRow}`}>
            <div className={`${styles.cell} ${styles.cellFull}`}>
              <button className={styles.addFighterBtn} onClick={onAddCustomAbility}>
                Add talent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
