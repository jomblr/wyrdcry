/**
 * Game data for the site: the Wyrdcry 1.0 ruleset, from the JSON files in this folder
 * (WyrdForge exports go here). The 0.5 playtest rules and data are archived in
 * /archive/0.5/ and no longer built into the site.
 *
 * Kept as a small API (`useGameData()` / `getGameData()`) rather than raw imports so
 * every consumer gets the same normalised data (see normaliseArmour* below).
 */
import abilities from './abilities.json';
import campaignRules from './campaign-rules.json';
import factions from './factions.json';
import fighters from './fighters.json';
import items from './items.json';
import weaponRules from './weapon-rules.json';
import weapons from './weapons.json';

/** Display names for fighter stats. JSON keys stay `defense`; readers see Armour. */
export interface StatLabels {
  defense: string;
  /** Column abbreviation in compact stat tables (M/F/S/A/H/B). */
  defenseShort: string;
}

type Fighter = (typeof fighters)[number] & { defense?: number };
type Item = (typeof items)[number];

export interface GameData {
  /** Ruleset number, e.g. for display. Saved-warband storage keys do NOT use it. */
  ruleset: string;
  abilities: typeof abilities;
  campaignRules: typeof campaignRules;
  factions: typeof factions;
  fighters: Fighter[];
  items: Item[];
  weaponRules: typeof weaponRules;
  weapons: typeof weapons;
  statLabels: StatLabels;
}

/**
 * Armour used to be called Defense, and WyrdForge exports have used both spellings of
 * the key. Code reads `defense` internally (it's the warband builder's stat key and
 * the key saved warbands use for overrides), so give every fighter a `defense` value
 * taken from `armour` when present. Display labels come from `statLabels`.
 */
function normaliseArmourFighters(list: typeof fighters): Fighter[] {
  return list.map(f => {
    const g = f as typeof f & { armour?: number; defense?: number };
    return { ...g, defense: g.armour ?? g.defense } as Fighter;
  });
}

/** Same idea for items: an `armour` effect counts as the internal `defense` one. */
function normaliseArmourItems(list: typeof items): Item[] {
  return list.map(i => {
    const e = (i as { effect?: { characteristic?: string } | null }).effect;
    return (e && e.characteristic === 'armour'
      ? { ...i, effect: { ...e, characteristic: 'defense' } }
      : i) as Item;
  });
}

const DATA: GameData = {
  ruleset: '1.0',
  abilities,
  campaignRules,
  factions,
  fighters: normaliseArmourFighters(fighters),
  items: normaliseArmourItems(items),
  weaponRules,
  weapons,
  statLabels: { defense: 'Armour', defenseShort: 'A' },
};

/** Kept for existing callers; there's only one ruleset now. */
export const STABLE_DATA: GameData = DATA;

/** The game data. The argument is ignored (left over from versioned docs). */
export function getGameData(_version?: string | null): GameData {
  return DATA;
}

/** The game data, as a hook for components. */
export function useGameData(): GameData {
  return DATA;
}
