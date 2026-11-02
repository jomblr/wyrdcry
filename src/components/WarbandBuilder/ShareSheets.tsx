import React, { useEffect, useState } from 'react';
import InfoSheet from './InfoSheet';
import { factionsData } from './data';
import { fetchSharedWarband, linkUrl, shareWarband } from './shareLink';
import type { Warband } from './useWarband';
import styles from './warband-builder.module.css';

const warbandLabel = (wb: Warband) => wb.name || 'Untitled Warband';

/**
 * Uploads the warband as a new share link and shows it, copied to the clipboard when the
 * browser allows it.
 */
export function ShareSheet({ warband, onClose }: { warband: Warband; onClose: () => void }) {
  const [state, setState] = useState<{ url?: string; error?: string; copied?: boolean }>({});

  useEffect(() => {
    let cancelled = false;
    shareWarband(warband)
      .then(async id => {
        const url = linkUrl(id);
        // Writing to the clipboard after an await can be refused; the Copy button still works
        const copied = await navigator.clipboard?.writeText(url).then(() => true, () => false);
        if (!cancelled) setState({ url, copied });
      })
      .catch((e: Error) => { if (!cancelled) setState({ error: e.message }); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Copied" is only a confirmation; it reverts so it never claims the clipboard still holds the link
  useEffect(() => {
    if (!state.copied) return;
    const t = setTimeout(() => setState(s => ({ ...s, copied: false })), 2000);
    return () => clearTimeout(t);
  }, [state.copied]);

  function copy() {
    if (!state.url) return;
    navigator.clipboard?.writeText(state.url).then(() => setState(s => ({ ...s, copied: true })));
  }

  return (
    <InfoSheet title={warbandLabel(warband)} subtitle="Share link" onClose={onClose}>
      {!state.url && !state.error && <p>Creating the link…</p>}
      {state.error && <p>The link couldn’t be created: {state.error}</p>}
      {state.url && (
        <>
          <div className={styles.shareField}>
            <input
              className={styles.shareUrl}
              type="text"
              value={state.url}
              readOnly
              aria-label="Share link"
              onFocus={e => e.currentTarget.select()}
            />
            <button type="button" className={styles.shareCopyBtn} onClick={copy}>
              {state.copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p>Anyone with the link can import a copy of this warband. Shared warbands are stored on wyrdcry.net.</p>
        </>
      )}
    </InfoSheet>
  );
}

/** Opened from a `?w=` link: offers to import the shared warband as a new copy. */
export function ImportLinkSheet({ linkId, onImport, onClose }: {
  linkId: string;
  onImport: (warband: Warband) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<{ warband?: Warband | null; error?: string }>({});

  useEffect(() => {
    let cancelled = false;
    fetchSharedWarband(linkId)
      .then(warband => { if (!cancelled) setState({ warband }); })
      .catch((e: Error) => { if (!cancelled) setState({ error: e.message }); });
    return () => { cancelled = true; };
  }, [linkId]);

  const { warband } = state;
  const faction = warband ? factionsData.find(f => f.id === warband.factionId)?.name : undefined;
  const count = warband?.fighters.length ?? 0;

  return (
    <InfoSheet
      title={warband ? warbandLabel(warband) : 'Shared warband'}
      subtitle="Import warband"
      caption={warband ? [faction, `${count} ${count === 1 ? 'fighter' : 'fighters'}`].filter(Boolean).join(' · ') : undefined}
      onClose={onClose}
      actions={warband && (
        <>
          <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnNeutral}`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${styles.infoSheetBtn} ${styles.infoSheetBtnWhite}`} onClick={() => onImport(warband)}>
            Import
          </button>
        </>
      )}
    >
      {state.warband === undefined && !state.error && <p>Loading the warband…</p>}
      {state.error && <p>The warband couldn’t be loaded: {state.error}</p>}
      {state.warband === null && <p>This warband link doesn’t exist any more.</p>}
      {warband && <p>This will create a local copy of the warband. Changing it will not affect the original warband.</p>}
    </InfoSheet>
  );
}
