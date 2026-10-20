import React, { useMemo } from 'react';
import Heading from '@theme/Heading';
import { useGameData, type GameData } from '@site/src/data/gameData';
import Tooltip from '../WarbandBuilder/Tooltip';
import { weaponAnchorId, useEquipmentDocPaths } from './wikiPaths';
import Link from '@docusaurus/Link';
import styles from './wiki.module.css';
import wb from '../WarbandBuilder/warband-builder.module.css';

type Weapon = GameData['weapons'][number];
export type WeaponsTableType = 'melee' | 'ranged';

function hasWeaponRuleDefinition(ruleId: string, weaponRules: GameData['weaponRules']): boolean {
  return weaponRules.some(r => r.id === ruleId);
}

function weaponRuleDescription(ruleId: string, weaponRules: GameData['weaponRules']): string | null {
  const def = weaponRules.find(r => r.id === ruleId);
  const d = def?.description?.trim();
  return d ? d : null;
}

function renderWithCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`')
      ? <code key={i}>{part.slice(1, -1)}</code>
      : part,
  );
}

function humanizeRule(rule: string): string {
  return rule
    .split('-')
    .map(part => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

/**
 * Inline weapon-rule link for prose, with the rule's description as a hover tooltip.
 * Registered globally in src/theme/MDXComponents, so in any doc just write:
 *   <WeaponRule id="parry" />            → "Parry"
 *   <WeaponRule id="pierce-1">Pierce</WeaponRule>   → custom link text
 * Links to the rule's entry on the Weapons page of the version being viewed.
 */
export function WeaponRule({ id, children }: { id: string; children?: React.ReactNode }) {
  const { weaponRules } = useGameData();
  const { weapons: weaponsPath } = useEquipmentDocPaths();
  const def = weaponRules.find(r => r.id === id);
  const label = children ?? (def?.name?.trim() || humanizeRule(id));
  const desc = weaponRuleDescription(id, weaponRules);
  const link = <Link to={`${weaponsPath}#${id}`}>{label}</Link>;
  if (!desc) return link;
  return (
    <Tooltip
      content={<div className="tooltip-breakdown weapon-rule-tooltip-content">{renderWithCode(desc)}</div>}>
      <span className="equip-tooltip-trigger">{link}</span>
    </Tooltip>
  );
}

/** `pills`: render each rule as a tinted chip instead of a comma list (fighter cards). */
export function SpecialRuleLinks({ rules, pills = false }: { rules: string[]; pills?: boolean }) {
  const { weaponRules } = useGameData();
  // Rule entries live on the Weapons page; link there so pills on fighter cards work too.
  const { weapons: weaponsPath } = useEquipmentDocPaths();
  if (rules.length === 0) return <>—</>;
  const items = rules.map((r, i) => {
    // Prefer the rule's own name from the data ("One-use"); the id is only a fallback.
    const label = weaponRules.find(def => def.id === r)?.name?.trim() || humanizeRule(r);
    const desc = weaponRuleDescription(r, weaponRules);
    const link = hasWeaponRuleDefinition(r, weaponRules) ? (
      desc ? (
        <Tooltip
          content={
            <div className="tooltip-breakdown weapon-rule-tooltip-content">{renderWithCode(desc)}</div>
          }>
          <span className="equip-tooltip-trigger">
            <Link to={`${weaponsPath}#${r}`}>{label}</Link>
          </span>
        </Tooltip>
      ) : (
        <Link to={`${weaponsPath}#${r}`}>{label}</Link>
      )
    ) : (
      <span>{label}</span>
    );
    if (pills) {
      return (
        <span key={r} className="weapon-rule-pill">
          {link}
        </span>
      );
    }
    return (
      <span key={r} style={{ whiteSpace: 'nowrap' }}>
        {i > 0 ? ', ' : ''}
        {link}
      </span>
    );
  });
  return pills ? <span className="weapon-rule-pills">{items}</span> : <>{items}</>;
}

function WeaponTableContent({ weapons, anchors = true }: { weapons: Weapon[]; anchors?: boolean }) {
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
              <div className={wb.cell} id={anchors ? weaponAnchorId(w.id) : undefined}>
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
/**
 * A hand-picked weapon table for prose, in the order given:
 *   <WeaponProfiles ids={["sword", "dagger"]} />
 * Same look as the Weapons page tables. Unknown ids are skipped.
 */
export function WeaponProfiles({ ids }: { ids: string[] }) {
  const { weapons } = useGameData();
  const picked = ids
    .map(id => weapons.find(w => w.id === id))
    .filter((w): w is Weapon => w !== undefined);
  // No anchors: the Weapons page owns the `weapon-<id>` ids.
  return <WeaponTableContent weapons={picked} anchors={false} />;
}

export function WeaponsTable({ type }: { type: WeaponsTableType }) {
  const { weapons: allWeapons } = useGameData();
  const weapons = useMemo(
    () =>
      allWeapons
        .filter(w => w.type === type && w.exclusive !== 'yes')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [type, allWeapons],
  );
  return <WeaponTableContent weapons={weapons} />;
}

/** Glossary of special-rule anchors; add `## Special rules {#special-rules}` in MDX above this. */
export function WeaponSpecialRulesGlossary() {
  const { weapons, weaponRules } = useGameData();
  const glossaryRules = useMemo(() => {
    const referenced = new Set<string>();
    weapons.forEach(w => w.special_rules.forEach(r => referenced.add(r)));
    const definedIds = new Set(weaponRules.map(r => r.id));
    // Only list rules that still exist in weapon-rules.json (removing a rule there drops it here)
    return [...referenced]
      .filter(id => definedIds.has(id))
      .sort((a, b) => a.localeCompare(b));
  }, [weapons, weaponRules]);

  return (
    <section className={`${styles.ruleGlossary} weapon-rules-glossary`}>

      {glossaryRules.map(ruleId => {
        const def = weaponRules.find(r => r.id === ruleId);
        const title = def?.name?.trim() || humanizeRule(ruleId);
        const description = def?.description?.trim() ?? '';
        return (
          <div key={ruleId} className={styles.ruleBlock}>
            <Heading as="h3" id={ruleId} className={styles.ruleGlossaryHeading}>
              {title}
            </Heading>
            {description ? <p className={styles.ruleGlossaryDesc}>{renderWithCode(description)}</p> : null}
          </div>
        );
      })}
    </section>
  );
}
