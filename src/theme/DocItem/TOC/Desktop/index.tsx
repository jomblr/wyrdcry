import React from 'react';
import { ThemeClassNames, useThemeConfig } from '@docusaurus/theme-common';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import TOC from '@theme/TOC';
import { useMergeFighterToc } from '@site/src/components/wiki/mergeFighterToc';

export default function DocItemTOCDesktop(): React.ReactNode {
  const { toc, frontMatter } = useDoc();
  const themeConfig = useThemeConfig();
  const mergedToc = useMergeFighterToc(toc);
  const minHeadingLevel =
    frontMatter.toc_min_heading_level ?? themeConfig.tableOfContents.minHeadingLevel;
  const maxHeadingLevel =
    frontMatter.toc_max_heading_level ?? themeConfig.tableOfContents.maxHeadingLevel;
  return (
    <TOC
      toc={mergedToc}
      minHeadingLevel={minHeadingLevel}
      maxHeadingLevel={maxHeadingLevel}
      className={ThemeClassNames.docs.docTocDesktop}
    />
  );
}
