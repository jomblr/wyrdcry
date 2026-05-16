import React, { useRef, useEffect, useState } from 'react';
import styles from './warband-builder.module.css';

interface Props {
  notes: string;
  onChange: (notes: string) => void;
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export default function SpecialRulesCell({ notes, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (ref.current) autoResize(ref.current);
  }, [notes]);

  return (
    <div className={`${styles.equipmentInput} ${focused ? styles.equipmentInputFocused : ''}`}>
      <textarea
        ref={ref}
        className={styles.notesTextarea}
        value={notes}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Add note…"
        aria-label="Notes"
        rows={1}
      />
    </div>
  );
}
