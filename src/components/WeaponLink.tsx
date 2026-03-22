import React from 'react';

interface WeaponLinkProps {
  /** Weapon slug, e.g. "dagger". Prefix with * for hero-only. */
  weaponId: string;
}

/**
 * Inline weapon link with hover tooltip.
 * TODO: wire up to new data source.
 */
export default function WeaponLink({ weaponId }: WeaponLinkProps) {
  const slug = weaponId.startsWith('*') ? weaponId.slice(1).trim() : weaponId;
  return <span>{slug}</span>;
}
