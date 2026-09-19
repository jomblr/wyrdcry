import React from 'react';

/**
 * Renders the light inline markup used in the JSON game data: `backticks` become
 * <code>, **double asterisks** become <strong>. Anything else is passed through
 * as plain text, so the data files stay readable in a diff.
 */
export function inlineText(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const DICE_LABEL: Record<string, string> = {
  double: '[Double]',
  triple: '[Triple]',
  quad: '[Quad]',
};

/** '[Double]', '[Triple]' or '[Quad]' for an ability_type from the data files. */
export function abilityDiceLabel(abilityType: string): string {
  return DICE_LABEL[abilityType] ?? `[${abilityType}]`;
}
