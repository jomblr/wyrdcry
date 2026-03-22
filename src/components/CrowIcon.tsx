import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * Inline crow icon (uses static/img/crow.svg). Use in MDX: <CrowIcon /> or <Crow />
 */
export default function CrowIcon({ title = 'Crow', ...props }) {
  const src = useBaseUrl('img/crow.svg');
  return (
    <img
      src={src}
      alt=""
      className="faction-weapon-hero-icon"
      title={title}
      aria-hidden="true"
      {...props}
    />
  );
}
