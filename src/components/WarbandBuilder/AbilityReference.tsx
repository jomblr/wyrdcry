import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ThemeClassNames } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Warband, CustomAbility } from './useWarband';
import { abilitiesData, fightersData } from './data';
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

  // Phones: one single-column table per fighter type, listing only that type's abilities,
  // headed by the type and the names of the warband's fighters of that type.
  const byType = new Map<string, { title: string; count: number; abilityIds: string[] }>();
  for (const fi of warband.fighters) {
    const profile = fightersData.find(f => f.id === fi.fighterId);
    if (!profile || profile.faction_ability_ids.length === 0) continue;
    const entry = byType.get(profile.id) ?? { title: profile.name, count: 0, abilityIds: profile.faction_ability_ids };
    entry.count += 1;
    byType.set(profile.id, entry);
  }
  // "Assassin Adepts" when the warband has more than one; Skaven/-s names stay as they are.
  const plural = (name: string, n: number) => (n > 1 && !/(s|skaven)$/i.test(name) ? `${name}s` : name);
  const abilityMarkdown = (id: string) => {
    const a = abilitiesData.find(x => x.id === id);
    return a ? `**[${capitalize(a.ability_type)}] ${a.name}:** ${a.description}` : id;
  };

  return (
    <div className={`${styles.infoPanel} ${styles.abilityRefPanel}`}>
      <div className={styles.abilityRefMobile}>
        {Array.from(byType.entries()).map(([typeId, t]) => (
          <div key={typeId} className={styles.tableWrapper}>
            <div className={`${styles.wbGrid} ${styles.abilityRefMobileGrid}`}>
              <div className={styles.gridHeader}>
                <div className={`${styles.hCell} ${styles.abilityRefMobileTitle}`}>
                  <span>{plural(t.title, t.count)}</span>
                  <span>{t.abilityIds.length === 1 ? 'Ability' : 'Abilities'}</span>
                </div>
              </div>
              {t.abilityIds.map(id => (
                <div key={id} className={`${styles.gridRow} ${styles.gridRowNoHover}`}>
                  <div className={`${styles.cell} ${styles.abilityCellStatic}`}>
                    <div className={clsx('fighter-abilities', 'ability-ref-entry', ThemeClassNames.docs.docMarkdown, 'markdown')}>
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ p: ({ children }) => <>{children}</> }}>
                        {abilityMarkdown(id)}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tableWrapper}>
        <div className={`${styles.wbGrid} ${styles.abilityRefGrid}`}>
          <div className={`${styles.gridHeader} ${styles.gridHeaderSticky}`}>
            <div className={styles.hCell}>Fighter</div>
            <div className={styles.hCell}>Ability</div>
          </div>

          {isEmpty && (
            <div className={`${styles.gridRow} ${styles.abilityRowStandard}`}>
              <div className={`${styles.cell} ${styles.weaponRefEmpty}`} style={{ gridColumn: '1 / -1' }}>
                No talents
              </div>
            </div>
          )}

          {abilityRows.map(row => (
            <div key={row.id} className={`${styles.gridRow} ${styles.abilityRowStandard}`}>
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
