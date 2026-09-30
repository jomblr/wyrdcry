/**
 * Swizzled to add custom card-style admonitions: `:::encounter` and `:::inverse`.
 *
 * Keywords are registered in docusaurus.config.js (docs.admonitions.keywords);
 * this map is what gives them renderers. Without both halves the directive either
 * renders as plain text or falls back to `info`.
 *
 * Deliberately does not use @theme/Admonition/Layout: that component always renders
 * an icon slot, and its class names are CSS-module hashes we can't target reliably.
 * Hand-rolled markup gives stable hooks for styling in custom.css.
 */
import React from 'react';
import clsx from 'clsx';
import { ThemeClassNames } from '@docusaurus/theme-common';
import DefaultAdmonitionTypes from '@theme-original/Admonition/Types';

interface CardAdmonitionProps {
  readonly title?: React.ReactNode;
  readonly className?: string;
  readonly children?: React.ReactNode;
}

/**
 * Shared card admonition. `name` drives both the theme class
 * (`theme-admonition-<name>`) and the styling hooks (`wyrd-<name>`).
 */
function createCardAdmonition(name: string) {
  return function CardAdmonition({ title, className, children }: CardAdmonitionProps) {
    // Title is optional: `:::encounter` renders a bare box. Whitespace-only titles
    // (e.g. `:::encounter[ ]`) count as no title — Docusaurus only strips empty
    // ones, so a lone space would otherwise render an empty heading row.
    const hasTitle = typeof title === 'string' ? title.trim() !== '' : title != null;
    return (
      <div
        className={clsx(
          ThemeClassNames.common.admonition,
          ThemeClassNames.common.admonitionType(name),
          // `alert alert--info` keeps Infima's admonition typography; colours and
          // box treatment are overridden in custom.css.
          'alert alert--info',
          'wyrd-card',
          `wyrd-${name}`,
          className,
        )}>
        {hasTitle && <div className="wyrd-card__title">{title}</div>}
        <div className="wyrd-card__content">{children}</div>
      </div>
    );
  };
}

export default {
  ...DefaultAdmonitionTypes,
  encounter: createCardAdmonition('encounter'),
  inverse: createCardAdmonition('inverse'),
  // `info` is overridden rather than left to Infima: the stock version always renders
  // an icon + "info" heading. Reusing the card component drops both, and still honours
  // an explicit title (`:::info[Note]`). Styling stays in .theme-admonition-info.
  info: createCardAdmonition('info'),
};
