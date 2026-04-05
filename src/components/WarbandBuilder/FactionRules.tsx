import React, { useState, useRef, useCallback } from 'react';
import styles from './warband-builder.module.css';

interface Props {
  notes: string;
  onSetNotes: (v: string) => void;
}

export default function FactionRules({ notes, onSetNotes }: Props) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEditing = useCallback(() => {
    setEditing(true);
    // Focus after render
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const stopEditing = useCallback(() => {
    setEditing(false);
  }, []);

  return (
    <div className={`${styles.infoPanel} ${styles.factionRulesPanel}`}>
      <h3 className={styles.stashTitle}>Notes</h3>

      {editing ? (
        <textarea
          ref={textareaRef}
          className={styles.notesTextarea}
          value={notes ?? ''}
          onChange={e => onSetNotes(e.target.value)}
          onBlur={stopEditing}
          placeholder="Add notes…"
          spellCheck={false}
        />
      ) : (
        <div
          className={styles.notesMd}
          onClick={startEditing}
          title="Click to edit"
          role="button"
          tabIndex={0}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && startEditing()}
        >
          {(notes ?? '').trim() ? (
            notes
          ) : (
            <span className={styles.notesPlaceholder}>Add notes…</span>
          )}
        </div>
      )}
    </div>
  );
}
