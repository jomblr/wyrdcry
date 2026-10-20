/**
 * Random names for newly added fighters, from the pools in `src/data/names/`
 * (see the README there for the file format).
 *
 * Only used when a fighter is added; a name the user has typed is never replaced.
 */
import { hasTag, type fightersData } from './data';
import factionRules from '@site/src/data/names/factions.json';
import human from '@site/src/data/names/human.json';
import skaven from '@site/src/data/names/skaven.json';

type Fighter = (typeof fightersData)[number];

interface NameFile {
  race: string;
  /** Chance (0–1) that a mixed-gender faction picks a male name. Unset = all names equally likely. */
  male_share?: number;
  names: { male: string[]; female: string[]; neutral: string[] };
}

// A new race file must be imported and listed here as well.
const NAME_FILES: NameFile[] = [human, skaven];

/** Races with no list of their own (VAMPIRE, GHOUL, DAEMON, …) belong to human warbands. */
const FALLBACK_RACE = 'HUMAN';

export const DEFAULT_FIGHTER_NAME = 'New Fighter';

function nameFileFor(fighter: Fighter): NameFile | undefined {
  return (
    NAME_FILES.find(f => fighter.race.includes(f.race)) ??
    NAME_FILES.find(f => f.race === FALLBACK_RACE)
  );
}

function pickFrom(pool: string[], taken: Set<string>): string | null {
  const unused = pool.filter(n => !taken.has(n));
  const from = unused.length > 0 ? unused : pool;
  return from.length > 0 ? from[Math.floor(Math.random() * from.length)] : null;
}

/**
 * Name for a fighter being added. Beasts and thralls keep their profile name
 * ("War Hound", "Zombie"); everyone else gets a random name from their pool,
 * avoiding names already in the warband while any are left.
 */
export function newFighterName(fighter: Fighter, takenNames: string[]): string {
  if (hasTag(fighter, 'BEAST') || hasTag(fighter, 'THRALL')) {
    return fighter.name;
  }
  const file = nameFileFor(fighter);
  if (!file) return DEFAULT_FIGHTER_NAME;
  const taken = new Set(takenNames);
  const { male, female, neutral } = file.names;
  const rule = (factionRules as Record<string, string>)[fighter.faction] ?? 'random';

  if (rule === 'female') return pickFrom([...female, ...neutral], taken) ?? DEFAULT_FIGHTER_NAME;
  if (rule === 'male') return pickFrom([...male, ...neutral], taken) ?? DEFAULT_FIGHTER_NAME;

  // Mixed: weight male vs everyone else by male_share, if the file sets one.
  if (file.male_share !== undefined) {
    const others = [...female, ...neutral];
    const [first, second] = Math.random() < file.male_share ? [male, others] : [others, male];
    // Try the drawn side's unused names first; only repeat a name once both sides are used up.
    const firstUnused = first.filter(n => !taken.has(n));
    const secondUnused = second.filter(n => !taken.has(n));
    return (
      pickFrom(firstUnused.length > 0 ? firstUnused : secondUnused, taken) ??
      pickFrom([...first, ...second], taken) ??
      DEFAULT_FIGHTER_NAME
    );
  }
  return pickFrom([...male, ...female, ...neutral], taken) ?? DEFAULT_FIGHTER_NAME;
}
