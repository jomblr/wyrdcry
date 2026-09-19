import React from 'react';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import sections from '@site/src/data/game-reference.json';
import ruleset from '@site/src/data/ruleset.json';
import weaponRules from '@site/src/data/weapon-rules.json';
import universalAbilities from '@site/src/data/universal-abilities.json';
import { inlineText, abilityDiceLabel } from '@site/src/components/inlineText';
import styles from './game-reference.module.css';

/**
 * Printable two-page game reference.
 *
 * The condensed wordings live in `src/data/game-reference.json`. The ability and
 * weapon rule lists come from the same data files the wiki and the warband
 * builder use, so a rule added there appears here on its own. Their wording can
 * differ: an entry carrying a `short` field is printed with that instead of the
 * full `description`. `npm run pdf:reference` renders this route to a PDF, and
 * refuses to write one longer than two pages.
 */

type Term = { term: string; text: string };
type Step = { title: string; text: string };
type DataSource = 'universal-abilities' | 'weapon-rules';

/** Shared rule data, which may carry a shorter wording written for this sheet. */
type RuleText = { id: string; name: string; description: string; short?: string };
type AbilityText = RuleText & { ability_type: string; keyword: string };

type Block =
  | { type: 'prose'; heading?: string; text: string }
  | { type: 'callout'; heading?: string; text: string }
  | { type: 'bullets'; heading?: string; items: string[] }
  | { type: 'steps'; heading?: string; items: Step[] }
  | { type: 'terms'; heading?: string; items: Term[] }
  | { type: 'table'; heading?: string; columns: string[]; align?: string[]; rows: string[][] }
  | { type: 'data'; heading?: string; source: DataSource; exclude?: string[] };

type Section = {
  id: string;
  title: string;
  titleStyle?: 'tab';
  source?: string;
  blocks: Block[];
};

function TermList({ items }: { items: Term[] }): React.ReactElement {
  return (
    <dl className={styles.terms}>
      {items.map(item => (
        <React.Fragment key={item.term}>
          <dt>{item.term}</dt>
          <dd>{inlineText(item.text)}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function dataTerms(source: DataSource, exclude: string[] = []): Term[] {
  if (source === 'universal-abilities') {
    return (universalAbilities as AbilityText[])
      .filter(ability => !exclude.includes(ability.id))
      .map(ability => {
        const text = ability.short ?? ability.description;
        return {
          term: `${abilityDiceLabel(ability.ability_type)} ${ability.name}`,
          text: ability.keyword === 'Any' ? text : `\`${ability.keyword}\` only. ${text}`,
        };
      });
  }
  return (weaponRules as RuleText[])
    .filter(rule => !exclude.includes(rule.id))
    .map(rule => ({ term: rule.name, text: rule.short ?? rule.description }));
}

function BlockBody({ block }: { block: Block }): React.ReactElement | null {
  switch (block.type) {
    case 'prose':
      return <p className={styles.prose}>{inlineText(block.text)}</p>;
    case 'callout':
      return <p className={styles.callout}>{inlineText(block.text)}</p>;
    case 'bullets':
      return (
        <ul className={styles.bullets}>
          {block.items.map((item, i) => (
            <li key={i}>{inlineText(item)}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className={styles.steps}>
          {block.items.map(step => (
            <li key={step.title}>
              <span className={styles.stepTitle}>{step.title}:</span> {inlineText(step.text)}
            </li>
          ))}
        </ol>
      );
    case 'terms':
      return <TermList items={block.items} />;
    case 'data':
      return <TermList items={dataTerms(block.source, block.exclude)} />;
    case 'table':
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              {block.columns.map((column, i) => (
                <th key={column} style={{ textAlign: (block.align?.[i] ?? 'left') as never }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ textAlign: (block.align?.[j] ?? 'left') as never }}>
                    {inlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return null;
  }
}

function SectionBlock({ section }: { section: Section }): React.ReactElement {
  const titleClass = section.titleStyle === 'tab' ? styles.tabTitle : styles.phaseTitle;
  const sourceHref = useBaseUrl(section.source ?? '/');
  return (
    <section className={styles.section}>
      <h2 className={titleClass}>{section.title}</h2>
      {section.blocks.map((block, i) => (
        <React.Fragment key={i}>
          {block.heading && <h3 className={styles.blockHeading}>{block.heading}</h3>}
          <BlockBody block={block} />
        </React.Fragment>
      ))}
      {section.source && (
        <a className={styles.source} href={sourceHref}>
          {section.source}
        </a>
      )}
    </section>
  );
}

export default function GameReference(): React.ReactElement {
  const logo = useBaseUrl('/img/logotype.svg');
  return (
    <>
      <Head>
        <title>Wyrdcry Game Reference</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className={styles.root}>
        <article className={styles.sheet}>
          <header className={styles.sheetHeader}>
            <h1 className={styles.sheetTitle}>
              <img className={styles.logo} src={logo} alt="Wyrdcry" />
              Game Reference
            </h1>
            <span className={styles.sheetVersion}>{ruleset.label}</span>
          </header>
          <div className={styles.columns}>
            {(sections as Section[]).map(section => (
              <SectionBlock key={section.id} section={section} />
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
