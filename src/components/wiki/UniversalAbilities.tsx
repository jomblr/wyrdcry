import React from 'react';
import universalAbilities from '@site/src/data/universal-abilities.json';
import { inlineText, abilityDiceLabel } from '../inlineText';

/**
 * The universal abilities table on the Abilities page. Shows the full rule
 * wording from `description`; the printable game reference reads the same file
 * but prefers the shorter `short` wording where one is written.
 */
export default function UniversalAbilities(): React.ReactElement {
  return (
    <table>
      <thead>
        <tr>
          <th style={{ textAlign: 'center' }}>Keyword</th>
          <th>Ability</th>
        </tr>
      </thead>
      <tbody>
        {universalAbilities.map(ability => (
          <tr key={ability.id}>
            <td style={{ textAlign: 'center' }}>
              <code>{ability.keyword}</code>
            </td>
            <td>
              <strong>
                {abilityDiceLabel(ability.ability_type)} {ability.name}:
              </strong>{' '}
              {inlineText(ability.description)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
