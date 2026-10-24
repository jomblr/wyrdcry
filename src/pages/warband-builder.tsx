import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { getGameData } from '@site/src/data/gameData';
import { setBuilderData } from '../components/WarbandBuilder/data';
import WarbandBuilder from '../components/WarbandBuilder/WarbandBuilder';

/**
 * The builder always runs on the current ruleset (1.0). There's no version toggle in
 * the UI any more, so a stale "0.5" preference saved in the browser is ignored.
 */
function VersionedBuilder() {
  const data = getGameData('current');

  // Point the builder's data module at this version before it renders. Done during
  // render (not in an effect) because the children read it on their first render;
  // it's an idempotent assignment, so re-renders are harmless.
  setBuilderData(data);

  // Keyed by ruleset; saved warbands load from that ruleset's own storage namespace.
  return <WarbandBuilder key={data.ruleset} />;
}

export default function WarbandBuilderPage() {
  return (
    <Layout title="Warband Builder" description="Build and manage your Wyrdcry warband">
      {/*
        BrowserOnly ensures localStorage and crypto.randomUUID() are only accessed
        in the browser, not during Docusaurus's server-side pre-rendering.
      */}
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading warband builder…</div>}>
        {() => <VersionedBuilder />}
      </BrowserOnly>
    </Layout>
  );
}
