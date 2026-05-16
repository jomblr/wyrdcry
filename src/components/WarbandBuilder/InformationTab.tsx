import React from 'react';
import type { Warband, CustomWeapon } from './useWarband';
import WarbandStash from './WarbandStash';
import WeaponReference from './WeaponReference';
import FactionRules from './FactionRules';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
  onRemoveFromStash: (itemIdx: number) => void;
  onSetNotes: (v: string) => void;
  onAddCustomWeapon: () => void;
  onUpdateCustomWeapon: (id: string, patch: Partial<Omit<CustomWeapon, 'id'>>) => void;
  onRemoveCustomWeapon: (id: string) => void;
}

export default function InformationTab({ warband, onRemoveFromStash, onSetNotes, onAddCustomWeapon, onUpdateCustomWeapon, onRemoveCustomWeapon }: Props) {
  return (
    <div className={styles.infoTabGrid}>
      <WarbandStash stash={warband.stash} onRemove={onRemoveFromStash} />
      <FactionRules notes={warband.factionNotes} onSetNotes={onSetNotes} />
      <WeaponReference
        warband={warband}
        onAddCustomWeapon={onAddCustomWeapon}
        onUpdateCustomWeapon={onUpdateCustomWeapon}
        onRemoveCustomWeapon={onRemoveCustomWeapon}
      />
    </div>
  );
}
