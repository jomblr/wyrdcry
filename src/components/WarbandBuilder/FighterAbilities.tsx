import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { abilitiesData } from './data';
import InfoSheet from './InfoSheet';
import styles from './warband-builder.module.css';

type Ability = (typeof abilitiesData)[number];

export function fighterAbilities(abilityIds: string[] | undefined): Ability[] {
  return (abilityIds ?? [])
    .map(id => abilitiesData.find(a => a.id === id))
    .filter((a): a is Ability => !!a);
}

function abilityLabel(a: Ability): string {
  return a.ability_type && a.ability_type !== 'trait'
    ? `[${a.ability_type[0].toUpperCase()}${a.ability_type.slice(1)}] ${a.name}`
    : a.name;
}

/** In place of the missing ability: a tag in the interaction colour that opens the picker. */
export function PickAbilityPrompt({ onClick, tagClassName }: { onClick: () => void; tagClassName?: string }) {
  return (
    <button
      type="button"
      className={`${styles.equipmentTag} ${styles.equipmentTagPending} ${tagClassName ?? ''}`}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      Pick a starting ability
    </button>
  );
}

/** A fighter's special rules as tags; tapping one opens its description. */
export default function FighterAbilities({ abilities, tagClassName }: { abilities: Ability[]; tagClassName?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = abilities.find(a => a.id === openId);

  return (
    <div className={styles.fighterCardTags}>
      {abilities.map(a => (
        <button
          type="button"
          key={a.id}
          className={`${styles.equipmentTag} ${tagClassName ?? ''}`}
          // Inside a clickable table row: show the rule without also opening the fighter panel
          onClick={e => { e.stopPropagation(); setOpenId(a.id); }}
        >
          {abilityLabel(a)}
        </button>
      ))}
      {open && (
        <InfoSheet
          title={open.name}
          subtitle={open.ability_type && open.ability_type !== 'trait' ? `${open.ability_type} ability` : 'Trait'}
          onClose={() => setOpenId(null)}
        >
          <ReactMarkdown>{open.description}</ReactMarkdown>
        </InfoSheet>
      )}
    </div>
  );
}
