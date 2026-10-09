/**
 * Version-aware game data.
 *
 * Docusaurus versioning snapshots `docs/` into `versioned_docs/`, but it does not
 * version the JSON in `src/data/`. Without this resolver a 0.5 rules page would
 * render 0.9 draft stat blocks.
 *
 *   src/data/*.json           -> 0.5, the live playtest rules
 *   src/data-versions/0.9/*   -> the 0.9 draft
 *
 * `src/data/` deliberately holds the *stable* data, because two things outside
 * the docs read it and have no concept of versions:
 *   - the warband builder (imports it directly)
 *   - the /forge sandbox (scripts/copy-forge-data.js copies it to static/forge/data)
 * Keeping 0.5 there means both stay correct for players without any code changes.
 *
 * When 0.9 ships: move src/data-versions/0.9/* into src/data/, archive the old
 * files as src/data-versions/0.5/, swap the imports below, and flip `lastVersion`
 * in docusaurus.config.js.
 */
import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';

import abilities from './abilities.json';
import campaignRules from './campaign-rules.json';
import factions from './factions.json';
import fighters from './fighters.json';
import items from './items.json';
import weaponRules from './weapon-rules.json';
import weapons from './weapons.json';

import abilities09 from '../data-versions/0.9/abilities.json';
import campaignRules09 from '../data-versions/0.9/campaign-rules.json';
import factions09 from '../data-versions/0.9/factions.json';
import fighters09 from '../data-versions/0.9/fighters.json';
import items09 from '../data-versions/0.9/items.json';
import weaponRules09 from '../data-versions/0.9/weapon-rules.json';
import weapons09 from '../data-versions/0.9/weapons.json';

/**
 * Display names for fighter stats, where a version renames one. The JSON keys stay
 * the same across versions; only the label a reader sees changes.
 */
export interface StatLabels {
  defense: string;
  /** Column abbreviation in compact stat tables (M/F/S/D/H/B). */
  defenseShort: string;
}

/** Shapes are taken from the stable data; other versions share the same schema. */
export interface GameData {
  /**
   * Ruleset number, independent of where Docusaurus serves it. Stays '0.9' whether the
   * draft lives at /docs/next/ today or becomes a versioned release later — so anything
   * keyed on it (saved warbands) survives that promotion.
   */
  ruleset: string;
  abilities: typeof abilities;
  campaignRules: typeof campaignRules;
  factions: typeof factions;
  fighters: typeof fighters;
  items: typeof items;
  weaponRules: typeof weaponRules;
  weapons: typeof weapons;
  statLabels: StatLabels;
}

/** 0.5 — the live playtest, served at /docs/. */
const V05: GameData = {
  ruleset: '0.5',
  abilities,
  campaignRules,
  factions,
  fighters,
  items,
  weaponRules,
  weapons,
  statLabels: { defense: 'Defense', defenseShort: 'D' },
};

/**
 * 0.9 renames Defense to Armour, and WyrdForge exports have used both spellings of
 * the key. Code reads `defense` internally (it's the warband builder's stat key and
 * the key saved warbands use for overrides), so give every 0.9 fighter a `defense`
 * value taken from `armour` when present. Display labels come from `statLabels`.
 */
function normaliseArmourFighters(list: typeof fighters09): typeof fighters {
  return list.map(f => {
    const g = f as typeof f & { armour?: number; defense?: number };
    return { ...g, defense: g.armour ?? g.defense } as unknown as (typeof fighters)[number];
  });
}

/** Same idea for items: an `armour` effect counts as the internal `defense` one. */
function normaliseArmourItems(list: typeof items09): typeof items {
  return list.map(i => {
    const e = (i as { effect?: { characteristic?: string } }).effect;
    return (e && e.characteristic === 'armour'
      ? { ...i, effect: { ...e, characteristic: 'defense' } }
      : i) as unknown as (typeof items)[number];
  });
}

/** The 0.9 draft, served at /docs/next/. */
const V09: GameData = {
  ruleset: '0.9',
  abilities: abilities09 as typeof abilities,
  campaignRules: campaignRules09 as typeof campaignRules,
  factions: factions09 as typeof factions,
  fighters: normaliseArmourFighters(fighters09),
  items: normaliseArmourItems(items09),
  weaponRules: weaponRules09 as typeof weaponRules,
  weapons: weapons09 as typeof weapons,
  // 0.9 renames the Defense stat to Armour (see normaliseArmour* above).
  statLabels: { defense: 'Armour', defenseShort: 'A' },
};

/** Keyed by Docusaurus version name. 'current' is 0.9, the default; 0.5 is deprecated. */
const BY_VERSION: Record<string, GameData> = {
  current: V09,
  '0.5': V05,
};

/** Must track `lastVersion` in docusaurus.config.js. */
const STABLE_VERSION = 'current';

export const STABLE_DATA: GameData = BY_VERSION[STABLE_VERSION];

/** Game data for a Docusaurus version name ('current' = 0.9); falls back to the default version. */
export function getGameData(version?: string | null): GameData {
  return (version && BY_VERSION[version]) || STABLE_DATA;
}

/**
 * Game data for the docs version currently being rendered.
 *
 * Only valid inside a doc page (every wiki component is). Outside one there is no
 * version context, so we fall back to the default version rather than throwing.
 */
export function useGameData(): GameData {
  let version: string | undefined;
  try {
    version = useDocsVersion().version;
  } catch {
    version = undefined;
  }
  return (version && BY_VERSION[version]) || STABLE_DATA;
}
