import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import styles from './warband-builder.module.css';

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Buttons pinned under the scrolling content. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Bottom sheet with a sticky header and scrollable body, used for weapon / ability details. */
export default function InfoSheet({ title, subtitle, onClose, actions, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className={styles.infoSheetOverlay} onClick={onClose}>
      <div className={styles.infoSheet} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className={styles.infoSheetHeader}>
          <div className={styles.infoSheetTitleBlock}>
            {subtitle && <div className={styles.infoSheetSubtitle}>{subtitle}</div>}
            <div className={styles.infoSheetTitle}>{title}</div>
          </div>
          <button type="button" className={styles.infoSheetClose} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className={styles.infoSheetBody}>{children}</div>
        {actions && <div className={styles.infoSheetActions}>{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
