/**
 * Fighter card titles are React `<h3>`s, so Docusaurus does not put them in the doc TOC at build time.
 * We inject matching TOC rows (same `id` as `fighter-${id}` on the cards) after `## Fighters {#fighters}`.
 * Swizzled TOC components call {@link useMergeFighterToc}.
 */
import { useMemo } from 'react';
import { useDoc } from '@docusaurus/plugin-content-docs/client';
import type { TOCItem } from '@docusaurus/mdx-loader';
import fightersData from '@site/src/data/fighters.json';
import { compareFightersByRoleThenName, limitLabel } from './factionUtils';

/**
 * Optional front matter on any doc page that uses `<FactionFighters />` but whose
 * permalink does not match {@link factionIdFromPermalink} (e.g. a shallow `/warbands/slug` route).
 */
export type FactionTocFrontMatter = {
  /** When set, used as the faction id for TOC merge instead of inferring from the URL. */
  faction_id?: string;
};

/** Prefer permalink (SSR-safe) over client-only pathname. */
export function factionIdFromPermalink(permalink: string): string | null {
  const fromFactions = permalink.match(/\/Factions\/([^/]+)\/?$/i);
  if (fromFactions?.[1]) {
    return fromFactions[1];
  }
  // e.g. `/docs/warbands/clan-eshin` (single segment under warbands) — not `/warbands/Equipment/...`
  const shallow = permalink.match(/\/warbands\/([^/]+)\/?$/i);
  return shallow?.[1] ?? null;
}

/**
 * Resolves faction id for fighter TOC injection: explicit `faction_id` in front matter wins,
 * then {@link factionIdFromPermalink}.
 */
export function resolveFactionIdForToc(
  permalink: string,
  frontMatterFactionId: string | undefined | null,
): string | null {
  const explicit =
    typeof frontMatterFactionId === 'string' ? frontMatterFactionId.trim() : '';
  if (explicit.length > 0) {
    return explicit;
  }
  return factionIdFromPermalink(permalink);
}

function isFightersSectionHeading(t: { level: number; id?: string; value?: string }): boolean {
  if (t.level !== 2) return false;
  const id = t.id ?? '';
  if (id === 'fighters' || /^fighters$/i.test(id)) return true;
  const value = typeof t.value === 'string' ? t.value : '';
  const plain = value.replace(/<[^>]+>/g, '').trim();
  return /^fighters$/i.test(plain);
}

/** TOC link labels use `dangerouslySetInnerHTML` — escape text-only fighter names. */
function tocLabelHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fighterTocEntries(factionId: string): TOCItem[] {
  return fightersData
    .filter(f => f.faction === factionId)
    .sort(compareFightersByRoleThenName)
    .map(f => {
      const lim = limitLabel(f.limit);
      const label = lim ? `${f.name} (${lim})` : f.name;
      return {
        value: tocLabelHtml(label),
        id: `fighter-${f.id}`,
        level: 3,
      };
    });
}

/** Insert fighter h3 entries into the doc TOC after the `## Fighters` heading (id `fighters`). */
export function mergeFighterToc(base: readonly TOCItem[], factionId: string | null): TOCItem[] {
  if (!factionId) {
    return [...base];
  }
  const extra = fighterTocEntries(factionId);
  if (extra.length === 0) {
    return [...base];
  }
  const arr = [...base];
  const idx = arr.findIndex(t => isFightersSectionHeading(t));
  if (idx === -1) {
    return [...arr, ...extra];
  }
  return [...arr.slice(0, idx + 1), ...extra, ...arr.slice(idx + 1)];
}

/** Must run under `DocProvider` (e.g. swizzled `DocItem/TOC/*`). Uses doc permalink so faction pages work on SSR. */
export function useMergeFighterToc(base: readonly TOCItem[]): TOCItem[] {
  const { metadata, frontMatter } = useDoc();
  const faction_id = (frontMatter as FactionTocFrontMatter).faction_id;
  return useMemo(() => {
    const factionId = resolveFactionIdForToc(metadata.permalink, faction_id);
    return mergeFighterToc(base, factionId);
  }, [base, metadata.permalink, faction_id]);
}
