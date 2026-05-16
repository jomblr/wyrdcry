import React, { useState } from 'react';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useWarband } from './useWarband';
import WarbandList from './WarbandList';
import WarbandInfoRow from './WarbandInfoRow';
import FighterTable from './FighterTable';
import InformationTab from './InformationTab';
import styles from './warband-builder.module.css';

type Tab = 'fighters' | 'information';
type View = 'list' | 'detail';

export default function WarbandBuilder() {
  const [tab, setTab] = useState<Tab>('fighters');
  const [view, setView] = useState<View>('list');

  const {
    active,
    savedWarbands,
    setName,
    setFaction,
    setFavour,
    setFactionNotes,
    addCustomWeapon,
    updateCustomWeapon,
    removeCustomWeapon,
    addCustomAbility,
    updateCustomAbility,
    removeCustomAbility,
    addFighter,
    removeFighter,
    duplicateFighter,
    setFighterName,
    setFighterXp,
    setFighterRenown,
    setFighterStat,
    setFighterNotes,
    setFighterCostOverride,
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

  function handleSelect(id: string) {
    loadWarband(id);
    setView('detail');
    setTab('fighters');
  }

  function handleCreate() {
    createNewWarband();
    setView('detail');
    setTab('fighters');
  }

  function handleImport(file: File) {
    importWarband(file);
    setView('detail');
    setTab('fighters');
  }

  function handleDelete() {
    const label = active.name || 'Untitled Warband';
    const ok = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (ok) {
      deleteWarband(active.id);
      setView('list');
    }
  }

  if (view === 'list') {
    return (
      <div className={styles.builderShell}>
        <WarbandList
          warbands={savedWarbands}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onImport={handleImport}
        />
      </div>
    );
  }

  return (
    <div className={styles.builderShell}>
      <div className={styles.content}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setView('list')}
              aria-label="Back to warband list"
            >
              <ArrowLeft size={16} />
              <span>Warbands</span>
            </button>

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
        <div className={styles.body}>
          <div className={tab === 'fighters' ? styles.tabPanel : styles.tabPanelHidden}>
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
              onSetFighterNotes={setFighterNotes}
              onSetFighterCostOverride={setFighterCostOverride}
              onSetFighterEquipment={setFighterEquipment}
              onRemoveFighter={removeFighter}
              onDuplicateFighter={duplicateFighter}
              onTransferEquipment={transferEquipment}
              onAddFighter={addFighter}
              onReorderFighters={reorderFighters}
              onSendToStash={sendToStash}
              onTakeFromStash={takeFromStash}
            />
          </div>
          <div className={tab === 'information' ? styles.tabPanel : styles.tabPanelHidden}>
            <InformationTab
              warband={active}
              onRemoveFromStash={removeFromStash}
              onSetNotes={setFactionNotes}
              onAddCustomWeapon={addCustomWeapon}
              onUpdateCustomWeapon={updateCustomWeapon}
              onRemoveCustomWeapon={removeCustomWeapon}
              onAddCustomAbility={addCustomAbility}
              onUpdateCustomAbility={updateCustomAbility}
              onRemoveCustomAbility={removeCustomAbility}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
