import React from 'react';
import { GiIronCross } from 'react-icons/gi';

/**
 * Inline iron cross icon (HERO only). Use in MDX: <HeroOnly /> or <IronCross />
 */
export default function HeroOnlyIcon() {
  return (
    <GiIronCross
      className="faction-weapon-hero-icon"
      title="HERO only"
      aria-hidden="true"
    />
  );
}
