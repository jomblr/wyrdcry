import React, { useState } from 'react';
import InfoSheet from './InfoSheet';
import StatSpinner from './StatSpinner';
import type { Warband } from './useWarband';
import { calcReputation, calcStanding, calcValue, calcPendingCost, getFavourTier } from './useWarband';
import styles from './warband-builder.module.css';
import { factionsData, fightersData } from './data';

interface Props {
  warband: Warband;
  onSetName: (name: string) => void;
  onSetFavour: (favour: number) => void;
  onAddGold: (amount: number) => void;
}

export default function WarbandInfoRow({ warband, onSetName, onSetFavour, onAddGold }: Props) {
  const [goldHovered, setGoldHovered] = useState(false);
  const [addGoldOpen, setAddGoldOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const reputation = calcReputation(warband);
  const standing = calcStanding(reputation);
  const favourTier = getFavourTier(warband.favour);
  const spent = calcValue(warband, fightersData);
  const pendingCost = calcPendingCost(warband, fightersData);
  const remainingGold = warband.gold - spent;
  const selectedFaction = factionsData.find(f => f.id === warband.factionId);
  const fighterCount = warband.fighters.length;
  const maxFighters = selectedFaction?.warband_size ?? null;
  const locked = !warband.factionId;
  const hasPending = warband.fighters.some(f => f.isPending || f.pendingEquipment.length > 0);

  function handleConfirmAddGold() {
    const amount = Math.max(0, parseInt(amountInput, 10) || 0);
    if (amount > 0) onAddGold(amount);
    setAddGoldOpen(false);
    setAmountInput('');
  }

  function handleCancelAddGold() {
    setAddGoldOpen(false);
    setAmountInput('');
  }

  const modal = addGoldOpen ? (
    <InfoSheet
      title="Add Gold"
      onClose={handleCancelAddGold}
      actions={
        <>
          <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={handleCancelAddGold}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`}
            disabled={!amountInput || amountInput === '0'}
            onClick={handleConfirmAddGold}
          >
            Add Gold
          </button>
        </>
      }
    >
      <div className={styles.modalField}>
        <label className={styles.modalFieldLabel} htmlFor="add-gold-amount">Amount</label>
        <input
          id="add-gold-amount"
          type="text"
          inputMode="numeric"
          className={styles.infoInput}
          value={amountInput}
          onChange={e => setAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleConfirmAddGold(); }}
        />
      </div>
    </InfoSheet>
  ) : null;

  const goldClickable = !locked && !hasPending;
  function openAddGold() {
    if (!goldClickable) return;
    setAmountInput(String(favourTier.defaultGold));
    setAddGoldOpen(true);
  }

  return (
    <>
    {/* Mobile: header + stat cards */}
    <div className={styles.mobileInfo}>
      <input
        className={styles.mobileName}
        type="text"
        placeholder="Warband name"
        value={warband.name}
        onChange={e => onSetName(e.target.value)}
        disabled={locked}
      />
      <div className={styles.mobileFaction}>{selectedFaction ? selectedFaction.name : '—'}</div>
      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Favour</div>
          <div className={styles.statCardValue}>
            {locked ? '—' : <StatSpinner value={warband.favour} min={0} onChange={onSetFavour} />}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Reputation</div>
          <div className={styles.statCardValue}>{locked ? '—' : reputation}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Fighters</div>
          <div className={styles.statCardValue}>
            {locked ? '—' : maxFighters ? `${fighterCount} / ${maxFighters}` : fighterCount}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Standing</div>
          <div className={`${styles.statCardValue} ${styles.statCardValueSmall}`}>{locked ? '—' : favourTier.label}</div>
        </div>
        <button
          type="button"
          className={styles.statCard}
          onClick={openAddGold}
          disabled={!goldClickable}
          aria-label="Gold — tap to add gold"
        >
          <div className={styles.statCardLabel}>Gold</div>
          <div className={styles.statCardValue}>
            {locked ? '—' : pendingCost > 0
              ? <span className={styles.goldPending}>{pendingCost}/{remainingGold}</span>
              : remainingGold}
          </div>
        </button>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>Value</div>
          <div className={styles.statCardValue}>{locked ? '—' : `${spent}gc`}</div>
        </div>
      </div>
    </div>

    <div className={`${styles.tableScrollOuter} ${styles.desktopOnly}`}>
    <div className={styles.tableWrapper}>
      <div className={`${styles.wbGrid} ${styles.infoGrid}`}>
        {/* Header */}
        <div className={styles.gridHeader}>
          <div className={styles.hCell}>Warband Name</div>
          <div className={styles.hCell}>Faction</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Favour</div>
          <div className={styles.hCell}>Standing</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Reputation</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Fighters</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Gold</div>
          <div className={`${styles.hCell} ${styles.hCellCenter}`}>Value</div>
        </div>

        {/* Data row */}
        <div className={styles.gridRow}>
          {/* Warband Name */}
          <div className={`${styles.cell} ${locked ? styles.lockedCell : ''}`}>
            <input
              className={styles.infoInput}
              type="text"
              placeholder="Warband name"
              value={warband.name}
              onChange={e => onSetName(e.target.value)}
              disabled={locked}
            />
          </div>

          {/* Faction — read-only */}
          <div className={styles.cell}>
            {selectedFaction ? selectedFaction.name : <span className={styles.lockedCell}>—</span>}
          </div>

          {/* Favour */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : (
              <StatSpinner value={warband.favour} min={0} onChange={onSetFavour} />
            )}
          </div>

          {/* Standing */}
          <div className={`${styles.cell} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : favourTier.label}
          </div>

          {/* Reputation */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : reputation}
          </div>

          {/* Fighters */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : maxFighters ? `${fighterCount} / ${maxFighters}` : fighterCount}
          </div>

          {/* Gold */}
          <div
            className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''} ${!locked && !hasPending ? styles.goldCell : ''}`}
            onMouseEnter={() => !locked && !hasPending && setGoldHovered(true)}
            onMouseLeave={() => setGoldHovered(false)}
            onClick={openAddGold}
          >
            {locked ? '—' : goldHovered && !hasPending
              ? 'Add Gold'
              : pendingCost > 0
                ? <span className={styles.goldPending}>{pendingCost}/{remainingGold}</span>
                : remainingGold
            }
          </div>

          {/* Value */}
          <div className={`${styles.cell} ${styles.cellCenter} ${locked ? styles.lockedCell : ''}`}>
            {locked ? '—' : `${spent}gc`}
          </div>
        </div>
      </div>
    </div>
    </div>
    {modal}
    </>
  );
}
