import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { FighterInstance, Warband, StatKey } from './useWarband';
import { calcValue } from './useWarband';
import FighterRow from './FighterRow';
import AddFighterRow from './AddFighterRow';
import styles from './warband-builder.module.css';
import fightersData from '@site/src/data/fighters.json';
import factionsData from '@site/src/data/factions.json';
import campaignRules from '@site/src/data/campaign-rules.json';

// leading '' is the drag-handle column
const HEADERS: { label: string; center?: boolean; indent?: boolean }[] = [
  { label: '' },
  { label: 'Fighter' },
  { label: 'M',             center: true },
  { label: 'F',             center: true },
  { label: 'S',             center: true },
  { label: 'D',             center: true },
  { label: 'H',             center: true },
  { label: 'B',             center: true },
  { label: 'Equipment', indent: true },
  { label: 'Notes' },
  { label: 'XP',            center: true },
  { label: 'R',             center: true },
  { label: 'Value',         center: true },
  { label: '',              center: true },
];

interface Props {
  warband: Warband;
  onSetFighterName: (instanceId: string, name: string) => void;
  onSetFighterXp: (instanceId: string, xp: number) => void;
  onSetFighterRenown: (instanceId: string, renown: number) => void;
  onSetFighterEquipment: (instanceId: string, equipment: string[]) => void;
  onRemoveFighter: (instanceId: string) => void;
  onDuplicateFighter: (instanceId: string) => void;
  onTransferEquipment: (fromId: string, toId: string, itemId: string, itemIdx: number) => void;
  onAddFighter: (fighterId: string, name: string) => void;
  onReorderFighters: (fighters: FighterInstance[]) => void;
  onSendToStash: (instanceId: string, itemIdx: number) => void;
  onTakeFromStash: (instanceId: string, itemId: string) => void;
  onSetFighterStat: (instanceId: string, stat: StatKey, value: number) => void;
  onSetFighterNotes: (instanceId: string, notes: string) => void;
  onSetFighterCostOverride: (instanceId: string, cost: number | null) => void;
}

function canDuplicateFighter(instance: FighterInstance, fighters: FighterInstance[], atFighterLimit: boolean): boolean {
  if (atFighterLimit) return false;
  const profile = fightersData.find(f => f.id === instance.fighterId);
  if (!profile) return false;
  const limit = 'limit' in profile ? profile.limit : undefined;
  if (limit === null || limit === undefined) return true;
  const count = fighters.filter(f => f.fighterId === instance.fighterId).length;
  return count < (limit as number);
}

export default function FighterTable({
  warband,
  onSetFighterName,
  onSetFighterXp,
  onSetFighterRenown,
  onSetFighterEquipment,
  onRemoveFighter,
  onDuplicateFighter,
  onTransferEquipment,
  onAddFighter,
  onReorderFighters,
  onSendToStash,
  onTakeFromStash,
  onSetFighterStat,
  onSetFighterNotes,
  onSetFighterCostOverride,
}: Props) {
  const faction = factionsData.find(f => f.id === warband.factionId);
  const maxFighters = faction && 'warband_size' in faction ? (faction.warband_size as number) : null;
  const atFighterLimit = maxFighters !== null && warband.fighters.length >= maxFighters;
  const remainingGold = campaignRules.warband_budget - calcValue(warband, fightersData);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small movement before activating so clicks still work
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = warband.fighters.findIndex(f => f.instanceId === active.id);
    const newIndex = warband.fighters.findIndex(f => f.instanceId === over.id);
    onReorderFighters(arrayMove(warband.fighters, oldIndex, newIndex));
  }

  return (
    <div className={styles.tableScrollOuter}>
    <div className={styles.tableWrapper}>
      <div className={`${styles.wbGrid} ${styles.fighterGrid}`}>
        {/* Header */}
        <div className={`${styles.gridHeader} ${styles.gridHeaderSticky}`}>
          {HEADERS.map((h, i) => (
            <div
              key={i}
              className={`${styles.hCell} ${h.center ? styles.hCellCenter : ''} ${h.indent ? styles.hCellIndent : ''}`}
            >
              {h.label}
            </div>
          ))}
        </div>

        {/* Fighter rows — sortable */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={warband.fighters.map(f => f.instanceId)}
            strategy={verticalListSortingStrategy}
          >
            {warband.fighters.map((instance: FighterInstance) => (
              <FighterRow
                key={instance.instanceId}
                instance={instance}
                stash={warband.stash}
                remainingGold={remainingGold}
                onSetName={name => onSetFighterName(instance.instanceId, name)}
                onSetXp={xp => onSetFighterXp(instance.instanceId, xp)}
                onSetRenown={renown => onSetFighterRenown(instance.instanceId, renown)}
                onSetEquipment={equipment => onSetFighterEquipment(instance.instanceId, equipment)}
                onRemove={() => onRemoveFighter(instance.instanceId)}
                onDuplicate={() => onDuplicateFighter(instance.instanceId)}
                canDuplicate={canDuplicateFighter(instance, warband.fighters, atFighterLimit)}
                onTransferEquipment={(fromId, itemId, itemIdx) =>
                  onTransferEquipment(fromId, instance.instanceId, itemId, itemIdx)
                }
                onSendToStash={itemIdx => onSendToStash(instance.instanceId, itemIdx)}
                onTakeFromStash={itemId => onTakeFromStash(instance.instanceId, itemId)}
                onSetStat={(stat, value) => onSetFighterStat(instance.instanceId, stat, value)}
                onSetNotes={notes => onSetFighterNotes(instance.instanceId, notes)}
                onSetCostOverride={cost => onSetFighterCostOverride(instance.instanceId, cost)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add fighter row */}
        <AddFighterRow
          factionId={warband.factionId}
          currentFighters={warband.fighters}
          atFighterLimit={atFighterLimit}
          onAdd={onAddFighter}
        />
      </div>
    </div>
    </div>
  );
}
