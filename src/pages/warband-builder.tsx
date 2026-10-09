import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useDocsPreferredVersion } from '@docusaurus/plugin-content-docs/client';
import { getGameData } from '@site/src/data/gameData';
import { setBuilderData } from '../components/WarbandBuilder/data';
import WarbandBuilder from '../components/WarbandBuilder/WarbandBuilder';

/**
 * Runs the builder against the ruleset picked in the navbar version dropdown — 0.9 by
 * default, the deprecated 0.5 when the reader has switched to it. The page isn't a docs
 * page, so there's no "current doc version"; the dropdown's saved preference is the
 * only signal available here.
 */
function VersionedBuilder() {
  const { preferredVersion } = useDocsPreferredVersion('default');
  const data = getGameData(preferredVersion?.name);

  // Point the builder's data module at this version before it renders. Done during
  // render (not in an effect) because the children read it on their first render;
  // it's an idempotent assignment, so re-renders are harmless.
  setBuilderData(data);

  // Keyed by ruleset so switching versions remounts the builder from scratch: fresh
  // state, and saved warbands loaded from that version's own storage namespace. A
  // 0.5 warband is never shown against 0.9 data.
  return <WarbandBuilder key={data.ruleset} />;
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
        {() => <VersionedBuilder />}
      </BrowserOnly>
    </Layout>
  );
}
