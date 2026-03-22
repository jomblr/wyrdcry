import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import WarbandBuilder from '../components/WarbandBuilder/WarbandBuilder';

export default function WarbandBuilderPage() {
  return (
    <Layout title="Warband Builder" description="Build and manage your Wyrdcry warband">
      {/*
        BrowserOnly ensures localStorage and crypto.randomUUID() are only accessed
        in the browser, not during Docusaurus's server-side pre-rendering.
      */}
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading warband builder…</div>}>
        {() => <WarbandBuilder />}
      </BrowserOnly>
    </Layout>
  );
}
