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
import factions from './factions.json';
import fighters from './fighters.json';
import items from './items.json';
import weaponRules from './weapon-rules.json';
import weapons from './weapons.json';

import abilities09 from '../data-versions/0.9/abilities.json';
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
}

/** Shapes are taken from the stable data; other versions share the same schema. */
export interface GameData {
  abilities: typeof abilities;
  factions: typeof factions;
  fighters: typeof fighters;
  items: typeof items;
  weaponRules: typeof weaponRules;
  weapons: typeof weapons;
  statLabels: StatLabels;
}

/** 0.5 — the live playtest, served at /docs/. */
const V05: GameData = {
  abilities,
  factions,
  fighters,
  items,
  weaponRules,
  weapons,
  statLabels: { defense: 'Defense' },
};

/** The 0.9 draft, served at /docs/next/. */
const V09: GameData = {
  abilities: abilities09 as typeof abilities,
  factions: factions09 as typeof factions,
  fighters: fighters09 as typeof fighters,
  items: items09 as typeof items,
  weaponRules: weaponRules09 as typeof weaponRules,
  weapons: weapons09 as typeof weapons,
  // 0.9 renames the Defense stat to Armour. The JSON key is still `defense`.
  statLabels: { defense: 'Armour' },
};

/** Keyed by Docusaurus version name. 'current' is the unreleased 0.9 draft. */
const BY_VERSION: Record<string, GameData> = {
  current: V09,
  '0.5': V05,
};

/** Must track `lastVersion` in docusaurus.config.js. */
const STABLE_VERSION = '0.5';

export const STABLE_DATA: GameData = BY_VERSION[STABLE_VERSION];

/**
 * Game data for the docs version currently being rendered.
 *
 * Only valid inside a doc page (every wiki component is). Outside one there is no
 * version context, so we fall back to the stable version rather than throwing.
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
