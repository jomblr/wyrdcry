import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { ThemeClassNames } from '@docusaurus/theme-common';
import ReactMarkdown from 'react-markdown';
import { useGameData, type GameData } from '@site/src/data/gameData';
import Tooltip from '../WarbandBuilder/Tooltip';
import { armourAnchorId, useEquipmentDocPaths, weaponAnchorId } from './wikiPaths';
import styles from './wiki.module.css';
import wb from '../WarbandBuilder/warband-builder.module.css';

interface Props {
  factionId: string;
}

function MarkdownLink(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown },
) {
  const { href, children, node: _node, ...rest } = props;
  if (!href) {
    return <a {...rest}>{children}</a>;
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

type EquipCategory = 'melee' | 'ranged' | 'armour';

interface EquipmentRow {
  key: string;
  name: string;
  cost: number;
  href: string;
  category: EquipCategory;
  heroOnly: boolean;
  /** Custom tooltip body (WarbandBuilder Tooltip) */
  tooltipContent: React.ReactNode;
}

type WeaponProfile = GameData['weapons'][number];

/** Data + version-resolved routes needed to build equipment rows. */
interface EquipContext {
  items: GameData['items'];
  weapons: GameData['weapons'];
  docWeapons: string;
  docArmour: string;
}

function weaponSpecialRuleLabel(id: string, weaponRules: GameData['weaponRules']): string {
  return weaponRules.find(r => r.id === id)?.name ?? id.replace(/-/g, ' ');
}

function WeaponTooltipBody({ w }: { w: WeaponProfile }) {
  const { weaponRules } = useGameData();
  const rules = w.special_rules.map(id => weaponSpecialRuleLabel(id, weaponRules)).join(', ');
  return (
    <div className={clsx('tooltip-breakdown', 'faction-equip-tooltip-content')}>
      <span>
        Range: {w.range}&quot;
      </span>
      <span>Attacks: {w.attacks}</span>
      <span>
        Damage: {w.hit}/{w.crit}
      </span>
      {rules ? <em className="faction-equip-tooltip-rules">{rules}</em> : null}
    </div>
  );
}

function ArmourTooltipBody({ item }: { item: GameData['items'][number] }) {
  const desc = item.description?.trim() ?? '';
  if (desc) {
    return (
      <div className={clsx('tooltip-breakdown', 'faction-equip-tooltip-content')}>
        <span>{desc}</span>
      </div>
    );
  }
  return (
    <div className={clsx('tooltip-breakdown', 'faction-equip-tooltip-content')}>
      <span>{item.rare ? `${item.name} (rare)` : item.name}</span>
    </div>
  );
}

function EquipmentTooltipLink({
  href,
  content,
  children,
}: {
  href: string;
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={content}>
      <span className="equip-tooltip-trigger">
        <Link to={href}>{children}</Link>
      </span>
    </Tooltip>
  );
}

function weaponCategory(type: string): 'melee' | 'ranged' {
  if (type === 'ranged') return 'ranged';
  /* melee + natural (and any unknown) */
  return 'melee';
}

function formatEquipmentEntries(equipment: Record<string, string>, ctx: EquipContext): EquipmentRow[] {
  const rows: EquipmentRow[] = [];
  for (const [rawKey, rule] of Object.entries(equipment)) {
    const heroOnly = rule === 'hero';
    if (rawKey.startsWith('item:')) {
      const itemId = rawKey.slice(5);
      const item = ctx.items.find(i => i.id === itemId);
      if (!item) continue;
      rows.push({
        key: rawKey,
        name: item.name,
        cost: item.cost,
        href: `${ctx.docArmour}#${armourAnchorId(itemId)}`,
        category: 'armour',
        heroOnly,
        tooltipContent: <ArmourTooltipBody item={item} />,
      });
    } else {
      const w = ctx.weapons.find(x => x.id === rawKey);
      if (!w) continue;
      rows.push({
        key: rawKey,
        name: w.name,
        cost: w.cost,
        href: `${ctx.docWeapons}#${weaponAnchorId(rawKey)}`,
        category: weaponCategory(w.type),
        heroOnly,
        tooltipContent: <WeaponTooltipBody w={w} />,
      });
    }
  }
  /* Cheapest first; tie-break by name */
  rows.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  return rows;
}

/** Table only — add section headings in MDX above each of these. */
function FactionEquipmentTable({ rows, title }: { rows: EquipmentRow[]; title: string }) {
  if (rows.length === 0) return null;
  return (
    <div className={`${wb.tableScrollOuterWiki} ${wb.tableScrollOuterWikiFactionEquip}`}>
      <div className={`${wb.tableWrapper} ${wb.wbGrid} ${wb.factionEquipRefGrid}`}>
        <div className={wb.gridHeader}>
          <div className={`${wb.hCell} ${wb.factionEquipHeaderCategory}`}>{title}</div>
          <div className={`${wb.hCell} ${wb.hCellCenter}`}>Cost (gc)</div>
        </div>
        {rows.map(row => (
          <div className={wb.gridRow} key={row.key}>
            <div className={wb.cell}>
              <span className={styles.equipNameCell}>
                <EquipmentTooltipLink href={row.href} content={row.tooltipContent}>
                  {row.name}
                </EquipmentTooltipLink>
                {row.heroOnly ? <span className="hero-only-tag">(HERO)</span> : null}
              </span>
            </div>
            <div className={`${wb.cell} ${wb.cellCenter}`}>{row.cost}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function equipmentRowsForFaction(
  factionId: string,
  factions: GameData['factions'],
  ctx: EquipContext,
): EquipmentRow[] | null {
  const faction = factions.find(f => f.id === factionId);
  if (!faction) return null;
  return formatEquipmentEntries((faction.equipment ?? {}) as Record<string, string>, ctx);
}

/** Equipment rows for the faction, resolved against the docs version being viewed. */
function useEquipmentRows(factionId: string): EquipmentRow[] | null {
  const { items, weapons, factions } = useGameData();
  const { weapons: docWeapons, armour: docArmour } = useEquipmentDocPaths();
  return equipmentRowsForFaction(factionId, factions, { items, weapons, docWeapons, docArmour });
}

/** Melee + natural weapons from `factions.json` for this faction. */
export function FactionMeleeEquipment({ factionId }: Props) {
  const all = useEquipmentRows(factionId);
  if (!all) return null;
  const rows = all.filter(r => r.category === 'melee');
  return <FactionEquipmentTable rows={rows} title="Melee weapons" />;
}

/** Ranged weapons from `factions.json` for this faction. */
export function FactionRangedEquipment({ factionId }: Props) {
  const all = useEquipmentRows(factionId);
  if (!all) return null;
  const rows = all.filter(r => r.category === 'ranged');
  return <FactionEquipmentTable rows={rows} title="Ranged weapons" />;
}

/** Shields & armour (`item:…`) from `factions.json` for this faction. */
export function FactionArmourEquipment({ factionId }: Props) {
  const all = useEquipmentRows(factionId);
  if (!all) return null;
  const rows = all.filter(r => r.category === 'armour');
  return <FactionEquipmentTable rows={rows} title="Armour" />;
}

export { default as FactionFighters } from './FactionFighters';

function useFactionOrNull(factionId: string) {
  const { factions } = useGameData();
  return factions.find(f => f.id === factionId) ?? null;
}

/** Optional override in `factions.json` when the display keyword should differ from `name`. */
type FactionJson = GameData['factions'][number] & { warband_keyword?: string | null };

function warbandKeywordLabel(faction: FactionJson): string {
  const w = faction.warband_keyword;
  if (typeof w === 'string' && w.trim()) return w.trim();
  return faction.name;
}

/** Optional intro blurb from `factions.json` — add your own section headings in MDX around the other exports. */
export default function FactionReference({ factionId }: Props) {
  const faction = useFactionOrNull(factionId);
  if (!faction) {
    return <p><em>Faction not found in data.</em></p>;
  }

  return (
    <div className="faction-reference">
      {faction.description ? (
        <>
          <h3 className={styles.factionHeader}>Description</h3>
          <p>{faction.description}</p>
        </>
      ) : null}
    </div>
  );
}

/** `warband_size` from `factions.json` — put your heading (e.g. `## Warband size`) in MDX above this. Renders nothing if unset. */
export function FactionWarbandLimit({ factionId }: Props) {
  const faction = useFactionOrNull(factionId) as FactionJson | null;
  if (!faction || faction.warband_size == null) {
    return null;
  }
  const keyword = warbandKeywordLabel(faction);
  return (
    <p>
      A <code className="keyword">{keyword}</code> warband may consist of up to{' '}
      <strong>{faction.warband_size}</strong> fighters.
    </p>
  );
}

const specialRulesMarkdownComponents = {
  a: MarkdownLink,
};

/** Markdown from `factions.json` `special_rules` — put your heading in MDX above this. Renders nothing if empty. */
export function FactionSpecialRules({ factionId }: Props) {
  const faction = useFactionOrNull(factionId);
  const raw = faction?.special_rules?.trim() ?? '';
  if (!raw) {
    return null;
  }
  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      <ReactMarkdown components={specialRulesMarkdownComponents}>{raw}</ReactMarkdown>
    </div>
  );
}
