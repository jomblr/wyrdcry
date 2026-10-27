import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useColorMode } from '@docusaurus/theme-common';
import { ArrowLeft, EllipsisVertical, Lock, LockOpen } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useWarband, calcPendingCost, calcValue } from './useWarband';
import { fightersData } from './data';
import { calcDropdownPos, dropdownStyle, type DropdownPos } from './dropdownPos';
import WarbandList from './WarbandList';
import WarbandInfoRow from './WarbandInfoRow';
import FactionPickerModal from './FactionPickerModal';
import FighterTable from './FighterTable';
import InformationTab from './InformationTab';
import styles from './warband-builder.module.css';
import useIsMobile from './useIsMobile';

type Tab = 'fighters' | 'information';
type View = 'list' | 'detail';

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
    sellFromFighter,
    makeLeader,
    loadWarband,
    createNewWarband,
    deleteWarband,
    importWarband,
    exportWarband,
  } = useWarband();

  function handleSelect(id: string) {
    setPlayMode(false);
    loadWarband(id);
    setView('detail');
    setTab('fighters');
  }

  function handleCreate() {
    setShowFactionModal(true);
  }

  function handleFactionConfirmed(factionId: string, gold: number) {
    setPlayMode(false);
    setShowFactionModal(false);
    createNewWarband();
    setFaction(factionId);
    setGold(gold);
    setView('detail');
    setTab('fighters');
  }

  function handleImport(file: File) {
    setPlayMode(false);
    importWarband(file);
    setView('detail');
    setTab('fighters');
  }

  const isMobile = useIsMobile();
  const { colorMode, setColorMode } = useColorMode();

  // Locked / play mode (mobile): swipeable read-only cards for use at the table.
  // Always starts unlocked when a warband is opened, created or imported.
  const [playMode, setPlayMode] = useState(false);
  const inPlayMode = isMobile && playMode;

  // On mobile, an open warband takes the whole screen: hide the site navbar
  // ("← Warbands" leads back to the list, where the navbar returns).
  const hideNavbar = isMobile && view === 'detail';
  useEffect(() => {
    if (!hideNavbar) return;
    document.documentElement.classList.add('wb-hide-navbar');
    return () => document.documentElement.classList.remove('wb-hide-navbar');
  }, [hideNavbar]);
  // Print the builder in landscape with slim margins. Added only while the builder is mounted,
  // so printing other pages keeps the browser's defaults.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@page { size: landscape; margin: 8mm; }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const hasPending = active.fighters.some(f => f.isPending || f.pendingEquipment.length > 0);
  const pendingCost = calcPendingCost(active, fightersData);
  const goldOnHand = active.gold - calcValue(active, fightersData);

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

    const tabToggleEl = (
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

  return (
    <div className={styles.builderShell}>
      <div className={styles.content}>
        {/* Body */}
        <div className={styles.body}>
          {/* Tab toggle — shared markup */}
          {(() => {
            const tabToggle = tabToggleEl;

            const warbandMenu = menuOpen && menuPos
              ? ReactDOM.createPortal(
                  <div ref={menuRef} className={`${styles.dropdown} ${isMobile ? styles.dropdownMobile : ''}`} style={dropdownStyle(menuPos, true)}>
                    <button type="button" className={styles.dropdownItem} onClick={handleDelete}>Delete warband</button>
                    <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); exportWarband(); }}>Export</button>
                    <button type="button" className={styles.dropdownItem} onClick={() => {
                      setMenuOpen(false);
                      (window as any).gtag?.('event', 'print_warband');
                      // Let the menu close before the print snapshot is taken, and drop focus so no
                      // focus-only element (the "Skip to main content" link) shows up on the page
                      (document.activeElement as HTMLElement | null)?.blur();
                      requestAnimationFrame(() => setTimeout(() => window.print(), 0));
                    }}>Print</button>
                    <div className={styles.dropdownSep} />
                    {/* The site navbar (with its theme switch) is hidden on mobile here */}
                    <button type="button" className={styles.dropdownItem} onClick={() => { setMenuOpen(false); setColorMode(colorMode === 'dark' ? 'light' : 'dark'); }}>
                      {colorMode === 'dark' ? 'Light theme' : 'Dark theme'}
                    </button>
                  </div>,
                  document.body,
                )
              : null;

            const menuButton = (
              <button type="button" ref={menuBtnRef} className={styles.ellipsisBtn} onClick={toggleMenu} aria-label="Warband options">
                <EllipsisVertical size={18} />
              </button>
            );

            if (isMobile) {
              return (
                <div className={styles.topBar}>
                  <button type="button" className={styles.backBtn} onClick={() => setView('list')} aria-label="Back to warband list">
                    <ArrowLeft size={16} /><span>Warbands</span>
                  </button>
                  <div className={styles.topBarIcons}>
                    {/* Locked = play mode: swipeable read-only cards, no recruiting or renaming */}
                    <button
                      type="button"
                      className={styles.ellipsisBtn}
                      onClick={() => setPlayMode(!playMode)}
                      aria-pressed={playMode}
                      aria-label={playMode ? 'Unlock warband' : 'Lock warband'}
                    >
                      {playMode ? <Lock size={18} /> : <LockOpen size={18} />}
                    </button>
                    {menuButton}
                  </div>
                  {warbandMenu}
                </div>
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
                  {hasPending && (
                    <button
                      type="button"
                      className="button button--primary button--md"
                      onClick={purchasePending}
                      disabled={pendingCost > goldOnHand}
                    >
                      Purchase <span className={styles.purchaseDiamond} aria-hidden>◆</span> {pendingCost}/{goldOnHand}gc
                    </button>
                  )}
                  {menuButton}
                  {warbandMenu}
                </div>
              </div>
            );
          })()}

          <WarbandInfoRow
            warband={active}
            nameLocked={inPlayMode}
            onSetName={setName}
            onSetFavour={setFavour}
            onAddGold={amount => setGold(active.gold + amount)}
          />
          {isMobile && <div className={clsx(styles.topBarTabRow, styles.mobileTabRow)}>{tabToggleEl}</div>}

          <div className={tab === 'fighters' ? styles.tabPanel : styles.tabPanelHidden}>
            <FighterTable
              warband={active}
              onSetFighterName={setFighterName}
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
              onSellFromFighter={sellFromFighter}
              onMakeLeader={makeLeader}
              onTakeFromStash={takeFromStash}
              hasPending={hasPending}
              onPurchase={purchasePending}
              playMode={inPlayMode}
            />
          </div>
          <div className={tab === 'information' ? styles.tabPanel : styles.tabPanelHidden}>
            <InformationTab
              warband={active}
              readOnly={inPlayMode}
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
