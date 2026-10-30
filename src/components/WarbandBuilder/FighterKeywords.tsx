import React from 'react';
import styles from './warband-builder.module.css';

interface Props {
  race: string[];
  keywords: string[];
}

/**
 * Race then role keywords, as on the wiki fighter cards. The faction keyword is left
 * out: every fighter in a warband shares it, so it would only repeat down the roster.
 */
export default function FighterKeywords({ race, keywords }: Props) {
  // Some keywords (THRALL, BEAST) exist as both a race and an archetype.
  const tokens = Array.from(new Set([...race, ...keywords]));
  if (tokens.length === 0) return null;
  return <span className={styles.fighterKeywords}>{tokens.join(' · ')}</span>;
}
