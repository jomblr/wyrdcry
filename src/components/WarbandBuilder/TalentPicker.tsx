import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { abilitiesData } from './data';
import { SectionHead } from './EquipmentPicker';
import InfoSheet from './InfoSheet';
import styles from './warband-builder.module.css';

type Ability = (typeof abilitiesData)[number];

const TALENT_GROUPS: { category: string; title: string }[] = [
  { category: 'strength', title: 'Strength' },
  { category: 'toughness', title: 'Toughness' },
  { category: 'agility', title: 'Agility' },
  { category: 'perception', title: 'Perception' },
  { category: 'wits', title: 'Wits' },
];

const isInjury = (a: Ability) => a.ability_type === 'injury';
const isMutation = (a: Ability) => a.id.startsWith('mutation-');

/** "Double", "Trait", "Injury", … */
function typeLabel(a: Ability): string {
  const t = a.ability_type || 'trait';
  return t[0].toUpperCase() + t.slice(1);
}

/** Name as the rules write it ("[Double] One With The Shadows"); opens the rule text. */
function AbilityName({ ability }: { ability: Ability }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.equipInfoName} onClick={() => setOpen(true)}>
        [{typeLabel(ability)}] {ability.name}
      </button>
      {open && (
        <InfoSheet
          title={ability.name}
          subtitle={isMutation(ability) ? `Mutation · ${typeLabel(ability)}` : typeLabel(ability)}
          onClose={() => setOpen(false)}
        >
          <ReactMarkdown>{ability.description}</ReactMarkdown>
        </InfoSheet>
      )}
    </>
  );
}

/** Without `action`, the rule comes with the profile and can't be removed. */
function Row({ ability, action, disabled, onClick }: { ability: Ability; action?: string; disabled?: boolean; onClick?: () => void }) {
  return (
    <div className={`${styles.equipRow} ${disabled ? styles.equipPickerRowDisabled : ''}`}>
      <span className={styles.equipPickerName}><AbilityName ability={ability} /></span>
      <span />
      {action ? (
        <button type="button" className={`${styles.equipActionBtn} ${styles.equipActionBtnNeutral}`} onClick={onClick} disabled={disabled}>
          {action}
        </button>
      ) : <span />}
    </div>
  );
}

interface Props {
  /** The fighter's own rules from its profile, listed first and fixed */
  profileRules: string[];
  /** Ids of the talents, injuries and mutations the fighter has */
  talents: string[];
  /** Heroic talents and injuries are for heroes */
  isHero: boolean;
  /** Mutations are for MUTANTs */
  isMutant: boolean;
  onChange: (talents: string[]) => void;
}

/**
 * The fighter's special rules: its own rules and the talents, injuries and mutations it has
 * (those with Remove), then everything it can take, in the same rows and sections as the
 * equipment list.
 */
export default function TalentPicker({ profileRules, talents, isHero, isMutant, onChange }: Props) {
  const lookup = (ids: string[]) => ids
    .map(id => abilitiesData.find(a => a.id === id))
    .filter((a): a is Ability => !!a);
  const own = lookup(profileRules);
  const taken = lookup(talents);
  const has = (id: string) => talents.includes(id);
  const add = (id: string) => onChange([...talents, id]);
  const remove = (id: string) => onChange(talents.filter(t => t !== id));

  const groups = [
    ...(isHero
      ? TALENT_GROUPS.map(g => ({ title: g.title, abilities: abilitiesData.filter(a => a.category === g.category) }))
      : []),
    ...(isHero ? [{ title: 'Injuries', abilities: abilitiesData.filter(isInjury) }] : []),
    ...(isMutant ? [{ title: 'Mutations', abilities: abilitiesData.filter(isMutation) }] : []),
  ].filter(g => g.abilities.length > 0);

  return (
    <div className={styles.equipPicker}>
      <div>
        <SectionHead title="Current special rules" />
        {own.length + taken.length === 0 && <div className={styles.equipEmpty}>None</div>}
        {own.map(a => <Row key={`own-${a.id}`} ability={a} />)}
        {taken.map(a => <Row key={a.id} ability={a} action="Remove" onClick={() => remove(a.id)} />)}
      </div>

      {groups.map(g => (
        <div key={g.title}>
          <SectionHead title={g.title} />
          {g.abilities.map(a => (
            <Row key={a.id} ability={a} action="Add" disabled={has(a.id)} onClick={() => add(a.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
