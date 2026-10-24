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

let active: GameData = STABLE_DATA;

/**
 * Point the builder at a version's data. Call before the builder renders
 * (warband-builder.tsx does this, then keys the builder by version).
 */
export function setBuilderData(data: GameData): void {
  active = data;
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
