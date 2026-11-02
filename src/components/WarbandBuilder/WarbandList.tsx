import React, { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Warband } from './useWarband';
import { factionsData } from './data';
import InfoSheet from './InfoSheet';
import { linkIdFrom } from './shareLink';
import styles from './warband-builder.module.css';

interface Props {
  warbands: Warband[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onImport: (file: File) => void;
  /** A pasted share link's id; the builder then offers to import it */
  onImportLink: (linkId: string) => void;
}

export default function WarbandList({ warbands, onSelect, onCreate, onImport, onImportLink }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState(false);

  function closeImport() {
    setImportOpen(false);
    setLink('');
    setLinkError(false);
  }

  function importLink(e: React.FormEvent) {
    e.preventDefault();
    const id = linkIdFrom(link);
    if (!id) { setLinkError(true); return; }
    closeImport();
    onImportLink(id);
  }

  return (
    <div className={styles.warbandListShell}>
      <div className={`container ${styles.warbandListInner}`}>
        <h1 className={styles.warbandListHeading}>Warband Builder</h1>

        <p>
          The Warband Builder is currently in beta and some features may change.
        </p>

        <div className={styles.warbandListActions}>
          <button type="button" className="button button--primary button--lg" onClick={() => { (window as any).gtag?.('event', 'create_warband'); onCreate(); }}>
            Create new warband
          </button>
          <button type="button" className="button button--secondary button--lg" onClick={() => setImportOpen(true)}>
            Import warband
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) { closeImport(); onImport(file); e.target.value = ''; }
            }}
          />
        </div>

        {/* A share link from another player, or a file exported from the builder */}
        {importOpen && (
          <InfoSheet title="Import warband" onClose={closeImport}>
            <form className={styles.shareField} onSubmit={importLink}>
              <input
                className={styles.shareUrl}
                type="text"
                value={link}
                onChange={e => { setLink(e.target.value); setLinkError(false); }}
                placeholder="Paste a share link"
                aria-label="Share link"
                autoFocus
              />
              <button type="submit" className={styles.shareCopyBtn} disabled={!link.trim()}>Import</button>
            </form>
            {linkError && <p>That doesn’t look like a warband share link.</p>}
            <p>
              Or{' '}
              <button type="button" className={styles.linkButton} onClick={() => fileRef.current?.click()}>import a warband file (json)</button>
            </p>
          </InfoSheet>
        )}

        <ul className={styles.warbandListItems}>
          {warbands.map(wb => (
            <li key={wb.id}>
              <button
                type="button"
                className={styles.warbandListRow}
                onClick={() => onSelect(wb.id)}
              >
                <span className={styles.warbandListMeta}>
                  <span className={styles.warbandListName}>{wb.name || 'Untitled Warband'}</span>
                  <span className={styles.warbandListFaction}>
                    {wb.factionId ? (factionsData.find(f => f.id === wb.factionId)?.name ?? wb.factionId) : 'No faction'}
                  </span>
                </span>
                <ArrowRight size={28} strokeWidth={2} className={styles.warbandListArrow} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
