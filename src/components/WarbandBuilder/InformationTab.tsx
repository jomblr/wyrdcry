import React from 'react';
import type { Warband, CustomWeapon, CustomAbility } from './useWarband';
import WarbandStash from './WarbandStash';
import WeaponReference from './WeaponReference';
import AbilityReference from './AbilityReference';
import FactionRules from './FactionRules';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
  onRemoveFromStash: (itemIdx: number) => void;
  onSellFromStash: (itemIdx: number, salePrice: number) => void;
  onSetNotes: (v: string) => void;
  onAddCustomWeapon: () => void;
  onUpdateCustomWeapon: (id: string, patch: Partial<Omit<CustomWeapon, 'id'>>) => void;
  onRemoveCustomWeapon: (id: string) => void;
  onAddCustomAbility: () => void;
  onUpdateCustomAbility: (id: string, patch: Partial<Omit<CustomAbility, 'id'>>) => void;
  onRemoveCustomAbility: (id: string) => void;
}

export default function InformationTab({ warband, onRemoveFromStash, onSellFromStash, onSetNotes, onAddCustomWeapon, onUpdateCustomWeapon, onRemoveCustomWeapon, onAddCustomAbility, onUpdateCustomAbility, onRemoveCustomAbility }: Props) {
  return (
    <div className={styles.infoTabGrid}>
      <WarbandStash stash={warband.stash} onRemove={onRemoveFromStash} onSell={onSellFromStash} />
      <FactionRules notes={warband.factionNotes} onSetNotes={onSetNotes} />
      <WeaponReference
        warband={warband}
        onAddCustomWeapon={onAddCustomWeapon}
        onUpdateCustomWeapon={onUpdateCustomWeapon}
        onRemoveCustomWeapon={onRemoveCustomWeapon}
      />
      <AbilityReference
        warband={warband}
        onAddCustomAbility={onAddCustomAbility}
        onUpdateCustomAbility={onUpdateCustomAbility}
        onRemoveCustomAbility={onRemoveCustomAbility}
      />
    </div>
  );
}
