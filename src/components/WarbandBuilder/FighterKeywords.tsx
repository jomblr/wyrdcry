import React from 'react';
import styles from './warband-builder.module.css';

interface Props {
  /** The fighter's keywords as they are now (see `currentKeywords`) */
  keywords: string[];
}

/**
 * Race then role keywords, as on the wiki fighter cards. The faction keyword is left
 * out: every fighter in a warband shares it, so it would only repeat down the roster.
 */
export default function FighterKeywords({ keywords }: Props) {
  if (keywords.length === 0) return null;
  return <span className={styles.fighterKeywords}>{keywords.join(' · ')}</span>;
}
