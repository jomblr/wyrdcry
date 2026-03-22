import React from 'react';
import type { Warband } from './useWarband';
import WarbandStash from './WarbandStash';
import WeaponReference from './WeaponReference';
import FactionRules from './FactionRules';
import styles from './warband-builder.module.css';

interface Props {
  warband: Warband;
  onRemoveFromStash: (itemIdx: number) => void;
  onSetNotes: (v: string) => void;
}

export default function InformationTab({ warband, onRemoveFromStash, onSetNotes }: Props) {
  return (
    <div className={styles.infoTabGrid}>
      <WarbandStash stash={warband.stash} onRemove={onRemoveFromStash} />
      <FactionRules notes={warband.factionNotes} onSetNotes={onSetNotes} />
      <WeaponReference warband={warband} />
    </div>
  );
}
