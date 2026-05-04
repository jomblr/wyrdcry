import React, { useMemo } from 'react';
import Heading from '@theme/Heading';
import weaponsData from '@site/src/data/weapons.json';
import weaponRulesData from '@site/src/data/weapon-rules.json';
import Tooltip from '../WarbandBuilder/Tooltip';
import { weaponAnchorId } from './wikiPaths';
import styles from './wiki.module.css';
import wb from '../WarbandBuilder/warband-builder.module.css';

type Weapon = (typeof weaponsData)[number];
export type WeaponsTableType = 'melee' | 'ranged';

function hasWeaponRuleDefinition(ruleId: string): boolean {
  return weaponRulesData.some(r => r.id === ruleId);
}

function weaponRuleDescription(ruleId: string): string | null {
  const def = weaponRulesData.find(r => r.id === ruleId);
  const d = def?.description?.trim();
  return d ? d : null;
}

function humanizeRule(rule: string): string {
  return rule
    .split('-')
    .map(part => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

function SpecialRuleLinks({ rules }: { rules: string[] }) {
  if (rules.length === 0) return <>—</>;
  return (
    <>
      {rules.map((r, i) => {
        const desc = weaponRuleDescription(r);
        const link = hasWeaponRuleDefinition(r) ? (
          desc ? (
            <Tooltip
              content={
                <div className="tooltip-breakdown weapon-rule-tooltip-content">{desc}</div>
              }>
              <span className="equip-tooltip-trigger">
                <a href={`#${r}`}>{humanizeRule(r)}</a>
              </span>
            </Tooltip>
          ) : (
            <a href={`#${r}`}>{humanizeRule(r)}</a>
          )
        ) : (
          <span>{humanizeRule(r)}</span>
        );
        return (
          <span key={r} style={{ whiteSpace: 'nowrap' }}>
            {i > 0 ? ', ' : ''}
            {link}
          </span>
        );
      })}
    </>
  );
}

function WeaponTableContent({ weapons }: { weapons: Weapon[] }) {
  if (weapons.length === 0) return null;
  return (
    <div className="weapon-table" data-wiki-weapons>
      <div className={wb.tableScrollOuterWiki}>
        <div className={`${wb.tableWrapper} ${wb.wbGrid} ${wb.weaponRefGrid}`}>
          <div className={wb.gridHeader}>
            <div className={wb.hCell}>Weapon</div>
            <div className={`${wb.hCell} ${wb.hCellCenter}`}>R</div>
            <div className={`${wb.hCell} ${wb.hCellCenter}`}>A</div>
            <div className={`${wb.hCell} ${wb.hCellCenter}`}>D</div>
            <div className={wb.hCell}>Special</div>
          </div>
          {weapons.map(w => (
            <div className={wb.gridRow} key={w.id}>
              <div className={wb.cell} id={weaponAnchorId(w.id)}>
                {w.name}
              </div>
              <div className={`${wb.cell} ${wb.cellCenter}`}>{w.range}&quot;</div>
              <div className={`${wb.cell} ${wb.cellCenter}`}>{w.attacks}</div>
              <div className={`${wb.cell} ${wb.cellCenter}`}>
                {w.hit}/{w.crit}
              </div>
              <div className={`${wb.cell} ${wb.cellWrap}`}>
                <SpecialRuleLinks rules={w.special_rules} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Weapon data table only — add section headings in MDX (e.g. `## Melee weapons {#melee-weapons}`). */
export function WeaponsTable({ type }: { type: WeaponsTableType }) {
  const weapons = useMemo(
    () =>
      weaponsData
        .filter(w => w.type === type)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [type],
  );
  return <WeaponTableContent weapons={weapons} />;
}

/** Glossary of special-rule anchors; add `## Special rules {#special-rules}` in MDX above this. */
export function WeaponSpecialRulesGlossary() {
  const glossaryRules = useMemo(() => {
    const referenced = new Set<string>();
    weaponsData.forEach(w => w.special_rules.forEach(r => referenced.add(r)));
    const definedIds = new Set(weaponRulesData.map(r => r.id));
    // Only list rules that still exist in weapon-rules.json (removing a rule there drops it here)
    return [...referenced]
      .filter(id => definedIds.has(id))
      .sort((a, b) => a.localeCompare(b));
  }, []);

  return (
    <section className={`${styles.ruleGlossary} weapon-rules-glossary`}>

      {glossaryRules.map(ruleId => {
        const def = weaponRulesData.find(r => r.id === ruleId);
        const title = def?.name?.trim() || humanizeRule(ruleId);
        const description = def?.description?.trim() ?? '';
        return (
          <div key={ruleId} className={styles.ruleBlock}>
            <Heading as="h3" id={ruleId} className={styles.ruleGlossaryHeading}>
              {title}
            </Heading>
            {description ? <p className={styles.ruleGlossaryDesc}>{description}</p> : null}
          </div>
        );
      })}
    </section>
  );
}
