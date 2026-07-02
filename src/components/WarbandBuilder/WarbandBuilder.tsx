import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { ArrowLeft, EllipsisVertical } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useWarband } from './useWarband';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import WarbandList from './WarbandList';
import WarbandInfoRow from './WarbandInfoRow';
import FactionPickerModal from './FactionPickerModal';
import FighterTable from './FighterTable';
import InformationTab from './InformationTab';
import styles from './warband-builder.module.css';

type Tab = 'fighters' | 'information';
type View = 'list' | 'detail';

function useIsMobile(breakpoint = 800) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function WarbandBuilder() {
  const [tab, setTab] = useState<Tab>('fighters');
  const [view, setView] = useState<View>('list');
  const [showFactionModal, setShowFactionModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<DropdownPos | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    active,
    savedWarbands,
    setName,
    setGold,
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
    setFighterPendingEquipment,
    purchasePending,
    reorderFighters,
    transferEquipment,
    sendToStash,
    takeFromStash,
    removeFromStash,
    sellFromStash,
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
    setShowFactionModal(true);
  }

  function handleFactionConfirmed(factionId: string, gold: number) {
    setShowFactionModal(false);
    createNewWarband();
    setFaction(factionId);
    setGold(gold);
    setView('detail');
    setTab('fighters');
  }

  function handleImport(file: File) {
    importWarband(file);
    setView('detail');
    setTab('fighters');
  }

  const isMobile = useIsMobile();
  const hasPending = active.fighters.some(f => f.isPending || f.pendingEquipment.length > 0);

  function handleDelete() {
    setMenuOpen(false);
    const label = active.name || 'Untitled Warband';
    const ok = window.confirm(`Delete "${label}"? This cannot be undone.`);
    if (ok) {
      deleteWarband(active.id);
      setView('list');
    }
  }

  function toggleMenu() {
    if (menuOpen) { setMenuOpen(false); return; }
    if (menuBtnRef.current) setMenuPos(calcDropdownPos(menuBtnRef.current.getBoundingClientRect(), { alignRight: true }));
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !menuBtnRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (view === 'list') {
    return (
      <div className={styles.builderShell}>
        <WarbandList
          warbands={savedWarbands}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onImport={handleImport}
        />
        {showFactionModal && (
          <FactionPickerModal
            onConfirm={handleFactionConfirmed}
            onCancel={() => setShowFactionModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.builderShell}>
      <div className={styles.content}>
        {/* Body */}
        <div className={styles.body}>
          {/* Tab toggle — shared markup */}
          {(() => {
            const tabToggle = (
              <div className={styles.tabToggle} role="tablist" aria-label="Warband section">
                <div className={clsx(styles.tabToggleInner, isMobile && styles.tabToggleFullWidth)} data-active={tab}>
                  <span className={styles.tabToggleIndicator} aria-hidden />
                  <button type="button" role="tab" aria-selected={tab === 'fighters'} id="warband-tab-fighters"
                    className={clsx(styles.tabToggleBtn, tab === 'fighters' && styles.tabToggleBtnActive)}
                    onClick={() => setTab('fighters')}>Fighters</button>
                  <button type="button" role="tab" aria-selected={tab === 'information'} id="warband-tab-information"
                    className={clsx(styles.tabToggleBtn, tab === 'information' && styles.tabToggleBtnActive)}
                    onClick={() => setTab('information')}>Information</button>
                </div>
              </div>
            );

            if (isMobile) {
              const mobileMenu = menuOpen && menuPos
                ? ReactDOM.createPortal(
                    <div ref={menuRef} className={styles.dropdown} style={dropdownStyle(menuPos, true)}>
                      <button type="button" className={styles.dropdownItem} onClick={handleDelete}>Delete warband</button>
                      <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); exportWarband(); }}>Export</button>
                      <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); (window as any).gtag?.('event', 'print_warband'); window.print(); }}>Print</button>
                    </div>,
                    document.body,
                  )
                : null;

              return (
                <>
                  <div className={styles.topBar}>
                    <button type="button" className={styles.backBtn} onClick={() => setView('list')} aria-label="Back to warband list">
                      <ArrowLeft size={16} /><span>Warbands</span>
                    </button>
                    <button type="button" ref={menuBtnRef} className={styles.ellipsisBtn} onClick={toggleMenu} aria-label="Warband options">
                      <EllipsisVertical size={18} />
                    </button>
                    {mobileMenu}
                  </div>
                  <div className={styles.topBarTabRow}>{tabToggle}</div>
                </>
              );
            }

            return (
              <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                  <button type="button" className={styles.backBtn} onClick={() => setView('list')} aria-label="Back to warband list">
                    <ArrowLeft size={16} /><span>Warbands</span>
                  </button>
                  {tabToggle}
                </div>
                <div className={styles.actions}>
                  <button type="button" className="button button--secondary button--md" onClick={handleDelete}>Delete Warband</button>
                  <button type="button" className="button button--secondary button--md" onClick={exportWarband}>Export</button>
                  <button type="button" className="button button--secondary button--md" onClick={() => (window as any).gtag?.('event', 'print_warband'); window.print()}>Print</button>
                  {hasPending && (
                    <button type="button" className="button button--primary button--md" onClick={purchasePending}>Purchase</button>
                  )}
                </div>
              </div>
            );
          })()}

          <div className={tab === 'fighters' ? styles.tabPanel : styles.tabPanelHidden}>
            <WarbandInfoRow
              warband={active}
              onSetName={setName}
              onSetFavour={setFavour}
              onAddGold={amount => setGold(active.gold + amount)}
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
              onSetFighterPendingEquipment={setFighterPendingEquipment}
              onRemoveFighter={removeFighter}
              onDuplicateFighter={duplicateFighter}
              onTransferEquipment={transferEquipment}
              onAddFighter={addFighter}
              onReorderFighters={reorderFighters}
              onSendToStash={sendToStash}
              onTakeFromStash={takeFromStash}
              hasPending={hasPending}
              onPurchase={purchasePending}
            />
          </div>
          <div className={tab === 'information' ? styles.tabPanel : styles.tabPanelHidden}>
            <WarbandInfoRow
              warband={active}
              onSetName={setName}
              onSetFavour={setFavour}
              onAddGold={amount => setGold(active.gold + amount)}
            />
            <InformationTab
              warband={active}
              onRemoveFromStash={removeFromStash}
              onSellFromStash={sellFromStash}
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
