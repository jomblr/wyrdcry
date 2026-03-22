import React from 'react';
import clsx from 'clsx';
import { ThemeClassNames, useThemeConfig } from '@docusaurus/theme-common';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import TOCCollapsible from '@theme/TOCCollapsible';
import { useMergeFighterToc } from '@site/src/components/wiki/mergeFighterToc';
import styles from './styles.module.css';

export default function DocItemTOCMobile(): React.ReactNode {
  const { toc, frontMatter } = useDoc();
  const themeConfig = useThemeConfig();
  const mergedToc = useMergeFighterToc(toc);
  const minHeadingLevel =
    frontMatter.toc_min_heading_level ?? themeConfig.tableOfContents.minHeadingLevel;
  const maxHeadingLevel =
    frontMatter.toc_max_heading_level ?? themeConfig.tableOfContents.maxHeadingLevel;
  return (
    <TOCCollapsible
      toc={mergedToc}
      minHeadingLevel={minHeadingLevel}
      maxHeadingLevel={maxHeadingLevel}
      className={clsx(ThemeClassNames.docs.docTocMobile, styles.tocMobile)}
    />
  );
}
