/**
 * Recruitment cap for fighter profiles (faction docs + TOC).
 * Unlimited (`null` / `undefined`): empty string — don’t show a range.
 * Limited: `0-X` (e.g. `0-3`).
 */
export function limitLabel(limit: number | null | undefined): string {
  if (limit == null) return '';
  return `0-${limit}`;
}

/** Highest cost first; tie-break by name for stable ordering. */
export function compareFightersByCostThenName<T extends { cost: number; name: string }>(
  a: T,
  b: T,
): number {
  return b.cost - a.cost || a.name.localeCompare(b.name);
}

const ROLE_ORDER: Record<string, number> = { LEADER: 0, HERO: 1, HENCHMAN: 2 };

function roleRank(keywords: string[] | null | undefined): number {
  let best = 3; // unknown roles go last
  for (const kw of keywords ?? []) {
    const rank = ROLE_ORDER[kw.toUpperCase()];
    if (rank !== undefined && rank < best) best = rank;
  }
  return best;
}

/** LEADER → HERO → HENCHMAN, alphabetically within each group. */
export function compareFightersByRoleThenName<
  T extends { name: string; keywords?: string[] | null },
>(a: T, b: T): number {
  return roleRank(a.keywords) - roleRank(b.keywords) || a.name.localeCompare(b.name);
}
