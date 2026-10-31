import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ThemeClassNames } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Warband } from './useWarband';
import { abilitiesData, fightersData, fixedAbilityIds } from './data';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "Ghouls" when the warband has more than one; Skaven/-s names stay as they are.
const plural = (name: string, n: number) => (n > 1 && !/(s|skaven)$/i.test(name) ? `${name}s` : name);

/**
 * Every ability on every fighter in the warband, once each, with who has it. A profile's own
 * abilities are listed under the fighter type ("Ghouls"); talents, picked spells, injuries and
 * mutations under the fighter who took them ("Randolf").
 */
export default function AbilityReference({ warband }: Props) {
  const typeCounts = new Map<string, number>();
  for (const fi of warband.fighters) typeCounts.set(fi.fighterId, (typeCounts.get(fi.fighterId) ?? 0) + 1);

  const holders = new Map<string, string[]>();
  const addHolder = (abilityId: string, who: string) => {
    const list = holders.get(abilityId) ?? [];
    if (!list.includes(who)) list.push(who);
    holders.set(abilityId, list);
  };
  for (const fi of warband.fighters) {
    const profile = fightersData.find(f => f.id === fi.fighterId);
    if (!profile) continue;
    const typeName = plural(profile.name, typeCounts.get(profile.id) ?? 1);
    fixedAbilityIds(profile).forEach(id => addHolder(id, typeName));
    (fi.talents ?? []).forEach(id => addHolder(id, fi.customName || profile.name));
  }

  const abilityRows = Array.from(holders.entries()).map(([abilityId, who]) => {
    const ability = abilitiesData.find(a => a.id === abilityId);
    return {
      id: abilityId,
      fighters: who.join(', '),
      label: ability ? `**[${capitalize(ability.ability_type)}] ${ability.name}:** ${ability.description}` : abilityId,
    };
  });

  return (
    <div className={`${styles.infoPanel} ${styles.abilityRefPanel}`}>
      <div className={styles.tableWrapper}>
        <div className={`${styles.wbGrid} ${styles.abilityRefGrid}`}>
          <div className={`${styles.gridHeader} ${styles.gridHeaderSticky}`}>
            <div className={styles.hCell}>Fighter</div>
            <div className={styles.hCell}>Ability</div>
          </div>

          {abilityRows.length === 0 && (
            <div className={`${styles.gridRow} ${styles.abilityRowStandard}`}>
              <div className={`${styles.cell} ${styles.weaponRefEmpty}`} style={{ gridColumn: '1 / -1' }}>
                No abilities
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
        </div>
      </div>
    </div>
  );
}
