/**
 * Swizzled to replace Docusaurus's default two-sentence banner with Wyrdcry copy.
 *
 * Keeps the useful bits of the original: the link points at the *same page* in the
 * stable version when it exists (falling back to that version's main doc), and
 * clicking it saves the preferred version — which is what the warband builder
 * reads to decide whether to show itself.
 *
 * Shown only on versions with a `banner` set in docusaurus.config.js — today that is
 * the deprecated 0.5 (`unmaintained`). An `unreleased` draft version gets the draft copy.
 * Version numbers are read from the version metadata, so the copy stays correct.
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
  const { banner, version } = useDocsVersion();
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
        <div>
          {banner === 'unreleased'
            ? `These rules are a draft for the next Wyrdcry ruleset.`
            : `These are the deprecated ${version} Wyrdcry rules, kept for reference.`}
        </div>
        <div>
          {/* `.name` is the bare version ("0.9"); `.label` may carry a suffix. */}
          For the current {latestVersionSuggestion.label} rules,{' '}
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
