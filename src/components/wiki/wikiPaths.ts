import { useLayoutDoc } from '@docusaurus/plugin-content-docs/client';

/** Doc routes for the default version — fallback only; prefer useEquipmentDocPaths(). */
export const DOC_WEAPONS = '/docs/warbands/Equipment/weapons';
export const DOC_ARMOUR = '/docs/warbands/Equipment/armour';

/** Doc ids are stable across versions; the resolved path is not. */
const WEAPONS_DOC_ID = 'warbands/Equipment/weapons';
const ARMOUR_DOC_ID = 'warbands/Equipment/armour';

/**
 * Equipment reference routes for the docs version currently being viewed, so a
 * 0.5 faction page links to the 0.5 weapon list rather than the 1.0 draft.
 */
export function useEquipmentDocPaths(): { weapons: string; armour: string } {
  const weapons = useLayoutDoc(WEAPONS_DOC_ID);
  const armour = useLayoutDoc(ARMOUR_DOC_ID);
  return {
    weapons: weapons?.path ?? DOC_WEAPONS,
    armour: armour?.path ?? DOC_ARMOUR,
  };
}

export function weaponAnchorId(weaponId: string): string {
  return `weapon-${weaponId}`;
}

export function armourAnchorId(itemId: string): string {
  return `armour-${itemId}`;
}

export function specialRuleAnchorId(ruleId: string): string {
  return `rule-${ruleId}`;
}
