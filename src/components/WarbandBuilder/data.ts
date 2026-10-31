/**
 * Game data for the warband builder, for whichever ruleset version is active.
 *
 * The builder used to import `@site/src/data/*.json` directly, which pinned it to 0.5.
 * These exports keep the same names (`weaponsData`, `fightersData`, …) so call sites
 * didn't need rewriting, but each one forwards to the active version's data from
 * `src/data/gameData.ts` — the same source the rules pages use, so the builder and
 * the docs can never disagree about what a version contains.
 *
 * Why forwarding objects rather than React context: ~25 module-level helpers
 * (labelFor, costFor, countSlots, the reducer, …) read this data outside any
 * component. Threading a context value through all of them would be a large,
 * error-prone diff. This is safe because:
 *   - the builder only ever accesses these via `.find` / `.filter` / property reads;
 *   - only one version is active at a time, and the page remounts the builder
 *     (keyed by version) when it changes, so no component ever sees a mix;
 *   - the builder renders client-side only (BrowserOnly), so there's no SSR to leak into.
 *
 * Gotcha: don't cache derived data at module scope, e.g.
 * `const armour = itemsData.filter(...)` at the top of a file. That runs once, at
 * import time, against whatever version was active then. Compute it inside the
 * function or component that needs it.
 */
import { STABLE_DATA, type GameData, type StatLabels } from '@site/src/data/gameData';

/**
 * Mutated weapons (Tentacles, Great Claw, …) come from rolling on the mutation table, never
 * from buying, so the builder treats them as free whatever cost the data gives them. Done here
 * once so totals, the Purchase sum, affordability and sale prices all agree.
 */
function forBuilder(data: GameData): GameData {
  return {
    ...data,
    weapons: data.weapons.map(w => (w.type === 'mutated' ? { ...w, cost: 0 } : w)),
    abilities: data.abilities.map(normaliseAbility) as GameData['abilities'],
  };
}

/** Older WyrdForge exports: `effects` (now `modifiers`), and the legacy categories. */
const LEGACY_CATEGORIES: Record<string, string> = { specialization: 'strength', faction: 'unique' };
function normaliseAbility(a: GameData['abilities'][number]) {
  const raw = a as typeof a & { modifiers?: AbilityModifier[]; effects?: AbilityModifier[] };
  return {
    ...a,
    category: LEGACY_CATEGORIES[a.category] ?? a.category,
    modifiers: raw.modifiers ?? raw.effects ?? [],
  };
}

let active: GameData = forBuilder(STABLE_DATA);

/**
 * Point the builder at a version's data. Call before the builder renders
 * (warband-builder.tsx does this, then keys the builder by version).
 */
export function setBuilderData(data: GameData): void {
  active = forBuilder(data);
}

/** Mutated weapons are part of the fighter's body: free, added straight away, and only removed. */
export function isMutatedWeapon(id: string): boolean {
  return active.weapons.some(w => w.id === id && w.type === 'mutated');
}

/** Forward every property read to the active version's value for `key`. */
function live<K extends keyof GameData>(key: K): GameData[K] {
  return new Proxy({} as object, {
    get(_target, prop) {
      const value = active[key] as unknown as Record<string | symbol, unknown>;
      const v = value[prop];
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(value) : v;
    },
  }) as GameData[K];
}

export const abilitiesData = live('abilities');
export const campaignRules = live('campaignRules');
export const factionsData = live('factions');
export const fightersData = live('fighters');
export const itemsData = live('items');
export const weaponRulesData = live('weaponRules');
export const weaponsData = live('weapons');

/**
 * Whether a fighter carries a tag such as BEAST, THRALL or DAEMON. These moved from
 * `race` (0.9 data) to `keywords` (1.0 data) for some fighters, so check both.
 */
export function hasTag(fighter: { race: string[]; keywords: string[] }, tag: string): boolean {
  return fighter.race.includes(tag) || fighter.keywords.includes(tag);
}

/**
 * Wizards whose preamble says "select one of the following magical abilities" choose their
 * spells, so their `faction_ability_ids` are options rather than rules they have. The data has
 * no structured field for this yet, so read it from the preamble.
 */
const CHOOSE_ONE = /select one of the following magical abilities/i;

type AbilityProfile = { faction_ability_ids?: string[]; ability_preamble?: string };

/** The abilities the fighter picks from (learned ones are stored with its talents). */
export function optionalAbilityIds(fighter: AbilityProfile): string[] {
  return CHOOSE_ONE.test(fighter.ability_preamble ?? '') ? fighter.faction_ability_ids ?? [] : [];
}

/** A wizard (or the Matriarch) who hasn't picked their starting ability yet. */
export function needsStartingAbility(fighter: AbilityProfile, instance: { talents?: string[] }): boolean {
  const options = optionalAbilityIds(fighter);
  return options.length > 0 && !options.some(id => instance.talents?.includes(id));
}

/** The abilities the fighter always has. */
export function fixedAbilityIds(fighter: AbilityProfile): string[] {
  return optionalAbilityIds(fighter).length > 0 ? [] : fighter.faction_ability_ids ?? [];
}

/**
 * A permanent change an ability makes to the fighter who has it: a characteristic change
 * (`defense` is Armour) or a keyword. Conditional effects stay in the description.
 */
export type AbilityModifier =
  | { characteristic: 'move' | 'fight' | 'shoot' | 'defense' | 'health' | 'bravery'; modifier: number }
  | { keyword: string };

/** Every ability the fighter has: the profile's fixed ones, then talents, spells, injuries and mutations. */
export function fighterAbilityIds(
  profile: { faction_ability_ids?: string[]; ability_preamble?: string },
  instance: { talents?: string[] },
): string[] {
  return [...fixedAbilityIds(profile), ...(instance.talents ?? [])];
}

function modifiersOf(abilityIds: string[]): { name: string; modifier: AbilityModifier }[] {
  return abilityIds.flatMap(id => {
    const a = abilitiesData.find(x => x.id === id) as { name: string; modifiers?: AbilityModifier[] } | undefined;
    return (a?.modifiers ?? []).map(modifier => ({ name: a!.name, modifier }));
  });
}

/** The abilities that change one characteristic, e.g. [{ name: 'Daemonic Chitin', value: 1 }]. */
export function abilityStatChanges(abilityIds: string[], stat: string): { name: string; value: number }[] {
  return modifiersOf(abilityIds).flatMap(({ name, modifier }) =>
    'characteristic' in modifier && modifier.characteristic === stat ? [{ name, value: modifier.modifier }] : []);
}

/** Keywords the fighter's abilities give it, e.g. TERRIFYING. */
export function abilityKeywords(abilityIds: string[]): string[] {
  return modifiersOf(abilityIds).flatMap(({ modifier }) => ('keyword' in modifier ? [modifier.keyword.toUpperCase()] : []));
}

/** A HENCHMAN becomes a HERO on earning their 3rd point of Renown. */
const HERO_AT_RENOWN = 3;

type KeywordProfile = { race: string[]; keywords: string[]; faction_ability_ids?: string[]; ability_preamble?: string };
type KeywordInstance = { renown: number; talents?: string[]; isLeader?: boolean };

/** Whether the fighter is a HERO now: by profile, or a henchman promoted by Renown. */
export function isHeroNow(profile: KeywordProfile, instance: KeywordInstance): boolean {
  return hasTag(profile, 'HERO') || (hasTag(profile, 'HENCHMAN') && instance.renown >= HERO_AT_RENOWN);
}

/**
 * Race then role keywords as the fighter has them now: HENCHMAN swapped for HERO once promoted,
 * LEADER for the leader, then keywords its abilities give (TERRIFYING, …), without repeats.
 */
export function currentKeywords(profile: KeywordProfile, instance: KeywordInstance): string[] {
  const promoted = !hasTag(profile, 'HERO') && isHeroNow(profile, instance);
  const role = promoted ? profile.keywords.map(k => (k === 'HENCHMAN' ? 'HERO' : k)) : profile.keywords;
  return Array.from(new Set([
    ...profile.race,
    ...role,
    ...(instance.isLeader ? ['LEADER'] : []),
    ...abilityKeywords(fighterAbilityIds(profile, instance)),
  ]));
}

/** Stat labels for the active version (e.g. Defense vs Armour). Read at render time. */
export function statLabels(): StatLabels {
  return active.statLabels;
}

/**
 * localStorage key prefix for saved warbands. Fixed at `wyrdcry-0.9-` on purpose: that's
 * where warbands built on these rules were saved before the 1.0 release (as "0.9"),
 * so changing it would hide everyone's saved warbands. Don't derive it from `ruleset`.
 */
export function storagePrefix(): string {
  return 'wyrdcry-0.9-';
}
