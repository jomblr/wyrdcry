import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useDocsPreferredVersion } from '@docusaurus/plugin-content-docs/client';
import WarbandBuilder from '../components/WarbandBuilder/WarbandBuilder';

/** Docs version name of the in-progress draft (the unreleased "current" version). */
const DRAFT_VERSION = 'current';

/**
 * The builder reads `src/data/*.json` directly rather than the version-aware
 * resolver in `src/data/gameData.ts`, so it cannot render the draft's rules.
 * Rather than show numbers that don't match the version the reader picked, we
 * hide it while they're on the 0.9 draft.
 */
function DraftNotice() {
  return (
    <div style={{ padding: '3rem 1.25rem', maxWidth: '38rem', margin: '0 auto' }}>
      <p>
        The warband builder is not available for the 0.9 draft, but will be updated
        separately.
      </p>
    </div>
  );
}

function BuilderOrNotice() {
  const { preferredVersion } = useDocsPreferredVersion('default');
  if (preferredVersion?.name === DRAFT_VERSION) {
    return <DraftNotice />;
  }
  return <WarbandBuilder />;
}

export default function WarbandBuilderPage() {
  return (
    <Layout title="Warband Builder" description="Build and manage your Wyrdcry warband">
      {/*
        BrowserOnly ensures localStorage and crypto.randomUUID() are only accessed
        in the browser, not during Docusaurus's server-side pre-rendering. The
        preferred-version check is also localStorage-backed, so it lives in here too.
      */}
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading warband builder…</div>}>
        {() => <BuilderOrNotice />}
      </BrowserOnly>
    </Layout>
  );
}
