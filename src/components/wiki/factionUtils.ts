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
