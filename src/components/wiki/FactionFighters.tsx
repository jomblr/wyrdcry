import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { ThemeClassNames } from '@docusaurus/theme-common';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSlug from 'rehype-slug';
import Heading from '@theme/Heading';
import fightersData from '@site/src/data/fighters.json';
import factionsData from '@site/src/data/factions.json';
import abilitiesData from '@site/src/data/abilities.json';
import { compareFightersByCostThenName, limitLabel } from './factionUtils';
import wb from '../WarbandBuilder/warband-builder.module.css';

type Fighter = (typeof fightersData)[number];

interface Props {
  factionId: string;
}

function MarkdownLink(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown },
) {
  const { href, children, node: _node, ...rest } = props;
  if (!href) {
    return <a {...rest}>{children}</a>;
  }
  if (href.startsWith('#')) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

const fighterAbilityComponents: Components = {
  a: MarkdownLink,
  h4: ({ node: _n, ...props }) => <Heading as="h4" {...props} />,
  h5: ({ node: _n, ...props }) => <Heading as="h5" {...props} />,
  h6: ({ node: _n, ...props }) => <Heading as="h6" {...props} />,
};

/** Abilities text from JSON: GFM (lists, tables, strikethrough), soft line breaks, slugged sub-headings. */
function FighterAbilitiesMarkdown({ source }: { source: string }) {
  return (
    <div
      className={clsx(
        'fighter-abilities',
        ThemeClassNames.docs.docMarkdown,
        'markdown',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSlug]}
        components={fighterAbilityComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

/**
 * One section per fighter from `fighters.json` — add `## Fighters {#fighters}` in MDX above this.
 * Fighter names in the right-hand TOC are merged in `mergeFighterToc.ts` (not from these React `h3`s).
 * Set front matter `faction_id` on the faction doc (see `FactionTocFrontMatter` in `mergeFighterToc.ts`) so fighter names merge into the right-hand TOC; URLs are also inferred when omitted.
 */
export default function FactionFighters({ factionId }: Props) {
  const fighters = fightersData
    .filter(f => f.faction === factionId)
    .sort(compareFightersByCostThenName);

  if (fighters.length === 0) {
    return (
      <p>
        <em>
          No fighters defined for this faction in{' '}
          <code>src/data/fighters.json</code>. Each fighter must include{' '}
          <code>&quot;faction&quot;: &quot;{factionId}&quot;</code> (same id as{' '}
          <code>factionId</code> on this page). Editing the{' '}
          <code>fighters</code> array in <code>factions.json</code> does not
          affect these cards.
        </em>
      </p>
    );
  }

  return (
    <div>
      {fighters.map(f => (
        <FighterSection key={f.id} fighter={f} />
      ))}
    </div>
  );
}

function FighterKeywordLine({ fighter: f }: { fighter: Fighter }) {
  const factionName =
    factionsData.find(x => x.id === f.faction)?.name ?? f.faction;
  const races = f.race ?? [];
  const roleKeywords = f.keywords ?? [];

  /** Race, warband faction name, then role/other keywords — all shown as one list. */
  const tokens = [...races, factionName, ...roleKeywords];

  return (
    <div className="fighterCardKeywords">
      {tokens.map((token, i) => (
        <React.Fragment key={`${token}-${i}`}>
          {i > 0 ? ', ' : null}
          <code>{token}</code>
        </React.Fragment>
      ))}
    </div>
  );
}

const ABILITY_TYPE_ORDER = ['trait', 'reaction', 'double', 'triple', 'quad'];

function abilityTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function abilityTypeSortKey(type: string): number {
  const i = ABILITY_TYPE_ORDER.indexOf(type);
  return i === -1 ? ABILITY_TYPE_ORDER.length : i;
}

function resolvedAbilitiesMarkdown(fighter: Fighter): string {
  const f = fighter as { faction_ability_ids?: string[]; ability_preamble?: string; abilities?: string };
  const ids = f.faction_ability_ids;
  if (ids && ids.length > 0) {
    const preamble = f.ability_preamble?.trim() ? `${f.ability_preamble.trim()}\n\n` : '';
    const list = ids
      .map(id => abilitiesData.find(a => a.id === id))
      .filter((a): a is (typeof abilitiesData)[number] => a !== undefined)
      .sort((a, b) => abilityTypeSortKey(a.ability_type) - abilityTypeSortKey(b.ability_type))
      .map(a => `**[${abilityTypeLabel(a.ability_type)}] ${a.name}:** ${a.description}`)
      .join('\n\n');
    return preamble + list;
  }
  return f.abilities?.trim() ?? '';
}

function FighterSection({ fighter: f }: { fighter: Fighter }) {
  const abilities = resolvedAbilitiesMarkdown(f);
  const description = f.description?.trim() ?? '';
  const limitText = limitLabel(f.limit);
  const titleWithLimit = limitText ? `${f.name} (${limitText})` : f.name;

  return (
    <div className="fighterCard">
      <section className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
        <Heading as="h3" id={`fighter-${f.id}`} className="fighterCardHeading">
          {titleWithLimit}
        </Heading>
        <p>
          <strong>{f.cost} gc</strong>
        </p>
        {description ? (
          <p>
            <em>{description}</em>
          </p>
        ) : null}

        <div className="fighterCardStats">
          <div className={wb.tableScrollOuterWiki}>
            <div className={`${wb.tableWrapper} ${wb.wbGrid} ${wb.fighterStatsRefGrid}`}>
              <div className={wb.gridHeader}>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Move</div>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Fight</div>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Shoot</div>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Defense</div>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Health</div>
                <div className={`${wb.hCell} ${wb.hCellCenter}`}>Bravery</div>
              </div>
              <div className={wb.gridRow}>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.move}&quot;</div>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.fight}</div>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.shoot}</div>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.defense}</div>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.health}</div>
                <div className={`${wb.cell} ${wb.cellCenter}`}>{f.bravery}+</div>
              </div>
            </div>
          </div>
        </div>

        {abilities ? <FighterAbilitiesMarkdown source={abilities} /> : null}

        <FighterKeywordLine fighter={f} />
      </section>
    </div>
  );
}
