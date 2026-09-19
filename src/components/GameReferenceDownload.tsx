import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ruleset from '@site/src/data/ruleset.json';

/**
 * Download link for the game reference sheet. Reads the version from
 * `src/data/ruleset.json`, the same file the build names the PDF after, so the
 * link and the file on disk cannot drift apart.
 */
export default function GameReferenceDownload(): React.ReactElement {
  const href = useBaseUrl(`/files/game-reference-${ruleset.slug}.pdf`);
  return <a href={href}>Game Reference (v{ruleset.version})</a>;
}
