import React from 'react';
import type { TOCItem } from '@docusaurus/mdx-loader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Heading from '@theme/Heading';
import { useGameData, type GameData } from '@site/src/data/gameData';
import CrowIcon from '../CrowIcon';

type ItemType = 'miscellaneous' | 'single-use';

/** Trading Post items of one type: no faction-only items; common first, then rare, A–Z. */
export function tradingPostItems(items: GameData['items'], type: ItemType): GameData['items'] {
  return items
    .filter(i => i.type === type && !(i as { faction?: string }).faction)
    .sort((a, b) => Number(a.rare) - Number(b.rare) || a.name.localeCompare(b.name));
}

/** Section h2 id on the page → item type listed under it. */
const SECTION_TYPES: Record<string, ItemType> = {
  'miscellaneous-items': 'miscellaneous',
  'single-use': 'single-use',
};

/**
 * The item headings are React `<h3>`s, so Docusaurus doesn't put them in the TOC at build
 * time. Inject matching rows (same ids as the headings) after each section's `##` heading,
 * like fighter names on faction pages. Opt-in per page with `trading_post: true` front matter.
 */
export function mergeTradingPostToc(base: readonly TOCItem[], items: GameData['items']): TOCItem[] {
  const out: TOCItem[] = [];
  for (const t of base) {
    out.push(t);
    const type = t.level === 2 && t.id ? SECTION_TYPES[t.id] : undefined;
    if (!type) continue;
    for (const i of tradingPostItems(items, type)) {
      // TOC labels are rendered as HTML; item names are plain text, so escape them.
      const label = `${i.name} (${i.cost}gc)`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out.push({ value: label, id: i.id, level: 3 });
    }
  }
  return out;
}

/**
 * Trading Post item list, rendered from items.json:
 *   <TradingPostItems type="miscellaneous" />
 *   <TradingPostItems type="single-use" />
 *
 * - Faction-only items (those with a `faction` in items.json, e.g. Prayer Beads) are left
 *   out — they're bought from their faction's own list, not the Trading Post.
 * - Rare items get the crow icon.
 * - Order: common items first, then rare, each alphabetical.
 */
export default function TradingPostItems({ type }: { type: ItemType }) {
  const { items } = useGameData();
  const list = tradingPostItems(items, type);

  return (
    <>
      {list.map(i => (
        <React.Fragment key={i.id}>
          <Heading as="h3" id={i.id}>
            {i.rare && <><CrowIcon title="Rare" />{' '}</>}
            {i.name} ({i.cost}gc)
          </Heading>
          {/* Descriptions can carry markdown (bold, `KEYWORDS`); render it inline. */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{i.description.trim()}</ReactMarkdown>
        </React.Fragment>
      ))}
    </>
  );
}
