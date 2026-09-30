/**
 * Swizzled to replace Docusaurus's default two-sentence banner with Wyrdcry copy.
 *
 * Keeps the useful bits of the original: the link points at the *same page* in the
 * stable version when it exists (falling back to that version's main doc), and
 * clicking it saves the preferred version — which is what the warband builder
 * reads to decide whether to show itself.
 *
 * Note: "0.9" below is literal. Update it when the draft version changes.
 * The stable version's number is read from the version metadata, so that half
 * stays correct on its own.
 */
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { ThemeClassNames } from '@docusaurus/theme-common';
import CrowIcon from '@site/src/components/CrowIcon';
import {
  useActivePlugin,
  useDocVersionSuggestions,
  useDocsPreferredVersion,
  useDocsVersion,
} from '@docusaurus/plugin-content-docs/client';

interface Props {
  readonly className?: string;
}

function DocVersionBannerEnabled({ className }: Props) {
  const { pluginId } = useActivePlugin({ failfast: true });
  const { savePreferredVersionName } = useDocsPreferredVersion(pluginId);
  const { latestDocSuggestion, latestVersionSuggestion } = useDocVersionSuggestions(pluginId);

  // Prefer the equivalent page in the stable version; fall back to its main doc.
  const latestVersionSuggestedDoc =
    latestDocSuggestion ??
    latestVersionSuggestion.docs.find(doc => doc.id === latestVersionSuggestion.mainDocId);

  return (
    <div
      className={clsx(
        className,
        ThemeClassNames.docs.docVersionBanner,
        'alert alert--warning margin-bottom--md',
        'wyrd-version-banner',
      )}
      role="alert">
      <CrowIcon className="wyrd-version-banner-icon" />
      <div>
        <div>These rules are a draft for the 0.9 Wyrdcry ruleset.</div>
        <div>
          {/* `.name` is the bare version ("0.5"); `.label` carries the "(stable)" suffix. */}
          To use the {latestVersionSuggestion.name} playtest,{' '}
          <Link
            to={latestVersionSuggestedDoc?.path}
            onClick={() => savePreferredVersionName(latestVersionSuggestion.name)}>
            click here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DocVersionBanner({ className }: Props): React.ReactNode {
  const versionMetadata = useDocsVersion();
  if (versionMetadata.banner) {
    return <DocVersionBannerEnabled className={className} />;
  }
  return null;
}
