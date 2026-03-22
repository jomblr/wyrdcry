import React, { useState } from 'react';
import clsx from 'clsx';
import { useWarband } from './useWarband';
import WarbandSidebar from './WarbandSidebar';
import WarbandInfoRow from './WarbandInfoRow';
import FighterTable from './FighterTable';
import InformationTab from './InformationTab';
import styles from './warband-builder.module.css';

type Tab = 'fighters' | 'information';

export default function WarbandBuilder() {
  const [tab, setTab] = useState<Tab>('fighters');

  const {
    active,
    savedWarbands,
    setName,
    setFaction,
    setFavour,
    setFactionNotes,
    addFighter,
    removeFighter,
    duplicateFighter,
    setFighterName,
    setFighterXp,
    setFighterRenown,
    setFighterStat,
    setFighterSpecialRules,
    setFighterEquipment,
    reorderFighters,
    transferEquipment,
    sendToStash,
    takeFromStash,
    removeFromStash,
    loadWarband,
    createNewWarband,
    deleteWarband,
    importWarband,
    exportWarband,
  } = useWarband();

  function handleDelete() {
    const label = active.name || 'Untitled Warband';
    const ok = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (ok) deleteWarband(active.id);
  }

  // An unsaved warband has no name yet — it hasn't been committed to localStorage
  const hasUnsavedWarband = !active.name.trim() && !active.factionId;

  // Unsaved warband always appears at the bottom of the list
  const sidebarList = savedWarbands.some(w => w.id === active.id)
    ? savedWarbands
    : [...savedWarbands, active];

  return (
    <div className={styles.builderShell}>
      <WarbandSidebar
        savedWarbands={sidebarList}
        activeId={active.id}
        onSelect={loadWarband}
        onCreate={createNewWarband}
        onImport={importWarband}
        disableCreate={hasUnsavedWarband}
      />

      <div className={styles.content}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.tabToggle} role="tablist" aria-label="Warband section">
            <div className={styles.tabToggleInner} data-active={tab}>
              <span className={styles.tabToggleIndicator} aria-hidden />
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'fighters'}
                id="warband-tab-fighters"
                className={clsx(styles.tabToggleBtn, tab === 'fighters' && styles.tabToggleBtnActive)}
                onClick={() => setTab('fighters')}
              >
                Fighters
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'information'}
                id="warband-tab-information"
                className={clsx(styles.tabToggleBtn, tab === 'information' && styles.tabToggleBtnActive)}
                onClick={() => setTab('information')}
              >
                Information
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className="button button--secondary button--md"
              onClick={handleDelete}
            >
              Delete Warband
            </button>
            <button type="button" className="button button--primary button--md" onClick={exportWarband}>
              Export
            </button>
            <button type="button" className="button button--primary button--md" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className={styles.body}
          role="tabpanel"
          aria-labelledby={tab === 'fighters' ? 'warband-tab-fighters' : 'warband-tab-information'}
        >
            {tab === 'fighters' && (
            <>
              <WarbandInfoRow
                warband={active}
                onSetName={setName}
                onSetFaction={setFaction}
                onSetFavour={setFavour}
              />
              <FighterTable
                warband={active}
                onSetFighterName={setFighterName}
                onSetFighterXp={setFighterXp}
                onSetFighterRenown={setFighterRenown}
                onSetFighterStat={setFighterStat}
                onSetFighterSpecialRules={setFighterSpecialRules}
                onSetFighterEquipment={setFighterEquipment}
                onRemoveFighter={removeFighter}
                onDuplicateFighter={duplicateFighter}
                onTransferEquipment={transferEquipment}
                onAddFighter={addFighter}
                onReorderFighters={reorderFighters}
                onSendToStash={sendToStash}
                onTakeFromStash={takeFromStash}
              />
            </>
          )
}

          {tab === 'information' && (
            <InformationTab
              warband={active}
              onRemoveFromStash={removeFromStash}
              onSetNotes={setFactionNotes}
            />
          )}
        </div>
      </div>
    </div>
  );
}
