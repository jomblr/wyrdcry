import React, { useMemo } from 'react';
import itemsData from '@site/src/data/items.json';
import { armourAnchorId } from './wikiPaths';
import wb from '../WarbandBuilder/warband-builder.module.css';

export default function ArmourReference() {
  const armour = useMemo(
    () =>
      itemsData
        .filter(i => i.type === 'armour')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  return (
    <div className={wb.tableScrollOuterWiki}>
      <div className={`${wb.tableWrapper} ${wb.wbGrid} ${wb.armourRefGrid}`}>
        <div className={wb.gridHeader}>
          <div className={wb.hCell}>Armour</div>
          <div className={wb.hCell}>Description</div>
        </div>
        {armour.map(item => (
          <div className={wb.gridRow} key={item.id}>
            <div className={wb.cell} id={armourAnchorId(item.id)}>
              {item.name}
            </div>
            <div className={`${wb.cell} ${wb.cellWrap}`}>
              {item.description?.trim() ? item.description : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
