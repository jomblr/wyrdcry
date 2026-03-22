/** Doc routes (no baseUrl prefix — used with Docusaurus <Link to>) */
export const DOC_WEAPONS = '/docs/warbands/Equipment/weapons';
export const DOC_ARMOUR = '/docs/warbands/Equipment/armour';

export function weaponAnchorId(weaponId: string): string {
  return `weapon-${weaponId}`;
}

export function armourAnchorId(itemId: string): string {
  return `armour-${itemId}`;
}

export function specialRuleAnchorId(ruleId: string): string {
  return `rule-${ruleId}`;
}
